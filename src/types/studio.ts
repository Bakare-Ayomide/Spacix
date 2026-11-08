export type Surface = 'image' | 'video' | 'audio';

export type MediaRole = 'start' | 'end' | 'reference' | 'video' | 'audio' | 'source';

export type MediaKind = 'image' | 'video' | 'audio';

export type ApiProviderId = 'higgsfield' | 'fal' | 'muapi' | 'runware';

export type ApiProviderCallingPattern = 'queue' | 'subscribe' | 'sync' | 'task_stream';

export interface ApiProviderEndpointSpec {
  providerId: ApiProviderId;
  label: string;
  endpoint: string;
  editEndpoint?: string;
  callingPattern: ApiProviderCallingPattern;
  baseUsd: number;
  latencyBadge: string;
  docsUrl?: string;
}

export interface ProviderApiKeyEntry {
  id: string;
  label: string;
  keyValue: string;
  secretMasked: string;
  isPrimary: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderGatewayConfig {
  id: ApiProviderId;
  label: string;
  enabled: boolean;
  baseUrl: string;
  secondaryUrl?: string;
  authScheme: string;
  secretMasked: string;
  hasSecret: boolean;
  apiKeys?: ProviderApiKeyEntry[];
  webhookSecretMasked: string;
  defaultCallingPattern: ApiProviderCallingPattern;
  priority: number;
  healthStatus: 'operational' | 'degraded' | 'disabled';
  updatedAt: string;
}

export interface MediaSlotInput {
  role: MediaRole;
  kind: MediaKind;
  url: string;
  label?: string;
}

export type SettingDefinition =
  | {
      type: 'enum';
      key: string;
      label: string;
      options: { value: string; label: string }[];
      defaultValue: string;
      headline?: boolean;
    }
  | {
      type: 'range';
      key: string;
      label: string;
      min: number;
      max: number;
      step: number;
      unit?: string;
      defaultValue: number;
    }
  | {
      type: 'boolean';
      key: string;
      label: string;
      description?: string;
      defaultValue: boolean;
    };

export interface ModelRoleSpec {
  role: MediaRole;
  kind: MediaKind;
  label: string;
  maxCount: number;
  required?: boolean;
}

export interface ModelEntry {
  id: string;
  surface: Surface;
  family: string;
  provider: string;
  defaultApiProvider?: ApiProviderId;
  supportedProviders?: ApiProviderEndpointSpec[];
  label: string;
  category: 'GENERAL' | 'CINEMATIC' | 'FAST' | 'MOTION' | 'SONIC';
  description: string;
  bestFor: string;
  badges: ('NEW' | 'TOP' | 'FAST' | '4K' | 'AUDIO')[];
  docsUrl: string;
  modes: string[];
  roles: ModelRoleSpec[];
  requirePrompt: boolean;
  supportsEnhancePrompt: boolean;
  settings: SettingDefinition[];
  baseHfUsd: number;
  billingUnit: 'per_image' | 'per_second' | 'per_generation';
  previewGradient: string;
  previewAccent: string;
  restPaths: {
    default: string;
    imageToMedia?: string;
    firstLast?: string;
    reference?: string;
    edit?: string;
    extend?: string;
  };
  toPlatform: (input: {
    prompt: string;
    settings: Record<string, string | number | boolean>;
    media: MediaSlotInput[];
    mode?: string;
    apiProvider?: ApiProviderId;
  }) => {
    path: string;
    body: Record<string, unknown>;
  };
}

export type GenerationStatus =
  | 'pending_submit'
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'nsfw'
  | 'canceled';

export interface GenerationOutput {
  kind: MediaKind;
  url: string;
  r2Key: string;
  width?: number;
  height?: number;
  durationSec?: number;
  waveform?: number[];
}

export interface GenerationRecord {
  id: string;
  userId: string;
  userName?: string;
  projectId?: string | null;
  surface: Surface;
  modelId: string;
  modelLabel: string;
  modelPath: string;
  apiProvider?: ApiProviderId;
  callingPattern?: ApiProviderCallingPattern;
  mode?: string;
  prompt: string;
  settings: Record<string, string | number | boolean>;
  media: MediaSlotInput[];
  status: GenerationStatus;
  hfRequestId?: string;
  cost: number;
  outputs: GenerationOutput[];
  error?: string;
  isPublic: boolean;
  publishedAt?: string;
  presetId?: string;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string;
}

export interface ProjectRecord {
  id: string;
  userId: string;
  name: string;
  coverGenerationId?: string;
  generationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadRecord {
  id: string;
  userId: string;
  kind: MediaKind;
  label: string;
  publicUrl: string;
  contentType: string;
  bytes: number;
  createdAt: string;
}

export type CreditBucket = 'subscription' | 'topup';

export type LedgerReason =
  | 'generation_debit'
  | 'generation_refund'
  | 'subscription_grant'
  | 'subscription_reset'
  | 'topup_purchase'
  | 'signup_bonus'
  | 'admin_adjust'
  | 'stripe_refund';

export interface CreditLedgerEntry {
  id: string;
  userId: string;
  delta: number;
  bucket: CreditBucket;
  reason: LedgerReason;
  refType: string;
  refId: string;
  note?: string;
  balanceAfter: {
    subscription: number;
    topup: number;
    total: number;
  };
  createdAt: string;
}

export type PlanTierId = 'free' | 'starter' | 'plus' | 'ultra';

export type AdminRoleType =
  | 'super_admin'
  | 'ops_admin'
  | 'billing_admin'
  | 'support_admin'
  | 'catalog_curator';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  adminSubRole?: AdminRoleType;
  status?: 'active' | 'suspended';
  plan: PlanTierId;
  billingCycle?: 'monthly' | 'annual';
  planRenewsAt?: string;
  stripeCustomerId?: string;
  credits: {
    subscription: number;
    topup: number;
    total: number;
  };
  lastLoginAt?: string;
  createdAt: string;
}

export interface PlatformSecretEntry {
  key: string;
  category: 'auth' | 'billing' | 'email' | 'storage' | 'webhook' | 'system';
  label: string;
  secretValue: string;
  secretMasked: string;
  hasValue: boolean;
  description: string;
  updatedAt: string;
}

export interface PresetEffect {
  id: string;
  slug: string;
  title: string;
  category: 'Camera Motion' | 'Visual VFX' | 'Cinematic Look' | 'Sonic Atmosphere';
  surface: Surface;
  modelId: string;
  promptTemplate: string;
  description: string;
  settings: Record<string, string | number | boolean>;
  previewSvgDataUrl: string;
  order: number;
  active: boolean;
}

export interface CommunityReport {
  id: string;
  generationId: string;
  reporterId: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface PlatformNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'promo' | 'maintenance' | 'release';
  targetAudience: 'all' | 'free' | 'paid' | 'admins';
  active: boolean;
  ctaLabel?: string;
  ctaRoute?: string;
  createdAt: string;
}

export interface SupportTicketReply {
  id: string;
  authorName: string;
  authorRole: 'user' | 'admin';
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  category: 'billing' | 'generation_failure' | 'api_provider' | 'account' | 'feature_request';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  messages: SupportTicketReply[];
  createdAt: string;
  updatedAt: string;
}

export interface PlatformTeamMember {
  id: string;
  name: string;
  email: string;
  adminRole: AdminRoleType;
  department: string;
  permissions: string[];
  status: 'active' | 'invited' | 'suspended';
  lastActiveAt: string;
  createdAt: string;
}

export interface AdminAuditEntry {
  id: string;
  actorEmail: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}
