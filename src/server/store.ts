import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AdminAuditEntry,
  AdminRoleType,
  ApiProviderCallingPattern,
  ApiProviderId,
  CommunityReport,
  CreditBucket,
  CreditLedgerEntry,
  GenerationRecord,
  LedgerReason,
  PlanTierId,
  PlatformNotification,
  PlatformSecretEntry,
  PlatformTeamMember,
  PresetEffect,
  ProjectRecord,
  ProviderApiKeyEntry,
  ProviderGatewayConfig,
  SupportTicket,
  UploadRecord,
  UserProfile,
} from '../types/studio';
import { INITIAL_PRESETS } from '../catalog/presets';
import { getEffectiveProvidersForModel, MODEL_CATALOG } from '../catalog/models';
import { STUDIO_PLANS, StudioPlan, TOPUP_PACKS, TopupPack } from '../billing/plans';
import { env } from './env';
import {
  isRealExternalSecret,
  RunwareErrorItem,
  RunwareRoutingConfig,
  RunwareTaskRequest,
  RunwareTaskResultItem,
} from './higgsfield';

export interface MagicLinkTokenRecord {
  token: string;
  email: string;
  expiresAt: number;
  used: boolean;
  magicUrl: string;
  createdAt: string;
}

export interface PasswordResetRecord {
  token: string;
  email: string;
  code: string;
  expiresAt: number;
  used: boolean;
  createdAt: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  rememberMe: boolean;
  expiresAt: number;
  createdAt: string;
}

export interface ModelPricingOverride {
  modelId: string;
  enabled: boolean;
  baseHfUsd: number;
  preferredProvider: ApiProviderId;
  allowedProviders: ApiProviderId[];
  customEndpoint?: string;
}

export interface StoredProviderGateway extends ProviderGatewayConfig {
  rawSecret: string;
  rawWebhookSecret: string;
}

export interface GlobalBillingConfig {
  creditUsdValue: number;
  creditMarkup: number;
  signupBonusCredits: number;
}

export function maskSecretValue(secret: string, prefixHint = 'sk'): string {
  const clean = (secret || '').trim();
  if (!clean) return 'No secret configured';
  if (clean.length <= 8) return `${prefixHint}_••••••••`;
  return `${clean.slice(0, 6)}••••••••${clean.slice(-4)}`;
}

