import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  Mic,
  Play,
  Pause,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Users,
  Video,
  Wand2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import {
  CharacterProfile,
  MediaSlotInput,
  ModelEntry,
  MusicVideoAudioTrack,
  MusicVideoGenerationMode,
  MusicVideoScene,
  SettingDefinition,
  WardrobeItem,
} from '../../types/studio';
import {
  getBRollVideoModels,
  getCapabilityBadgeLabel,
  getCapabilityForModel,
  getDedicatedLipSyncProcessors,
  getDefaultModelForMusicVideoMode,
  getDynamicControlsForModel,
  getMusicVideoImageModels,
  getNativeLipSyncModels,
  getTwoStageAnimationModels,
} from '../../catalog/musicVideoCapabilities';
import { formatTimecode } from '../../lib/audioEngine';
import { Button, Input, Textarea } from '../ui/primitives';

export interface SceneDirectorWorkspaceProps {
  scene: MusicVideoScene;
  audioTrack: MusicVideoAudioTrack | null;
  models: ModelEntry[];
  characters: CharacterProfile[];
  wardrobes: WardrobeItem[];
  calculateTokenCost: (
    modelId: string,
    settings?: Record<string, string | number | boolean>,
    media?: MediaSlotInput[],
    batchCount?: number
  ) => number;
  onUpdateScene: (patch: Partial<MusicVideoScene>) => void;
  onGenerateSceneImage: (scene: MusicVideoScene) => Promise<void>;
  onUploadSceneImage: (file: File) => Promise<void>;
  onGenerateSceneVideo: (scene: MusicVideoScene) => Promise<void>;
  onOpenCastTab: () => void;
}

const CAMERA_FRAMINGS = [
  'Close-Up (Vocal Focus)',
  'Medium Close-Up',
  'Medium Performance Shot',
  'Wide Establishing Shot',
  'Low-Angle Hero Shot',
  'Extreme Close-Up',
  'Over-the-Shoulder',
  'Dutch Angle Dynamic',
];

const CAMERA_MOVEMENTS = [
  'Slow Cinematic Push-In',
  'Locked Tripod Studio Frame',
  'Subtle Handheld Breathing',
  'Smooth 180° Steadicam Orbit',
  'Low-Angle Dolly Track',
  'Slow-Motion Crane Reveal',
  'Whip Pan Energy Cut',
  'Anamorphic Pull-Back',
];

const LIGHTING_STYLES = [
  'Neon Rim & Volumetric Haze',
  'Golden Hour Backlit Silhouette',
  'High-Contrast Concert Strobe',
  'Moody Noir Key Light',
  'Soft Editorial Studio Diffusion',
  'Rain-Slicked Street Reflections',
  'Warm Tungsten Intimate Glow',
  'Chromatic Magenta / Cyan Split',
];

const VISUAL_STYLES = [
  '35mm Anamorphic Music Video',
  'Hyper-Real 4K Editorial Cinema',
  'Kodak Vision3 Film Grain',
  'High-Fashion Editorial Gloss',
  'Moody Neo-Noir Nightscape',
  'Dreamy Halation & Lens Flare',
  'Gritty Documentary Handheld',
];

const FACIAL_EXPRESSIONS = [
  'Passionate & Soulful Delivery',
  'Confident Direct-to-Lens Gaze',
  'Intense Emotional Belt',
  'Vulnerable & Reflective',
  'Charismatic & Playful Groove',
  'Fierce High-Energy Rap Cadence',
];

const BODY_MOVEMENTS = [
  'Natural shoulder sway & subtle hand emphasis on beat',
  'Dynamic mic-grip leaning toward camera on chorus',
  'Expressive rhythmic head nod & fluid arm gestures',
  'Minimalist poised stillness with intense eye contact',
  'Full-body groove stepping into the key light',
];

const BROLL_CATEGORIES = [
  'Cinematic Environmental Scene',
  'Performance Shot (No Lip Sync)',
  'Dance & Choreography Sequence',
  'Slow-Motion Atmospheric Shot',
  'Wide Establishing Shot',
  'Artistic Cutaway / Detail',
  'Cinematic Close-Up',
  'Lifestyle & Storytelling Sequence',
  'Creative Transition / Visual Insert',
];

function aspectToCss(ratio: string): string {
  switch (ratio) {
    case '9:16':
      return 'aspect-[9/16] max-h-[460px] mx-auto';
    case '1:1':
      return 'aspect-square max-h-[420px] mx-auto';
    case '4:5':
      return 'aspect-[4/5] max-h-[440px] mx-auto';
    case '3:4':
      return 'aspect-[3/4] max-h-[440px] mx-auto';
    case '4:3':
      return 'aspect-[4/3]';
    case '21:9':
      return 'aspect-[21/9]';
    default:
      return 'aspect-video';
  }
}

