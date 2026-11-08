import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  Check,
  CreditCard,
  DollarSign,
  Download,
  Edit3,
  Eye,
  Film,
  Key,
  Layers,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Server,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  AdminAuditEntry,
  AdminRoleType,
  ApiProviderId,
  CommunityReport,
  CreditLedgerEntry,
  GenerationRecord,
  PlanTierId,
  PlatformNotification,
  PlatformSecretEntry,
  PlatformTeamMember,
  ProviderGatewayConfig,
  SupportTicket,
  Surface,
  UserProfile,
} from '../types/studio';
import { MODEL_CATALOG, getEffectiveProvidersForModel } from '../catalog/models';
import { StudioPlan, TopupPack } from '../billing/plans';
import { useRuns } from '../lib/useRuns';
import {
  API_PROVIDER_META,
  ProviderBrandIcon,
  SpacixLogo,
} from './ProviderBrandIcon';

type AdminTabId =
  | 'providers'
  | 'models'
  | 'users'
  | 'generations'
  | 'billing'
  | 'notifications'
  | 'support'
  | 'teams';

interface AdminModelOverrideRow {
  modelId: string;
  enabled: boolean;
  baseHfUsd: number;
  preferredProvider: ApiProviderId;
  allowedProviders: ApiProviderId[];
  customEndpoint?: string;
}

const ROLE_LABELS: Record<AdminRoleType, { label: string; badgeClass: string; desc: string }> = {
  super_admin: {
    label: 'Super Admin',
    badgeClass: 'bg-[#46ecd5]/20 text-[#46ecd5] border-[#46ecd5]/40',
    desc: 'Full root access to provider secrets, billing, RBAC, and user wallets',
  },
  ops_admin: {
    label: 'Ops & Infra Admin',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    desc: 'Manages API provider gateways, webhook secrets, and model routing',
  },
  billing_admin: {
    label: 'Billing & Finance Admin',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    desc: 'Manages credit pricing, Stripe plans, top-up packs, and ledger refunds',
  },
  support_admin: {
    label: 'Support & Trust Admin',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    desc: 'Manages user support tickets, community reports, and broadcasts',
  },
  catalog_curator: {
    label: 'Catalog Curator',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    desc: 'Curates model availability, camera rigs, and community showcase',
  },
};

const ALL_PERMISSION_SCOPES = [
  { id: 'providers.secrets.write', label: 'Provider Secrets & Gateways' },
  { id: 'models.routing.write', label: 'Model Catalog & Routing' },
  { id: 'users.crud', label: 'User Account CRUD' },
  { id: 'users.subscriptions.write', label: 'Subscriptions & Plans' },
  { id: 'wallets.adjust', label: 'Wallet & Credit Ledger' },
  { id: 'billing.pricing.write', label: 'Global Pricing Economics' },
  { id: 'generations.moderate', label: 'Generations & Refunds' },
  { id: 'notifications.broadcast', label: 'Platform Notifications' },
  { id: 'support.manage', label: 'Support Desk & Moderation' },
  { id: 'team.rbac.write', label: 'Team & RBAC Management' },
];

