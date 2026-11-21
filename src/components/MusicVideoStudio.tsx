import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  Mic,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Shirt,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Video,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRuns } from '../lib/useRuns';
import {
  getModelCapabilityBadgeLabel,
  getMusicVideoBRollModels,
  getMusicVideoSceneImageModels,
  getNativeAudioLipSyncModels,
  getPostProcessLipSyncModels,
  getSupportedAspectRatios,
  getSupportedDurations,
  getSupportedResolutions,
} from '../catalog/modelCapabilities';
import {
  CinemaProductionProject,
  MediaSlotInput,
  ModelEntry,
  MusicVideoAudioTrack,
  MusicVideoBRollPreset,
  MusicVideoGenerationMode,
  MusicVideoLipSyncPipeline,
  MusicVideoProjectData,
  MusicVideoScene,
} from '../types/studio';
import {
  formatDurationCompact,
  formatTimecode,
  sliceAudioBufferToWavDataUrl,
} from '../lib/audioTrim';
import { MusicVideoAudioTimeline } from './MusicVideoAudioTimeline';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/primitives';
import { AnimatedPillTabs, ShimmerButton, SpotlightCard } from './ui/aceternity-magic';

export interface MusicVideoStudioProps {
  projectId: string | null;
  projectTitle: string;
  onProjectTitleChange?: (title: string) => void;
}

const CAMERA_ANGLES = [
  'Eye-Level Medium Close-Up',
  'Low-Angle Hero Shot',
  'Tight Vocal Close-Up',
  'Wide Performance Stage',
  'Dutch Angle Dynamic',
  'Over-the-Shoulder',
  'Top-Down Overhead',
];

const CAMERA_MOVEMENTS = [
  'Slow Cinematic Push-In',
  'Handheld Energy Tracking',
  'Smooth 360° Gimbal Orbit',
  'Steadicam Dolly Back',
  'Crane Rise Reveal',
  'Locked Anamorphic Tripod',
  'Whip-Pan Beat Cut',
];

const LIGHTING_STYLES = [
  'Neon Rim & Atmospheric Haze',
  'Golden Hour Backlight',
  'High-Contrast Studio Key',
  'Moody Club Strobes & Practicals',
  'Soft Editorial Diffused',
  'Chiaroscuro Silhouette',
  'Clean Daylight Natural',
];

const VISUAL_STYLES = [
  '35mm Anamorphic Film Grain',
  'Glossy Modern Pop Cinema',
  'Gritty Underground Hip-Hop 16mm',
  'Dreamy Analog VHS / Halation',
  'High-Fashion Editorial Monochrome',
  'Hyper-Real 4K Commercial',
];

const FACIAL_EXPRESSIONS = [
  'Passionate Singing',
  'Intimate & Soulful',
  'Confident Rap Cadence',
  'High-Energy Stage Joy',
  'Melancholic / Vulnerable',
  'Fierce & Defiant',
];

const BROLL_PRESETS: Array<{
  id: MusicVideoBRollPreset;
  label: string;
  hint: string;
  defaultPrompt: string;
}> = [
  {
    id: 'establishing',
    label: 'Establishing Shot',
    hint: 'Wide environment & set atmosphere',
    defaultPrompt: 'Sweeping wide establishing shot setting the mood and architecture of the location, atmospheric haze and dynamic light',
  },
  {
    id: 'dance_choreography',
    label: 'Dance & Movement',
    hint: 'Performance choreography without lip sync',
    defaultPrompt: 'Energetic rhythmic dance choreography in sync with beat tempo, fluid camera tracking and dramatic rim light',
  },
  {
    id: 'slow_motion',
    label: 'Slow-Motion Cinema',
    hint: 'High-frame-rate dramatic detail',
    defaultPrompt: 'Ultra-smooth cinematic slow-motion capture with drifting particles, fabric movement, and shallow depth of field',
  },
  {
    id: 'artistic_cutaway',
    label: 'Artistic Cutaway',
    hint: 'Symbolic visuals, textures & light',
    defaultPrompt: 'Abstract visual cutaway featuring reflective neon surfaces, silhouettes, lens flares, and rhythmic light shifts',
  },
  {
    id: 'cinematic_closeup',
    label: 'Cinematic Close-Up',
    hint: 'Expressive non-vocal glance or detail',
    defaultPrompt: 'Intimate 85mm cinematic close-up capturing subtle emotion, eye catchlights, and jewelry/wardrobe details',
  },
  {
    id: 'lifestyle_story',
    label: 'Lifestyle / Story',
    hint: 'Narrative storytelling & candid moments',
    defaultPrompt: 'Candid cinematic narrative beat with natural motion, authentic urban energy, and warm film color grade',
  },
  {
    id: 'transition_insert',
    label: 'Transition Insert',
    hint: 'Fast beat-bridge & visual whip cut',
    defaultPrompt: 'Dynamic camera whip-pan and light-streak motion bridge designed to cut cleanly between chorus and verse',
  },
];

