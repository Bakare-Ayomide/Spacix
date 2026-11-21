import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Lock,
  Mic,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Scissors,
  Shirt,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Video,
  Wand2,
} from 'lucide-react';
import { useRuns } from '../lib/useRuns';
import {
  MediaSlotInput,
  ModelEntry,
  SettingDefinition,
  WardrobeCategory,
} from '../types/studio';
import {
  DecodedAudioTrack,
  SUPPORTED_AUDIO_ACCEPT,
  clampTrimRange,
  decodeAudioFromFile,
  formatTimecode,
  importAudioFromDirectUrl,
  sliceAudioBufferToWav,
} from '../lib/audioTrim';
import {
  MusicVideoAudioTimeline,
  TimelineSceneMarker,
} from './MusicVideoAudioTimeline';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type MusicVideoShotMode = 'lipsync' | 'broll';
export type LipSyncPipelineType = 'native' | 'two_step';

export interface MusicVideoScene {
  id: string;
  title: string;
  mode: MusicVideoShotMode;
  lipSyncPipeline: LipSyncPipelineType;
  characterId: string | null;
  wardrobeId: string | null;
  // Audio segment bound to this scene (non-destructive indices into master track)
  audioStartSec: number;
  audioEndSec: number;
  // Scene visual setup (Option A create / Option B upload)
  sceneDescription: string;
  environmentPrompt: string;
  cameraFraming: string;
  cameraMovement: string;
  lightingStyle: string;
  visualStyle: string;
  // Performance / B-Roll direction
  performanceIntensity: string;
  facialExpression: string;
  bodyMovement: string;
  brollCategory: string;
  // Visual reference & generation lineage
  referenceImageUrl: string;
  referenceSource: 'generated' | 'uploaded' | 'none';
  imageModelId: string;
  imageGenId?: string;
  // Video / Lip Sync generation state
  nativeLipSyncModelId: string;
  animationModelId: string;
  videoLipSyncModelId: string;
  brollModelId: string;
  modelSettings: Record<string, string | number | boolean>;
  step2Settings: Record<string, string | number | boolean>;
  /** For 2-step lip sync: Step 1 animated clip before lip-sync pass */
  animatedClipGenId?: string;
  animatedClipUrl?: string;
  autoChainStep2?: boolean;
  /** Final clip (Native Lip Sync, Step 2 Lip Sync, or B-Roll video) */
  finalClipGenId?: string;
  finalClipUrl?: string;
  lastTrimmedAudioUrl?: string;
  lastError?: string;
}

interface PersistedMusicVideoState {
  scenes: MusicVideoScene[];
  activeSceneId: string;
  audioMeta?: {
    title: string;
    sourceType: 'upload' | 'url';
    sourceUrl?: string;
    durationSec: number;
  };
}

interface MusicVideoStudioProps {
  projectId: string | null;
  projectTitle: string;
}

const CAMERA_FRAMING_OPTIONS = [
  'Close-Up (Performance Vocal)',
  'Medium Close-Up',
  'Medium Shot (Waist-Up)',
  'Wide Establishing Shot',
  'Low-Angle Hero Shot',
  'Over-the-Shoulder',
  'Extreme Close-Up',
];

const CAMERA_MOVEMENT_OPTIONS = [
  'Slow Dolly In',
  'Orbital Arc Around Performer',
  'Handheld Intimate Sway',
  'Smooth Steadicam Tracking',
  'Locked Tripod Frame',
  'Crane Rise Reveal',
  'Whip Pan Energy',
];

const LIGHTING_STYLE_OPTIONS = [
  'Moody Cyan & Amber Rim Light',
  'Stage Backlight with Volumetric Haze',
  'Neon Street Rain Reflections',
  'Golden Hour Warm Sunflare',
  'High-Contrast Studio Spotlight',
  'Soft Editorial Diffused Key',
  'Noir Chiaroscuro Shadows',
];

const VISUAL_STYLE_OPTIONS = [
  'Anamorphic 35mm Cinema',
  'Glossy Contemporary Music Video',
  'Gritty Super 16mm Celluloid',
  'High-Fashion Editorial Gloss',
  'Cyber-Noir Neon Chrome',
  'Dreamy Halation Vintage',
];

const PERFORMANCE_INTENSITY_OPTIONS = [
  'Intimate & Soulful',
  'Natural Confident Singing',
  'High-Energy Stage Performance',
  'Raw Emotional Delivery',
  'Rhythmic Rap / Cadence',
];

const FACIAL_EXPRESSION_OPTIONS = [
  'Passionate & Focused',
  'Confident & Charismatic',
  'Vulnerable & Emotional',
  'Joyful & Radiant',
  'Fierce & Intense',
];

const BODY_MOVEMENT_OPTIONS = [
  'Subtle head sway and expressive hand gestures',
  'Rhythmic shoulder groove and natural microphone framing',
  'Dynamic stage presence with bold upper-body motion',
  'Still emotional gaze directly into camera lens',
  'Fluid contemporary dance rhythm',
];

const BROLL_CATEGORIES = [
  'Establishing Environment',
  'Dance & Choreography',
  'Slow-Motion Atmospheric',
  'Performer Lifestyle Cutaway',
  'Detail & Close-Up Insert',
  'Dynamic Visual Transition',
  'Narrative Storytelling Beat',
];

const WARDROBE_CATEGORIES: WardrobeCategory[] = [
  'Streetwear',
  'Formal',
  'Costume',
  'Futuristic',
  'Casual',
  'Traditional',
];

function getDefaultSettingsForModel(model: ModelEntry | undefined): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!model) return out;
  for (const s of model.settings) {
    out[s.key] = s.defaultValue;
  }
  return out;
}

function mergeSupportedSettings(
  model: ModelEntry | undefined,
  existing: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  if (!model) return {};
  const next: Record<string, string | number | boolean> = {};
  for (const def of model.settings) {
    const prevVal = existing[def.key];
    if (def.type === 'enum') {
      const valid = def.options.some((o) => o.value === String(prevVal));
      next[def.key] = valid ? String(prevVal) : def.defaultValue;
    } else if (def.type === 'boolean') {
      next[def.key] = typeof prevVal === 'boolean' ? prevVal : def.defaultValue;
    } else if (def.type === 'range') {
      const num = typeof prevVal === 'number' ? prevVal : Number(prevVal);
      next[def.key] =
        Number.isFinite(num) && num >= def.min && num <= def.max ? num : def.defaultValue;
    }
  }
  return next;
}

