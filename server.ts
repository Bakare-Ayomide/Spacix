import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { env } from './src/server/env';
import { db } from './src/server/store';
import {
  cancelOnHiggsfieldPlatform,
  createSignedUploadUrl,
  getRunwareTaskDetails,
  isRealExternalSecret,
  pingRunwareConnection,
  pollRunwareTaskResponse,
  runwareMediaStorage,
  searchRunwareModels,
  submitToModelProvider,
  synthesizeR2OutputForGeneration,
  verifyHiggsfieldWebhookToken,
} from './src/server/higgsfield';
import {
  getEffectiveProvidersForModel,
  getModelById,
  MODEL_CATALOG,
  resolveProviderSpec,
  validateGenerationInput,
} from './src/catalog/models';
import { priceFor } from './src/billing/price';
import {
  AdminRoleType,
  ApiProviderCallingPattern,
  ApiProviderId,
  GenerationRecord,
  MediaKind,
  MediaSlotInput,
  PlanTierId,
  PlatformNotification,
  PlatformTeamMember,
  SupportTicket,
  UserProfile,
} from './src/types/studio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSessionToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return String(req.headers['x-session-token'] || '').trim();
}

function getSessionUser(req: Request): UserProfile | null {
  const token = getSessionToken(req);
  return db.getUserBySessionToken(token);
}

/**
 * Idempotent finalizer for a generation run (invoked by webhook, cron reconciler, or status poll)
 */
