import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActiveContinuityContext,
  ApiProviderId,
  CharacterProfile,
  CinemaProductionProject,
  GenerationRecord,
  LocationItem,
  MediaSlotInput,
  ModelEntry,
  MotionTemplateItem,
  PlanTierId,
  PlatformNotification,
  PresetEffect,
  ProjectRecord,
  PropItem,
  ProviderGatewayConfig,
  Surface,
  UploadRecord,
  UserProfile,
  WardrobeItem,
} from '../types/studio';
import { MODEL_CATALOG } from '../catalog/models';
import { INITIAL_PRESETS } from '../catalog/presets';
import { STUDIO_PLANS, StudioPlan, TOPUP_PACKS, TopupPack } from '../billing/plans';

export type RoutePath =
  | 'explore'
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
  | 'editing'
  | 'image'
  | 'video'
  | 'audio'
  | 'community'
  | 'assets'
  | 'pricing'
  | 'account'
  | 'admin'
  | 'legal'
  | 'auth';

export interface DockDraftState {
  surface: Surface;
  modelId: string;
  apiProvider?: ApiProviderId;
  mode: string;
  prompt: string;
  settings: Record<string, string | number | boolean>;
  media: MediaSlotInput[];
  presetSlug?: string;
}

interface StudioContextValue {
  route: RoutePath;
  routeParams: Record<string, string>;
  navigate: (route: RoutePath, params?: Record<string, string>) => void;
  user: UserProfile | null;
  sessionToken: string;
  models: ModelEntry[];
  providers: ProviderGatewayConfig[];
  presets: PresetEffect[];
  notifications: PlatformNotification[];
  plans: StudioPlan[];
  topups: TopupPack[];
  generations: GenerationRecord[];
  communityItems: GenerationRecord[];
  projects: ProjectRecord[];
  uploads: UploadRecord[];
  characters: CharacterProfile[];
  wardrobes: WardrobeItem[];
  propsList: PropItem[];
  locations: LocationItem[];
  motionTemplates: MotionTemplateItem[];
  cinemaProjects: CinemaProductionProject[];
  activeContinuity: ActiveContinuityContext;
  setActiveContinuity: React.Dispatch<React.SetStateAction<ActiveContinuityContext>>;
  saveCharacter: (data: Partial<CharacterProfile> & { name: string }) => Promise<CharacterProfile | null>;
  deleteCharacter: (id: string) => Promise<void>;
  saveWardrobe: (data: Partial<WardrobeItem> & { name: string }) => Promise<WardrobeItem | null>;
  deleteWardrobe: (id: string) => Promise<void>;
  saveProp: (data: Partial<PropItem> & { name: string }) => Promise<PropItem | null>;
  deleteProp: (id: string) => Promise<void>;
  saveLocation: (data: Partial<LocationItem> & { name: string }) => Promise<LocationItem | null>;
  deleteLocation: (id: string) => Promise<void>;
  saveMotionTemplate: (data: Partial<MotionTemplateItem> & { name: string }) => Promise<MotionTemplateItem | null>;
  deleteMotionTemplate: (id: string) => Promise<void>;
  saveCinemaProject: (data: Partial<CinemaProductionProject> & { title: string }) => Promise<CinemaProductionProject | null>;
  deleteCinemaProject: (id: string) => Promise<void>;
  composeContinuityPrompt: (
    basePrompt: string,
    overrides?: Partial<ActiveContinuityContext>,
    baseMedia?: MediaSlotInput[]
  ) => { prompt: string; media: MediaSlotInput[] };
  dockDraft: DockDraftState;
  setDockDraft: React.Dispatch<React.SetStateAction<DockDraftState>>;
  applyModelToDock: (
    modelId: string,
    surfaceOverride?: Surface,
    providerOverride?: ApiProviderId
  ) => void;
  applyPresetToDock: (preset: PresetEffect) => void;
  reuseGenerationInDock: (gen: GenerationRecord, animateAsVideo?: boolean) => void;
  submitGeneration: (overrideDraft?: Partial<DockDraftState>) => Promise<{
    ok: boolean;
    error?: string;
    generation?: GenerationRecord;
  }>;
  cancelGeneration: (id: string) => Promise<void>;
  togglePublishGeneration: (id: string, isPublic: boolean) => Promise<void>;
  moveGenerationToProject: (id: string, projectId: string | null) => Promise<void>;
  deleteGeneration: (id: string) => Promise<void>;
  createProject: (name: string) => Promise<ProjectRecord | null>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  uploadReferenceFile: (file: {
    label: string;
    contentType: string;
    bytes: number;
    dataUrl: string;
  }) => Promise<UploadRecord | null>;
  loginWithPassword: (params: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  registerAccount: (params: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    rememberMe: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{
    ok: boolean;
    error?: string;
    emailDelivered?: boolean;
    resetCode?: string;
  }>;
  confirmPasswordReset: (params: {
    email: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
    rememberMe?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (params: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (params: { name: string }) => Promise<{ ok: boolean; error?: string }>;
  requestMagicLink: (email: string) => Promise<{
    ok: boolean;
    error?: string;
    previewMagicToken?: string;
    email?: string;
  }>;
  verifyMagicLink: (token: string) => Promise<{ ok: boolean; error?: string }>;
  checkoutPlanOrTopup: (payload: {
    kind: 'subscription' | 'topup';
    planId?: PlanTierId;
    billingCycle?: 'monthly' | 'annual';
    topupId?: string;
  }) => Promise<{ ok: boolean; message?: string; error?: string }>;
  updateUserCredits: (
    subscriptionCredits: number,
    topupCredits: number,
    targetUserId?: string,
    note?: string
  ) => Promise<void>;
  downloadGeneration: (gen: GenerationRecord, e?: React.MouseEvent) => Promise<void>;
  refreshAll: () => Promise<void>;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  upgradeModalOpen: boolean;
  setUpgradeModalOpen: (open: boolean) => void;
  selectedGeneration: GenerationRecord | null;
  setSelectedGeneration: (gen: GenerationRecord | null) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

function getDefaultDraftForSurface(surface: Surface, catalog: ModelEntry[] = MODEL_CATALOG): DockDraftState {
  const defaultModelId =
    surface === 'video'
      ? 'seedance-2-5'
      : surface === 'audio'
      ? 'sonilo-music-v2'
      : 'soul-2-standard';
  const model =
    catalog.find((m) => m.id === defaultModelId) ||
    catalog.find((m) => m.surface === surface) ||
    MODEL_CATALOG[0];
  const settings: Record<string, string | number | boolean> = {};
  for (const s of model.settings) {
    settings[s.key] = s.defaultValue;
  }
  return {
    surface: model.surface,
    modelId: model.id,
    apiProvider: model.defaultApiProvider || 'runware',
    mode: model.modes[0] || 'Create',
    prompt: '',
    settings,
    media: [],
  };
}

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<RoutePath>('explore');
  const [routeParams, setRouteParams] = useState<Record<string, string>>({});
  const [sessionToken, setSessionToken] = useState<string>(() => {
    try {
      const saved =
        localStorage.getItem('spacix_session_token') ||
        sessionStorage.getItem('spacix_session_token') ||
        '';
      if (saved === 'default_session_token' || saved === 'creator_session_token' || saved === 'signed_out') {
        localStorage.removeItem('spacix_session_token');
        sessionStorage.removeItem('spacix_session_token');
        return '';
      }
      return saved;
    } catch {
      return '';
    }
  });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [models, setModels] = useState<ModelEntry[]>(MODEL_CATALOG);
  const [providers, setProviders] = useState<ProviderGatewayConfig[]>([]);
  const [presets, setPresets] = useState<PresetEffect[]>(INITIAL_PRESETS);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [plans, setPlans] = useState<StudioPlan[]>(STUDIO_PLANS);
  const [topups, setTopups] = useState<TopupPack[]>(TOPUP_PACKS);
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [communityItems, setCommunityItems] = useState<GenerationRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [wardrobes, setWardrobes] = useState<WardrobeItem[]>([]);
  const [propsList, setPropsList] = useState<PropItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [motionTemplates, setMotionTemplates] = useState<MotionTemplateItem[]>([]);
  const [cinemaProjects, setCinemaProjects] = useState<CinemaProductionProject[]>([]);
  const [activeContinuity, setActiveContinuity] = useState<ActiveContinuityContext>({
    projectId: null,
    characterIds: [],
    wardrobeId: null,
    propIds: [],
    locationId: null,
    motionTemplateId: null,
  });
  const [dockDraft, setDockDraft] = useState<DockDraftState>(() =>
    getDefaultDraftForSurface('video')
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<GenerationRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const pendingActionAfterLogin = useRef<(() => void) | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4200);
  }, []);

  const authHeaders = useCallback(
    (extra?: Record<string, string>) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
      ...extra,
    }),
    [sessionToken]
  );

  const refreshAll = useCallback(async () => {
    try {
      const [sessRes, genRes, commRes, projRes, uplRes, catRes, contRes] = await Promise.all([
        fetch('/api/auth/session', { headers: authHeaders() }),
        fetch('/api/generations', { headers: authHeaders() }),
        fetch('/api/community'),
        fetch('/api/projects', { headers: authHeaders() }),
        fetch('/api/uploads', { headers: authHeaders() }),
        fetch('/api/catalog', { headers: authHeaders() }),
        fetch('/api/continuity', { headers: authHeaders() }),
      ]);

      if (sessRes.ok) {
        const sData = await sessRes.json();
        setUser(sData.user || null);
      }
      if (genRes.ok) {
        const gData = await genRes.json();
        setGenerations(gData.generations || []);
      }
      if (commRes.ok) {
        const cData = await commRes.json();
        setCommunityItems(cData.items || []);
      }
      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(pData.projects || []);
      }
      if (uplRes.ok) {
        const uData = await uplRes.json();
        setUploads(uData.uploads || []);
      }
      if (contRes.ok) {
        const contData = await contRes.json();
        if (Array.isArray(contData.characters)) setCharacters(contData.characters);
        if (Array.isArray(contData.wardrobes)) setWardrobes(contData.wardrobes);
        if (Array.isArray(contData.props)) setPropsList(contData.props);
        if (Array.isArray(contData.locations)) setLocations(contData.locations);
        if (Array.isArray(contData.motionTemplates)) setMotionTemplates(contData.motionTemplates);
        if (Array.isArray(contData.cinemaProjects)) setCinemaProjects(contData.cinemaProjects);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        if (Array.isArray(catData.models) && catData.models.length > 0) {
          const mergedModels: ModelEntry[] = [];
          for (const remoteModel of catData.models) {
            const base = MODEL_CATALOG.find((m) => m.id === remoteModel.id);
            if (base) {
              mergedModels.push({
                ...base,
                ...remoteModel,
                restPaths: base.restPaths,
                toPlatform: base.toPlatform,
              });
            }
          }
          if (mergedModels.length > 0) {
            setModels(mergedModels);
          }
        }
        if (Array.isArray(catData.providers)) {
          setProviders(catData.providers);
        }
        if (Array.isArray(catData.presets) && catData.presets.length > 0) {
          setPresets(catData.presets);
        }
        if (Array.isArray(catData.notifications)) {
          setNotifications(catData.notifications);
        }
        if (Array.isArray(catData.plans) && catData.plans.length > 0) {
          setPlans(catData.plans);
        }
        if (Array.isArray(catData.topups) && catData.topups.length > 0) {
          setTopups(catData.topups);
        }
      }
    } catch {
      // Ignore transient network errors
    }
  }, [authHeaders]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Batched DB status polling every 2.0s while any generation is in flight (§2 & §7)
  useEffect(() => {
    const inFlightIds = generations
      .filter(
        (g) =>
          g.status === 'pending_submit' || g.status === 'queued' || g.status === 'in_progress'
      )
      .map((g) => g.id);

    if (inFlightIds.length === 0) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/generations/status?ids=${encodeURIComponent(inFlightIds.join(','))}`,
          { headers: authHeaders() }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.credits) {
          setUser((prev) => (prev ? { ...prev, credits: data.credits } : prev));
        }
        if (Array.isArray(data.items) && data.items.length > 0) {
          setGenerations((prev) =>
            prev.map((gen) => {
              const updated = data.items.find((it: { id: string }) => it.id === gen.id);
              if (!updated) return gen;
              return {
                ...gen,
                status: updated.status,
                outputs: updated.outputs || gen.outputs,
                error: updated.error ?? gen.error,
                finishedAt: updated.finishedAt ?? gen.finishedAt,
              };
            })
          );
        }
      } catch {
        // Ignore poll error
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [generations, authHeaders]);

  const applyModelToDock = useCallback(
    (modelId: string, surfaceOverride?: Surface, providerOverride?: ApiProviderId) => {
      const found =
        models.find((m) => m.id === modelId) ||
        MODEL_CATALOG.find((m) => m.id === modelId);
      if (!found) return;
      const defaults: Record<string, string | number | boolean> = {};
      for (const s of found.settings) {
        defaults[s.key] = s.defaultValue;
      }
      const nextProvider =
        providerOverride ||
        found.defaultApiProvider ||
        'runware';
      setDockDraft((prev) => ({
        surface: surfaceOverride || found.surface,
        modelId: found.id,
        apiProvider: nextProvider,
        mode: found.modes[0] || 'Create',
        prompt: prev.surface === found.surface ? prev.prompt : '',
        settings: defaults,
        media: [],
      }));
    },
    [models]
  );

  const navigate = useCallback(
    (nextRoute: RoutePath, params: Record<string, string> = {}) => {
      setRoute(nextRoute);
      setRouteParams(params);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (nextRoute === 'image' || nextRoute === 'video' || nextRoute === 'audio') {
        if (params.model) {
          applyModelToDock(
            params.model,
            nextRoute,
            params.provider as ApiProviderId | undefined
          );
        } else if (dockDraft.surface !== nextRoute) {
          setDockDraft(getDefaultDraftForSurface(nextRoute, models));
        }
      }
    },
    [applyModelToDock, dockDraft.surface, models]
  );

  const applyPresetToDock = useCallback(
    (preset: PresetEffect) => {
      const model =
        models.find((m) => m.id === preset.modelId) ||
        MODEL_CATALOG.find((m) => m.id === preset.modelId) ||
        MODEL_CATALOG[0];
      const mergedSettings: Record<string, string | number | boolean> = {};
      for (const s of model.settings) {
        mergedSettings[s.key] = preset.settings[s.key] ?? s.defaultValue;
      }
      setDockDraft({
        surface: preset.surface,
        modelId: model.id,
        apiProvider: model.defaultApiProvider || 'runware',
        mode: model.modes[0] || 'Create',
        prompt: preset.promptTemplate,
        settings: mergedSettings,
        media: [],
        presetSlug: preset.slug,
      });
      setRoute(preset.surface);
      setRouteParams({ model: model.id, preset: preset.slug });
    },
    [models]
  );

  const reuseGenerationInDock = useCallback(
    (gen: GenerationRecord, animateAsVideo = false) => {
      if (animateAsVideo && gen.outputs[0]) {
        const videoModel =
          models.find((m) => m.id === 'seedance-2-5') ||
          MODEL_CATALOG.find((m) => m.id === 'seedance-2-5')!;
        const defaults: Record<string, string | number | boolean> = {};
        for (const s of videoModel.settings) {
          defaults[s.key] = s.defaultValue;
        }
        setDockDraft({
          surface: 'video',
          modelId: videoModel.id,
          apiProvider: videoModel.defaultApiProvider || 'runware',
          mode: 'Create Video',
          prompt: gen.prompt,
          settings: defaults,
          media: [
            {
              role: 'start',
              kind: 'image',
              url: gen.outputs[0].url,
              label: 'Animated from Still',
            },
          ],
        });
        setRoute('video');
        setSelectedGeneration(null);
        showToast('Loaded image as Start Frame in Video Studio');
        return;
      }

      const model =
        models.find((m) => m.id === gen.modelId) ||
        MODEL_CATALOG.find((m) => m.id === gen.modelId) ||
        MODEL_CATALOG[0];
      setDockDraft({
        surface: gen.surface,
        modelId: model.id,
        apiProvider: gen.apiProvider || model.defaultApiProvider || 'runware',
        mode: gen.mode || model.modes[0] || 'Create',
        prompt: gen.prompt,
        settings: { ...gen.settings },
        media: [...gen.media],
      });
      setRoute(gen.surface);
      setSelectedGeneration(null);
      showToast(`Loaded prompt & settings for ${model.label}`);
    },
    [models, showToast]
  );

  const downloadGeneration = useCallback(
    async (gen: GenerationRecord, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      const out = gen.outputs?.[0];
      if (!out || !out.url) {
        showToast('Output file is not ready to download yet');
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
        // Use backend proxy attachment endpoint so cross-origin Runware CDN assets download cleanly as files
        const a = document.createElement('a');
        a.href = `/api/generations/${encodeURIComponent(gen.id)}/download`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`Downloading ${filename}`);
      } catch {
        const a = document.createElement('a');
        a.href = out.url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`Downloading ${filename}`);
      }
    },
    [showToast]
  );

  const composeContinuityPrompt = useCallback(
    (
      basePrompt: string,
      overrides?: Partial<ActiveContinuityContext>,
      baseMedia: MediaSlotInput[] = []
    ): { prompt: string; media: MediaSlotInput[] } => {
      const ctx = { ...activeContinuity, ...overrides };
      const segments: string[] = [];
      const mergedMedia: MediaSlotInput[] = [...baseMedia];
      const addMediaIfMissing = (slot: MediaSlotInput) => {
        if (!slot.url) return;
        if (!mergedMedia.some((m) => m.url === slot.url)) {
          mergedMedia.push(slot);
        }
      };

      const selectedChars = characters.filter((c) => ctx.characterIds.includes(c.id));
      for (const chr of selectedChars) {
        const outfitId = ctx.wardrobeId || chr.defaultWardrobeId;
        const outfit = wardrobes.find((w) => w.id === outfitId);
        const charProps = propsList.filter(
          (p) => chr.assignedPropIds.includes(p.id) || ctx.propIds.includes(p.id)
        );
        const wardrobeDesc = outfit
          ? `wearing [${outfit.wardrobeCode}: ${outfit.name} — ${outfit.garments}${outfit.shoes ? `, ${outfit.shoes}` : ''}${outfit.accessories ? `, ${outfit.accessories}` : ''}${outfit.jewellery ? `, ${outfit.jewellery}` : ''}]`
          : '';
        const propDesc =
          charProps.length > 0
            ? `with props [${charProps.map((p) => `${p.name} (${p.description || p.category})`).join('; ')}]`
            : '';
        segments.push(
          `[CHARACTER IDENTITY LOCK ${chr.identityId} — ${chr.name}: ${chr.ageRange} ${chr.genderPresentation}, ${chr.skinTone} skin, ${chr.bodyType} build, ${chr.height}, ${outfit?.hairstyleOverride || chr.hairstyle} hair, ${chr.eyeColor} eyes, ${chr.distinctiveFeatures}, expression: ${chr.activeExpression}, voice lock: ${chr.voiceId} (${chr.primaryLanguage}, ${chr.speechAccent} accent, ${chr.tone}) ${wardrobeDesc} ${propDesc}]`
        );
        if (chr.faceReferenceUrl && chr.facialIdentityLock) {
          addMediaIfMissing({
            role: 'reference',
            kind: 'image',
            url: chr.faceReferenceUrl,
            label: `${chr.name} (${chr.identityId})`,
          });
        }
        if (outfit?.referenceImageUrl && outfit.sceneContinuityLock) {
          addMediaIfMissing({
            role: 'reference',
            kind: 'image',
            url: outfit.referenceImageUrl,
            label: `Wardrobe: ${outfit.name}`,
          });
        }
      }

      if (selectedChars.length === 0 && ctx.wardrobeId) {
        const outfit = wardrobes.find((w) => w.id === ctx.wardrobeId);
        if (outfit) {
          segments.push(
            `[WARDROBE LOCK ${outfit.wardrobeCode} — ${outfit.name} (${outfit.category}): ${outfit.garments}, ${outfit.shoes}, ${outfit.accessories}, ${outfit.jewellery}]`
          );
          if (outfit.referenceImageUrl) {
            addMediaIfMissing({
              role: 'reference',
              kind: 'image',
              url: outfit.referenceImageUrl,
              label: `Wardrobe: ${outfit.name}`,
            });
          }
        }
      }

      const extraProps = propsList.filter((p) => ctx.propIds.includes(p.id));
      for (const prp of extraProps) {
        if (!segments.some((s) => s.includes(prp.name))) {
          segments.push(
            `[PROP LOCK ${prp.propCode} — ${prp.name} (${prp.category}): ${prp.description} ${prp.materialAndFinish}]`
          );
        }
        if (prp.referenceImageUrl && prp.appearanceLock) {
          addMediaIfMissing({
            role: 'reference',
            kind: 'image',
            url: prp.referenceImageUrl,
            label: `Prop: ${prp.name}`,
          });
        }
      }

      if (ctx.locationId) {
        const loc = locations.find((l) => l.id === ctx.locationId);
        if (loc) {
          segments.push(
            `[LOCATION LOCK ${loc.locationCode} — ${loc.settingType} ${loc.name} (${loc.timeOfDay}, ${loc.weather}): ${loc.description}, lighting: ${loc.lightingAndMood}]`
          );
          if (loc.primaryImageUrl && loc.continuityLock) {
            addMediaIfMissing({
              role: 'reference',
              kind: 'image',
              url: loc.primaryImageUrl,
              label: `Location: ${loc.name}`,
            });
          }
        }
      }

      if (ctx.motionTemplateId) {
        const mot = motionTemplates.find((m) => m.id === ctx.motionTemplateId);
        if (mot) {
          segments.push(
            `[MOTION LOCK ${mot.motionCode} — ${mot.name} (${mot.movementCategory}, Camera: ${mot.cameraMovement}): ${mot.motionPrompt}]`
          );
          if (mot.referenceVideoUrl) {
            addMediaIfMissing({
              role: 'video',
              kind: 'video',
              url: mot.referenceVideoUrl,
              label: `Motion: ${mot.name}`,
            });
          }
        }
      }

      const prefix = segments.join(' ');
      const finalPrompt =
        prefix && !basePrompt.includes('IDENTITY LOCK') && !basePrompt.includes('WARDROBE LOCK')
          ? `${prefix} ${basePrompt}`.trim()
          : basePrompt.trim();

      return { prompt: finalPrompt, media: mergedMedia };
    },
    [activeContinuity, characters, wardrobes, propsList, locations, motionTemplates]
  );

  const submitGeneration = useCallback(
    async (overrideDraft?: Partial<DockDraftState>) => {
      const activeDraft = { ...dockDraft, ...overrideDraft };
      const composed = composeContinuityPrompt(activeDraft.prompt, undefined, activeDraft.media);

      if (!user) {
        setAuthModalOpen(true);
        return { ok: false, error: 'AUTH_REQUIRED' };
      }

      try {
        const res = await fetch('/api/generations/submit', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            modelId: activeDraft.modelId,
            apiProvider: activeDraft.apiProvider,
            mode: activeDraft.mode,
            prompt: composed.prompt,
            settings: activeDraft.settings,
            media: composed.media,
            presetId: activeDraft.presetSlug,
            projectId: routeParams.projectId || activeContinuity.projectId || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.error === 'INSUFFICIENT_CREDITS') {
            setUpgradeModalOpen(true);
          } else if (data.error === 'AUTH_REQUIRED') {
            setAuthModalOpen(true);
          } else {
            showToast(data.message || 'Could not submit generation');
          }
          return { ok: false, error: data.message || data.error };
        }

        if (data.credits) {
          setUser((prev) => (prev ? { ...prev, credits: data.credits } : prev));
        }
        if (data.generation) {
          setGenerations((prev) => [data.generation, ...prev]);
          if (data.generation.status === 'failed') {
            showToast(data.generation.error || 'Generation failed — credits refunded');
          } else if (data.generation.status === 'completed') {
            showToast(
              `Generated on ${data.generation.modelLabel} (-✦ ${data.generation.cost} credits)`
            );
          } else {
            showToast(
              `Queued on ${data.generation.modelLabel} (-✦ ${data.generation.cost} credits)`
            );
          }
        }

        return { ok: true, generation: data.generation };
      } catch {
        showToast('Network error submitting generation');
        return { ok: false, error: 'NETWORK_ERROR' };
      }
    },
    [dockDraft, composeContinuityPrompt, user, authHeaders, routeParams.projectId, activeContinuity.projectId, showToast]
  );

  const saveCharacter = useCallback(
    async (payload: Partial<CharacterProfile> & { name: string }) => {
      if (!user) {
        setAuthModalOpen(true);
        return null;
      }
      try {
        const res = await fetch('/api/continuity/characters', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.character) {
          showToast(data.error || 'Could not save character');
          return null;
        }
        const saved = data.character as CharacterProfile;
        setCharacters((prev) => {
          const exists = prev.some((c) => c.id === saved.id);
          return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev];
        });
        showToast(`Saved character "${saved.name}" (${saved.identityId})`);
        return saved;
      } catch {
        showToast('Network error saving character');
        return null;
      }
    },
    [user, authHeaders, showToast]
  );

  const deleteCharacter = useCallback(
    async (id: string) => {
      setCharacters((prev) => prev.filter((c) => c.id !== id));
      setActiveContinuity((prev) => ({
        ...prev,
        characterIds: prev.characterIds.filter((cid) => cid !== id),
      }));
      try {
        await fetch(`/api/continuity/characters/${encodeURIComponent(id)}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ id, _method: 'DELETE' }),
        });
      } catch {
        // Optimistic delete
      }
      showToast('Character removed from continuity library');
    },
    [authHeaders, showToast]
  );

  const saveWardrobe = useCallback(
    async (payload: Partial<WardrobeItem> & { name: string }) => {
      if (!user) {
        setAuthModalOpen(true);
        return null;
      }
      try {
        const res = await fetch('/api/continuity/wardrobes', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.wardrobe) {
          showToast(data.error || 'Could not save wardrobe outfit');
          return null;
        }
        const saved = data.wardrobe as WardrobeItem;
        setWardrobes((prev) => {
          const exists = prev.some((w) => w.id === saved.id);
          return exists ? prev.map((w) => (w.id === saved.id ? saved : w)) : [saved, ...prev];
        });
        showToast(`Saved wardrobe "${saved.name}" (${saved.wardrobeCode})`);
        return saved;
      } catch {
        showToast('Network error saving wardrobe');
        return null;
      }
    },
    [user, authHeaders, showToast]
  );

  const deleteWardrobe = useCallback(
    async (id: string) => {
      setWardrobes((prev) => prev.filter((w) => w.id !== id));
      setActiveContinuity((prev) => ({
        ...prev,
        wardrobeId: prev.wardrobeId === id ? null : prev.wardrobeId,
      }));
      try {
        await fetch(`/api/continuity/wardrobes/${encodeURIComponent(id)}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ id, _method: 'DELETE' }),
        });
      } catch {
        // Optimistic delete
      }
      showToast('Wardrobe outfit removed');
    },
    [authHeaders, showToast]
  );

  const saveProp = useCallback(
    async (payload: Partial<PropItem> & { name: string }) => {
      if (!user) {
        setAuthModalOpen(true);
        return null;
      }
      try {
        const res = await fetch('/api/continuity/props', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.prop) {
          showToast(data.error || 'Could not save prop');
          return null;
        }
        const saved = data.prop as PropItem;
        setPropsList((prev) => {
          const exists = prev.some((p) => p.id === saved.id);
          return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
        });
        showToast(`Saved prop "${saved.name}" (${saved.propCode})`);
        return saved;
      } catch {
        showToast('Network error saving prop');
        return null;
      }
    },
    [user, authHeaders, showToast]
  );

  const deleteProp = useCallback(
    async (id: string) => {
      setPropsList((prev) => prev.filter((p) => p.id !== id));
      setActiveContinuity((prev) => ({
        ...prev,
        propIds: prev.propIds.filter((pid) => pid !== id),
      }));
      try {
        await fetch(`/api/continuity/props/${encodeURIComponent(id)}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ id, _method: 'DELETE' }),
        });
      } catch {
        // Optimistic delete
      }
      showToast('Prop removed');
    },
    [authHeaders, showToast]
  );

  const saveLocation = useCallback(
    async (payload: Partial<LocationItem> & { name: string }) => {
      if (!user) {
        setAuthModalOpen(true);
        return null;
      }
      try {
        const res = await fetch('/api/continuity/locations', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.location) {
          showToast(data.error || 'Could not save location');
          return null;
        }
        const saved = data.location as LocationItem;
        setLocations((prev) => {
          const exists = prev.some((l) => l.id === saved.id);
          return exists ? prev.map((l) => (l.id === saved.id ? saved : l)) : [saved, ...prev];
        });
        showToast(`Saved location "${saved.name}" (${saved.locationCode})`);
        return saved;
      } catch {
        showToast('Network error saving location');
        return null;
      }
    },
    [user, authHeaders, showToast]
  );

  const deleteLocation = useCallback(
    async (id: string) => {
      setLocations((prev) => prev.filter((l) => l.id !== id));
      setActiveContinuity((prev) => ({
        ...prev,
        locationId: prev.locationId === id ? null : prev.locationId,
      }));
      try {
        await fetch(`/api/continuity/locations/${encodeURIComponent(id)}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ id, _method: 'DELETE' }),
        });
      } catch {
        // Optimistic delete
      }
      showToast('Location removed');
    },
    [authHeaders, showToast]
  );

  const saveMotionTemplate = useCallback(
    async (payload: Partial<MotionTemplateItem> & { name: string }) => {
      if (!user) {
        setAuthModalOpen(true);
        return null;
      }
      try {
        const res = await fetch('/api/continuity/motion', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.motionTemplate) {
          showToast(data.error || 'Could not save motion rig');
          return null;
        }
        const saved = data.motionTemplate as MotionTemplateItem;
        setMotionTemplates((prev) => {
          const exists = prev.some((m) => m.id === saved.id);
          return exists ? prev.map((m) => (m.id === saved.id ? saved : m)) : [saved, ...prev];
        });
        showToast(`Saved motion rig "${saved.name}" (${saved.motionCode})`);
        return saved;
      } catch {
        showToast('Network error saving motion rig');
        return null;
      }
    },
    [user, authHeaders, showToast]
  );

  const deleteMotionTemplate = useCallback(
    async (id: string) => {
      setMotionTemplates((prev) => prev.filter((m) => m.id !== id));
      setActiveContinuity((prev) => ({
        ...prev,
        motionTemplateId: prev.motionTemplateId === id ? null : prev.motionTemplateId,
      }));
      try {
        await fetch(`/api/continuity/motion/${encodeURIComponent(id)}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ id, _method: 'DELETE' }),
        });
      } catch {
        // Optimistic delete
      }
      showToast('Motion rig removed');
    },
    [authHeaders, showToast]
  );

  const saveCinemaProject = useCallback(
    async (payload: Partial<CinemaProductionProject> & { title: string }) => {
      if (!user) {
        setAuthModalOpen(true);
        return null;
      }
      try {
        const res = await fetch('/api/continuity/cinema-projects', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.cinemaProject) {
          showToast(data.error || 'Could not save production project');
          return null;
        }
        const saved = data.cinemaProject as CinemaProductionProject;
        setCinemaProjects((prev) => {
          const exists = prev.some((p) => p.id === saved.id);
          return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
        });
        showToast(`Saved production "${saved.title}"`);
        return saved;
      } catch {
        showToast('Network error saving production project');
        return null;
      }
    },
    [user, authHeaders, showToast]
  );

  const deleteCinemaProject = useCallback(
    async (id: string) => {
      setCinemaProjects((prev) => prev.filter((p) => p.id !== id));
      try {
        await fetch(`/api/continuity/cinema-projects/${encodeURIComponent(id)}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ id, _method: 'DELETE' }),
        });
      } catch {
        // Optimistic delete
      }
      showToast('Production project removed');
    },
    [authHeaders, showToast]
  );

  const cancelGeneration = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/generations/${id}/cancel`, {
          method: 'POST',
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.message || data.error || 'Cannot cancel run in progress');
          return;
        }
        if (data.credits) {
          setUser((prev) => (prev ? { ...prev, credits: data.credits } : prev));
        }
        if (data.generation) {
          setGenerations((prev) => prev.map((g) => (g.id === id ? data.generation : g)));
          showToast('Queued run canceled · Credits refunded to your balance');
        }
      } catch {
        showToast('Could not cancel run');
      }
    },
    [authHeaders, showToast]
  );

  const togglePublishGeneration = useCallback(
    async (id: string, isPublic: boolean) => {
      setGenerations((prev) =>
        prev.map((g) => (g.id === id ? { ...g, isPublic } : g))
      );
      setSelectedGeneration((prev) =>
        prev?.id === id ? { ...prev, isPublic } : prev
      );
      try {
        const res = await fetch(`/api/generations/${id}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ isPublic, _method: 'PATCH' }),
        });
        if (res.ok) {
          const data = await res.json();
          setGenerations((prev) => prev.map((g) => (g.id === id ? data.generation : g)));
          setSelectedGeneration((prev) => (prev?.id === id ? data.generation : prev));
          refreshAll();
        }
      } catch {
        // Optimistic update already applied
      }
      showToast(isPublic ? 'Published to Public Community Feed' : 'Removed from Community Feed');
    },
    [authHeaders, refreshAll, showToast]
  );

  const moveGenerationToProject = useCallback(
    async (id: string, projectId: string | null) => {
      setGenerations((prev) =>
        prev.map((g) => (g.id === id ? { ...g, projectId } : g))
      );
      try {
        const res = await fetch(`/api/generations/${id}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ projectId, _method: 'PATCH' }),
        });
        if (res.ok) {
          const data = await res.json();
          setGenerations((prev) => prev.map((g) => (g.id === id ? data.generation : g)));
          refreshAll();
        }
      } catch {
        // Optimistic update already applied
      }
      showToast(projectId ? 'Moved generation to project' : 'Removed from project');
    },
    [authHeaders, refreshAll, showToast]
  );

  const deleteGeneration = useCallback(
    async (id: string) => {
      setGenerations((prev) => prev.filter((g) => g.id !== id));
      setSelectedGeneration((prev) => (prev?.id === id ? null : prev));
      try {
        await fetch(`/api/generations/${id}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ _method: 'DELETE' }),
        });
      } catch {
        // Optimistic delete already applied
      }
      showToast('Generation deleted');
    },
    [authHeaders, showToast]
  );

  const createProject = useCallback(
    async (name: string) => {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        setProjects((prev) => [data.project, ...prev]);
        showToast(`Created project "${data.project.name}"`);
        return data.project as ProjectRecord;
      } catch {
        return null;
      }
    },
    [authHeaders, showToast]
  );

  const renameProject = useCallback(
    async (id: string, name: string) => {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
      try {
        const res = await fetch(`/api/projects/${id}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name, _method: 'PATCH' }),
        });
        if (res.ok) {
          const data = await res.json();
          setProjects((prev) => prev.map((p) => (p.id === id ? data.project : p)));
        }
      } catch {
        // Optimistic update already applied
      }
      showToast('Project renamed');
    },
    [authHeaders, showToast]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      try {
        await fetch(`/api/projects/${id}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ _method: 'DELETE' }),
        });
      } catch {
        // Optimistic delete already applied
      }
      showToast('Project deleted');
    },
    [authHeaders, showToast]
  );

  const uploadReferenceFile = useCallback(
    async (file: { label: string; contentType: string; bytes: number; dataUrl: string }) => {
      if (!user) {
        setAuthModalOpen(true);
        return null;
      }
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(file),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Upload failed');
          return null;
        }
        setUploads((prev) => [data.upload, ...prev]);
        showToast(`Uploaded "${file.label}" to library`);
        return data.upload as UploadRecord;
      } catch {
        showToast('Upload failed');
        return null;
      }
    },
    [user, authHeaders, showToast]
  );

  const persistSession = useCallback((token: string, rememberMe = true) => {
    setSessionToken(token);
    try {
      if (!token) {
        localStorage.removeItem('spacix_session_token');
        sessionStorage.removeItem('spacix_session_token');
      } else if (rememberMe) {
        localStorage.setItem('spacix_session_token', token);
        sessionStorage.removeItem('spacix_session_token');
      } else {
        sessionStorage.setItem('spacix_session_token', token);
        localStorage.removeItem('spacix_session_token');
      }
    } catch {
      // Ignore storage errors in private mode
    }
  }, []);

  const loginWithPassword = useCallback(
    async (params: { email: string; password: string; rememberMe: boolean }) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error || 'Invalid email or password.' };
        }
        persistSession(data.sessionToken, Boolean(params.rememberMe));
        setUser(data.user);
        setAuthModalOpen(false);
        if (route === 'auth') {
          setRoute('explore');
        }
        showToast(`Welcome back, ${data.user.name}`);
        if (pendingActionAfterLogin.current) {
          const fn = pendingActionAfterLogin.current;
          pendingActionAfterLogin.current = null;
          fn();
        }
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error signing in. Please try again.' };
      }
    },
    [persistSession, route, showToast]
  );

  const registerAccount = useCallback(
    async (params: {
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
      rememberMe: boolean;
    }) => {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error || 'Could not create account.' };
        }
        persistSession(data.sessionToken, Boolean(params.rememberMe));
        setUser(data.user);
        setAuthModalOpen(false);
        if (route === 'auth') {
          setRoute('explore');
        }
        showToast(`Account created! Welcome to SPACIX, ${data.user.name}`);
        if (pendingActionAfterLogin.current) {
          const fn = pendingActionAfterLogin.current;
          pendingActionAfterLogin.current = null;
          fn();
        }
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error creating account.' };
      }
    },
    [persistSession, route, showToast]
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // Ignore network errors on sign out
    }
    persistSession('', false);
    setUser(null);
    setGenerations([]);
    setProjects([]);
    setUploads([]);
    if (route === 'admin' || route === 'account' || route === 'assets') {
      setRoute('auth');
    }
    showToast('Signed out of your SPACIX account');
  }, [authHeaders, persistSession, route, showToast]);

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || 'Could not initiate password reset.' };
      }
      return {
        ok: true,
        emailDelivered: Boolean(data.emailDelivered),
        resetCode: data.resetCode,
      };
    } catch {
      return { ok: false, error: 'Network error requesting password reset.' };
    }
  }, []);

  const confirmPasswordReset = useCallback(
    async (params: {
      email: string;
      code: string;
      newPassword: string;
      confirmPassword: string;
      rememberMe?: boolean;
    }) => {
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error || 'Could not reset password.' };
        }
        persistSession(data.sessionToken, params.rememberMe ?? true);
        setUser(data.user);
        setAuthModalOpen(false);
        if (route === 'auth') {
          setRoute('explore');
        }
        showToast('Password updated and signed in!');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error resetting password.' };
      }
    },
    [persistSession, route, showToast]
  );

  const changePassword = useCallback(
    async (params: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error || 'Could not change password.' };
        }
        showToast('Your password has been updated');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error updating password.' };
      }
    },
    [authHeaders, showToast]
  );

  const updateProfile = useCallback(
    async (params: { name: string }) => {
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ _method: 'PATCH', name: params.name }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error || 'Could not update profile.' };
        }
        if (data.user) {
          setUser(data.user);
        }
        showToast('Profile updated');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error updating profile.' };
      }
    },
    [authHeaders, showToast]
  );

  const requestMagicLink = useCallback(async (email: string) => {
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Could not send magic link' };
      }
      return {
        ok: true,
        previewMagicToken: data.previewMagicToken,
        email: data.email,
      };
    } catch {
      return { ok: false, error: 'Network error requesting magic link' };
    }
  }, []);

  const verifyMagicLink = useCallback(
    async (token: string) => {
      try {
        const res = await fetch('/api/auth/verify-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data.error || 'Invalid magic link' };
        }
        persistSession(data.sessionToken, true);
        setUser(data.user);
        setAuthModalOpen(false);
        if (route === 'auth') {
          setRoute('explore');
        }
        showToast(`Signed in as ${data.user.email}`);
        if (pendingActionAfterLogin.current) {
          const fn = pendingActionAfterLogin.current;
          pendingActionAfterLogin.current = null;
          fn();
        }
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error verifying magic link' };
      }
    },
    [persistSession, route, showToast]
  );

  const checkoutPlanOrTopup = useCallback(
    async (payload: {
      kind: 'subscription' | 'topup';
      planId?: PlanTierId;
      billingCycle?: 'monthly' | 'annual';
      topupId?: string;
    }) => {
      if (!user) {
        setAuthModalOpen(true);
        return { ok: false, error: 'Sign in first' };
      }
      try {
        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Checkout error');
          return { ok: false, error: data.error };
        }
        if (data.user) {
          setUser(data.user);
        }
        setUpgradeModalOpen(false);
        showToast(data.message || 'Credits updated');
        return { ok: true, message: data.message };
      } catch {
        showToast('Checkout network error');
        return { ok: false, error: 'Checkout network error' };
      }
    },
    [user, authHeaders, showToast]
  );

  const updateUserCredits = useCallback(
    async (
      subscriptionCredits: number,
      topupCredits: number,
      targetUserId?: string,
      note?: string
    ) => {
      const uid = targetUserId || user?.id;
      if (!uid) return;
      const cleanSub = Math.max(0, Math.round(Number(subscriptionCredits) || 0));
      const cleanTop = Math.max(0, Math.round(Number(topupCredits) || 0));
      const cleanTotal = cleanSub + cleanTop;

      if (!targetUserId || targetUserId === user?.id) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                credits: {
                  subscription: cleanSub,
                  topup: cleanTop,
                  total: cleanTotal,
                },
              }
            : prev
        );
      }

      try {
        const res = await fetch(`/api/admin/users/${uid}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            _method: 'PATCH',
            subscriptionCredits: cleanSub,
            topupCredits: cleanTop,
            note: note || 'Updated credit balance',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user && (!targetUserId || targetUserId === user?.id)) {
            setUser(data.user);
          }
          await refreshAll();
        }
      } catch {
        // Optimistic update already applied
      }
      showToast(`Wallet balance updated to ✦ ${cleanTotal.toLocaleString()} credits`);
    },
    [user?.id, authHeaders, refreshAll, showToast]
  );

  return React.createElement(
    StudioContext.Provider,
    {
      value: {
        route,
        routeParams,
        navigate,
        user,
        sessionToken,
        models,
        providers,
        presets,
        notifications,
        plans,
        topups,
        generations,
        communityItems,
        projects,
        uploads,
        characters,
        wardrobes,
        propsList,
        locations,
        motionTemplates,
        cinemaProjects,
        activeContinuity,
        setActiveContinuity,
        saveCharacter,
        deleteCharacter,
        saveWardrobe,
        deleteWardrobe,
        saveProp,
        deleteProp,
        saveLocation,
        deleteLocation,
        saveMotionTemplate,
        deleteMotionTemplate,
        saveCinemaProject,
        deleteCinemaProject,
        composeContinuityPrompt,
        dockDraft,
        setDockDraft,
        applyModelToDock,
        applyPresetToDock,
        reuseGenerationInDock,
        submitGeneration,
        cancelGeneration,
        togglePublishGeneration,
        moveGenerationToProject,
        deleteGeneration,
        createProject,
        renameProject,
        deleteProject,
        uploadReferenceFile,
        loginWithPassword,
        registerAccount,
        logout,
        requestPasswordReset,
        confirmPasswordReset,
        changePassword,
        updateProfile,
        requestMagicLink,
        verifyMagicLink,
        checkoutPlanOrTopup,
        updateUserCredits,
        downloadGeneration,
        refreshAll,
        authModalOpen,
        setAuthModalOpen,
        upgradeModalOpen,
        setUpgradeModalOpen,
        selectedGeneration,
        setSelectedGeneration,
        toastMessage,
        showToast,
      },
    },
    children
  );
};

export function useRuns(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useRuns must be used within StudioProvider');
  return ctx;
}