export const SceneDirectorWorkspace: React.FC<SceneDirectorWorkspaceProps> = ({
  scene,
  audioTrack,
  models,
  characters,
  wardrobes,
  calculateTokenCost,
  onUpdateScene,
  onGenerateSceneImage,
  onUploadSceneImage,
  onGenerateSceneVideo,
  onOpenCastTab,
}) => {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const syncedAudioRef = useRef<HTMLAudioElement | null>(null);

  const [previewLayer, setPreviewLayer] = useState<'auto' | 'reference' | 'video'>('auto');
  const [showAdvancedModelSettings, setShowAdvancedModelSettings] = useState(false);
  const [isSyncedPlaying, setIsSyncedPlaying] = useState(false);

  const imageModels = useMemo(() => getMusicVideoImageModels(models), [models]);
  const nativeLipSyncModels = useMemo(() => getNativeLipSyncModels(models), [models]);
  const twoStageAnimModels = useMemo(() => getTwoStageAnimationModels(models), [models]);
  const dedicatedLipSyncProcessors = useMemo(() => getDedicatedLipSyncProcessors(models), [models]);
  const bRollVideoModels = useMemo(
    () => getBRollVideoModels(models, Boolean(scene.sceneImageUrl)),
    [models, scene.sceneImageUrl]
  );

  // Resolve active animation & lip-sync models safely
  const activeAnimationModel = useMemo(() => {
    if (scene.mode === 'lip_sync' && scene.lipSyncPipelineType === 'native') {
      return (
        nativeLipSyncModels.find((m) => m.id === scene.animationModelId) ||
        nativeLipSyncModels[0]
      );
    }
    if (scene.mode === 'lip_sync' && scene.lipSyncPipelineType === 'two_stage') {
      return (
        twoStageAnimModels.find((m) => m.id === scene.animationModelId) ||
        twoStageAnimModels[0]
      );
    }
    return (
      bRollVideoModels.find((m) => m.id === scene.animationModelId) ||
      bRollVideoModels[0]
    );
  }, [
    scene.mode,
    scene.lipSyncPipelineType,
    scene.animationModelId,
    nativeLipSyncModels,
    twoStageAnimModels,
    bRollVideoModels,
  ]);

  const activeLipSyncProcessor = useMemo(() => {
    if (scene.mode !== 'lip_sync') return undefined;
    if (scene.lipSyncPipelineType === 'native') return activeAnimationModel;
    return (
      dedicatedLipSyncProcessors.find((m) => m.id === scene.lipSyncModelId) ||
      dedicatedLipSyncProcessors[0]
    );
  }, [scene.mode, scene.lipSyncPipelineType, scene.lipSyncModelId, activeAnimationModel, dedicatedLipSyncProcessors]);

  const dynamicControls = useMemo(
    () => getDynamicControlsForModel(activeAnimationModel),
    [activeAnimationModel]
  );

  const lipSyncProcessorControls = useMemo(
    () =>
      scene.mode === 'lip_sync' && scene.lipSyncPipelineType === 'two_stage'
        ? getDynamicControlsForModel(activeLipSyncProcessor)
        : null,
    [scene.mode, scene.lipSyncPipelineType, activeLipSyncProcessor]
  );

  const activeCapability = activeAnimationModel
    ? getCapabilityForModel(activeAnimationModel.id)
    : null;
  const stage2Capability =
    scene.mode === 'lip_sync' && scene.lipSyncPipelineType === 'two_stage' && activeLipSyncProcessor
      ? getCapabilityForModel(activeLipSyncProcessor.id)
      : null;

  const selectedPerformers = useMemo(
    () => characters.filter((c) => scene.characterIds.includes(c.id)),
    [characters, scene.characterIds]
  );
  const selectedWardrobe = useMemo(
    () => wardrobes.find((w) => w.id === scene.wardrobeId) || null,
    [wardrobes, scene.wardrobeId]
  );

  const segmentDuration = Math.max(0.5, scene.audioEndSec - scene.audioStartSec);

  const effectivePreviewMode: 'reference' | 'video' =
    previewLayer === 'reference'
      ? 'reference'
      : previewLayer === 'video'
      ? 'video'
      : scene.finalVideoUrl || scene.stage1VideoUrl
      ? 'video'
      : 'reference';

  const activeVideoUrl = scene.finalVideoUrl || scene.stage1VideoUrl || '';

  // Estimate credit cost accurately across single or two-stage pipelines
  const estimatedVideoCredits = useMemo(() => {
    if (!activeAnimationModel) return 0;
    const baseSettings: Record<string, string | number | boolean> = {
      ...scene.modelSettings,
      aspect_ratio: scene.aspectRatio,
      resolution: scene.resolution,
      duration: String(scene.durationSec),
    };
    const stage1Cost = calculateTokenCost(activeAnimationModel.id, baseSettings, [], 1);
    if (scene.mode === 'lip_sync' && scene.lipSyncPipelineType === 'two_stage' && activeLipSyncProcessor) {
      const stage2Cost = calculateTokenCost(activeLipSyncProcessor.id, scene.modelSettings, [], 1);
      return stage1Cost + stage2Cost;
    }
    return stage1Cost;
  }, [
    activeAnimationModel,
    activeLipSyncProcessor,
    scene.mode,
    scene.lipSyncPipelineType,
    scene.aspectRatio,
    scene.resolution,
    scene.durationSec,
    scene.modelSettings,
    calculateTokenCost,
  ]);

  const estimatedImageCredits = useMemo(() => {
    return calculateTokenCost(
      scene.sceneImageModelId || imageModels[0]?.id || 'soul-2-standard',
      { aspect_ratio: scene.aspectRatio },
      [],
      1
    );
  }, [scene.sceneImageModelId, scene.aspectRatio, imageModels, calculateTokenCost]);

  // Synchronize output defaults cleanly when switching model or mode
  const applyModelSelection = (
    nextMode: MusicVideoGenerationMode,
    nextPipeline: 'native' | 'two_stage',
    nextAnimId?: string,
    nextLipSyncId?: string
  ) => {
    const defaults = getDefaultModelForMusicVideoMode(nextMode, nextPipeline, models);
    const chosenAnimId = nextAnimId || defaults.animationModelId;
    const chosenLipId =
      nextMode === 'b_roll'
        ? ''
        : nextPipeline === 'native'
        ? chosenAnimId
        : nextLipSyncId || defaults.lipSyncModelId;

    const animModel = models.find((m) => m.id === chosenAnimId);
    const controls = getDynamicControlsForModel(animModel);

    // Keep user's aspect ratio if supported by new model; otherwise snap cleanly to first supported
    const nextAspect =
      controls.aspectRatios.length === 0
        ? scene.aspectRatio
        : controls.aspectRatios.some((r) => r.value === scene.aspectRatio)
        ? scene.aspectRatio
        : controls.aspectRatios[0].value;

    const nextResolution =
      controls.resolutions.length === 0
        ? scene.resolution
        : controls.resolutions.some((r) => r.value === scene.resolution)
        ? scene.resolution
        : controls.resolutions[0].value;

    let nextDuration = scene.durationSec;
    if (controls.durations.length > 0) {
      const match = controls.durations.find((d) => Number(d.value) === scene.durationSec);
      if (!match) {
        // Pick closest duration to audio segment
        const closest = controls.durations.reduce((best, curr) =>
          Math.abs(Number(curr.value) - segmentDuration) <
          Math.abs(Number(best.value) - segmentDuration)
            ? curr
            : best
        );
        nextDuration = Number(closest.value) || Number(controls.durations[0].value) || 5;
      }
    }

    // Build clean default advanced settings for the chosen model only
    const nextModelSettings: Record<string, string | number | boolean> = {};
    for (const s of controls.advancedSettings) {
      nextModelSettings[s.key] =
        scene.modelSettings[s.key] !== undefined ? scene.modelSettings[s.key] : s.defaultValue;
    }

    onUpdateScene({
      mode: nextMode,
      lipSyncPipelineType: nextPipeline,
      animationModelId: chosenAnimId,
      lipSyncModelId: chosenLipId,
      aspectRatio: nextAspect,
      resolution: nextResolution,
      durationSec: nextDuration,
      modelSettings: nextModelSettings,
    });
  };

  const handleToggleSyncedPreview = async () => {
    const vid = previewVideoRef.current;
    const aud = syncedAudioRef.current;
    if (!vid) return;

    if (isSyncedPlaying) {
      vid.pause();
      if (aud) aud.pause();
      setIsSyncedPlaying(false);
      return;
    }

    try {
      vid.currentTime = 0;
      if (aud && audioTrack?.sourceUrl) {
        aud.currentTime = scene.audioStartSec;
        vid.muted = true; // Play master trimmed audio track cleanly in sync
        await Promise.all([vid.play(), aud.play()]);
      } else {
        vid.muted = false;
        await vid.play();
      }
      setIsSyncedPlaying(true);
    } catch {
      setIsSyncedPlaying(false);
    }
  };

  const isBusy =
    scene.status === 'generating_image' ||
    scene.status === 'animating' ||
    scene.status === 'syncing_lips';

  const canGenerateVideo = useMemo(() => {
    if (isBusy) return false;
    if (scene.mode === 'lip_sync') {
      if (!audioTrack) return false;
      if (!scene.sceneImageUrl) return false;
      return Boolean(activeAnimationModel);
    }
    // Mode B: B-Roll allows image-to-video OR text-to-video (if model supports T2V)
    if (!activeAnimationModel) return false;
    const requiresStart = activeAnimationModel.roles.some((r) => r.role === 'start' && r.required);
    if (requiresStart && !scene.sceneImageUrl) return false;
    if (!scene.sceneImageUrl && !scene.scenePrompt.trim() && !scene.performanceDirection.trim()) {
      return false;
    }
    return true;
  }, [isBusy, scene, audioTrack, activeAnimationModel]);

  const renderSettingControl = (setting: SettingDefinition) => {
    const val =
      scene.modelSettings[setting.key] !== undefined
        ? scene.modelSettings[setting.key]
        : setting.defaultValue;

    const updateVal = (next: string | number | boolean) =>
      onUpdateScene({
        modelSettings: {
          ...scene.modelSettings,
          [setting.key]: next,
        },
      });

    if (setting.type === 'boolean') {
      const checked = Boolean(val);
      return (
        <div
          key={setting.key}
          className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-b-0"
        >
          <span className="text-xs text-zinc-300">{setting.label}</span>
          <button
            type="button"
            onClick={() => updateVal(!checked)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              checked ? 'bg-[#46ecd5]' : 'bg-white/15'
            }`}
            aria-pressed={checked}
          >
            <span
              className={`block w-3.5 h-3.5 rounded-full bg-[#09090B] transition-transform absolute top-[3px] ${
                checked ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      );
    }

    if (setting.type === 'range') {
      const numVal = typeof val === 'number' ? val : Number(setting.defaultValue);
      return (
        <div key={setting.key} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300">{setting.label}</span>
            <span className="font-mono-tabular text-[#46ecd5]">{numVal}</span>
          </div>
          <input
            type="range"
            min={setting.min}
            max={setting.max}
            step={setting.step}
            value={numVal}
            onChange={(e) => updateVal(Number(e.target.value))}
            className="w-full accent-[#46ecd5] cursor-pointer"
          />
        </div>
      );
    }

    return (
      <div key={setting.key} className="space-y-1">
        <label className="text-[11px] text-zinc-400">{setting.label}</label>
        <select
          value={String(val)}
          onChange={(e) => updateVal(e.target.value)}
          className="w-full h-9 rounded-lg bg-[#0D0F15] border border-white/10 px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#46ecd5]/60"
        >
          {setting.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Hidden synced master audio element for video preview */}
      {audioTrack?.sourceUrl && (
        <audio
          ref={syncedAudioRef}
          src={audioTrack.sourceUrl}
          preload="metadata"
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime >= scene.audioEndSec) {
              e.currentTarget.pause();
              if (previewVideoRef.current) previewVideoRef.current.pause();
              setIsSyncedPlaying(false);
            }
          }}
        />
      )}

      {/* Scene Identity & Timing Header Bar */}
      <div className="rounded-2xl bg-[#101218] border border-white/[0.08] px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-xs font-mono-tabular text-[#46ecd5] uppercase tracking-wider shrink-0">
            Scene {String(scene.order + 1).padStart(2, '0')}
          </span>
          <Input
            value={scene.title}
            onChange={(e) => onUpdateScene({ title: e.target.value })}
            placeholder="Scene title (e.g., Verse 1 — Neon Alley Lip Sync)"
            className="max-w-xs h-8 text-sm font-medium bg-[#0A0C10]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
          <button
            type="button"
            onClick={onOpenCastTab}
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-[#46ecd5] transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-[#46ecd5]" />
            <span>
              {selectedPerformers.length > 0
                ? selectedPerformers.map((p) => p.name).join(', ')
                : 'Select Performer'}
              {selectedWardrobe ? ` · ${selectedWardrobe.name}` : ''}
            </span>
          </button>

          <span className="text-zinc-600">·</span>

          <div className="inline-flex items-center gap-1.5 font-mono-tabular">
            <span className="text-zinc-500">Audio Segment:</span>
            <span className="text-white">
              {formatTimecode(scene.audioStartSec)} – {formatTimecode(scene.audioEndSec)}
            </span>
            <span className="text-[#46ecd5]">({segmentDuration.toFixed(1)}s)</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Creative Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 cols): Large Visual Monitor + Scene Reference Creation / Upload */}
        <div className="xl:col-span-7 space-y-5">
          {/* Large Scene Preview Monitor */}
          <div className="rounded-2xl bg-[#101218] border border-white/[0.08] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-mono-tabular uppercase tracking-wider text-zinc-400">
                  Stage Monitor
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-300 font-mono-tabular">
                  {scene.aspectRatio} · {scene.resolution}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-[#09090B] p-0.5 rounded-lg border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setPreviewLayer('reference')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    effectivePreviewMode === 'reference'
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Reference Frame
                </button>
                <button
                  type="button"
                  disabled={!activeVideoUrl}
                  onClick={() => setPreviewLayer('video')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-40 ${
                    effectivePreviewMode === 'video'
                      ? 'bg-[#46ecd5]/20 text-[#46ecd5]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Generated Clip
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-[#08090C]">
              <div
                className={`relative w-full overflow-hidden rounded-xl bg-[#0F1219] border border-white/[0.06] flex items-center justify-center ${aspectToCss(
                  scene.aspectRatio
                )}`}
              >
                {effectivePreviewMode === 'video' && activeVideoUrl ? (
                  <video
                    ref={previewVideoRef}
                    src={activeVideoUrl}
                    controls
                    playsInline
                    onEnded={() => {
                      setIsSyncedPlaying(false);
                      if (syncedAudioRef.current) syncedAudioRef.current.pause();
                    }}
                    className="w-full h-full object-contain bg-black"
                  />
                ) : scene.sceneImageUrl ? (
                  <img
                    src={scene.sceneImageUrl}
                    alt={scene.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center px-6 py-10 max-w-md space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto">
                      <Clapperboard className="w-5 h-5 text-[#46ecd5]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">
                        Design or upload a scene frame
                      </p>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Generate a reference image with your locked performer and wardrobe below, or
                        upload an existing scene plate or storyboard frame.
                      </p>
                    </div>
                  </div>
                )}

                {/* Active generation progress overlay */}
                {isBusy && (
                  <div className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <Loader2 className="w-7 h-7 text-[#46ecd5] animate-spin" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">
                        {scene.status === 'generating_image'
                          ? 'Generating Scene Reference Frame'
                          : scene.status === 'syncing_lips'
                          ? 'Stage 2 — Synchronizing Mouth Movements to Audio'
                          : scene.mode === 'lip_sync' && scene.lipSyncPipelineType === 'native'
                          ? 'Rendering Native Audio-Driven Lip Sync Performance'
                          : scene.mode === 'lip_sync'
                          ? 'Stage 1 — Animating Scene Performance'
                          : 'Rendering Cinematic B-Roll Scene'}
                      </p>
                      {scene.statusMessage && (
                        <p className="text-xs text-zinc-400">{scene.statusMessage}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Monitor footer actions */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  {scene.status === 'ready' && scene.finalVideoUrl ? (
                    <span className="inline-flex items-center gap-1.5 text-[#46ecd5]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {scene.mode === 'lip_sync'
                          ? 'Lip-sync performance clip ready'
                          : 'B-roll clip ready'}
                      </span>
                    </span>
                  ) : scene.status === 'failed' ? (
                    <span className="inline-flex items-center gap-1.5 text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{scene.statusMessage || 'Generation failed — adjust settings and retry'}</span>
                    </span>
                  ) : scene.sceneImageUrl ? (
                    <span>Reference plate locked and ready for animation</span>
                  ) : (
                    <span>No scene reference attached yet</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeVideoUrl && audioTrack && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleToggleSyncedPreview}
                    >
                      {isSyncedPlaying ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      <span>{isSyncedPlaying ? 'Stop Synced Preview' : 'Preview with Music Segment'}</span>
                    </Button>
                  )}

                  {activeVideoUrl && (
                    <a
                      href={activeVideoUrl}
                      download={`${scene.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'scene'}.mp4`}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Clip</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: SCENE CREATION (Option A: Create vs Option B: Upload) */}
          <div className="rounded-2xl bg-[#101218] border border-white/[0.08] p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Scene Reference Frame</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Generate a custom scene plate with performer continuity, or upload an existing scene / storyboard image.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-[#09090B] p-1 rounded-xl border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => onUpdateScene({ sceneSourceMode: 'generate' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    scene.sceneSourceMode === 'generate'
                      ? 'bg-[#46ecd5]/15 text-[#46ecd5]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Option A: Create Scene</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateScene({ sceneSourceMode: 'upload' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    scene.sceneSourceMode === 'upload'
                      ? 'bg-[#46ecd5]/15 text-[#46ecd5]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Option B: Upload Scene</span>
                </button>
              </div>
            </div>

            {scene.sceneSourceMode === 'generate' ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Scene Description & Composition
                  </label>
                  <Textarea
                    rows={3}
                    value={scene.scenePrompt}
                    onChange={(e) => onUpdateScene({ scenePrompt: e.target.value })}
                    placeholder="Describe the performer's position, foreground elements, mood, and framing (e.g., Lead vocalist standing beneath rain-drenched neon signs on a midnight rooftop, singing into a vintage chrome microphone...)"
                    className="bg-[#0B0D12] text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-400">
                      Environment, Background & Atmosphere
                    </label>
                    <Input
                      value={scene.environmentNotes}
                      onChange={(e) => onUpdateScene({ environmentNotes: e.target.value })}
                      placeholder="Wet asphalt, drifting haze, distant city skyline bokeh"
                      className="bg-[#0B0D12] text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-400">Visual Style</label>
                    <select
                      value={scene.visualStyle}
                      onChange={(e) => onUpdateScene({ visualStyle: e.target.value })}
                      className="w-full h-10 rounded-xl bg-[#0B0D12] border border-white/10 px-3 text-xs text-zinc-200 focus:outline-none focus:border-[#46ecd5]/60"
                    >
                      {VISUAL_STYLES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-400">Camera Framing</label>
                    <select
                      value={scene.cameraFraming}
                      onChange={(e) => onUpdateScene({ cameraFraming: e.target.value })}
                      className="w-full h-10 rounded-xl bg-[#0B0D12] border border-white/10 px-3 text-xs text-zinc-200 focus:outline-none focus:border-[#46ecd5]/60"
                    >
                      {CAMERA_FRAMINGS.map((fr) => (
                        <option key={fr} value={fr}>
                          {fr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-400">Lighting & Mood</label>
                    <select
                      value={scene.lightingStyle}
                      onChange={(e) => onUpdateScene({ lightingStyle: e.target.value })}
                      className="w-full h-10 rounded-xl bg-[#0B0D12] border border-white/10 px-3 text-xs text-zinc-200 focus:outline-none focus:border-[#46ecd5]/60"
                    >
                      {LIGHTING_STYLES.map((lt) => (
                        <option key={lt} value={lt}>
                          {lt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-3 pt-1 border-t border-white/[0.06]">
                  <div className="space-y-1 min-w-[210px] flex-1">
                    <label className="text-[11px] text-zinc-400">Scene Image Model</label>
                    <select
                      value={scene.sceneImageModelId || imageModels[0]?.id || ''}
                      onChange={(e) => onUpdateScene({ sceneImageModelId: e.target.value })}
                      className="w-full h-9 rounded-lg bg-[#0B0D12] border border-white/10 px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#46ecd5]/60"
                    >
                      {imageModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label} · {m.provider}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isBusy || !scene.scenePrompt.trim()}
                    onClick={() => onGenerateSceneImage(scene)}
                    className="h-9"
                  >
                    {scene.status === 'generating_image' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-[#46ecd5]" />
                    )}
                    <span>
                      {scene.sceneImageUrl ? 'Regenerate Scene Frame' : 'Generate Scene Frame'}
                    </span>
                    <span className="text-[11px] font-mono-tabular text-zinc-400 ml-1">
                      · {estimatedImageCredits} cr
                    </span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) await onUploadSceneImage(f);
                    e.target.value = '';
                  }}
                />
                <div
                  onClick={() => uploadInputRef.current?.click()}
                  className="rounded-xl border border-dashed border-white/15 hover:border-[#46ecd5]/50 bg-[#0B0D12] p-6 text-center cursor-pointer transition-colors space-y-2"
                >
                  <Upload className="w-6 h-6 text-[#46ecd5] mx-auto" />
                  <p className="text-sm font-medium text-white">
                    Upload Existing Scene Plate or Storyboard Frame
                  </p>
                  <p className="text-xs text-zinc-400">
                    PNG, JPG, or WebP. Used directly as the visual anchor for animation and lip sync.
                  </p>
                </div>

                {scene.sceneImageUrl && (
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                    <span className="truncate">Custom scene reference loaded</span>
                    <button
                      type="button"
                      onClick={() => onUpdateScene({ sceneImageUrl: '' })}
                      className="inline-flex items-center gap-1 text-zinc-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Generation Mode, Direction, Intelligent Models & Output Settings */}
        <div className="xl:col-span-5 space-y-5">
          {/* SECTION 5: TWO DISTINCT GENERATION MODES */}
          <div className="rounded-2xl bg-[#101218] border border-white/[0.08] p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Generation Mode</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Model choices and pipeline stages automatically adapt to the selected mode.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => applyModelSelection('lip_sync', scene.lipSyncPipelineType)}
                className={`p-3.5 rounded-xl border text-left transition-all space-y-1.5 ${
                  scene.mode === 'lip_sync'
                    ? 'bg-[#46ecd5]/12 border-[#46ecd5]/55 text-white'
                    : 'bg-[#0B0D12] border-white/[0.07] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mic
                    className={`w-4 h-4 ${
                      scene.mode === 'lip_sync' ? 'text-[#46ecd5]' : 'text-zinc-500'
                    }`}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Mode A · Lip Sync
                  </span>
                </div>
                <p className="text-[11px] leading-snug text-zinc-400">
                  Singing or spoken vocal performance synced to your trimmed audio segment.
                </p>
              </button>

              <button
                type="button"
                onClick={() => applyModelSelection('b_roll', scene.lipSyncPipelineType)}
                className={`p-3.5 rounded-xl border text-left transition-all space-y-1.5 ${
                  scene.mode === 'b_roll'
                    ? 'bg-[#46ecd5]/12 border-[#46ecd5]/55 text-white'
                    : 'bg-[#0B0D12] border-white/[0.07] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Film
                    className={`w-4 h-4 ${
                      scene.mode === 'b_roll' ? 'text-[#46ecd5]' : 'text-zinc-500'
                    }`}
                  />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Mode B · B-Roll
                  </span>
                </div>
                <p className="text-[11px] leading-snug text-zinc-400">
                  Cinematic cutaways, dance, establishing shots & motion without lip sync.
                </p>
              </button>
            </div>

            {/* Mode-Specific Directing Controls */}
            {scene.mode === 'lip_sync' ? (
              <div className="space-y-3.5 pt-2 border-t border-white/[0.06]">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Performance & Acting Direction
                  </label>
                  <Textarea
                    rows={2}
                    value={scene.performanceDirection}
                    onChange={(e) => onUpdateScene({ performanceDirection: e.target.value })}
                    placeholder="Direct vocal delivery, emotion, pacing, and eye contact with the camera..."
                    className="bg-[#0B0D12] text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">Facial Expression</label>
                    <select
                      value={scene.facialExpression}
                      onChange={(e) => onUpdateScene({ facialExpression: e.target.value })}
                      className="w-full h-9 rounded-lg bg-[#0B0D12] border border-white/10 px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#46ecd5]/60"
                    >
                      {FACIAL_EXPRESSIONS.map((expr) => (
                        <option key={expr} value={expr}>
                          {expr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">Camera Movement</label>
                    <select
                      value={scene.cameraMovement}
                      onChange={(e) => onUpdateScene({ cameraMovement: e.target.value })}
                      className="w-full h-9 rounded-lg bg-[#0B0D12] border border-white/10 px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#46ecd5]/60"
                    >
                      {CAMERA_MOVEMENTS.map((mv) => (
                        <option key={mv} value={mv}>
                          {mv}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400">Gestures & Body Movement</label>
                  <select
                    value={scene.bodyMovement}
                    onChange={(e) => onUpdateScene({ bodyMovement: e.target.value })}
                    className="w-full h-9 rounded-lg bg-[#0B0D12] border border-white/10 px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#46ecd5]/60"
                  >
                    {BODY_MOVEMENTS.map((bm) => (
                      <option key={bm} value={bm}>
                        {bm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 pt-2 border-t border-white/[0.06]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">B-Roll Shot Category</label>
                    <select
                      value={scene.bRollCategory}
                      onChange={(e) => onUpdateScene({ bRollCategory: e.target.value })}
                      className="w-full h-9 rounded-lg bg-[#0B0D12] border border-white/10 px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#46ecd5]/60"
                    >
                      {BROLL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">Camera Movement</label>
                    <select
                      value={scene.cameraMovement}
                      onChange={(e) => onUpdateScene({ cameraMovement: e.target.value })}
                      className="w-full h-9 rounded-lg bg-[#0B0D12] border border-white/10 px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#46ecd5]/60"
                    >
                      {CAMERA_MOVEMENTS.map((mv) => (
                        <option key={mv} value={mv}>
                          {mv}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Motion & Animation Direction
                  </label>
                  <Textarea
                    rows={2}
                    value={scene.performanceDirection}
                    onChange={(e) => onUpdateScene({ performanceDirection: e.target.value })}
                    placeholder="Describe camera choreography, slow-motion physics, dance tempo, lighting shifts, or storytelling action..."
                    className="bg-[#0B0D12] text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: INTELLIGENT MODEL SELECTION & PIPELINE ROUTING */}
          <div className="rounded-2xl bg-[#101218] border border-white/[0.08] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">Model Pipeline</h3>
              <span className="text-[11px] font-mono-tabular text-zinc-400">
                {scene.mode === 'lip_sync'
                  ? scene.lipSyncPipelineType === 'native'
                    ? 'Single-Pass Audio Sync'
                    : '2-Stage Animate → Sync'
                  : 'Cinematic Video Only'}
              </span>
            </div>

            {scene.mode === 'lip_sync' && (
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#09090B] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => applyModelSelection('lip_sync', 'native')}
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                    scene.lipSyncPipelineType === 'native'
                      ? 'bg-[#46ecd5]/15 text-[#46ecd5]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Native Audio Lip Sync
                </button>
                <button
                  type="button"
                  onClick={() => applyModelSelection('lip_sync', 'two_stage')}
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
                    scene.lipSyncPipelineType === 'two_stage'
                      ? 'bg-[#46ecd5]/15 text-[#46ecd5]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Animate + Lip-Sync Pass
                </button>
              </div>
            )}

            {/* Primary Model Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-400">
                {scene.mode === 'lip_sync'
                  ? scene.lipSyncPipelineType === 'native'
                    ? 'Native Audio-Driven Lip-Sync Model'
                    : 'Stage 1 · Scene Animation Model'
                  : 'B-Roll Video Generation Model'}
              </label>
              <select
                value={activeAnimationModel?.id || ''}
                onChange={(e) =>
                  applyModelSelection(
                    scene.mode,
                    scene.lipSyncPipelineType,
                    e.target.value,
                    scene.lipSyncModelId
                  )
                }
                className="w-full h-10 rounded-xl bg-[#0B0D12] border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-[#46ecd5]/60"
              >
                {(scene.mode === 'lip_sync'
                  ? scene.lipSyncPipelineType === 'native'
                    ? nativeLipSyncModels
                    : twoStageAnimModels
                  : bRollVideoModels
                ).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} · {m.provider}
                  </option>
                ))}
              </select>

              {activeCapability && (
                <p className="text-[11px] text-zinc-400 leading-relaxed pt-0.5">
                  <span className="text-[#46ecd5] font-medium">
                    {getCapabilityBadgeLabel(activeCapability.lipSyncCapability)}:
                  </span>{' '}
                  {activeCapability.capabilitySummary}
                </p>
              )}
            </div>

            {/* Stage 2 Dedicated Lip-Sync Selector (ONLY when two_stage is active) */}
            {scene.mode === 'lip_sync' && scene.lipSyncPipelineType === 'two_stage' && (
              <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                <label className="text-[11px] font-medium text-zinc-400">
                  Stage 2 · Dedicated Lip-Sync Processor
                </label>
                <select
                  value={activeLipSyncProcessor?.id || ''}
                  onChange={(e) =>
                    applyModelSelection(
                      'lip_sync',
                      'two_stage',
                      activeAnimationModel?.id,
                      e.target.value
                    )
                  }
                  className="w-full h-10 rounded-xl bg-[#0B0D12] border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-[#46ecd5]/60"
                >
                  {dedicatedLipSyncProcessors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} · {m.provider}
                    </option>
                  ))}
                </select>
                {stage2Capability && (
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    <span className="text-emerald-400 font-medium">
                      {getCapabilityBadgeLabel(stage2Capability.lipSyncCapability)}:
                    </span>{' '}
                    {stage2Capability.capabilitySummary}
                  </p>
                )}
              </div>
            )}

            {/* Honest Connected Pipeline Readout */}
            <div className="rounded-xl bg-[#0A0C11] border border-white/[0.06] px-3 py-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-300">
              <span className="text-zinc-500 font-mono-tabular uppercase">Pipeline:</span>
              <span>{scene.sceneImageUrl ? 'Scene Frame' : 'Text Prompt'}</span>
              {scene.mode === 'lip_sync' && scene.lipSyncPipelineType === 'native' ? (
                <>
                  <span className="text-zinc-600">+</span>
                  <span className="text-[#46ecd5]">
                    Audio ({segmentDuration.toFixed(1)}s)
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                  <span className="font-medium text-white">
                    {activeAnimationModel?.label}
                  </span>
                </>
              ) : scene.mode === 'lip_sync' ? (
                <>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                  <span className="font-medium text-white">{activeAnimationModel?.label}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                  <span className="text-[#46ecd5]">
                    {activeLipSyncProcessor?.label} + Audio ({segmentDuration.toFixed(1)}s)
                  </span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                  <span className="font-medium text-white">{activeAnimationModel?.label}</span>
                  <span className="text-zinc-500">(No lip sync)</span>
                </>
              )}
            </div>
          </div>

          {/* SECTION 7: DYNAMIC ORIENTATION & MODEL-SPECIFIC OUTPUT SETTINGS */}
          <div className="rounded-2xl bg-[#101218] border border-white/[0.08] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Orientation & Output</h3>
              <span className="text-[11px] text-zinc-500">
                Filtered to {activeAnimationModel?.label || 'model'}
              </span>
            </div>

            {/* Dynamic Aspect Ratio Selector */}
            {dynamicControls.aspectRatios.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-400">Video Orientation / Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {dynamicControls.aspectRatios.map((ar) => {
                    const active = scene.aspectRatio === ar.value;
                    return (
                      <button
                        key={ar.value}
                        type="button"
                        onClick={() => onUpdateScene({ aspectRatio: ar.value })}
                        className={`px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors text-center ${
                          active
                            ? 'bg-[#46ecd5]/15 border-[#46ecd5]/50 text-[#46ecd5]'
                            : 'bg-[#0B0D12] border-white/[0.07] text-zinc-300 hover:border-white/20'
                        }`}
                      >
                        <div className="font-mono-tabular font-semibold">{ar.value}</div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {ar.value === '16:9'
                            ? 'Landscape'
                            : ar.value === '9:16'
                            ? 'Portrait'
                            : ar.value === '1:1'
                            ? 'Square'
                            : ar.label.replace(ar.value, '').trim() || 'Custom'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic Resolution & Duration */}
            {(dynamicControls.resolutions.length > 0 || dynamicControls.durations.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {dynamicControls.resolutions.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">Resolution</label>
                    <select
                      value={scene.resolution}
                      onChange={(e) => onUpdateScene({ resolution: e.target.value })}
                      className="w-full h-9 rounded-lg bg-[#0B0D12] border border-white/10 px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#46ecd5]/60"
                    >
                      {dynamicControls.resolutions.map((res) => (
                        <option key={res.value} value={res.value}>
                          {res.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {dynamicControls.durations.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400">Clip Duration</label>
                    <select
                      value={String(scene.durationSec)}
                      onChange={(e) => onUpdateScene({ durationSec: Number(e.target.value) })}
                      className="w-full h-9 rounded-lg bg-[#0B0D12] border border-white/10 px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#46ecd5]/60"
                    >
                      {dynamicControls.durations.map((dur) => (
                        <option key={dur.value} value={dur.value}>
                          {dur.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Progressive Disclosure: Model-Specific Advanced Settings */}
            {(dynamicControls.advancedSettings.length > 0 ||
              (lipSyncProcessorControls && lipSyncProcessorControls.advancedSettings.length > 0)) && (
              <div className="border-t border-white/[0.06] pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvancedModelSettings((v) => !v)}
                  className="w-full flex items-center justify-between text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#46ecd5]" />
                    <span>Model-Specific Settings</span>
                  </span>
                  {showAdvancedModelSettings ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  )}
                </button>

                {showAdvancedModelSettings && (
                  <div className="mt-3 space-y-3 rounded-xl bg-[#0B0D12] border border-white/[0.06] p-3">
                    {dynamicControls.advancedSettings.map((s) => renderSettingControl(s))}
                    {lipSyncProcessorControls &&
                      lipSyncProcessorControls.advancedSettings.length > 0 && (
                        <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
                          <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-zinc-500">
                            {activeLipSyncProcessor?.label} Sync Parameters
                          </div>
                          {lipSyncProcessorControls.advancedSettings.map((s) =>
                            renderSettingControl(s)
                          )}
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}

            {/* Pre-flight Requirement Check Hints */}
            {scene.mode === 'lip_sync' && (!audioTrack || !scene.sceneImageUrl) && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-400/25 px-3 py-2.5 text-xs text-amber-200 space-y-1">
                {!audioTrack && (
                  <p>• Import a music track above and select the vocal audio segment first.</p>
                )}
                {!scene.sceneImageUrl && (
                  <p>• Generate or upload a scene reference frame on the left before lip syncing.</p>
                )}
              </div>
            )}

            {/* Primary Generation CTA */}
            <Button
              type="button"
              variant="default"
              disabled={!canGenerateVideo}
              onClick={() => onGenerateSceneVideo(scene)}
              className="w-full h-11 text-sm font-semibold justify-center"
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Scene...</span>
                </>
              ) : scene.mode === 'lip_sync' ? (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>
                    {scene.finalVideoUrl
                      ? 'Regenerate Lip-Sync Performance'
                      : 'Generate Lip-Sync Performance'}
                  </span>
                  <span className="font-mono-tabular text-xs opacity-80 ml-1">
                    · {estimatedVideoCredits} cr
                  </span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>
                    {scene.finalVideoUrl ? 'Regenerate B-Roll Clip' : 'Generate B-Roll Scene'}
                  </span>
                  <span className="font-mono-tabular text-xs opacity-80 ml-1">
                    · {estimatedVideoCredits} cr
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
