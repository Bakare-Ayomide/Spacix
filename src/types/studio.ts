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

export type ModelGenerationCapability =
  | 'text_to_image'
  | 'image_edit'
  | 'character_reference'
  | 'text_to_video'
  | 'image_to_video'
  | 'reference_to_video'
  | 'first_last_frame'
  | 'motion_transfer'
  | 'native_lip_sync'
  | 'dedicated_lip_sync'
  | 'audio_music'
  | 'audio_tts';

export type LipSyncSupportType = 'native_audio' | 'dedicated_lip_sync_step' | 'none';

export interface ModelCapabilities {
  generationCategories: ModelGenerationCapability[];
  lipSyncType: LipSyncSupportType;
  requiresBaseVideoForLipSync?: boolean;
  acceptsAudioInput?: boolean;
  maxAudioDurationSec?: number;
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
  capabilities?: ModelCapabilities;
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
  isFavorite?: boolean;
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

// ============================================================================
// SPACI6X COMPLETE CHARACTER & PRODUCTION-CONTINUITY SYSTEM TYPES
// ============================================================================

export type StudioId =
  | 'cinema'
  | 'character'
  | 'motion'
  | 'wardrobe'
  | 'props'
  | 'location'
  | 'storyboard'
  | 'marketing'
  | 'lipsync'
  | 'effects'
  | 'canvas'
  | 'editing';

export type SupportedCharacterLanguage =
  | 'English'
  | 'Nigerian Pidgin'
  | 'Yoruba'
  | 'Igbo'
  | 'Hausa'
  | 'French'
  | 'Swahili'
  | 'Spanish'
  | 'Arabic'
  | 'Mandarin';

export type CharacterExpression =
  | 'Neutral'
  | 'Smiling'
  | 'Crying'
  | 'Anger'
  | 'Fear'
  | 'Surprise'
  | 'Determined'
  | 'Laughing';

export interface CharacterProfile {
  id: string;
  identityId: string; // Permanent Identity ID, e.g. CHR-ID-8492A
  userId: string;
  name: string;
  roleTitle: string;
  // Face
  faceReferenceUrl: string;
  facialIdentityLock: boolean;
  identitySeed: number;
  facePromptDescriptor: string;
  // Appearance
  ageRange: string;
  genderPresentation: string;
  skinTone: string;
  bodyType: string;
  height: string;
  hairstyle: string;
  eyeColor: string;
  distinctiveFeatures: string;
  ethnicity?: string;
  facialStructure?: string;
  personalityMood?: string;
  dialect?: string;
  // Voice
  voiceId: string;
  voiceName: string;
  voiceMode: 'generated' | 'cloned' | 'selected';
  voiceCloneConsent: boolean;
  voiceSampleUrl: string;
  voiceIdentityLock: boolean;
  // Language
  primaryLanguage: SupportedCharacterLanguage;
  supportedLanguages: SupportedCharacterLanguage[];
  // Speech
  speechAccent: string;
  pitch: 'Low' | 'Medium-Low' | 'Medium' | 'Medium-High' | 'High';
  tone: string;
  defaultEmotion: string;
  speakingSpeed: number;
  deliveryStyle: string;
  // Expressions
  activeExpression: CharacterExpression;
  expressionSheetUrls: Record<string, string>;
  // Clothing & Props Continuity Links
  defaultWardrobeId: string | null;
  assignedWardrobeIds: string[];
  assignedPropIds: string[];
  // Consistency
  consistencyLock: boolean;
  continuityNotes: string;
  createdAt: string;
  updatedAt: string;
}

export type WardrobeCategory =
  | 'Formal'
  | 'Casual'
  | 'Traditional'
  | 'Corporate'
  | 'Futuristic'
  | 'Costume'
  | 'Streetwear'
  | 'Tactical';

export interface WardrobeItem {
  id: string;
  wardrobeCode: string; // e.g. WRD-ID-104A
  userId: string;
  name: string;
  category: WardrobeCategory;
  description: string;
  garments: string;
  shoes: string;
  accessories: string;
  jewellery: string;
  hairstyleOverride: string;
  colorPalette: string;
  referenceImageUrl: string;
  assignedCharacterIds: string[];
  sceneContinuityLock: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PropCategory =
  | 'Cars & Vehicles'
  | 'Phones & Tech'
  | 'Furniture'
  | 'Weapons & Action'
  | 'Bags & Luggage'
  | 'Tools & Equipment'
  | 'Household Objects'
  | 'Hero Artifacts';

export interface PropItem {
  id: string;
  propCode: string; // e.g. PRP-ID-309B
  userId: string;
  name: string;
  category: PropCategory;
  description: string;
  materialAndFinish: string;
  scaleAndDimensions: string;
  referenceImageUrl: string;
  assignedCharacterIds: string[];
  assignedSceneIds: string[];
  appearanceLock: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LocationCategory =
  | 'Houses'
  | 'Offices'
  | 'Streets'
  | 'Villages'
  | 'Cities'
  | 'Landscapes'
  | 'Studios & Sets'
  | 'Sci-Fi & Fantasy';

export interface LocationCameraAngleRef {
  id: string;
  angleLabel: string;
  lens: string;
  imageUrl: string;
  promptNotes: string;
}

export interface LocationItem {
  id: string;
  locationCode: string; // e.g. LOC-ID-712C
  userId: string;
  name: string;
  category: LocationCategory;
  settingType: 'INT.' | 'EXT.' | 'INT./EXT.';
  timeOfDay: 'Day' | 'Night' | 'Sunset' | 'Golden Hour' | 'Dawn' | 'Blue Hour';
  weather: 'Clear' | 'Rain' | 'Fog' | 'Harmattan Dust' | 'Overcast' | 'Storm' | 'Snow';
  description: string;
  lightingAndMood: string;
  primaryImageUrl: string;
  cameraAngleReferences: LocationCameraAngleRef[];
  continuityLock: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MotionCategory =
  | 'Walking'
  | 'Running'
  | 'Dancing'
  | 'Fighting'
  | 'Dialogue Gesture'
  | 'Stunt & Action'
  | 'Camera Choreography'
  | 'Reference Video Transfer';

export interface MotionKeyframe {
  timeSec: number;
  x: number; // 0-100
  y: number; // 0-100
  poseNote: string;
  expression: CharacterExpression;
}

export interface MotionTemplateItem {
  id: string;
  motionCode: string; // e.g. MOT-ID-501D
  userId: string;
  name: string;
  movementCategory: MotionCategory;
  referenceVideoUrl: string;
  sourceImageUrl: string;
  targetCharacterId: string | null;
  preserveAppearanceLock: boolean;
  bodyPoseTransfer: boolean;
  facialExpressionTransfer: boolean;
  handGestureControl: boolean;
  cameraMovement: string;
  keyframes: MotionKeyframe[];
  motionPrompt: string;
  outputGenerationId?: string;
  outputVideoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type CinemaProductionType =
  | 'Movies'
  | 'Music Videos'
  | 'UGC'
  | 'Interviews'
  | 'Documentaries'
  | 'Explainer Videos'
  | 'Montages'
  | 'Commercials'
  | 'Trailers'
  | 'Short Films';

export type ShotSizeType =
  | 'Extreme Wide'
  | 'Wide'
  | 'Medium Wide'
  | 'Medium'
  | 'Medium Close-Up'
  | 'Close-Up'
  | 'Extreme Close-Up';

export type CameraAngleType =
  | 'Eye Level'
  | 'Low Angle'
  | 'High Angle'
  | 'Over-the-Shoulder'
  | 'POV'
  | 'Dutch Angle'
  | 'Aerial Drone';

export interface SceneDialogueLine {
  id: string;
  characterId: string | null;
  characterName: string;
  language: SupportedCharacterLanguage | string;
  emotion: string;
  parenthetical?: string;
  text: string;
  audioUrl?: string;
  generationId?: string;
}

export interface ProductionShot {
  id: string;
  shotNumber: string;
  shotSize: ShotSizeType;
  cameraAngle: CameraAngleType;
  cameraMovement: string;
  lens: string;
  durationSec: number;
  characterIds: string[];
  wardrobeId?: string | null;
  propIds: string[];
  locationId: string | null;
  motionTemplateId?: string | null;
  actionPrompt: string;
  dialogueSnippet?: string;
  voiceLanguage?: string;
  sfxNotes?: string;
  continuityVerified: boolean;
  storyboardImageUrl?: string;
  storyboardGenerationId?: string;
  shotVideoUrl?: string;
  shotVideoGenerationId?: string;
  lipSyncVideoUrl?: string;
  audioDialogueUrl?: string;
}

export interface ProductionScene {
  id: string;
  sceneNumber: number;
  slugline: string;
  locationId: string | null;
  timeOfDay: string;
  weather: string;
  summary: string;
  actionDescription: string;
  characterIds: string[];
  wardrobeAssignments: Record<string, string>; // characterId -> wardrobeId
  propIds: string[];
  dialogueLines: SceneDialogueLine[];
  shots: ProductionShot[];
}

export interface CanvasWorkflowNode {
  id: string;
  type:
    | 'character'
    | 'wardrobe'
    | 'location'
    | 'prop'
    | 'motion'
    | 'image_gen'
    | 'video_gen'
    | 'lipsync'
    | 'assembly';
  label: string;
  assetId?: string;
  modelId?: string;
  prompt?: string;
  x: number;
  y: number;
  connectedTo: string[];
  outputUrl?: string;
  status?: 'idle' | 'running' | 'completed';
}

export interface TimelineAssemblyTrackSet {
  videoClips: Array<{
    id: string;
    shotId?: string;
    label: string;
    url: string;
    durationSec: number;
    characterNames?: string;
    transition: 'Cut' | 'Cross Dissolve' | 'Dip to Black' | 'Whip Pan';
  }>;
  dialogueClips: Array<{
    id: string;
    characterName: string;
    language: string;
    text: string;
    url?: string;
    startSec: number;
    durationSec: number;
  }>;
  musicClips: Array<{
    id: string;
    label: string;
    url?: string;
    startSec: number;
    durationSec: number;
    volume: number;
  }>;
  sfxClips: Array<{
    id: string;
    label: string;
    url?: string;
    startSec: number;
    durationSec: number;
  }>;
}

export type MusicVideoSceneMode = 'lip_sync' | 'b_roll';

export type MusicVideoBRollType =
  | 'environmental'
  | 'performance_no_lipsync'
  | 'dance_choreography'
  | 'slow_motion'
  | 'establishing'
  | 'artistic_cutaway'
  | 'cinematic_closeup'
  | 'lifestyle_story'
  | 'creative_transition';

export interface MusicVideoAudioTrack {
  id: string;
  title: string;
  sourceType: 'upload' | 'url';
  originalUrl: string;
  playbackUrl: string;
  contentType: string;
  durationSec: number;
  bytes?: number;
  waveformPeaks?: number[];
  importedAt: string;
}

export interface MusicVideoTrimSegment {
  startSec: number;
  endSec: number;
  durationSec: number;
}

export interface MusicVideoSceneItem {
  id: string;
  order: number;
  title: string;
  mode: MusicVideoSceneMode;
  bRollType?: MusicVideoBRollType;
  characterId: string | null;
  wardrobeId: string | null;
  locationId: string | null;
  sceneDescription: string;
  environmentAtmosphere: string;
  cameraFraming: string;
  cameraMovement: string;
  lightingMood: string;
  visualStyle: string;
  performanceDirection: string;
  facialExpression: string;
  gesturesAndBody: string;
  sceneReferenceSource: 'generated' | 'uploaded';
  sceneReferenceUrl?: string;
  sceneReferenceGenId?: string;
  audioSegment: MusicVideoTrimSegment;
  pipelineStrategy: 'native_lip_sync' | 'animate_then_lipsync' | 'b_roll_video';
  imageModelId?: string;
  animationModelId: string;
  lipSyncModelId?: string;
  aspectRatio: string;
  modelSettings: Record<string, string | number | boolean>;
  generatedBaseVideoUrl?: string;
  generatedBaseVideoGenId?: string;
  finalVideoUrl?: string;
  finalVideoGenId?: string;
  status: 'draft' | 'generating_ref' | 'animating' | 'syncing_lips' | 'completed' | 'failed';
  error?: string;
  updatedAt: string;
}

export interface MusicVideoProductionState {
  audioTrack: MusicVideoAudioTrack | null;
  activeTrim: MusicVideoTrimSegment;
  defaultAspectRatio: string;
  scenes: MusicVideoSceneItem[];
  updatedAt: string;
}

export interface CinemaProductionProject {
  id: string;
  userId: string;
  title: string;
  productionType: CinemaProductionType;
  logline: string;
  aspectRatio: '16:9' | '21:9' | '9:16' | '1:1';
  screenplayRaw: string;
  castCharacterIds: string[];
  wardrobeIds: string[];
  propIds: string[];
  locationIds: string[];
  musicTrackUrl?: string;
  musicBpm?: number;
  // Continuity & Production Assets
  scenes: ProductionScene[];
  canvasNodes: CanvasWorkflowNode[];
  timelineTracks: TimelineAssemblyTrackSet;
  musicVideo?: MusicVideoProductionState;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveContinuityContext {
  projectId: string | null;
  characterIds: string[];
  wardrobeId: string | null;
  propIds: string[];
  locationId: string | null;
  motionTemplateId: string | null;
}

export interface VoiceProfile {
  id: string;
  voiceCode: string; // e.g. VOX-ID-402A
  userId: string;
  name: string;
  description: string;
  genderPresentation: string;
  vocalAge: string;
  voiceCharacteristics: string;
  language: SupportedCharacterLanguage | string;
  accent: string;
  dialect: string;
  mood: string;
  speakingStyle: string;
  effects: string;
  sampleAudioUrl: string;
  modelId: string;
  assignedCharacterIds: string[];
  sourceType: 'ai' | 'upload';
  createdAt: string;
  updatedAt: string;
}

export interface UniversalCreativeControlsState {
  cameraSetup: {
    cameraBody: string;
    lens: string;
    aperture: string;
  };
  cameraMovement: {
    movements: string[];
    intensity: number;
    speed: 'Slow' | 'Medium' | 'Fast';
    shotAngle: string;
  };
  lighting: {
    scheme: string;
    intensity: number;
    warmth: number;
  };
  colorGrading: {
    presetId: string;
    temperature: number;
    tint: number;
    saturation: number;
    contrast: number;
    highlights: number;
    shadows: number;
    grain: number;
    lutIntensity: number;
  };
  filmLook: {
    genre: string;
    era: string;
    tempo: string;
    aspectRatio: string;
  };
  audioDirection: {
    voiceTone: string;
    pacing: string;
    musicMood: string;
    acousticSpace: string;
  };
}