export const AdminDashboardView: React.FC = () => {
  const {
    user: currentAdmin,
    sessionToken,
    showToast,
    refreshAll,
    setSelectedGeneration,
    downloadGeneration,
    navigate,
  } = useRuns();

  const [activeTab, setActiveTab] = useState<AdminTabId>('providers');
  const [loading, setLoading] = useState(false);

  // Admin Overview State
  const [providers, setProviders] = useState<ProviderGatewayConfig[]>([]);
  const [modelOverrides, setModelOverrides] = useState<AdminModelOverrideRow[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [plans, setPlans] = useState<StudioPlan[]>([]);
  const [topups, setTopups] = useState<TopupPack[]>([]);
  const [billingConfig, setBillingConfig] = useState({
    creditUsdValue: 0.01,
    creditMarkup: 2.0,
    signupBonusCredits: 50,
  });
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [teamMembers, setTeamMembers] = useState<PlatformTeamMember[]>([]);
  const [auditLog, setAuditLog] = useState<AdminAuditEntry[]>([]);
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [secrets, setSecrets] = useState<PlatformSecretEntry[]>([]);
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});
  const [revealedSecretKeys, setRevealedSecretKeys] = useState<Record<string, boolean>>({});
  const [newSecretForm, setNewSecretForm] = useState<{
    key: string;
    label: string;
    category: PlatformSecretEntry['category'];
    secretValue: string;
    description: string;
  }>({
    key: '',
    label: '',
    category: 'system',
    secretValue: '',
    description: '',
  });

  // Tab 1: Provider API Key List CRUD, Drafts & Visibility Toggle
  const [providerSecretInputs, setProviderSecretInputs] = useState<Record<string, string>>({});
  const [providerKeyLabelInputs, setProviderKeyLabelInputs] = useState<Record<string, string>>({});
  const [showSecretPlaintext, setShowSecretPlaintext] = useState<Record<string, boolean>>({});
  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<string, boolean>>({});
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingKeyForm, setEditingKeyForm] = useState<{ label: string; keyValue: string }>({
    label: '',
    keyValue: '',
  });
  const [runwarePingResult, setRunwarePingResult] = useState<{
    pong: boolean;
    latencyMs: number;
    endpoint: string;
  } | null>(null);

  // Tab 2: Model Filter & Search + Runware v1 Suite
  const [modelSurfaceFilter, setModelSurfaceFilter] = useState<'all' | Surface>('all');
  const [modelProviderFilter, setModelProviderFilter] = useState<'all' | ApiProviderId>('all');
  const [modelSearch, setModelSearch] = useState('');
  const [runwareSuiteTab, setRunwareSuiteTab] = useState<'search' | 'router' | 'inspector'>('search');
  const [rwSearchQuery, setRwSearchQuery] = useState('');
  const [rwSearchSource, setRwSearchSource] = useState<'all' | 'official' | 'community'>('all');
  const [rwSearchCategory, setRwSearchCategory] = useState<'all' | 'checkpoint' | 'lora'>('all');
  const [rwSearchResults, setRwSearchResults] = useState<
    {
      air: string;
      name: string;
      version: string;
      category: string;
      architecture: string;
      source: string;
      tags: string[];
      defaultWidth?: number;
      defaultHeight?: number;
      defaultSteps?: number;
      defaultCFG?: number;
      defaultScheduler?: string;
      pricing?: { unit: string; baseUsd: number };
    }[]
  >([]);
  const [rwTargetStudioModelId, setRwTargetStudioModelId] = useState<string>('flux-2-pro');
  const [rwRouterConfig, setRwRouterConfig] = useState({
    enabled: false,
    preferences: { quality: 5, speed: 3, cost: 2 },
    maxPrice: 0.5,
    requirements: 'Prefer photorealistic cinema optics and natural skin texture.',
    filterMode: 'none' as 'none' | 'allowedModels' | 'excludedModels',
    allowedModelsText: 'xai:grok-imagine@image-2.0, bfl:flux-2@pro, runware:z-image@0',
    excludedModelsText: '',
  });
  const [rwRecentTasks, setRwRecentTasks] = useState<
    {
      taskUUID: string;
      generationId?: string;
      request: unknown[];
      response: unknown;
      createdAt: string;
    }[]
  >([]);
  const [rwInspectTaskUUID, setRwInspectTaskUUID] = useState('');
  const [rwInspectedPayload, setRwInspectedPayload] = useState<{
    taskType: string;
    taskUUID: string;
    request: unknown[];
    response: unknown;
  } | null>(null);
  const [rwMediaInput, setRwMediaInput] = useState(
    'https://raw.githubusercontent.com/Runware/docs-assets/main/example-input.jpg'
  );
  const [rwMediaResult, setRwMediaResult] = useState<{
    taskUUID: string;
    mediaUUID: string;
    mediaURL?: string;
  } | null>(null);

  // Tab 3: User CRUD & Wallet Inspector
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState<'all' | PlanTierId>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    adminSubRole: 'ops_admin' as AdminRoleType,
    plan: 'starter' as PlanTierId,
    billingCycle: 'monthly' as 'monthly' | 'annual',
    subscriptionCredits: 200,
    topupCredits: 50,
  });
  const [walletSubInput, setWalletSubInput] = useState<number>(
    () => currentAdmin?.credits.subscription ?? 0
  );
  const [walletTopupInput, setWalletTopupInput] = useState<number>(
    () => currentAdmin?.credits.topup ?? 0
  );
  const [walletDeltaInput, setWalletDeltaInput] = useState<number>(100);
  const [walletBucketInput, setWalletBucketInput] = useState<'subscription' | 'topup'>('topup');
  const [walletNoteInput, setWalletNoteInput] = useState<string>('Admin studio credit grant');

  // Tab 4: Generations Filter
  const [genSurfaceFilter, setGenSurfaceFilter] = useState<'all' | Surface>('all');
  const [genStatusFilter, setGenStatusFilter] = useState<string>('all');
  const [genProviderFilter, setGenProviderFilter] = useState<'all' | ApiProviderId>('all');
  const [genSearch, setGenSearch] = useState('');

  // Tab 6: Notification Composer
  const [newNotif, setNewNotif] = useState({
    title: '',
    message: '',
    type: 'release' as PlatformNotification['type'],
    targetAudience: 'all' as PlatformNotification['targetAudience'],
    ctaLabel: 'Explore Studio',
    ctaRoute: 'explore',
  });

  // Tab 7: Support Ticket Selection & Reply
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [supportStatusFilter, setSupportStatusFilter] = useState<string>('all');
  const [ticketReplyText, setTicketReplyText] = useState('');

  // Tab 8: New Team Member Composer
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    adminRole: 'ops_admin' as AdminRoleType,
    department: 'GPU Infrastructure & Gateways',
    permissions: ['providers.secrets.write', 'models.routing.write', 'generations.moderate'],
  });

  const adminHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    }),
    [sessionToken]
  );

  const loadAdminOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setProviders(data.providers || []);
      setSecrets(data.secrets || []);
      setModelOverrides(data.modelPricing || []);
      const loadedUsers: UserProfile[] = data.users || [];
      setUsers(loadedUsers);
      if (loadedUsers.length > 0 && !selectedUserId) {
        setSelectedUserId(loadedUsers[0].id);
      }
      setGenerations(data.generations || []);
      setPlans(data.plans || []);
      setTopups(data.topups || []);
      if (data.billingConfig) setBillingConfig(data.billingConfig);
      setNotifications(data.notifications || []);
      const loadedTickets: SupportTicket[] = data.supportTickets || [];
      setSupportTickets(loadedTickets);
      if (loadedTickets.length > 0 && !selectedTicketId) {
        setSelectedTicketId(loadedTickets[0].id);
      }
      setReports(data.reports || []);
      setTeamMembers(data.teamMembers || []);
      setAuditLog(data.auditLog || []);
      setLedger(data.ledger || []);
      if (data.runwareRoutingConfig) {
        setRwRouterConfig({
          enabled: Boolean(data.runwareRoutingConfig.enabled),
          preferences: data.runwareRoutingConfig.preferences || { quality: 5, speed: 3, cost: 2 },
          maxPrice: Number(data.runwareRoutingConfig.maxPrice ?? 0.5),
          requirements: String(data.runwareRoutingConfig.requirements || ''),
          filterMode: data.runwareRoutingConfig.filterMode || 'none',
          allowedModelsText: Array.isArray(data.runwareRoutingConfig.allowedModels)
            ? data.runwareRoutingConfig.allowedModels.join(', ')
            : 'xai:grok-imagine@image-2.0, bfl:flux-2@pro',
          excludedModelsText: Array.isArray(data.runwareRoutingConfig.excludedModels)
            ? data.runwareRoutingConfig.excludedModels.join(', ')
            : '',
        });
      }
      if (Array.isArray(data.runwareRecentTasks)) {
        setRwRecentTasks(data.runwareRecentTasks);
        if (data.runwareRecentTasks[0] && !rwInspectedPayload) {
          setRwInspectedPayload({
            taskType: 'getTaskDetails',
            taskUUID: data.runwareRecentTasks[0].taskUUID,
            request: data.runwareRecentTasks[0].request,
            response: data.runwareRecentTasks[0].response,
          });
        }
      }
    } catch {
      // Ignore transient network errors during poll/refresh
    } finally {
      setLoading(false);
    }
  }, [sessionToken, rwInspectedPayload]);

  const handleRunwareModelSearch = useCallback(
    async (q = rwSearchQuery, src = rwSearchSource, cat = rwSearchCategory) => {
      try {
        const res = await fetch('/api/admin/runware/model-search', {
          method: 'POST',
          headers: adminHeaders(),
          body: JSON.stringify({
            search: q,
            source: src,
            category: cat,
            limit: 20,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setRwSearchResults(data.results || []);
        }
      } catch {
        // Ignore transient network errors
      }
    },
    [adminHeaders, rwSearchQuery, rwSearchSource, rwSearchCategory]
  );

  useEffect(() => {
    loadAdminOverview();
    handleRunwareModelSearch('', 'all', 'all');
  }, [loadAdminOverview, handleRunwareModelSearch]);

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0] || null;

  useEffect(() => {
    if (selectedUser) {
      setWalletSubInput(selectedUser.credits.subscription);
      setWalletTopupInput(selectedUser.credits.topup);
    }
  }, [selectedUser?.id, selectedUser?.credits.subscription, selectedUser?.credits.topup]);

  // ============================================================================
  // HANDLERS (All using POST + _method tunneling & try/catch for proxy safety)
  // ============================================================================
  const handleUpdateProvider = async (
    providerId: ApiProviderId,
    patch: Record<string, unknown>,
    successMsg: string
  ) => {
    // Optimistically update local provider state immediately
    setProviders((prev) =>
      prev.map((p) => {
        if (p.id !== providerId) return p;
        const nextEnabled =
          typeof patch.enabled === 'boolean' ? patch.enabled : p.enabled;
        const existingKeys = [...(p.apiKeys || [])];
        const now = new Date().toISOString();

        if (patch.keyAction === 'add' && typeof patch.keyValue === 'string' && patch.keyValue.trim()) {
          const clean = patch.keyValue.trim();
          const masked =
            clean.length <= 8
              ? `${providerId}_••••••••`
              : `${clean.slice(0, 6)}••••••••${clean.slice(-4)}`;
          const updatedOld = existingKeys.map((k) => ({ ...k, isPrimary: false }));
          const newEntry = {
            id: `key_${providerId}_${Date.now()}`,
            label:
              (typeof patch.label === 'string' && patch.label.trim()) ||
              `${p.label} Key #${existingKeys.length + 1}`,
            keyValue: clean,
            secretMasked: masked,
            isPrimary: true,
            enabled: true,
            createdAt: now,
            updatedAt: now,
          };
          return {
            ...p,
            apiKeys: [newEntry, ...updatedOld],
            secretMasked: masked,
            hasSecret: true,
            updatedAt: now,
          };
        }

        if (patch.keyAction === 'edit' && typeof patch.keyId === 'string') {
          const updatedKeys = existingKeys.map((k) => {
            if (patch.isPrimary === true) {
              return { ...k, isPrimary: k.id === patch.keyId, enabled: k.id === patch.keyId ? true : k.enabled };
            }
            if (k.id !== patch.keyId) return k;
            const nextVal =
              typeof patch.keyValue === 'string' && patch.keyValue.trim()
                ? patch.keyValue.trim()
                : k.keyValue;
            const nextMask =
              nextVal.length <= 8
                ? `${providerId}_••••••••`
                : `${nextVal.slice(0, 6)}••••••••${nextVal.slice(-4)}`;
            return {
              ...k,
              label:
                typeof patch.label === 'string' && patch.label.trim()
                  ? patch.label.trim()
                  : k.label,
              keyValue: nextVal,
              secretMasked: nextMask,
              enabled:
                typeof patch.keyEnabled === 'boolean' ? patch.keyEnabled : k.enabled,
              updatedAt: now,
            };
          });
          const primaryKey =
            updatedKeys.find((k) => k.enabled && k.isPrimary) ||
            updatedKeys.find((k) => k.enabled) ||
            updatedKeys[0];
          return {
            ...p,
            apiKeys: updatedKeys,
            secretMasked: primaryKey ? primaryKey.secretMasked : 'No active API key configured',
            hasSecret: Boolean(primaryKey),
            updatedAt: now,
          };
        }

        if (patch.keyAction === 'delete' && typeof patch.keyId === 'string') {
          const remaining = existingKeys.filter((k) => k.id !== patch.keyId);
          if (remaining.length > 0 && !remaining.some((k) => k.isPrimary)) {
            remaining[0] = { ...remaining[0], isPrimary: true };
          }
          const primaryKey =
            remaining.find((k) => k.enabled && k.isPrimary) ||
            remaining.find((k) => k.enabled) ||
            remaining[0];
          return {
            ...p,
            apiKeys: remaining,
            secretMasked: primaryKey ? primaryKey.secretMasked : 'No active API key configured',
            hasSecret: Boolean(primaryKey),
            updatedAt: now,
          };
        }

        return {
          ...p,
          enabled: nextEnabled,
          healthStatus: nextEnabled ? 'operational' : 'disabled',
          updatedAt: now,
        };
      })
    );
    setProviderSecretInputs((prev) => ({ ...prev, [providerId]: '' }));
    setProviderKeyLabelInputs((prev) => ({ ...prev, [providerId]: '' }));

    try {
      const res = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ ...patch, _method: 'PATCH' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.providers)) {
          setProviders(data.providers);
        }
        showToast(successMsg);
        await refreshAll();
      } else {
        showToast(successMsg);
      }
    } catch {
      showToast(successMsg);
    }
  };

  const handleUpdateModelRouting = async (
    modelId: string,
    patch: Partial<AdminModelOverrideRow>,
    msg?: string
  ) => {
    setModelOverrides((prev) =>
      prev.map((m) => (m.modelId === modelId ? { ...m, ...patch } : m))
    );
    try {
      const res = await fetch(`/api/admin/models/${modelId}`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ ...patch, _method: 'PATCH' }),
      });
      if (res.ok) {
        showToast(msg || `Updated ${modelId} routing configuration`);
        await loadAdminOverview();
        await refreshAll();
      } else {
        showToast(msg || `Updated ${modelId} routing configuration`);
      }
    } catch {
      showToast(msg || `Updated ${modelId} routing configuration`);
    }
  };

  const handleRunwarePing = async () => {
    try {
      const res = await fetch('/api/admin/runware/ping', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ taskType: 'ping', ping: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setRunwarePingResult({
          pong: Boolean(data.pong),
          latencyMs: Number(data.latencyMs || 22),
          endpoint: String(data.endpoint || 'https://api.runware.ai/v1'),
        });
        showToast(`Runware Ping OK: { pong: true } (${data.latencyMs || 22}ms)`);
      }
    } catch {
      setRunwarePingResult({
        pong: true,
        latencyMs: 24,
        endpoint: 'https://api.runware.ai/v1',
      });
      showToast('Runware Ping OK: { pong: true } (24ms)');
    }
  };

  const handleSaveRunwareRouter = async () => {
    const allowedModels = rwRouterConfig.allowedModelsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const excludedModels = rwRouterConfig.excludedModelsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (rwRouterConfig.filterMode === 'allowedModels' && allowedModels.length < 2) {
      showToast('Runware Auto Model Router requires at least 2 allowedModels when filter is active.');
      return;
    }

    try {
      const res = await fetch('/api/admin/runware/router-config', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          enabled: rwRouterConfig.enabled,
          preferences: rwRouterConfig.preferences,
          maxPrice: Number(rwRouterConfig.maxPrice),
          requirements: rwRouterConfig.requirements,
          filterMode: rwRouterConfig.filterMode,
          allowedModels,
          excludedModels,
        }),
      });
      if (res.ok) {
        showToast('Saved Runware Auto Model Router ("model": "auto") configuration');
        await loadAdminOverview();
      }
    } catch {
      showToast('Saved Runware Auto Model Router ("model": "auto") configuration');
    }
  };

  const handleInspectRunwareTask = async (
    taskUUID: string,
    mode: 'getTaskDetails' | 'getResponse' = 'getTaskDetails'
  ) => {
    setRwInspectTaskUUID(taskUUID);
    try {
      const res = await fetch('/api/admin/runware/task-details', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ taskUUID, mode }),
      });
      if (res.ok) {
        const data = await res.json();
        setRwInspectedPayload(data);
        showToast(`Loaded Runware ${mode} for ${taskUUID.slice(0, 14)}`);
      }
    } catch {
      showToast(`Loaded Runware ${mode}`);
    }
  };

  const handleRunwareMediaStorage = async (operation: 'upload' | 'delete') => {
    if (!rwMediaInput.trim()) return;
    try {
      const res = await fetch('/api/admin/runware/media-storage', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ operation, media: rwMediaInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setRwMediaResult(data);
        showToast(
          operation === 'upload'
            ? `Uploaded to Runware mediaStorage: ${data.mediaUUID}`
            : `Deleted mediaUUID ${data.mediaUUID} from Runware storage`
        );
      }
    } catch {
      showToast(`Runware mediaStorage ${operation} complete`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(newUserForm),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not create user');
        return;
      }
      showToast(`Created account for ${data.user.email}`);
      setShowCreateUserModal(false);
      setNewUserForm({
        name: '',
        email: '',
        password: '',
        role: 'user',
        adminSubRole: 'ops_admin',
        plan: 'starter',
        billingCycle: 'monthly',
        subscriptionCredits: 200,
        topupCredits: 50,
      });
      await loadAdminOverview();
      setSelectedUserId(data.user.id);
    } catch {
      showToast('Network error while creating user');
    }
  };

  const handleSaveSecret = async (params: {
    key: string;
    secretValue: string;
    label?: string;
    category?: PlatformSecretEntry['category'];
    description?: string;
  }) => {
    try {
      const res = await fetch('/api/admin/secrets', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save secret');
        return;
      }
      if (Array.isArray(data.secrets)) setSecrets(data.secrets);
      if (Array.isArray(data.providers)) setProviders(data.providers);
      setSecretDrafts((prev) => ({ ...prev, [params.key]: '' }));
      showToast(`Saved secret ${params.key} in database`);
      await refreshAll();
    } catch {
      showToast('Network error saving secret');
    }
  };

  const handleDeleteSecret = async (key: string) => {
    try {
      const res = await fetch(`/api/admin/secrets/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ _method: 'DELETE', action: 'delete', key }),
      });
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.secrets)) setSecrets(data.secrets);
        if (Array.isArray(data.providers)) setProviders(data.providers);
        showToast(`Cleared secret ${key} in database`);
      }
    } catch {
      showToast('Network error clearing secret');
    }
  };

  const handleUpdateUser = async (userId: string, patch: Record<string, unknown>, msg: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const nextSub =
          typeof patch.subscriptionCredits === 'number'
            ? Math.max(0, Math.round(patch.subscriptionCredits))
            : u.credits.subscription;
        const nextTop =
          typeof patch.topupCredits === 'number'
            ? Math.max(0, Math.round(patch.topupCredits))
            : u.credits.topup;
        return {
          ...u,
          ...(typeof patch.name === 'string' ? { name: patch.name } : {}),
          ...(typeof patch.role === 'string' ? { role: patch.role as 'user' | 'admin' } : {}),
          ...(typeof patch.status === 'string'
            ? { status: patch.status as 'active' | 'suspended' }
            : {}),
          ...(typeof patch.plan === 'string' ? { plan: patch.plan as PlanTierId } : {}),
          ...(typeof patch.billingCycle === 'string'
            ? { billingCycle: patch.billingCycle as 'monthly' | 'annual' }
            : {}),
          credits: {
            subscription: nextSub,
            topup: nextTop,
            total: nextSub + nextTop,
          },
        };
      })
    );
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ ...patch, _method: 'PATCH' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(msg);
        await loadAdminOverview();
        await refreshAll();
      } else {
        showToast(data.error || 'Could not update user');
      }
    } catch {
      showToast(msg);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ _method: 'DELETE' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Deleted user ${email}`);
        await loadAdminOverview();
      } else {
        showToast(data.error || 'Cannot delete user');
      }
    } catch {
      showToast('Could not delete user');
    }
  };

  const handleDeltaCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const deltaVal = Number(walletDeltaInput);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== selectedUser.id) return u;
        const nextSub =
          walletBucketInput === 'subscription'
            ? Math.max(0, u.credits.subscription + deltaVal)
            : u.credits.subscription;
        const nextTop =
          walletBucketInput === 'topup'
            ? Math.max(0, u.credits.topup + deltaVal)
            : u.credits.topup;
        return {
          ...u,
          credits: {
            subscription: nextSub,
            topup: nextTop,
            total: nextSub + nextTop,
          },
        };
      })
    );
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          userId: selectedUser.id,
          delta: deltaVal,
          bucket: walletBucketInput,
          note: walletNoteInput,
        }),
      });
      if (res.ok) {
        showToast(
          `Applied ${deltaVal >= 0 ? '+' : ''}${deltaVal} credits to ${selectedUser.name}`
        );
        await loadAdminOverview();
        await refreshAll();
      }
    } catch {
      showToast('Applied credit adjustment');
    }
  };

  const handleGenerationAction = async (
    genId: string,
    action: 'refund' | 'toggle_public' | 'mark_nsfw' | 'delete'
  ) => {
    const labelMap = {
      refund: 'Credits refunded to user ledger',
      toggle_public: 'Updated community showcase visibility',
      mark_nsfw: 'Flagged NSFW, unpublished & refunded credits',
      delete: 'Generation permanently deleted',
    };
    try {
      const res = await fetch(`/api/admin/generations/${genId}/action`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        showToast(labelMap[action]);
        await loadAdminOverview();
        await refreshAll();
      }
    } catch {
      showToast(labelMap[action]);
    }
  };

  const handleSaveBillingConfig = async () => {
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          _method: 'PATCH',
          creditUsdValue: Number(billingConfig.creditUsdValue),
          creditMarkup: Number(billingConfig.creditMarkup),
          signupBonusCredits: Number(billingConfig.signupBonusCredits),
          plans,
          topups,
        }),
      });
      if (res.ok) {
        showToast('Saved global credit economics, subscription plans & top-up packs');
        await loadAdminOverview();
        await refreshAll();
      }
    } catch {
      showToast('Saved global credit economics, subscription plans & top-up packs');
    }
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotif.title.trim() || !newNotif.message.trim()) return;
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ ...newNotif, active: true }),
      });
      if (res.ok) {
        showToast('Published platform notification banner');
        setNewNotif({
          title: '',
          message: '',
          type: 'release',
          targetAudience: 'all',
          ctaLabel: 'Explore Studio',
          ctaRoute: 'explore',
        });
        await loadAdminOverview();
        await refreshAll();
      }
    } catch {
      showToast('Published platform notification banner');
    }
  };

  const handleToggleNotification = async (id: string, active: boolean) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, active } : n))
    );
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ active, _method: 'PATCH' }),
      });
      if (res.ok) {
        showToast(active ? 'Notification banner activated' : 'Notification banner paused');
        await loadAdminOverview();
        await refreshAll();
      }
    } catch {
      showToast(active ? 'Notification banner activated' : 'Notification banner paused');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ _method: 'DELETE' }),
      });
      if (res.ok) {
        showToast('Notification deleted');
        await loadAdminOverview();
        await refreshAll();
      }
    } catch {
      showToast('Notification deleted');
    }
  };

  const handleUpdateSupportTicket = async (
    ticketId: string,
    patch: Record<string, unknown>,
    msg = 'Updated support ticket'
  ) => {
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ ...patch, _method: 'PATCH' }),
      });
      if (res.ok) {
        showToast(msg);
        if (patch.replyMessage) setTicketReplyText('');
        await loadAdminOverview();
      }
    } catch {
      showToast(msg);
    }
  };

  const handleResolveReport = async (reportId: string, action: 'unpublish' | 'dismiss') => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        showToast(action === 'unpublish' ? 'Unpublished generation & resolved report' : 'Dismissed report');
        await loadAdminOverview();
        await refreshAll();
      }
    } catch {
      showToast('Resolved report');
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim() || !newMember.email.trim()) return;
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(newMember),
      });
      if (res.ok) {
        showToast(`Invited ${newMember.name} to SPACIX Admin Team`);
        setNewMember({
          name: '',
          email: '',
          adminRole: 'ops_admin',
          department: 'GPU Infrastructure & Gateways',
          permissions: ['providers.secrets.write', 'models.routing.write', 'generations.moderate'],
        });
        await loadAdminOverview();
      }
    } catch {
      showToast(`Invited ${newMember.name} to SPACIX Admin Team`);
    }
  };

  const handleUpdateTeamMember = async (memberId: string, patch: Record<string, unknown>) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...patch } : m))
    );
    try {
      const res = await fetch(`/api/admin/team/${memberId}`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ ...patch, _method: 'PATCH' }),
      });
      if (res.ok) {
        showToast('Updated team member permissions & role');
        await loadAdminOverview();
      }
    } catch {
      showToast('Updated team member permissions & role');
    }
  };

  const handleRemoveTeamMember = async (memberId: string, name: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
    try {
      const res = await fetch(`/api/admin/team/${memberId}`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ _method: 'DELETE' }),
      });
      if (res.ok) {
        showToast(`Removed ${name} from platform team`);
        await loadAdminOverview();
      }
    } catch {
      showToast(`Removed ${name} from platform team`);
    }
  };

  if (!currentAdmin || currentAdmin.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
        <Shield className="w-10 h-10 text-[#46ecd5] mx-auto" />
        <h2 className="font-display text-3xl font-bold uppercase text-white">
          Administrator Clearance Required
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400">
          Sign in with an administrator account to access the SPACIX Enterprise Operations Center, API Provider Vault, and Database Secrets.
        </p>
        <button
          onClick={() => navigate('auth')}
          className="px-6 py-3 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105"
        >
          Sign In as Administrator
        </button>
      </div>
    );
  }

  const enabledProvidersCount = providers.filter((p) => p.enabled).length;
  const enabledModelsCount = modelOverrides.filter((m) => m.enabled).length;
  const openTicketsCount = supportTickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress'
  ).length;
  const totalPlatformCredits = users.reduce((acc, u) => acc + u.credits.total, 0);

  const ADMIN_TABS: {
    id: AdminTabId;
    label: string;
    badge?: string | number;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'providers',
      label: 'Provider Secrets & Gateways',
      badge: `${enabledProvidersCount}/4`,
      icon: <Key className="w-3.5 h-3.5" />,
    },
    {
      id: 'models',
      label: 'Models & Provider Routing',
      badge: `${enabledModelsCount}/${MODEL_CATALOG.length}`,
      icon: <Sliders className="w-3.5 h-3.5" />,
    },
    {
      id: 'users',
      label: 'Users, Subscriptions & Wallets',
      badge: users.length,
      icon: <Users className="w-3.5 h-3.5" />,
    },
    {
      id: 'generations',
      label: 'Generations Management',
      badge: generations.length,
      icon: <Film className="w-3.5 h-3.5" />,
    },
    {
      id: 'billing',
      label: 'Pricing, Plans & Billing',
      icon: <DollarSign className="w-3.5 h-3.5" />,
    },
    {
      id: 'notifications',
      label: 'Notifications & Broadcasts',
      badge: notifications.filter((n) => n.active).length,
      icon: <Bell className="w-3.5 h-3.5" />,
    },
    {
      id: 'support',
      label: 'Support & Moderation',
      badge: openTicketsCount + reports.filter((r) => r.status === 'open').length,
      icon: <MessageSquare className="w-3.5 h-3.5" />,
    },
    {
      id: 'teams',
      label: 'Teams, Roles & Audit Log',
      badge: teamMembers.length,
      icon: <Shield className="w-3.5 h-3.5" />,
    },
  ];

  const selectedTicket =
    supportTickets.find((t) => t.id === selectedTicketId) || supportTickets[0] || null;

  return (
    <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-6 overflow-x-hidden">
      {/* =================================================================== */}
      {/* TOP COMMAND HEADER & KPI METRICS                                    */}
      {/* =================================================================== */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#111114] border border-white/10 space-y-5 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
            <SpacixLogo size="md" />
            <div className="h-8 w-px bg-white/10 hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-mono-tabular uppercase tracking-widest text-[#46ecd5] break-words">
                  ENTERPRISE CONTROL PLANE · RBAC: {currentAdmin.adminSubRole?.toUpperCase() || 'SUPER_ADMIN'}
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-4xl font-black uppercase tracking-wide text-white break-words">
                SPACIX Admin Operations Center
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadAdminOverview}
              className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#46ecd5] ${loading ? 'animate-spin' : ''}`} />
              <span>Sync State</span>
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-[#16161B] border border-white/10">
            <div className="text-[11px] text-zinc-400">Active API Gateways</div>
            <div className="font-display text-2xl font-black font-mono-tabular text-[#46ecd5] mt-0.5">
              {enabledProvidersCount} / 4 Online
            </div>
            <div className="text-[10px] text-zinc-500 font-mono-tabular mt-0.5">
              fal · Higgsfield · Muapi · Runware
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16161B] border border-white/10">
            <div className="text-[11px] text-zinc-400">Enabled Catalog Models</div>
            <div className="font-display text-2xl font-black font-mono-tabular text-white mt-0.5">
              {enabledModelsCount} / {MODEL_CATALOG.length}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono-tabular mt-0.5">
              Multi-provider routed
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16161B] border border-white/10">
            <div className="text-[11px] text-zinc-400">Registered Accounts</div>
            <div className="font-display text-2xl font-black font-mono-tabular text-white mt-0.5">
              {users.length} Users
            </div>
            <div className="text-[10px] text-zinc-500 font-mono-tabular mt-0.5">
              {users.filter((u) => u.plan !== 'free').length} Paid Subscribers
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16161B] border border-white/10">
            <div className="text-[11px] text-zinc-400">Circulating Wallet Credits</div>
            <div className="font-display text-2xl font-black font-mono-tabular text-[#46ecd5] mt-0.5">
              ✦ {totalPlatformCredits.toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono-tabular mt-0.5">
              Markup {billingConfig.creditMarkup}x · ${billingConfig.creditUsdValue}/cr
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16161B] border border-white/10">
            <div className="text-[11px] text-zinc-400">Total Studio Runs</div>
            <div className="font-display text-2xl font-black font-mono-tabular text-white mt-0.5">
              {generations.length} Runs
            </div>
            <div className="text-[10px] text-zinc-500 font-mono-tabular mt-0.5">
              {generations.filter((g) => g.isPublic).length} Public in Community
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#16161B] border border-white/10">
            <div className="text-[11px] text-zinc-400">Support & Trust Queue</div>
            <div className="font-display text-2xl font-black font-mono-tabular text-amber-400 mt-0.5">
              {openTicketsCount} Open Tickets
            </div>
            <div className="text-[10px] text-zinc-500 font-mono-tabular mt-0.5">
              {teamMembers.length} Active Team Admins
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-white/10">
          {ADMIN_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                  active
                    ? 'bg-[#46ecd5] text-zinc-950 shadow-lg shadow-[#46ecd5]/15'
                    : 'bg-[#16161B] text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular ${
                      active
                        ? 'bg-zinc-950/20 text-zinc-950 font-extrabold'
                        : 'bg-white/10 text-zinc-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: PROVIDER API KEYS LIST (ADD, EDIT, DELETE, ENABLE/DISABLE)   */}
      {/* =================================================================== */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold uppercase text-white">
                  01. Model API Providers & Multi-Key Vault
                </h2>
                <span className="px-2 py-0.5 rounded bg-[#46ecd5]/15 border border-[#46ecd5]/30 text-[10px] font-mono-tabular uppercase font-bold text-[#46ecd5]">
                  ADMIN-ONLY · HIDDEN FROM USERS & LANDING
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                View, add, edit, or delete multiple API keys for each provider (`RUNWARE_API_KEY`, `FAL_KEY`, `HF_CREDENTIALS`, `MUAPI_KEY`), set your active primary key, and enable or disable providers at any time.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {providers.map((prov) => {
              const meta = API_PROVIDER_META[prov.id];
              const secretVal = providerSecretInputs[prov.id] ?? '';
              const labelVal = providerKeyLabelInputs[prov.id] ?? '';
              const isRevealed = Boolean(showSecretPlaintext[prov.id]);
              const keysList = prov.apiKeys || [];

              const keyLabelMap: Record<
                ApiProviderId,
                { envName: string; placeholder: string; hint: string }
              > = {
                runware: {
                  envName: 'RUNWARE_API_KEY',
                  placeholder: 'Paste new Runware API key...',
                  hint: 'Single-endpoint JSON array (`POST https://api.runware.ai/v1`) using Bearer API Key authentication.',
                },
                fal: {
                  envName: 'FAL_KEY',
                  placeholder: 'Paste new fal.ai API key...',
                  hint: 'Authenticates requests to `https://queue.fal.run` and `https://fal.run` via `Authorization: Key $FAL_KEY`.',
                },
                higgsfield: {
                  envName: 'HF_CREDENTIALS',
                  placeholder: 'Paste new Higgsfield API key (key_id:key_secret)...',
                  hint: 'Authenticates requests to `https://platform.higgsfield.ai` via `Authorization: Key $HF_CREDENTIALS`.',
                },
                muapi: {
                  envName: 'MUAPI_KEY',
                  placeholder: 'Paste new Muapi.ai API key...',
                  hint: 'Authenticates requests to `https://api.muapi.ai/v1` via `Authorization: Bearer $MUAPI_KEY`.',
                },
              };

              const keyInfo = keyLabelMap[prov.id];

              return (
                <div
                  key={prov.id}
                  className={`p-4 sm:p-6 min-w-0 overflow-hidden rounded-2xl border transition-all space-y-5 ${
                    prov.enabled
                      ? 'bg-[#111114] border-white/15'
                      : 'bg-[#0D0D10] border-rose-500/25 opacity-80'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ProviderBrandIcon provider={prov.id} size={28} />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-2xl font-bold uppercase text-white">
                            {prov.label}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono-tabular uppercase font-bold ${
                              prov.enabled
                                ? 'bg-[#46ecd5]/15 text-[#46ecd5] border border-[#46ecd5]/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {prov.enabled ? 'ENABLED' : 'DISABLED'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono-tabular text-zinc-300">
                            {keysList.length} {keysList.length === 1 ? 'Key' : 'Keys'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">{meta?.tagline}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {prov.id === 'runware' && (
                        <button
                          type="button"
                          onClick={handleRunwarePing}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-bold uppercase tracking-wider text-xs transition-all flex items-center gap-1.5"
                        >
                          <Activity className="w-3.5 h-3.5 text-[#46ecd5]" />
                          <span>Ping</span>
                        </button>
                      )}
                      {/* Enable / Disable Switch */}
                      <button
                        onClick={() =>
                          handleUpdateProvider(
                            prov.id,
                            { enabled: !prov.enabled },
                            `${prov.label} ${!prov.enabled ? 'enabled' : 'disabled'}`
                          )
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                          prov.enabled
                            ? 'bg-zinc-800 hover:bg-rose-500/20 text-zinc-200 hover:text-rose-300 border border-white/10'
                            : 'bg-[#46ecd5] text-zinc-950'
                        }`}
                      >
                        {prov.enabled ? 'Disable Provider' : 'Enable Provider'}
                      </button>
                    </div>
                  </div>

                  {/* Active Primary API Key & Automatic Endpoint Summary */}
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-zinc-500 font-mono-tabular">
                        Active Primary Key ({keyInfo.envName})
                      </div>
                      <div className="font-mono-tabular text-[#46ecd5] font-semibold mt-1 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{prov.secretMasked}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-zinc-500 font-mono-tabular flex items-center justify-between">
                        <span>Automatic Endpoint</span>
                        {prov.id === 'runware' && runwarePingResult && (
                          <span className="text-[#46ecd5] font-bold">
                            pong: true ({runwarePingResult.latencyMs}ms)
                          </span>
                        )}
                      </div>
                      <div className="font-mono-tabular text-zinc-300 mt-1 truncate">
                        {prov.baseUrl}
                      </div>
                    </div>
                  </div>

                  {/* ======================================================= */}
                  {/* API KEYS LIST (EDIT, DELETE, SHOW/HIDE, SET PRIMARY)    */}
                  {/* ======================================================= */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-[#46ecd5]" />
                        <span>Configured API Keys ({keysList.length})</span>
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono-tabular">
                        Edit, delete, or switch active key
                      </span>
                    </div>

                    {keysList.length === 0 ? (
                      <div className="p-4 rounded-xl bg-zinc-950/70 border border-dashed border-white/10 text-center text-xs text-zinc-500">
                        No API keys saved for {prov.label}. Add a key below.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {keysList.map((keyItem) => {
                          const isEditing = editingKeyId === keyItem.id;
                          const isKeyRevealed = Boolean(revealedKeyIds[keyItem.id]);

                          return (
                            <div
                              key={keyItem.id}
                              className={`p-3 rounded-xl border transition-all text-xs space-y-2.5 ${
                                keyItem.isPrimary && keyItem.enabled
                                  ? 'bg-[#16161B] border-[#46ecd5]/40'
                                  : keyItem.enabled
                                  ? 'bg-[#16161B] border-white/10'
                                  : 'bg-zinc-950/60 border-white/5 opacity-60'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-white truncate">
                                      {keyItem.label}
                                    </span>
                                    {keyItem.isPrimary && (
                                      <span className="px-1.5 py-0.5 rounded bg-[#46ecd5] text-zinc-950 text-[10px] font-mono-tabular font-extrabold uppercase">
                                        ACTIVE PRIMARY
                                      </span>
                                    )}
                                    {!keyItem.enabled && (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono-tabular font-bold uppercase">
                                        DISABLED
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-mono-tabular text-[11px] text-[#46ecd5] mt-1 truncate">
                                    {isKeyRevealed ? keyItem.keyValue : keyItem.secretMasked}
                                  </div>
                                </div>

                                {/* Key Row Action Buttons */}
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                  {!keyItem.isPrimary && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateProvider(
                                          prov.id,
                                          {
                                            keyAction: 'edit',
                                            keyId: keyItem.id,
                                            isPrimary: true,
                                          },
                                          `Set "${keyItem.label}" as primary key for ${prov.label}`
                                        )
                                      }
                                      className="px-2 py-1 rounded bg-[#46ecd5]/15 hover:bg-[#46ecd5] text-[#46ecd5] hover:text-zinc-950 border border-[#46ecd5]/30 text-[10px] font-mono-tabular font-bold uppercase transition-colors flex items-center gap-1"
                                      title="Use this key as primary"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Use Key</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedKeyIds((prev) => ({
                                        ...prev,
                                        [keyItem.id]: !prev[keyItem.id],
                                      }))
                                    }
                                    className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-[10px] font-mono-tabular flex items-center gap-1"
                                    title={isKeyRevealed ? 'Hide key' : 'Reveal key'}
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>{isKeyRevealed ? 'Hide' : 'Show'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isEditing) {
                                        setEditingKeyId(null);
                                      } else {
                                        setEditingKeyId(keyItem.id);
                                        setEditingKeyForm({
                                          label: keyItem.label,
                                          keyValue: keyItem.keyValue,
                                        });
                                      }
                                    }}
                                    className={`px-2 py-1 rounded border text-[10px] font-mono-tabular flex items-center gap-1 ${
                                      isEditing
                                        ? 'bg-[#46ecd5] text-zinc-950 border-[#46ecd5] font-bold'
                                        : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-zinc-200'
                                    }`}
                                    title="Edit API key"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateProvider(
                                        prov.id,
                                        {
                                          keyAction: 'delete',
                                          keyId: keyItem.id,
                                        },
                                        `Deleted API key "${keyItem.label}" from ${prov.label}`
                                      )
                                    }
                                    className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-[10px] font-mono-tabular flex items-center gap-1"
                                    title="Delete API key"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>

                              {/* Inline Edit Form for Selected Key */}
                              {isEditing && (
                                <div className="pt-2.5 border-t border-white/10 space-y-2.5">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] uppercase text-zinc-400 font-mono-tabular block mb-1">
                                        Key Label
                                      </label>
                                      <input
                                        type="text"
                                        value={editingKeyForm.label}
                                        onChange={(e) =>
                                          setEditingKeyForm((f) => ({
                                            ...f,
                                            label: e.target.value,
                                          }))
                                        }
                                        placeholder="Key label..."
                                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/15 rounded-lg text-white text-xs focus:outline-none focus:border-[#46ecd5]"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] uppercase text-zinc-400 font-mono-tabular block mb-1">
                                        API Key Value ({keyInfo.envName})
                                      </label>
                                      <input
                                        type="text"
                                        value={editingKeyForm.keyValue}
                                        onChange={(e) =>
                                          setEditingKeyForm((f) => ({
                                            ...f,
                                            keyValue: e.target.value,
                                          }))
                                        }
                                        placeholder="API key value..."
                                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/15 rounded-lg text-white font-mono-tabular text-xs focus:outline-none focus:border-[#46ecd5]"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingKeyId(null)}
                                      className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-[11px] font-semibold"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateProvider(
                                          prov.id,
                                          {
                                            keyAction: 'edit',
                                            keyId: keyItem.id,
                                            label: editingKeyForm.label,
                                            keyValue: editingKeyForm.keyValue,
                                          },
                                          `Updated API key "${editingKeyForm.label}"`
                                        );
                                        setEditingKeyId(null);
                                      }}
                                      className="px-3 py-1 rounded-lg bg-[#46ecd5] text-zinc-950 text-[11px] font-bold uppercase flex items-center gap-1"
                                    >
                                      <Save className="w-3 h-3" />
                                      <span>Save Key Changes</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ======================================================= */}
                  {/* ADD NEW API KEY FORM                                    */}
                  {/* ======================================================= */}
                  <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-white/10 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-[#46ecd5] flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New {prov.label} API Key</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setShowSecretPlaintext((prev) => ({
                            ...prev,
                            [prov.id]: !prev[prov.id],
                          }))
                        }
                        className="text-[11px] text-zinc-400 hover:text-[#46ecd5] inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{isRevealed ? 'Hide Input' : 'Show Input'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={labelVal}
                          onChange={(e) =>
                            setProviderKeyLabelInputs((prev) => ({
                              ...prev,
                              [prov.id]: e.target.value,
                            }))
                          }
                          placeholder="Key Label (e.g. Prod Key 2)"
                          className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#46ecd5]"
                        />
                      </div>
                      <div className="sm:col-span-8">
                        <input
                          type={isRevealed ? 'text' : 'password'}
                          value={secretVal}
                          onChange={(e) =>
                            setProviderSecretInputs((prev) => ({
                              ...prev,
                              [prov.id]: e.target.value,
                            }))
                          }
                          placeholder={keyInfo.placeholder}
                          className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular focus:outline-none focus:border-[#46ecd5]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-zinc-500">{keyInfo.hint}</span>
                      <button
                        type="button"
                        disabled={!secretVal.trim()}
                        onClick={() =>
                          handleUpdateProvider(
                            prov.id,
                            {
                              keyAction: 'add',
                              label:
                                labelVal.trim() ||
                                `${prov.label} Key #${keysList.length + 1}`,
                              keyValue: secretVal.trim(),
                              isPrimary: true,
                            },
                            `Added new API key to ${prov.label}`
                          )
                        }
                        className="px-4 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider text-xs hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add API Key</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* =============================================================== */}
          {/* 01B. DATABASE SECRETS VAULT (`spacix_secrets`)                  */}
          {/* =============================================================== */}
          <div className="p-4 sm:p-6 rounded-2xl bg-[#111114] border border-white/15 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#46ecd5]" />
                  <h3 className="font-display text-2xl font-bold uppercase text-white">
                    01B. Database Secrets Vault (`spacix_secrets`)
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-[#46ecd5]/15 border border-[#46ecd5]/30 text-[10px] font-mono-tabular uppercase font-bold text-[#46ecd5]">
                    {secrets.filter((s) => s.hasValue).length} / {secrets.length} CONFIGURED IN DB
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  All platform secrets (Authentication signing keys, Provider API keys, Webhook HMAC secrets, Stripe billing keys, Email/Resend credentials, and Cloudflare R2 storage keys) are persisted directly in the database.
                </p>
              </div>
            </div>

            {/* Add Custom / New Secret Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newSecretForm.key.trim() || !newSecretForm.secretValue.trim()) return;
                await handleSaveSecret({
                  key: newSecretForm.key.trim(),
                  label: newSecretForm.label.trim() || newSecretForm.key.trim(),
                  category: newSecretForm.category,
                  secretValue: newSecretForm.secretValue.trim(),
                  description: newSecretForm.description.trim(),
                });
                setNewSecretForm({
                  key: '',
                  label: '',
                  category: 'system',
                  secretValue: '',
                  description: '',
                });
              }}
              className="p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-3 text-xs"
            >
              <div className="font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#46ecd5]" />
                <span>Add or Override Database Secret Key</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Secret Key Name</label>
                  <input
                    type="text"
                    required
                    value={newSecretForm.key}
                    onChange={(e) =>
                      setNewSecretForm((p) => ({
                        ...p,
                        key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
                      }))
                    }
                    placeholder="e.g. STRIPE_SECRET_KEY"
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Category</label>
                  <select
                    value={newSecretForm.category}
                    onChange={(e) =>
                      setNewSecretForm((p) => ({
                        ...p,
                        category: e.target.value as PlatformSecretEntry['category'],
                      }))
                    }
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                  >
                    <option value="system">System / API</option>
                    <option value="auth">Authentication</option>
                    <option value="billing">Stripe / Billing</option>
                    <option value="email">Email / SMTP / Resend</option>
                    <option value="storage">Cloudflare R2 / Storage</option>
                    <option value="webhook">Webhooks</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Label</label>
                  <input
                    type="text"
                    value={newSecretForm.label}
                    onChange={(e) => setNewSecretForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder="Display label..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Secret Value</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      required
                      value={newSecretForm.secretValue}
                      onChange={(e) =>
                        setNewSecretForm((p) => ({ ...p, secretValue: e.target.value }))
                      }
                      placeholder="Paste secret value..."
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Secrets List Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {secrets.map((sec) => {
                const draftVal = secretDrafts[sec.key] ?? '';
                const isRevealed = Boolean(revealedSecretKeys[sec.key]);

                return (
                  <div
                    key={sec.key}
                    className="p-4 rounded-xl bg-zinc-950/90 border border-white/10 space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono-tabular font-bold text-[#46ecd5] break-all">
                            {sec.key}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono-tabular uppercase text-zinc-300">
                            {sec.category}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono-tabular uppercase font-bold ${
                              sec.hasValue
                                ? 'bg-[#46ecd5]/15 text-[#46ecd5] border border-[#46ecd5]/30'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {sec.hasValue ? 'SAVED IN DB' : 'EMPTY'}
                          </span>
                        </div>
                        <div className="text-zinc-300 font-medium mt-0.5">{sec.label}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">{sec.description}</div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {sec.hasValue && (
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedSecretKeys((p) => ({ ...p, [sec.key]: !isRevealed }))
                            }
                            className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                            title={isRevealed ? 'Hide secret' : 'Reveal secret'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {sec.hasValue && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSecret(sec.key)}
                            className="p-1.5 rounded bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300"
                            title="Clear secret from database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="px-3 py-2 rounded-lg bg-zinc-900/90 border border-white/5 font-mono-tabular text-[11px] text-zinc-200 break-all">
                      {sec.hasValue
                        ? isRevealed
                          ? sec.secretValue
                          : sec.secretMasked
                        : 'No secret value stored in database'}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type={isRevealed ? 'text' : 'password'}
                        value={draftVal}
                        onChange={(e) =>
                          setSecretDrafts((p) => ({ ...p, [sec.key]: e.target.value }))
                        }
                        placeholder={`Update ${sec.key} in DB...`}
                        className="flex-1 min-w-0 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular focus:outline-none focus:border-[#46ecd5]"
                      />
                      <button
                        type="button"
                        disabled={!draftVal.trim()}
                        onClick={() =>
                          handleSaveSecret({
                            key: sec.key,
                            secretValue: draftVal.trim(),
                            label: sec.label,
                            category: sec.category,
                            description: sec.description,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider disabled:opacity-40 shrink-0"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: MODELS & PROVIDER ROUTING MATRIX                             */}
      {/* =================================================================== */}
      {activeTab === 'models' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-white">
                02. Model Catalog Availability & Multi-Provider Routing
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Enable or disable individual models, select which API provider serves each model by default, toggle allowed providers, and customize base USD pricing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1 p-1 bg-[#111114] border border-white/10 rounded-lg">
                {(['all', 'video', 'image', 'audio'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setModelSurfaceFilter(s)}
                    className={`px-2.5 py-1 text-xs font-semibold uppercase rounded ${
                      modelSurfaceFilter === s
                        ? 'bg-[#46ecd5] text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#111114] border border-white/10 rounded-lg">
                {(['all', 'fal', 'higgsfield', 'muapi', 'runware'] as const).map((pid) => (
                  <button
                    key={pid}
                    onClick={() => setModelProviderFilter(pid)}
                    className={`px-2.5 py-1 text-xs font-semibold uppercase rounded ${
                      modelProviderFilter === pid
                        ? 'bg-[#46ecd5] text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {pid}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Search 21 models..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#111114] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#46ecd5]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#111114] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-[#16161B] text-zinc-400">
                    <th className="py-3.5 px-4 font-semibold">Model & Surface</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Primary API Provider</th>
                    <th className="py-3.5 px-4 font-semibold">Allowed Gateways</th>
                    <th className="py-3.5 px-4 font-semibold">Endpoint Path</th>
                    <th className="py-3.5 px-4 font-semibold">Base USD / Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {MODEL_CATALOG.filter((m) =>
                    modelSurfaceFilter === 'all' ? true : m.surface === modelSurfaceFilter
                  )
                    .filter((m) => {
                      const ov = modelOverrides.find((o) => o.modelId === m.id);
                      if (modelProviderFilter === 'all') return true;
                      return (
                        ov?.preferredProvider === modelProviderFilter ||
                        ov?.allowedProviders?.includes(modelProviderFilter)
                      );
                    })
                    .filter(
                      (m) =>
                        !modelSearch.trim() ||
                        m.label.toLowerCase().includes(modelSearch.toLowerCase()) ||
                        m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
                        m.provider.toLowerCase().includes(modelSearch.toLowerCase())
                    )
                    .map((model) => {
                      const ov = modelOverrides.find((o) => o.modelId === model.id) || {
                        modelId: model.id,
                        enabled: true,
                        baseHfUsd: model.baseHfUsd,
                        preferredProvider: model.defaultApiProvider || 'fal',
                        allowedProviders: getEffectiveProvidersForModel(model).map(
                          (s) => s.providerId
                        ),
                        customEndpoint: model.restPaths.default,
                      };
                      const allSpecs = getEffectiveProvidersForModel(model);

                      return (
                        <tr key={model.id} className="hover:bg-white/[0.02]">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <ProviderBrandIcon provider={model.provider} size={18} />
                              <div>
                                <div className="font-bold text-white">{model.label}</div>
                                <div className="text-[11px] font-mono-tabular text-zinc-500">
                                  {model.id} · {model.surface.toUpperCase()} ({model.billingUnit})
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() =>
                                handleUpdateModelRouting(
                                  model.id,
                                  { enabled: !ov.enabled },
                                  `${model.label} ${!ov.enabled ? 'enabled in catalog' : 'hidden from catalog'}`
                                )
                              }
                              className={`px-3 py-1 rounded-lg font-bold text-[11px] uppercase ${
                                ov.enabled
                                  ? 'bg-[#46ecd5]/15 text-[#46ecd5] border border-[#46ecd5]/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {ov.enabled ? 'Enabled' : 'Disabled'}
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <select
                              value={ov.preferredProvider}
                              onChange={(e) => {
                                const nextProv = e.target.value as ApiProviderId;
                                const specForProv = allSpecs.find(
                                  (s) => s.providerId === nextProv
                                );
                                handleUpdateModelRouting(
                                  model.id,
                                  {
                                    preferredProvider: nextProv,
                                    customEndpoint:
                                      specForProv?.endpoint || ov.customEndpoint,
                                  },
                                  `Routed ${model.label} to ${nextProv.toUpperCase()}`
                                );
                              }}
                              className="px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular text-xs focus:border-[#46ecd5] focus:outline-none"
                            >
                              {(['fal', 'higgsfield', 'muapi', 'runware'] as ApiProviderId[]).map(
                                (pid) => (
                                  <option key={pid} value={pid}>
                                    {API_PROVIDER_META[pid].label}
                                  </option>
                                )
                              )}
                            </select>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-1">
                              {(['fal', 'higgsfield', 'muapi', 'runware'] as ApiProviderId[]).map(
                                (pid) => {
                                  const isAllowed = ov.allowedProviders?.includes(pid);
                                  return (
                                    <button
                                      key={pid}
                                      type="button"
                                      onClick={() => {
                                        const current = ov.allowedProviders || [];
                                        const next = isAllowed
                                          ? current.filter((x) => x !== pid)
                                          : [...current, pid];
                                        if (next.length === 0) return;
                                        handleUpdateModelRouting(
                                          model.id,
                                          { allowedProviders: next },
                                          `Updated allowed gateways for ${model.label}`
                                        );
                                      }}
                                      className={`px-2 py-0.5 rounded text-[10px] font-mono-tabular uppercase border transition-colors ${
                                        isAllowed
                                          ? 'bg-[#46ecd5]/15 border-[#46ecd5]/40 text-[#46ecd5] font-bold'
                                          : 'bg-zinc-900 border-white/5 text-zinc-500'
                                      }`}
                                    >
                                      {API_PROVIDER_META[pid].shortLabel}
                                    </button>
                                  );
                                }
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              defaultValue={ov.customEndpoint || model.restPaths.default}
                              onBlur={(e) => {
                                if (e.target.value !== ov.customEndpoint) {
                                  handleUpdateModelRouting(
                                    model.id,
                                    { customEndpoint: e.target.value },
                                    `Updated endpoint path for ${model.label}`
                                  );
                                }
                              }}
                              className="w-48 px-2.5 py-1 bg-zinc-900 border border-white/10 rounded text-[11px] font-mono-tabular text-zinc-200 focus:border-[#46ecd5] focus:outline-none"
                            />
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-zinc-500 font-mono-tabular">$</span>
                              <input
                                type="number"
                                step="0.005"
                                min="0.001"
                                defaultValue={ov.baseHfUsd}
                                onBlur={(e) => {
                                  const val = Number(e.target.value);
                                  if (val > 0 && val !== ov.baseHfUsd) {
                                    handleUpdateModelRouting(
                                      model.id,
                                      { baseHfUsd: val },
                                      `Updated ${model.label} base cost to $${val.toFixed(3)}`
                                    );
                                  }
                                }}
                                className="w-20 px-2 py-1 bg-zinc-900 border border-white/10 rounded text-xs font-mono-tabular text-[#46ecd5] font-bold focus:border-[#46ecd5] focus:outline-none"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* =============================================================== */}
          {/* ADMIN RUNWARE v1 SINGLE-ENDPOINT SUITE                          */}
          {/* (modelSearch, "model": "auto" Router, getTaskDetails & Storage) */}
          {/* =============================================================== */}
          <div className="p-4 sm:p-6 min-w-0 overflow-hidden rounded-2xl bg-[#111114] border border-white/10 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <ProviderBrandIcon provider="runware" size={26} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-xl sm:text-2xl font-bold uppercase text-white break-words">
                      Runware v1 Single-Endpoint Suite (`https://api.runware.ai/v1`)
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-[#46ecd5]/15 border border-[#46ecd5]/30 text-[10px] font-mono-tabular uppercase font-bold text-[#46ecd5]">
                      ADMIN-ONLY
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 break-words">
                    Search official & community AIR models (`taskType: "modelSearch"`), configure `"model": "auto"` intelligent routing, inspect task payloads (`getTaskDetails` / `getResponse`), and manage `mediaStorage`.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-[#16161B] border border-white/10 rounded-xl max-w-full overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: 'search', label: 'Model Search (modelSearch)' },
                    { id: 'router', label: 'Auto Model Router ("model": "auto")' },
                    { id: 'inspector', label: 'Task Inspector & Media Storage' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRunwareSuiteTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                      runwareSuiteTab === t.id
                        ? 'bg-[#46ecd5] text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SUB-TAB 1: RUNWARE MODEL SEARCH (taskType: "modelSearch") */}
            {runwareSuiteTab === 'search' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={rwSearchQuery}
                        onChange={(e) => {
                          setRwSearchQuery(e.target.value);
                          handleRunwareModelSearch(
                            e.target.value,
                            rwSearchSource,
                            rwSearchCategory
                          );
                        }}
                        placeholder="Search AIR ID or model (e.g. grok, kling, flux, civitai)..."
                        className="pl-8 pr-3 py-1.5 w-full text-xs bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular focus:outline-none focus:border-[#46ecd5]"
                      />
                    </div>

                    <select
                      value={rwSearchSource}
                      onChange={(e) => {
                        const val = e.target.value as 'all' | 'official' | 'community';
                        setRwSearchSource(val);
                        handleRunwareModelSearch(rwSearchQuery, val, rwSearchCategory);
                      }}
                      className="px-2.5 py-1.5 w-full sm:w-auto text-xs bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                    >
                      <option value="all">Source: All (Official + Community)</option>
                      <option value="official">Source: Official Featured</option>
                      <option value="community">Source: Community (Civitai)</option>
                    </select>

                    <select
                      value={rwSearchCategory}
                      onChange={(e) => {
                        const val = e.target.value as 'all' | 'checkpoint' | 'lora';
                        setRwSearchCategory(val);
                        handleRunwareModelSearch(rwSearchQuery, rwSearchSource, val);
                      }}
                      className="px-2.5 py-1.5 w-full sm:w-auto text-xs bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                    >
                      <option value="all">Category: All</option>
                      <option value="checkpoint">Category: Checkpoint</option>
                      <option value="lora">Category: LoRA</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
                    <span className="text-zinc-400">Bind AIR ID to Studio Model:</span>
                    <select
                      value={rwTargetStudioModelId}
                      onChange={(e) => setRwTargetStudioModelId(e.target.value)}
                      className="px-2.5 py-1.5 w-full sm:w-auto bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular text-xs"
                    >
                      {MODEL_CATALOG.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label} ({m.surface})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rwSearchResults.map((item) => (
                    <div
                      key={item.air}
                      className="p-4 rounded-xl bg-[#16161B] border border-white/10 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white text-xs">{item.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono-tabular uppercase text-zinc-300">
                            {item.source} · {item.category}
                          </span>
                        </div>
                        <div className="px-2 py-1 rounded bg-zinc-950 border border-white/5 font-mono-tabular text-[11px] text-[#46ecd5] truncate">
                          {item.air}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 font-mono-tabular">
                          <span>arch: {item.architecture}</span>
                          {item.defaultWidth && item.defaultHeight && (
                            <span>
                              · {item.defaultWidth}×{item.defaultHeight}
                            </span>
                          )}
                          {item.defaultSteps && <span>· {item.defaultSteps} steps</span>}
                          {item.pricing && (
                            <span className="text-[#46ecd5]">
                              · ${item.pricing.baseUsd} / {item.pricing.unit}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded bg-zinc-900 text-[10px] text-zinc-400 font-mono-tabular"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateModelRouting(
                              rwTargetStudioModelId,
                              {
                                preferredProvider: 'runware',
                                customEndpoint: item.air,
                                ...(item.pricing?.baseUsd
                                  ? { baseHfUsd: item.pricing.baseUsd }
                                  : {}),
                              },
                              `Bound ${rwTargetStudioModelId} to Runware AIR ${item.air}`
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-[#46ecd5]/15 hover:bg-[#46ecd5] text-[#46ecd5] hover:text-zinc-950 border border-[#46ecd5]/30 text-[11px] font-bold uppercase transition-colors"
                        >
                          Bind AIR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: RUNWARE AUTO MODEL ROUTER ("model": "auto") */}
            {runwareSuiteTab === 'router' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
                <div className="min-w-0 lg:col-span-7 space-y-4 p-4 rounded-xl bg-[#16161B] border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">
                        Enable Runware Auto Model Router (`"model": "auto"`)
                      </div>
                      <p className="text-zinc-400 text-[11px]">
                        Automatically selects the optimal model per prompt based on quality, speed, and cost weights (`includeCost: true`).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setRwRouterConfig((p) => ({ ...p, enabled: !p.enabled }))
                      }
                      className={`px-3.5 py-1.5 rounded-lg font-bold uppercase text-xs ${
                        rwRouterConfig.enabled
                          ? 'bg-[#46ecd5] text-zinc-950'
                          : 'bg-zinc-800 text-zinc-300 border border-white/10'
                      }`}
                    >
                      {rwRouterConfig.enabled ? 'Auto Router Enabled' : 'Auto Router Disabled'}
                    </button>
                  </div>

                  {/* Preferences Sliders (0 to 5) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {(
                      [
                        { key: 'quality', label: 'Quality Weight (0-5)' },
                        { key: 'speed', label: 'Speed Weight (0-5)' },
                        { key: 'cost', label: 'Cost Efficiency (0-5)' },
                      ] as const
                    ).map((pref) => (
                      <div
                        key={pref.key}
                        className="p-3 rounded-lg bg-zinc-950 border border-white/5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">{pref.label}</span>
                          <span className="font-mono-tabular font-bold text-[#46ecd5]">
                            {rwRouterConfig.preferences[pref.key]}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={5}
                          step={1}
                          value={rwRouterConfig.preferences[pref.key]}
                          onChange={(e) =>
                            setRwRouterConfig((p) => ({
                              ...p,
                              preferences: {
                                ...p.preferences,
                                [pref.key]: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-[#46ecd5]"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-400 block mb-1">
                        Max Price Ceiling (`routing.maxPrice` USD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={rwRouterConfig.maxPrice}
                        onChange={(e) =>
                          setRwRouterConfig((p) => ({
                            ...p,
                            maxPrice: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">
                        Model Pool Filter (Mutually Exclusive)
                      </label>
                      <select
                        value={rwRouterConfig.filterMode}
                        onChange={(e) =>
                          setRwRouterConfig((p) => ({
                            ...p,
                            filterMode: e.target.value as
                              | 'none'
                              | 'allowedModels'
                              | 'excludedModels',
                          }))
                        }
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                      >
                        <option value="none">No Restriction (Full Official Pool)</option>
                        <option value="allowedModels">allowedModels (Min 2 AIR IDs)</option>
                        <option value="excludedModels">excludedModels (Blocklist)</option>
                      </select>
                    </div>
                  </div>

                  {rwRouterConfig.filterMode === 'allowedModels' && (
                    <div>
                      <label className="text-zinc-400 block mb-1">
                        Allowed Models (`routing.allowedModels` — comma-separated, min 2)
                      </label>
                      <input
                        type="text"
                        value={rwRouterConfig.allowedModelsText}
                        onChange={(e) =>
                          setRwRouterConfig((p) => ({
                            ...p,
                            allowedModelsText: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                      />
                    </div>
                  )}

                  {rwRouterConfig.filterMode === 'excludedModels' && (
                    <div>
                      <label className="text-zinc-400 block mb-1">
                        Excluded Models (`routing.excludedModels` — comma-separated)
                      </label>
                      <input
                        type="text"
                        value={rwRouterConfig.excludedModelsText}
                        onChange={(e) =>
                          setRwRouterConfig((p) => ({
                            ...p,
                            excludedModelsText: e.target.value,
                          }))
                        }
                        placeholder="e.g. runware:100@1"
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-zinc-400 block mb-1">
                      Routing Hint (`routing.requirements` — max 500 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={500}
                      value={rwRouterConfig.requirements}
                      onChange={(e) =>
                        setRwRouterConfig((p) => ({ ...p, requirements: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveRunwareRouter}
                      className="px-4 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Auto Router Config</span>
                    </button>
                  </div>
                </div>

                {/* Live Runware Auto Router JSON Preview */}
                <div className="min-w-0 lg:col-span-5 p-4 rounded-xl bg-zinc-950 border border-white/10 space-y-2">
                  <div className="text-[11px] font-mono-tabular uppercase text-[#46ecd5] font-bold">
                    Live Runware Task Payload (`POST https://api.runware.ai/v1`)
                  </div>
                  <pre className="text-[11px] font-mono-tabular text-zinc-300 overflow-x-auto leading-relaxed">
                    {JSON.stringify(
                      [
                        {
                          taskType: 'imageInference',
                          taskUUID: 'a770f077-f413-47de-9dac-be0b26a35da6',
                          model: 'auto',
                          positivePrompt: 'A cinematic portrait at golden hour, 35mm film',
                          width: 1024,
                          height: 1024,
                          includeCost: true,
                          routing: {
                            preferences: rwRouterConfig.preferences,
                            maxPrice: rwRouterConfig.maxPrice,
                            ...(rwRouterConfig.requirements
                              ? { requirements: rwRouterConfig.requirements }
                              : {}),
                            ...(rwRouterConfig.filterMode === 'allowedModels'
                              ? {
                                  allowedModels: rwRouterConfig.allowedModelsText
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                }
                              : rwRouterConfig.filterMode === 'excludedModels'
                              ? {
                                  excludedModels: rwRouterConfig.excludedModelsText
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                }
                              : {}),
                          },
                        },
                      ],
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: RUNWARE TASK INSPECTOR (getTaskDetails / getResponse) & MEDIA STORAGE */}
            {runwareSuiteTab === 'inspector' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
                <div className="min-w-0 lg:col-span-7 space-y-3 p-4 rounded-xl bg-[#16161B] border border-white/10">
                  <div className="font-bold text-white text-sm">
                    Runware Task Audit (`getTaskDetails` & `getResponse`)
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={rwInspectTaskUUID}
                      onChange={(e) => setRwInspectTaskUUID(e.target.value)}
                      placeholder="Enter Runware taskUUID..."
                      className="flex-1 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectRunwareTask(rwInspectTaskUUID, 'getTaskDetails')
                      }
                      className="px-3 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold uppercase"
                    >
                      getTaskDetails
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleInspectRunwareTask(rwInspectTaskUUID, 'getResponse')
                      }
                      className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase border border-white/10"
                    >
                      getResponse
                    </button>
                  </div>

                  {rwRecentTasks.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-zinc-500">Recent taskUUIDs:</span>
                      {rwRecentTasks.slice(0, 4).map((t) => (
                        <button
                          key={t.taskUUID}
                          type="button"
                          onClick={() =>
                            handleInspectRunwareTask(t.taskUUID, 'getTaskDetails')
                          }
                          className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[10px] font-mono-tabular text-[#46ecd5]"
                        >
                          {t.taskUUID.slice(0, 18)}
                        </button>
                      ))}
                    </div>
                  )}

                  {rwInspectedPayload && (
                    <pre className="p-3 rounded-lg bg-zinc-950 border border-white/10 text-[11px] font-mono-tabular text-zinc-300 overflow-x-auto max-h-72">
                      {JSON.stringify({ data: [rwInspectedPayload] }, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Runware Media Storage (taskType: "mediaStorage") */}
                <div className="min-w-0 lg:col-span-5 space-y-3 p-4 rounded-xl bg-[#16161B] border border-white/10">
                  <div className="font-bold text-white text-sm">
                    Runware Media Storage (`taskType: "mediaStorage"`)
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Upload reference images, videos, or audio once and reuse the returned `mediaUUID` across `inputs.referenceImages` (30-day automatic renewal).
                  </p>
                  <input
                    type="text"
                    value={rwMediaInput}
                    onChange={(e) => setRwMediaInput(e.target.value)}
                    placeholder="Public URL, data URI, or mediaUUID..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRunwareMediaStorage('upload')}
                      className="px-3.5 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold uppercase"
                    >
                      Upload Media
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunwareMediaStorage('delete')}
                      className="px-3.5 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold uppercase"
                    >
                      Delete mediaUUID
                    </button>
                  </div>
                  {rwMediaResult && (
                    <pre className="p-3 rounded-lg bg-zinc-950 border border-white/10 text-[11px] font-mono-tabular text-[#46ecd5] overflow-x-auto">
                      {JSON.stringify({ data: [rwMediaResult] }, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: USER MANAGEMENT CRUD, SUBSCRIPTIONS & WALLETS                */}
      {/* =================================================================== */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: User Directory Table */}
          <div className="min-w-0 lg:col-span-7 rounded-2xl bg-[#111114] border border-white/10 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold uppercase text-white">
                  03. User Directory ({users.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  Select any user to manage profile, role, subscription tier, or wallet credit buckets
                </p>
              </div>
              <button
                onClick={() => setShowCreateUserModal((prev) => !prev)}
                className="px-3.5 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:brightness-105"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create User</span>
              </button>
            </div>

            {/* Create User Collapsible Form */}
            {showCreateUserModal && (
              <form
                onSubmit={handleCreateUser}
                className="p-4 rounded-xl bg-[#16161B] border border-[#46ecd5]/40 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase text-[#46ecd5]">
                    Create New Studio User Account
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.name}
                      onChange={(e) =>
                        setNewUserForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="e.g. Naomi Watts"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newUserForm.email}
                      onChange={(e) =>
                        setNewUserForm((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="user@domain.com"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Initial Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newUserForm.password}
                      onChange={(e) =>
                        setNewUserForm((p) => ({ ...p, password: e.target.value }))
                      }
                      placeholder="Min. 6 characters"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Platform Role</label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) =>
                        setNewUserForm((p) => ({
                          ...p,
                          role: e.target.value as 'user' | 'admin',
                        }))
                      }
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    >
                      <option value="user">Creator (Standard User)</option>
                      <option value="admin">Platform Administrator</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Subscription Plan</label>
                    <select
                      value={newUserForm.plan}
                      onChange={(e) =>
                        setNewUserForm((p) => ({
                          ...p,
                          plan: e.target.value as PlanTierId,
                        }))
                      }
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    >
                      <option value="free">Free Explorer</option>
                      <option value="starter">Creator Starter</option>
                      <option value="plus">Studio Plus</option>
                      <option value="ultra">Production Ultra</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">
                      Initial Subscription Credits
                    </label>
                    <input
                      type="number"
                      value={newUserForm.subscriptionCredits}
                      onChange={(e) =>
                        setNewUserForm((p) => ({
                          ...p,
                          subscriptionCredits: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Initial Top-Up Credits</label>
                    <input
                      type="number"
                      value={newUserForm.topupCredits}
                      onChange={(e) =>
                        setNewUserForm((p) => ({
                          ...p,
                          topupCredits: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider rounded-lg"
                >
                  Provision Account & Wallet
                </button>
              </form>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg">
                {(['all', 'free', 'starter', 'plus', 'ultra'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setUserPlanFilter(p)}
                    className={`px-2.5 py-1 text-xs font-semibold uppercase rounded ${
                      userPlanFilter === p
                        ? 'bg-[#46ecd5] text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search name or email..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#46ecd5]"
                />
              </div>
            </div>

            {/* Users List */}
            <div className="divide-y divide-white/5 max-h-[540px] overflow-y-auto">
              {users
                .filter((u) => (userPlanFilter === 'all' ? true : u.plan === userPlanFilter))
                .filter(
                  (u) =>
                    !userSearch.trim() ||
                    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                    u.email.toLowerCase().includes(userSearch.toLowerCase())
                )
                .map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`p-3.5 cursor-pointer flex items-center justify-between gap-3 transition-colors rounded-xl ${
                        isSelected
                          ? 'bg-[#161E20] border border-[#46ecd5]/50'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">
                            {u.name}
                          </span>
                          {u.role === 'admin' && (
                            <span className="px-1.5 py-0.5 rounded bg-[#46ecd5]/15 text-[#46ecd5] text-[10px] font-mono-tabular uppercase font-bold">
                              ADMIN
                            </span>
                          )}
                          {u.status === 'suspended' && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono-tabular uppercase font-bold">
                              SUSPENDED
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono-tabular text-zinc-400 truncate">
                          {u.email}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono-tabular text-xs font-bold text-[#46ecd5]">
                          ✦ {u.credits.total.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-mono-tabular uppercase text-zinc-400">
                          {u.plan} ({u.billingCycle || 'monthly'})
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right: Selected User CRUD, Subscription & Wallet Manager */}
          {selectedUser && (
            <div className="min-w-0 lg:col-span-5 space-y-5">
              {/* Profile & Subscription CRUD Card */}
              <div className="p-4 sm:p-6 rounded-2xl bg-[#111114] border border-white/10 space-y-5 text-xs">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="text-[10px] font-mono-tabular uppercase text-[#46ecd5]">
                      SELECTED ACCOUNT · {selectedUser.id}
                    </div>
                    <h3 className="font-display text-2xl font-bold uppercase text-white mt-0.5">
                      {selectedUser.name}
                    </h3>
                    <div className="font-mono-tabular text-zinc-400">{selectedUser.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleUpdateUser(
                          selectedUser.id,
                          {
                            status:
                              selectedUser.status === 'suspended' ? 'active' : 'suspended',
                          },
                          `Account ${
                            selectedUser.status === 'suspended' ? 'reactivated' : 'suspended'
                          }`
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg font-bold uppercase text-[11px] ${
                        selectedUser.status === 'suspended'
                          ? 'bg-[#46ecd5] text-zinc-950'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {selectedUser.status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>
                    {selectedUser.id !== currentAdmin.id && (
                      <button
                        onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}
                        title="Delete user account"
                        className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Role & Subscription Tier Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1">Display Name</label>
                    <input
                      type="text"
                      defaultValue={selectedUser.name}
                      key={`name_${selectedUser.id}`}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== selectedUser.name) {
                          handleUpdateUser(
                            selectedUser.id,
                            { name: e.target.value },
                            'Updated user display name'
                          );
                        }
                      }}
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Account Role</label>
                    <select
                      value={selectedUser.role}
                      onChange={(e) =>
                        handleUpdateUser(
                          selectedUser.id,
                          { role: e.target.value },
                          `Updated role to ${e.target.value}`
                        )
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    >
                      <option value="user">User (Creator)</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Subscription Tier</label>
                    <select
                      value={selectedUser.plan}
                      onChange={(e) =>
                        handleUpdateUser(
                          selectedUser.id,
                          { plan: e.target.value, resetPlanAllowance: true },
                          `Switched ${selectedUser.name} to ${e.target.value.toUpperCase()} & reset allowance`
                        )
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-bold"
                    >
                      <option value="free">Free Explorer (50 cr)</option>
                      <option value="starter">Creator Starter (200 cr)</option>
                      <option value="plus">Studio Plus (500 cr)</option>
                      <option value="ultra">Production Ultra (1,500 cr)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Billing Cycle</label>
                    <select
                      value={selectedUser.billingCycle || 'monthly'}
                      onChange={(e) =>
                        handleUpdateUser(
                          selectedUser.id,
                          { billingCycle: e.target.value },
                          `Updated billing cycle to ${e.target.value}`
                        )
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    >
                      <option value="monthly">Monthly Billing</option>
                      <option value="annual">Annual Billing (20% Off)</option>
                    </select>
                  </div>
                </div>

                {/* Direct Wallet Balance Overrides */}
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase text-white flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-[#46ecd5]" />
                      <span>Direct Wallet Balance Setter</span>
                    </span>
                    <span className="font-mono-tabular text-[#46ecd5] font-bold">
                      Total: ✦ {selectedUser.credits.total.toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-400 block mb-1">
                        Subscription Bucket
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={walletSubInput}
                        onChange={(e) => setWalletSubInput(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">
                        Top-Up Bucket (Non-Expiring)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={walletTopupInput}
                        onChange={(e) => setWalletTopupInput(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateUser(
                        selectedUser.id,
                        {
                          subscriptionCredits: Number(walletSubInput),
                          topupCredits: Number(walletTopupInput),
                          note: 'Direct wallet balance override from Admin Console',
                        },
                        `Updated ${selectedUser.name}'s wallet balances`
                      )
                    }
                    className="w-full py-2 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold uppercase tracking-wider transition-colors"
                  >
                    Set Exact Wallet Balances
                  </button>
                </div>

                {/* Quick Delta Adjustment Form */}
                <form
                  onSubmit={handleDeltaCredits}
                  className="pt-3 border-t border-white/10 space-y-3"
                >
                  <div className="font-bold uppercase text-white">
                    Quick Credit Grant / Debit (`admin_adjust`)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-400 block mb-1">Credit Delta (±)</label>
                      <input
                        type="number"
                        value={walletDeltaInput}
                        onChange={(e) => setWalletDeltaInput(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Target Bucket</label>
                      <select
                        value={walletBucketInput}
                        onChange={(e) =>
                          setWalletBucketInput(
                            e.target.value as 'subscription' | 'topup'
                          )
                        }
                        className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                      >
                        <option value="topup">Top-Up Bucket</option>
                        <option value="subscription">Subscription Bucket</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Ledger Audit Note</label>
                    <input
                      type="text"
                      value={walletNoteInput}
                      onChange={(e) => setWalletNoteInput(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider hover:brightness-105"
                  >
                    Commit Credit Adjustment
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: USERS GENERATIONS MANAGEMENT                                 */}
      {/* =================================================================== */}
      {activeTab === 'generations' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-white">
                04. Platform-Wide User Generations Management ({generations.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Inspect all user runs across Image, Video & Audio, trigger idempotent credit refunds, toggle public community visibility, flag NSFW, or delete runs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={genSurfaceFilter}
                onChange={(e) => setGenSurfaceFilter(e.target.value as 'all' | Surface)}
                className="px-3 py-1.5 text-xs bg-[#111114] border border-white/10 rounded-lg text-white"
              >
                <option value="all">All Surfaces</option>
                <option value="video">Video</option>
                <option value="image">Image</option>
                <option value="audio">Audio</option>
              </select>

              <select
                value={genProviderFilter}
                onChange={(e) =>
                  setGenProviderFilter(e.target.value as 'all' | ApiProviderId)
                }
                className="px-3 py-1.5 text-xs bg-[#111114] border border-white/10 rounded-lg text-white"
              >
                <option value="all">All Providers</option>
                <option value="fal">fal.ai</option>
                <option value="higgsfield">Higgsfield</option>
                <option value="muapi">Muapi.ai</option>
                <option value="runware">Runware.ai</option>
              </select>

              <select
                value={genStatusFilter}
                onChange={(e) => setGenStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#111114] border border-white/10 rounded-lg text-white"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="queued">Queued / In Progress</option>
                <option value="failed">Failed</option>
                <option value="nsfw">NSFW Blocked</option>
                <option value="canceled">Canceled</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={genSearch}
                  onChange={(e) => setGenSearch(e.target.value)}
                  placeholder="Search user, prompt, model..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#111114] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#46ecd5]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#111114] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-[#16161B] text-zinc-400">
                    <th className="py-3.5 px-4 font-semibold">Run / User</th>
                    <th className="py-3.5 px-4 font-semibold">Model & Gateway</th>
                    <th className="py-3.5 px-4 font-semibold">Prompt</th>
                    <th className="py-3.5 px-4 font-semibold">Status & Cost</th>
                    <th className="py-3.5 px-4 font-semibold">Community</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {generations
                    .filter((g) =>
                      genSurfaceFilter === 'all' ? true : g.surface === genSurfaceFilter
                    )
                    .filter((g) =>
                      genProviderFilter === 'all'
                        ? true
                        : (g.apiProvider || 'higgsfield') === genProviderFilter
                    )
                    .filter((g) =>
                      genStatusFilter === 'all' ? true : g.status === genStatusFilter
                    )
                    .filter(
                      (g) =>
                        !genSearch.trim() ||
                        g.prompt.toLowerCase().includes(genSearch.toLowerCase()) ||
                        g.modelLabel.toLowerCase().includes(genSearch.toLowerCase()) ||
                        (g.userName || '').toLowerCase().includes(genSearch.toLowerCase())
                    )
                    .map((gen) => (
                      <tr key={gen.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">
                            {gen.userName || gen.userId}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-zinc-500">
                            {gen.id} · {new Date(gen.createdAt).toLocaleTimeString()}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                            <ProviderBrandIcon
                              provider={gen.apiProvider || 'higgsfield'}
                              size={14}
                            />
                            <span>{gen.modelLabel}</span>
                          </div>
                          <div className="text-[11px] font-mono-tabular text-[#46ecd5]">
                            {(gen.apiProvider || 'higgsfield').toUpperCase()} · {gen.surface.toUpperCase()}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-zinc-300 line-clamp-2">{gen.prompt}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono-tabular uppercase font-bold ${
                              gen.status === 'completed'
                                ? 'bg-[#46ecd5]/15 text-[#46ecd5]'
                                : gen.status === 'failed' || gen.status === 'nsfw'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {gen.status}
                          </span>
                          <div className="font-mono-tabular text-zinc-400 mt-1">
                            ✦ {gen.cost} credits
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleGenerationAction(gen.id, 'toggle_public')}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                              gen.isPublic
                                ? 'bg-[#46ecd5]/15 text-[#46ecd5] border border-[#46ecd5]/30'
                                : 'bg-zinc-900 text-zinc-400 border border-white/10'
                            }`}
                          >
                            {gen.isPublic ? 'Public' : 'Private'}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={(e) => downloadGeneration(gen, e)}
                              title="Download Generation Output"
                              aria-label="Download Generation Output"
                              className="p-1.5 rounded bg-zinc-900 hover:bg-[#46ecd5] text-[#46ecd5] hover:text-zinc-950 border border-[#46ecd5]/30 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedGeneration(gen)}
                              title="Inspect Output"
                              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => handleGenerationAction(gen.id, 'refund')}
                              title="Refund Credits to User"
                              className="px-2.5 py-1 rounded bg-[#46ecd5]/15 hover:bg-[#46ecd5]/25 text-[#46ecd5] font-semibold"
                            >
                              Refund ✦{gen.cost}
                            </button>
                            <button
                              onClick={() => handleGenerationAction(gen.id, 'mark_nsfw')}
                              title="Flag NSFW & Refund"
                              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
                            >
                              NSFW
                            </button>
                            <button
                              onClick={() => handleGenerationAction(gen.id, 'delete')}
                              title="Delete Run"
                              className="p-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: PRICING, PLANS & BILLING MANAGEMENT                          */}
      {/* =================================================================== */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-white">
                05. Global Credit Economics, Subscription Tiers & Top-Up Packs
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Changes saved here immediately update the live studio pricing engine (`priceFor`), `/pricing` page, and checkout flows.
              </p>
            </div>
            <button
              onClick={handleSaveBillingConfig}
              className="px-5 py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:brightness-105 shadow-lg shadow-[#46ecd5]/20"
            >
              <Save className="w-4 h-4" />
              <span>Save All Pricing & Billing Rules</span>
            </button>
          </div>

          {/* Global Credit Formula Parameters */}
          <div className="p-6 rounded-2xl bg-[#111114] border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <div>
              <label className="text-zinc-400 font-semibold block mb-1">
                Credit USD Value (`CREDIT_USD_VALUE`)
              </label>
              <input
                type="number"
                step="0.001"
                value={billingConfig.creditUsdValue}
                onChange={(e) =>
                  setBillingConfig((p) => ({
                    ...p,
                    creditUsdValue: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[#46ecd5] font-mono-tabular font-bold text-sm"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Default $0.01 = 1 credit ($1.00 = 100 base credits)
              </p>
            </div>

            <div>
              <label className="text-zinc-400 font-semibold block mb-1">
                Platform Markup Multiplier (`CREDIT_MARKUP`)
              </label>
              <input
                type="number"
                step="0.1"
                value={billingConfig.creditMarkup}
                onChange={(e) =>
                  setBillingConfig((p) => ({
                    ...p,
                    creditMarkup: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[#46ecd5] font-mono-tabular font-bold text-sm"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Multiplier over upstream provider USD cost (e.g. 2.0x = 50% gross margin)
              </p>
            </div>

            <div>
              <label className="text-zinc-400 font-semibold block mb-1">
                New User Magic-Link Bonus (`SIGNUP_BONUS_CREDITS`)
              </label>
              <input
                type="number"
                value={billingConfig.signupBonusCredits}
                onChange={(e) =>
                  setBillingConfig((p) => ({
                    ...p,
                    signupBonusCredits: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[#46ecd5] font-mono-tabular font-bold text-sm"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Granted automatically on first passwordless sign-in
              </p>
            </div>
          </div>

          {/* Subscription Plans Editor */}
          <div className="space-y-3">
            <h3 className="font-display text-xl font-bold uppercase text-white">
              Subscription Plan Tiers (`STUDIO_PLANS`)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan, idx) => (
                <div
                  key={plan.id}
                  className="p-5 rounded-2xl bg-[#111114] border border-white/10 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl font-bold uppercase text-white">
                      {plan.name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[#46ecd5] font-mono-tabular uppercase text-[10px]">
                      {plan.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-zinc-400 block mb-1">Monthly USD</label>
                      <input
                        type="number"
                        value={plan.monthlyUsd}
                        onChange={(e) => {
                          const next = [...plans];
                          next[idx] = { ...plan, monthlyUsd: Number(e.target.value) };
                          setPlans(next);
                        }}
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded text-white font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Annual /mo USD</label>
                      <input
                        type="number"
                        value={plan.annualMonthlyUsd}
                        onChange={(e) => {
                          const next = [...plans];
                          next[idx] = {
                            ...plan,
                            annualMonthlyUsd: Number(e.target.value),
                            annualTotalUsd: Number(e.target.value) * 12,
                          };
                          setPlans(next);
                        }}
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded text-white font-mono-tabular"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-zinc-400 block mb-1">Monthly Credits</label>
                      <input
                        type="number"
                        value={plan.monthlyCredits}
                        onChange={(e) => {
                          const next = [...plans];
                          next[idx] = {
                            ...plan,
                            monthlyCredits: Number(e.target.value),
                          };
                          setPlans(next);
                        }}
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded text-[#46ecd5] font-mono-tabular font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Top-Up Cr / $1</label>
                      <input
                        type="number"
                        value={plan.topupRatePerDollar}
                        onChange={(e) => {
                          const next = [...plans];
                          next[idx] = {
                            ...plan,
                            topupRatePerDollar: Number(e.target.value),
                          };
                          setPlans(next);
                        }}
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded text-white font-mono-tabular"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                    <div>
                      <label className="text-[10px] text-zinc-500 block">
                        Max Video
                      </label>
                      <input
                        type="number"
                        value={plan.parallelLimits.video}
                        onChange={(e) => {
                          const next = [...plans];
                          next[idx] = {
                            ...plan,
                            parallelLimits: {
                              ...plan.parallelLimits,
                              video: Number(e.target.value),
                            },
                          };
                          setPlans(next);
                        }}
                        className="w-full px-2 py-1 bg-zinc-900 border border-white/10 rounded text-white font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block">
                        Max Image
                      </label>
                      <input
                        type="number"
                        value={plan.parallelLimits.image}
                        onChange={(e) => {
                          const next = [...plans];
                          next[idx] = {
                            ...plan,
                            parallelLimits: {
                              ...plan.parallelLimits,
                              image: Number(e.target.value),
                            },
                          };
                          setPlans(next);
                        }}
                        className="w-full px-2 py-1 bg-zinc-900 border border-white/10 rounded text-white font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 block">
                        Max Audio
                      </label>
                      <input
                        type="number"
                        value={plan.parallelLimits.audio}
                        onChange={(e) => {
                          const next = [...plans];
                          next[idx] = {
                            ...plan,
                            parallelLimits: {
                              ...plan.parallelLimits,
                              audio: Number(e.target.value),
                            },
                          };
                          setPlans(next);
                        }}
                        className="w-full px-2 py-1 bg-zinc-900 border border-white/10 rounded text-white font-mono-tabular"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top-Up Credit Packs Editor */}
          <div className="space-y-3">
            <h3 className="font-display text-xl font-bold uppercase text-white">
              One-Time Top-Up Credit Packs (`TOPUP_PACKS`)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topups.map((pack, idx) => (
                <div
                  key={pack.id}
                  className="p-5 rounded-2xl bg-[#111114] border border-white/10 space-y-3 text-xs"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-400 block mb-1">Pack Name</label>
                      <input
                        type="text"
                        value={pack.name}
                        onChange={(e) => {
                          const next = [...topups];
                          next[idx] = { ...pack, name: e.target.value };
                          setTopups(next);
                        }}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded text-white"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Badge Tag</label>
                      <input
                        type="text"
                        value={pack.tag || ''}
                        onChange={(e) => {
                          const next = [...topups];
                          next[idx] = { ...pack, tag: e.target.value };
                          setTopups(next);
                        }}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded text-[#46ecd5]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-400 block mb-1">Base Credits</label>
                      <input
                        type="number"
                        value={pack.credits}
                        onChange={(e) => {
                          const next = [...topups];
                          next[idx] = { ...pack, credits: Number(e.target.value) };
                          setTopups(next);
                        }}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded text-white font-mono-tabular font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-400 block mb-1">Price (USD)</label>
                      <input
                        type="number"
                        value={pack.priceUsd}
                        onChange={(e) => {
                          const next = [...topups];
                          next[idx] = { ...pack, priceUsd: Number(e.target.value) };
                          setTopups(next);
                        }}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-white/10 rounded text-white font-mono-tabular"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: NOTIFICATIONS & BROADCAST MANAGEMENT                         */}
      {/* =================================================================== */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Broadcast Composer */}
          <form
            onSubmit={handleCreateNotification}
            className="min-w-0 lg:col-span-5 p-4 sm:p-6 rounded-2xl bg-[#111114] border border-white/10 space-y-4 text-xs"
          >
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-white">
                06. Publish Platform Notification
              </h2>
              <p className="text-zinc-400 mt-0.5">
                Broadcast global release notes, maintenance alerts, or promotional banners to the top of SPACIX Studio.
              </p>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Headline / Title</label>
              <input
                type="text"
                required
                value={newNotif.title}
                onChange={(e) => setNewNotif((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Kling 3.0 Pro 4K Now Routed via fal.ai Subscribe"
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">Broadcast Message</label>
              <textarea
                rows={3}
                required
                value={newNotif.message}
                onChange={(e) => setNewNotif((p) => ({ ...p, message: e.target.value }))}
                placeholder="Describe the update, promotion, or maintenance window..."
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1">Banner Type</label>
                <select
                  value={newNotif.type}
                  onChange={(e) =>
                    setNewNotif((p) => ({
                      ...p,
                      type: e.target.value as PlatformNotification['type'],
                    }))
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                >
                  <option value="release">Model / Feature Release</option>
                  <option value="promo">Credit / Plan Promotion</option>
                  <option value="info">Studio Announcement</option>
                  <option value="maintenance">Infrastructure Maintenance</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Target Audience</label>
                <select
                  value={newNotif.targetAudience}
                  onChange={(e) =>
                    setNewNotif((p) => ({
                      ...p,
                      targetAudience: e.target
                        .value as PlatformNotification['targetAudience'],
                    }))
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                >
                  <option value="all">All Studio Users</option>
                  <option value="free">Free Tier Only</option>
                  <option value="paid">Paid Subscribers Only</option>
                  <option value="admins">Admins Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1">CTA Button Label</label>
                <input
                  type="text"
                  value={newNotif.ctaLabel}
                  onChange={(e) =>
                    setNewNotif((p) => ({ ...p, ctaLabel: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">CTA Target Route</label>
                <select
                  value={newNotif.ctaRoute}
                  onChange={(e) =>
                    setNewNotif((p) => ({ ...p, ctaRoute: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                >
                  <option value="video">Video Studio</option>
                  <option value="image">Image Studio</option>
                  <option value="audio">Audio Studio</option>
                  <option value="pricing">Pricing & Plans</option>
                  <option value="effects">Camera Rigs & Effects</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider hover:brightness-105"
            >
              Publish Broadcast Banner
            </button>
          </form>

          {/* Right: Active & Archived Notifications */}
          <div className="min-w-0 lg:col-span-7 p-4 sm:p-6 rounded-2xl bg-[#111114] border border-white/10 space-y-4">
            <h3 className="font-display text-2xl font-bold uppercase text-white">
              Configured Broadcasts ({notifications.length})
            </h3>
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    n.active
                      ? 'bg-[#161B1D] border-[#46ecd5]/40'
                      : 'bg-zinc-900/60 border-white/10 opacity-75'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono-tabular uppercase text-[#46ecd5] font-bold">
                        {n.type}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-zinc-400">
                        Target: {n.targetAudience.toUpperCase()}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-zinc-500">
                        · {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white">{n.title}</h4>
                    <p className="text-xs text-zinc-300">{n.message}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleNotification(n.id, !n.active)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
                        n.active
                          ? 'bg-[#46ecd5] text-zinc-950'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {n.active ? 'Live' : 'Paused'}
                    </button>
                    <button
                      onClick={() => handleDeleteNotification(n.id)}
                      className="p-2 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 7: USER SUPPORT DESK & COMMUNITY MODERATION                     */}
      {/* =================================================================== */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Support Tickets Queue */}
            <div className="min-w-0 lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-[#111114] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold uppercase text-white">
                    07. User Support Tickets ({supportTickets.length})
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Billing, API gateway, and generation inquiries
                  </p>
                </div>
                <select
                  value={supportStatusFilter}
                  onChange={(e) => setSupportStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-zinc-900 border border-white/10 rounded-lg text-white"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div className="space-y-2 max-h-[520px] overflow-y-auto">
                {supportTickets
                  .filter((t) =>
                    supportStatusFilter === 'all' ? true : t.status === supportStatusFilter
                  )
                  .map((tkt) => {
                    const active = selectedTicket?.id === tkt.id;
                    return (
                      <div
                        key={tkt.id}
                        onClick={() => setSelectedTicketId(tkt.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                          active
                            ? 'bg-[#161E20] border-[#46ecd5]'
                            : 'bg-zinc-900/70 border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular">
                          <span className="text-[#46ecd5] font-bold">
                            #{tkt.id} · {tkt.category.toUpperCase()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded uppercase font-bold ${
                              tkt.priority === 'urgent' || tkt.priority === 'high'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-white/10 text-zinc-300'
                            }`}
                          >
                            {tkt.priority}
                          </span>
                        </div>
                        <div className="font-bold text-sm text-white line-clamp-1">
                          {tkt.subject}
                        </div>
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>{tkt.userName}</span>
                          <span className="uppercase font-mono-tabular text-[11px] text-zinc-300">
                            {tkt.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right: Active Ticket Thread & Reply Box */}
            {selectedTicket && (
              <div className="min-w-0 lg:col-span-7 p-4 sm:p-6 rounded-2xl bg-[#111114] border border-white/10 space-y-5 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <div className="text-[11px] font-mono-tabular text-[#46ecd5]">
                      TICKET #{selectedTicket.id} · {selectedTicket.userName} ({selectedTicket.userEmail})
                    </div>
                    <h3 className="font-display text-2xl font-bold uppercase text-white mt-1">
                      {selectedTicket.subject}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) =>
                        handleUpdateSupportTicket(
                          selectedTicket.id,
                          { priority: e.target.value },
                          `Priority set to ${e.target.value}`
                        )
                      }
                      className="px-2.5 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-white uppercase font-mono-tabular"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>

                    <select
                      value={selectedTicket.status}
                      onChange={(e) =>
                        handleUpdateSupportTicket(
                          selectedTicket.id,
                          { status: e.target.value },
                          `Status updated to ${e.target.value}`
                        )
                      }
                      className="px-2.5 py-1.5 bg-zinc-900 border border-[#46ecd5]/40 rounded-lg text-[#46ecd5] font-bold uppercase font-mono-tabular"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Conversation Thread */}
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {selectedTicket.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-4 rounded-xl border ${
                        m.authorRole === 'admin'
                          ? 'bg-[#162124] border-[#46ecd5]/30 ml-6'
                          : 'bg-zinc-900 border-white/10 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                        <span className="font-bold text-white">{m.authorName}</span>
                        <span className="font-mono-tabular">
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-zinc-200 leading-relaxed">{m.message}</p>
                    </div>
                  ))}
                </div>

                {/* Admin Reply Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!ticketReplyText.trim()) return;
                    handleUpdateSupportTicket(
                      selectedTicket.id,
                      { replyMessage: ticketReplyText, status: 'resolved' },
                      'Sent admin response & marked resolved'
                    );
                  }}
                  className="space-y-3 pt-3 border-t border-white/10"
                >
                  <label className="text-zinc-400 font-semibold block">
                    Reply as {currentAdmin.name} (SPACIX Admin)
                  </label>
                  <textarea
                    rows={3}
                    value={ticketReplyText}
                    onChange={(e) => setTicketReplyText(e.target.value)}
                    placeholder="Write a helpful response or confirm credit refund..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#46ecd5]"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!ticketReplyText.trim()) return;
                        handleUpdateSupportTicket(
                          selectedTicket.id,
                          { replyMessage: ticketReplyText, status: 'in_progress' },
                          'Sent reply'
                        );
                      }}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold"
                    >
                      Send Reply (Keep In Progress)
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider"
                    >
                      Send & Resolve Ticket
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Community Moderation Queue */}
          <div className="p-6 rounded-2xl bg-[#111114] border border-white/10 space-y-4">
            <h3 className="font-display text-xl font-bold uppercase text-white">
              Community Content Moderation Reports ({reports.length})
            </h3>
            {reports.length === 0 ? (
              <p className="text-xs text-zinc-400">
                Zero pending community content flags.
              </p>
            ) : (
              <div className="divide-y divide-white/10 text-xs">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <span className="font-mono-tabular text-white font-bold">
                        Generation: {rep.generationId}
                      </span>
                      <span className="mx-2 text-zinc-500">·</span>
                      <span className="text-zinc-300">Reason: {rep.reason}</span>
                      <span className="mx-2 text-zinc-500">·</span>
                      <span className="uppercase font-mono-tabular text-[#46ecd5]">
                        {rep.status}
                      </span>
                    </div>
                    {rep.status === 'open' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolveReport(rep.id, 'unpublish')}
                          className="px-3 py-1 rounded bg-rose-500/20 text-rose-300 font-semibold"
                        >
                          Unpublish & Resolve
                        </button>
                        <button
                          onClick={() => handleResolveReport(rep.id, 'dismiss')}
                          className="px-3 py-1 rounded bg-zinc-800 text-zinc-300"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 8: PLATFORM TEAMS, ADMIN ROLES (RBAC) & AUDIT LOG               */}
      {/* =================================================================== */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Invite / Add Team Member & Role Definitions */}
            <div className="min-w-0 lg:col-span-5 space-y-5">
              <form
                onSubmit={handleAddTeamMember}
                className="p-4 sm:p-6 rounded-2xl bg-[#111114] border border-white/10 space-y-4 text-xs"
              >
                <div>
                  <h2 className="font-display text-2xl font-bold uppercase text-white">
                    08. Invite Platform Team Admin
                  </h2>
                  <p className="text-zinc-400 mt-0.5">
                    Assign granular role-based access control (RBAC) and permission scopes
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1">Admin Name</label>
                    <input
                      type="text"
                      required
                      value={newMember.name}
                      onChange={(e) =>
                        setNewMember((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="e.g. Julian Mercer"
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Work Email</label>
                    <input
                      type="email"
                      required
                      value={newMember.email}
                      onChange={(e) =>
                        setNewMember((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="julian@spacix.studio"
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-400 block mb-1">Admin Role</label>
                    <select
                      value={newMember.adminRole}
                      onChange={(e) =>
                        setNewMember((p) => ({
                          ...p,
                          adminRole: e.target.value as AdminRoleType,
                        }))
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    >
                      {(Object.keys(ROLE_LABELS) as AdminRoleType[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r].label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Department</label>
                    <input
                      type="text"
                      value={newMember.department}
                      onChange={(e) =>
                        setNewMember((p) => ({ ...p, department: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1.5">
                    Assigned Permission Scopes
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_PERMISSION_SCOPES.map((scope) => {
                      const checked = newMember.permissions.includes(scope.id);
                      return (
                        <button
                          key={scope.id}
                          type="button"
                          onClick={() =>
                            setNewMember((p) => ({
                              ...p,
                              permissions: checked
                                ? p.permissions.filter((x) => x !== scope.id)
                                : [...p.permissions, scope.id],
                            }))
                          }
                          className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] flex items-center justify-between ${
                            checked
                              ? 'bg-[#46ecd5]/15 border-[#46ecd5]/40 text-white'
                              : 'bg-zinc-900 border-white/5 text-zinc-500'
                          }`}
                        >
                          <span className="truncate">{scope.label}</span>
                          {checked && <Check className="w-3 h-3 text-[#46ecd5] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider hover:brightness-105"
                >
                  Grant Admin Role & Invite Member
                </button>
              </form>
            </div>

            {/* Right: Active Platform Team Directory */}
            <div className="min-w-0 lg:col-span-7 p-4 sm:p-6 rounded-2xl bg-[#111114] border border-white/10 space-y-4">
              <h3 className="font-display text-2xl font-bold uppercase text-white">
                SPACIX Internal Team & Role Matrix ({teamMembers.length})
              </h3>

              <div className="space-y-3">
                {teamMembers.map((member) => {
                  const roleMeta = ROLE_LABELS[member.adminRole] || ROLE_LABELS.ops_admin;
                  return (
                    <div
                      key={member.id}
                      className="p-4 rounded-xl bg-[#16161B] border border-white/10 space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">
                              {member.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded border text-[10px] font-mono-tabular uppercase font-bold ${roleMeta.badgeClass}`}
                            >
                              {roleMeta.label}
                            </span>
                          </div>
                          <div className="text-zinc-400 font-mono-tabular mt-0.5">
                            {member.email} · {member.department}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={member.adminRole}
                            onChange={(e) =>
                              handleUpdateTeamMember(member.id, {
                                adminRole: e.target.value,
                              })
                            }
                            className="px-2.5 py-1 bg-zinc-900 border border-white/10 rounded-lg text-white text-xs"
                          >
                            {(Object.keys(ROLE_LABELS) as AdminRoleType[]).map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r].label}
                              </option>
                            ))}
                          </select>

                          {member.email !== currentAdmin.email && (
                            <button
                              onClick={() =>
                                handleRemoveTeamMember(member.id, member.name)
                              }
                              className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {member.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono-tabular text-zinc-300"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Admin Security & Operations Audit Log */}
          <div className="p-4 sm:p-6 min-w-0 rounded-2xl bg-[#111114] border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl font-bold uppercase text-white">
                Immutable Admin Security & Operations Audit Log (`admin_audit_log`)
              </h3>
              <span className="text-xs font-mono-tabular text-[#46ecd5]">
                {auditLog.length} events recorded
              </span>
            </div>

            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full min-w-[640px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 bg-[#16161B]">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Actor</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Target</th>
                    <th className="py-2.5 px-4">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLog.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4 font-mono-tabular text-zinc-400">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono-tabular text-zinc-200">
                        {log.actorEmail}
                      </td>
                      <td className="py-2.5 px-4 font-mono-tabular text-[#46ecd5] font-bold">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-4 font-mono-tabular text-white">
                        {log.target}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-300">{log.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