async function finalizeGenerationRun(generationId: string): Promise<GenerationRecord | null> {
  const gen = db.generations.get(generationId);
  if (!gen) return null;

  // Guard state transitions: if already terminal, do not act twice
  if (
    gen.status === 'completed' ||
    gen.status === 'failed' ||
    gen.status === 'nsfw' ||
    gen.status === 'canceled'
  ) {
    return gen;
  }

  const ageMs = Date.now() - new Date(gen.createdAt).getTime();

  // Check for explicit test triggers or simulated progression
  if (gen.hfRequestId?.startsWith('nsfw_') || gen.prompt.toLowerCase().includes('[nsfw]')) {
    if (ageMs >= 2000) {
      gen.status = 'nsfw';
      gen.error = 'Blocked by content filter. Credits refunded.';
      gen.finishedAt = new Date().toISOString();
      gen.updatedAt = gen.finishedAt;
      db.refundGenerationCredits({
        userId: gen.userId,
        generationId: gen.id,
        cost: gen.cost,
        note: `Content moderation block refund (${gen.modelLabel})`,
      });
    }
    return gen;
  }

  if (gen.hfRequestId?.startsWith('fail_') || gen.prompt.toLowerCase().includes('[fail]')) {
    if (ageMs >= 2000) {
      gen.status = 'failed';
      gen.error = 'Upstream inference worker timed out. Credits automatically refunded.';
      gen.finishedAt = new Date().toISOString();
      gen.updatedAt = gen.finishedAt;
      db.refundGenerationCredits({
        userId: gen.userId,
        generationId: gen.id,
        cost: gen.cost,
        note: `Failed run refund (${gen.modelLabel})`,
      });
    }
    return gen;
  }

  // If this generation is running on Runware with a real API key, poll Runware's official getResponse task
  if (gen.apiProvider === 'runware' && gen.hfRequestId) {
    const rwGateway = db.providerConfigs.get('runware');
    if (rwGateway && isRealExternalSecret(rwGateway.rawSecret)) {
      const pollRes = await pollRunwareTaskResponse(
        gen.hfRequestId,
        rwGateway.rawSecret,
        rwGateway.baseUrl
      );
      if (pollRes.errors && pollRes.errors.length > 0) {
        const errItem = pollRes.errors[0];
        gen.status = 'failed';
        gen.error = `Runware [${errItem.code || 'error'}]: ${errItem.message}. Credits automatically refunded.`;
        gen.finishedAt = new Date().toISOString();
        gen.updatedAt = gen.finishedAt;
        db.refundGenerationCredits({
          userId: gen.userId,
          generationId: gen.id,
          cost: gen.cost,
          note: `Runware task error refund (${gen.modelLabel})`,
        });
        db.saveToDisk();
        return gen;
      }

      const item = pollRes.data?.[0];
      const mediaUrl =
        item?.imageURL ||
        item?.videoURL ||
        item?.audioURL ||
        item?.outputs?.files?.[0]?.url;

      if (mediaUrl) {
        const ext = gen.surface === 'video' ? 'mp4' : gen.surface === 'audio' ? 'mp3' : 'jpg';
        gen.outputs = [
          {
            kind: gen.surface,
            url: mediaUrl,
            r2Key: `u/${gen.userId}/${gen.id}/0.${ext}`,
            width: 1280,
            height: 720,
            durationSec: gen.surface === 'image' ? undefined : 8,
          },
        ];
        gen.status = 'completed';
        gen.finishedAt = new Date().toISOString();
        gen.updatedAt = gen.finishedAt;
        db.saveToDisk();
        return gen;
      }

      // Still processing on Runware cluster (up to 120s for video/audio)
      if (ageMs < 120_000) {
        gen.status = 'in_progress';
        gen.updatedAt = new Date().toISOString();
        return gen;
      }

      gen.status = 'failed';
      gen.error = 'Upstream Runware inference timed out after 120 seconds. Credits refunded.';
      gen.finishedAt = new Date().toISOString();
      gen.updatedAt = gen.finishedAt;
      db.refundGenerationCredits({
        userId: gen.userId,
        generationId: gen.id,
        cost: gen.cost,
        note: `Runware timeout refund (${gen.modelLabel})`,
      });
      db.saveToDisk();
      return gen;
    }
  }

  if (ageMs < 90_000) {
    gen.status = 'in_progress';
    gen.updatedAt = new Date().toISOString();
    return gen;
  }

  gen.status = 'failed';
  gen.error = 'Upstream provider task did not return media within 90 seconds. Credits refunded.';
  gen.finishedAt = new Date().toISOString();
  gen.updatedAt = gen.finishedAt;
  db.refundGenerationCredits({
    userId: gen.userId,
    generationId: gen.id,
    cost: gen.cost,
    note: `Provider timeout refund (${gen.modelLabel})`,
  });
  db.saveToDisk();
  return gen;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security headers per §10
  app.use((_req, res, next) => {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  app.use(express.json({ limit: '15mb' }));

  // Support POST-tunneling for PATCH & DELETE so reverse proxies / iframe gateways never block non-POST mutations
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token, X-HTTP-Method-Override');
      res.status(204).end();
      return;
    }
    const headerOverride = req.headers['x-http-method-override'] as string | undefined;
    const bodyOverride =
      req.body && typeof req.body === 'object' && typeof req.body._method === 'string'
        ? (req.body._method as string)
        : undefined;
    const override = headerOverride || bodyOverride;
    if (override) {
      req.method = override.toUpperCase();
    } else if (
      req.method === 'POST' &&
      (req.path.startsWith('/api/admin/providers/') ||
        req.path.startsWith('/api/admin/models/') ||
        req.path.startsWith('/api/admin/users/') ||
        req.path.startsWith('/api/admin/secrets/') ||
        req.path === '/api/admin/billing' ||
        req.path === '/api/auth/profile' ||
        req.path.startsWith('/api/admin/support/') ||
        req.path.startsWith('/api/admin/notifications/') ||
        req.path.startsWith('/api/admin/team/'))
    ) {
      req.method = 'PATCH';
    }
    next();
  });

  // ===========================================================================
  // 1. REAL DATABASE AUTHENTICATION (Login, Sign Up, Remember Me, Password Reset)
  // ===========================================================================
  app.get('/api/auth/session', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    res.json({ user });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { name, email, password, confirmPassword, rememberMe = true } = req.body || {};
    if (confirmPassword !== undefined && password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const result = db.registerUserWithPassword({
      name: String(name || ''),
      email: String(email || ''),
      password: String(password || ''),
    });

    if (!result.ok || !result.user) {
      res.status(400).json({ error: result.error || 'Could not create account.' });
      return;
    }

    const session = db.createSession(result.user.id, Boolean(rememberMe));
    res.json({
      ok: true,
      sessionToken: session.token,
      rememberMe: session.rememberMe,
      expiresAt: session.expiresAt,
      user: result.user,
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password, rememberMe = true } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      res.status(400).json({ error: 'Please enter both your email address and password.' });
      return;
    }

    const allowed = db.checkRateLimit(`login:${cleanEmail}`, 12, 60_000);
    if (!allowed) {
      res.status(429).json({ error: 'Too many sign-in attempts. Please wait 60 seconds.' });
      return;
    }

    const authRes = db.authenticateUserPassword(cleanEmail, String(password));
    if (!authRes.ok || !authRes.user) {
      res.status(401).json({ error: authRes.error || 'Invalid email or password.' });
      return;
    }

    const session = db.createSession(authRes.user.id, Boolean(rememberMe));
    res.json({
      ok: true,
      sessionToken: session.token,
      rememberMe: session.rememberMe,
      expiresAt: session.expiresAt,
      user: authRes.user,
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (token) {
      db.deleteSession(token);
    }
    res.json({ ok: true, user: null });
  });

  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const allowed = db.checkRateLimit(`reset:${email}`, 6, 60_000);
    if (!allowed) {
      res.status(429).json({ error: 'Too many reset requests. Please wait 60 seconds.' });
      return;
    }

    const resetReq = db.createPasswordResetRequest(email);
    if (!resetReq.ok || !resetReq.record || !resetReq.user) {
      res.status(404).json({ error: resetReq.error || 'No account found with that email address.' });
      return;
    }

    const resendKey = db.getSecretValue('RESEND_API_KEY');
    const emailFrom = db.getSecretValue('EMAIL_FROM') || env.EMAIL_FROM;
    let emailDelivered = false;

    if (resendKey && resendKey.length > 8) {
      try {
        const mailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: emailFrom,
            to: [resetReq.user.email],
            subject: `SPACIX Password Reset Code: ${resetReq.record.code}`,
            html: `<p>Hello ${resetReq.user.name},</p><p>Your SPACIX password reset verification code is: <strong>${resetReq.record.code}</strong></p><p>This code expires in 15 minutes.</p>`,
          }),
        });
        emailDelivered = mailRes.ok;
      } catch {
        emailDelivered = false;
      }
    }

    res.json({
      ok: true,
      email: resetReq.user.email,
      expiresInMinutes: 15,
      emailDelivered,
      resetCode: emailDelivered ? undefined : resetReq.record.code,
    });
  });

  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    const { email, code, newPassword, confirmPassword, rememberMe = true } = req.body || {};
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      res.status(400).json({ error: 'New passwords do not match.' });
      return;
    }

    const result = db.consumePasswordReset({
      email: String(email || ''),
      code: String(code || ''),
      newPassword: String(newPassword || ''),
    });

    if (!result.ok || !result.user) {
      res.status(400).json({ error: result.error || 'Could not reset password.' });
      return;
    }

    const session = db.createSession(result.user.id, Boolean(rememberMe));
    res.json({
      ok: true,
      sessionToken: session.token,
      rememberMe: session.rememberMe,
      expiresAt: session.expiresAt,
      user: result.user,
    });
  });

  app.post('/api/auth/change-password', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Please sign in to change your password.' });
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      res.status(400).json({ error: 'New passwords do not match.' });
      return;
    }
    const verify = db.authenticateUserPassword(user.email, String(currentPassword || ''));
    if (!verify.ok) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }
    if (!db.setUserPassword(user.id, String(newPassword || ''))) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }
    res.json({ ok: true, message: 'Password updated in database.' });
  });

  const handleProfileUpdate = (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Please sign in to update your profile.' });
      return;
    }
    const { name } = req.body || {};
    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
      db.saveToDisk();
    }
    res.json({ ok: true, user });
  };
  app.patch('/api/auth/profile', handleProfileUpdate);
  app.post('/api/auth/profile', handleProfileUpdate);

  app.post('/api/auth/magic-link', (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Enter a valid work or personal email address.' });
      return;
    }

    const allowed = db.checkRateLimit(`magic:${email}`, 8, 60_000);
    if (!allowed) {
      res.status(429).json({ error: 'Too many sign-in links requested. Please wait 60 seconds.' });
      return;
    }

    const token = `ml_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const magicUrl = `${env.APP_URL}/login?magic_token=${token}`;
    db.magicTokens.set(token, {
      token,
      email,
      expiresAt: Date.now() + 15 * 60 * 1000,
      used: false,
      magicUrl,
      createdAt: new Date().toISOString(),
    });

    res.json({
      ok: true,
      email,
      from: db.getSecretValue('EMAIL_FROM') || env.EMAIL_FROM,
      expiresInMinutes: 15,
      previewMagicToken: token,
      previewMagicUrl: magicUrl,
    });
  });

  app.post('/api/auth/verify-magic-link', (req: Request, res: Response) => {
    const token = String(req.body?.token || '');
    const record = db.magicTokens.get(token);
    if (!record || record.used || record.expiresAt < Date.now()) {
      res.status(400).json({ error: 'This magic link has expired or was already used.' });
      return;
    }
    record.used = true;
    const user = db.findOrCreateUserByEmail(record.email);
    const session = db.createSession(user.id, true);

    res.json({
      ok: true,
      sessionToken: session.token,
      rememberMe: session.rememberMe,
      expiresAt: session.expiresAt,
      user,
    });
  });

  // ===========================================================================
  // 2. MODEL CATALOG, PROVIDER GATEWAYS, NOTIFICATIONS & PRICING CONFIG
  // ===========================================================================
  app.get('/api/catalog', (req: Request, res: Response) => {
    const reqUser = getSessionUser(req);
    const isAdmin = reqUser?.role === 'admin';

    const enabledProviderIds = new Set(
      Array.from(db.providerConfigs.values())
        .filter((p) => p.enabled)
        .map((p) => p.id)
    );

    const models = MODEL_CATALOG.filter((m) => {
      const override = db.modelPricing.get(m.id);
      return override ? override.enabled : true;
    }).map((m) => {
      const override = db.modelPricing.get(m.id);
      const effectiveUsd = override?.baseHfUsd ?? m.baseHfUsd;
      const baseSpecs = getEffectiveProvidersForModel(m);

      // Filter providers by both model's allowedProviders and global enabledProviderIds
      const allowedSet = new Set(
        override?.allowedProviders?.length
          ? override.allowedProviders
          : baseSpecs.map((s) => s.providerId)
      );

      let filteredSpecs = baseSpecs.filter(
        (s) => allowedSet.has(s.providerId) && enabledProviderIds.has(s.providerId)
      );
      if (filteredSpecs.length === 0) {
        filteredSpecs = baseSpecs;
      }

      // Apply custom endpoint or baseHfUsd overrides if configured
      filteredSpecs = filteredSpecs.map((spec) => {
        if (override && spec.providerId === override.preferredProvider) {
          return {
            ...spec,
            baseUsd: effectiveUsd,
            endpoint: override.customEndpoint || spec.endpoint,
          };
        }
        return spec;
      });

      const defaultApiProvider =
        override?.preferredProvider &&
        filteredSpecs.some((s) => s.providerId === override.preferredProvider)
          ? override.preferredProvider
          : filteredSpecs[0]?.providerId || m.defaultApiProvider || 'fal';

      return {
        id: m.id,
        surface: m.surface,
        family: m.family,
        provider: m.provider,
        ...(isAdmin
          ? {
              defaultApiProvider,
              supportedProviders: filteredSpecs,
            }
          : {}),
        label: m.label,
        category: m.category,
        description: m.description,
        bestFor: m.bestFor,
        badges: m.badges,
        docsUrl: m.docsUrl,
        modes: m.modes,
        roles: m.roles,
        requirePrompt: m.requirePrompt,
        supportsEnhancePrompt: m.supportsEnhancePrompt,
        settings: m.settings,
        baseHfUsd: effectiveUsd,
        billingUnit: m.billingUnit,
        previewGradient: m.previewGradient,
        previewAccent: m.previewAccent,
      };
    });

    res.json({
      models,
      providers: isAdmin ? db.getPublicProviderConfigs() : [],
      presets: Array.from(db.presets.values())
        .filter((p) => p.active)
        .sort((a, b) => a.order - b.order),
      notifications: db.notifications.filter(
        (n) => n.active && (n.targetAudience !== 'admins' || isAdmin)
      ),
      plans: db.plans,
      topups: db.topups,
      creditMarkup: db.billingConfig.creditMarkup,
      creditUsdValue: db.billingConfig.creditUsdValue,
    });
  });

  // ===========================================================================
  // 3. GENERATIONS LIFECYCLE (Submit, Poll Status, Cancel, Delete, Publish)
  // ===========================================================================
  app.get('/api/generations', async (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.json({ generations: [] });
      return;
    }

    const surface = req.query.surface as string | undefined;
    const projectId = req.query.projectId as string | undefined;

    const userGens = Array.from(db.generations.values()).filter((g) => g.userId === user.id);
    for (const g of userGens) {
      if (g.status === 'pending_submit' || g.status === 'queued' || g.status === 'in_progress') {
        await finalizeGenerationRun(g.id);
      }
    }

    const filtered = userGens
      .filter((g) => (!surface ? true : g.surface === surface))
      .filter((g) => (!projectId ? true : g.projectId === projectId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ generations: filtered, credits: user.credits });
  });

  // Batched DB-only status polling route (`GET /api/generations/status?ids=a,b,c`)
  app.get('/api/generations/status', async (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const idsParam = String(req.query.ids || '');
    const ids = idsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const statuses = [];
    for (const id of ids) {
      const gen = db.generations.get(id);
      if (!gen || gen.userId !== user.id) continue;
      await finalizeGenerationRun(gen.id);
      statuses.push({
        id: gen.id,
        status: gen.status,
        outputs: gen.outputs,
        error: gen.error,
        finishedAt: gen.finishedAt,
      });
    }

    res.json({
      items: statuses,
      credits: user.credits,
    });
  });

  app.post('/api/generations/submit', async (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Sign in to generate media.' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your studio account is currently suspended. Contact SPACIX Support.',
      });
      return;
    }

    if (!db.checkRateLimit(`submit:${user.id}`, 20, 60_000)) {
      res.status(429).json({ error: 'RATE_LIMITED', message: 'Rate limit reached: max 20 submits/minute.' });
      return;
    }

    const {
      modelId,
      prompt = '',
      settings = {},
      media = [],
      mode,
      projectId,
      presetId,
      apiProvider,
    } = req.body || {};
    const model = getModelById(String(modelId));
    const pricingOverride = db.modelPricing.get(String(modelId));

    if (!model || (pricingOverride && !pricingOverride.enabled)) {
      res.status(400).json({ error: 'INVALID_MODEL', message: 'Selected model is currently disabled by administrator.' });
      return;
    }

    const validation = validateGenerationInput(
      model,
      String(prompt),
      settings as Record<string, string | number | boolean>,
      (Array.isArray(media) ? media : []) as MediaSlotInput[]
    );
    if (!validation.valid) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: validation.error });
      return;
    }

    // Check plan concurrency limits using mutable db.plans
    const plan = db.plans.find((p) => p.id === user.plan) || db.plans[0];
    const activeRunsForSurface = Array.from(db.generations.values()).filter(
      (g) =>
        g.userId === user.id &&
        g.surface === model.surface &&
        (g.status === 'pending_submit' || g.status === 'queued' || g.status === 'in_progress')
    );
    const maxParallel = plan.parallelLimits[model.surface];
    if (activeRunsForSurface.length >= maxParallel) {
      res.status(429).json({
        error: 'CONCURRENCY_LIMIT',
        message: `Your ${plan.name} plan supports ${maxParallel} parallel ${model.surface} generation(s). Wait for current run or upgrade.`,
      });
      return;
    }

    const requestedProvider = apiProvider
      ? (String(apiProvider) as ApiProviderId)
      : pricingOverride?.preferredProvider || model.defaultApiProvider || 'runware';
    const provGateway = requestedProvider ? db.providerConfigs.get(requestedProvider) : undefined;
    let effectiveProviderId: ApiProviderId =
      provGateway && !provGateway.enabled
        ? pricingOverride?.preferredProvider || 'runware'
        : requestedProvider || 'runware';

    // If the currently selected provider has no real API key configured in DB, route to any enabled provider with a real API key (preferring Runware)
    const selectedGw = db.providerConfigs.get(effectiveProviderId);
    if (!selectedGw || !selectedGw.enabled || !isRealExternalSecret(selectedGw.rawSecret)) {
      const rwGw = db.providerConfigs.get('runware');
      if (rwGw && rwGw.enabled && isRealExternalSecret(rwGw.rawSecret)) {
        effectiveProviderId = 'runware';
      } else {
        const anyLiveGw = Array.from(db.providerConfigs.values()).find(
          (gw) => gw.enabled && isRealExternalSecret(gw.rawSecret)
        );
        if (anyLiveGw) {
          effectiveProviderId = anyLiveGw.id;
        }
      }
    }

    const finalGw = db.providerConfigs.get(effectiveProviderId);
    if (!finalGw || !finalGw.enabled || !isRealExternalSecret(finalGw.rawSecret)) {
      res.status(400).json({
        error: 'API_KEY_NOT_CONFIGURED',
        message:
          'No active API key is configured in the database for this model. Add your API key in the Admin Console -> Providers & Secrets Vault.',
      });
      return;
    }

    const providerSpec = resolveProviderSpec(model, effectiveProviderId);

    // Compute exact credit cost on the server using live admin billingConfig
    const cost = priceFor(model.id, validation.sanitizedSettings, media, {
      creditMarkup: db.billingConfig.creditMarkup,
      creditUsdValue: db.billingConfig.creditUsdValue,
      overrideBaseUsd: pricingOverride?.baseHfUsd,
      apiProvider: providerSpec.providerId,
    });

    const generationId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Step 1: Atomic credit debit + generation insert
    const debitResult = db.debitCreditsForGeneration({
      userId: user.id,
      generationId,
      cost,
      note: `${model.label} (${model.surface})`,
    });

    if (!debitResult.ok) {
      res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        message: `This run requires ${cost} credits, but your balance is ${user.credits.total}.`,
        requiredCredits: cost,
        availableCredits: user.credits.total,
      });
      return;
    }

    const mapped = model.toPlatform({
      prompt: String(prompt).trim(),
      settings: validation.sanitizedSettings,
      media: Array.isArray(media) ? media : [],
      mode: mode ? String(mode) : undefined,
      apiProvider: providerSpec.providerId,
    });

    const effectiveEndpoint =
      mode && (mode.includes('Edit') || mode.includes('Clone') || mode.includes('Sound Effects')) && providerSpec.editEndpoint
        ? providerSpec.editEndpoint
        : pricingOverride?.customEndpoint && providerSpec.providerId === pricingOverride.preferredProvider
        ? pricingOverride.customEndpoint
        : providerSpec.endpoint || mapped.path;

    const activeGatewayConfig = db.providerConfigs.get(providerSpec.providerId);

    const now = new Date().toISOString();
    const record: GenerationRecord = {
      id: generationId,
      userId: user.id,
      userName: user.name,
      projectId: projectId || null,
      surface: model.surface,
      modelId: model.id,
      modelLabel: model.label,
      modelPath: effectiveEndpoint,
      apiProvider: providerSpec.providerId,
      callingPattern: providerSpec.callingPattern,
      mode: mode ? String(mode) : model.modes[0],
      prompt: String(prompt).trim(),
      settings: validation.sanitizedSettings,
      media: Array.isArray(media) ? media : [],
      status: 'pending_submit',
      cost,
      outputs: [],
      isPublic: false,
      presetId: presetId ? String(presetId) : undefined,
      createdAt: now,
      updatedAt: now,
    };

    db.generations.set(generationId, record);

    if (projectId && db.projects.has(projectId)) {
      const proj = db.projects.get(projectId)!;
      if (proj.userId === user.id) {
        proj.generationCount += 1;
        proj.coverGenerationId = generationId;
        proj.updatedAt = now;
      }
    }

    try {
      const providerRes = await submitToModelProvider({
        generationId,
        provider: providerSpec.providerId,
        callingPattern: providerSpec.callingPattern,
        surface: model.surface,
        path: effectiveEndpoint,
        body: mapped.body,
        runtimeSecret: activeGatewayConfig?.rawSecret,
        runtimeBaseUrl: activeGatewayConfig?.baseUrl,
        runwareRoutingConfig: db.runwareRoutingConfig,
      });
      record.hfRequestId = providerRes.request_id;
      if (providerRes.runwareRequestPayload && providerRes.runwareResponseEnvelope) {
        db.runwareTaskHistory.set(providerRes.request_id, {
          taskUUID: providerRes.request_id,
          generationId,
          request: providerRes.runwareRequestPayload,
          response: providerRes.runwareResponseEnvelope,
          createdAt: new Date().toISOString(),
        });
      }
      if (providerRes.immediateOutputUrl) {
        const ext = model.surface === 'video' ? 'mp4' : model.surface === 'audio' ? 'wav' : 'jpg';
        record.outputs = [
          {
            kind: model.surface,
            url: providerRes.immediateOutputUrl,
            r2Key: `u/${user.id}/${generationId}/0.${ext}`,
            width: 1280,
            height: 720,
            durationSec: model.surface === 'image' ? undefined : 8,
          },
        ];
        record.status = 'completed';
        record.finishedAt = new Date().toISOString();
      } else {
        record.status = 'queued';
      }
      // Reconcile actual Runware USD cost (`includeCost: true`) if upstream returned live cost
      const rwItemCost = providerRes.runwareResponseEnvelope?.data?.[0]?.cost;
      if (typeof rwItemCost === 'number' && rwItemCost > 0) {
        const actualCredits = Math.max(
          1,
          Math.ceil(
            (rwItemCost * db.billingConfig.creditMarkup) /
              Math.max(0.001, db.billingConfig.creditUsdValue)
          )
        );
        const diff = cost - actualCredits;
        if (diff !== 0) {
          record.cost = actualCredits;
          db.adminAdjustCredits({
            userId: user.id,
            delta: diff,
            bucket: 'subscription',
            note: `Runware live cost reconciliation ($${rwItemCost.toFixed(4)} USD -> ${actualCredits} cr)`,
          });
        }
      }

      record.updatedAt = new Date().toISOString();
      db.saveToDisk();

      res.json({
        generation: record,
        credits: user.credits,
      });
    } catch (err) {
      const statusCode = (err as Error & { statusCode?: number }).statusCode || 500;
      if (statusCode >= 400 && statusCode < 500) {
        record.status = 'failed';
        record.error = (err as Error).message || 'Rejected by upstream model endpoint. Credits refunded.';
        record.finishedAt = new Date().toISOString();
        db.refundGenerationCredits({
          userId: user.id,
          generationId,
          cost,
          note: `Submit 4xx refund (${model.label})`,
        });
      }
      res.json({
        generation: record,
        credits: user.credits,
      });
    }
  });

  app.get('/api/generations/:id/download', async (req: Request, res: Response) => {
    const gen = db.generations.get(req.params.id);
    const out = gen?.outputs?.[0];
    if (!gen || !out || !out.url) {
      res.status(404).json({ error: 'Generation output not found' });
      return;
    }

    const ext =
      out.kind === 'video' && (out.url.endsWith('.mp4') || out.url.includes('vm.runware.ai'))
        ? 'mp4'
        : out.kind === 'audio'
        ? out.url.endsWith('.mp3')
          ? 'mp3'
          : 'wav'
        : out.url.startsWith('data:image/svg')
        ? 'svg'
        : 'jpg';
    const filename = `spacix-${gen.modelId}-${gen.id.slice(-6)}.${ext}`;

    try {
      if (out.url.startsWith('data:')) {
        const commaIdx = out.url.indexOf(',');
        const meta = out.url.slice(5, commaIdx);
        const rawData = out.url.slice(commaIdx + 1);
        const isBase64 = meta.includes(';base64');
        const mimeType = meta.split(';')[0] || 'application/octet-stream';
        const buf = isBase64
          ? Buffer.from(rawData, 'base64')
          : Buffer.from(decodeURIComponent(rawData), 'utf-8');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buf);
        return;
      }

      if (out.url.startsWith('http://') || out.url.startsWith('https://')) {
        const upstream = await fetch(out.url);
        if (upstream.ok) {
          const contentType =
            upstream.headers.get('content-type') || 'application/octet-stream';
          const arrayBuffer = await upstream.arrayBuffer();
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(Buffer.from(arrayBuffer));
          return;
        }
      }

      res.redirect(out.url);
    } catch {
      res.redirect(out.url);
    }
  });

  app.post('/api/generations/:id/cancel', async (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const gen = db.generations.get(req.params.id);
    if (!gen || gen.userId !== user.id) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    if (gen.status !== 'queued' && gen.status !== 'pending_submit') {
      res.status(400).json({
        error: 'CANNOT_CANCEL_IN_PROGRESS',
        message: 'Only queued runs can be canceled. This run has already started on the GPU cluster.',
      });
      return;
    }

    const cancelRes = await cancelOnHiggsfieldPlatform(
      gen.hfRequestId || gen.id,
      gen.status,
      gen.apiProvider || 'higgsfield'
    );
    if (!cancelRes.canceled) {
      res.status(400).json({ error: 'Could not cancel request on platform.' });
      return;
    }

    gen.status = 'canceled';
    gen.error = 'Canceled by user while queued. Credits refunded.';
    gen.finishedAt = new Date().toISOString();
    gen.updatedAt = gen.finishedAt;

    db.refundGenerationCredits({
      userId: user.id,
      generationId: gen.id,
      cost: gen.cost,
      note: `Canceled queued run (${gen.modelLabel})`,
    });

    res.json({
      generation: gen,
      credits: user.credits,
    });
  });

  app.patch('/api/generations/:id', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const gen = db.generations.get(req.params.id);
    if (!gen || gen.userId !== user.id) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    if (typeof req.body?.isPublic === 'boolean') {
      gen.isPublic = req.body.isPublic;
      gen.publishedAt = req.body.isPublic ? new Date().toISOString() : undefined;
    }

    if (req.body?.projectId !== undefined) {
      gen.projectId = req.body.projectId;
    }

    gen.updatedAt = new Date().toISOString();
    res.json({ generation: gen });
  });

  app.delete('/api/generations/:id', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const gen = db.generations.get(req.params.id);
    if (!gen || gen.userId !== user.id) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    db.generations.delete(gen.id);
    res.json({ ok: true });
  });

  // ===========================================================================
  // 4. WEBHOOKS & CRON RECONCILER (§3 & §7)
  // ===========================================================================
  const handleProviderWebhook = async (req: Request, res: Response) => {
    const generationId = String(req.query.gid || '');
    const token = String(req.query.t || '');

    if (!verifyHiggsfieldWebhookToken(generationId, token)) {
      res.status(401).json({ error: 'Invalid webhook HMAC signature' });
      return;
    }

    const requestId = String(req.body?.request_id || req.body?.id || '');
    const status = String(req.body?.status || '');
    const dedupeKey = `${requestId}:${status}`;

    if (db.hfWebhookEvents.has(dedupeKey)) {
      res.status(200).json({ ok: true, deduped: true });
      return;
    }
    db.hfWebhookEvents.add(dedupeKey);

    await finalizeGenerationRun(generationId);
    res.status(200).json({ ok: true });
  };

  app.post('/api/webhooks/higgsfield', handleProviderWebhook);
  app.post('/api/webhooks/fal', handleProviderWebhook);
  app.post('/api/webhooks/muapi', handleProviderWebhook);

  /**
   * Official Runware Webhook Receiver per https://runware.ai/docs/models-api/webhooks
   * - Validates query token (`?token=...` or `?gid=...&t=...`)
   * - Deduplicates via `taskUUID` in `db.processedRunwareWebhooks`
   * - Responds `200 OK` immediately
   */
  app.post('/api/webhooks/runware', async (req: Request, res: Response) => {
    const generationId = String(req.query.gid || '');
    const token = String(req.query.t || req.query.token || req.query.apiKey || '');

    if (generationId && token && !verifyHiggsfieldWebhookToken(generationId, token)) {
      res.status(401).json({ error: 'Invalid webhook query token' });
      return;
    }

    const { data, errors } = req.body || {};
    const firstItem = Array.isArray(data) ? data[0] : Array.isArray(errors) ? errors[0] : undefined;
    const taskUUID = String(firstItem?.taskUUID || req.body?.request_id || '');

    if (taskUUID && db.processedRunwareWebhooks.has(taskUUID)) {
      res.status(200).json({ ok: true, deduped: true });
      return;
    }
    if (taskUUID) {
      db.processedRunwareWebhooks.add(taskUUID);
    }

    // Respond 200 OK immediately per Runware Webhooks Best Practices
    res.status(200).json({ ok: true });

    if (generationId) {
      if (Array.isArray(errors) && errors.length > 0) {
        const gen = db.generations.get(generationId);
        if (gen && gen.status !== 'failed') {
          gen.status = 'failed';
          gen.error = `Runware [${errors[0].code || 'error'}]: ${errors[0].message || 'Generation failed. Credits refunded.'}`;
          gen.finishedAt = new Date().toISOString();
          gen.updatedAt = gen.finishedAt;
          db.refundGenerationCredits({
            userId: gen.userId,
            generationId: gen.id,
            cost: gen.cost,
            note: `Runware error refund (${gen.modelLabel})`,
          });
        }
      } else {
        await finalizeGenerationRun(generationId);
      }
    }
  });

  app.get('/api/cron/reconcile', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (
      authHeader &&
      authHeader !== `Bearer ${env.CRON_SECRET}` &&
      req.query.secret !== env.CRON_SECRET
    ) {
      res.status(401).json({ error: 'Unauthorized cron call' });
      return;
    }

    let reconciledCount = 0;
    const now = Date.now();

    for (const gen of db.generations.values()) {
      if (
        gen.status === 'pending_submit' ||
        gen.status === 'queued' ||
        gen.status === 'in_progress'
      ) {
        const ageMs = now - new Date(gen.createdAt).getTime();
        if (ageMs > 15 * 60 * 1000) {
          gen.status = 'failed';
          gen.error = 'Timed out after 15 minutes. Credits refunded by reconciler.';
          gen.finishedAt = new Date().toISOString();
          db.refundGenerationCredits({
            userId: gen.userId,
            generationId: gen.id,
            cost: gen.cost,
            note: '15m reconciler timeout refund',
          });
          reconciledCount++;
        } else {
          await finalizeGenerationRun(gen.id);
          reconciledCount++;
        }
      }
    }

    res.json({ ok: true, reconciledCount });
  });

  // ===========================================================================
  // 5. SIGNED UPLOADS & ASSET LIBRARY (`POST /api/upload`)
  // ===========================================================================
  const ALLOWED_UPLOAD_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'audio/wav',
    'audio/mpeg',
  ]);

  app.get('/api/uploads', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.json({ uploads: [] });
      return;
    }
    const uploads = Array.from(db.uploads.values())
      .filter((u) => u.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ uploads });
  });

  app.post('/api/upload', async (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Sign in to upload reference files.' });
      return;
    }

    if (!db.checkRateLimit(`upload:${user.id}`, 25, 60_000)) {
      res.status(429).json({ error: 'Upload rate limit exceeded. Try again in a moment.' });
      return;
    }

    const { contentType, label, bytes = 1024, dataUrl } = req.body || {};
    if (!ALLOWED_UPLOAD_TYPES.has(String(contentType))) {
      res.status(400).json({
        error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WAV.',
      });
      return;
    }

    if (Number(bytes) > 50 * 1024 * 1024) {
      res.status(400).json({ error: 'File exceeds 50 MB upload limit.' });
      return;
    }

    const signed = await createSignedUploadUrl(String(contentType));
    const kind: MediaKind = String(contentType).startsWith('video/')
      ? 'video'
      : String(contentType).startsWith('audio/')
      ? 'audio'
      : 'image';

    const id = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const storedUrl = dataUrl ? String(dataUrl) : signed.public_url;

    const record = {
      id,
      userId: user.id,
      kind,
      label: String(label || `Reference ${kind}`),
      publicUrl: storedUrl,
      contentType: String(contentType),
      bytes: Number(bytes || 1024),
      createdAt: new Date().toISOString(),
    };
    db.uploads.set(id, record);

    res.json({
      upload: record,
      upload_url: signed.upload_url,
      public_url: storedUrl,
      upload_headers: signed.upload_headers,
    });
  });

  // ===========================================================================
  // 6. PROJECTS CRUD (`/api/projects`)
  // ===========================================================================
  app.get('/api/projects', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.json({ projects: [] });
      return;
    }
    const projects = Array.from(db.projects.values())
      .filter((p) => p.userId === user.id)
      .map((p) => {
        const count = Array.from(db.generations.values()).filter(
          (g) => g.userId === user.id && g.projectId === p.id
        ).length;
        return { ...p, generationCount: count };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json({ projects });
  });

  app.post('/api/projects', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const name = String(req.body?.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Project name is required.' });
      return;
    }
    const now = new Date().toISOString();
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const project = {
      id,
      userId: user.id,
      name,
      generationCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    db.projects.set(id, project);
    res.json({ project });
  });

  app.patch('/api/projects/:id', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const project = db.projects.get(req.params.id);
    if (!project || project.userId !== user.id) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    const name = String(req.body?.name || '').trim();
    if (name) project.name = name;
    project.updatedAt = new Date().toISOString();
    res.json({ project });
  });

  app.delete('/api/projects/:id', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const project = db.projects.get(req.params.id);
    if (!project || project.userId !== user.id) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    db.projects.delete(project.id);
    for (const g of db.generations.values()) {
      if (g.userId === user.id && g.projectId === project.id) {
        g.projectId = null;
      }
    }
    res.json({ ok: true });
  });

  // ===========================================================================
  // 7. COMMUNITY FEED, MODERATION & USER SUPPORT TICKETS
  // ===========================================================================
  app.get('/api/community', (_req: Request, res: Response) => {
    const items = Array.from(db.generations.values())
      .filter((g) => g.isPublic && g.status === 'completed')
      .sort(
        (a, b) =>
          new Date(b.publishedAt || b.createdAt).getTime() -
          new Date(a.publishedAt || a.createdAt).getTime()
      );
    res.json({ items });
  });

  app.post('/api/community/report', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    const generationId = String(req.body?.generationId || '');
    const reason = String(req.body?.reason || 'Inappropriate content').trim();

    if (!generationId || !db.generations.has(generationId)) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    const report = {
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      generationId,
      reporterId: user?.id || 'anonymous',
      reason,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };
    db.reports.unshift(report);
    res.json({ ok: true, report });
  });

  // User Support Tickets
  app.get('/api/support', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const tickets = db.supportTickets.filter((t) => t.userId === user.id);
    res.json({ tickets });
  });

  app.post('/api/support', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Sign in to submit a support ticket.' });
      return;
    }
    const { subject, category = 'account', priority = 'medium', message } = req.body || {};
    if (!subject || !message) {
      res.status(400).json({ error: 'Subject and message are required.' });
      return;
    }
    const now = new Date().toISOString();
    const ticket: SupportTicket = {
      id: `tkt_${Math.floor(1050 + Math.random() * 9000)}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      subject: String(subject).trim(),
      category: category as SupportTicket['category'],
      priority: priority as SupportTicket['priority'],
      status: 'open',
      assignedTo: 'Aria Chen',
      messages: [
        {
          id: `msg_${Date.now()}`,
          authorName: user.name,
          authorRole: 'user',
          message: String(message).trim(),
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    db.supportTickets.unshift(ticket);
    res.json({ ok: true, ticket });
  });

  // ===========================================================================
  // 8. STRIPE BILLING, CHECKOUT, PORTAL & WEBHOOKS (`/api/billing/*`)
  // ===========================================================================
  app.get('/api/billing/ledger', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const entries = db.ledger.filter((l) => l.userId === user.id);
    res.json({
      user,
      entries,
      plans: db.plans,
      topups: db.topups,
      billingConfig: db.billingConfig,
    });
  });

  app.post('/api/billing/checkout', (req: Request, res: Response) => {
    const user = getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'Sign in before purchasing a subscription or top-up.' });
      return;
    }

    const { kind, planId, billingCycle = 'annual', topupId } = req.body || {};

    if (!user.stripeCustomerId) {
      user.stripeCustomerId = `cus_${user.id}`;
    }

    if (kind === 'subscription') {
      const plan = db.plans.find((p) => p.id === (planId as PlanTierId));
      if (!plan || plan.id === 'free') {
        res.status(400).json({ error: 'Select a valid paid subscription tier.' });
        return;
      }

      const invoiceId = `in_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const updatedUser = db.resetSubscriptionCredits({
        userId: user.id,
        plan: plan.id,
        billingCycle: billingCycle === 'monthly' ? 'monthly' : 'annual',
        allowance: plan.monthlyCredits,
        invoiceId,
      });

      res.json({
        ok: true,
        mode: 'subscription',
        message: `${plan.name} (${billingCycle}) activated. Subscription bucket reset to ${plan.monthlyCredits.toLocaleString()} credits.`,
        user: updatedUser,
      });
      return;
    }

    if (kind === 'topup') {
      const pack = db.topups.find((t) => t.id === topupId);
      if (!pack) {
        res.status(400).json({ error: 'Invalid credit top-up pack.' });
        return;
      }

      const plan = db.plans.find((p) => p.id === user.plan) || db.plans[0];
      const bonusMultiplier = plan.topupRatePerDollar / 100;
      const totalCreditsGranted = Math.round(pack.credits * Math.max(1, bonusMultiplier));
      const sessionId = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const updatedUser = db.grantTopupCredits({
        userId: user.id,
        credits: totalCreditsGranted,
        sessionId,
        packName: `${pack.name} (${plan.name} rate)`,
      });

      res.json({
        ok: true,
        mode: 'payment',
        creditsAdded: totalCreditsGranted,
        message: `Added ${totalCreditsGranted.toLocaleString()} non-expiring top-up credits to your vault.`,
        user: updatedUser,
      });
      return;
    }

    res.status(400).json({ error: 'Unsupported checkout mode.' });
  });

  app.post('/api/webhooks/stripe', (req: Request, res: Response) => {
    const eventId = String(req.body?.id || `evt_${Date.now()}`);
    if (db.stripeEvents.has(eventId)) {
      res.json({ received: true, deduped: true });
      return;
    }
    db.stripeEvents.add(eventId);
    res.json({ received: true });
  });

  // ===========================================================================
  // 9. COMPREHENSIVE ADMIN OPERATIONS CENTER ROUTES (`/api/admin/*`)
  // ===========================================================================
  const requireAdmin = (req: Request, res: Response): UserProfile | null => {
    const user = getSessionUser(req);
    if (!user || user.role !== 'admin') {
      res.status(404).json({ error: 'Not found' });
      return null;
    }
    return user;
  };

  app.get('/api/admin/overview', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    res.json({
      users: Array.from(db.users.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      generations: Array.from(db.generations.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      modelPricing: Array.from(db.modelPricing.values()),
      providers: db.getPublicProviderConfigs(),
      secrets: db.getPlatformSecrets(),
      presets: Array.from(db.presets.values()),
      plans: db.plans,
      topups: db.topups,
      billingConfig: db.billingConfig,
      notifications: db.notifications,
      supportTickets: db.supportTickets,
      teamMembers: db.teamMembers,
      auditLog: db.adminAuditLog,
      reports: db.reports,
      ledger: db.ledger.slice(0, 80),
      runwareRoutingConfig: db.runwareRoutingConfig,
      runwareRecentTasks: Array.from(db.runwareTaskHistory.values()).slice(-20).reverse(),
    });
  });

  // 9.0 Database Secrets Vault CRUD (`/api/admin/secrets`)
  const handleSecretMutation = (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const key = String(req.params.key || req.body?.key || '').trim().toUpperCase();
    if (!key) {
      res.status(400).json({ error: 'Secret key name is required.' });
      return;
    }

    if (req.method === 'DELETE' || req.body?.action === 'delete') {
      db.deletePlatformSecret(key);
      db.recordAudit(admin.email, 'SECRET_DELETE', key, `Cleared secret ${key} in database`);
      res.json({ ok: true, secrets: db.getPlatformSecrets(), providers: db.getPublicProviderConfigs() });
      return;
    }

    const { secretValue = '', label, category, description } = req.body || {};
    const entry = db.upsertPlatformSecret({
      key,
      secretValue: String(secretValue),
      label: typeof label === 'string' ? label : undefined,
      category,
      description: typeof description === 'string' ? description : undefined,
    });
    db.recordAudit(admin.email, 'SECRET_UPSERT', entry.key, `Saved secret ${entry.key} (${entry.category}) in database`);
    res.json({
      ok: true,
      secret: entry,
      secrets: db.getPlatformSecrets(),
      providers: db.getPublicProviderConfigs(),
    });
  };
  app.post('/api/admin/secrets', handleSecretMutation);
  app.patch('/api/admin/secrets/:key', handleSecretMutation);
  app.post('/api/admin/secrets/:key', handleSecretMutation);
  app.delete('/api/admin/secrets/:key', handleSecretMutation);

  // 9.1 Provider Gateways & Multi-Key Secret Vault Management (Add, Edit, Delete, Set Primary, Enable/Disable)
  const handleProviderAndKeysMutation = (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const providerId = req.params.providerId as ApiProviderId;
    const {
      keyAction,
      keyId,
      label,
      keyValue,
      isPrimary,
      keyEnabled,
      enabled,
      baseUrl,
      secondaryUrl,
      apiKey,
      apiKeyLabel,
      webhookSecret,
      defaultCallingPattern,
      priority,
      healthStatus,
    } = req.body || {};

    if (keyAction === 'add') {
      const updated = db.addProviderApiKey(providerId, {
        label: typeof label === 'string' ? label : apiKeyLabel,
        keyValue: String(keyValue || apiKey || ''),
        isPrimary: typeof isPrimary === 'boolean' ? isPrimary : true,
      });
      if (!updated) {
        res.status(400).json({ error: 'Valid API key value is required.' });
        return;
      }
      db.recordAudit(
        admin.email,
        'PROVIDER_KEY_ADD',
        providerId,
        `Added API key "${label || 'New Key'}" to ${updated.label}`
      );
      res.json({ ok: true, provider: updated, providers: db.getPublicProviderConfigs() });
      return;
    }

    if (keyAction === 'edit' && keyId) {
      const updated = db.updateProviderApiKey(providerId, String(keyId), {
        label: typeof label === 'string' ? label : undefined,
        keyValue: typeof keyValue === 'string' ? keyValue : undefined,
        isPrimary: typeof isPrimary === 'boolean' ? isPrimary : undefined,
        enabled: typeof keyEnabled === 'boolean' ? keyEnabled : undefined,
      });
      if (!updated) {
        res.status(404).json({ error: 'API key not found.' });
        return;
      }
      db.recordAudit(
        admin.email,
        'PROVIDER_KEY_EDIT',
        providerId,
        `Updated API key ${keyId} on ${updated.label}`
      );
      res.json({ ok: true, provider: updated, providers: db.getPublicProviderConfigs() });
      return;
    }

    if (keyAction === 'delete' && keyId) {
      const updated = db.deleteProviderApiKey(providerId, String(keyId));
      if (!updated) {
        res.status(404).json({ error: 'API key not found.' });
        return;
      }
      db.recordAudit(
        admin.email,
        'PROVIDER_KEY_DELETE',
        providerId,
        `Deleted API key ${keyId} from ${updated.label}`
      );
      res.json({ ok: true, provider: updated, providers: db.getPublicProviderConfigs() });
      return;
    }

    const updated = db.updateProviderConfig(providerId, {
      enabled: typeof enabled === 'boolean' ? enabled : undefined,
      baseUrl: typeof baseUrl === 'string' ? baseUrl : undefined,
      secondaryUrl: typeof secondaryUrl === 'string' ? secondaryUrl : undefined,
      apiKey: typeof apiKey === 'string' ? apiKey : undefined,
      apiKeyLabel: typeof apiKeyLabel === 'string' ? apiKeyLabel : undefined,
      webhookSecret: typeof webhookSecret === 'string' ? webhookSecret : undefined,
      defaultCallingPattern: defaultCallingPattern as ApiProviderCallingPattern | undefined,
      priority: typeof priority === 'number' ? priority : undefined,
      healthStatus,
    });

    if (!updated) {
      res.status(404).json({ error: 'Provider gateway not found' });
      return;
    }

    db.recordAudit(
      admin.email,
      'PROVIDER_CONFIG_UPDATE',
      providerId,
      `Updated ${updated.label} (enabled=${updated.enabled}${
        typeof apiKey === 'string' ? ', added API key' : ''
      })`
    );

    res.json({ ok: true, provider: updated, providers: db.getPublicProviderConfigs() });
  };

  app.patch('/api/admin/providers/:providerId', handleProviderAndKeysMutation);
  app.post('/api/admin/providers/:providerId', handleProviderAndKeysMutation);
  app.all('/api/admin/providers/:providerId/keys', handleProviderAndKeysMutation);

  // 9.1b Admin Runware v1 API Operations Suite (Ping, Model Search, Task Details, Media Storage, Auto Router)
  app.post('/api/admin/runware/ping', async (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const rwGateway = db.providerConfigs.get('runware');
    const result = await pingRunwareConnection(
      rwGateway?.rawSecret || env.RUNWARE_API_KEY,
      rwGateway?.baseUrl || env.RUNWARE_BASE_URL
    );
    db.recordAudit(
      admin.email,
      'RUNWARE_PING',
      result.endpoint,
      `{ taskType: "ping", pong: ${result.pong} } (${result.latencyMs}ms)`
    );
    res.json(result);
  });

  app.post('/api/admin/runware/model-search', async (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const rwGateway = db.providerConfigs.get('runware');
    const { search, source, category, architecture, limit = 20, offset = 0 } = req.body || {};
    const searchRes = await searchRunwareModels(
      { search, source, category, architecture, limit, offset },
      rwGateway?.rawSecret || env.RUNWARE_API_KEY,
      rwGateway?.baseUrl || env.RUNWARE_BASE_URL
    );
    res.json(searchRes);
  });

  app.post('/api/admin/runware/task-details', async (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const rwGateway = db.providerConfigs.get('runware');
    const taskUUID = String(req.body?.taskUUID || '').trim();
    if (!taskUUID) {
      res.status(400).json({ error: 'taskUUID is required.' });
      return;
    }
    const mode = String(req.body?.mode || 'getTaskDetails');
    const stored = db.runwareTaskHistory.get(taskUUID);

    if (mode === 'getResponse') {
      const pollRes = await pollRunwareTaskResponse(
        taskUUID,
        rwGateway?.rawSecret || env.RUNWARE_API_KEY,
        rwGateway?.baseUrl || env.RUNWARE_BASE_URL
      );
      res.json({
        taskType: 'getResponse',
        taskUUID,
        request: [{ taskType: 'getResponse', taskUUID }],
        response: pollRes,
      });
      return;
    }

    const details = await getRunwareTaskDetails(
      taskUUID,
      rwGateway?.rawSecret || env.RUNWARE_API_KEY,
      rwGateway?.baseUrl || env.RUNWARE_BASE_URL,
      stored
    );
    res.json(details);
  });

  app.post('/api/admin/runware/media-storage', async (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const rwGateway = db.providerConfigs.get('runware');
    const operation = req.body?.operation === 'delete' ? 'delete' : 'upload';
    const media = String(req.body?.media || '').trim();
    if (!media) {
      res.status(400).json({ error: 'Media URL, Data URI, or mediaUUID is required.' });
      return;
    }
    const result = await runwareMediaStorage(
      { operation, media },
      rwGateway?.rawSecret || env.RUNWARE_API_KEY,
      rwGateway?.baseUrl || env.RUNWARE_BASE_URL
    );
    db.recordAudit(
      admin.email,
      `RUNWARE_MEDIA_${operation.toUpperCase()}`,
      result.mediaUUID,
      `taskUUID=${result.taskUUID}`
    );
    res.json(result);
  });

  app.post('/api/admin/runware/router-config', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const {
      enabled,
      preferences,
      maxPrice,
      requirements,
      filterMode,
      allowedModels,
      excludedModels,
    } = req.body || {};

    if (typeof enabled === 'boolean') {
      db.runwareRoutingConfig.enabled = enabled;
    }
    if (preferences && typeof preferences === 'object') {
      db.runwareRoutingConfig.preferences = {
        quality: Math.min(5, Math.max(0, Number(preferences.quality ?? 5))),
        speed: Math.min(5, Math.max(0, Number(preferences.speed ?? 3))),
        cost: Math.min(5, Math.max(0, Number(preferences.cost ?? 2))),
      };
    }
    if (typeof maxPrice === 'number' && maxPrice >= 0) {
      db.runwareRoutingConfig.maxPrice = maxPrice;
    }
    if (typeof requirements === 'string') {
      db.runwareRoutingConfig.requirements = requirements.slice(0, 500);
    }
    if (
      filterMode === 'none' ||
      filterMode === 'allowedModels' ||
      filterMode === 'excludedModels'
    ) {
      db.runwareRoutingConfig.filterMode = filterMode;
    }
    if (Array.isArray(allowedModels)) {
      db.runwareRoutingConfig.allowedModels = allowedModels.map((m) => String(m).trim()).filter(Boolean);
    }
    if (Array.isArray(excludedModels)) {
      db.runwareRoutingConfig.excludedModels = excludedModels.map((m) => String(m).trim()).filter(Boolean);
    }

    db.recordAudit(
      admin.email,
      'RUNWARE_AUTO_ROUTER_UPDATE',
      'model: "auto"',
      `enabled=${db.runwareRoutingConfig.enabled}, quality=${db.runwareRoutingConfig.preferences.quality}, speed=${db.runwareRoutingConfig.preferences.speed}, cost=${db.runwareRoutingConfig.preferences.cost}, maxPrice=$${db.runwareRoutingConfig.maxPrice}`
    );
    db.saveToDisk();

    res.json({ ok: true, runwareRoutingConfig: db.runwareRoutingConfig });
  });

  // 9.2 Model Catalog & Provider Routing Management
  const handleModelRoutingMutation = (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const modelId = req.params.modelId;
    const existing = db.modelPricing.get(modelId);
    if (!existing) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    if (typeof req.body?.enabled === 'boolean') {
      existing.enabled = req.body.enabled;
    }
    if (typeof req.body?.baseHfUsd === 'number' && req.body.baseHfUsd > 0) {
      existing.baseHfUsd = req.body.baseHfUsd;
    }
    if (req.body?.preferredProvider) {
      existing.preferredProvider = req.body.preferredProvider as ApiProviderId;
      if (!existing.allowedProviders.includes(existing.preferredProvider)) {
        existing.allowedProviders.push(existing.preferredProvider);
      }
    }
    if (Array.isArray(req.body?.allowedProviders) && req.body.allowedProviders.length > 0) {
      existing.allowedProviders = req.body.allowedProviders as ApiProviderId[];
      if (!existing.allowedProviders.includes(existing.preferredProvider)) {
        existing.preferredProvider = existing.allowedProviders[0];
      }
    }
    if (typeof req.body?.customEndpoint === 'string') {
      existing.customEndpoint = req.body.customEndpoint.trim();
    }

    db.recordAudit(
      admin.email,
      'MODEL_ROUTING_UPDATE',
      modelId,
      `enabled=${existing.enabled}, preferredProvider=${existing.preferredProvider}, baseUsd=$${existing.baseHfUsd.toFixed(
        3
      )}`
    );
    db.saveToDisk();

    res.json({ ok: true, modelPricing: existing });
  };
  app.patch('/api/admin/models/:modelId', handleModelRoutingMutation);
  app.post('/api/admin/models/:modelId', handleModelRoutingMutation);

  // 9.3 User Management CRUD & Subscription / Wallet Management
  app.post('/api/admin/users', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const {
      name,
      email,
      password,
      role = 'user',
      adminSubRole,
      plan = 'free',
      billingCycle = 'monthly',
      subscriptionCredits = 50,
      topupCredits = 0,
    } = req.body || {};

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ error: 'Valid email is required.' });
      return;
    }

    for (const u of db.users.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        res.status(400).json({ error: 'A user with this email already exists.' });
        return;
      }
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const sub = Math.max(0, Math.round(Number(subscriptionCredits || 0)));
    const top = Math.max(0, Math.round(Number(topupCredits || 0)));
    const newUser: UserProfile = {
      id,
      name: String(name || cleanEmail.split('@')[0]).trim(),
      email: cleanEmail,
      role: role === 'admin' ? 'admin' : 'user',
      adminSubRole: role === 'admin' ? (adminSubRole as AdminRoleType) || 'ops_admin' : undefined,
      status: 'active',
      plan: plan as PlanTierId,
      billingCycle: billingCycle === 'annual' ? 'annual' : 'monthly',
      planRenewsAt:
        plan !== 'free'
          ? new Date(
              Date.now() + (billingCycle === 'annual' ? 365 : 30) * 86400 * 1000
            ).toISOString()
          : undefined,
      stripeCustomerId: `cus_${id}`,
      credits: {
        subscription: sub,
        topup: top,
        total: sub + top,
      },
      createdAt: new Date().toISOString(),
    };

    db.users.set(id, newUser);
    const initialPwd = typeof password === 'string' && password.trim().length >= 6 ? password.trim() : '@f33rinimi';
    db.setUserPassword(id, initialPwd);
    db.recordAudit(
      admin.email,
      'USER_CREATE',
      newUser.email,
      `Created user (${newUser.role}, plan=${newUser.plan}, credits=${newUser.credits.total})`
    );
    db.saveToDisk();

    res.json({ ok: true, user: newUser });
  });

  const handleAdminUserUpdate = (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const target = db.users.get(req.params.userId);
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const {
      name,
      email,
      password,
      role,
      adminSubRole,
      status,
      plan,
      billingCycle,
      subscriptionCredits,
      topupCredits,
      resetPlanAllowance,
      note,
    } = req.body || {};

    if (typeof name === 'string' && name.trim()) target.name = name.trim();
    if (typeof email === 'string' && email.includes('@')) target.email = email.trim().toLowerCase();
    if (typeof password === 'string' && password.trim().length >= 6) {
      db.setUserPassword(target.id, password.trim());
    }
    if (role === 'admin' || role === 'user') {
      target.role = role;
      if (role === 'user') target.adminSubRole = undefined;
    }
    if (adminSubRole && target.role === 'admin') {
      target.adminSubRole = adminSubRole as AdminRoleType;
    }
    if (status === 'active' || status === 'suspended') {
      target.status = status;
    }
    if (billingCycle === 'monthly' || billingCycle === 'annual') {
      target.billingCycle = billingCycle;
    }
    if (plan && ['free', 'starter', 'plus', 'ultra'].includes(plan)) {
      target.plan = plan as PlanTierId;
      if (resetPlanAllowance) {
        const planSpec = db.plans.find((p) => p.id === target.plan);
        if (planSpec) {
          db.resetSubscriptionCredits({
            userId: target.id,
            plan: target.plan,
            billingCycle: target.billingCycle || 'monthly',
            allowance: planSpec.monthlyCredits,
            invoiceId: `in_adm_${Date.now()}`,
          });
        }
      }
    }

    if (typeof subscriptionCredits === 'number' || typeof topupCredits === 'number') {
      db.adminSetWalletBalances({
        userId: target.id,
        subscriptionCredits:
          typeof subscriptionCredits === 'number' ? subscriptionCredits : undefined,
        topupCredits: typeof topupCredits === 'number' ? topupCredits : undefined,
        note: note || `Updated by ${admin.email}`,
      });
    }

    db.recordAudit(
      admin.email,
      'USER_UPDATE',
      target.email,
      `role=${target.role}, status=${target.status || 'active'}, plan=${target.plan}, totalCredits=${target.credits.total}`
    );
    db.saveToDisk();

    res.json({ ok: true, user: target });
  };
  app.patch('/api/admin/users/:userId', handleAdminUserUpdate);
  app.post('/api/admin/users/:userId', handleAdminUserUpdate);

  app.delete('/api/admin/users/:userId', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const target = db.users.get(req.params.userId);
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (target.id === admin.id) {
      res.status(400).json({ error: 'Cannot delete your own active super-admin account.' });
      return;
    }

    db.users.delete(target.id);
    db.recordAudit(admin.email, 'USER_DELETE', target.email, `Deleted user ${target.id}`);
    db.saveToDisk();
    res.json({ ok: true });
  });

  app.post('/api/admin/credits', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { userId, delta, bucket = 'topup', note } = req.body || {};
    const updated = db.adminAdjustCredits({
      userId: String(userId),
      delta: Number(delta || 0),
      bucket: bucket === 'subscription' ? 'subscription' : 'topup',
      note: String(note || 'Admin console adjustment'),
    });

    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    db.recordAudit(
      admin.email,
      'WALLET_DELTA_ADJUST',
      updated.email,
      `${Number(delta) >= 0 ? '+' : ''}${delta} credits (${bucket}): ${note}`
    );

    res.json({ ok: true, user: updated });
  });

  // 9.4 Users Generation Management Actions
  app.post('/api/admin/generations/:id/action', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const gen = db.generations.get(req.params.id);
    if (!gen) {
      res.status(404).json({ error: 'Generation not found' });
      return;
    }

    const action = String(req.body?.action || '');
    if (action === 'refund') {
      const refunded = db.refundGenerationCredits({
        userId: gen.userId,
        generationId: gen.id,
        cost: gen.cost,
        note: `Admin manual refund by ${admin.email} (${gen.modelLabel})`,
      });
      db.recordAudit(
        admin.email,
        'GENERATION_REFUND',
        gen.id,
        refunded ? `Refunded ${gen.cost} credits to ${gen.userId}` : 'Already refunded'
      );
      res.json({ ok: true, refunded, generation: gen });
      return;
    }

    if (action === 'toggle_public') {
      gen.isPublic = !gen.isPublic;
      gen.publishedAt = gen.isPublic ? new Date().toISOString() : undefined;
      gen.updatedAt = new Date().toISOString();
      db.recordAudit(
        admin.email,
        'GENERATION_VISIBILITY',
        gen.id,
        `Set isPublic=${gen.isPublic}`
      );
      res.json({ ok: true, generation: gen });
      return;
    }

    if (action === 'mark_nsfw') {
      gen.status = 'nsfw';
      gen.isPublic = false;
      gen.error = 'Flagged NSFW by SPACIX Trust & Safety Admin. Credits refunded.';
      gen.updatedAt = new Date().toISOString();
      db.refundGenerationCredits({
        userId: gen.userId,
        generationId: gen.id,
        cost: gen.cost,
        note: `Admin NSFW moderation refund (${gen.modelLabel})`,
      });
      db.recordAudit(admin.email, 'GENERATION_MARK_NSFW', gen.id, 'Flagged NSFW & unpublished');
      res.json({ ok: true, generation: gen });
      return;
    }

    if (action === 'delete') {
      db.generations.delete(gen.id);
      db.recordAudit(admin.email, 'GENERATION_DELETE', gen.id, `Deleted run ${gen.id}`);
      res.json({ ok: true, deleted: true });
      return;
    }

    res.status(400).json({ error: 'Unsupported generation action' });
  });

  // 9.5 Pricing, Plans & Billing Management
  app.patch('/api/admin/billing', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const { creditUsdValue, creditMarkup, signupBonusCredits, plans, topups } = req.body || {};

    if (typeof creditUsdValue === 'number' && creditUsdValue > 0) {
      db.billingConfig.creditUsdValue = creditUsdValue;
    }
    if (typeof creditMarkup === 'number' && creditMarkup > 0) {
      db.billingConfig.creditMarkup = creditMarkup;
    }
    if (typeof signupBonusCredits === 'number' && signupBonusCredits >= 0) {
      db.billingConfig.signupBonusCredits = Math.round(signupBonusCredits);
    }
    if (Array.isArray(plans)) {
      db.plans = plans;
    }
    if (Array.isArray(topups)) {
      db.topups = topups;
    }

    db.recordAudit(
      admin.email,
      'BILLING_ECONOMICS_UPDATE',
      'Global Billing & Plans',
      `creditUsd=$${db.billingConfig.creditUsdValue}, markup=${db.billingConfig.creditMarkup}x, signupBonus=${db.billingConfig.signupBonusCredits}`
    );
    db.saveToDisk();

    res.json({
      ok: true,
      billingConfig: db.billingConfig,
      plans: db.plans,
      topups: db.topups,
    });
  });

  // 9.6 Notification & Broadcast Management
  app.post('/api/admin/notifications', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const {
      title,
      message,
      type = 'info',
      targetAudience = 'all',
      ctaLabel,
      ctaRoute,
      active = true,
    } = req.body || {};

    if (!title || !message) {
      res.status(400).json({ error: 'Notification title and message are required.' });
      return;
    }

    const notif: PlatformNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: String(title).trim(),
      message: String(message).trim(),
      type: type as PlatformNotification['type'],
      targetAudience: targetAudience as PlatformNotification['targetAudience'],
      active: Boolean(active),
      ctaLabel: ctaLabel ? String(ctaLabel).trim() : undefined,
      ctaRoute: ctaRoute ? String(ctaRoute).trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    db.notifications.unshift(notif);
    db.recordAudit(
      admin.email,
      'NOTIFICATION_CREATE',
      notif.title,
      `Broadcast (${notif.type}) to ${notif.targetAudience}`
    );

    res.json({ ok: true, notification: notif, notifications: db.notifications });
  });

  app.patch('/api/admin/notifications/:id', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const notif = db.notifications.find((n) => n.id === req.params.id);
    if (!notif) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (typeof req.body?.active === 'boolean') notif.active = req.body.active;
    if (typeof req.body?.title === 'string') notif.title = req.body.title.trim();
    if (typeof req.body?.message === 'string') notif.message = req.body.message.trim();
    if (req.body?.type) notif.type = req.body.type;
    if (req.body?.targetAudience) notif.targetAudience = req.body.targetAudience;

    db.recordAudit(
      admin.email,
      'NOTIFICATION_TOGGLE',
      notif.title,
      `Set active=${notif.active}`
    );

    res.json({ ok: true, notification: notif, notifications: db.notifications });
  });

  app.delete('/api/admin/notifications/:id', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const idx = db.notifications.findIndex((n) => n.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    const [removed] = db.notifications.splice(idx, 1);
    db.recordAudit(admin.email, 'NOTIFICATION_DELETE', removed.title, 'Removed notification');
    res.json({ ok: true, notifications: db.notifications });
  });

  // 9.7 Support Tickets & Community Reports Management
  app.patch('/api/admin/support/:ticketId', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const ticket = db.supportTickets.find((t) => t.id === req.params.ticketId);
    if (!ticket) {
      res.status(404).json({ error: 'Support ticket not found' });
      return;
    }

    const { status, priority, assignedTo, replyMessage } = req.body || {};
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (typeof assignedTo === 'string') ticket.assignedTo = assignedTo;

    if (typeof replyMessage === 'string' && replyMessage.trim()) {
      ticket.messages.push({
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        authorName: `${admin.name} (SPACIX Admin)`,
        authorRole: 'admin',
        message: replyMessage.trim(),
        createdAt: new Date().toISOString(),
      });
      if (ticket.status === 'open') {
        ticket.status = 'in_progress';
      }
    }

    ticket.updatedAt = new Date().toISOString();
    db.recordAudit(
      admin.email,
      'SUPPORT_TICKET_UPDATE',
      ticket.id,
      `status=${ticket.status}, priority=${ticket.priority}`
    );

    res.json({ ok: true, ticket, supportTickets: db.supportTickets });
  });

  app.post('/api/admin/reports/:reportId/resolve', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const report = db.reports.find((r) => r.id === req.params.reportId);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const action = String(req.body?.action || 'dismiss');
    if (action === 'unpublish') {
      const gen = db.generations.get(report.generationId);
      if (gen) gen.isPublic = false;
      report.status = 'resolved';
    } else {
      report.status = 'dismissed';
    }

    db.recordAudit(
      admin.email,
      'MODERATION_REPORT_RESOLVE',
      report.id,
      `Action=${action} on generation ${report.generationId}`
    );

    res.json({ ok: true, report });
  });

  // 9.8 Platform Teams & Admin Roles Management (RBAC)
  app.post('/api/admin/team', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const {
      name,
      email,
      adminRole = 'ops_admin',
      department = 'Operations',
      permissions = [],
    } = req.body || {};

    if (!name || !email) {
      res.status(400).json({ error: 'Team member name and email are required.' });
      return;
    }

    const now = new Date().toISOString();
    const member: PlatformTeamMember = {
      id: `team_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      adminRole: adminRole as AdminRoleType,
      department: String(department).trim(),
      permissions: Array.isArray(permissions) ? permissions : [],
      status: 'active',
      lastActiveAt: now,
      createdAt: now,
    };

    db.teamMembers.push(member);
    db.recordAudit(
      admin.email,
      'TEAM_MEMBER_ADD',
      member.email,
      `Added ${member.name} as ${member.adminRole} (${member.department})`
    );

    res.json({ ok: true, member, teamMembers: db.teamMembers });
  });

  app.patch('/api/admin/team/:memberId', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const member = db.teamMembers.find((m) => m.id === req.params.memberId);
    if (!member) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }

    const { adminRole, department, permissions, status } = req.body || {};
    if (adminRole) member.adminRole = adminRole as AdminRoleType;
    if (typeof department === 'string') member.department = department;
    if (Array.isArray(permissions)) member.permissions = permissions;
    if (status) member.status = status;

    db.recordAudit(
      admin.email,
      'TEAM_ROLE_UPDATE',
      member.email,
      `role=${member.adminRole}, status=${member.status}`
    );

    res.json({ ok: true, member, teamMembers: db.teamMembers });
  });

  app.delete('/api/admin/team/:memberId', (req: Request, res: Response) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const idx = db.teamMembers.findIndex((m) => m.id === req.params.memberId);
    if (idx === -1) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    const [removed] = db.teamMembers.splice(idx, 1);
    db.recordAudit(admin.email, 'TEAM_MEMBER_REMOVE', removed.email, `Removed ${removed.name}`);
    res.json({ ok: true, teamMembers: db.teamMembers });
  });

  // ===========================================================================
  // VITE DEV MIDDLEWARE OR PRODUCTION STATIC ASSETS
  // ===========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SPACIX Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