function createDefaultScene(
  order: number,
  mode: MusicVideoGenerationMode,
  defaults: {
    startSec: number;
    endSec: number;
    aspectRatio: string;
    characterId: string | null;
    wardrobeId: string | null;
    imageModelId: string;
    animationModelId: string;
    lipSyncModelId: string;
  }
): MusicVideoScene {
  const isLipSync = mode === 'lip_sync';
  return {
    id: `mv_sc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: isLipSync ? `Scene ${order + 1} · Vocal Performance` : `Scene ${order + 1} · Cinematic B-Roll`,
    order,
    mode,
    lipSyncPipeline: 'native_audio',
    characterId: defaults.characterId,
    wardrobeId: defaults.wardrobeId,
    sceneSource: 'generate',
    scenePrompt: isLipSync
      ? 'Lead artist singing directly into camera under atmospheric stage beams, crisp facial clarity and expressive presence'
      : 'Cinematic atmospheric shot moving through rain-slicked neon avenue at night with rich film texture',
    environmentPrompt: 'Moody nocturnal rooftop overlooking illuminated city skyline with soft volumetric haze',
    cameraAngle: isLipSync ? 'Eye-Level Medium Close-Up' : 'Wide Performance Stage',
    cameraMovement: isLipSync ? 'Slow Cinematic Push-In' : 'Smooth 360° Gimbal Orbit',
    lightingStyle: 'Neon Rim & Atmospheric Haze',
    visualStyle: '35mm Anamorphic Film Grain',
    performanceDirection: 'Expressive, charismatic singing performance locked to vocal phrasing and rhythm',
    facialExpression: 'Passionate Singing',
    gesturesAndBody: 'Natural rhythmic shoulder sway, subtle hand emphasis on vocal peaks, direct eye contact',
    bRollPreset: 'establishing',
    bRollMotionPrompt:
      'Fluid Steadicam glide capturing kinetic lighting, reflections, and rich atmospheric motion synced to beat energy',
    audioStartSec: Number(defaults.startSec.toFixed(2)),
    audioEndSec: Number(defaults.endSec.toFixed(2)),
    aspectRatio: defaults.aspectRatio,
    resolution: '1080p',
    durationSec: Math.max(5, Math.min(10, Math.round(defaults.endSec - defaults.startSec) || 5)),
    sceneImageModelId: defaults.imageModelId,
    animationModelId: defaults.animationModelId,
    lipSyncModelId: defaults.lipSyncModelId,
    modelSettings: {},
    status: 'draft',
  };
}

function isRenderableVideoUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) return false;
  if (url.endsWith('.svg') || url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.webp')) {
    return false;
  }
  return true;
}

export const MusicVideoStudio: React.FC<MusicVideoStudioProps> = ({
  projectId,
  projectTitle,
  onProjectTitleChange,
}) => {
  const {
    models,
    generations,
    uploads,
    characters,
    wardrobes,
    cinemaProjects,
    sessionToken,
    submitGeneration,
    uploadReferenceFile,
    saveCharacter,
    saveWardrobe,
    saveCinemaProject,
    calculateTokenCost,
  } = useRuns();

  const imageModels = useMemo(() => getMusicVideoSceneImageModels(models), [models]);
  const nativeLipSyncModels = useMemo(() => getNativeAudioLipSyncModels(models), [models]);
  const postProcessLipSyncModels = useMemo(() => getPostProcessLipSyncModels(models), [models]);
  const bRollVideoModels = useMemo(() => getMusicVideoBRollModels(models, false), [models]);

  const defaultImageModelId = imageModels.find((m) => m.id === 'soul-cinema')?.id || imageModels[0]?.id || 'soul-cinema';
  const defaultAnimationModelId =
    bRollVideoModels.find((m) => m.id === 'seedance-2-5')?.id || bRollVideoModels[0]?.id || 'seedance-2-5';
  const defaultNativeLipSyncId = nativeLipSyncModels[0]?.id || 'omnihuman-1-5';
  const defaultPostLipSyncId = postProcessLipSyncModels[0]?.id || 'sync-lipsync-v2';

  const activeProject: CinemaProductionProject | undefined = useMemo(
    () => cinemaProjects.find((p) => p.id === projectId) || cinemaProjects[0],
    [cinemaProjects, projectId]
  );

  // Core Music Video State
  const [workspaceTab, setWorkspaceTab] = useState<'direct' | 'performers' | 'assembly'>('direct');
  const [audioTrack, setAudioTrack] = useState<MusicVideoAudioTrack | null>(
    () => activeProject?.musicVideoData?.audioTrack || null
  );
  const [defaultAspectRatio, setDefaultAspectRatio] = useState<string>(
    () => activeProject?.musicVideoData?.defaultAspectRatio || activeProject?.aspectRatio || '16:9'
  );
  const [scenes, setScenes] = useState<MusicVideoScene[]>(() => {
    const saved = activeProject?.musicVideoData?.scenes;
    if (saved && saved.length > 0) return saved;
    return [
      createDefaultScene(0, 'lip_sync', {
        startSec: 0,
        endSec: 6,
        aspectRatio: '16:9',
        characterId: characters[0]?.id || null,
        wardrobeId: wardrobes[0]?.id || null,
        imageModelId: defaultImageModelId,
        animationModelId: defaultAnimationModelId,
        lipSyncModelId: defaultNativeLipSyncId,
      }),
      createDefaultScene(1, 'b_roll', {
        startSec: 6,
        endSec: 12,
        aspectRatio: '16:9',
        characterId: characters[0]?.id || null,
        wardrobeId: wardrobes[0]?.id || null,
        imageModelId: defaultImageModelId,
        animationModelId: defaultAnimationModelId,
        lipSyncModelId: defaultNativeLipSyncId,
      }),
    ];
  });
  const [activeSceneId, setActiveSceneId] = useState<string>(() => scenes[0]?.id || '');

  // Audio buffer ref for non-destructive WAV trimming
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sceneUploadInputRef = useRef<HTMLInputElement | null>(null);
  const charPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const wardrobePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Progressive disclosure & transient UI state
  const [showAdvancedModelParams, setShowAdvancedModelParams] = useState(false);
  const [showSceneDirectionDetails, setShowSceneDirectionDetails] = useState(true);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isGeneratingAction, setIsGeneratingAction] = useState(false);
  const [pendingTwoStageSceneIds, setPendingTwoStageSceneIds] = useState<Record<string, boolean>>({});

  // Performer & Wardrobe creation forms
  const [newCharName, setNewCharName] = useState('');
  const [newCharAppearance, setNewCharAppearance] = useState('');
  const [newCharRefUrl, setNewCharRefUrl] = useState('');
  const [charGenModelId, setCharGenModelId] = useState(defaultImageModelId);
  const [pendingCharGenId, setPendingCharGenId] = useState<string | null>(null);

  const [newWardrobeName, setNewWardrobeName] = useState('');
  const [newWardrobePrompt, setNewWardrobePrompt] = useState('');
  const [newWardrobeRefUrl, setNewWardrobeRefUrl] = useState('');
  const [pendingWardrobeGenId, setPendingWardrobeGenId] = useState<string | null>(null);

  // Master Assembly synchronized player state
  const assemblyAudioRef = useRef<HTMLAudioElement | null>(null);
  const assemblyVideoRef = useRef<HTMLVideoElement | null>(null);
  const [assemblyPlaying, setAssemblyPlaying] = useState(false);
  const [assemblyTime, setAssemblyTime] = useState(0);

  // Keep activeSceneId valid
  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) || scenes[0],
    [scenes, activeSceneId]
  );

  useEffect(() => {
    if (activeScene && activeScene.id !== activeSceneId) {
      setActiveSceneId(activeScene.id);
    }
  }, [activeScene, activeSceneId]);

  const updateActiveScene = (patch: Partial<MusicVideoScene>) => {
    if (!activeScene) return;
    setScenes((prev) =>
      prev.map((sc) => (sc.id === activeScene.id ? { ...sc, ...patch } : sc))
    );
  };

  const updateSceneById = (sceneId: string, patch: Partial<MusicVideoScene>) => {
    setScenes((prev) =>
      prev.map((sc) => (sc.id === sceneId ? { ...sc, ...patch } : sc))
    );
  };

  // Resolve currently active video/lipsync/image models for the active scene
  const selectedSceneImageModel: ModelEntry | undefined = useMemo(
    () => imageModels.find((m) => m.id === activeScene?.sceneImageModelId) || imageModels[0],
    [imageModels, activeScene?.sceneImageModelId]
  );

  const availableBRollModels = useMemo(
    () => getMusicVideoBRollModels(models, Boolean(activeScene?.referenceImageUrl)),
    [models, activeScene?.referenceImageUrl]
  );

  const selectedAnimationModel: ModelEntry | undefined = useMemo(
    () =>
      availableBRollModels.find((m) => m.id === activeScene?.animationModelId) ||
      availableBRollModels[0] ||
      bRollVideoModels[0],
    [availableBRollModels, bRollVideoModels, activeScene?.animationModelId]
  );

  const availableLipSyncModels = useMemo(() => {
    if (!activeScene) return nativeLipSyncModels;
    return activeScene.lipSyncPipeline === 'native_audio'
      ? nativeLipSyncModels
      : postProcessLipSyncModels;
  }, [activeScene?.lipSyncPipeline, nativeLipSyncModels, postProcessLipSyncModels]);

  const selectedLipSyncModel: ModelEntry | undefined = useMemo(
    () =>
      availableLipSyncModels.find((m) => m.id === activeScene?.lipSyncModelId) ||
      availableLipSyncModels[0],
    [availableLipSyncModels, activeScene?.lipSyncModelId]
  );

  // The primary video model governing orientation/resolution/settings in the right inspector
  const primaryActiveVideoModel: ModelEntry | undefined = useMemo(() => {
    if (!activeScene) return selectedAnimationModel;
    if (activeScene.mode === 'b_roll') return selectedAnimationModel;
    return activeScene.lipSyncPipeline === 'native_audio'
      ? selectedLipSyncModel
      : selectedAnimationModel;
  }, [activeScene, selectedAnimationModel, selectedLipSyncModel]);

  const supportedAspectRatios = useMemo(
    () => getSupportedAspectRatios(primaryActiveVideoModel),
    [primaryActiveVideoModel]
  );
  const supportedResolutions = useMemo(
    () => getSupportedResolutions(primaryActiveVideoModel),
    [primaryActiveVideoModel]
  );
  const supportedDurations = useMemo(
    () => getSupportedDurations(primaryActiveVideoModel),
    [primaryActiveVideoModel]
  );

  // Extra model-specific settings (excluding aspect_ratio, resolution, duration already surfaced cleanly)
  const extraModelSettings = useMemo(() => {
    if (!primaryActiveVideoModel) return [];
    return primaryActiveVideoModel.settings.filter(
      (s) => s.key !== 'aspect_ratio' && s.key !== 'resolution' && s.key !== 'duration'
    );
  }, [primaryActiveVideoModel]);

  // Keep active scene's aspectRatio & resolution valid when switching models
  useEffect(() => {
    if (!activeScene || !primaryActiveVideoModel) return;
    const patch: Partial<MusicVideoScene> = {};
    if (
      supportedAspectRatios.length > 0 &&
      !supportedAspectRatios.some((o) => o.value === activeScene.aspectRatio)
    ) {
      patch.aspectRatio = supportedAspectRatios[0].value;
    }
    if (
      supportedResolutions.length > 0 &&
      !supportedResolutions.some((o) => o.value === activeScene.resolution)
    ) {
      patch.resolution = supportedResolutions[0].value;
    }
    if (Object.keys(patch).length > 0) {
      updateActiveScene(patch);
    }
  }, [primaryActiveVideoModel?.id]);

  // Existing audio & image uploads from user library
  const existingAudioUploads = useMemo(
    () => uploads.filter((u) => u.kind === 'audio'),
    [uploads]
  );
  const existingSceneImages = useMemo(() => {
    const uploadedImgs = uploads
      .filter((u) => u.kind === 'image')
      .map((u) => ({ id: u.id, label: u.label, url: u.publicUrl }));
    const generatedImgs = generations
      .filter((g) => g.status === 'completed' && g.surface === 'image' && g.outputs[0]?.url)
      .slice(0, 16)
      .map((g) => ({
        id: g.id,
        label: g.prompt.slice(0, 42) || g.modelLabel,
        url: g.outputs[0].url,
      }));
    return [...uploadedImgs, ...generatedImgs];
  }, [uploads, generations]);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });

  // Prepare trimmed audio upload for a scene (non-destructive)
  const prepareTrimmedAudioMediaSlot = async (
    scene: MusicVideoScene
  ): Promise<MediaSlotInput | null> => {
    if (!audioTrack) return null;
    const segStart = scene.audioStartSec;
    const segEnd = Math.max(segStart + 1, scene.audioEndSec);

    if (audioBufferRef.current) {
      try {
        const sliced = sliceAudioBufferToWavDataUrl(audioBufferRef.current, segStart, segEnd);
        const uploaded = await uploadReferenceFile({
          label: `${audioTrack.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${segStart.toFixed(1)}s-${segEnd.toFixed(1)}s.wav`,
          contentType: 'audio/wav',
          bytes: sliced.bytes,
          dataUrl: sliced.dataUrl,
        });
        return {
          role: 'audio',
          kind: 'audio',
          url: uploaded?.publicUrl || sliced.dataUrl,
          label: `${audioTrack.title} (${formatTimecode(segStart)}–${formatTimecode(segEnd)})`,
        };
      } catch {
        // Fall through to master audio URL if WAV encoding fails
      }
    }

    return {
      role: 'audio',
      kind: 'audio',
      url: audioTrack.sourceUrl,
      label: `${audioTrack.title} (${formatTimecode(segStart)}–${formatTimecode(segEnd)})`,
    };
  };

  // Trigger Stage 2 Lip-Sync automatically or manually from Stage 1 video
  const runPostProcessLipSyncForScene = async (scene: MusicVideoScene, videoUrl: string) => {
    const lipModel =
      postProcessLipSyncModels.find((m) => m.id === scene.lipSyncModelId) ||
      postProcessLipSyncModels[0];
    if (!lipModel) {
      toast.error('No lip-sync post-process model is available.');
      return;
    }
    const audioSlot = await prepareTrimmedAudioMediaSlot(scene);
    if (!audioSlot) {
      toast.error('Import a music track first before running audio lip sync.');
      return;
    }

    updateSceneById(scene.id, { status: 'generating_lipsync', errorMessage: undefined });
    const trimDuration = Math.max(1, Math.round(scene.audioEndSec - scene.audioStartSec));

    const media: MediaSlotInput[] = [
      { role: 'video', kind: 'video', url: videoUrl, label: `${scene.title} Stage 1 Video` },
      audioSlot,
    ];

    const res = await submitGeneration({
      surface: 'video',
      modelId: lipModel.id,
      mode: lipModel.modes[0] || 'Video Lip Sync',
      prompt: `Synchronize performer mouth movements to vocal track (${formatTimecode(scene.audioStartSec)}-${formatTimecode(scene.audioEndSec)}). ${scene.performanceDirection}`,
      settings: {
        aspect_ratio: scene.aspectRatio,
        resolution: scene.resolution,
        duration: trimDuration,
        ...scene.modelSettings,
      },
      media,
    });

    if (res.ok && res.generation) {
      updateSceneById(scene.id, {
        finalVideoGenerationId: res.generation.id,
        status: 'generating_lipsync',
      });
      toast.success(`Stage 2 Lip Sync queued with ${lipModel.label}`);
    } else {
      updateSceneById(scene.id, {
        status: 'error',
        errorMessage: res.error || 'Lip-sync submission did not start. Check credits or sign-in status.',
      });
    }
  };

  // Watch `generations` to hydrate completed Scene Images, Stage 1 Videos, Final Videos, Character & Wardrobe images
  useEffect(() => {
    if (pendingCharGenId) {
      const gen = generations.find((g) => g.id === pendingCharGenId);
      if (gen?.status === 'completed' && gen.outputs[0]?.url) {
        setNewCharRefUrl(gen.outputs[0].url);
        setPendingCharGenId(null);
        toast.success('Performer facial identity generated! Review and click Save Performer.');
      } else if (gen && (gen.status === 'failed' || gen.status === 'nsfw' || gen.status === 'canceled')) {
        setPendingCharGenId(null);
      }
    }

    if (pendingWardrobeGenId) {
      const gen = generations.find((g) => g.id === pendingWardrobeGenId);
      if (gen?.status === 'completed' && gen.outputs[0]?.url) {
        setNewWardrobeRefUrl(gen.outputs[0].url);
        setPendingWardrobeGenId(null);
        toast.success('Wardrobe lookbook plate generated! Click Save Wardrobe.');
      } else if (gen && (gen.status === 'failed' || gen.status === 'nsfw' || gen.status === 'canceled')) {
        setPendingWardrobeGenId(null);
      }
    }

    // Hydrate scenes
    scenes.forEach((sc) => {
      if (sc.referenceImageGenerationId && sc.status === 'generating_image') {
        const gen = generations.find((g) => g.id === sc.referenceImageGenerationId);
        if (gen?.status === 'completed' && gen.outputs[0]?.url) {
          updateSceneById(sc.id, {
            referenceImageUrl: gen.outputs[0].url,
            status: sc.finalVideoUrl ? 'ready' : 'draft',
            errorMessage: undefined,
          });
          toast.success(`${sc.title}: Scene reference image ready`);
        } else if (gen && (gen.status === 'failed' || gen.status === 'nsfw' || gen.status === 'canceled')) {
          updateSceneById(sc.id, {
            status: 'error',
            errorMessage: gen.error || 'Scene image generation failed.',
          });
        }
      }

      if (sc.stage1GenerationId && sc.status === 'generating_video') {
        const gen = generations.find((g) => g.id === sc.stage1GenerationId);
        if (gen?.status === 'completed' && gen.outputs[0]?.url) {
          const stage1Url = gen.outputs[0].url;
          const shouldAutoChain = pendingTwoStageSceneIds[sc.id];
          if (shouldAutoChain) {
            setPendingTwoStageSceneIds((prev) => {
              const next = { ...prev };
              delete next[sc.id];
              return next;
            });
            updateSceneById(sc.id, { stage1VideoUrl: stage1Url });
            runPostProcessLipSyncForScene(sc, stage1Url);
          } else {
            updateSceneById(sc.id, {
              stage1VideoUrl: stage1Url,
              finalVideoUrl: sc.mode === 'b_roll' ? stage1Url : sc.finalVideoUrl,
              status: sc.mode === 'b_roll' ? 'ready' : 'draft',
              errorMessage: undefined,
            });
            toast.success(`${sc.title}: Animated video clip ready`);
          }
        } else if (gen && (gen.status === 'failed' || gen.status === 'nsfw' || gen.status === 'canceled')) {
          updateSceneById(sc.id, {
            status: 'error',
            errorMessage: gen.error || 'Video animation failed.',
          });
        }
      }

      if (sc.finalVideoGenerationId && sc.status === 'generating_lipsync') {
        const gen = generations.find((g) => g.id === sc.finalVideoGenerationId);
        if (gen?.status === 'completed' && gen.outputs[0]?.url) {
          updateSceneById(sc.id, {
            finalVideoUrl: gen.outputs[0].url,
            status: 'ready',
            errorMessage: undefined,
          });
          toast.success(`${sc.title}: Lip-synced performance ready`);
        } else if (gen && (gen.status === 'failed' || gen.status === 'nsfw' || gen.status === 'canceled')) {
          updateSceneById(sc.id, {
            status: 'error',
            errorMessage: gen.error || 'Lip-sync generation failed.',
          });
        }
      }
    });
  }, [generations, pendingCharGenId, pendingWardrobeGenId, scenes, pendingTwoStageSceneIds]);

  // Build continuity-rich prompt for scene image or video
  const buildScenePrompt = (scene: MusicVideoScene, purpose: 'scene_image' | 'lip_sync' | 'b_roll') => {
    const char = characters.find((c) => c.id === scene.characterId);
    const ward = wardrobes.find((w) => w.id === scene.wardrobeId);
    const parts: string[] = [];

    if (char) {
      parts.push(`Performer: ${char.name} (${char.facePromptDescriptor || char.roleTitle}). Strict facial identity consistency.`);
    }
    if (ward) {
      parts.push(`Wardrobe: ${ward.name} (${ward.description}).`);
    }

    if (purpose === 'scene_image') {
      parts.push(scene.scenePrompt);
      if (scene.environmentPrompt) parts.push(`Environment: ${scene.environmentPrompt}.`);
      parts.push(`Camera: ${scene.cameraAngle}. Lighting: ${scene.lightingStyle}. Style: ${scene.visualStyle}.`);
    } else if (purpose === 'lip_sync') {
      parts.push(`Music Video Lip-Sync Performance (${formatTimecode(scene.audioStartSec)}-${formatTimecode(scene.audioEndSec)}).`);
      parts.push(scene.performanceDirection || scene.scenePrompt);
      parts.push(`Facial expression: ${scene.facialExpression}. Gestures & body: ${scene.gesturesAndBody}.`);
      parts.push(`Camera: ${scene.cameraAngle}, ${scene.cameraMovement}. Lighting: ${scene.lightingStyle}.`);
    } else {
      const preset = BROLL_PRESETS.find((p) => p.id === scene.bRollPreset);
      parts.push(`Music Video B-Roll (${preset?.label || 'Cinematic Insert'}).`);
      parts.push(scene.bRollMotionPrompt || scene.scenePrompt);
      if (scene.environmentPrompt) parts.push(`Setting: ${scene.environmentPrompt}.`);
      parts.push(`Camera: ${scene.cameraAngle}, ${scene.cameraMovement}. Lighting: ${scene.lightingStyle}. Style: ${scene.visualStyle}.`);
    }

    return parts.filter(Boolean).join(' ');
  };

  // Action: Generate Scene Reference Image (Option A)
  const handleGenerateSceneImage = async () => {
    if (!activeScene || !selectedSceneImageModel) return;
    setIsGeneratingAction(true);
    try {
      const char = characters.find((c) => c.id === activeScene.characterId);
      const ward = wardrobes.find((w) => w.id === activeScene.wardrobeId);
      const media: MediaSlotInput[] = [];
      if (char?.faceReferenceUrl) {
        media.push({ role: 'reference', kind: 'image', url: char.faceReferenceUrl, label: char.name });
      }
      if (ward?.referenceImageUrl) {
        media.push({ role: 'reference', kind: 'image', url: ward.referenceImageUrl, label: ward.name });
      }

      const imgAspects = getSupportedAspectRatios(selectedSceneImageModel);
      const safeAspect = imgAspects.some((a) => a.value === activeScene.aspectRatio)
        ? activeScene.aspectRatio
        : imgAspects[0]?.value || '16:9';

      const res = await submitGeneration({
        surface: 'image',
        modelId: selectedSceneImageModel.id,
        mode: selectedSceneImageModel.modes[0] || 'Create',
        prompt: buildScenePrompt(activeScene, 'scene_image'),
        settings: {
          aspect_ratio: safeAspect,
          resolution: '2K',
        },
        media,
      });

      if (res.ok && res.generation) {
        updateActiveScene({
          referenceImageGenerationId: res.generation.id,
          status: 'generating_image',
          errorMessage: undefined,
        });
        toast.success(`Generating scene reference frame via ${selectedSceneImageModel.label}`);
      } else if (res.error) {
        toast.error(res.error);
      }
    } finally {
      setIsGeneratingAction(false);
    }
  };

  // Action: Upload Scene Image / Storyboard Frame (Option B)
  const handleUploadSceneImage = async (file: File) => {
    if (!activeScene) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP).');
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const uploaded = await uploadReferenceFile({
      label: file.name,
      contentType: file.type || 'image/png',
      bytes: file.size,
      dataUrl,
    });
    updateActiveScene({
      sceneSource: 'upload',
      referenceImageUrl: uploaded?.publicUrl || dataUrl,
      errorMessage: undefined,
    });
    toast.success(`Scene reference "${file.name}" attached`);
  };

  // Action: Generate Scene Video (Mode A Lip-Sync OR Mode B B-Roll)
  const handleGenerateSceneClip = async (options?: { stage1Only?: boolean }) => {
    if (!activeScene) return;
    setIsGeneratingAction(true);

    try {
      const char = characters.find((c) => c.id === activeScene.characterId);
      const ward = wardrobes.find((w) => w.id === activeScene.wardrobeId);
      const clipDuration = Math.max(
        1,
        Math.round(activeScene.audioEndSec - activeScene.audioStartSec) || activeScene.durationSec || 5
      );
      const effectiveDuration =
        supportedDurations.length > 0
          ? Number(
              supportedDurations.reduce((best, opt) =>
                Math.abs(Number(opt.value) - clipDuration) < Math.abs(Number(best.value) - clipDuration)
                  ? opt
                  : best
              ).value
            )
          : clipDuration;

      // MODE B: B-ROLL GENERATION (No lip-sync required)
      if (activeScene.mode === 'b_roll') {
        const model = selectedAnimationModel;
        if (!model) {
          toast.error('Select a compatible B-Roll video model.');
          return;
        }
        const media: MediaSlotInput[] = [];
        const startImg = activeScene.referenceImageUrl || char?.faceReferenceUrl;
        if (startImg && model.roles.some((r) => r.role === 'start' && r.kind === 'image')) {
          media.push({ role: 'start', kind: 'image', url: startImg, label: `${activeScene.title} Frame` });
        }
        if (char?.faceReferenceUrl && model.roles.some((r) => r.role === 'reference' && r.kind === 'image')) {
          media.push({ role: 'reference', kind: 'image', url: char.faceReferenceUrl, label: char.name });
        }
        if (ward?.referenceImageUrl && model.roles.some((r) => r.role === 'reference' && r.kind === 'image')) {
          media.push({ role: 'reference', kind: 'image', url: ward.referenceImageUrl, label: ward.name });
        }

        const res = await submitGeneration({
          surface: 'video',
          modelId: model.id,
          mode: model.modes[0] || 'Create Video',
          prompt: buildScenePrompt(activeScene, 'b_roll'),
          settings: {
            aspect_ratio: activeScene.aspectRatio,
            resolution: activeScene.resolution,
            duration: effectiveDuration,
            ...activeScene.modelSettings,
          },
          media,
        });

        if (res.ok && res.generation) {
          updateActiveScene({
            stage1GenerationId: res.generation.id,
            status: 'generating_video',
            errorMessage: undefined,
          });
          toast.success(`B-Roll clip queued via ${model.label}`);
        } else if (res.error) {
          toast.error(res.error);
        }
        return;
      }

      // MODE A: LIP SYNC PERFORMANCE
      if (!audioTrack) {
        toast.error('Import a music track first so lip sync has an audio segment to synchronize.');
        return;
      }
      const perfImageUrl = activeScene.referenceImageUrl || char?.faceReferenceUrl;
      if (!perfImageUrl) {
        toast.error('Generate or upload a scene reference image (or assign a performer portrait) first.');
        return;
      }

      // Pipeline 1: Native Audio-Driven Lip Sync (Image + Trimmed Audio -> Lip-Synced Video)
      if (activeScene.lipSyncPipeline === 'native_audio') {
        const model = selectedLipSyncModel || nativeLipSyncModels[0];
        if (!model) {
          toast.error('No native audio lip-sync model available.');
          return;
        }
        const audioSlot = await prepareTrimmedAudioMediaSlot(activeScene);
        if (!audioSlot) return;

        const media: MediaSlotInput[] = [
          { role: 'start', kind: 'image', url: perfImageUrl, label: `${activeScene.title} Performer Scene` },
          audioSlot,
        ];

        const res = await submitGeneration({
          surface: 'video',
          modelId: model.id,
          mode: model.modes[0] || 'Audio Lip Sync',
          prompt: buildScenePrompt(activeScene, 'lip_sync'),
          settings: {
            aspect_ratio: activeScene.aspectRatio,
            resolution: activeScene.resolution,
            duration: clipDuration,
            ...activeScene.modelSettings,
          },
          media,
        });

        if (res.ok && res.generation) {
          updateActiveScene({
            finalVideoGenerationId: res.generation.id,
            status: 'generating_lipsync',
            errorMessage: undefined,
          });
          toast.success(
            `Native Lip Sync queued (${formatTimecode(activeScene.audioStartSec)}–${formatTimecode(activeScene.audioEndSec)}) via ${model.label}`
          );
        } else if (res.error) {
          toast.error(res.error);
        }
        return;
      }

      // Pipeline 2: Two-Stage Animation + Lip Sync
      const animModel = selectedAnimationModel;
      if (!animModel) {
        toast.error('Select a Stage 1 animation model.');
        return;
      }

      const stage1Media: MediaSlotInput[] = [
        { role: 'start', kind: 'image', url: perfImageUrl, label: `${activeScene.title} Frame` },
      ];
      if (char?.faceReferenceUrl && animModel.roles.some((r) => r.role === 'reference')) {
        stage1Media.push({ role: 'reference', kind: 'image', url: char.faceReferenceUrl, label: char.name });
      }

      const stage1Res = await submitGeneration({
        surface: 'video',
        modelId: animModel.id,
        mode: animModel.modes[0] || 'Create Video',
        prompt: buildScenePrompt(activeScene, 'lip_sync'),
        settings: {
          aspect_ratio: activeScene.aspectRatio,
          resolution: activeScene.resolution,
          duration: effectiveDuration,
          ...activeScene.modelSettings,
        },
        media: stage1Media,
      });

      if (stage1Res.ok && stage1Res.generation) {
        if (!options?.stage1Only) {
          setPendingTwoStageSceneIds((prev) => ({ ...prev, [activeScene.id]: true }));
        }
        updateActiveScene({
          stage1GenerationId: stage1Res.generation.id,
          status: 'generating_video',
          errorMessage: undefined,
        });
        toast.success(
          options?.stage1Only
            ? `Stage 1 animation queued via ${animModel.label}`
            : `Two-Stage Pipeline started: Stage 1 (${animModel.label}) → Stage 2 (${selectedLipSyncModel?.label || 'Lip Sync'})`
        );
      } else if (stage1Res.error) {
        toast.error(stage1Res.error);
      }
    } finally {
      setIsGeneratingAction(false);
    }
  };

  // Performer Creation Helpers
  const handleGeneratePerformerFace = async () => {
    if (!newCharName.trim() || !newCharAppearance.trim()) {
      toast.error('Enter a performer name and appearance description first.');
      return;
    }
    const res = await submitGeneration({
      surface: 'image',
      modelId: charGenModelId,
      mode: 'Create',
      prompt: `Music video artist facial identity reference portrait of ${newCharName.trim()}: ${newCharAppearance.trim()}. Crisp editorial studio portrait lighting, sharp facial details, consistent identity reference.`,
      settings: { aspect_ratio: '3:4', resolution: '2K' },
      media: newCharRefUrl
        ? [{ role: 'reference', kind: 'image', url: newCharRefUrl, label: newCharName }]
        : [],
    });
    if (res.ok && res.generation) {
      setPendingCharGenId(res.generation.id);
      toast.success(`Generating facial identity for ${newCharName.trim()}...`);
    } else if (res.error) {
      toast.error(res.error);
    }
  };

  const handleSavePerformer = async () => {
    if (!newCharName.trim()) {
      toast.error('Enter a performer name.');
      return;
    }
    const saved = await saveCharacter({
      name: newCharName.trim(),
      roleTitle: 'Music Video Performer',
      facePromptDescriptor: newCharAppearance.trim() || newCharName.trim(),
      faceReferenceUrl: newCharRefUrl || '',
      facialIdentityLock: true,
      consistencyLock: true,
    });
    if (saved) {
      updateActiveScene({ characterId: saved.id });
      setNewCharName('');
      setNewCharAppearance('');
      setNewCharRefUrl('');
      toast.success(`Saved performer "${saved.name}" to My Elements & assigned to current scene`);
    }
  };

  const handleGenerateWardrobePlate = async () => {
    if (!newWardrobeName.trim() || !newWardrobePrompt.trim()) {
      toast.error('Enter an outfit name and styling description first.');
      return;
    }
    const res = await submitGeneration({
      surface: 'image',
      modelId: charGenModelId,
      mode: 'Create',
      prompt: `Music video costume and wardrobe design lookbook plate — ${newWardrobeName.trim()}: ${newWardrobePrompt.trim()}. Full outfit styling, fabric texture detail, studio lookbook photography.`,
      settings: { aspect_ratio: '3:4', resolution: '2K' },
      media: [],
    });
    if (res.ok && res.generation) {
      setPendingWardrobeGenId(res.generation.id);
      toast.success(`Generating wardrobe reference for ${newWardrobeName.trim()}...`);
    } else if (res.error) {
      toast.error(res.error);
    }
  };

  const handleSaveWardrobe = async () => {
    if (!newWardrobeName.trim()) {
      toast.error('Enter a wardrobe or outfit name.');
      return;
    }
    const saved = await saveWardrobe({
      name: newWardrobeName.trim(),
      category: 'Costume',
      description: newWardrobePrompt.trim() || newWardrobeName.trim(),
      garments: newWardrobePrompt.trim() || newWardrobeName.trim(),
      referenceImageUrl: newWardrobeRefUrl || '',
      sceneContinuityLock: true,
    });
    if (saved) {
      updateActiveScene({ wardrobeId: saved.id });
      setNewWardrobeName('');
      setNewWardrobePrompt('');
      setNewWardrobeRefUrl('');
      toast.success(`Saved wardrobe "${saved.name}" to My Elements & assigned to scene`);
    }
  };

  // Scene sequence operations
  const handleAddScene = (mode: MusicVideoGenerationMode) => {
    const lastScene = scenes[scenes.length - 1];
    const totalDur = audioTrack?.durationSec || 60;
    const nextStart = lastScene ? Math.min(Math.max(0, totalDur - 4), lastScene.audioEndSec) : 0;
    const nextEnd = Math.min(totalDur, nextStart + 6);
    const created = createDefaultScene(scenes.length, mode, {
      startSec: nextStart,
      endSec: Math.max(nextStart + 1.5, nextEnd),
      aspectRatio: defaultAspectRatio,
      characterId: activeScene?.characterId || characters[0]?.id || null,
      wardrobeId: activeScene?.wardrobeId || wardrobes[0]?.id || null,
      imageModelId: defaultImageModelId,
      animationModelId: defaultAnimationModelId,
      lipSyncModelId: defaultNativeLipSyncId,
    });
    setScenes((prev) => [...prev, created]);
    setActiveSceneId(created.id);
    toast.success(`Added ${mode === 'lip_sync' ? 'Lip-Sync' : 'B-Roll'} Scene ${scenes.length + 1}`);
  };

  const handleDuplicateScene = (sc: MusicVideoScene) => {
    const copy: MusicVideoScene = {
      ...sc,
      id: `mv_sc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: `${sc.title} (Copy)`,
      order: scenes.length,
      status: sc.finalVideoUrl ? 'ready' : 'draft',
    };
    setScenes((prev) => [...prev, copy]);
    setActiveSceneId(copy.id);
    toast.success(`Duplicated "${sc.title}"`);
  };

  const handleMoveScene = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= scenes.length) return;
    setScenes((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next.map((sc, idx) => ({ ...sc, order: idx }));
    });
  };

  const handleDeleteScene = (id: string) => {
    if (scenes.length <= 1) {
      toast.error('A music video sequence requires at least one scene.');
      return;
    }
    setScenes((prev) => {
      const filtered = prev.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx }));
      if (activeSceneId === id && filtered[0]) {
        setActiveSceneId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleAutoSpaceScenes = () => {
    const totalDur = audioTrack?.durationSec || scenes.length * 6;
    const slot = totalDur / Math.max(1, scenes.length);
    setScenes((prev) =>
      prev.map((sc, idx) => ({
        ...sc,
        audioStartSec: Number((idx * slot).toFixed(2)),
        audioEndSec: Number(Math.min(totalDur, (idx + 1) * slot).toFixed(2)),
      }))
    );
    toast.success(`Distributed ${scenes.length} scenes cleanly across ${formatTimecode(totalDur)}`);
  };

  const handleApplyGlobalOrientation = (ratio: string) => {
    setDefaultAspectRatio(ratio);
    setScenes((prev) => prev.map((sc) => ({ ...sc, aspectRatio: ratio })));
    toast.success(`Orientation set to ${ratio} across sequence`);
  };

  // Persist Music Video project to Cinema Studio backend
  const handleSaveMusicVideoProject = async () => {
    setIsSavingProject(true);
    try {
      const payload: MusicVideoProjectData = {
        audioTrack,
        defaultAspectRatio,
        scenes,
        updatedAt: new Date().toISOString(),
      };
      const castIds = Array.from(
        new Set(scenes.map((s) => s.characterId).filter((v): v is string => Boolean(v)))
      );
      const wardIds = Array.from(
        new Set(scenes.map((s) => s.wardrobeId).filter((v): v is string => Boolean(v)))
      );
      const saved = await saveCinemaProject({
        id: activeProject?.id,
        title: projectTitle || 'Untitled Music Video',
        productionType: 'Music Videos',
        aspectRatio: (['16:9', '21:9', '9:16', '1:1'].includes(defaultAspectRatio)
          ? defaultAspectRatio
          : '16:9') as '16:9' | '21:9' | '9:16' | '1:1',
        castCharacterIds: castIds,
        wardrobeIds: wardIds,
        musicTrackUrl: audioTrack?.sourceUrl,
        musicVideoData: payload,
      });
      if (saved) {
        toast.success(`Saved Music Video production "${saved.title}"`);
      }
    } finally {
      setIsSavingProject(false);
    }
  };

  // Master Assembly Playback Sync
  const activeAssemblyScene = useMemo(() => {
    const match = scenes.find(
      (sc) => assemblyTime >= sc.audioStartSec && assemblyTime <= sc.audioEndSec
    );
    if (match) return match;
    // Fallback to nearest scene before playhead or first scene
    const prior = [...scenes].reverse().find((sc) => assemblyTime >= sc.audioStartSec);
    return prior || scenes[0];
  }, [scenes, assemblyTime]);

  useEffect(() => {
    if (!assemblyPlaying) return;
    let raf = 0;
    const tick = () => {
      if (assemblyAudioRef.current) {
        setAssemblyTime(assemblyAudioRef.current.currentTime);
      } else {
        setAssemblyTime((t) => {
          const maxEnd = Math.max(12, ...scenes.map((s) => s.audioEndSec));
          const next = t + 0.033;
          if (next >= maxEnd) {
            setAssemblyPlaying(false);
            return 0;
          }
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [assemblyPlaying, scenes]);

  const toggleAssemblyPlayback = () => {
    if (assemblyAudioRef.current) {
      if (assemblyPlaying) {
        assemblyAudioRef.current.pause();
        setAssemblyPlaying(false);
      } else {
        assemblyAudioRef.current
          .play()
          .then(() => setAssemblyPlaying(true))
          .catch(() => toast.error('Audio playback could not start.'));
      }
    } else {
      setAssemblyPlaying((p) => !p);
    }
  };

  // Estimated token cost for active video generation
  const estimatedClipCost = useMemo(() => {
    if (!activeScene || !primaryActiveVideoModel) return 0;
    const dur = Math.max(1, Math.round(activeScene.audioEndSec - activeScene.audioStartSec) || 5);
    if (activeScene.mode === 'lip_sync' && activeScene.lipSyncPipeline === 'two_stage') {
      const stage1Cost = calculateTokenCost(primaryActiveVideoModel.id, {
        duration: dur,
        resolution: activeScene.resolution,
      });
      const stage2Cost = selectedLipSyncModel
        ? calculateTokenCost(selectedLipSyncModel.id, {
            duration: dur,
            resolution: activeScene.resolution,
          })
        : 0;
      return stage1Cost + stage2Cost;
    }
    return calculateTokenCost(primaryActiveVideoModel.id, {
      duration: dur,
      resolution: activeScene.resolution,
    });
  }, [activeScene, primaryActiveVideoModel, selectedLipSyncModel, calculateTokenCost]);

  const estimatedImageCost = useMemo(() => {
    if (!selectedSceneImageModel) return 0;
    return calculateTokenCost(selectedSceneImageModel.id, { resolution: '2K' });
  }, [selectedSceneImageModel, calculateTokenCost]);

  const activePerformer = characters.find((c) => c.id === activeScene?.characterId);
  const activeWardrobe = wardrobes.find((w) => w.id === activeScene?.wardrobeId);
  const readySceneCount = scenes.filter((s) => Boolean(s.finalVideoUrl)).length;

  const aspectContainerClass =
    activeScene?.aspectRatio === '9:16'
      ? 'aspect-[9/16] max-h-[460px] mx-auto'
      : activeScene?.aspectRatio === '1:1'
      ? 'aspect-square max-h-[440px] mx-auto'
      : activeScene?.aspectRatio === '21:9'
      ? 'aspect-[21/9]'
      : 'aspect-video';

  return (
    <div className="space-y-4 pb-10">
      {/* ==================================================================
          TOP MUSIC VIDEO PRODUCTION BAR
          ================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#11131A] px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#46ecd5]/15 border border-[#46ecd5]/35 flex items-center justify-center text-[#46ecd5] shrink-0">
            <Music className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#46ecd5] font-bold">
                Music Video Production
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-[11px] font-mono tabular-nums text-zinc-400">
                {scenes.length} scenes · {readySceneCount} rendered
              </span>
            </div>
            <input
              value={projectTitle}
              onChange={(e) => onProjectTitleChange?.(e.target.value)}
              className="bg-transparent text-sm sm:text-base font-bold text-white focus:outline-none focus:text-[#46ecd5] truncate max-w-[240px] sm:max-w-[340px]"
              placeholder="Music Video Title"
            />
          </div>
        </div>

        {/* Workspace Sub-Navigation */}
        <AnimatedPillTabs
          layoutId="music-video-subtabs"
          activeId={workspaceTab}
          onChange={(id) => setWorkspaceTab(id as 'direct' | 'performers' | 'assembly')}
          items={[
            { id: 'direct', label: 'Direct Scene', icon: <Clapperboard className="w-3.5 h-3.5" /> },
            {
              id: 'performers',
              label: 'Performers & Wardrobe',
              icon: <Users className="w-3.5 h-3.5" />,
              count: characters.length,
            },
            {
              id: 'assembly',
              label: 'Sequence & Assembly',
              icon: <Layers className="w-3.5 h-3.5" />,
              count: scenes.length,
            },
          ]}
        />

        {/* Global Orientation & Save */}
        <div className="flex items-center gap-2">
          <div className="hidden md:inline-flex items-center rounded-xl border border-white/10 bg-[#0B0D12] p-0.5">
            {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => handleApplyGlobalOrientation(ratio)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                  defaultAspectRatio === ratio
                    ? 'bg-[#46ecd5] text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSavingProject}
            onClick={handleSaveMusicVideoProject}
          >
            {isSavingProject ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 text-[#46ecd5]" />
            )}
            <span>Save Project</span>
          </Button>
        </div>
      </div>

      {/* ==================================================================
          PERSISTENT AUDIO STUDIO & NON-DESTRUCTIVE WAVEFORM TRIM TIMELINE
          ================================================================== */}
      <MusicVideoAudioTimeline
        audioTrack={audioTrack}
        audioBufferRef={audioBufferRef}
        startSec={activeScene?.audioStartSec ?? 0}
        endSec={activeScene?.audioEndSec ?? 6}
        scenes={scenes}
        activeSceneId={activeScene?.id || ''}
        existingAudioUploads={existingAudioUploads}
        sessionToken={sessionToken}
        uploadReferenceFile={uploadReferenceFile}
        onTrackLoaded={(track, buffer) => {
          audioBufferRef.current = buffer;
          setAudioTrack(track);
          // Clamp any scene ranges that exceed new song duration
          setScenes((prev) =>
            prev.map((sc, idx) => {
              const slotLen = Math.min(6, Math.max(2, track.durationSec / Math.max(1, prev.length)));
              const start =
                sc.audioStartSec < track.durationSec - 1
                  ? sc.audioStartSec
                  : Number((idx * slotLen).toFixed(2));
              const end = Math.min(
                track.durationSec,
                sc.audioEndSec > start + 1 && sc.audioEndSec <= track.durationSec
                  ? sc.audioEndSec
                  : Number((start + slotLen).toFixed(2))
              );
              return { ...sc, audioStartSec: start, audioEndSec: Math.max(start + 1, end) };
            })
          );
        }}
        onClearTrack={() => setAudioTrack(null)}
        onChangeRange={(nextStart, nextEnd) => {
          updateActiveScene({
            audioStartSec: nextStart,
            audioEndSec: nextEnd,
            durationSec: Math.max(1, Math.round(nextEnd - nextStart)),
          });
        }}
        onSelectScene={(sceneId) => {
          setActiveSceneId(sceneId);
          setWorkspaceTab('direct');
        }}
      />

      {/* ==================================================================
          VIEW 1: PERFORMERS & WARDROBE (CHARACTER & APPEARANCE CREATION)
          ================================================================== */}
      {workspaceTab === 'performers' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Hidden file inputs for photo uploads */}
          <input
            ref={charPhotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const dataUrl = await readFileAsDataUrl(file);
              const up = await uploadReferenceFile({
                label: file.name,
                contentType: file.type || 'image/png',
                bytes: file.size,
                dataUrl,
              });
              setNewCharRefUrl(up?.publicUrl || dataUrl);
              toast.success('Performer photograph uploaded');
              e.target.value = '';
            }}
          />
          <input
            ref={wardrobePhotoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const dataUrl = await readFileAsDataUrl(file);
              const up = await uploadReferenceFile({
                label: file.name,
                contentType: file.type || 'image/png',
                bytes: file.size,
                dataUrl,
              });
              setNewWardrobeRefUrl(up?.publicUrl || dataUrl);
              toast.success('Wardrobe image uploaded');
              e.target.value = '';
            }}
          />

          {/* LEFT: PERFORMER IDENTITY & FACE CREATOR */}
          <SpotlightCard className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#46ecd5]" />
                  <span>Performers & Facial Identities</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Generate new artist faces, upload performer photos, or select saved identities from My Elements.
                </p>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-zinc-400">
                {characters.length} saved
              </span>
            </div>

            {/* Saved Performers Grid */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Select From My Elements
              </div>
              {characters.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-500">
                  No saved performers yet. Upload a performer photograph or generate an identity below.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {characters.map((ch) => {
                    const isAssigned = activeScene?.characterId === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          updateActiveScene({ characterId: isAssigned ? null : ch.id });
                          toast.success(
                            isAssigned
                              ? `Removed ${ch.name} from current scene`
                              : `Assigned ${ch.name} to ${activeScene?.title}`
                          );
                        }}
                        className={`group rounded-xl border p-2 text-left transition-all cursor-pointer ${
                          isAssigned
                            ? 'border-[#46ecd5] bg-[#46ecd5]/10'
                            : 'border-white/10 bg-[#0D0F15] hover:border-white/25'
                        }`}
                      >
                        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-zinc-900 mb-2 relative">
                          {ch.faceReferenceUrl ? (
                            <img
                              src={ch.faceReferenceUrl}
                              alt={ch.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Users className="w-5 h-5" />
                            </div>
                          )}
                          {isAssigned && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#46ecd5] text-zinc-950 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-bold text-white truncate">{ch.name}</div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {ch.facialIdentityLock ? 'Facial Lock Active' : ch.roleTitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create or Upload New Performer */}
            <div className="pt-3 border-t border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                  Create or Upload New Performer
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => charPhotoInputRef.current?.click()}
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Photo</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-2.5">
                  <Input
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    placeholder="Performer name (e.g. Zara Voss — Lead Vocalist)"
                  />
                  <Textarea
                    value={newCharAppearance}
                    onChange={(e) => setNewCharAppearance(e.target.value)}
                    placeholder="Describe facial features, hairstyle, skin tone, age, makeup & signature presence..."
                    className="min-h-[78px]"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={charGenModelId} onValueChange={setCharGenModelId}>
                      <SelectTrigger className="w-44 h-8 text-[11px]">
                        <SelectValue placeholder="Image model" />
                      </SelectTrigger>
                      <SelectContent>
                        {imageModels.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="cyanGhost"
                      size="sm"
                      disabled={Boolean(pendingCharGenId)}
                      onClick={handleGeneratePerformerFace}
                    >
                      {pendingCharGenId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Generate Face</span>
                    </Button>
                    <Button type="button" variant="default" size="sm" onClick={handleSavePerformer}>
                      Save Performer
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0B0D12] overflow-hidden flex flex-col items-center justify-center aspect-[3/4]">
                  {newCharRefUrl ? (
                    <img
                      src={newCharRefUrl}
                      alt="Performer preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-3 text-center text-[11px] text-zinc-500 space-y-1">
                      <Users className="w-5 h-5 mx-auto text-zinc-600" />
                      <div>Identity preview</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SpotlightCard>

          {/* RIGHT: WARDROBE, COSTUMES & OUTFITS */}
          <SpotlightCard className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-[#46ecd5]" />
                  <span>Wardrobe, Costumes & Outfits</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Design consistent music-video outfits and save reusable wardrobe references across scenes.
                </p>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-zinc-400">
                {wardrobes.length} saved
              </span>
            </div>

            {/* Saved Wardrobes Grid */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Saved Wardrobe References
              </div>
              {wardrobes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-zinc-500">
                  No saved wardrobes yet. Design a costume below or upload an outfit reference.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {wardrobes.map((w) => {
                    const isAssigned = activeScene?.wardrobeId === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          updateActiveScene({ wardrobeId: isAssigned ? null : w.id });
                          toast.success(
                            isAssigned
                              ? `Cleared wardrobe from current scene`
                              : `Locked wardrobe "${w.name}" to ${activeScene?.title}`
                          );
                        }}
                        className={`rounded-xl border p-2 text-left transition-all cursor-pointer ${
                          isAssigned
                            ? 'border-[#46ecd5] bg-[#46ecd5]/10'
                            : 'border-white/10 bg-[#0D0F15] hover:border-white/25'
                        }`}
                      >
                        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-zinc-900 mb-2 relative">
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
                          {isAssigned && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#46ecd5] text-zinc-950 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-bold text-white truncate">{w.name}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{w.description}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Design or Upload Outfit */}
            <div className="pt-3 border-t border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                  Design or Upload Outfit
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => wardrobePhotoInputRef.current?.click()}
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Outfit</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-2.5">
                  <Input
                    value={newWardrobeName}
                    onChange={(e) => setNewWardrobeName(e.target.value)}
                    placeholder="Outfit title (e.g. Chrome Trench & Leather Boots)"
                  />
                  <Textarea
                    value={newWardrobePrompt}
                    onChange={(e) => setNewWardrobePrompt(e.target.value)}
                    placeholder="Describe garments, silhouettes, fabrics, jewelry, eyewear & color palette..."
                    className="min-h-[78px]"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="cyanGhost"
                      size="sm"
                      disabled={Boolean(pendingWardrobeGenId)}
                      onClick={handleGenerateWardrobePlate}
                    >
                      {pendingWardrobeGenId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Generate Outfit</span>
                    </Button>
                    <Button type="button" variant="default" size="sm" onClick={handleSaveWardrobe}>
                      Save Wardrobe
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0B0D12] overflow-hidden flex flex-col items-center justify-center aspect-[3/4]">
                  {newWardrobeRefUrl ? (
                    <img
                      src={newWardrobeRefUrl}
                      alt="Wardrobe preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-3 text-center text-[11px] text-zinc-500 space-y-1">
                      <Shirt className="w-5 h-5 mx-auto text-zinc-600" />
                      <div>Outfit preview</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SpotlightCard>
        </div>
      )}

      {/* ==================================================================
          VIEW 2: DIRECT SCENE (SCENE DESIGN + MODE A LIP-SYNC / MODE B B-ROLL)
          ================================================================== */}
      {workspaceTab === 'direct' && activeScene && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Hidden scene upload input */}
          <input
            ref={sceneUploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadSceneImage(file);
              e.target.value = '';
            }}
          />

          {/* LEFT 7 COLUMNS: LARGE STAGE PREVIEW, SCENE CREATION (OPTION A / B) & SEQUENCE STRIP */}
          <div className="xl:col-span-7 space-y-4">
            {/* Stage Monitor Card */}
            <div className="rounded-2xl border border-white/10 bg-[#0F1117] overflow-hidden">
              {/* Stage Header */}
              <div className="px-4 py-2.5 border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-2 bg-[#13161E]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-bold text-[#46ecd5]">
                    S{scenes.findIndex((s) => s.id === activeScene.id) + 1}
                  </span>
                  <input
                    value={activeScene.title}
                    onChange={(e) => updateActiveScene({ title: e.target.value })}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none focus:text-[#46ecd5] min-w-[160px]"
                  />
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-zinc-400">
                  <span>{activeScene.mode === 'lip_sync' ? 'Lip Sync Performance' : 'B-Roll Shot'}</span>
                  <span>·</span>
                  <span>{activeScene.aspectRatio}</span>
                  <span>·</span>
                  <span>
                    {formatTimecode(activeScene.audioStartSec)}–{formatTimecode(activeScene.audioEndSec)}
                  </span>
                </div>
              </div>

              {/* Large Stage Viewport */}
              <div className="p-4 bg-[#090B10]">
                <div
                  className={`relative w-full ${aspectContainerClass} rounded-xl overflow-hidden border border-white/10 bg-[#0D1017] flex items-center justify-center`}
                >
                  {activeScene.finalVideoUrl ? (
                    isRenderableVideoUrl(activeScene.finalVideoUrl) ? (
                      <video
                        key={activeScene.finalVideoUrl}
                        src={activeScene.finalVideoUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <img
                        src={activeScene.finalVideoUrl}
                        alt={activeScene.title}
                        className="w-full h-full object-contain bg-black"
                      />
                    )
                  ) : activeScene.stage1VideoUrl ? (
                    isRenderableVideoUrl(activeScene.stage1VideoUrl) ? (
                      <video
                        key={activeScene.stage1VideoUrl}
                        src={activeScene.stage1VideoUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <img
                        src={activeScene.stage1VideoUrl}
                        alt={activeScene.title}
                        className="w-full h-full object-contain bg-black"
                      />
                    )
                  ) : activeScene.referenceImageUrl ? (
                    <img
                      src={activeScene.referenceImageUrl}
                      alt={activeScene.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center px-6 py-8 max-w-md space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
                        <Film className="w-5 h-5 text-[#46ecd5]" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-white">No Visual Plate Yet</div>
                        <p className="text-xs text-zinc-400">
                          Generate a scene reference image below or upload an existing scene / storyboard frame to animate.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="cyanGhost"
                          size="sm"
                          onClick={handleGenerateSceneImage}
                          disabled={isGeneratingAction}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Scene Image</span>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => sceneUploadInputRef.current?.click()}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Scene</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Generating Progress Overlay */}
                  {(activeScene.status === 'generating_image' ||
                    activeScene.status === 'generating_video' ||
                    activeScene.status === 'generating_lipsync') && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5 text-center p-4">
                      <Loader2 className="w-7 h-7 text-[#46ecd5] animate-spin" />
                      <div className="text-xs font-bold text-white">
                        {activeScene.status === 'generating_image'
                          ? 'Rendering Scene Reference Frame...'
                          : activeScene.status === 'generating_video'
                          ? 'Animating Scene Footage...'
                          : 'Synchronizing Vocal Lip Movements to Trimmed Audio...'}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 tabular-nums">
                        Segment {formatTimecode(activeScene.audioStartSec)} –{' '}
                        {formatTimecode(activeScene.audioEndSec)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stage Footer Status & Quick Media Actions */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                    <span>
                      Performer:{' '}
                      <strong className="text-zinc-200">
                        {activePerformer ? activePerformer.name : 'Unassigned'}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>
                      Wardrobe:{' '}
                      <strong className="text-zinc-200">
                        {activeWardrobe ? activeWardrobe.name : 'Default'}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setWorkspaceTab('performers')}
                      className="text-[#46ecd5] hover:underline font-semibold ml-1 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {activeScene.finalVideoUrl && (
                      <a
                        href={activeScene.finalVideoUrl}
                        download={`${activeScene.title.replace(/\s+/g, '_')}.mp4`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 text-[11px] font-semibold text-white transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-[#46ecd5]" />
                        <span>Download Clip</span>
                      </a>
                    )}
                    {activeScene.stage1VideoUrl &&
                      activeScene.mode === 'lip_sync' &&
                      activeScene.lipSyncPipeline === 'two_stage' && (
                        <Button
                          type="button"
                          variant="cyanGhost"
                          size="xs"
                          onClick={() =>
                            runPostProcessLipSyncForScene(activeScene, activeScene.stage1VideoUrl!)
                          }
                        >
                          <Mic className="w-3 h-3" />
                          <span>Re-Run Stage 2 Lip Sync</span>
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* SCENE CREATION & VISUAL REFERENCE PANEL (OPTION A CREATE vs OPTION B UPLOAD) */}
            <div className="rounded-2xl border border-white/10 bg-[#11131A] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#46ecd5]" />
                  <span className="text-xs font-bold text-white">Scene Visual Reference</span>
                  <span className="text-[11px] text-zinc-500">
                    Option A: Generate · Option B: Upload / Storyboard
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="inline-flex rounded-xl bg-[#0B0D12] border border-white/10 p-0.5">
                    <button
                      type="button"
                      onClick={() => updateActiveScene({ sceneSource: 'generate' })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        activeScene.sceneSource === 'generate'
                          ? 'bg-[#46ecd5] text-zinc-950'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Create Scene
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveScene({ sceneSource: 'upload' })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        activeScene.sceneSource === 'upload'
                          ? 'bg-[#46ecd5] text-zinc-950'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Upload Existing
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSceneDirectionDetails((v) => !v)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] cursor-pointer"
                    aria-label="Toggle scene setup panel"
                  >
                    {showSceneDirectionDetails ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {showSceneDirectionDetails && (
                <div className="p-4 space-y-3.5">
                  {activeScene.sceneSource === 'generate' ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-zinc-400">
                            Scene Description
                          </label>
                          <Textarea
                            value={activeScene.scenePrompt}
                            onChange={(e) => updateActiveScene({ scenePrompt: e.target.value })}
                            placeholder="Describe the framing, action, performer pose, and focal subject..."
                            className="min-h-[76px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-zinc-400">
                            Environment, Background & Atmosphere
                          </label>
                          <Textarea
                            value={activeScene.environmentPrompt}
                            onChange={(e) => updateActiveScene({ environmentPrompt: e.target.value })}
                            placeholder="Describe the set, architecture, haze, rain, stage lights, and backdrop..."
                            className="min-h-[76px]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Camera Angle
                          </label>
                          <Select
                            value={activeScene.cameraAngle}
                            onValueChange={(v) => updateActiveScene({ cameraAngle: v })}
                          >
                            <SelectTrigger className="h-8 text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CAMERA_ANGLES.map((a) => (
                                <SelectItem key={a} value={a}>
                                  {a}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Lighting
                          </label>
                          <Select
                            value={activeScene.lightingStyle}
                            onValueChange={(v) => updateActiveScene({ lightingStyle: v })}
                          >
                            <SelectTrigger className="h-8 text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LIGHTING_STYLES.map((l) => (
                                <SelectItem key={l} value={l}>
                                  {l}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Visual Style
                          </label>
                          <Select
                            value={activeScene.visualStyle}
                            onValueChange={(v) => updateActiveScene({ visualStyle: v })}
                          >
                            <SelectTrigger className="h-8 text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VISUAL_STYLES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-400">Image Engine:</span>
                          <Select
                            value={selectedSceneImageModel?.id || defaultImageModelId}
                            onValueChange={(v) => updateActiveScene({ sceneImageModelId: v })}
                          >
                            <SelectTrigger className="w-48 h-8 text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {imageModels.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          variant="cyanGhost"
                          size="sm"
                          disabled={isGeneratingAction || activeScene.status === 'generating_image'}
                          onClick={handleGenerateSceneImage}
                        >
                          {activeScene.status === 'generating_image' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>
                            Generate Scene Plate ·{' '}
                            <span className="font-mono tabular-nums">{estimatedImageCost} TK</span>
                          </span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    /* OPTION B: UPLOAD EXISTING SCENES / STORYBOARD FRAMES */
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-black/25 p-4">
                        <div className="text-xs text-zinc-300">
                          <div className="font-bold text-white">Upload Scene Image or Storyboard Frame</div>
                          <div className="text-zinc-400 mt-0.5">
                            Import your designed frames (JPG, PNG, WebP) and animate them directly into Lip-Sync or B-Roll clips.
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => sceneUploadInputRef.current?.click()}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Frame</span>
                        </Button>
                      </div>

                      {existingSceneImages.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-semibold text-zinc-400">
                            Or Pick From Studio Library & Storyboards
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto pr-1">
                            {existingSceneImages.slice(0, 15).map((img) => {
                              const selected = activeScene.referenceImageUrl === img.url;
                              return (
                                <button
                                  key={img.id}
                                  type="button"
                                  onClick={() => {
                                    updateActiveScene({ referenceImageUrl: img.url });
                                    toast.success('Selected scene reference frame');
                                  }}
                                  className={`relative aspect-video rounded-lg overflow-hidden border transition-all cursor-pointer ${
                                    selected
                                      ? 'border-[#46ecd5] ring-2 ring-[#46ecd5]/40'
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
              )}
            </div>

            {/* COMPACT SCENE SEQUENCE STRIP */}
            <div className="rounded-2xl border border-white/10 bg-[#11131A] p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">
                  Music Video Sequence ({scenes.length})
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => handleAddScene('lip_sync')}
                  >
                    <Plus className="w-3 h-3 text-[#46ecd5]" />
                    <span>Lip-Sync Scene</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => handleAddScene('b_roll')}
                  >
                    <Plus className="w-3 h-3 text-amber-300" />
                    <span>B-Roll Scene</span>
                  </Button>
                </div>
              </div>

              <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1">
                {scenes.map((sc, idx) => {
                  const isCurrent = sc.id === activeScene.id;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setActiveSceneId(sc.id)}
                      className={`w-40 shrink-0 rounded-xl border p-2 text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-[#46ecd5] bg-[#46ecd5]/10'
                          : 'border-white/10 bg-[#0B0D12] hover:border-white/25'
                      }`}
                    >
                      <div className="aspect-video rounded-lg overflow-hidden bg-zinc-900 mb-1.5 relative">
                        {sc.referenceImageUrl ? (
                          <img
                            src={sc.referenceImageUrl}
                            alt={sc.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            {sc.mode === 'lip_sync' ? (
                              <Mic className="w-4 h-4" />
                            ) : (
                              <Film className="w-4 h-4" />
                            )}
                          </div>
                        )}
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[9px] font-bold text-white">
                          S{idx + 1}
                        </div>
                        {sc.finalVideoUrl && (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-emerald-500/90 font-mono text-[9px] font-bold text-zinc-950">
                            READY
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-white truncate">{sc.title}</div>
                      <div className="text-[10px] font-mono tabular-nums text-zinc-400 mt-0.5">
                        {sc.mode === 'lip_sync' ? 'Lip Sync' : 'B-Roll'} ·{' '}
                        {formatTimecode(sc.audioStartSec)}–{formatTimecode(sc.audioEndSec)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: CONTEXTUAL DIRECTING INSPECTOR (MODE A vs MODE B + CAPABILITY-ACCURATE MODELS) */}
          <div className="xl:col-span-5 rounded-2xl border border-white/10 bg-[#11131A] p-4 sm:p-5 space-y-4">
            {/* Generation Mode Selector (Mode A vs Mode B) */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Scene Generation Mode
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateActiveScene({ mode: 'lip_sync' })}
                  className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    activeScene.mode === 'lip_sync'
                      ? 'border-[#46ecd5] bg-[#46ecd5]/12 text-white'
                      : 'border-white/10 bg-[#0C0E14] text-zinc-400 hover:border-white/25 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Mic
                      className={`w-4 h-4 ${
                        activeScene.mode === 'lip_sync' ? 'text-[#46ecd5]' : 'text-zinc-500'
                      }`}
                    />
                    <span>Lip Sync Performance</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                    Synchronize performer mouth movements & acting to trimmed song audio.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => updateActiveScene({ mode: 'b_roll' })}
                  className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    activeScene.mode === 'b_roll'
                      ? 'border-[#46ecd5] bg-[#46ecd5]/12 text-white'
                      : 'border-white/10 bg-[#0C0E14] text-zinc-400 hover:border-white/25 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Video
                      className={`w-4 h-4 ${
                        activeScene.mode === 'b_roll' ? 'text-[#46ecd5]' : 'text-zinc-500'
                      }`}
                    />
                    <span>B-Roll Generation</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                    Cinematic cutaways, dance, slow-motion & storytelling without lip sync.
                  </p>
                </button>
              </div>
            </div>

            {/* MODE A: LIP SYNC PERFORMANCE CONTROLS */}
            {activeScene.mode === 'lip_sync' ? (
              <div className="space-y-3.5 pt-2 border-t border-white/[0.07]">
                {/* Audio Segment Binding Status */}
                <div className="rounded-xl border border-white/10 bg-[#0B0D12] px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="text-[11px]">
                    <div className="font-semibold text-zinc-200">Audio Segment Lock</div>
                    <div className="font-mono tabular-nums text-zinc-400 mt-0.5">
                      {audioTrack
                        ? `${formatTimecode(activeScene.audioStartSec)} → ${formatTimecode(activeScene.audioEndSec)} (${formatDurationCompact(activeScene.audioEndSec - activeScene.audioStartSec)})`
                        : 'No audio track imported yet'}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold uppercase ${
                      audioTrack ? 'text-[#46ecd5]' : 'text-amber-300'
                    }`}
                  >
                    {audioTrack ? 'Synced to Trim' : 'Import Audio Above'}
                  </span>
                </div>

                {/* Performer Assignment */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Performer
                    </label>
                    <Select
                      value={activeScene.characterId || '__none__'}
                      onValueChange={(v) =>
                        updateActiveScene({ characterId: v === '__none__' ? null : v })
                      }
                    >
                      <SelectTrigger className="h-8 text-[11px]">
                        <SelectValue placeholder="Select performer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">From Scene Image Only</SelectItem>
                        {characters.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Facial Expression
                    </label>
                    <Select
                      value={activeScene.facialExpression}
                      onValueChange={(v) => updateActiveScene({ facialExpression: v })}
                    >
                      <SelectTrigger className="h-8 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FACIAL_EXPRESSIONS.map((exp) => (
                          <SelectItem key={exp} value={exp}>
                            {exp}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Performance & Acting Direction */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-300">
                    Performance & Acting Direction
                  </label>
                  <Textarea
                    value={activeScene.performanceDirection}
                    onChange={(e) => updateActiveScene({ performanceDirection: e.target.value })}
                    placeholder="Direct vocal intensity, eye contact, head rhythm, and emotional delivery..."
                    className="min-h-[64px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Gestures & Body Movement
                    </label>
                    <Input
                      value={activeScene.gesturesAndBody}
                      onChange={(e) => updateActiveScene({ gesturesAndBody: e.target.value })}
                      placeholder="Hand emphasis, rhythmic sway..."
                      className="h-8 text-[11px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Camera Movement
                    </label>
                    <Select
                      value={activeScene.cameraMovement}
                      onValueChange={(v) => updateActiveScene({ cameraMovement: v })}
                    >
                      <SelectTrigger className="h-8 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMERA_MOVEMENTS.map((mv) => (
                          <SelectItem key={mv} value={mv}>
                            {mv}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* CAPABILITY-ACCURATE LIP-SYNC PIPELINE SELECTOR */}
                <div className="space-y-2.5 pt-2 border-t border-white/[0.07]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Lip-Sync Pipeline & Compatible Models
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveScene({
                          lipSyncPipeline: 'native_audio',
                          lipSyncModelId: defaultNativeLipSyncId,
                        })
                      }
                      className={`px-2.5 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                        activeScene.lipSyncPipeline === 'native_audio'
                          ? 'border-[#46ecd5]/60 bg-[#46ecd5]/10 text-white'
                          : 'border-white/10 bg-[#0B0D12] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-bold">Native Audio Lip Sync</div>
                      <div className="text-[10px] text-zinc-400">1-step Image + Audio</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateActiveScene({
                          lipSyncPipeline: 'two_stage',
                          lipSyncModelId: defaultPostLipSyncId,
                        })
                      }
                      className={`px-2.5 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                        activeScene.lipSyncPipeline === 'two_stage'
                          ? 'border-[#46ecd5]/60 bg-[#46ecd5]/10 text-white'
                          : 'border-white/10 bg-[#0B0D12] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-bold">Two-Stage Pipeline</div>
                      <div className="text-[10px] text-zinc-400">Animate Video → Lip Sync</div>
                    </button>
                  </div>

                  {activeScene.lipSyncPipeline === 'native_audio' ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Audio-Driven Lip-Sync Model
                      </label>
                      <Select
                        value={selectedLipSyncModel?.id || defaultNativeLipSyncId}
                        onValueChange={(v) => updateActiveScene({ lipSyncModelId: v })}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {nativeLipSyncModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedLipSyncModel && (
                        <div className="text-[11px] text-zinc-400 leading-relaxed">
                          <span className="text-[#46ecd5] font-semibold">
                            {getModelCapabilityBadgeLabel(selectedLipSyncModel).label}
                          </span>{' '}
                          · {selectedLipSyncModel.description}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold uppercase tracking-wider text-zinc-500">
                            Stage 1 · Scene Animation Model
                          </span>
                          <span className="font-mono text-amber-300">Video Only (No Lip Sync)</span>
                        </div>
                        <Select
                          value={selectedAnimationModel?.id || defaultAnimationModelId}
                          onValueChange={(v) => updateActiveScene({ animationModelId: v })}
                        >
                          <SelectTrigger className="h-8 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableBRollModels.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold uppercase tracking-wider text-zinc-500">
                            Stage 2 · Dedicated Lip-Sync Model
                          </span>
                          <span className="font-mono text-[#46ecd5]">Audio-to-Video Sync</span>
                        </div>
                        <Select
                          value={selectedLipSyncModel?.id || defaultPostLipSyncId}
                          onValueChange={(v) => updateActiveScene({ lipSyncModelId: v })}
                        >
                          <SelectTrigger className="h-8 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {postProcessLipSyncModels.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* MODE B: B-ROLL GENERATION CONTROLS (NO LIP SYNC REQUIRED) */
              <div className="space-y-3.5 pt-2 border-t border-white/[0.07]">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      B-Roll Shot Type
                    </label>
                    <span className="text-[10px] font-mono text-zinc-500">
                      No lip-sync model required
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BROLL_PRESETS.map((preset) => {
                      const active = activeScene.bRollPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            updateActiveScene({
                              bRollPreset: preset.id,
                              bRollMotionPrompt: preset.defaultPrompt,
                            })
                          }
                          className={`px-2.5 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                            active
                              ? 'border-[#46ecd5]/60 bg-[#46ecd5]/10 text-white'
                              : 'border-white/10 bg-[#0B0D12] text-zinc-300 hover:border-white/25'
                          }`}
                        >
                          <div className="text-[11px] font-bold truncate">{preset.label}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{preset.hint}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-300">
                    B-Roll Animation & Motion Direction
                  </label>
                  <Textarea
                    value={activeScene.bRollMotionPrompt}
                    onChange={(e) => updateActiveScene({ bRollMotionPrompt: e.target.value })}
                    placeholder="Describe camera glide, choreography, slow-motion action, or atmospheric visual cutaways..."
                    className="min-h-[68px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Camera Movement
                    </label>
                    <Select
                      value={activeScene.cameraMovement}
                      onValueChange={(v) => updateActiveScene({ cameraMovement: v })}
                    >
                      <SelectTrigger className="h-8 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAMERA_MOVEMENTS.map((mv) => (
                          <SelectItem key={mv} value={mv}>
                            {mv}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Featured Performer (Optional)
                    </label>
                    <Select
                      value={activeScene.characterId || '__none__'}
                      onValueChange={(v) =>
                        updateActiveScene({ characterId: v === '__none__' ? null : v })
                      }
                    >
                      <SelectTrigger className="h-8 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Environment / No Performer</SelectItem>
                        {characters.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Compatible B-Roll Video Model Selector */}
                <div className="space-y-1.5 pt-1 border-t border-white/[0.07]">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold uppercase tracking-wider text-zinc-500">
                      B-Roll Video Model
                    </span>
                    <span className="font-mono text-zinc-400">
                      {activeScene.referenceImageUrl ? 'Image-to-Video Compatible' : 'Text / Ref to Video'}
                    </span>
                  </div>
                  <Select
                    value={selectedAnimationModel?.id || defaultAnimationModelId}
                    onValueChange={(v) => updateActiveScene({ animationModelId: v })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBRollModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAnimationModel && (
                    <div className="text-[11px] text-zinc-400">
                      <span className="text-amber-300 font-semibold">
                        {getModelCapabilityBadgeLabel(selectedAnimationModel).shortLabel}
                      </span>{' '}
                      · {selectedAnimationModel.description}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DYNAMIC VIDEO ORIENTATION & MODEL-SUPPORTED OUTPUT SETTINGS */}
            <div className="space-y-3 pt-3 border-t border-white/[0.07]">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-zinc-300">Video Orientation</span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    Supported by {primaryActiveVideoModel?.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {supportedAspectRatios.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateActiveScene({ aspectRatio: opt.value })}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                        activeScene.aspectRatio === opt.value
                          ? 'border-[#46ecd5] bg-[#46ecd5]/15 text-[#46ecd5]'
                          : 'border-white/10 bg-[#0B0D12] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {(supportedResolutions.length > 0 || supportedDurations.length > 0) && (
                <div className="grid grid-cols-2 gap-2.5">
                  {supportedResolutions.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Resolution
                      </label>
                      <Select
                        value={activeScene.resolution}
                        onValueChange={(v) => updateActiveScene({ resolution: v })}
                      >
                        <SelectTrigger className="h-8 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {supportedResolutions.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {supportedDurations.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Model Clip Duration
                      </label>
                      <Select
                        value={String(activeScene.durationSec)}
                        onValueChange={(v) => updateActiveScene({ durationSec: Number(v) })}
                      >
                        <SelectTrigger className="h-8 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {supportedDurations.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Progressive Disclosure for Model-Specific Parameters */}
              {extraModelSettings.length > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12]">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedModelParams((v) => !v)}
                    className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-semibold text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <span>Model-Specific Controls ({extraModelSettings.length})</span>
                    {showAdvancedModelParams ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {showAdvancedModelParams && (
                    <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/[0.06]">
                      {extraModelSettings.map((setting) => {
                        const currentVal =
                          activeScene.modelSettings[setting.key] ?? setting.defaultValue;
                        if (setting.type === 'enum') {
                          return (
                            <div key={setting.key} className="space-y-1">
                              <label className="text-[10px] font-semibold text-zinc-400">
                                {setting.label}
                              </label>
                              <Select
                                value={String(currentVal)}
                                onValueChange={(v) =>
                                  updateActiveScene({
                                    modelSettings: {
                                      ...activeScene.modelSettings,
                                      [setting.key]: v,
                                    },
                                  })
                                }
                              >
                                <SelectTrigger className="h-8 text-[11px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {setting.options.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                      {o.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }
                        if (setting.type === 'range') {
                          return (
                            <div key={setting.key} className="space-y-1.5">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-zinc-400">{setting.label}</span>
                                <span className="font-mono tabular-nums text-[#46ecd5]">
                                  {Number(currentVal)}
                                  {setting.unit || ''}
                                </span>
                              </div>
                              <Slider
                                value={[Number(currentVal)]}
                                min={setting.min}
                                max={setting.max}
                                step={setting.step}
                                onValueChange={([val]) =>
                                  updateActiveScene({
                                    modelSettings: {
                                      ...activeScene.modelSettings,
                                      [setting.key]: val,
                                    },
                                  })
                                }
                              />
                            </div>
                          );
                        }
                        return (
                          <div
                            key={setting.key}
                            className="flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="text-[11px] font-semibold text-zinc-300">
                                {setting.label}
                              </div>
                              {setting.description && (
                                <div className="text-[10px] text-zinc-500">
                                  {setting.description}
                                </div>
                              )}
                            </div>
                            <Switch
                              checked={Boolean(currentVal)}
                              onCheckedChange={(checked) =>
                                updateActiveScene({
                                  modelSettings: {
                                    ...activeScene.modelSettings,
                                    [setting.key]: checked,
                                  },
                                })
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {activeScene.errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {activeScene.errorMessage}
              </div>
            )}

            {/* Primary Generate CTA */}
            <div className="pt-2 space-y-2">
              <ShimmerButton
                type="button"
                disabled={
                  isGeneratingAction ||
                  activeScene.status === 'generating_video' ||
                  activeScene.status === 'generating_lipsync'
                }
                onClick={() => handleGenerateSceneClip()}
                className="w-full py-2.5"
              >
                {activeScene.status === 'generating_video' ||
                activeScene.status === 'generating_lipsync' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering Scene Clip...</span>
                  </>
                ) : activeScene.mode === 'lip_sync' ? (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>
                      {activeScene.lipSyncPipeline === 'native_audio'
                        ? 'Generate Lip-Sync Performance'
                        : 'Run 2-Stage Animate + Lip Sync'}
                    </span>
                    <span className="font-mono tabular-nums ml-1">· {estimatedClipCost} TK</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate B-Roll Scene</span>
                    <span className="font-mono tabular-nums ml-1">· {estimatedClipCost} TK</span>
                  </>
                )}
              </ShimmerButton>

              {activeScene.mode === 'lip_sync' && activeScene.lipSyncPipeline === 'two_stage' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isGeneratingAction}
                  onClick={() => handleGenerateSceneClip({ stage1Only: true })}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Generate Stage 1 Animation Only (Preview Before Lip Sync)</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================
          VIEW 3: SEQUENCE & FINAL MUSIC VIDEO ASSEMBLY
          ================================================================== */}
      {workspaceTab === 'assembly' && (
        <div className="space-y-5">
          {/* Synchronized Master Music Video Preview Player */}
          <div className="rounded-2xl border border-white/10 bg-[#0F1117] overflow-hidden">
            {audioTrack && (
              <audio
                ref={assemblyAudioRef}
                src={audioTrack.sourceUrl}
                onEnded={() => setAssemblyPlaying(false)}
              />
            )}

            <div className="px-4 py-3 border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-3 bg-[#13161E]">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#46ecd5]" />
                  <span>Master Music Video Synchronized Preview</span>
                </div>
                <div className="text-[11px] font-mono tabular-nums text-zinc-400 mt-0.5">
                  {activeAssemblyScene
                    ? `Playing ${activeAssemblyScene.title} · ${activeAssemblyScene.mode === 'lip_sync' ? 'Lip Sync' : 'B-Roll'}`
                    : 'Add scenes to assemble sequence'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={assemblyPlaying ? 'default' : 'cyanGhost'}
                  size="sm"
                  onClick={toggleAssemblyPlayback}
                >
                  {assemblyPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>{assemblyPlaying ? 'Pause Assembly' : 'Play Full Music Video'}</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAutoSpaceScenes}
                >
                  Auto-Space Across Song
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-[#080A0F] space-y-4">
              <div
                className={`relative w-full ${
                  defaultAspectRatio === '9:16'
                    ? 'aspect-[9/16] max-h-[460px] mx-auto'
                    : defaultAspectRatio === '1:1'
                    ? 'aspect-square max-h-[440px] mx-auto'
                    : 'aspect-video max-w-4xl mx-auto'
                } rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center`}
              >
                {activeAssemblyScene?.finalVideoUrl ? (
                  isRenderableVideoUrl(activeAssemblyScene.finalVideoUrl) ? (
                    <video
                      ref={assemblyVideoRef}
                      key={activeAssemblyScene.finalVideoUrl}
                      src={activeAssemblyScene.finalVideoUrl}
                      autoPlay={assemblyPlaying}
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={activeAssemblyScene.finalVideoUrl}
                      alt={activeAssemblyScene.title}
                      className="w-full h-full object-contain"
                    />
                  )
                ) : activeAssemblyScene?.referenceImageUrl ? (
                  <img
                    src={activeAssemblyScene.referenceImageUrl}
                    alt={activeAssemblyScene.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Music className="w-8 h-8 text-zinc-600 mx-auto" />
                    <div className="text-xs font-bold text-zinc-300">
                      {activeAssemblyScene?.title || 'Empty Scene'}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Render this scene in Direct Scene to see animated footage during assembly playback.
                    </div>
                  </div>
                )}

                {/* Minimal Timecode HUD */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 border border-white/10 font-mono text-[11px] tabular-nums text-white">
                  {formatTimecode(assemblyTime)} /{' '}
                  {formatTimecode(
                    audioTrack?.durationSec ||
                      Math.max(12, ...scenes.map((s) => s.audioEndSec))
                  )}
                </div>
              </div>

              {/* Assembly Scrubbing Timeline */}
              <div className="max-w-4xl mx-auto space-y-2">
                <Slider
                  value={[assemblyTime]}
                  max={
                    audioTrack?.durationSec ||
                    Math.max(12, ...scenes.map((s) => s.audioEndSec))
                  }
                  step={0.1}
                  onValueChange={([v]) => {
                    setAssemblyTime(v);
                    if (assemblyAudioRef.current) {
                      assemblyAudioRef.current.currentTime = v;
                    }
                  }}
                />
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-400">
                  <span>00:00.0</span>
                  <span>
                    {readySceneCount} of {scenes.length} clips rendered ·{' '}
                    {audioTrack ? audioTrack.title : 'Visual preview (import music track above)'}
                  </span>
                  <span>
                    {formatTimecode(
                      audioTrack?.durationSec ||
                        Math.max(12, ...scenes.map((s) => s.audioEndSec))
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Scene Sequence Editor Board */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Scene Sequence Breakdown ({scenes.length} Scenes)
                </h3>
                <p className="text-xs text-zinc-400">
                  Mix lip-sync vocal performances and B-roll scenes, reorder shots, or jump into any scene to regenerate.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="cyanGhost"
                  size="sm"
                  onClick={() => handleAddScene('lip_sync')}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lip-Sync Scene</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddScene('b_roll')}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add B-Roll Scene</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {scenes.map((sc, idx) => {
                const char = characters.find((c) => c.id === sc.characterId);
                return (
                  <SpotlightCard key={sc.id} className="p-3.5 space-y-3">
                    <div className="aspect-video rounded-xl overflow-hidden bg-[#090B10] border border-white/10 relative">
                      {sc.finalVideoUrl && isRenderableVideoUrl(sc.finalVideoUrl) ? (
                        <video
                          src={sc.finalVideoUrl}
                          controls
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : sc.finalVideoUrl || sc.referenceImageUrl ? (
                        <img
                          src={sc.finalVideoUrl || sc.referenceImageUrl}
                          alt={sc.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-1">
                          {sc.mode === 'lip_sync' ? (
                            <Mic className="w-5 h-5" />
                          ) : (
                            <Film className="w-5 h-5" />
                          )}
                          <span className="text-[10px] font-mono">Not Rendered Yet</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 font-mono text-[10px] font-bold text-white">
                        S{idx + 1} · {sc.mode === 'lip_sync' ? 'Lip Sync' : 'B-Roll'}
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/80 font-mono text-[10px] tabular-nums text-[#46ecd5]">
                        {formatTimecode(sc.audioStartSec)}–{formatTimecode(sc.audioEndSec)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white truncate">{sc.title}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                        {char ? char.name : 'No performer'} · {sc.aspectRatio} ·{' '}
                        {sc.finalVideoUrl ? 'Clip Rendered' : sc.referenceImageUrl ? 'Plate Ready' : 'Draft'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/[0.07]">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={idx === 0}
                              onClick={() => handleMoveScene(idx, -1)}
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Move earlier</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={idx === scenes.length - 1}
                              onClick={() => handleMoveScene(idx, 1)}
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Move later</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDuplicateScene(sc)}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Duplicate scene</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-400 hover:text-rose-300"
                              onClick={() => handleDeleteScene(sc.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove scene</TooltipContent>
                        </Tooltip>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          setActiveSceneId(sc.id);
                          setWorkspaceTab('direct');
                        }}
                      >
                        <RefreshCw className="w-3 h-3 text-[#46ecd5]" />
                        <span>Direct / Edit</span>
                      </Button>
                    </div>
                  </SpotlightCard>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