function createInitialScene(
  index: number,
  defaults: {
    characterId: string | null;
    wardrobeId: string | null;
    imageModelId: string;
    nativeLipSyncModelId: string;
    animationModelId: string;
    videoLipSyncModelId: string;
    brollModelId: string;
    startSec: number;
    endSec: number;
    mode?: MusicVideoShotMode;
  }
): MusicVideoScene {
  const mode = defaults.mode || (index === 0 ? 'lipsync' : 'broll');
  return {
    id: `mv_scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: mode === 'lipsync' ? `Verse / Chorus Performance ${index + 1}` : `B-Roll Cutaway ${index + 1}`,
    mode,
    lipSyncPipeline: 'native',
    characterId: defaults.characterId,
    wardrobeId: defaults.wardrobeId,
    audioStartSec: defaults.startSec,
    audioEndSec: defaults.endSec,
    sceneDescription:
      mode === 'lipsync'
        ? 'Performer delivers vocals directly toward the camera with authentic stage presence.'
        : 'Atmospheric cinematic visual sequence moving in rhythm with the music.',
    environmentPrompt: 'Rain-slicked midnight rooftop overlooking city skyline lights with soft volumetric mist',
    cameraFraming: mode === 'lipsync' ? 'Medium Close-Up' : 'Wide Establishing Shot',
    cameraMovement: mode === 'lipsync' ? 'Slow Dolly In' : 'Smooth Steadicam Tracking',
    lightingStyle: 'Moody Cyan & Amber Rim Light',
    visualStyle: 'Anamorphic 35mm Cinema',
    performanceIntensity: 'Natural Confident Singing',
    facialExpression: 'Passionate & Focused',
    bodyMovement: 'Subtle head sway and expressive hand gestures',
    brollCategory: 'Establishing Environment',
    referenceImageUrl: '',
    referenceSource: 'none',
    imageModelId: defaults.imageModelId,
    nativeLipSyncModelId: defaults.nativeLipSyncModelId,
    animationModelId: defaults.animationModelId,
    videoLipSyncModelId: defaults.videoLipSyncModelId,
    brollModelId: defaults.brollModelId,
    modelSettings: {},
    step2Settings: {},
    autoChainStep2: true,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const MusicVideoStudio: React.FC<MusicVideoStudioProps> = ({
  projectId,
  projectTitle,
}) => {
  const {
    models,
    generations,
    uploads,
    characters,
    wardrobes,
    sessionToken,
    calculateTokenCost,
    submitGeneration,
    uploadReferenceFile,
    saveCharacter,
    saveWardrobe,
    composeContinuityPrompt,
    setActiveContinuity,
    showToast,
  } = useRuns();

  // --------------------------------------------------------------------------
  // 1. REAL MODEL CAPABILITY CLASSIFICATION (STRICTLY FROM MODEL_CATALOG)
  // --------------------------------------------------------------------------
  const imageModels = useMemo(
    () => models.filter((m) => m.surface === 'image'),
    [models]
  );

  // Native audio-driven lip sync models (Image + Audio -> Lip-Synced Performance Video)
  const nativeLipSyncModels = useMemo(
    () =>
      models.filter(
        (m) =>
          m.surface === 'video' &&
          (m.lipSyncCapability === 'native_audio_lipsync' ||
            (m.roles.some((r) => r.role === 'audio' && r.required) &&
              m.roles.some((r) => r.role === 'start' && r.kind === 'image')))
      ),
    [models]
  );

  // Video post-process lip sync models (Animated Video + Audio -> Lip-Synced Video)
  const videoLipSyncModels = useMemo(
    () =>
      models.filter(
        (m) =>
          m.surface === 'video' &&
          (m.lipSyncCapability === 'video_lipsync_postprocess' ||
            (m.roles.some((r) => r.role === 'audio' && r.required) &&
              m.roles.some((r) => r.role === 'video' && r.required)))
      ),
    [models]
  );

  // Video-only B-Roll & Animation models (no lip sync required; image-to-video / text-to-video)
  const brollAndAnimationModels = useMemo(
    () =>
      models.filter((m) => {
        if (m.surface !== 'video') return false;
        if (
          m.lipSyncCapability === 'native_audio_lipsync' ||
          m.lipSyncCapability === 'video_lipsync_postprocess'
        ) {
          return false;
        }
        // Exclude models that strictly require both video + source motion transfer or required end-frame
        const requiresVideo = m.roles.some((r) => r.role === 'video' && r.required);
        const requiresEnd = m.roles.some((r) => r.role === 'end' && r.required);
        return !requiresVideo && !requiresEnd;
      }),
    [models]
  );

  const defaultImageModelId = imageModels[0]?.id || 'nano-banana-2-1';
  const defaultNativeLipSyncId = nativeLipSyncModels[0]?.id || 'omnihuman-1-5';
  const defaultVideoLipSyncId = videoLipSyncModels[0]?.id || 'kling-lipsync-audio';
  const defaultBrollModelId =
    brollAndAnimationModels.find((m) => m.id === 'seedance-2-5')?.id ||
    brollAndAnimationModels[0]?.id ||
    'seedance-2-5';

  // --------------------------------------------------------------------------
  // 2. WORKSPACE & AUDIO STATE
  // --------------------------------------------------------------------------
  const storageKey = `spacix_mv_project_${projectId || 'default'}`;
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'performers' | 'direct' | 'assembly'>('direct');

  // Master audio state (non-destructive)
  const [audioTrack, setAudioTrack] = useState<DecodedAudioTrack | null>(null);
  const [audioImportMode, setAudioImportMode] = useState<'upload' | 'url'>('upload');
  const [audioUrlInput, setAudioUrlInput] = useState('');
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showAudioImporter, setShowAudioImporter] = useState(true);
  const [externalPauseSignal, setExternalPauseSignal] = useState(0);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  // Scenes state
  const [scenes, setScenes] = useState<MusicVideoScene[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedMusicVideoState;
        if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
          return parsed.scenes;
        }
      }
    } catch {
      // ignore storage errors
    }
    return [
      createInitialScene(0, {
        characterId: characters[0]?.id || null,
        wardrobeId: wardrobes[0]?.id || null,
        imageModelId: defaultImageModelId,
        nativeLipSyncModelId: defaultNativeLipSyncId,
        animationModelId: defaultBrollModelId,
        videoLipSyncModelId: defaultVideoLipSyncId,
        brollModelId: defaultBrollModelId,
        startSec: 0,
        endSec: 6,
        mode: 'lipsync',
      }),
    ];
  });

  const [activeSceneId, setActiveSceneId] = useState<string>(() => scenes[0]?.id || '');

  // Persist scenes to localStorage
  useEffect(() => {
    try {
      const payload: PersistedMusicVideoState = {
        scenes,
        activeSceneId,
        audioMeta: audioTrack
          ? {
              title: audioTrack.title,
              sourceType: audioTrack.sourceType,
              sourceUrl: audioTrack.sourceUrl,
              durationSec: audioTrack.durationSec,
            }
          : undefined,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore quota issues
    }
  }, [scenes, activeSceneId, audioTrack, storageKey]);

  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) || scenes[0],
    [scenes, activeSceneId]
  );

  const updateActiveScene = (patch: Partial<MusicVideoScene>) => {
    if (!activeScene) return;
    setScenes((prev) =>
      prev.map((s) => (s.id === activeScene.id ? { ...s, ...patch } : s))
    );
  };

  const updateSceneById = (sceneId: string, patch: Partial<MusicVideoScene>) => {
    setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)));
  };

  // Keep Cinema Studio activeContinuity aligned with the active Music Video performer & wardrobe
  useEffect(() => {
    if (!activeScene) return;
    setActiveContinuity((prev) => ({
      ...prev,
      characterIds: activeScene.characterId ? [activeScene.characterId] : prev.characterIds,
      wardrobeId: activeScene.wardrobeId ?? prev.wardrobeId,
    }));
  }, [activeScene?.characterId, activeScene?.wardrobeId, setActiveContinuity]);

  // --------------------------------------------------------------------------
  // 3. PERFORMER & WARDROBE CREATOR STATE
  // --------------------------------------------------------------------------
  const [newCharName, setNewCharName] = useState('');
  const [newCharRole, setNewCharRole] = useState('Lead Vocalist');
  const [newCharPrompt, setNewCharPrompt] = useState(
    'Editorial studio portrait of a charismatic singer, sharp facial clarity, natural skin texture, warm rim lighting, neutral studio background'
  );
  const [newCharAppearance, setNewCharAppearance] = useState('');
  const [newCharFaceUrl, setNewCharFaceUrl] = useState('');
  const [charGenModelId, setCharGenModelId] = useState(defaultImageModelId);
  const [pendingCharGenId, setPendingCharGenId] = useState<string | null>(null);
  const [charBusy, setCharBusy] = useState(false);
  const charPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const [newWardrobeName, setNewWardrobeName] = useState('');
  const [newWardrobeCategory, setNewWardrobeCategory] = useState<WardrobeCategory>('Streetwear');
  const [newWardrobeGarments, setNewWardrobeGarments] = useState(
    'Oversized metallic bomber jacket over structured black ribbed turtleneck, silver layered chains, tailored cargo trousers'
  );
  const [newWardrobeColor, setNewWardrobeColor] = useState('Obsidian Black, Chrome Silver, Cyan Accent');
  const [newWardrobeImgUrl, setNewWardrobeImgUrl] = useState('');
  const [pendingWardrobeGenId, setPendingWardrobeGenId] = useState<string | null>(null);
  const [wardrobeBusy, setWardrobeBusy] = useState(false);
  const wardrobePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // --------------------------------------------------------------------------
  // 4. SCENE REFERENCE & GENERATION STATE
  // --------------------------------------------------------------------------
  const [sceneRefOption, setSceneRefOption] = useState<'create' | 'upload'>('create');
  const [showAdvancedModelSettings, setShowAdvancedModelSettings] = useState(false);
  const [sceneImageBusy, setSceneImageBusy] = useState(false);
  const [videoSubmitBusy, setVideoSubmitBusy] = useState(false);
  const [stageSyncPlaying, setStageSyncPlaying] = useState(false);
  const sceneUploadInputRef = useRef<HTMLInputElement | null>(null);
  const stageVideoRef = useRef<HTMLVideoElement | null>(null);
  const stageAudioRef = useRef<HTMLAudioElement | null>(null);

  // Assembly player state
  const [assemblyPlaying, setAssemblyPlaying] = useState(false);
  const [assemblyTimeSec, setAssemblyTimeSec] = useState(0);
  const assemblyAudioRef = useRef<HTMLAudioElement | null>(null);
  const assemblyVideoRef = useRef<HTMLVideoElement | null>(null);
  const assemblyRafRef = useRef<number | null>(null);
  const lastAssemblySceneRef = useRef<string | null>(null);

  // Track which 2-step scenes already auto-triggered Step 2 to avoid duplicate submits
  const chainedStep1IdsRef = useRef<Set<string>>(new Set());

  // --------------------------------------------------------------------------
  // 5. LIVE GENERATION TRACKING & AUTOMATIC 2-STEP CHAINING
  // --------------------------------------------------------------------------
  const genMap = useMemo(() => {
    const map = new Map<string, (typeof generations)[number]>();
    for (const g of generations) {
      map.set(g.id, g);
    }
    return map;
  }, [generations]);

  // Track character & wardrobe portrait generations
  useEffect(() => {
    if (pendingCharGenId) {
      const g = genMap.get(pendingCharGenId);
      if (g?.status === 'completed' && g.outputs[0]?.url) {
        setNewCharFaceUrl(g.outputs[0].url);
        setPendingCharGenId(null);
        setCharBusy(false);
        showToast('Performer portrait ready — review and save to My Elements');
      } else if (g?.status === 'failed' || g?.status === 'canceled') {
        setPendingCharGenId(null);
        setCharBusy(false);
      }
    }
    if (pendingWardrobeGenId) {
      const g = genMap.get(pendingWardrobeGenId);
      if (g?.status === 'completed' && g.outputs[0]?.url) {
        setNewWardrobeImgUrl(g.outputs[0].url);
        setPendingWardrobeGenId(null);
        setWardrobeBusy(false);
        showToast('Outfit reference ready — save to reuse across scenes');
      } else if (g?.status === 'failed' || g?.status === 'canceled') {
        setPendingWardrobeGenId(null);
        setWardrobeBusy(false);
      }
    }
  }, [genMap, pendingCharGenId, pendingWardrobeGenId, showToast]);

  // Sync completed scene reference images, Step 1 animations, and final video clips
  useEffect(() => {
    let changed = false;
    const step2Triggers: Array<{ scene: MusicVideoScene; animatedUrl: string }> = [];

    const nextScenes = scenes.map((sc) => {
      let updated = sc;

      // Scene still image completed
      if (sc.imageGenId) {
        const g = genMap.get(sc.imageGenId);
        if (g?.status === 'completed' && g.outputs[0]?.url && sc.referenceImageUrl !== g.outputs[0].url) {
          updated = {
            ...updated,
            referenceImageUrl: g.outputs[0].url,
            referenceSource: 'generated',
            lastError: undefined,
          };
          changed = true;
        } else if ((g?.status === 'failed' || g?.status === 'nsfw') && g.error && sc.lastError !== g.error) {
          updated = { ...updated, lastError: g.error };
          changed = true;
        }
      }

      // Step 1 animated video completed (for 2-step lip sync)
      if (sc.animatedClipGenId) {
        const g = genMap.get(sc.animatedClipGenId);
        if (g?.status === 'completed' && g.outputs[0]?.url && sc.animatedClipUrl !== g.outputs[0].url) {
          updated = {
            ...updated,
            animatedClipUrl: g.outputs[0].url,
            lastError: undefined,
          };
          changed = true;
          if (
            sc.mode === 'lipsync' &&
            sc.lipSyncPipeline === 'two_step' &&
            sc.autoChainStep2 &&
            !chainedStep1IdsRef.current.has(sc.animatedClipGenId)
          ) {
            chainedStep1IdsRef.current.add(sc.animatedClipGenId);
            step2Triggers.push({ scene: updated, animatedUrl: g.outputs[0].url });
          }
        } else if ((g?.status === 'failed' || g?.status === 'nsfw') && g.error && sc.lastError !== g.error) {
          updated = { ...updated, lastError: g.error };
          changed = true;
        }
      }

      // Final video clip completed
      if (sc.finalClipGenId) {
        const g = genMap.get(sc.finalClipGenId);
        if (g?.status === 'completed' && g.outputs[0]?.url && sc.finalClipUrl !== g.outputs[0].url) {
          updated = {
            ...updated,
            finalClipUrl: g.outputs[0].url,
            lastError: undefined,
          };
          changed = true;
        } else if ((g?.status === 'failed' || g?.status === 'nsfw') && g.error && sc.lastError !== g.error) {
          updated = { ...updated, lastError: g.error };
          changed = true;
        }
      }

      return updated;
    });

    if (changed) {
      setScenes(nextScenes);
    }

    // Automatically launch Step 2 lip-sync pass when Step 1 completes
    if (step2Triggers.length > 0) {
      for (const item of step2Triggers) {
        void runStep2VideoLipSync(item.scene, item.animatedUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genMap]);

  // --------------------------------------------------------------------------
  // 6. ACTIVE MODELS & DYNAMIC SETTINGS FOR THE SELECTED SCENE
  // --------------------------------------------------------------------------
  const activeCharacter = useMemo(
    () => characters.find((c) => c.id === activeScene?.characterId) || null,
    [characters, activeScene?.characterId]
  );
  const activeWardrobe = useMemo(
    () => wardrobes.find((w) => w.id === activeScene?.wardrobeId) || null,
    [wardrobes, activeScene?.wardrobeId]
  );

  const selectedImageModel = useMemo(
    () =>
      imageModels.find((m) => m.id === activeScene?.imageModelId) ||
      imageModels[0],
    [imageModels, activeScene?.imageModelId]
  );

  const primaryVideoModel = useMemo<ModelEntry | undefined>(() => {
    if (!activeScene) return brollAndAnimationModels[0];
    if (activeScene.mode === 'broll') {
      return (
        brollAndAnimationModels.find((m) => m.id === activeScene.brollModelId) ||
        brollAndAnimationModels[0]
      );
    }
    if (activeScene.lipSyncPipeline === 'native') {
      return (
        nativeLipSyncModels.find((m) => m.id === activeScene.nativeLipSyncModelId) ||
        nativeLipSyncModels[0]
      );
    }
    return (
      brollAndAnimationModels.find((m) => m.id === activeScene.animationModelId) ||
      brollAndAnimationModels[0]
    );
  }, [activeScene, brollAndAnimationModels, nativeLipSyncModels]);

  const step2LipSyncModel = useMemo<ModelEntry | undefined>(() => {
    if (!activeScene) return videoLipSyncModels[0];
    return (
      videoLipSyncModels.find((m) => m.id === activeScene.videoLipSyncModelId) ||
      videoLipSyncModels[0]
    );
  }, [activeScene, videoLipSyncModels]);

  const resolvedPrimarySettings = useMemo(
    () => mergeSupportedSettings(primaryVideoModel, activeScene?.modelSettings || {}),
    [primaryVideoModel, activeScene?.modelSettings]
  );

  const resolvedStep2Settings = useMemo(
    () => mergeSupportedSettings(step2LipSyncModel, activeScene?.step2Settings || {}),
    [step2LipSyncModel, activeScene?.step2Settings]
  );

  // Live token estimates using real calculateTokenCost
  const sceneImageTokens = useMemo(() => {
    if (!selectedImageModel) return 0;
    const ar = String(resolvedPrimarySettings.aspect_ratio || '16:9');
    return calculateTokenCost(selectedImageModel.id, {
      ...getDefaultSettingsForModel(selectedImageModel),
      aspect_ratio: ar,
    });
  }, [selectedImageModel, resolvedPrimarySettings.aspect_ratio, calculateTokenCost]);

  const trimDurationSec = useMemo(() => {
    if (!activeScene) return 5;
    return Math.max(0.5, activeScene.audioEndSec - activeScene.audioStartSec);
  }, [activeScene]);

  const videoTokenBreakdown = useMemo(() => {
    if (!activeScene || !primaryVideoModel) {
      return { primary: 0, step2: 0, total: 0 };
    }
    const effectiveDur =
      primaryVideoModel.billingUnit === 'per_second' && !resolvedPrimarySettings.duration
        ? Math.max(1, Math.ceil(trimDurationSec))
        : resolvedPrimarySettings.duration;

    const primaryCost = calculateTokenCost(primaryVideoModel.id, {
      ...resolvedPrimarySettings,
      ...(effectiveDur !== undefined ? { duration: effectiveDur } : {}),
    });

    if (activeScene.mode === 'lipsync' && activeScene.lipSyncPipeline === 'two_step' && step2LipSyncModel) {
      const step2Cost = calculateTokenCost(step2LipSyncModel.id, {
        ...resolvedStep2Settings,
        duration: Math.max(1, Math.ceil(trimDurationSec)),
      });
      return {
        primary: primaryCost,
        step2: step2Cost,
        total: primaryCost + step2Cost,
      };
    }

    return { primary: primaryCost, step2: 0, total: primaryCost };
  }, [
    activeScene,
    primaryVideoModel,
    step2LipSyncModel,
    resolvedPrimarySettings,
    resolvedStep2Settings,
    trimDurationSec,
    calculateTokenCost,
  ]);

  // --------------------------------------------------------------------------
  // 7. AUDIO IMPORT HANDLERS (FILE UPLOAD + DIRECT URL)
  // --------------------------------------------------------------------------
  const applyDecodedAudioTrack = (decoded: DecodedAudioTrack) => {
    if (audioTrack?.objectUrl && audioTrack.objectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioTrack.objectUrl);
    }
    setAudioTrack(decoded);
    setAudioError(null);
    setShowAudioImporter(false);

    // Clamp all existing scene trim ranges cleanly into the new song's duration
    setScenes((prev) =>
      prev.map((sc, idx) => {
        const defaultSpan = Math.min(6, decoded.durationSec);
        const start = sc.audioStartSec >= decoded.durationSec ? Math.min(idx * defaultSpan, Math.max(0, decoded.durationSec - defaultSpan)) : sc.audioStartSec;
        const end = sc.audioEndSec <= start || sc.audioEndSec > decoded.durationSec ? Math.min(decoded.durationSec, start + defaultSpan) : sc.audioEndSec;
        const clamped = clampTrimRange(start, end, decoded.durationSec, 0.5);
        return { ...sc, audioStartSec: clamped.startSec, audioEndSec: clamped.endSec };
      })
    );
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioBusy(true);
    setAudioError(null);
    try {
      const decoded = await decodeAudioFromFile(file);
      // Persist original audio via /api/upload so it stays available across sessions
      const uploaded = await uploadReferenceFile({
        label: decoded.title,
        contentType: decoded.contentType,
        bytes: decoded.bytes,
        dataUrl: decoded.dataUrl,
      });

      const trackObj: DecodedAudioTrack = {
        id: uploaded?.id || `trk_${Date.now()}`,
        title: decoded.title,
        sourceType: 'upload',
        originalPublicUrl: uploaded?.publicUrl || decoded.dataUrl,
        objectUrl: decoded.objectUrl,
        contentType: decoded.contentType,
        bytes: decoded.bytes,
        durationSec: decoded.durationSec,
        peaks: decoded.peaks,
        audioBuffer: decoded.audioBuffer,
      };
      applyDecodedAudioTrack(trackObj);
      showToast(`Loaded audio track "${decoded.title}" (${formatTimecode(decoded.durationSec)})`);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Unable to load audio file.');
    } finally {
      setAudioBusy(false);
      e.target.value = '';
    }
  };

  const handleAudioUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioUrlInput.trim()) return;
    setAudioBusy(true);
    setAudioError(null);
    try {
      const trackObj = await importAudioFromDirectUrl(audioUrlInput, sessionToken);
      applyDecodedAudioTrack(trackObj);
      showToast(`Imported "${trackObj.title}" (${formatTimecode(trackObj.durationSec)})`);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Unable to import audio from URL.');
    } finally {
      setAudioBusy(false);
    }
  };

  // --------------------------------------------------------------------------
  // 8. PERFORMER & WARDROBE HANDLERS
  // --------------------------------------------------------------------------
  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read selected file.'));
      reader.readAsDataURL(file);
    });

  const handleUploadCharacterPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCharBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploaded = await uploadReferenceFile({
        label: newCharName.trim() || file.name,
        contentType: file.type || 'image/jpeg',
        bytes: file.size,
        dataUrl,
      });
      if (uploaded?.publicUrl) {
        setNewCharFaceUrl(uploaded.publicUrl);
        if (!newCharName.trim()) {
          setNewCharName(file.name.replace(/\.[^.]+$/, ''));
        }
        showToast('Performer photo uploaded');
      }
    } catch {
      showToast('Failed to upload performer photograph');
    } finally {
      setCharBusy(false);
      e.target.value = '';
    }
  };

  const handleGenerateCharacterFace = async () => {
    if (!newCharPrompt.trim()) {
      showToast('Describe the performer face and appearance first');
      return;
    }
    setCharBusy(true);
    const fullPrompt = [
      newCharPrompt.trim(),
      newCharAppearance.trim(),
      'consistent clear facial identity portrait, studio photography, front-facing clarity for lip-sync continuity',
    ]
      .filter(Boolean)
      .join(', ');

    const res = await submitGeneration({
      surface: 'image',
      modelId: charGenModelId,
      mode: 'Create',
      prompt: fullPrompt,
      settings: {
        ...getDefaultSettingsForModel(imageModels.find((m) => m.id === charGenModelId)),
        aspect_ratio: '3:4',
      },
      media: [],
    });

    if (res.ok && res.generation) {
      setPendingCharGenId(res.generation.id);
      showToast('Generating performer identity portrait...');
    } else {
      setCharBusy(false);
      showToast(res.error || 'Could not start portrait generation');
    }
  };

  const handleSavePerformer = async () => {
    const name = newCharName.trim();
    if (!name) {
      showToast('Enter a performer name before saving');
      return;
    }
    setCharBusy(true);
    try {
      const saved = await saveCharacter({
        name,
        roleTitle: newCharRole.trim() || 'Music Video Performer',
        faceReferenceUrl: newCharFaceUrl,
        facialIdentityLock: true,
        facePromptDescriptor: `${newCharPrompt.trim()} ${newCharAppearance.trim()}`.trim(),
        distinctiveFeatures: newCharAppearance.trim(),
        consistencyLock: true,
        continuityNotes: `Music Video Cast Member for ${projectTitle}`,
      });
      if (saved) {
        updateActiveScene({ characterId: saved.id });
        setNewCharName('');
        setNewCharAppearance('');
        setNewCharFaceUrl('');
        showToast(`Saved performer "@${saved.name}" to My Elements & locked to active scene`);
      }
    } finally {
      setCharBusy(false);
    }
  };

  const handleUploadWardrobePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWardrobeBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploaded = await uploadReferenceFile({
        label: newWardrobeName.trim() || file.name,
        contentType: file.type || 'image/jpeg',
        bytes: file.size,
        dataUrl,
      });
      if (uploaded?.publicUrl) {
        setNewWardrobeImgUrl(uploaded.publicUrl);
        showToast('Outfit reference uploaded');
      }
    } finally {
      setWardrobeBusy(false);
      e.target.value = '';
    }
  };

  const handleGenerateWardrobeVisual = async () => {
    if (!newWardrobeGarments.trim()) {
      showToast('Describe the outfit or costume first');
      return;
    }
    setWardrobeBusy(true);
    const res = await submitGeneration({
      surface: 'image',
      modelId: charGenModelId,
      mode: 'Create',
      prompt: `Music video wardrobe costume lookbook sheet, ${newWardrobeCategory} outfit: ${newWardrobeGarments.trim()}, color palette: ${newWardrobeColor}, crisp editorial studio lighting, full garment visibility`,
      settings: {
        ...getDefaultSettingsForModel(imageModels.find((m) => m.id === charGenModelId)),
        aspect_ratio: '3:4',
      },
      media: [],
    });
    if (res.ok && res.generation) {
      setPendingWardrobeGenId(res.generation.id);
      showToast('Generating outfit concept...');
    } else {
      setWardrobeBusy(false);
      showToast(res.error || 'Could not generate outfit reference');
    }
  };

  const handleSaveWardrobe = async () => {
    const name = newWardrobeName.trim();
    if (!name) {
      showToast('Enter an outfit name before saving');
      return;
    }
    setWardrobeBusy(true);
    try {
      const saved = await saveWardrobe({
        name,
        category: newWardrobeCategory,
        description: `${newWardrobeCategory} stage look: ${newWardrobeGarments.trim()}`,
        garments: newWardrobeGarments.trim(),
        colorPalette: newWardrobeColor.trim(),
        referenceImageUrl: newWardrobeImgUrl,
        assignedCharacterIds: activeScene?.characterId ? [activeScene.characterId] : [],
        sceneContinuityLock: true,
      });
      if (saved) {
        updateActiveScene({ wardrobeId: saved.id });
        setNewWardrobeName('');
        setNewWardrobeImgUrl('');
        showToast(`Saved outfit "${saved.name}" to My Elements & linked to scene`);
      }
    } finally {
      setWardrobeBusy(false);
    }
  };

  // --------------------------------------------------------------------------
  // 9. SCENE CREATION (OPTION A: GENERATE IMAGE / OPTION B: UPLOAD REFERENCE)
  // --------------------------------------------------------------------------
  const handleUploadSceneReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeScene) return;
    setSceneImageBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploaded = await uploadReferenceFile({
        label: `${activeScene.title} Reference`,
        contentType: file.type || 'image/jpeg',
        bytes: file.size,
        dataUrl,
      });
      if (uploaded?.publicUrl) {
        updateActiveScene({
          referenceImageUrl: uploaded.publicUrl,
          referenceSource: 'uploaded',
          lastError: undefined,
        });
        showToast('Scene reference frame uploaded and ready for animation');
      }
    } catch {
      showToast('Could not upload scene image');
    } finally {
      setSceneImageBusy(false);
      e.target.value = '';
    }
  };

  const handleGenerateSceneImage = async () => {
    if (!activeScene || !selectedImageModel) return;
    setSceneImageBusy(true);
    try {
      const rawPrompt = [
        activeScene.sceneDescription.trim(),
        activeScene.environmentPrompt.trim() ? `Environment: ${activeScene.environmentPrompt.trim()}` : '',
        `Framing: ${activeScene.cameraFraming}`,
        `Lighting: ${activeScene.lightingStyle}`,
        `Visual style: ${activeScene.visualStyle}`,
        activeScene.mode === 'lipsync'
          ? 'Performer facing toward camera with unobstructed clear face and mouth visibility for vocal performance'
          : `B-Roll mood: ${activeScene.brollCategory}`,
      ]
        .filter(Boolean)
        .join('. ');

      const composed = composeContinuityPrompt(
        rawPrompt,
        {
          characterIds: activeScene.characterId ? [activeScene.characterId] : [],
          wardrobeId: activeScene.wardrobeId,
        },
        []
      );

      // Keep only media roles supported by the chosen image model
      const supportsRef = selectedImageModel.roles.some((r) => r.role === 'reference');
      const supportsStart = selectedImageModel.roles.some((r) => r.role === 'start');
      const filteredMedia: MediaSlotInput[] = [];
      for (const m of composed.media) {
        if (m.kind === 'image' && supportsRef) {
          filteredMedia.push({ ...m, role: 'reference' });
        } else if (m.kind === 'image' && supportsStart && filteredMedia.length === 0) {
          filteredMedia.push({ ...m, role: 'start' });
        }
      }

      const arVal = String(resolvedPrimarySettings.aspect_ratio || '16:9');
      const imgSettings = mergeSupportedSettings(selectedImageModel, {
        ...getDefaultSettingsForModel(selectedImageModel),
        aspect_ratio: arVal,
      });

      const res = await submitGeneration({
        surface: 'image',
        modelId: selectedImageModel.id,
        mode: 'Create',
        prompt: composed.prompt,
        settings: imgSettings,
        media: filteredMedia.slice(0, 4),
      });

      if (res.ok && res.generation) {
        updateActiveScene({ imageGenId: res.generation.id, lastError: undefined });
        showToast('Generating scene reference frame...');
      } else {
        updateActiveScene({ lastError: res.error || 'Scene image generation failed.' });
        showToast(res.error || 'Scene image generation failed');
      }
    } finally {
      setSceneImageBusy(false);
    }
  };

  // --------------------------------------------------------------------------
  // 10. TRIMMED AUDIO SLICING + VIDEO / LIP SYNC GENERATION EXECUTION
  // --------------------------------------------------------------------------
  const prepareTrimmedAudioUpload = async (scene: MusicVideoScene): Promise<string> => {
    if (!audioTrack) {
      throw new Error('Import a music track first before running Lip Sync Performance.');
    }
    const sliced = await sliceAudioBufferToWav(
      audioTrack.audioBuffer,
      scene.audioStartSec,
      scene.audioEndSec
    );
    URL.revokeObjectURL(sliced.objectUrl);

    const uploaded = await uploadReferenceFile({
      label: `${audioTrack.title} [${formatTimecode(sliced.startSec)}-${formatTimecode(sliced.endSec)}].wav`,
      contentType: 'audio/wav',
      bytes: sliced.bytes,
      dataUrl: sliced.dataUrl,
    });
    if (!uploaded?.publicUrl) {
      throw new Error('Failed to upload trimmed audio segment. Check your session and try again.');
    }
    return uploaded.publicUrl;
  };

  const runStep2VideoLipSync = async (scene: MusicVideoScene, sourceVideoUrl: string) => {
    const lipModel =
      videoLipSyncModels.find((m) => m.id === scene.videoLipSyncModelId) ||
      videoLipSyncModels[0];
    if (!lipModel) {
      updateSceneById(scene.id, { lastError: 'No compatible video lip-sync model found.' });
      return;
    }

    try {
      const trimmedAudioUrl =
        scene.lastTrimmedAudioUrl || (await prepareTrimmedAudioUpload(scene));

      const media: MediaSlotInput[] = [
        { role: 'video', kind: 'video', url: sourceVideoUrl, label: `${scene.title} Animation` },
        { role: 'audio', kind: 'audio', url: trimmedAudioUrl, label: 'Trimmed Vocal Audio' },
      ];
      const settings = mergeSupportedSettings(lipModel, {
        ...scene.step2Settings,
        aspect_ratio: String(scene.modelSettings.aspect_ratio || scene.step2Settings.aspect_ratio || '16:9'),
      });

      const res = await submitGeneration({
        surface: 'video',
        modelId: lipModel.id,
        mode: lipModel.modes[0] || 'Video Lip Sync',
        prompt: `Synchronize performer mouth movements precisely to the vocal audio segment. ${scene.performanceIntensity}, ${scene.facialExpression}.`,
        settings,
        media,
      });

      if (res.ok && res.generation) {
        updateSceneById(scene.id, {
          finalClipGenId: res.generation.id,
          lastTrimmedAudioUrl: trimmedAudioUrl,
          lastError: undefined,
        });
        showToast(`Step 2 Lip Sync started on ${lipModel.label}`);
      } else {
        updateSceneById(scene.id, { lastError: res.error || 'Step 2 Lip Sync failed to launch.' });
        showToast(res.error || 'Step 2 Lip Sync failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lip sync step failed.';
      updateSceneById(scene.id, { lastError: msg });
      showToast(msg);
    }
  };

  const handleGenerateSceneVideo = async (sceneToRun?: MusicVideoScene) => {
    const scene = sceneToRun || activeScene;
    if (!scene) return;

    // Validate requirements per mode
    if (scene.mode === 'lipsync') {
      if (!audioTrack) {
        showToast('Import an audio track and select a trim segment for Lip Sync Performance');
        setShowAudioImporter(true);
        return;
      }
      if (!scene.referenceImageUrl) {
        showToast('Create or upload a scene reference image first');
        return;
      }
    }

    const activeModel =
      scene.mode === 'broll'
        ? brollAndAnimationModels.find((m) => m.id === scene.brollModelId) || brollAndAnimationModels[0]
        : scene.lipSyncPipeline === 'native'
        ? nativeLipSyncModels.find((m) => m.id === scene.nativeLipSyncModelId) || nativeLipSyncModels[0]
        : brollAndAnimationModels.find((m) => m.id === scene.animationModelId) || brollAndAnimationModels[0];

    if (!activeModel) {
      showToast('No compatible video model available for this mode');
      return;
    }

    const requiresStartImage = activeModel.roles.some((r) => r.role === 'start' && r.required);
    if (requiresStartImage && !scene.referenceImageUrl) {
      showToast(`${activeModel.label} requires a scene reference image. Create or upload one first.`);
      return;
    }

    setVideoSubmitBusy(true);
    updateSceneById(scene.id, { lastError: undefined });

    try {
      const baseDirection =
        scene.mode === 'lipsync'
          ? [
              scene.sceneDescription.trim(),
              `Vocal performance direction: ${scene.performanceIntensity}, expression: ${scene.facialExpression}, movement: ${scene.bodyMovement}`,
              `Camera: ${scene.cameraFraming}, ${scene.cameraMovement}`,
              `Lighting & look: ${scene.lightingStyle}, ${scene.visualStyle}`,
            ]
              .filter(Boolean)
              .join('. ')
          : [
              `B-Roll (${scene.brollCategory}): ${scene.sceneDescription.trim()}`,
              scene.environmentPrompt.trim() ? `Environment: ${scene.environmentPrompt.trim()}` : '',
              `Camera: ${scene.cameraFraming}, ${scene.cameraMovement}`,
              `Lighting & look: ${scene.lightingStyle}, ${scene.visualStyle}`,
              'Pure cinematic B-roll motion synchronized visually to music rhythm, no direct talking-to-camera lip sync required',
            ]
              .filter(Boolean)
              .join('. ');

      const composed = composeContinuityPrompt(
        baseDirection,
        {
          characterIds: scene.characterId ? [scene.characterId] : [],
          wardrobeId: scene.wardrobeId,
        },
        []
      );

      const settings = mergeSupportedSettings(activeModel, scene.modelSettings);

      // CASE 1: Mode A — Native 1-Step Audio Lip Sync (e.g. OmniHuman 1.5)
      if (scene.mode === 'lipsync' && scene.lipSyncPipeline === 'native') {
        const trimmedAudioUrl = await prepareTrimmedAudioUpload(scene);
        const media: MediaSlotInput[] = [
          {
            role: 'start',
            kind: 'image',
            url: scene.referenceImageUrl,
            label: `${scene.title} Performer Frame`,
          },
          {
            role: 'audio',
            kind: 'audio',
            url: trimmedAudioUrl,
            label: `Trimmed Audio (${formatTimecode(scene.audioStartSec)}-${formatTimecode(scene.audioEndSec)})`,
          },
        ];

        const res = await submitGeneration({
          surface: 'video',
          modelId: activeModel.id,
          mode: activeModel.modes[0] || 'Audio Lip Sync',
          prompt: composed.prompt,
          settings,
          media,
        });

        if (res.ok && res.generation) {
          updateSceneById(scene.id, {
            finalClipGenId: res.generation.id,
            lastTrimmedAudioUrl: trimmedAudioUrl,
          });
          showToast(`Lip Sync Performance queued on ${activeModel.label}`);
        } else {
          updateSceneById(scene.id, { lastError: res.error || 'Generation failed.' });
          showToast(res.error || 'Could not start lip sync generation');
        }
        return;
      }

      // CASE 2: Mode A — Two-Step Animation -> Lip Sync Pipeline (Run Step 1 Animation first, pre-slice audio)
      if (scene.mode === 'lipsync' && scene.lipSyncPipeline === 'two_step') {
        const trimmedAudioUrl = await prepareTrimmedAudioUpload(scene);
        const media: MediaSlotInput[] = [];
        if (scene.referenceImageUrl && activeModel.roles.some((r) => r.role === 'start')) {
          media.push({
            role: 'start',
            kind: 'image',
            url: scene.referenceImageUrl,
            label: `${scene.title} Start Frame`,
          });
        }

        const res = await submitGeneration({
          surface: 'video',
          modelId: activeModel.id,
          mode: activeModel.modes[0] || 'Create Video',
          prompt: composed.prompt,
          settings,
          media,
        });

        if (res.ok && res.generation) {
          updateSceneById(scene.id, {
            animatedClipGenId: res.generation.id,
            lastTrimmedAudioUrl: trimmedAudioUrl,
          });
          showToast(
            scene.autoChainStep2
              ? `Step 1 Animation started on ${activeModel.label} — Step 2 Lip Sync will auto-run upon completion`
              : `Step 1 Animation started on ${activeModel.label}`
          );
        } else {
          updateSceneById(scene.id, { lastError: res.error || 'Step 1 animation failed.' });
          showToast(res.error || 'Step 1 animation failed');
        }
        return;
      }

      // CASE 3: Mode B — B-Roll Video Generation (No lip-sync model required)
      const media: MediaSlotInput[] = [];
      if (scene.referenceImageUrl && activeModel.roles.some((r) => r.role === 'start')) {
        media.push({
          role: 'start',
          kind: 'image',
          url: scene.referenceImageUrl,
          label: `${scene.title} B-Roll Frame`,
        });
      } else if (scene.referenceImageUrl && activeModel.roles.some((r) => r.role === 'reference')) {
        media.push({
          role: 'reference',
          kind: 'image',
          url: scene.referenceImageUrl,
          label: `${scene.title} Reference`,
        });
      }

      const res = await submitGeneration({
        surface: 'video',
        modelId: activeModel.id,
        mode: activeModel.modes[0] || 'Create Video',
        prompt: composed.prompt,
        settings,
        media,
      });

      if (res.ok && res.generation) {
        updateSceneById(scene.id, { finalClipGenId: res.generation.id });
        showToast(`B-Roll clip queued on ${activeModel.label}`);
      } else {
        updateSceneById(scene.id, { lastError: res.error || 'B-Roll generation failed.' });
        showToast(res.error || 'B-Roll generation failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation request failed.';
      updateSceneById(scene.id, { lastError: msg });
      showToast(msg);
    } finally {
      setVideoSubmitBusy(false);
    }
  };

  // --------------------------------------------------------------------------
  // 11. SCENE SEQUENCE MANAGEMENT & MASTER ASSEMBLY PLAYER
  // --------------------------------------------------------------------------
  const handleAddScene = (mode: MusicVideoShotMode) => {
    const last = scenes[scenes.length - 1];
    const songDur = audioTrack?.durationSec || 60;
    const nextStart = last ? Math.min(last.audioEndSec, Math.max(0, songDur - 5)) : 0;
    const nextEnd = Math.min(songDur, nextStart + 5);
    const clamped = clampTrimRange(nextStart, nextEnd, songDur, 0.5);

    const created = createInitialScene(scenes.length, {
      characterId: activeScene?.characterId || characters[0]?.id || null,
      wardrobeId: activeScene?.wardrobeId || wardrobes[0]?.id || null,
      imageModelId: activeScene?.imageModelId || defaultImageModelId,
      nativeLipSyncModelId: activeScene?.nativeLipSyncModelId || defaultNativeLipSyncId,
      animationModelId: activeScene?.animationModelId || defaultBrollModelId,
      videoLipSyncModelId: activeScene?.videoLipSyncModelId || defaultVideoLipSyncId,
      brollModelId: activeScene?.brollModelId || defaultBrollModelId,
      startSec: clamped.startSec,
      endSec: clamped.endSec,
      mode,
    });
    setScenes((prev) => [...prev, created]);
    setActiveSceneId(created.id);
    setActiveWorkspaceTab('direct');
    showToast(`Added ${mode === 'lipsync' ? 'Lip Sync' : 'B-Roll'} Scene ${scenes.length + 1}`);
  };

  const handleDuplicateScene = (scene: MusicVideoScene) => {
    const songDur = audioTrack?.durationSec || 60;
    const span = Math.max(2, scene.audioEndSec - scene.audioStartSec);
    const nextStart = Math.min(scene.audioEndSec, Math.max(0, songDur - span));
    const clamped = clampTrimRange(nextStart, nextStart + span, songDur, 0.5);
    const copy: MusicVideoScene = {
      ...scene,
      id: `mv_scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: `${scene.title} (Copy)`,
      audioStartSec: clamped.startSec,
      audioEndSec: clamped.endSec,
      imageGenId: undefined,
      animatedClipGenId: undefined,
      animatedClipUrl: undefined,
      finalClipGenId: undefined,
      finalClipUrl: undefined,
      lastError: undefined,
    };
    setScenes((prev) => [...prev, copy]);
    setActiveSceneId(copy.id);
  };

  const handleMoveScene = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= scenes.length) return;
    setScenes((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const handleDeleteScene = (id: string) => {
    if (scenes.length <= 1) {
      showToast('Keep at least one scene in your music video');
      return;
    }
    setScenes((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeSceneId === id && next[0]) {
        setActiveSceneId(next[0].id);
      }
      return next;
    });
  };

  // Stage preview: play active scene's rendered video synced with its exact trimmed audio segment
  const handleToggleStageSyncedPreview = async () => {
    const vid = stageVideoRef.current;
    const aud = stageAudioRef.current;
    if (!vid || !activeScene) return;

    if (stageSyncPlaying) {
      vid.pause();
      aud?.pause();
      setStageSyncPlaying(false);
      return;
    }

    setExternalPauseSignal((n) => n + 1);
    vid.currentTime = 0;
    if (aud && audioTrack) {
      aud.currentTime = activeScene.audioStartSec;
      vid.muted = true; // Play clean master audio segment without double audio
    } else {
      vid.muted = false;
    }
    try {
      await vid.play();
      if (aud && audioTrack) {
        await aud.play();
      }
      setStageSyncPlaying(true);
    } catch {
      setStageSyncPlaying(false);
    }
  };

  useEffect(() => {
    if (!stageSyncPlaying || !activeScene || !audioTrack) return;
    const interval = window.setInterval(() => {
      const aud = stageAudioRef.current;
      const vid = stageVideoRef.current;
      if (!aud || !vid) return;
      if (aud.currentTime >= activeScene.audioEndSec - 0.04 || vid.ended) {
        aud.pause();
        vid.pause();
        setStageSyncPlaying(false);
      }
    }, 60);
    return () => window.clearInterval(interval);
  }, [stageSyncPlaying, activeScene, audioTrack]);

  // Assembly player: find scene covering assemblyTimeSec (or sequentially fallback)
  const assemblySortedScenes = useMemo(
    () => [...scenes].sort((a, b) => a.audioStartSec - b.audioStartSec),
    [scenes]
  );

  const assemblyCurrentScene = useMemo(() => {
    const exact = assemblySortedScenes.find(
      (s) => assemblyTimeSec >= s.audioStartSec && assemblyTimeSec < s.audioEndSec
    );
    return exact || assemblySortedScenes[0] || null;
  }, [assemblySortedScenes, assemblyTimeSec]);

  useEffect(() => {
    const tick = () => {
      const aud = assemblyAudioRef.current;
      if (aud && !aud.paused) {
        setAssemblyTimeSec(aud.currentTime);
        assemblyRafRef.current = requestAnimationFrame(tick);
      }
    };
    if (assemblyPlaying) {
      assemblyRafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (assemblyRafRef.current !== null) {
        cancelAnimationFrame(assemblyRafRef.current);
        assemblyRafRef.current = null;
      }
    };
  }, [assemblyPlaying]);

  // Sync Assembly video clip whenever scene switches during playback
  useEffect(() => {
    const vid = assemblyVideoRef.current;
    if (!vid || !assemblyCurrentScene?.finalClipUrl) return;
    if (lastAssemblySceneRef.current !== assemblyCurrentScene.id) {
      lastAssemblySceneRef.current = assemblyCurrentScene.id;
      const localOffset = Math.max(0, assemblyTimeSec - assemblyCurrentScene.audioStartSec);
      vid.currentTime = Math.min(localOffset, Number.isFinite(vid.duration) ? vid.duration : localOffset);
      if (assemblyPlaying) {
        vid.play().catch(() => {});
      }
    }
  }, [assemblyCurrentScene, assemblyPlaying, assemblyTimeSec]);

  const handleToggleAssemblyPlay = async () => {
    const aud = assemblyAudioRef.current;
    const vid = assemblyVideoRef.current;
    if (assemblyPlaying) {
      aud?.pause();
      vid?.pause();
      setAssemblyPlaying(false);
      return;
    }
    setExternalPauseSignal((n) => n + 1);
    if (aud && audioTrack) {
      try {
        await aud.play();
        if (vid && assemblyCurrentScene?.finalClipUrl) {
          vid.muted = true;
          await vid.play().catch(() => {});
        }
        setAssemblyPlaying(true);
      } catch {
        setAssemblyPlaying(false);
      }
    } else if (vid && assemblyCurrentScene?.finalClipUrl) {
      vid.muted = false;
      await vid.play().catch(() => {});
      setAssemblyPlaying(true);
    } else {
      showToast('Import an audio track or render a clip to preview the assembled music video');
    }
  };

  const handleExportProjectManifest = () => {
    const manifest = {
      projectTitle,
      exportedAt: new Date().toISOString(),
      audioTrack: audioTrack
        ? {
            title: audioTrack.title,
            sourceType: audioTrack.sourceType,
            sourceUrl: audioTrack.sourceUrl || null,
            durationSec: audioTrack.durationSec,
          }
        : null,
      scenes: scenes.map((s, idx) => ({
        order: idx + 1,
        title: s.title,
        mode: s.mode,
        audioRange: {
          startSec: s.audioStartSec,
          endSec: s.audioEndSec,
          durationSec: Math.round((s.audioEndSec - s.audioStartSec) * 100) / 100,
        },
        performer: characters.find((c) => c.id === s.characterId)?.name || null,
        wardrobe: wardrobes.find((w) => w.id === s.wardrobeId)?.name || null,
        referenceImageUrl: s.referenceImageUrl || null,
        finalClipUrl: s.finalClipUrl || null,
      })),
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-music-video-edl.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Music Video Sequence Manifest (EDL JSON)');
  };

  // Timeline scene markers
  const timelineMarkers = useMemo<TimelineSceneMarker[]>(
    () =>
      scenes.map((sc, idx) => ({
        id: sc.id,
        index: idx,
        title: sc.title,
        mode: sc.mode,
        startSec: sc.audioStartSec,
        endSec: sc.audioEndSec,
        hasRenderedVideo: Boolean(sc.finalClipUrl),
        isActive: sc.id === activeScene?.id,
      })),
    [scenes, activeScene?.id]
  );

  // Active generation live status objects
  const activeImageGen = activeScene?.imageGenId ? genMap.get(activeScene.imageGenId) : undefined;
  const activeStep1Gen = activeScene?.animatedClipGenId
    ? genMap.get(activeScene.animatedClipGenId)
    : undefined;
  const activeFinalGen = activeScene?.finalClipGenId
    ? genMap.get(activeScene.finalClipGenId)
    : undefined;

  const isSceneImageRunning =
    sceneImageBusy ||
    activeImageGen?.status === 'pending_submit' ||
    activeImageGen?.status === 'queued' ||
    activeImageGen?.status === 'in_progress';

  const isStep1Running =
    activeStep1Gen?.status === 'pending_submit' ||
    activeStep1Gen?.status === 'queued' ||
    activeStep1Gen?.status === 'in_progress';

  const isFinalVideoRunning =
    videoSubmitBusy ||
    activeFinalGen?.status === 'pending_submit' ||
    activeFinalGen?.status === 'queued' ||
    activeFinalGen?.status === 'in_progress';

  const renderedSceneCount = scenes.filter((s) => Boolean(s.finalClipUrl)).length;

  // Dynamic setting renderer (ONLY renders settings supported by the chosen model)
  const renderDynamicSettingControl = (
    def: SettingDefinition,
    value: string | number | boolean,
    onChange: (key: string, nextVal: string | number | boolean) => void
  ) => {
    if (def.type === 'enum') {
      return (
        <div key={def.key} className="space-y-1">
          <label className="block text-[11px] font-medium text-zinc-400">{def.label}</label>
          <select
            value={String(value)}
            onChange={(e) => onChange(def.key, e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0E12] border border-white/10 text-xs text-white focus:border-[#46ecd5] focus:outline-none"
          >
            {def.options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#111216]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (def.type === 'boolean') {
      const checked = Boolean(value);
      return (
        <label
          key={def.key}
          className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg bg-[#0D0E12] border border-white/10 cursor-pointer"
        >
          <div className="min-w-0">
            <div className="text-xs font-medium text-zinc-200">{def.label}</div>
            {def.description && (
              <div className="text-[11px] text-zinc-500 truncate">{def.description}</div>
            )}
          </div>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(def.key, e.target.checked)}
            className="accent-[#46ecd5] w-4 h-4 shrink-0"
          />
        </label>
      );
    }

    if (def.type === 'range') {
      const numVal = typeof value === 'number' ? value : Number(def.defaultValue);
      return (
        <div key={def.key} className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">{def.label}</span>
            <span className="font-mono-tabular text-[#46ecd5]">
              {numVal}
              {def.unit || ''}
            </span>
          </div>
          <input
            type="range"
            min={def.min}
            max={def.max}
            step={def.step}
            value={numVal}
            onChange={(e) => onChange(def.key, parseFloat(e.target.value))}
            className="w-full accent-[#46ecd5] h-1 bg-zinc-800 rounded-lg cursor-pointer"
          />
        </div>
      );
    }

    return null;
  };

  // Split primary model settings into Core (aspect_ratio, resolution, duration) vs Advanced
  const coreSettingKeys = new Set(['aspect_ratio', 'resolution', 'duration']);
  const primaryCoreSettings = (primaryVideoModel?.settings || []).filter((s) =>
    coreSettingKeys.has(s.key)
  );
  const primaryAdvancedSettings = (primaryVideoModel?.settings || []).filter(
    (s) => !coreSettingKeys.has(s.key)
  );

  // Recent uploaded/generated image assets for Option B quick pick
  const libraryImageCandidates = useMemo(() => {
    const items: Array<{ id: string; url: string; label: string }> = [];
    for (const u of uploads) {
      if (u.kind === 'image' && u.publicUrl) {
        items.push({ id: u.id, url: u.publicUrl, label: u.label || 'Uploaded Frame' });
      }
    }
    for (const g of generations) {
      if (g.surface === 'image' && g.status === 'completed' && g.outputs[0]?.url) {
        items.push({
          id: g.id,
          url: g.outputs[0].url,
          label: g.prompt.slice(0, 32) || 'Generated Still',
        });
      }
    }
    return items.slice(0, 12);
  }, [uploads, generations]);

  if (!activeScene) return null;

  return (
    <div className="flex-1 max-w-[1620px] w-full mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* ====================================================================
          HEADER BAR: PROJECT CONTEXT, AUDIO TRACK STATUS & WORKSPACE TABS
          ==================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#46ecd5]/15 border border-[#46ecd5]/30 flex items-center justify-center shrink-0">
            <Music className="w-4 h-4 text-[#46ecd5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate">
                Music Video Production
              </h1>
              <span className="text-xs text-zinc-500 hidden sm:inline">·</span>
              <span className="text-xs text-zinc-400 truncate hidden sm:inline">{projectTitle}</span>
            </div>
            <p className="text-xs text-zinc-400">
              {audioTrack
                ? `${audioTrack.title} · ${formatTimecode(audioTrack.durationSec)} · ${scenes.length} scene${scenes.length === 1 ? '' : 's'} · ${renderedSceneCount} rendered`
                : `Import your song, direct performers & scenes, trim audio segments, and assemble your music video`}
            </p>
          </div>
        </div>

        {/* Workspace Mode Tabs (3 focused stages — progressive disclosure) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-0.5 rounded-xl bg-[#141519] border border-white/10">
            {(
              [
                { id: 'performers', label: 'Performers & Outfits', icon: Users },
                { id: 'direct', label: 'Direct & Animate', icon: Clapperboard },
                { id: 'assembly', label: `Sequence & Assembly (${scenes.length})`, icon: Film },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeWorkspaceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveWorkspaceTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#46ecd5] text-zinc-950 shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAudioImporter((v) => !v)}
            className="px-3 py-1.5 rounded-xl bg-[#141519] hover:bg-[#1C1E24] border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-[#46ecd5]" />
            <span>{audioTrack ? 'Change Track' : 'Import Music'}</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          AUDIO IMPORT PANEL (UPLOAD FILE OR DIRECT AUDIO URL)
          ==================================================================== */}
      {(!audioTrack || showAudioImporter) && (
        <div className="bg-[#111216] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white">Master Music Track</h2>
              <p className="text-xs text-zinc-400">
                Upload an audio file or paste a direct audio URL (MP3, WAV, M4A, OGG, FLAC, AAC, WebM). Trimming is non-destructive.
              </p>
            </div>
            <div className="inline-flex items-center p-0.5 rounded-lg bg-[#0A0B0E] border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setAudioImportMode('upload');
                  setAudioError(null);
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  audioImportMode === 'upload'
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Audio File</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAudioImportMode('url');
                  setAudioError(null);
                }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  audioImportMode === 'url'
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Direct Audio URL</span>
              </button>
            </div>
          </div>

          {audioImportMode === 'upload' ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                ref={audioFileInputRef}
                type="file"
                accept={SUPPORTED_AUDIO_ACCEPT}
                onChange={handleAudioFileUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={audioBusy}
                onClick={() => audioFileInputRef.current?.click()}
                className="flex-1 py-4 px-4 rounded-xl border border-dashed border-white/20 hover:border-[#46ecd5]/60 bg-[#0B0C10] hover:bg-[#46ecd5]/[0.04] transition-all flex items-center justify-center gap-3 text-sm text-zinc-200"
              >
                {audioBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#46ecd5]" />
                ) : (
                  <Music className="w-4 h-4 text-[#46ecd5]" />
                )}
                <span>
                  {audioBusy
                    ? 'Decoding waveform & preparing track...'
                    : 'Choose audio file (MP3, WAV, M4A, OGG, FLAC, AAC · max 40 MB)'}
                </span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAudioUrlImport} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={audioUrlInput}
                onChange={(e) => setAudioUrlInput(e.target.value)}
                placeholder="https://example.com/tracks/song-master.mp3"
                className="flex-1 px-3 py-2 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:border-[#46ecd5] focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={audioBusy || !audioUrlInput.trim()}
                className="px-4 py-2 rounded-lg bg-[#46ecd5] hover:bg-[#5ff3de] disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                {audioBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Link2 className="w-3.5 h-3.5" />
                )}
                <span>{audioBusy ? 'Retrieving...' : 'Import Audio'}</span>
              </button>
            </form>
          )}

          {audioError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{audioError}</span>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          PERSISTENT INTERACTIVE WAVEFORM TIMELINE & TRIM CONTROLS
          ==================================================================== */}
      {audioTrack && (
        <MusicVideoAudioTimeline
          track={audioTrack}
          trimStartSec={activeScene.audioStartSec}
          trimEndSec={activeScene.audioEndSec}
          onChangeTrim={(startSec, endSec) =>
            updateActiveScene({
              audioStartSec: startSec,
              audioEndSec: endSec,
              lastTrimmedAudioUrl: undefined, // re-slice fresh WAV on next generation
            })
          }
          sceneMarkers={timelineMarkers}
          onSelectSceneMarker={(id) => {
            setActiveSceneId(id);
            setActiveWorkspaceTab('direct');
          }}
          externalPauseSignal={externalPauseSignal}
        />
      )}

      {/* ====================================================================
          TAB 1: PERFORMERS & WARDROBE (CHARACTER & APPEARANCE CREATION)
          ==================================================================== */}
      {activeWorkspaceTab === 'performers' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Left: Select Existing Performers & Outfits from My Elements */}
          <div className="xl:col-span-5 space-y-4">
            <div className="bg-[#111216] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Performers in My Elements</h2>
                  <p className="text-xs text-zinc-400">
                    Select a performer to lock facial identity across all scenes
                  </p>
                </div>
                <span className="text-xs font-mono-tabular text-zinc-400">
                  {characters.length} saved
                </span>
              </div>

              {characters.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-lg">
                  No performers saved yet. Generate or upload one on the right.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {characters.map((chr) => {
                    const isSelected = activeScene.characterId === chr.id;
                    return (
                      <button
                        key={chr.id}
                        type="button"
                        onClick={() => updateActiveScene({ characterId: chr.id })}
                        className={`group rounded-lg overflow-hidden border text-left transition-all ${
                          isSelected
                            ? 'border-[#46ecd5] bg-[#46ecd5]/10'
                            : 'border-white/10 bg-[#0B0C10] hover:border-white/25'
                        }`}
                      >
                        <div className="aspect-[4/3] bg-zinc-900 relative overflow-hidden">
                          {chr.faceReferenceUrl ? (
                            <img
                              src={chr.faceReferenceUrl}
                              alt={chr.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Users className="w-5 h-5" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#46ecd5] text-zinc-950 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <div className="text-xs font-bold text-white truncate">@{chr.name}</div>
                          <div className="text-[10px] text-zinc-400 truncate">
                            {chr.roleTitle || chr.identityId}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Saved Outfits / Wardrobes */}
            <div className="bg-[#111216] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Costumes & Outfits</h2>
                  <p className="text-xs text-zinc-400">
                    Reusable wardrobe continuity references
                  </p>
                </div>
                {activeScene.wardrobeId && (
                  <button
                    type="button"
                    onClick={() => updateActiveScene({ wardrobeId: null })}
                    className="text-[11px] text-zinc-400 hover:text-white"
                  >
                    Clear outfit
                  </button>
                )}
              </div>

              {wardrobes.length === 0 ? (
                <div className="py-5 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-lg">
                  No outfits saved yet. Design a costume below.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {wardrobes.map((w) => {
                    const isSelected = activeScene.wardrobeId === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => updateActiveScene({ wardrobeId: w.id })}
                        className={`rounded-lg overflow-hidden border text-left transition-all ${
                          isSelected
                            ? 'border-[#46ecd5] bg-[#46ecd5]/10'
                            : 'border-white/10 bg-[#0B0C10] hover:border-white/25'
                        }`}
                      >
                        <div className="aspect-[4/3] bg-zinc-900 relative overflow-hidden">
                          {w.referenceImageUrl ? (
                            <img
                              src={w.referenceImageUrl}
                              alt={w.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Shirt className="w-5 h-5" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#46ecd5] text-zinc-950 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <div className="text-xs font-bold text-white truncate">{w.name}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{w.category}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Create New Performer & Design Outfits */}
          <div className="xl:col-span-7 space-y-4">
            {/* Create / Upload Performer */}
            <div className="bg-[#111216] border border-white/10 rounded-xl p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#46ecd5]" />
                  <h2 className="text-sm font-bold text-white">Create Performer Identity</h2>
                </div>
                <select
                  value={charGenModelId}
                  onChange={(e) => setCharGenModelId(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-zinc-200"
                >
                  {imageModels.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#111216]">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 space-y-2">
                  <div className="aspect-[3/4] rounded-lg bg-[#0A0B0E] border border-white/10 overflow-hidden flex items-center justify-center relative">
                    {newCharFaceUrl ? (
                      <img
                        src={newCharFaceUrl}
                        alt="Performer preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-3 space-y-1.5">
                        <Users className="w-6 h-6 text-zinc-600 mx-auto" />
                        <p className="text-[11px] text-zinc-500">
                          Generate a face or upload a photograph
                        </p>
                      </div>
                    )}
                    {charBusy && (
                      <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-[#46ecd5]" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={charPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadCharacterPhoto}
                    className="hidden"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={charBusy}
                      onClick={handleGenerateCharacterFace}
                      className="px-2 py-1.5 rounded-lg bg-[#46ecd5]/15 hover:bg-[#46ecd5]/25 border border-[#46ecd5]/35 text-[#46ecd5] text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate</span>
                    </button>
                    <button
                      type="button"
                      disabled={charBusy}
                      onClick={() => charPhotoInputRef.current?.click()}
                      className="px-2 py-1.5 rounded-lg bg-[#18191F] hover:bg-[#22242C] border border-white/10 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>

                <div className="md:col-span-8 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Performer Name</label>
                      <input
                        type="text"
                        value={newCharName}
                        onChange={(e) => setNewCharName(e.target.value)}
                        placeholder="e.g. ZARA VANCE"
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:border-[#46ecd5] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Role</label>
                      <input
                        type="text"
                        value={newCharRole}
                        onChange={(e) => setNewCharRole(e.target.value)}
                        placeholder="Lead Vocalist / Dancer"
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:border-[#46ecd5] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">
                      Face & Identity Description (used to generate portrait & lock continuity)
                    </label>
                    <textarea
                      rows={3}
                      value={newCharPrompt}
                      onChange={(e) => setNewCharPrompt(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:border-[#46ecd5] focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">
                      Distinctive Appearance Details (hairstyle, makeup, jewelry, build)
                    </label>
                    <input
                      type="text"
                      value={newCharAppearance}
                      onChange={(e) => setNewCharAppearance(e.target.value)}
                      placeholder="Braided crown hair, silver ear cuffs, sculpted editorial cheekbones"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:border-[#46ecd5] focus:outline-none"
                    />
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      disabled={charBusy || !newCharName.trim()}
                      onClick={handleSavePerformer}
                      className="px-4 py-2 rounded-lg bg-[#46ecd5] hover:bg-[#60f3de] disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Save Performer to My Elements</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Design Costume / Outfit */}
            <div className="bg-[#111216] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-[#46ecd5]" />
                <h2 className="text-sm font-bold text-white">Design Outfit & Costume</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 space-y-2">
                  <div className="aspect-[4/3] rounded-lg bg-[#0A0B0E] border border-white/10 overflow-hidden flex items-center justify-center relative">
                    {newWardrobeImgUrl ? (
                      <img
                        src={newWardrobeImgUrl}
                        alt="Outfit preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Shirt className="w-6 h-6 text-zinc-600" />
                    )}
                    {wardrobeBusy && (
                      <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-[#46ecd5]" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={wardrobePhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadWardrobePhoto}
                    className="hidden"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={wardrobeBusy}
                      onClick={handleGenerateWardrobeVisual}
                      className="px-2 py-1.5 rounded-lg bg-[#46ecd5]/15 hover:bg-[#46ecd5]/25 border border-[#46ecd5]/35 text-[#46ecd5] text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate</span>
                    </button>
                    <button
                      type="button"
                      disabled={wardrobeBusy}
                      onClick={() => wardrobePhotoInputRef.current?.click()}
                      className="px-2 py-1.5 rounded-lg bg-[#18191F] hover:bg-[#22242C] border border-white/10 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>

                <div className="md:col-span-8 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={newWardrobeName}
                      onChange={(e) => setNewWardrobeName(e.target.value)}
                      placeholder="Outfit Name (e.g. Chrome Rooftop Look)"
                      className="px-3 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:border-[#46ecd5] focus:outline-none"
                    />
                    <select
                      value={newWardrobeCategory}
                      onChange={(e) => setNewWardrobeCategory(e.target.value as WardrobeCategory)}
                      className="px-3 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white focus:border-[#46ecd5] focus:outline-none"
                    >
                      {WARDROBE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-[#111216]">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    value={newWardrobeGarments}
                    onChange={(e) => setNewWardrobeGarments(e.target.value)}
                    placeholder="Describe clothing, fabrics, shoes, accessories..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:border-[#46ecd5] focus:outline-none resize-none"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <input
                      type="text"
                      value={newWardrobeColor}
                      onChange={(e) => setNewWardrobeColor(e.target.value)}
                      placeholder="Color palette"
                      className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:border-[#46ecd5] focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={wardrobeBusy || !newWardrobeName.trim()}
                      onClick={handleSaveWardrobe}
                      className="px-4 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 font-bold text-xs"
                    >
                      Save Outfit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: DIRECT & ANIMATE (SCENE CREATION + MODE A LIP SYNC / MODE B B-ROLL)
          ==================================================================== */}
      {activeWorkspaceTab === 'direct' && (
        <div className="space-y-4">
          {/* Scene Strip Switcher */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5">
              {scenes.map((sc, idx) => {
                const isSelected = sc.id === activeScene.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setActiveSceneId(sc.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                        : 'bg-[#111216] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="font-mono-tabular text-[11px] text-[#46ecd5]">
                      S{idx + 1}
                    </span>
                    <span className="max-w-[140px] truncate">{sc.title}</span>
                    <span className="text-[10px] text-zinc-500 font-mono-tabular">
                      {sc.mode === 'lipsync' ? 'Lip Sync' : 'B-Roll'}
                    </span>
                    {sc.finalClipUrl && (
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleAddScene('lipsync')}
                className="px-2.5 py-1.5 rounded-lg bg-[#141519] hover:bg-[#1E2028] border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-[#46ecd5]" />
                <span>Lip Sync Scene</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddScene('broll')}
                className="px-2.5 py-1.5 rounded-lg bg-[#141519] hover:bg-[#1E2028] border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>B-Roll Scene</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* LEFT 7 COLS: STAGE MONITOR & SCENE REFERENCE BUILDER (OPTION A / B) */}
            <div className="xl:col-span-7 space-y-4">
              {/* Stage Preview Monitor */}
              <div className="bg-[#111216] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="text"
                      value={activeScene.title}
                      onChange={(e) => updateActiveScene({ title: e.target.value })}
                      className="bg-transparent text-sm font-bold text-white focus:outline-none focus:border-b focus:border-[#46ecd5] min-w-[180px]"
                    />
                    <span className="text-xs text-zinc-500">·</span>
                    <span className="text-xs font-mono-tabular text-zinc-400">
                      {formatTimecode(activeScene.audioStartSec)} – {formatTimecode(activeScene.audioEndSec)} ({trimDurationSec.toFixed(1)}s)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    {activeCharacter && (
                      <span className="text-zinc-200 font-medium">@{activeCharacter.name}</span>
                    )}
                    {activeCharacter && activeWardrobe && <span>·</span>}
                    {activeWardrobe && <span>{activeWardrobe.name}</span>}
                  </div>
                </div>

                {/* Main Media Stage */}
                <div className="relative aspect-video bg-[#07080A] flex items-center justify-center overflow-hidden">
                  {activeScene.finalClipUrl ? (
                    <>
                      <video
                        ref={stageVideoRef}
                        src={activeScene.finalClipUrl}
                        playsInline
                        controls={!stageSyncPlaying}
                        className="w-full h-full object-contain"
                      />
                      {audioTrack && (
                        <audio ref={stageAudioRef} src={audioTrack.objectUrl} preload="auto" />
                      )}
                      {audioTrack && (
                        <button
                          type="button"
                          onClick={handleToggleStageSyncedPreview}
                          className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/75 hover:bg-black/90 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 backdrop-blur-sm"
                        >
                          {stageSyncPlaying ? (
                            <Pause className="w-3.5 h-3.5 text-[#46ecd5]" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-[#46ecd5] fill-current" />
                          )}
                          <span>
                            {stageSyncPlaying ? 'Stop Synced Preview' : 'Play Synced with Audio Segment'}
                          </span>
                        </button>
                      )}
                    </>
                  ) : activeScene.animatedClipUrl ? (
                    <div className="w-full h-full relative">
                      <video
                        src={activeScene.animatedClipUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-black/75 border border-white/15 text-[11px] text-amber-300">
                        Step 1 Animation Ready — Ready for Step 2 Lip Sync
                      </div>
                    </div>
                  ) : activeScene.referenceImageUrl ? (
                    <img
                      src={activeScene.referenceImageUrl}
                      alt={activeScene.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2 max-w-sm">
                      <ImageIcon className="w-8 h-8 text-zinc-700 mx-auto" />
                      <p className="text-sm font-semibold text-zinc-300">
                        No scene frame yet
                      </p>
                      <p className="text-xs text-zinc-500">
                        Generate a scene reference image below (Option A) or upload an existing frame / storyboard still (Option B).
                      </p>
                    </div>
                  )}

                  {(isSceneImageRunning || isStep1Running || isFinalVideoRunning) && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-center px-4">
                      <Loader2 className="w-7 h-7 animate-spin text-[#46ecd5]" />
                      <div className="text-sm font-bold text-white">
                        {isSceneImageRunning
                          ? 'Generating Scene Reference Image...'
                          : isStep1Running
                          ? 'Step 1: Animating Performer Scene...'
                          : activeScene.mode === 'lipsync'
                          ? 'Synchronizing Lip Movement with Trimmed Audio...'
                          : 'Rendering Cinematic B-Roll Video...'}
                      </div>
                      <p className="text-xs text-zinc-400">
                        Live generation in progress — output attaches directly to this scene when complete
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Stage Footer Actions */}
                {(activeScene.finalClipUrl || activeScene.animatedClipUrl || activeScene.lastError) && (
                  <div className="px-4 py-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {activeScene.lastError ? (
                      <div className="flex items-center gap-1.5 text-rose-300">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{activeScene.lastError}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-400">
                        {activeScene.finalClipUrl
                          ? 'Final scene video rendered and linked to Sequence & Assembly'
                          : 'Step 1 base video ready'}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      {activeScene.mode === 'lipsync' &&
                        activeScene.lipSyncPipeline === 'two_step' &&
                        activeScene.animatedClipUrl && (
                          <button
                            type="button"
                            disabled={isFinalVideoRunning}
                            onClick={() =>
                              runStep2VideoLipSync(activeScene, activeScene.animatedClipUrl!)
                            }
                            className="px-3 py-1 rounded-lg bg-[#46ecd5]/15 hover:bg-[#46ecd5]/25 border border-[#46ecd5]/40 text-[#46ecd5] font-semibold"
                          >
                            Run Step 2 Lip Sync on Clip
                          </button>
                        )}
                      {activeScene.finalClipUrl && (
                        <a
                          href={activeScene.finalClipUrl}
                          download={`${activeScene.title.replace(/\s+/g, '_')}.mp4`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#18191F] hover:bg-[#23252E] border border-white/10 text-zinc-200 flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Clip</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SCENE CREATION & REFERENCES PANEL (OPTION A CREATE vs OPTION B UPLOAD) */}
              <div className="bg-[#111216] border border-white/10 rounded-xl p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-white">Scene Reference Frame</h2>
                    <p className="text-xs text-zinc-400">
                      Generate a new scene image or upload your own designed scene / storyboard frame
                    </p>
                  </div>
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-[#0A0B0E] border border-white/10">
                    <button
                      type="button"
                      onClick={() => setSceneRefOption('create')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                        sceneRefOption === 'create'
                          ? 'bg-white/10 text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Option A · Create Scene
                    </button>
                    <button
                      type="button"
                      onClick={() => setSceneRefOption('upload')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                        sceneRefOption === 'upload'
                          ? 'bg-white/10 text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Option B · Upload Scene
                    </button>
                  </div>
                </div>

                {sceneRefOption === 'create' ? (
                  <div className="space-y-3">
                    {/* Performer & Outfit Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] text-zinc-400">
                          Performer (My Elements)
                        </label>
                        <div className="flex gap-1.5">
                          <select
                            value={activeScene.characterId || ''}
                            onChange={(e) =>
                              updateActiveScene({ characterId: e.target.value || null })
                            }
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white focus:border-[#46ecd5] focus:outline-none"
                          >
                            <option value="" className="bg-[#111216]">
                              No locked performer (environment / open cast)
                            </option>
                            {characters.map((c) => (
                              <option key={c.id} value={c.id} className="bg-[#111216]">
                                @{c.name} · {c.roleTitle}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setActiveWorkspaceTab('performers')}
                            title="Create or manage performers"
                            className="px-2 py-1.5 rounded-lg bg-[#18191F] hover:bg-[#23252E] border border-white/10 text-zinc-300"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-zinc-400">Wardrobe / Costume</label>
                        <select
                          value={activeScene.wardrobeId || ''}
                          onChange={(e) =>
                            updateActiveScene({ wardrobeId: e.target.value || null })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white focus:border-[#46ecd5] focus:outline-none"
                        >
                          <option value="" className="bg-[#111216]">
                            Default appearance / none locked
                          </option>
                          {wardrobes.map((w) => (
                            <option key={w.id} value={w.id} className="bg-[#111216]">
                              {w.name} ({w.category})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">Scene Description & Action</label>
                      <textarea
                        rows={2}
                        value={activeScene.sceneDescription}
                        onChange={(e) =>
                          updateActiveScene({ sceneDescription: e.target.value })
                        }
                        placeholder="Describe what is happening in the frame..."
                        className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:border-[#46ecd5] focus:outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400">
                        Environment, Background & Atmosphere
                      </label>
                      <input
                        type="text"
                        value={activeScene.environmentPrompt}
                        onChange={(e) =>
                          updateActiveScene({ environmentPrompt: e.target.value })
                        }
                        placeholder="e.g. Underground concrete concert stage bathed in cyan spotlights and drifting haze"
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:border-[#46ecd5] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] text-zinc-400">Camera Framing</label>
                        <select
                          value={activeScene.cameraFraming}
                          onChange={(e) => updateActiveScene({ cameraFraming: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white"
                        >
                          {CAMERA_FRAMING_OPTIONS.map((opt) => (
                            <option key={opt} value={opt} className="bg-[#111216]">
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-zinc-400">Lighting</label>
                        <select
                          value={activeScene.lightingStyle}
                          onChange={(e) => updateActiveScene({ lightingStyle: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white"
                        >
                          {LIGHTING_STYLE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt} className="bg-[#111216]">
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-zinc-400">Visual Style</label>
                        <select
                          value={activeScene.visualStyle}
                          onChange={(e) => updateActiveScene({ visualStyle: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white"
                        >
                          {VISUAL_STYLE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt} className="bg-[#111216]">
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-500">Scene Image Model:</span>
                        <select
                          value={activeScene.imageModelId}
                          onChange={(e) => updateActiveScene({ imageModelId: e.target.value })}
                          className="px-2.5 py-1 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-zinc-200"
                        >
                          {imageModels.map((m) => (
                            <option key={m.id} value={m.id} className="bg-[#111216]">
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={isSceneImageRunning}
                        onClick={handleGenerateSceneImage}
                        className="px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        {isSceneImageRunning ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {activeScene.referenceImageUrl ? 'Regenerate Scene Frame' : 'Generate Scene Frame'}
                        </span>
                        <span className="font-mono-tabular text-[11px] text-zinc-600 ml-0.5">
                          · {sceneImageTokens}t
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      ref={sceneUploadInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadSceneReference}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={sceneImageBusy}
                      onClick={() => sceneUploadInputRef.current?.click()}
                      className="w-full py-6 px-4 rounded-xl border border-dashed border-white/20 hover:border-[#46ecd5]/60 bg-[#0A0B0E] transition-all flex flex-col items-center justify-center gap-1.5 text-xs text-zinc-300"
                    >
                      {sceneImageBusy ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[#46ecd5]" />
                      ) : (
                        <Upload className="w-5 h-5 text-[#46ecd5]" />
                      )}
                      <span className="font-semibold text-white">
                        Upload Designed Scene Image or Storyboard Frame
                      </span>
                      <span className="text-zinc-500">
                        PNG, JPG, WebP — used directly as the visual anchor for animation & lip sync
                      </span>
                    </button>

                    {libraryImageCandidates.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] text-zinc-400">
                          Or select from your recent Cinema Studio frames & uploads:
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {libraryImageCandidates.map((img) => {
                            const active = activeScene.referenceImageUrl === img.url;
                            return (
                              <button
                                key={img.id}
                                type="button"
                                onClick={() =>
                                  updateActiveScene({
                                    referenceImageUrl: img.url,
                                    referenceSource: 'uploaded',
                                  })
                                }
                                title={img.label}
                                className={`aspect-video rounded-md overflow-hidden border transition-all ${
                                  active
                                    ? 'border-[#46ecd5] ring-1 ring-[#46ecd5]'
                                    : 'border-white/10 hover:border-white/30'
                                }`}
                              >
                                <img
                                  src={img.url}
                                  alt={img.label}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT 5 COLS: GENERATION MODE (A: LIP SYNC vs B: B-ROLL), MODELS & SETTINGS */}
            <div className="xl:col-span-5 space-y-4">
              <div className="bg-[#111216] border border-white/10 rounded-xl p-4 space-y-4">
                {/* MODE A vs MODE B SWITCHER */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white">Generation Mode</h2>
                    <span className="text-[11px] font-mono-tabular text-zinc-400">
                      {activeScene.mode === 'lipsync'
                        ? 'Synced to audio trim'
                        : 'No lip-sync model required'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateActiveScene({ mode: 'lipsync' })}
                      className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                        activeScene.mode === 'lipsync'
                          ? 'bg-[#46ecd5]/12 border-[#46ecd5] text-white'
                          : 'bg-[#0A0B0E] border-white/10 text-zinc-400 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Mic className="w-3.5 h-3.5 text-[#46ecd5]" />
                        <span>Lip Sync Performance</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        Performer sings or speaks in sync with the trimmed audio segment.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateActiveScene({ mode: 'broll' })}
                      className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                        activeScene.mode === 'broll'
                          ? 'bg-sky-500/12 border-sky-400 text-white'
                          : 'bg-[#0A0B0E] border-white/10 text-zinc-400 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Video className="w-3.5 h-3.5 text-sky-400" />
                        <span>B-Roll Generation</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        Cinematic cutaways, dance, atmosphere, slow-mo & transitions.
                      </p>
                    </button>
                  </div>
                </div>

                {/* INTELLIGENT MODEL SELECTION WITH CAPABILITY TRANSPARENCY */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  {activeScene.mode === 'lipsync' ? (
                    <>
                      {/* Choose 1-Step Native Lip Sync vs 2-Step Animation -> Lip Sync */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-zinc-300">
                          Lip Sync Pipeline Architecture
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#0A0B0E] border border-white/10">
                          <button
                            type="button"
                            onClick={() => updateActiveScene({ lipSyncPipeline: 'native' })}
                            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                              activeScene.lipSyncPipeline === 'native'
                                ? 'bg-[#46ecd5] text-zinc-950 font-bold'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            1-Step Native Audio Sync
                          </button>
                          <button
                            type="button"
                            onClick={() => updateActiveScene({ lipSyncPipeline: 'two_step' })}
                            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                              activeScene.lipSyncPipeline === 'two_step'
                                ? 'bg-[#46ecd5] text-zinc-950 font-bold'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            2-Step Animate → Lip Sync
                          </button>
                        </div>
                      </div>

                      {activeScene.lipSyncPipeline === 'native' ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <label className="text-zinc-300 font-medium">
                              Native Audio-Driven Lip Sync Model
                            </label>
                            <span className="text-[#46ecd5] font-mono-tabular">
                              Image + Audio → Video
                            </span>
                          </div>
                          <select
                            value={activeScene.nativeLipSyncModelId}
                            onChange={(e) =>
                              updateActiveScene({ nativeLipSyncModelId: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white focus:border-[#46ecd5] focus:outline-none"
                          >
                            {nativeLipSyncModels.map((m) => (
                              <option key={m.id} value={m.id} className="bg-[#111216]">
                                {m.label} — Native Audio Lip Sync
                              </option>
                            ))}
                          </select>
                          {primaryVideoModel && (
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              {primaryVideoModel.description}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <label className="text-zinc-300 font-medium">
                                Step 1 · Video Animation Model
                              </label>
                              <span className="text-zinc-500 font-mono-tabular">
                                Video-only (no lip sync)
                              </span>
                            </div>
                            <select
                              value={activeScene.animationModelId}
                              onChange={(e) =>
                                updateActiveScene({ animationModelId: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white focus:border-[#46ecd5] focus:outline-none"
                            >
                              {brollAndAnimationModels.map((m) => (
                                <option key={m.id} value={m.id} className="bg-[#111216]">
                                  {m.label} · {m.category}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <label className="text-zinc-300 font-medium">
                                Step 2 · Video Lip Sync Model
                              </label>
                              <span className="text-[#46ecd5] font-mono-tabular">
                                Video + Audio → Synced
                              </span>
                            </div>
                            <select
                              value={activeScene.videoLipSyncModelId}
                              onChange={(e) =>
                                updateActiveScene({ videoLipSyncModelId: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white focus:border-[#46ecd5] focus:outline-none"
                            >
                              {videoLipSyncModels.map((m) => (
                                <option key={m.id} value={m.id} className="bg-[#111216]">
                                  {m.label} — Post-Process Lip Sync
                                </option>
                              ))}
                            </select>
                          </div>

                          <label className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#0A0B0E] border border-white/10 cursor-pointer text-xs">
                            <span className="text-zinc-300">
                              Auto-run Step 2 Lip Sync as soon as Step 1 completes
                            </span>
                            <input
                              type="checkbox"
                              checked={Boolean(activeScene.autoChainStep2)}
                              onChange={(e) =>
                                updateActiveScene({ autoChainStep2: e.target.checked })
                              }
                              className="accent-[#46ecd5] w-4 h-4"
                            />
                          </label>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <label className="text-zinc-300 font-medium">
                          Compatible B-Roll Video Model
                        </label>
                        <span className="text-sky-400 font-mono-tabular">
                          Video-only · No lip sync
                        </span>
                      </div>
                      <select
                        value={activeScene.brollModelId}
                        onChange={(e) => updateActiveScene({ brollModelId: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white focus:border-[#46ecd5] focus:outline-none"
                      >
                        {brollAndAnimationModels.map((m) => (
                          <option key={m.id} value={m.id} className="bg-[#111216]">
                            {m.label} · {m.category}
                          </option>
                        ))}
                      </select>
                      {primaryVideoModel && (
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          {primaryVideoModel.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* MODE-SPECIFIC DIRECTION CONTROLS */}
                <div className="space-y-2.5 pt-3 border-t border-white/10">
                  {activeScene.mode === 'lipsync' ? (
                    <>
                      <div className="text-[11px] font-semibold text-zinc-300">
                        Performance & Acting Direction
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[11px] text-zinc-400">Vocal Delivery</label>
                          <select
                            value={activeScene.performanceIntensity}
                            onChange={(e) =>
                              updateActiveScene({ performanceIntensity: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white"
                          >
                            {PERFORMANCE_INTENSITY_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} className="bg-[#111216]">
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-zinc-400">Facial Expression</label>
                          <select
                            value={activeScene.facialExpression}
                            onChange={(e) =>
                              updateActiveScene({ facialExpression: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white"
                          >
                            {FACIAL_EXPRESSION_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} className="bg-[#111216]">
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[11px] text-zinc-400">Gestures & Body Motion</label>
                          <select
                            value={activeScene.bodyMovement}
                            onChange={(e) =>
                              updateActiveScene({ bodyMovement: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white"
                          >
                            {BODY_MOVEMENT_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} className="bg-[#111216]">
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-zinc-400">Camera Movement</label>
                          <select
                            value={activeScene.cameraMovement}
                            onChange={(e) =>
                              updateActiveScene({ cameraMovement: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white"
                          >
                            {CAMERA_MOVEMENT_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} className="bg-[#111216]">
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[11px] font-semibold text-zinc-300">
                        B-Roll Direction & Pacing
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[11px] text-zinc-400">B-Roll Shot Type</label>
                          <select
                            value={activeScene.brollCategory}
                            onChange={(e) =>
                              updateActiveScene({ brollCategory: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white"
                          >
                            {BROLL_CATEGORIES.map((opt) => (
                              <option key={opt} value={opt} className="bg-[#111216]">
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-zinc-400">Camera Movement</label>
                          <select
                            value={activeScene.cameraMovement}
                            onChange={(e) =>
                              updateActiveScene({ cameraMovement: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-white"
                          >
                            {CAMERA_MOVEMENT_OPTIONS.map((opt) => (
                              <option key={opt} value={opt} className="bg-[#111216]">
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* DYNAMIC VIDEO ORIENTATION & MODEL-SUPPORTED OUTPUT SETTINGS ONLY */}
                <div className="space-y-2.5 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-300">
                      Output Orientation & Supported Settings
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {primaryVideoModel?.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {primaryCoreSettings.map((def) =>
                      renderDynamicSettingControl(
                        def,
                        resolvedPrimarySettings[def.key],
                        (k, v) =>
                          updateActiveScene({
                            modelSettings: { ...resolvedPrimarySettings, [k]: v },
                          })
                      )
                    )}
                  </div>

                  {/* Progressive Disclosure for Advanced Model-Specific Controls */}
                  {(primaryAdvancedSettings.length > 0 ||
                    (activeScene.mode === 'lipsync' &&
                      activeScene.lipSyncPipeline === 'two_step' &&
                      step2LipSyncModel &&
                      step2LipSyncModel.settings.length > 0)) && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowAdvancedModelSettings((v) => !v)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        {showAdvancedModelSettings ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        <Sliders className="w-3 h-3" />
                        <span>Advanced Model Settings</span>
                      </button>

                      {showAdvancedModelSettings && (
                        <div className="mt-2.5 space-y-2.5 p-3 rounded-lg bg-[#0A0B0E] border border-white/10">
                          {primaryAdvancedSettings.map((def) =>
                            renderDynamicSettingControl(
                              def,
                              resolvedPrimarySettings[def.key],
                              (k, v) =>
                                updateActiveScene({
                                  modelSettings: { ...resolvedPrimarySettings, [k]: v },
                                })
                            )
                          )}

                          {activeScene.mode === 'lipsync' &&
                            activeScene.lipSyncPipeline === 'two_step' &&
                            step2LipSyncModel && (
                              <div className="pt-2 border-t border-white/10 space-y-2">
                                <div className="text-[11px] font-semibold text-[#46ecd5]">
                                  Step 2 · {step2LipSyncModel.label} Settings
                                </div>
                                {step2LipSyncModel.settings.map((def) =>
                                  renderDynamicSettingControl(
                                    def,
                                    resolvedStep2Settings[def.key],
                                    (k, v) =>
                                      updateActiveScene({
                                        step2Settings: { ...resolvedStep2Settings, [k]: v },
                                      })
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* LIVE COST SUMMARY & PRIMARY GENERATE ACTION */}
                <div className="pt-3 border-t border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-zinc-400">
                      {activeScene.mode === 'lipsync' ? (
                        <span className="flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5 text-[#46ecd5]" />
                          <span>
                            Segment {formatTimecode(activeScene.audioStartSec)} –{' '}
                            {formatTimecode(activeScene.audioEndSec)} ({trimDurationSec.toFixed(1)}s)
                          </span>
                        </span>
                      ) : (
                        <span>B-Roll video generation</span>
                      )}
                    </div>
                    <div className="font-mono-tabular text-right">
                      <span className="font-bold text-[#46ecd5]">
                        {videoTokenBreakdown.total} tokens
                      </span>
                      {videoTokenBreakdown.step2 > 0 && (
                        <span className="block text-[10px] text-zinc-500">
                          Step 1: {videoTokenBreakdown.primary}t + Step 2: {videoTokenBreakdown.step2}t
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isFinalVideoRunning || isStep1Running}
                    onClick={() => handleGenerateSceneVideo()}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#46ecd5] hover:bg-[#62f5df] disabled:opacity-50 text-zinc-950 font-extrabold text-xs tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#46ecd5]/15"
                  >
                    {isFinalVideoRunning || isStep1Running ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : activeScene.mode === 'lipsync' ? (
                      <Mic className="w-4 h-4" />
                    ) : (
                      <Video className="w-4 h-4" />
                    )}
                    <span>
                      {isStep1Running
                        ? 'Animating Step 1 Clip...'
                        : isFinalVideoRunning
                        ? 'Rendering Scene Clip...'
                        : activeScene.mode === 'lipsync'
                        ? activeScene.lipSyncPipeline === 'two_step'
                          ? 'Generate 2-Step Animated Lip Sync Clip'
                          : 'Generate Lip Sync Performance Clip'
                        : 'Generate B-Roll Scene Clip'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: SCENE SEQUENCE & MASTER MUSIC VIDEO ASSEMBLY
          ==================================================================== */}
      {activeWorkspaceTab === 'assembly' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Left: Master Synchronized Assembly Preview Player */}
          <div className="xl:col-span-7 space-y-3">
            <div className="bg-[#111216] border border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Master Music Video Assembly Preview
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Plays your sequenced Lip Sync and B-Roll clips locked to the master song timeline
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportProjectManifest}
                  className="px-3 py-1.5 rounded-lg bg-[#18191F] hover:bg-[#23252E] border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#46ecd5]" />
                  <span>Export Sequence EDL</span>
                </button>
              </div>

              <div className="relative aspect-video bg-[#07080A] flex items-center justify-center overflow-hidden">
                {audioTrack && (
                  <audio
                    ref={assemblyAudioRef}
                    src={audioTrack.objectUrl}
                    preload="auto"
                    onEnded={() => setAssemblyPlaying(false)}
                  />
                )}

                {assemblyCurrentScene?.finalClipUrl ? (
                  <video
                    ref={assemblyVideoRef}
                    key={assemblyCurrentScene.finalClipUrl}
                    src={assemblyCurrentScene.finalClipUrl}
                    playsInline
                    muted={Boolean(audioTrack)}
                    className="w-full h-full object-contain"
                  />
                ) : assemblyCurrentScene?.referenceImageUrl ? (
                  <img
                    src={assemblyCurrentScene.referenceImageUrl}
                    alt={assemblyCurrentScene.title}
                    className="w-full h-full object-contain opacity-85"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Film className="w-8 h-8 text-zinc-700 mx-auto" />
                    <p className="text-sm text-zinc-400">
                      Render clips in Direct & Animate to preview your assembled music video
                    </p>
                  </div>
                )}

                {assemblyCurrentScene && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-black/75 border border-white/15 text-[11px] font-mono-tabular text-zinc-200">
                    {assemblyCurrentScene.title} ·{' '}
                    {assemblyCurrentScene.mode === 'lipsync' ? 'Lip Sync' : 'B-Roll'} ·{' '}
                    {formatTimecode(assemblyTimeSec)}
                  </div>
                )}
              </div>

              {/* Assembly Transport Controls */}
              <div className="p-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleAssemblyPlay}
                    className="px-4 py-2 rounded-lg bg-[#46ecd5] hover:bg-[#60f3de] text-zinc-950 font-bold text-xs flex items-center gap-1.5"
                  >
                    {assemblyPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>{assemblyPlaying ? 'Pause Assembly' : 'Play Full Music Video'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (assemblyAudioRef.current) assemblyAudioRef.current.currentTime = 0;
                      setAssemblyTimeSec(0);
                      lastAssemblySceneRef.current = null;
                    }}
                    className="px-2.5 py-2 rounded-lg bg-[#18191F] hover:bg-[#23252E] border border-white/10 text-xs text-zinc-300"
                  >
                    Restart 00:00
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono-tabular text-zinc-400">
                  <span>
                    {formatTimecode(assemblyTimeSec)} /{' '}
                    {formatTimecode(audioTrack?.durationSec || 0)}
                  </span>
                  <span>·</span>
                  <span className="text-zinc-200">
                    {renderedSceneCount}/{scenes.length} clips ready
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Scene Sequence Organizer */}
          <div className="xl:col-span-5 space-y-3">
            <div className="bg-[#111216] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white">Scene Sequence</h2>
                  <p className="text-xs text-zinc-400">
                    Organize, reorder, or regenerate Lip Sync & B-Roll scenes
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddScene('lipsync')}
                    className="px-2.5 py-1 rounded-lg bg-[#46ecd5]/15 border border-[#46ecd5]/35 text-[#46ecd5] text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Lip Sync</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddScene('broll')}
                    className="px-2.5 py-1 rounded-lg bg-[#18191F] border border-white/10 text-zinc-200 text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>B-Roll</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                {scenes.map((sc, idx) => {
                  const char = characters.find((c) => c.id === sc.characterId);
                  const gen = sc.finalClipGenId ? genMap.get(sc.finalClipGenId) : undefined;
                  const running =
                    gen?.status === 'queued' ||
                    gen?.status === 'in_progress' ||
                    gen?.status === 'pending_submit';

                  return (
                    <div
                      key={sc.id}
                      className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                        sc.id === activeScene.id
                          ? 'bg-[#16181F] border-[#46ecd5]/60'
                          : 'bg-[#0B0C10] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Thumbnail */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSceneId(sc.id);
                            setActiveWorkspaceTab('direct');
                          }}
                          className="w-24 aspect-video rounded-lg bg-zinc-900 border border-white/10 overflow-hidden shrink-0 relative"
                        >
                          {sc.finalClipUrl ? (
                            <video
                              src={sc.finalClipUrl}
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : sc.referenceImageUrl ? (
                            <img
                              src={sc.referenceImageUrl}
                              alt={sc.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Layers className="w-4 h-4" />
                            </div>
                          )}
                          <span className="absolute top-1 left-1 px-1 rounded bg-black/75 text-[10px] font-mono-tabular text-[#46ecd5]">
                            S{idx + 1}
                          </span>
                        </button>

                        {/* Metadata */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSceneId(sc.id);
                                setActiveWorkspaceTab('direct');
                              }}
                              className="text-xs font-bold text-white hover:text-[#46ecd5] truncate text-left"
                            >
                              {sc.title}
                            </button>
                            <span className="text-[10px] font-mono-tabular text-zinc-400 shrink-0">
                              {formatTimecode(sc.audioStartSec)} – {formatTimecode(sc.audioEndSec)}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-1.5">
                            <span className={sc.mode === 'lipsync' ? 'text-[#46ecd5]' : 'text-sky-400'}>
                              {sc.mode === 'lipsync' ? 'Lip Sync Performance' : 'B-Roll'}
                            </span>
                            {char && (
                              <>
                                <span>·</span>
                                <span>@{char.name}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>
                              {running
                                ? 'Rendering...'
                                : sc.finalClipUrl
                                ? 'Video ready'
                                : sc.referenceImageUrl
                                ? 'Still ready'
                                : 'Draft'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Scene Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-white/5 text-[11px]">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveScene(idx, -1)}
                            title="Move earlier"
                            className="p-1 rounded bg-[#18191F] hover:bg-white/10 disabled:opacity-30 text-zinc-300"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === scenes.length - 1}
                            onClick={() => handleMoveScene(idx, 1)}
                            title="Move later"
                            className="p-1 rounded bg-[#18191F] hover:bg-white/10 disabled:opacity-30 text-zinc-300"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateScene(sc)}
                            title="Duplicate scene"
                            className="p-1 rounded bg-[#18191F] hover:bg-white/10 text-zinc-300"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteScene(sc.id)}
                            title="Delete scene"
                            className="p-1 rounded bg-[#18191F] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSceneId(sc.id);
                              setActiveWorkspaceTab('direct');
                            }}
                            className="px-2 py-1 rounded bg-[#18191F] hover:bg-white/10 text-zinc-200 font-semibold"
                          >
                            Edit Scene
                          </button>
                          <button
                            type="button"
                            disabled={running}
                            onClick={() => handleGenerateSceneVideo(sc)}
                            className="px-2 py-1 rounded bg-[#46ecd5]/15 hover:bg-[#46ecd5]/25 text-[#46ecd5] font-semibold flex items-center gap-1"
                          >
                            <RefreshCw className={`w-3 h-3 ${running ? 'animate-spin' : ''}`} />
                            <span>{sc.finalClipUrl ? 'Regenerate' : 'Render'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