export function hashPasswordPbkdf2(password: string, saltOverride?: string): string {
  const salt = saltOverride || crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$${salt}$${derived}`;
}

export function verifyPasswordPbkdf2(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;
  if (storedHash.startsWith('pbkdf2_sha256$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expected = hashPasswordPbkdf2(password, salt);
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(storedHash));
    } catch {
      return expected === storedHash;
    }
  }
  return false;
}

const LEGACY_SEED_USER_IDS = new Set([
  'usr_director_01',
  'usr_community_02',
  'usr_studio_03',
  'usr_agency_04',
]);

const LEGACY_SEED_GEN_IDS = new Set([
  'gen_seed_01',
  'gen_seed_02',
  'gen_seed_03',
  'gen_seed_04',
  'gen_seed_05',
]);

const LEGACY_SEED_PROJECT_IDS = new Set(['proj_neo_tokyo_reel']);

const LEGACY_SEED_UPLOAD_IDS = new Set([
  'upl_seed_frame_1',
  'upl_seed_frame_2',
  'upl_seed_frame_3',
]);

const LEGACY_SEED_TICKET_IDS = new Set([
  'tkt_1043',
  'tkt_1042',
  'tkt_1041',
  'tkt_1039',
]);

const LEGACY_SEED_NOTIF_IDS = new Set([
  'notif_new_models_01',
  'notif_fal_router_01',
  'notif_annual_promo_02',
]);

const LEGACY_SEED_TEAM_IDS = new Set(['team_01', 'team_02', 'team_03', 'team_04']);

const DEFAULT_SECRET_DEFINITIONS: Array<{
  key: string;
  category: PlatformSecretEntry['category'];
  label: string;
  description: string;
  defaultValue?: string;
}> = [
  {
    key: 'AUTH_JWT_SECRET',
    category: 'auth',
    label: 'Authentication Session Signing Secret',
    description: 'Cryptographic secret stored in DB for signing session tokens and password reset codes.',
  },
  {
    key: 'RUNWARE_API_KEY',
    category: 'system',
    label: 'Runware.ai Primary API Key',
    description: 'Primary Runware v1 Bearer token synced with the Runware provider gateway.',
  },
  {
    key: 'FAL_KEY',
    category: 'system',
    label: 'fal.ai Primary API Key',
    description: 'Primary fal.ai API key synced with the fal.ai provider gateway.',
  },
  {
    key: 'HF_CREDENTIALS',
    category: 'system',
    label: 'Higgsfield API Credentials',
    description: 'Primary Higgsfield key_id:key_secret synced with the Higgsfield provider gateway.',
  },
  {
    key: 'MUAPI_KEY',
    category: 'system',
    label: 'Muapi.ai Primary API Key',
    description: 'Primary Muapi.ai Bearer key synced with the Muapi provider gateway.',
  },
  {
    key: 'WEBHOOK_HMAC_SECRET',
    category: 'webhook',
    label: 'Provider Webhook HMAC Secret',
    description: 'HMAC-SHA256 signing secret used to verify incoming provider webhooks.',
  },
  {
    key: 'STRIPE_SECRET_KEY',
    category: 'billing',
    label: 'Stripe Secret Key (sk_live / sk_test)',
    description: 'Stripe API secret key for live subscription and credit top-up checkout sessions.',
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    category: 'billing',
    label: 'Stripe Webhook Signing Secret (whsec_)',
    description: 'Stripe webhook endpoint secret for invoice and checkout verification.',
  },
  {
    key: 'RESEND_API_KEY',
    category: 'email',
    label: 'Resend / Transactional Email API Key',
    description: 'API key for delivering password reset codes and magic sign-in emails.',
  },
  {
    key: 'EMAIL_FROM',
    category: 'email',
    label: 'Sender Email Identity',
    description: 'Default From address used for password reset and transactional emails.',
    defaultValue: 'SPACIX <noreply@spacix.ticketplaster.com>',
  },
  {
    key: 'R2_ENDPOINT',
    category: 'storage',
    label: 'Cloudflare R2 / S3 Endpoint URL',
    description: 'S3-compatible endpoint URL for permanent media archiving.',
  },
  {
    key: 'R2_BUCKET',
    category: 'storage',
    label: 'Cloudflare R2 Bucket Name',
    description: 'Target bucket name for archived generations and reference uploads.',
    defaultValue: 'spacix-media',
  },
  {
    key: 'R2_ACCESS_KEY_ID',
    category: 'storage',
    label: 'Cloudflare R2 Access Key ID',
    description: 'Access Key ID for R2 object storage writes.',
  },
  {
    key: 'R2_SECRET_ACCESS_KEY',
    category: 'storage',
    label: 'Cloudflare R2 Secret Access Key',
    description: 'Secret Access Key for R2 object storage writes.',
  },
  {
    key: 'CRON_SECRET',
    category: 'system',
    label: 'Cron Reconciler Secret',
    description: 'Bearer secret protecting /api/cron/reconcile.',
  },
];

class StudioDatabase {
  users = new Map<string, UserProfile>();
  userPasswords = new Map<string, string>(); // userId -> password_hash
  sessions = new Map<string, string>(); // token -> userId
  sessionMeta = new Map<string, SessionRecord>(); // token -> SessionRecord
  magicTokens = new Map<string, MagicLinkTokenRecord>();
  passwordResets = new Map<string, PasswordResetRecord>();
  platformSecrets = new Map<string, PlatformSecretEntry>();
  generations = new Map<string, GenerationRecord>();
  projects = new Map<string, ProjectRecord>();
  uploads = new Map<string, UploadRecord>();
  ledger: CreditLedgerEntry[] = [];
  ledgerUniqueKeys = new Set<string>();
  stripeEvents = new Set<string>();
  hfWebhookEvents = new Set<string>();
  processedRunwareWebhooks = new Set<string>();
  runwareTaskHistory = new Map<
    string,
    {
      taskUUID: string;
      generationId?: string;
      request: RunwareTaskRequest[];
      response: { data?: RunwareTaskResultItem[]; errors?: RunwareErrorItem[] };
      createdAt: string;
    }
  >();
  runwareRoutingConfig: RunwareRoutingConfig = {
    enabled: false,
    preferences: {
      quality: 5,
      speed: 3,
      cost: 2,
    },
    maxPrice: 0.5,
    requirements: 'Prefer photorealistic cinema optics and natural skin texture.',
    filterMode: 'none',
    allowedModels: ['xai:grok-imagine@image-2.0', 'bfl:flux-2@pro', 'runware:z-image@0'],
    excludedModels: [],
  };
  presets = new Map<string, PresetEffect>();
  modelPricing = new Map<string, ModelPricingOverride>();
  providerConfigs = new Map<ApiProviderId, StoredProviderGateway>();
  plans: StudioPlan[] = [];
  topups: TopupPack[] = [];
  billingConfig: GlobalBillingConfig = {
    creditUsdValue: env.CREDIT_USD_VALUE,
    creditMarkup: env.CREDIT_MARKUP,
    signupBonusCredits: env.SIGNUP_BONUS_CREDITS,
  };
  notifications: PlatformNotification[] = [];
  supportTickets: SupportTicket[] = [];
  teamMembers: PlatformTeamMember[] = [];
  adminAuditLog: AdminAuditEntry[] = [];
  reports: CommunityReport[] = [];
  rateLimits = new Map<string, { count: number; expiresAt: number }>();
  r2Blobs = new Map<string, { contentType: string; dataUrl: string }>();

  private storeFilePath = path.resolve(process.cwd(), '.spacix-store.json');

  constructor() {
    this.initStructuralCatalog();
    this.loadFromDisk();
    this.ensureBootstrapAccountsAndSecrets();
    this.saveToDisk();
  }

  private initStructuralCatalog() {
    const now = new Date().toISOString();

    const initialProviders: StoredProviderGateway[] = [
      {
        id: 'runware',
        label: 'Runware.ai Sonic Engine',
        enabled: true,
        baseUrl: env.RUNWARE_BASE_URL,
        authScheme: 'Authorization: Bearer $RUNWARE_API_KEY',
        rawSecret: '',
        rawWebhookSecret: '',
        secretMasked: 'No active API key configured',
        hasSecret: false,
        apiKeys: [],
        webhookSecretMasked: 'No secret configured',
        defaultCallingPattern: 'task_stream',
        priority: 1,
        healthStatus: 'operational',
        updatedAt: now,
      },
      {
        id: 'fal',
        label: 'fal.ai Model APIs',
        enabled: true,
        baseUrl: env.FAL_QUEUE_BASE_URL,
        secondaryUrl: env.FAL_RUN_BASE_URL,
        authScheme: 'Authorization: Key $FAL_KEY',
        rawSecret: '',
        rawWebhookSecret: '',
        secretMasked: 'No active API key configured',
        hasSecret: false,
        apiKeys: [],
        webhookSecretMasked: 'No secret configured',
        defaultCallingPattern: 'subscribe',
        priority: 2,
        healthStatus: 'operational',
        updatedAt: now,
      },
      {
        id: 'higgsfield',
        label: 'Higgsfield AI',
        enabled: true,
        baseUrl: env.HF_API_BASE_URL,
        authScheme: 'Authorization: Key $HF_CREDENTIALS',
        rawSecret: '',
        rawWebhookSecret: '',
        secretMasked: 'No active API key configured',
        hasSecret: false,
        apiKeys: [],
        webhookSecretMasked: 'No secret configured',
        defaultCallingPattern: 'queue',
        priority: 3,
        healthStatus: 'operational',
        updatedAt: now,
      },
      {
        id: 'muapi',
        label: 'Muapi.ai Unified Router',
        enabled: true,
        baseUrl: env.MUAPI_BASE_URL,
        authScheme: 'Authorization: Bearer $MUAPI_KEY',
        rawSecret: '',
        rawWebhookSecret: '',
        secretMasked: 'No active API key configured',
        hasSecret: false,
        apiKeys: [],
        webhookSecretMasked: 'No secret configured',
        defaultCallingPattern: 'queue',
        priority: 4,
        healthStatus: 'operational',
        updatedAt: now,
      },
    ];

    for (const p of initialProviders) {
      this.providerConfigs.set(p.id, p);
    }

    this.plans = STUDIO_PLANS.map((p) => ({
      ...p,
      parallelLimits: { ...p.parallelLimits },
      features: [...p.features],
    }));
    this.topups = TOPUP_PACKS.map((t) => ({ ...t }));

    for (const preset of INITIAL_PRESETS) {
      this.presets.set(preset.slug, { ...preset });
    }

    for (const model of MODEL_CATALOG) {
      const specs = getEffectiveProvidersForModel(model);
      const allowed = specs.map((s) => s.providerId);
      if (!allowed.includes('runware')) {
        allowed.unshift('runware');
      }
      const preferred: ApiProviderId = 'runware';
      this.modelPricing.set(model.id, {
        modelId: model.id,
        enabled: true,
        baseHfUsd: model.baseHfUsd,
        preferredProvider: preferred,
        allowedProviders: allowed,
        customEndpoint:
          specs.find((s) => s.providerId === preferred)?.endpoint || model.restPaths.default,
      });
    }
  }

  loadFromDisk() {
    try {
      if (!fs.existsSync(this.storeFilePath)) return;
      const raw = fs.readFileSync(this.storeFilePath, 'utf-8');
      if (!raw.trim()) return;
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed.users)) {
        for (const u of parsed.users) {
          if (u && u.id && !LEGACY_SEED_USER_IDS.has(u.id)) {
            this.users.set(u.id, u);
          }
        }
      }
      if (parsed.userPasswords && typeof parsed.userPasswords === 'object') {
        for (const [uid, pwdHash] of Object.entries(parsed.userPasswords)) {
          if (typeof pwdHash === 'string' && !LEGACY_SEED_USER_IDS.has(uid)) {
            this.userPasswords.set(uid, pwdHash);
          }
        }
      }
      if (Array.isArray(parsed.sessionMeta)) {
        const nowMs = Date.now();
        for (const s of parsed.sessionMeta) {
          if (
            s &&
            s.token &&
            s.userId &&
            s.token !== 'default_session_token' &&
            s.token !== 'creator_session_token' &&
            !LEGACY_SEED_USER_IDS.has(s.userId) &&
            Number(s.expiresAt) > nowMs
          ) {
            this.sessionMeta.set(s.token, s);
            this.sessions.set(s.token, s.userId);
          }
        }
      }
      if (Array.isArray(parsed.passwordResets)) {
        const nowMs = Date.now();
        for (const pr of parsed.passwordResets) {
          if (pr && pr.token && Number(pr.expiresAt) > nowMs && !pr.used) {
            this.passwordResets.set(pr.token, pr);
          }
        }
      }
      if (Array.isArray(parsed.platformSecrets)) {
        for (const sec of parsed.platformSecrets) {
          if (sec && sec.key) {
            this.platformSecrets.set(sec.key, sec);
          }
        }
      }
      if (Array.isArray(parsed.providerConfigs)) {
        for (const p of parsed.providerConfigs) {
          if (p && p.id) {
            const cleanKeys = Array.isArray(p.apiKeys)
              ? p.apiKeys.filter((k: ProviderApiKeyEntry) => isRealExternalSecret(k.keyValue))
              : [];
            p.apiKeys = cleanKeys;
            if (!isRealExternalSecret(p.rawSecret)) {
              p.rawSecret = '';
            }
            if (
              p.rawWebhookSecret === 'spacix-hf-webhook-hmac-secret' ||
              p.rawWebhookSecret === 'spacix-fal-webhook-hmac-secret' ||
              p.rawWebhookSecret === 'whsec_spacix_test'
            ) {
              p.rawWebhookSecret = '';
              p.webhookSecretMasked = 'No secret configured';
            }
            this.providerConfigs.set(p.id, p);
            this.syncProviderActiveSecret(p);
          }
        }
      }
      if (Array.isArray(parsed.modelPricing)) {
        for (const m of parsed.modelPricing) {
          if (m && m.modelId) {
            this.modelPricing.set(m.modelId, m);
          }
        }
      }
      if (Array.isArray(parsed.plans) && parsed.plans.length > 0) {
        this.plans = parsed.plans;
      }
      if (Array.isArray(parsed.topups) && parsed.topups.length > 0) {
        this.topups = parsed.topups;
      }
      if (parsed.billingConfig && typeof parsed.billingConfig === 'object') {
        this.billingConfig = { ...this.billingConfig, ...parsed.billingConfig };
      }
      if (Array.isArray(parsed.ledger)) {
        this.ledger = parsed.ledger.filter(
          (l: CreditLedgerEntry) =>
            l &&
            !LEGACY_SEED_USER_IDS.has(l.userId) &&
            l.refId !== 'in_seed_initial_plus' &&
            l.refId !== 'cs_seed_initial_boost' &&
            !LEGACY_SEED_GEN_IDS.has(l.refId)
        );
      }
      if (Array.isArray(parsed.ledgerUniqueKeys)) {
        this.ledgerUniqueKeys = new Set(
          parsed.ledgerUniqueKeys.filter(
            (k: string) =>
              !k.includes('in_seed_initial_plus') &&
              !k.includes('cs_seed_initial_boost') &&
              !k.includes('gen_seed_')
          )
        );
      }
      if (Array.isArray(parsed.generations)) {
        for (const g of parsed.generations) {
          if (g && g.id && !LEGACY_SEED_GEN_IDS.has(g.id)) {
            this.generations.set(g.id, g);
          }
        }
      }
      if (Array.isArray(parsed.projects)) {
        for (const pr of parsed.projects) {
          if (pr && pr.id && !LEGACY_SEED_PROJECT_IDS.has(pr.id)) {
            this.projects.set(pr.id, pr);
          }
        }
      }
      if (Array.isArray(parsed.uploads)) {
        for (const up of parsed.uploads) {
          if (up && up.id && !LEGACY_SEED_UPLOAD_IDS.has(up.id)) {
            this.uploads.set(up.id, up);
          }
        }
      }
      if (Array.isArray(parsed.notifications)) {
        this.notifications = parsed.notifications.filter(
          (n: PlatformNotification) => n && !LEGACY_SEED_NOTIF_IDS.has(n.id)
        );
      }
      if (Array.isArray(parsed.supportTickets)) {
        this.supportTickets = parsed.supportTickets.filter(
          (t: SupportTicket) => t && !LEGACY_SEED_TICKET_IDS.has(t.id)
        );
      }
      if (Array.isArray(parsed.teamMembers)) {
        this.teamMembers = parsed.teamMembers.filter(
          (m: PlatformTeamMember) => m && !LEGACY_SEED_TEAM_IDS.has(m.id)
        );
      }
      if (Array.isArray(parsed.adminAuditLog)) {
        this.adminAuditLog = parsed.adminAuditLog.filter(
          (a: AdminAuditEntry) =>
            a &&
            a.actorEmail !== 'director@spacix.studio' &&
            a.actorEmail !== 'viktor.ops@spacix.studio'
        );
      }
      if (parsed.runwareRoutingConfig && typeof parsed.runwareRoutingConfig === 'object') {
        this.runwareRoutingConfig = {
          ...this.runwareRoutingConfig,
          ...parsed.runwareRoutingConfig,
        };
      }

      const rwConfig = this.providerConfigs.get('runware');
      if (rwConfig) rwConfig.priority = 1;
      const falConfig = this.providerConfigs.get('fal');
      if (falConfig && falConfig.priority === 1) falConfig.priority = 2;
      const hfConfig = this.providerConfigs.get('higgsfield');
      if (hfConfig && hfConfig.priority <= 2) hfConfig.priority = 3;
      const muConfig = this.providerConfigs.get('muapi');
      if (muConfig && muConfig.priority <= 3) muConfig.priority = 4;

      for (const override of this.modelPricing.values()) {
        if (!override.allowedProviders.includes('runware')) {
          override.allowedProviders.unshift('runware');
        }
        const currentGw = this.providerConfigs.get(override.preferredProvider);
        const currentHasReal =
          currentGw && currentGw.enabled && isRealExternalSecret(currentGw.rawSecret);
        if (!currentHasReal) {
          override.preferredProvider = 'runware';
        }
      }

      for (const gw of this.providerConfigs.values()) {
        this.syncProviderActiveSecret(gw);
        if (gw.enabled && isRealExternalSecret(gw.rawSecret)) {
          this.promoteLiveProviderRouting(gw.id);
        }
      }
    } catch {
      // Ignore corrupt or missing store file on startup
    }
  }

  private ensureBootstrapAccountsAndSecrets() {
    const now = new Date().toISOString();

    // 1. Ensure primary Admin accounts exist in DB with real PBKDF2 password hash
    const adminSpecs = [
      {
        id: 'usr_admin_spacix',
        email: 'spacix@ticketplaster.com',
        name: 'SPACIX Admin',
      },
      {
        id: 'usr_admin_owner',
        email: 'earr.music@gmail.com',
        name: 'Studio Director',
      },
    ];

    for (const spec of adminSpecs) {
      let existing = Array.from(this.users.values()).find(
        (u) => u.email.toLowerCase() === spec.email.toLowerCase()
      );
      if (!existing) {
        existing = {
          id: spec.id,
          email: spec.email,
          name: spec.name,
          role: 'admin',
          adminSubRole: 'super_admin',
          status: 'active',
          plan: 'ultra',
          billingCycle: 'annual',
          credits: {
            subscription: this.billingConfig.signupBonusCredits,
            topup: 0,
            total: this.billingConfig.signupBonusCredits,
          },
          createdAt: now,
        };
        this.users.set(existing.id, existing);
      } else {
        existing.role = 'admin';
        existing.adminSubRole = 'super_admin';
      }
      if (!this.userPasswords.has(existing.id)) {
        this.userPasswords.set(existing.id, hashPasswordPbkdf2('@f33rinimi'));
      }
    }

    // Reassign any real user generations that had usr_director_01 to usr_admin_spacix
    for (const g of this.generations.values()) {
      if (LEGACY_SEED_USER_IDS.has(g.userId)) {
        g.userId = 'usr_admin_spacix';
        g.userName = 'SPACIX Admin';
      }
    }

    // Ensure real admin team entry exists in teamMembers if empty
    if (this.teamMembers.length === 0) {
      this.teamMembers.push({
        id: 'team_admin_01',
        name: 'SPACIX Admin',
        email: 'spacix@ticketplaster.com',
        adminRole: 'super_admin',
        department: 'Platform Architecture & Operations',
        permissions: [
          'providers.secrets.write',
          'models.routing.write',
          'users.crud',
          'users.subscriptions.write',
          'billing.pricing.write',
          'wallets.adjust',
          'generations.moderate',
          'notifications.broadcast',
          'support.manage',
          'team.rbac.write',
        ],
        status: 'active',
        lastActiveAt: now,
        createdAt: now,
      });
    }

    // 2. Ensure all platform secrets exist in the DB secrets table
    for (const def of DEFAULT_SECRET_DEFINITIONS) {
      if (!this.platformSecrets.has(def.key)) {
        let initialVal = def.defaultValue || '';
        if (def.key === 'AUTH_JWT_SECRET') {
          initialVal = env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
        } else if (def.key === 'WEBHOOK_HMAC_SECRET') {
          initialVal = env.HF_WEBHOOK_SECRET || crypto.randomBytes(24).toString('hex');
        } else if (def.key === 'CRON_SECRET') {
          initialVal = env.CRON_SECRET || crypto.randomBytes(20).toString('hex');
        } else if (def.key === 'RUNWARE_API_KEY') {
          initialVal = this.providerConfigs.get('runware')?.rawSecret || env.RUNWARE_API_KEY || '';
        } else if (def.key === 'FAL_KEY') {
          initialVal = this.providerConfigs.get('fal')?.rawSecret || env.FAL_KEY || '';
        } else if (def.key === 'HF_CREDENTIALS') {
          initialVal = this.providerConfigs.get('higgsfield')?.rawSecret || env.HF_CREDENTIALS || '';
        } else if (def.key === 'MUAPI_KEY') {
          initialVal = this.providerConfigs.get('muapi')?.rawSecret || env.MUAPI_KEY || '';
        } else if (def.key === 'STRIPE_SECRET_KEY') {
          initialVal = env.STRIPE_SECRET_KEY || '';
        } else if (def.key === 'STRIPE_WEBHOOK_SECRET') {
          initialVal = env.STRIPE_WEBHOOK_SECRET || '';
        }
        this.platformSecrets.set(def.key, {
          key: def.key,
          category: def.category,
          label: def.label,
          secretValue: initialVal,
          secretMasked: maskSecretValue(initialVal, def.key.toLowerCase().slice(0, 4)),
          hasValue: Boolean(initialVal.trim()),
          description: def.description,
          updatedAt: now,
        });
      }
    }

    // Sync provider active keys into platformSecrets
    const providerKeyMap: Record<ApiProviderId, string> = {
      runware: 'RUNWARE_API_KEY',
      fal: 'FAL_KEY',
      higgsfield: 'HF_CREDENTIALS',
      muapi: 'MUAPI_KEY',
    };
    for (const [provId, secKey] of Object.entries(providerKeyMap) as Array<[ApiProviderId, string]>) {
      const gw = this.providerConfigs.get(provId);
      const sec = this.platformSecrets.get(secKey);
      if (gw && sec) {
        if (gw.rawSecret && !sec.secretValue) {
          sec.secretValue = gw.rawSecret;
          sec.secretMasked = maskSecretValue(gw.rawSecret, provId);
          sec.hasValue = true;
          sec.updatedAt = now;
        } else if (sec.secretValue && !gw.rawSecret && isRealExternalSecret(sec.secretValue)) {
          this.addProviderApiKey(provId, {
            label: `${gw.label} Primary Key`,
            keyValue: sec.secretValue,
            isPrimary: true,
          });
        }
      }
    }
  }

  saveToDisk() {
    try {
      const passwordsObj: Record<string, string> = {};
      for (const [uid, hash] of this.userPasswords.entries()) {
        passwordsObj[uid] = hash;
      }
      const payload = {
        users: Array.from(this.users.values()),
        userPasswords: passwordsObj,
        sessionMeta: Array.from(this.sessionMeta.values()),
        passwordResets: Array.from(this.passwordResets.values()),
        platformSecrets: Array.from(this.platformSecrets.values()),
        providerConfigs: Array.from(this.providerConfigs.values()),
        modelPricing: Array.from(this.modelPricing.values()),
        plans: this.plans,
        topups: this.topups,
        billingConfig: this.billingConfig,
        ledger: this.ledger.slice(0, 300),
        ledgerUniqueKeys: Array.from(this.ledgerUniqueKeys),
        generations: Array.from(this.generations.values()).slice(0, 200),
        projects: Array.from(this.projects.values()),
        uploads: Array.from(this.uploads.values()),
        notifications: this.notifications,
        supportTickets: this.supportTickets,
        teamMembers: this.teamMembers,
        adminAuditLog: this.adminAuditLog.slice(0, 200),
        runwareRoutingConfig: this.runwareRoutingConfig,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.storeFilePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // Ignore write errors in read-only environments
    }
  }

  getSecretValue(key: string): string {
    return this.platformSecrets.get(key)?.secretValue || '';
  }

  getPlatformSecrets(): PlatformSecretEntry[] {
    return Array.from(this.platformSecrets.values());
  }

  upsertPlatformSecret(params: {
    key: string;
    secretValue: string;
    label?: string;
    category?: PlatformSecretEntry['category'];
    description?: string;
  }): PlatformSecretEntry {
    const cleanKey = params.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const cleanVal = (params.secretValue ?? '').trim();
    const now = new Date().toISOString();
    const existing = this.platformSecrets.get(cleanKey);

    const entry: PlatformSecretEntry = {
      key: cleanKey,
      category: params.category || existing?.category || 'system',
      label: (params.label || existing?.label || cleanKey).trim(),
      secretValue: cleanVal,
      secretMasked: maskSecretValue(cleanVal, cleanKey.toLowerCase().slice(0, 4)),
      hasValue: Boolean(cleanVal),
      description:
        params.description ||
        existing?.description ||
        'Custom encrypted secret stored in database.',
      updatedAt: now,
    };
    this.platformSecrets.set(cleanKey, entry);

    // Sync with provider gateway if this is one of the 4 provider API keys
    const keyToProvider: Record<string, ApiProviderId> = {
      RUNWARE_API_KEY: 'runware',
      FAL_KEY: 'fal',
      HF_CREDENTIALS: 'higgsfield',
      MUAPI_KEY: 'muapi',
    };
    const targetProv = keyToProvider[cleanKey];
    if (targetProv && cleanVal) {
      this.addProviderApiKey(targetProv, {
        label: `${entry.label}`,
        keyValue: cleanVal,
        isPrimary: true,
      });
    } else {
      this.saveToDisk();
    }

    return entry;
  }

  deletePlatformSecret(key: string): boolean {
    const cleanKey = key.trim().toUpperCase();
    const existing = this.platformSecrets.get(cleanKey);
    if (!existing) return false;
    const isDefault = DEFAULT_SECRET_DEFINITIONS.some((d) => d.key === cleanKey);
    if (isDefault) {
      existing.secretValue = '';
      existing.secretMasked = 'No secret configured';
      existing.hasValue = false;
      existing.updatedAt = new Date().toISOString();
    } else {
      this.platformSecrets.delete(cleanKey);
    }
    this.saveToDisk();
    return true;
  }

  createSession(userId: string, rememberMe = true): SessionRecord {
    const token = `sess_${Date.now()}_${crypto.randomBytes(18).toString('hex')}`;
    const ttlMs = rememberMe ? 30 * 86400 * 1000 : 24 * 3600 * 1000;
    const record: SessionRecord = {
      token,
      userId,
      rememberMe,
      expiresAt: Date.now() + ttlMs,
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(token, userId);
    this.sessionMeta.set(token, record);
    this.saveToDisk();
    return record;
  }

  deleteSession(token: string) {
    if (!token) return;
    this.sessions.delete(token);
    this.sessionMeta.delete(token);
    this.saveToDisk();
  }

  getUserBySessionToken(token: string | undefined): UserProfile | null {
    if (!token) return null;
    const clean = token.trim();
    if (!clean || clean === 'signed_out' || clean === 'default_session_token') return null;

    const meta = this.sessionMeta.get(clean);
    if (meta) {
      if (meta.expiresAt <= Date.now()) {
        this.deleteSession(clean);
        return null;
      }
      return this.users.get(meta.userId) || null;
    }

    const uid = this.sessions.get(clean);
    if (!uid) return null;
    return this.users.get(uid) || null;
  }

  findUserByEmail(email: string): UserProfile | null {
    const norm = (email || '').trim().toLowerCase();
    if (!norm) return null;
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === norm) return u;
    }
    return null;
  }

  registerUserWithPassword(params: {
    name: string;
    email: string;
    password: string;
    role?: 'user' | 'admin';
    adminSubRole?: AdminRoleType;
  }): { ok: boolean; error?: string; user?: UserProfile } {
    const normEmail = (params.email || '').trim().toLowerCase();
    const cleanName = (params.name || '').trim();
    if (!normEmail || !normEmail.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    if (!cleanName) {
      return { ok: false, error: 'Please enter your full name.' };
    }
    if (!params.password || params.password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters long.' };
    }
    if (this.findUserByEmail(normEmail)) {
      return { ok: false, error: 'An account with this email already exists. Please sign in.' };
    }

    const hasAnyAdmin = Array.from(this.users.values()).some((u) => u.role === 'admin');
    const isAdminEmail =
      normEmail === 'spacix@ticketplaster.com' ||
      normEmail === 'earr.music@gmail.com' ||
      !hasAnyAdmin ||
      params.role === 'admin';

    const id = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const bonus = Math.max(0, Math.round(this.billingConfig.signupBonusCredits || 0));
    const now = new Date().toISOString();

    const newUser: UserProfile = {
      id,
      email: normEmail,
      name: cleanName,
      role: isAdminEmail ? 'admin' : 'user',
      adminSubRole: isAdminEmail ? params.adminSubRole || 'super_admin' : undefined,
      status: 'active',
      plan: 'free',
      billingCycle: 'monthly',
      credits: {
        subscription: bonus,
        topup: 0,
        total: bonus,
      },
      lastLoginAt: now,
      createdAt: now,
    };

    this.users.set(id, newUser);
    this.userPasswords.set(id, hashPasswordPbkdf2(params.password));

    if (bonus > 0) {
      this.recordLedger({
        userId: id,
        delta: bonus,
        bucket: 'subscription',
        reason: 'signup_bonus',
        refType: 'user_signup',
        refId: id,
        note: `Account registration bonus (+${bonus} credits)`,
        balanceAfter: { ...newUser.credits },
      });
    }

    this.saveToDisk();
    return { ok: true, user: newUser };
  }

  authenticateUserPassword(
    email: string,
    password: string
  ): { ok: boolean; error?: string; user?: UserProfile } {
    const user = this.findUserByEmail(email);
    if (!user) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    if (user.status === 'suspended') {
      return { ok: false, error: 'Your account has been suspended. Please contact support.' };
    }
    const storedHash = this.userPasswords.get(user.id);
    if (!storedHash || !verifyPasswordPbkdf2(password, storedHash)) {
      return { ok: false, error: 'Invalid email or password.' };
    }
    user.lastLoginAt = new Date().toISOString();
    this.saveToDisk();
    return { ok: true, user };
  }

  setUserPassword(userId: string, newPassword: string): boolean {
    if (!this.users.has(userId) || !newPassword || newPassword.length < 6) return false;
    this.userPasswords.set(userId, hashPasswordPbkdf2(newPassword));
    this.saveToDisk();
    return true;
  }

  createPasswordResetRequest(email: string): {
    ok: boolean;
    error?: string;
    record?: PasswordResetRecord;
    user?: UserProfile;
  } {
    const user = this.findUserByEmail(email);
    if (!user) {
      return { ok: false, error: 'No account found with that email address.' };
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const token = `rst_${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;
    const record: PasswordResetRecord = {
      token,
      email: user.email,
      code,
      expiresAt: Date.now() + 15 * 60 * 1000,
      used: false,
      createdAt: new Date().toISOString(),
    };
    this.passwordResets.set(token, record);
    this.saveToDisk();
    return { ok: true, record, user };
  }

  consumePasswordReset(params: {
    email: string;
    code: string;
    newPassword: string;
  }): { ok: boolean; error?: string; user?: UserProfile } {
    const normEmail = (params.email || '').trim().toLowerCase();
    const cleanCode = (params.code || '').trim();
    if (!params.newPassword || params.newPassword.length < 6) {
      return { ok: false, error: 'New password must be at least 6 characters.' };
    }
    const user = this.findUserByEmail(normEmail);
    if (!user) {
      return { ok: false, error: 'Account not found.' };
    }

    const matching = Array.from(this.passwordResets.values()).find(
      (r) =>
        r.email.toLowerCase() === normEmail &&
        !r.used &&
        r.expiresAt > Date.now() &&
        (r.code === cleanCode || r.token === cleanCode)
    );

    if (!matching) {
      return { ok: false, error: 'Invalid or expired reset code. Please request a new code.' };
    }

    matching.used = true;
    this.userPasswords.set(user.id, hashPasswordPbkdf2(params.newPassword));
    user.lastLoginAt = new Date().toISOString();
    this.saveToDisk();
    return { ok: true, user };
  }

  recordAudit(actorEmail: string, action: string, target: string, detail: string) {
    const entry: AdminAuditEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      actorEmail,
      action,
      target,
      detail,
      createdAt: new Date().toISOString(),
    };
    this.adminAuditLog.unshift(entry);
    if (this.adminAuditLog.length > 200) {
      this.adminAuditLog.length = 200;
    }
    this.saveToDisk();
    return entry;
  }

  private syncProviderActiveSecret(existing: StoredProviderGateway) {
    const keys = existing.apiKeys || [];
    const activeKey =
      keys.find((k) => k.enabled && k.isPrimary) ||
      keys.find((k) => k.enabled) ||
      keys[0];

    if (activeKey && activeKey.keyValue.trim()) {
      existing.rawSecret = activeKey.keyValue.trim();
      existing.hasSecret = true;
      existing.secretMasked = activeKey.secretMasked;
    } else {
      existing.rawSecret = '';
      existing.hasSecret = false;
      existing.secretMasked = 'No active API key configured';
    }

    const providerToSecretKey: Record<ApiProviderId, string> = {
      runware: 'RUNWARE_API_KEY',
      fal: 'FAL_KEY',
      higgsfield: 'HF_CREDENTIALS',
      muapi: 'MUAPI_KEY',
    };
    const secKey = providerToSecretKey[existing.id];
    const secEntry = this.platformSecrets.get(secKey);
    if (secEntry) {
      secEntry.secretValue = existing.rawSecret;
      secEntry.secretMasked = existing.rawSecret
        ? maskSecretValue(existing.rawSecret, existing.id)
        : 'No secret configured';
      secEntry.hasValue = Boolean(existing.rawSecret);
      secEntry.updatedAt = new Date().toISOString();
    }
  }

  private promoteLiveProviderRouting(providerId: ApiProviderId) {
    const targetGw = this.providerConfigs.get(providerId);
    if (!targetGw || !targetGw.enabled || !isRealExternalSecret(targetGw.rawSecret)) {
      return;
    }
    for (const override of this.modelPricing.values()) {
      const currentGw = this.providerConfigs.get(override.preferredProvider);
      const currentHasReal =
        currentGw && currentGw.enabled && isRealExternalSecret(currentGw.rawSecret);
      if (!currentHasReal) {
        override.preferredProvider = providerId;
      }
      if (!override.allowedProviders.includes(providerId)) {
        override.allowedProviders.push(providerId);
      }
    }
  }

  getPublicProviderConfigs(): ProviderGatewayConfig[] {
    return Array.from(this.providerConfigs.values())
      .sort((a, b) => a.priority - b.priority)
      .map(({ rawSecret: _rs, rawWebhookSecret: _rws, ...rest }) => ({
        ...rest,
        apiKeys: (rest.apiKeys || []).map((k) => ({ ...k })),
      }));
  }

  addProviderApiKey(
    providerId: ApiProviderId,
    params: {
      label?: string;
      keyValue: string;
      isPrimary?: boolean;
    }
  ): ProviderGatewayConfig | null {
    const existing = this.providerConfigs.get(providerId);
    if (!existing) return null;

    const cleanKey = (params.keyValue || '').trim();
    if (!cleanKey) return null;

    const now = new Date().toISOString();
    if (!existing.apiKeys) existing.apiKeys = [];

    const existingSameKey = existing.apiKeys.find((k) => k.keyValue === cleanKey);
    if (existingSameKey) {
      if (params.label) existingSameKey.label = params.label.trim();
      if (params.isPrimary) {
        for (const k of existing.apiKeys) k.isPrimary = k.id === existingSameKey.id;
      }
      existingSameKey.enabled = true;
      existingSameKey.updatedAt = now;
      this.syncProviderActiveSecret(existing);
      this.saveToDisk();
      const { rawSecret: _rs, rawWebhookSecret: _rws, ...pub } = existing;
      return pub;
    }

    const makePrimary =
      Boolean(params.isPrimary) ||
      existing.apiKeys.length === 0 ||
      !existing.apiKeys.some((k) => k.isPrimary && k.enabled);

    if (makePrimary) {
      for (const k of existing.apiKeys) {
        k.isPrimary = false;
      }
    }

    const newEntry: ProviderApiKeyEntry = {
      id: `key_${providerId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label:
        (params.label || '').trim() ||
        `${existing.label} Key #${existing.apiKeys.length + 1}`,
      keyValue: cleanKey,
      secretMasked: maskSecretValue(cleanKey, providerId),
      isPrimary: makePrimary,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    existing.apiKeys.unshift(newEntry);
    this.syncProviderActiveSecret(existing);
    if (isRealExternalSecret(existing.rawSecret)) {
      this.promoteLiveProviderRouting(providerId);
    }
    existing.updatedAt = now;
    this.saveToDisk();

    const { rawSecret: _rs, rawWebhookSecret: _rws, ...pub } = existing;
    return pub;
  }

  updateProviderApiKey(
    providerId: ApiProviderId,
    keyId: string,
    patch: {
      label?: string;
      keyValue?: string;
      isPrimary?: boolean;
      enabled?: boolean;
    }
  ): ProviderGatewayConfig | null {
    const existing = this.providerConfigs.get(providerId);
    if (!existing || !existing.apiKeys) return null;

    const target = existing.apiKeys.find((k) => k.id === keyId);
    if (!target) return null;

    const now = new Date().toISOString();
    if (typeof patch.label === 'string' && patch.label.trim()) {
      target.label = patch.label.trim();
    }
    if (typeof patch.keyValue === 'string' && patch.keyValue.trim()) {
      const clean = patch.keyValue.trim();
      target.keyValue = clean;
      target.secretMasked = maskSecretValue(clean, providerId);
    }
    if (typeof patch.enabled === 'boolean') {
      target.enabled = patch.enabled;
      if (!target.enabled && target.isPrimary) {
        target.isPrimary = false;
        const fallback = existing.apiKeys.find((k) => k.id !== keyId && k.enabled);
        if (fallback) fallback.isPrimary = true;
      }
    }
    if (patch.isPrimary === true) {
      for (const k of existing.apiKeys) {
        k.isPrimary = k.id === keyId;
      }
      target.enabled = true;
    }

    target.updatedAt = now;
    this.syncProviderActiveSecret(existing);
    if (isRealExternalSecret(existing.rawSecret)) {
      this.promoteLiveProviderRouting(providerId);
    }
    existing.updatedAt = now;
    this.saveToDisk();

    const { rawSecret: _rs, rawWebhookSecret: _rws, ...pub } = existing;
    return pub;
  }

  deleteProviderApiKey(
    providerId: ApiProviderId,
    keyId: string
  ): ProviderGatewayConfig | null {
    const existing = this.providerConfigs.get(providerId);
    if (!existing || !existing.apiKeys) return null;

    const idx = existing.apiKeys.findIndex((k) => k.id === keyId);
    if (idx === -1) return null;

    const [removed] = existing.apiKeys.splice(idx, 1);
    if (removed.isPrimary && existing.apiKeys.length > 0) {
      const nextPrimary =
        existing.apiKeys.find((k) => k.enabled) || existing.apiKeys[0];
      if (nextPrimary) nextPrimary.isPrimary = true;
    }

    this.syncProviderActiveSecret(existing);
    existing.updatedAt = new Date().toISOString();
    this.saveToDisk();

    const { rawSecret: _rs, rawWebhookSecret: _rws, ...pub } = existing;
    return pub;
  }

  updateProviderConfig(
    id: ApiProviderId,
    patch: {
      enabled?: boolean;
      baseUrl?: string;
      secondaryUrl?: string;
      apiKey?: string;
      apiKeyLabel?: string;
      webhookSecret?: string;
      defaultCallingPattern?: ApiProviderCallingPattern;
      priority?: number;
      healthStatus?: 'operational' | 'degraded' | 'disabled';
    }
  ): ProviderGatewayConfig | null {
    const existing = this.providerConfigs.get(id);
    if (!existing) return null;

    if (typeof patch.enabled === 'boolean') {
      existing.enabled = patch.enabled;
      existing.healthStatus = patch.enabled ? 'operational' : 'disabled';
    }
    if (typeof patch.baseUrl === 'string' && patch.baseUrl.trim()) {
      existing.baseUrl = patch.baseUrl.trim();
    }
    if (typeof patch.secondaryUrl === 'string') {
      existing.secondaryUrl = patch.secondaryUrl.trim();
    }
    if (typeof patch.apiKey === 'string' && patch.apiKey.trim()) {
      return this.addProviderApiKey(id, {
        label: patch.apiKeyLabel || `${existing.label} Key`,
        keyValue: patch.apiKey.trim(),
        isPrimary: true,
      });
    }
    if (typeof patch.webhookSecret === 'string' && patch.webhookSecret.trim()) {
      existing.rawWebhookSecret = patch.webhookSecret.trim();
      existing.webhookSecretMasked = maskSecretValue(patch.webhookSecret.trim(), 'whsec');
    }
    if (patch.defaultCallingPattern) {
      existing.defaultCallingPattern = patch.defaultCallingPattern;
    }
    if (typeof patch.priority === 'number') {
      existing.priority = patch.priority;
    }
    if (patch.healthStatus) {
      existing.healthStatus = patch.healthStatus;
    }
    existing.updatedAt = new Date().toISOString();
    this.saveToDisk();
    const { rawSecret: _rs, rawWebhookSecret: _rws, ...pub } = existing;
    return pub;
  }

  checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const existing = this.rateLimits.get(key);
    if (!existing || existing.expiresAt <= now) {
      this.rateLimits.set(key, { count: 1, expiresAt: now + windowMs });
      return true;
    }
    if (existing.count >= maxRequests) {
      return false;
    }
    existing.count += 1;
    return true;
  }

  recordLedger(params: {
    userId: string;
    delta: number;
    bucket: CreditBucket;
    reason: LedgerReason;
    refType: string;
    refId: string;
    note?: string;
    balanceAfter: { subscription: number; topup: number; total: number };
  }): CreditLedgerEntry | null {
    const uniqueKey = `${params.reason}:${params.refType}:${params.refId}`;
    if (this.ledgerUniqueKeys.has(uniqueKey)) {
      return null;
    }
    this.ledgerUniqueKeys.add(uniqueKey);
    const entry: CreditLedgerEntry = {
      id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: params.userId,
      delta: params.delta,
      bucket: params.bucket,
      reason: params.reason,
      refType: params.refType,
      refId: params.refId,
      note: params.note,
      balanceAfter: { ...params.balanceAfter },
      createdAt: new Date().toISOString(),
    };
    this.ledger.unshift(entry);
    return entry;
  }

  debitCreditsForGeneration(params: {
    userId: string;
    generationId: string;
    cost: number;
    note: string;
  }): { ok: boolean; error?: string; user?: UserProfile } {
    const user = this.users.get(params.userId);
    if (!user) return { ok: false, error: 'UNAUTHORIZED' };
    if (user.status === 'suspended') {
      return { ok: false, error: 'ACCOUNT_SUSPENDED' };
    }

    const uniqueKey = `generation_debit:generation:${params.generationId}`;
    if (this.ledgerUniqueKeys.has(uniqueKey)) {
      return { ok: true, user };
    }

    const totalAvailable = user.credits.subscription + user.credits.topup;
    if (totalAvailable < params.cost) {
      return { ok: false, error: 'INSUFFICIENT_CREDITS' };
    }

    let remaining = params.cost;
    let primaryBucket: CreditBucket = 'subscription';
    if (user.credits.subscription >= remaining) {
      user.credits.subscription -= remaining;
      remaining = 0;
    } else {
      const fromSub = user.credits.subscription;
      user.credits.subscription = 0;
      remaining -= fromSub;
      user.credits.topup = Math.max(0, user.credits.topup - remaining);
      primaryBucket = fromSub > 0 ? 'subscription' : 'topup';
    }
    user.credits.total = user.credits.subscription + user.credits.topup;

    this.recordLedger({
      userId: user.id,
      delta: -params.cost,
      bucket: primaryBucket,
      reason: 'generation_debit',
      refType: 'generation',
      refId: params.generationId,
      note: params.note,
      balanceAfter: { ...user.credits },
    });
    this.saveToDisk();

    return { ok: true, user };
  }

  refundGenerationCredits(params: {
    userId: string;
    generationId: string;
    cost: number;
    note: string;
  }): boolean {
    const user = this.users.get(params.userId);
    if (!user) return false;

    const uniqueKey = `generation_refund:generation:${params.generationId}`;
    if (this.ledgerUniqueKeys.has(uniqueKey)) {
      return false;
    }

    user.credits.subscription += params.cost;
    user.credits.total = user.credits.subscription + user.credits.topup;

    this.recordLedger({
      userId: user.id,
      delta: params.cost,
      bucket: 'subscription',
      reason: 'generation_refund',
      refType: 'generation',
      refId: params.generationId,
      note: params.note,
      balanceAfter: { ...user.credits },
    });
    this.saveToDisk();

    return true;
  }

  resetSubscriptionCredits(params: {
    userId: string;
    plan: PlanTierId;
    billingCycle: 'monthly' | 'annual';
    allowance: number;
    invoiceId: string;
  }): UserProfile | null {
    const user = this.users.get(params.userId);
    if (!user) return null;

    const uniqueKey = `subscription_reset:invoice:${params.invoiceId}`;
    if (this.ledgerUniqueKeys.has(uniqueKey)) return user;

    const delta = params.allowance - user.credits.subscription;
    user.credits.subscription = params.allowance;
    user.credits.total = user.credits.subscription + user.credits.topup;
    user.plan = params.plan;
    user.billingCycle = params.billingCycle;
    user.planRenewsAt = new Date(
      Date.now() + (params.billingCycle === 'annual' ? 365 : 30) * 86400 * 1000
    ).toISOString();

    this.recordLedger({
      userId: user.id,
      delta,
      bucket: 'subscription',
      reason: 'subscription_reset',
      refType: 'invoice',
      refId: params.invoiceId,
      note: `Plan ${params.plan.toUpperCase()} (${params.billingCycle}) allowance reset to ${params.allowance}`,
      balanceAfter: { ...user.credits },
    });
    this.saveToDisk();

    return user;
  }

  grantTopupCredits(params: {
    userId: string;
    credits: number;
    sessionId: string;
    packName: string;
  }): UserProfile | null {
    const user = this.users.get(params.userId);
    if (!user) return null;

    const uniqueKey = `topup_purchase:checkout_session:${params.sessionId}`;
    if (this.ledgerUniqueKeys.has(uniqueKey)) return user;

    user.credits.topup += params.credits;
    user.credits.total = user.credits.subscription + user.credits.topup;

    this.recordLedger({
      userId: user.id,
      delta: params.credits,
      bucket: 'topup',
      reason: 'topup_purchase',
      refType: 'checkout_session',
      refId: params.sessionId,
      note: `${params.packName} (+${params.credits} top-up credits)`,
      balanceAfter: { ...user.credits },
    });
    this.saveToDisk();

    return user;
  }

  adminAdjustCredits(params: {
    userId: string;
    delta: number;
    bucket: CreditBucket;
    note: string;
  }): UserProfile | null {
    const user = this.users.get(params.userId);
    if (!user) return null;

    if (params.bucket === 'subscription') {
      user.credits.subscription = Math.max(0, user.credits.subscription + params.delta);
    } else {
      user.credits.topup = Math.max(0, user.credits.topup + params.delta);
    }
    user.credits.total = user.credits.subscription + user.credits.topup;

    this.recordLedger({
      userId: user.id,
      delta: params.delta,
      bucket: params.bucket,
      reason: 'admin_adjust',
      refType: 'admin',
      refId: `adm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      note: params.note || 'Manual admin adjustment',
      balanceAfter: { ...user.credits },
    });
    this.saveToDisk();

    return user;
  }

  adminSetWalletBalances(params: {
    userId: string;
    subscriptionCredits?: number;
    topupCredits?: number;
    note?: string;
  }): UserProfile | null {
    const user = this.users.get(params.userId);
    if (!user) return null;

    if (typeof params.subscriptionCredits === 'number' && params.subscriptionCredits >= 0) {
      const subDelta = Math.round(params.subscriptionCredits) - user.credits.subscription;
      if (subDelta !== 0) {
        user.credits.subscription = Math.round(params.subscriptionCredits);
        user.credits.total = user.credits.subscription + user.credits.topup;
        this.recordLedger({
          userId: user.id,
          delta: subDelta,
          bucket: 'subscription',
          reason: 'admin_adjust',
          refType: 'admin_set_wallet',
          refId: `adm_sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          note: params.note || 'Admin set subscription wallet balance',
          balanceAfter: { ...user.credits },
        });
      }
    }

    if (typeof params.topupCredits === 'number' && params.topupCredits >= 0) {
      const topDelta = Math.round(params.topupCredits) - user.credits.topup;
      if (topDelta !== 0) {
        user.credits.topup = Math.round(params.topupCredits);
        user.credits.total = user.credits.subscription + user.credits.topup;
        this.recordLedger({
          userId: user.id,
          delta: topDelta,
          bucket: 'topup',
          reason: 'admin_adjust',
          refType: 'admin_set_wallet',
          refId: `adm_top_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          note: params.note || 'Admin set top-up wallet balance',
          balanceAfter: { ...user.credits },
        });
      }
    }

    this.saveToDisk();
    return user;
  }

  findOrCreateUserByEmail(email: string): UserProfile {
    const existing = this.findUserByEmail(email);
    if (existing) {
      existing.lastLoginAt = new Date().toISOString();
      this.saveToDisk();
      return existing;
    }
    const normalized = email.trim().toLowerCase();
    const namePart = normalized.split('@')[0].replace(/[._-]/g, ' ');
    const displayName =
      namePart
        .split(' ')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
        .join(' ') || 'SPACIX Creator';
    const res = this.registerUserWithPassword({
      name: displayName,
      email: normalized,
      password: crypto.randomBytes(12).toString('hex'),
    });
    return res.user!;
  }
}

export const db = new StudioDatabase();
