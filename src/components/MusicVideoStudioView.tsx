import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Link2,
  Loader2,
  Mic,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Scissors,
  Shirt,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Video,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import { useRuns } from '../lib/useRuns';
import {
  CharacterProfile,
  CinemaProductionProject,
  MediaSlotInput,
  ModelEntry,
  MusicVideoAudioTrack,
  MusicVideoBRollType,
  MusicVideoProductionState,
  MusicVideoSceneItem,
  MusicVideoSceneMode,
  WardrobeCategory,
  WardrobeItem,
} from '../types/studio';
import {
  getClosestModelDuration,
  getMusicVideoAnimationModels,
  getMusicVideoBRollModels,
  getMusicVideoDedicatedLipSyncModels,
  getMusicVideoNativeLipSyncModels,
  getMusicVideoSceneImageModels,
  sanitizeSettingsForModel,
} from '../catalog/modelCapabilities';
import { AnimatedPillTabs, ShimmerButton, SpotlightCard } from './ui/aceternity-magic';
import { Button, Input, ScrollArea, Switch, Textarea } from './ui/primitives';
import { GearVisual } from './GearVisual';
import {
  getCameraAngleVisual,
  getCameraMovementVisual,
  getColorGradeVisual,
  getSettingOptionVisual,
} from '../catalog/cinemaGearVisuals';

export interface MusicVideoStudioViewProps {
  projectId: string | null;
  projectTitle: string;
  activeAspectRatio: string;
  onProjectTitleChange: (title: string) => void;
  onBackToDirector: () => void;
}

const BROLL_TYPE_OPTIONS: Array<{
  id: MusicVideoBRollType;
  label: string;
  hint: string;
}> = [
  { id: 'environmental', label: 'Environmental Scene', hint: 'Moody cityscapes, neon rain, architectural vistas' },
  { id: 'performance_no_lipsync', label: 'Performance (Non-Sync)', hint: 'Artist singing/emoting in wide, silhouette, or profile' },
  { id: 'dance_choreography', label: 'Dance & Choreography', hint: 'Full-body rhythmic movement & stage blocking' },
  { id: 'slow_motion', label: 'Slow-Motion Sequence', hint: 'High-frame-rate dramatic motion & fabric drape' },
  { id: 'establishing', label: 'Establishing Shot', hint: 'Sweeping aerial/wide geography & stage opener' },
  { id: 'artistic_cutaway', label: 'Artistic Cutaway', hint: 'Symbolic visual motifs, light flares & textures' },
  { id: 'cinematic_closeup', label: 'Cinematic Close-Up', hint: 'Intimate eyes, instruments, hands, detail inserts' },
  { id: 'lifestyle_story', label: 'Lifestyle & Story', hint: 'Narrative vignette, backstage, cruising scenes' },
  { id: 'creative_transition', label: 'Creative Transition', hint: 'Whip-pan, match-cut, light-wash bridge shot' },
];

const CAMERA_ANGLES = [
  'Medium Close-Up (MCU)',
  'Close-Up Vocal Framing (CU)',
  'Wide Master Shot (WS)',
  'Low-Angle Hero Shot',
  'Over-the-Shoulder (OTS)',
  'Extreme Close-Up (ECU)',
  'Full-Body Performance Framing',
  'Dutch Tilt Editorial Angle',
];

const CAMERA_MOVEMENTS = [
  'Locked Steadicam Hold',
  'Slow Push-In',
  'Smooth Orbit 180°',
  'Handheld Intimate Sway',
  'Tracking Dolly Lateral',
  'Crane Rise Reveal',
  'Static Locked Tripod',
  'Whip Pan Dynamic Cut',
];

const LIGHTING_MOODS = [
  'Neon Rim & Atmospheric Haze',
  'Warm Golden Hour Sunbeams',
  'High-Contrast Noir Chiaroscuro',
  'Cool Anamorphic Cyan Backlight',
  'Concert Strobe & Practical Sparks',
  'Soft Editorial Beauty Key',
];

const VISUAL_STYLES = [
  '35mm Anamorphic Cinema Film',
  'Modern High-Gloss Music Video',
  'Moody Film Noir Monochrome',
  '90s VHS / Halation Analog Texture',
  'Ultra-Crisp Digital IMAX Editorial',
  'Surreal Dreamlike Color Wash',
];

const FACIAL_EXPRESSIONS = [
  'Passionate Singing Delivery',
  'Intense Rhythmic Cadence',
  'Warm Soulful Smile',
  'Melancholic Vulnerable Gaze',
  'Confident Fierce Performance',
  'Intimate Whispered Hook',
];

const GESTURE_DIRECTIONS = [
  'Subtle head nod and expressive hand cadence',
  'Singing directly into vintage studio mic',
  'Dynamic shoulder groove and chest emphasis',
  'Still, intense eye contact with camera lens',
  'Slow turn toward lens mid-phrase',
  'Expressive rhythmic choreography sway',
];

const WARDROBE_CATEGORIES: WardrobeCategory[] = [
  'Costume',
  'Casual',
  'Formal',
  'Traditional',
  'Streetwear',
  'Futuristic',
  'Corporate',
  'Tactical',
];

const WAVEFORM_BAR_COUNT = 120;

const WaveformBarsLayer = React.memo(function WaveformBarsLayer({
  peaks,
  barClassName,
}: {
  peaks: number[];
  barClassName: string;
}) {
  return (
    <div className="w-full h-full px-2 flex items-center justify-between gap-[2px]">
      {peaks.map((peak, idx) => (
        <div
          key={idx}
          style={{ height: `${Math.max(10, Math.round(peak * 86))}%` }}
          className={`flex-1 rounded-full ${barClassName}`}
        />
      ))}
    </div>
  );
});

function formatTimecode(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00.0';
  const mins = Math.floor(sec / 60);
  const rem = sec - mins * 60;
  const whole = Math.floor(rem);
  const tenths = Math.floor((rem - whole) * 10);
  return `${mins}:${whole.toString().padStart(2, '0')}.${tenths}`;
}

function createSyntheticPeaks(seedStr: string, count = WAVEFORM_BAR_COUNT): number[] {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    const wave =
      Math.abs(Math.sin(i * 0.24 + (h % 13))) * 0.52 +
      Math.abs(Math.cos(i * 0.63 + ((h >> 4) % 9))) * 0.35 +
      0.13;
    peaks.push(Math.min(1, Math.max(0.12, Number(wave.toFixed(3)))));
  }
  return peaks;
}

function extractPeaksFromAudioBuffer(buffer: AudioBuffer, barCount = WAVEFORM_BAR_COUNT): number[] {
  const channel = buffer.getChannelData(0);
  const totalSamples = channel.length;
  const blockSize = Math.max(1, Math.floor(totalSamples / barCount));
  const raw: number[] = [];
  let maxPeak = 0.01;
  for (let i = 0; i < barCount; i++) {
    const start = i * blockSize;
    const end = Math.min(totalSamples, start + blockSize);
    let maxVal = 0;
    const stride = Math.max(1, Math.floor((end - start) / 48));
    for (let j = start; j < end; j += stride) {
      const v = Math.abs(channel[j]);
      if (v > maxVal) maxVal = v;
    }
    raw.push(maxVal);
    if (maxVal > maxPeak) maxPeak = maxVal;
  }
  return raw.map((v) => Math.min(1, Math.max(0.08, Number((v / maxPeak).toFixed(3)))));
}

/**
 * Non-destructively encodes a selected `[startSec, endSec]` region from a decoded AudioBuffer
 * into a standalone PCM WAV Data URL (16-bit mono 22.05kHz for reliable lip-sync submission).
 */
function encodeAudioBufferSliceToWavDataUrl(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): string {
  const targetSampleRate = 22050;
  const srcRate = buffer.sampleRate;
  const clampedStart = Math.max(0, Math.min(buffer.duration, startSec));
  const clampedEnd = Math.max(clampedStart + 0.5, Math.min(buffer.duration, endSec));
  const sliceDuration = clampedEnd - clampedStart;
  const outSamples = Math.max(1, Math.floor(sliceDuration * targetSampleRate));

  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;

  const dataByteLength = outSamples * 2;
  const wav = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(wav);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataByteLength, true);

  let offset = 44;
  for (let i = 0; i < outSamples; i++) {
    const srcIdx = Math.min(
      ch0.length - 1,
      Math.floor((clampedStart + i / targetSampleRate) * srcRate)
    );
    const sample = ch1 ? (ch0[srcIdx] + ch1[srcIdx]) * 0.5 : ch0[srcIdx];
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(wav);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function createInitialScene(
  order: number,
  startSec = 0,
  duration = 5,
  aspectRatio = '16:9'
): MusicVideoSceneItem {
  return {
    id: `mv_scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    order,
    title: `Scene ${String(order).padStart(2, '0')}`,
    mode: 'lip_sync',
    bRollType: 'environmental',
    characterId: null,
    wardrobeId: null,
    locationId: null,
    sceneDescription:
      'Lead artist performing inside a rain-slicked neon soundstage with volumetric stage beams',
    environmentAtmosphere:
      'Atmospheric concert loft, moody obsidian steel beams, warm practical Tungsten accents',
    cameraFraming: CAMERA_ANGLES[0],
    cameraMovement: CAMERA_MOVEMENTS[1],
    lightingMood: LIGHTING_MOODS[0],
    visualStyle: VISUAL_STYLES[0],
    performanceDirection: 'Singing the chorus directly to lens with emotive vocal phrasing',
    facialExpression: FACIAL_EXPRESSIONS[0],
    gesturesAndBody: GESTURE_DIRECTIONS[0],
    sceneReferenceSource: 'generated',
    audioSegment: {
      startSec,
      endSec: startSec + duration,
      durationSec: duration,
    },
    pipelineStrategy: 'native_lip_sync',
    animationModelId: 'seedance-2-5',
    lipSyncModelId: 'omnihuman-1-5',
    aspectRatio,
    modelSettings: {},
    status: 'draft',
    updatedAt: new Date().toISOString(),
  };
}

export const MusicVideoStudioView: React.FC<MusicVideoStudioViewProps> = ({
  projectId,
  projectTitle,
  activeAspectRatio,
  onProjectTitleChange,
  onBackToDirector,
}) => {
  const {
    models,
    characters,
    wardrobes,
    uploads,
    generations,
    cinemaProjects,
    sessionToken,
    saveCharacter,
    saveWardrobe,
    saveCinemaProject,
    submitGeneration,
    pollGenerationUntilDone,
    uploadReferenceFile,
    calculateTokenCost,
    showToast,
  } = useRuns();

  const existingProject = useMemo<CinemaProductionProject | undefined>(
    () => cinemaProjects.find((p) => p.id === projectId) || cinemaProjects[0],
    [cinemaProjects, projectId]
  );

  // =========================================================================
  // SUB-NAVIGATION & WORKSPACE STATE
  // =========================================================================
  const [activeSubTab, setActiveSubTab] = useState<'studio' | 'cast' | 'sequence'>('studio');

  // Audio track & playback state
  const [audioTrack, setAudioTrack] = useState<MusicVideoAudioTrack | null>(
    () => existingProject?.musicVideo?.audioTrack || null
  );
  const [audioUrlInput, setAudioUrlInput] = useState('');
  const [audioImporting, setAudioImporting] = useState(false);
  const [audioImportError, setAudioImportError] = useState<string | null>(null);
  const [decodedBuffer, setDecodedBuffer] = useState<AudioBuffer | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUploadInputRef = useRef<HTMLInputElement | null>(null);
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playingSelectionOnly, setPlayingSelectionOnly] = useState(false);
  const [loopSelection, setLoopSelection] = useState(true);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [trimStartSec, setTrimStartSec] = useState<number>(
    () => existingProject?.musicVideo?.activeTrim?.startSec ?? 0
  );
  const [trimEndSec, setTrimEndSec] = useState<number>(
    () => existingProject?.musicVideo?.activeTrim?.endSec ?? 5
  );
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | 'window' | null>(null);
  const trimStartRef = useRef<number>(trimStartSec);
  const trimEndRef = useRef<number>(trimEndSec);
  trimStartRef.current = trimStartSec;
  trimEndRef.current = trimEndSec;
  const dragLiveStartRef = useRef<number>(trimStartSec);
  const dragLiveEndRef = useRef<number>(trimEndSec);
  const dragAnchorRef = useRef<{ pointerX: number; initStart: number; initEnd: number }>({
    pointerX: 0,
    initStart: 0,
    initEnd: 5,
  });
  const justDraggedRef = useRef<boolean>(false);
  const selectedWaveLayerRef = useRef<HTMLDivElement | null>(null);
  const leftShadeRef = useRef<HTMLDivElement | null>(null);
  const rightShadeRef = useRef<HTMLDivElement | null>(null);
  const selectionWindowRef = useRef<HTMLDivElement | null>(null);
  const startHandleRef = useRef<HTMLDivElement | null>(null);
  const endHandleRef = useRef<HTMLDivElement | null>(null);
  const startBadgeRef = useRef<HTMLElement | null>(null);
  const endBadgeRef = useRef<HTMLElement | null>(null);
  const durBadgeRef = useRef<HTMLElement | null>(null);

  // Scenes & sequence state
  const [scenes, setScenes] = useState<MusicVideoSceneItem[]>(() => {
    const saved = existingProject?.musicVideo?.scenes;
    if (saved && saved.length > 0) return saved;
    const first = createInitialScene(1, 0, 5, activeAspectRatio);
    if (characters[0]) {
      first.characterId = characters[0].id;
      first.wardrobeId = characters[0].defaultWardrobeId || wardrobes[0]?.id || null;
    }
    return [first];
  });
  const [activeSceneId, setActiveSceneId] = useState<string>(() => scenes[0]?.id || '');

  // Intelligent Model Pools
  const sceneImageModels = useMemo(() => getMusicVideoSceneImageModels(models), [models]);
  const nativeLipSyncModels = useMemo(() => getMusicVideoNativeLipSyncModels(models), [models]);
  const dedicatedLipSyncModels = useMemo(() => getMusicVideoDedicatedLipSyncModels(models), [models]);
  const animationVideoModels = useMemo(() => getMusicVideoAnimationModels(models), [models]);
  const brollVideoModels = useMemo(() => getMusicVideoBRollModels(models), [models]);

  const [selectedSceneImageModelId, setSelectedSceneImageModelId] = useState<string>(
    () => sceneImageModels[0]?.id || 'soul-cinema'
  );
  const [sceneImageSettings, setSceneImageSettings] = useState<
    Record<string, string | number | boolean>
  >(() => sanitizeSettingsForModel(sceneImageModels[0], {}, activeAspectRatio));

  // Scene creation tab: Option A (Create) vs Option B (Upload)
  const [sceneRefOption, setSceneRefOption] = useState<'create' | 'upload'>('create');
  const [generatingSceneImage, setGeneratingSceneImage] = useState(false);
  const [uploadingSceneRef, setUploadingSceneRef] = useState(false);
  const sceneRefUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Pipeline Execution State
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [pipelineStageLabel, setPipelineStageLabel] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Cast & Wardrobe Creation Form State
  const [castName, setCastName] = useState('');
  const [castRole, setCastRole] = useState('Lead Vocalist');
  const [castAppearance, setCastAppearance] = useState(
    'Expressive studio performer, textured sculptural braids, tailored silhouette, subtle metallic skin highlight'
  );
  const [castPortraitModelId, setCastPortraitModelId] = useState<string>(
    () => sceneImageModels[0]?.id || 'soul-2-standard'
  );
  const [castPortraitPreviewUrl, setCastPortraitPreviewUrl] = useState('');
  const [castBusy, setCastBusy] = useState(false);
  const castPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const [wardrobeName, setWardrobeName] = useState('');
  const [wardrobeCategory, setWardrobeCategory] = useState<WardrobeCategory>('Costume');
  const [wardrobeGarments, setWardrobeGarments] = useState(
    'Iridescent tailored obsidian trench over liquid-chrome mesh top'
  );
  const [wardrobeShoes, setWardrobeShoes] = useState('Sculpted platform leather boots');
  const [wardrobeAccessories, setWardrobeAccessories] = useState(
    'Layered chrome chains and tinted visor shades'
  );
  const [wardrobePalette, setWardrobePalette] = useState('Obsidian, Chrome Silver, Cyan Rim');
  const [wardrobePreviewUrl, setWardrobePreviewUrl] = useState('');
  const [wardrobeBusy, setWardrobeBusy] = useState(false);
  const wardrobePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Master Sequence Player State
  const [masterPlaying, setMasterPlaying] = useState(false);
  const [masterSceneIndex, setMasterSceneIndex] = useState(0);
  const masterVideoRef = useRef<HTMLVideoElement | null>(null);
  const masterAudioRef = useRef<HTMLAudioElement | null>(null);

  // Resolve current scene safely
  const activeScene = useMemo<MusicVideoSceneItem>(
    () =>
      scenes.find((s) => s.id === activeSceneId) ||
      scenes[0] ||
      createInitialScene(1, 0, 5, activeAspectRatio),
    [scenes, activeSceneId, activeAspectRatio]
  );

  const updateActiveScene = useCallback(
    (patch: Partial<MusicVideoSceneItem>) => {
      setScenes((prev) =>
        prev.map((s) =>
          s.id === activeScene.id
            ? { ...s, ...patch, updatedAt: new Date().toISOString() }
            : s
        )
      );
    },
    [activeScene.id]
  );

  // Re-sync when switching Cinema Projects
  const loadedProjIdRef = useRef<string | null>(existingProject?.id || null);
  useEffect(() => {
    if (!existingProject || existingProject.id === loadedProjIdRef.current) return;
    loadedProjIdRef.current = existingProject.id;
    const mv = existingProject.musicVideo;
    if (mv) {
      setAudioTrack(mv.audioTrack || null);
      if (mv.activeTrim) {
        setTrimStartSec(mv.activeTrim.startSec);
        setTrimEndSec(mv.activeTrim.endSec);
      }
      if (mv.scenes && mv.scenes.length > 0) {
        setScenes(mv.scenes);
        setActiveSceneId(mv.scenes[0].id);
      }
    }
  }, [existingProject]);

  // Decode audio buffer when track changes so PCM waveform & exact non-destructive slicing work cleanly
  useEffect(() => {
    if (!audioTrack?.playbackUrl) {
      setDecodedBuffer(null);
      return;
    }
    let cancelled = false;
    const decodeTrack = async () => {
      try {
        const res = await fetch(audioTrack.playbackUrl);
        if (!res.ok) return;
        const arrBuf = await res.arrayBuffer();
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const decoded = await ctx.decodeAudioData(arrBuf).catch(() => null);
        await ctx.close().catch(() => {});
        if (!decoded || cancelled) return;
        setDecodedBuffer(decoded);
        const peaks = extractPeaksFromAudioBuffer(decoded, WAVEFORM_BAR_COUNT);
        const realDuration = Number(decoded.duration.toFixed(2));
        setAudioTrack((prev) =>
          prev
            ? {
                ...prev,
                durationSec: realDuration || prev.durationSec,
                waveformPeaks: peaks,
              }
            : prev
        );
        setTrimStartSec((prevStart) => Math.min(prevStart, Math.max(0, realDuration - 1)));
        setTrimEndSec((prevEnd) => {
          if (prevEnd <= 0 || prevEnd > realDuration) {
            return Math.min(realDuration, 5);
          }
          return prevEnd;
        });
      } catch {
        // Fallback waveform peaks remain active cleanly
      }
    };
    decodeTrack();
    return () => {
      cancelled = true;
    };
  }, [audioTrack?.playbackUrl]);

  // Persist Music Video State cleanly into Cinema Project (debounced)
  const persistTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!existingProject?.id && !projectId) return;
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      const mvState: MusicVideoProductionState = {
        audioTrack: audioTrack || null,
        activeTrim: {
          startSec: trimStartSec,
          endSec: trimEndSec,
          durationSec: Number(Math.max(0.5, trimEndSec - trimStartSec).toFixed(2)),
        },
        defaultAspectRatio: activeAspectRatio,
        scenes,
        updatedAt: new Date().toISOString(),
      };
      void saveCinemaProject({
        id: projectId || existingProject?.id,
        title: projectTitle,
        productionType: 'Music Videos',
        aspectRatio: activeAspectRatio as CinemaProductionProject['aspectRatio'],
        musicTrackUrl: audioTrack?.originalUrl || audioTrack?.playbackUrl,
        musicVideo: mvState,
      });
    }, 1100);
    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, [
    audioTrack,
    trimStartSec,
    trimEndSec,
    scenes,
    projectId,
    existingProject?.id,
    projectTitle,
    activeAspectRatio,
    saveCinemaProject,
  ]);

  // =========================================================================
  // AUDIO PLAYBACK & INTERACTIVE TIMELINE TRIMMING HANDLERS
  // =========================================================================
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = isMuted ? 0 : audioVolume;
  }, [audioVolume, isMuted]);

  const handleAudioTimeUpdate = () => {
    const el = audioRef.current;
    if (!el) return;
    const t = el.currentTime;
    setCurrentTimeSec(t);
    if (playingSelectionOnly && t >= trimEndSec) {
      if (loopSelection) {
        el.currentTime = trimStartSec;
      } else {
        el.pause();
        setIsPlaying(false);
        setPlayingSelectionOnly(false);
      }
    }
  };

  const handleAudioLoadedMetadata = () => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    const dur = Number(el.duration.toFixed(2));
    setAudioTrack((prev) =>
      prev && prev.durationSec <= 0 ? { ...prev, durationSec: dur } : prev
    );
    if (trimEndSec > dur || trimEndSec <= trimStartSec) {
      setTrimStartSec(0);
      setTrimEndSec(Math.min(dur, 5));
    }
  };

  const togglePlayFull = async () => {
    const el = audioRef.current;
    if (!el || !audioTrack) return;
    if (isPlaying && !playingSelectionOnly) {
      el.pause();
      setIsPlaying(false);
    } else {
      setPlayingSelectionOnly(false);
      await el.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const togglePlaySelection = async () => {
    const el = audioRef.current;
    if (!el || !audioTrack) return;
    if (isPlaying && playingSelectionOnly) {
      el.pause();
      setIsPlaying(false);
      setPlayingSelectionOnly(false);
      return;
    }
    el.currentTime = trimStartSec;
    setCurrentTimeSec(trimStartSec);
    setPlayingSelectionOnly(true);
    await el.play().catch(() => {});
    setIsPlaying(true);
  };

  const seekAudioTo = (sec: number) => {
    const el = audioRef.current;
    if (!audioTrack) return;
    const clamped = Math.max(0, Math.min(audioTrack.durationSec || 60, sec));
    if (el) el.currentTime = clamped;
    setCurrentTimeSec(clamped);
  };

  // Dragging handles for start / end / selection window (60-120fps direct rAF + GPU clip-path)
  const audioTrackId = audioTrack?.id || null;
  const audioTrackDurForDrag = Math.max(1, audioTrack?.durationSec || 30);

  useEffect(() => {
    if (!draggingHandle || !audioTrackId) return;
    const trackDuration = audioTrackDurForDrag;
    const minGap = 0.8;

    dragLiveStartRef.current = trimStartRef.current;
    dragLiveEndRef.current = trimEndRef.current;
    justDraggedRef.current = true;

    let rafId = 0;
    let pendingStart = dragLiveStartRef.current;
    let pendingEnd = dragLiveEndRef.current;

    const applyVisualFrame = () => {
      rafId = 0;
      const startPct = Math.max(0, Math.min(100, (pendingStart / trackDuration) * 100));
      const endPct = Math.max(startPct, Math.min(100, (pendingEnd / trackDuration) * 100));

      if (selectedWaveLayerRef.current) {
        selectedWaveLayerRef.current.style.clipPath = `inset(0 ${(100 - endPct).toFixed(3)}% 0 ${startPct.toFixed(3)}%)`;
      }
      if (leftShadeRef.current) {
        leftShadeRef.current.style.width = `${startPct.toFixed(3)}%`;
      }
      if (rightShadeRef.current) {
        rightShadeRef.current.style.left = `${endPct.toFixed(3)}%`;
      }
      if (selectionWindowRef.current) {
        selectionWindowRef.current.style.left = `${startPct.toFixed(3)}%`;
        selectionWindowRef.current.style.width = `${Math.max(0.8, endPct - startPct).toFixed(3)}%`;
      }
      if (startHandleRef.current) {
        startHandleRef.current.style.left = `calc(${startPct.toFixed(3)}% - 8px)`;
      }
      if (endHandleRef.current) {
        endHandleRef.current.style.left = `calc(${endPct.toFixed(3)}% - 8px)`;
      }
      if (startBadgeRef.current) {
        startBadgeRef.current.textContent = formatTimecode(pendingStart);
      }
      if (endBadgeRef.current) {
        endBadgeRef.current.textContent = formatTimecode(pendingEnd);
      }
      if (durBadgeRef.current) {
        durBadgeRef.current.textContent = `${Math.max(0.5, pendingEnd - pendingStart).toFixed(1)}s`;
      }
    };

    const scheduleFrame = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(applyVisualFrame);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = timelineTrackRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;

      if (draggingHandle === 'start') {
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const pointerSec = ratio * trackDuration;
        pendingStart = Math.max(0, Math.min(pendingEnd - minGap, pointerSec));
      } else if (draggingHandle === 'end') {
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const pointerSec = ratio * trackDuration;
        pendingEnd = Math.min(trackDuration, Math.max(pendingStart + minGap, pointerSec));
      } else if (draggingHandle === 'window') {
        const deltaPx = e.clientX - dragAnchorRef.current.pointerX;
        const deltaSec = (deltaPx / rect.width) * trackDuration;
        const winLen = dragAnchorRef.current.initEnd - dragAnchorRef.current.initStart;
        const clampedStart = Math.max(
          0,
          Math.min(trackDuration - winLen, dragAnchorRef.current.initStart + deltaSec)
        );
        pendingStart = clampedStart;
        pendingEnd = clampedStart + winLen;
      }

      dragLiveStartRef.current = pendingStart;
      dragLiveEndRef.current = pendingEnd;
      scheduleFrame();
    };

    const finishDrag = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      const committedStart = Number(Math.max(0, dragLiveStartRef.current).toFixed(1));
      const committedEnd = Number(
        Math.min(trackDuration, Math.max(committedStart + minGap, dragLiveEndRef.current)).toFixed(1)
      );
      trimStartRef.current = committedStart;
      trimEndRef.current = committedEnd;
      setTrimStartSec(committedStart);
      setTrimEndSec(committedEnd);
      setDraggingHandle(null);
      window.setTimeout(() => {
        justDraggedRef.current = false;
      }, 90);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, [draggingHandle, audioTrackId, audioTrackDurForDrag]);

  const trimDurationSec = Number(Math.max(0.5, trimEndSec - trimStartSec).toFixed(1));

  // Audio Import Handlers
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAudioImportError(null);
    setAudioImporting(true);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const inferredMime =
        file.type ||
        (ext === 'mp3'
          ? 'audio/mpeg'
          : ext === 'wav'
          ? 'audio/wav'
          : ext === 'm4a'
          ? 'audio/mp4'
          : ext === 'ogg'
          ? 'audio/ogg'
          : ext === 'flac'
          ? 'audio/flac'
          : 'audio/mpeg');

      const uploaded = await uploadReferenceFile({
        label: file.name,
        contentType: inferredMime,
        bytes: file.size,
        dataUrl,
      });

      const localUrl = URL.createObjectURL(file);
      const track: MusicVideoAudioTrack = {
        id: uploaded?.id || `mv_aud_${Date.now()}`,
        title: file.name.replace(/\.[a-z0-9]+$/i, ''),
        sourceType: 'upload',
        originalUrl: uploaded?.publicUrl || dataUrl,
        playbackUrl: localUrl,
        contentType: inferredMime,
        durationSec: 0,
        bytes: file.size,
        waveformPeaks: createSyntheticPeaks(file.name),
        importedAt: new Date().toISOString(),
      };
      setAudioTrack(track);
      setIsPlaying(false);
      setCurrentTimeSec(0);
      setTrimStartSec(0);
      setTrimEndSec(5);
      showToast(`Imported audio track "${track.title}"`);
    } catch {
      setAudioImportError(
        'Could not read selected audio file. Try MP3, WAV, M4A, OGG, AAC, or FLAC.'
      );
    } finally {
      setAudioImporting(false);
    }
  };

  const handleImportAudioUrl = async () => {
    const clean = audioUrlInput.trim();
    if (!clean) return;
    setAudioImportError(null);
    setAudioImporting(true);
    try {
      const res = await fetch('/api/audio/import-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ url: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.proxyUrl) {
        setAudioImportError(data.error || 'Unable to import audio from that URL.');
        return;
      }

      const track: MusicVideoAudioTrack = {
        id: `mv_url_${Date.now()}`,
        title: String(data.title || 'Imported Music Track').replace(/\.[a-z0-9]+$/i, ''),
        sourceType: 'url',
        originalUrl: data.sourceUrl || clean,
        playbackUrl: data.proxyUrl,
        contentType: data.contentType || 'audio/mpeg',
        durationSec: 0,
        bytes: data.bytes,
        waveformPeaks: createSyntheticPeaks(clean),
        importedAt: new Date().toISOString(),
      };
      setAudioTrack(track);
      setAudioUrlInput('');
      setIsPlaying(false);
      setCurrentTimeSec(0);
      setTrimStartSec(0);
      setTrimEndSec(5);
      showToast(`Imported direct audio "${track.title}"`);
    } catch {
      setAudioImportError('Network error validating audio URL.');
    } finally {
      setAudioImporting(false);
    }
  };

  const applyTimelineTrimToActiveScene = () => {
    updateActiveScene({
      audioSegment: {
        startSec: trimStartSec,
        endSec: trimEndSec,
        durationSec: trimDurationSec,
      },
    });
    showToast(
      `Assigned ${formatTimecode(trimStartSec)} → ${formatTimecode(trimEndSec)} (${trimDurationSec}s) to ${activeScene.title}`
    );
  };

  const snapTrimDuration = (seconds: number) => {
    if (!audioTrack) return;
    const maxDur = audioTrack.durationSec || Math.max(trimStartSec + seconds, 30);
    const nextEnd = Number(Math.min(maxDur, trimStartSec + seconds).toFixed(1));
    const adjustedStart =
      nextEnd - trimStartSec < seconds && maxDur >= seconds
        ? Number(Math.max(0, nextEnd - seconds).toFixed(1))
        : trimStartSec;
    setTrimStartSec(adjustedStart);
    setTrimEndSec(nextEnd);
  };

  // =========================================================================
  // INTELLIGENT MODEL RESOLUTION FOR ACTIVE SCENE
  // =========================================================================
  const sceneMode: MusicVideoSceneMode = activeScene.mode;
  const effectivePipelineStrategy: MusicVideoSceneItem['pipelineStrategy'] =
    sceneMode === 'b_roll'
      ? 'b_roll_video'
      : activeScene.pipelineStrategy === 'animate_then_lipsync'
      ? 'animate_then_lipsync'
      : 'native_lip_sync';

  const primaryVideoModelPool = useMemo(() => {
    if (sceneMode === 'b_roll') return brollVideoModels;
    if (effectivePipelineStrategy === 'native_lip_sync') {
      return nativeLipSyncModels.length > 0 ? nativeLipSyncModels : brollVideoModels;
    }
    return animationVideoModels;
  }, [sceneMode, effectivePipelineStrategy, brollVideoModels, nativeLipSyncModels, animationVideoModels]);

  const activePrimaryModel = useMemo<ModelEntry | undefined>(() => {
    const requestedId =
      sceneMode === 'b_roll'
        ? activeScene.animationModelId
        : effectivePipelineStrategy === 'native_lip_sync'
        ? activeScene.lipSyncModelId || activeScene.animationModelId
        : activeScene.animationModelId;
    return primaryVideoModelPool.find((m) => m.id === requestedId) || primaryVideoModelPool[0];
  }, [
    primaryVideoModelPool,
    sceneMode,
    effectivePipelineStrategy,
    activeScene.animationModelId,
    activeScene.lipSyncModelId,
  ]);

  const activeDedicatedLipSyncModel = useMemo<ModelEntry | undefined>(() => {
    if (sceneMode !== 'lip_sync' || effectivePipelineStrategy !== 'animate_then_lipsync') {
      return undefined;
    }
    return (
      dedicatedLipSyncModels.find((m) => m.id === activeScene.lipSyncModelId) ||
      dedicatedLipSyncModels[0]
    );
  }, [sceneMode, effectivePipelineStrategy, dedicatedLipSyncModels, activeScene.lipSyncModelId]);

  const activeSceneImageModel = useMemo<ModelEntry | undefined>(
    () => sceneImageModels.find((m) => m.id === selectedSceneImageModelId) || sceneImageModels[0],
    [sceneImageModels, selectedSceneImageModelId]
  );

  // Sanitized settings matching ONLY what the currently resolved model supports
  const resolvedPrimarySettings = useMemo(() => {
    const sanitized = sanitizeSettingsForModel(
      activePrimaryModel,
      activeScene.modelSettings,
      activeAspectRatio
    );
    const closestDur = getClosestModelDuration(activePrimaryModel, trimDurationSec);
    if (closestDur && activeScene.modelSettings?.duration === undefined) {
      sanitized.duration = closestDur;
    }
    return sanitized;
  }, [activePrimaryModel, activeScene.modelSettings, activeAspectRatio, trimDurationSec]);

  const resolvedLipSyncStepSettings = useMemo(() => {
    if (!activeDedicatedLipSyncModel) return {};
    const sanitized = sanitizeSettingsForModel(
      activeDedicatedLipSyncModel,
      activeScene.modelSettings,
      String(resolvedPrimarySettings.aspect_ratio || activeAspectRatio)
    );
    const closestDur = getClosestModelDuration(activeDedicatedLipSyncModel, trimDurationSec);
    if (closestDur && activeScene.modelSettings?.duration === undefined) {
      sanitized.duration = closestDur;
    }
    return sanitized;
  }, [
    activeDedicatedLipSyncModel,
    activeScene.modelSettings,
    resolvedPrimarySettings.aspect_ratio,
    activeAspectRatio,
    trimDurationSec,
  ]);

  const estimatedPipelineCredits = useMemo(() => {
    let total = 0;
    if (activePrimaryModel) {
      total += calculateTokenCost(activePrimaryModel.id, resolvedPrimarySettings, []);
    }
    if (activeDedicatedLipSyncModel) {
      total += calculateTokenCost(
        activeDedicatedLipSyncModel.id,
        resolvedLipSyncStepSettings,
        []
      );
    }
    return total;
  }, [
    activePrimaryModel,
    activeDedicatedLipSyncModel,
    resolvedPrimarySettings,
    resolvedLipSyncStepSettings,
    calculateTokenCost,
  ]);

  // Helper to resolve Character + Wardrobe continuity prompt & media slots
  const buildPerformerContinuity = useCallback(
    (charId?: string | null, wardId?: string | null) => {
      const char = characters.find((c) => c.id === charId);
      const ward = wardrobes.find((w) => w.id === (wardId || char?.defaultWardrobeId));
      const parts: string[] = [];
      const refMedia: MediaSlotInput[] = [];

      if (char) {
        parts.push(
          `[PERFORMER LOCK ${char.identityId} — ${char.name}: ${char.ageRange} ${char.genderPresentation}, ${char.skinTone} skin, ${char.bodyType} build, ${ward?.hairstyleOverride || char.hairstyle} hair, ${char.eyeColor} eyes, ${char.distinctiveFeatures || char.facePromptDescriptor}]`
        );
        if (char.faceReferenceUrl) {
          refMedia.push({
            role: 'reference',
            kind: 'image',
            url: char.faceReferenceUrl,
            label: `${char.name} Identity`,
          });
        }
      }
      if (ward) {
        parts.push(
          `[WARDROBE LOCK ${ward.wardrobeCode} — ${ward.name}: ${ward.garments}${ward.shoes ? `, ${ward.shoes}` : ''}${ward.accessories ? `, ${ward.accessories}` : ''}]`
        );
        if (ward.referenceImageUrl) {
          refMedia.push({
            role: 'reference',
            kind: 'image',
            url: ward.referenceImageUrl,
            label: `Outfit: ${ward.name}`,
          });
        }
      }
      return {
        text: parts.join(' '),
        refMedia,
        char,
        ward,
      };
    },
    [characters, wardrobes]
  );

  // =========================================================================
  // CAST & WARDROBE HANDLERS (GENERATE OR UPLOAD + SAVE TO MY ELEMENTS)
  // =========================================================================
  const handleCastPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCastBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploaded = await uploadReferenceFile({
        label: `Performer: ${castName || file.name}`,
        contentType: file.type || 'image/png',
        bytes: file.size,
        dataUrl,
      });
      if (uploaded?.publicUrl) {
        setCastPortraitPreviewUrl(uploaded.publicUrl);
        showToast('Performer photo uploaded and ready to lock');
      }
    } finally {
      setCastBusy(false);
    }
  };

  const handleGenerateCastPortrait = async () => {
    if (!castAppearance.trim()) {
      showToast('Describe the character appearance first');
      return;
    }
    setCastBusy(true);
    try {
      const targetModel =
        sceneImageModels.find((m) => m.id === castPortraitModelId) || sceneImageModels[0];
      const settings = sanitizeSettingsForModel(targetModel, {
        aspect_ratio: '3:4',
        resolution: '2K',
      });
      const res = await submitGeneration({
        surface: 'image',
        modelId: targetModel.id,
        mode: targetModel.modes[0] || 'Create',
        prompt: `Studio character identity portrait for music video performer (${castName || 'Artist'}): ${castAppearance}. Clean studio key light, authentic facial pores, sharp eye focus, neutral framing for character continuity.`,
        settings,
        media: castPortraitPreviewUrl
          ? [{ role: 'reference', kind: 'image', url: castPortraitPreviewUrl, label: 'Face Reference' }]
          : [],
        skipContinuityMerge: true,
      });
      if (res.ok && res.generation) {
        const done =
          res.generation.status === 'completed'
            ? res.generation
            : await pollGenerationUntilDone(res.generation.id);
        const url = done?.outputs?.[0]?.url;
        if (url) {
          setCastPortraitPreviewUrl(url);
          showToast('Generated performer identity plate');
        }
      }
    } finally {
      setCastBusy(false);
    }
  };

  const handleSavePerformer = async () => {
    if (!castName.trim()) {
      showToast('Enter a performer name before saving');
      return;
    }
    setCastBusy(true);
    try {
      const saved = await saveCharacter({
        name: castName.trim(),
        roleTitle: castRole.trim() || 'Lead Vocalist',
        distinctiveFeatures: castAppearance.trim(),
        facePromptDescriptor: castAppearance.trim(),
        faceReferenceUrl: castPortraitPreviewUrl || '',
        facialIdentityLock: true,
      });
      if (saved) {
        updateActiveScene({ characterId: saved.id });
        setCastName('');
      }
    } finally {
      setCastBusy(false);
    }
  };

  const handleWardrobePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setWardrobeBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploaded = await uploadReferenceFile({
        label: `Wardrobe: ${wardrobeName || file.name}`,
        contentType: file.type || 'image/png',
        bytes: file.size,
        dataUrl,
      });
      if (uploaded?.publicUrl) {
        setWardrobePreviewUrl(uploaded.publicUrl);
        showToast('Wardrobe reference uploaded');
      }
    } finally {
      setWardrobeBusy(false);
    }
  };

  const handleGenerateWardrobePlate = async () => {
    if (!wardrobeGarments.trim()) {
      showToast('Describe the clothing, fabrics, and costume details first');
      return;
    }
    setWardrobeBusy(true);
    try {
      const targetModel = sceneImageModels[0];
      const settings = sanitizeSettingsForModel(targetModel, {
        aspect_ratio: '3:4',
        resolution: '2K',
      });
      const res = await submitGeneration({
        surface: 'image',
        modelId: targetModel.id,
        mode: targetModel.modes[0] || 'Create',
        prompt: `Music video costume & wardrobe lookbook plate (${wardrobeCategory}): ${wardrobeGarments}. Footwear: ${wardrobeShoes}. Accessories: ${wardrobeAccessories}. Color palette: ${wardrobePalette}. Full-body fashion lighting, sharp textile and fabric texture.`,
        settings,
        media: [],
        skipContinuityMerge: true,
      });
      if (res.ok && res.generation) {
        const done =
          res.generation.status === 'completed'
            ? res.generation
            : await pollGenerationUntilDone(res.generation.id);
        const url = done?.outputs?.[0]?.url;
        if (url) {
          setWardrobePreviewUrl(url);
          showToast('Generated wardrobe lookbook plate');
        }
      }
    } finally {
      setWardrobeBusy(false);
    }
  };

  const handleSaveWardrobe = async () => {
    if (!wardrobeName.trim()) {
      showToast('Enter an outfit / appearance name first');
      return;
    }
    setWardrobeBusy(true);
    try {
      const saved = await saveWardrobe({
        name: wardrobeName.trim(),
        category: wardrobeCategory,
        garments: wardrobeGarments.trim(),
        shoes: wardrobeShoes.trim(),
        accessories: wardrobeAccessories.trim(),
        colorPalette: wardrobePalette.trim(),
        referenceImageUrl: wardrobePreviewUrl || '',
        sceneContinuityLock: true,
      });
      if (saved) {
        updateActiveScene({ wardrobeId: saved.id });
        setWardrobeName('');
      }
    } finally {
      setWardrobeBusy(false);
    }
  };

  // =========================================================================
  // SCENE FRAME GENERATION & UPLOAD (OPTION A & OPTION B)
  // =========================================================================
  const handleGenerateSceneFrame = async () => {
    if (!activeSceneImageModel) return;
    if (!activeScene.sceneDescription.trim() && !activeScene.environmentAtmosphere.trim()) {
      showToast('Describe the scene or environment first');
      return;
    }
    setGeneratingSceneImage(true);
    setPipelineError(null);
    updateActiveScene({ status: 'generating_ref' });
    try {
      const continuity = buildPerformerContinuity(activeScene.characterId, activeScene.wardrobeId);
      const fullPrompt = [
        continuity.text,
        `MUSIC VIDEO SCENE FRAME: ${activeScene.sceneDescription.trim()}.`,
        activeScene.environmentAtmosphere
          ? `ENVIRONMENT & ATMOSPHERE: ${activeScene.environmentAtmosphere}.`
          : '',
        `CAMERA ANGLE: ${activeScene.cameraFraming}.`,
        `LIGHTING: ${activeScene.lightingMood}.`,
        `VISUAL STYLE: ${activeScene.visualStyle}.`,
      ]
        .filter(Boolean)
        .join(' ');

      const maxRefs =
        activeSceneImageModel.roles.find((r) => r.role === 'reference')?.maxCount || 0;
      const media = maxRefs > 0 ? continuity.refMedia.slice(0, maxRefs) : [];

      const res = await submitGeneration({
        surface: 'image',
        modelId: activeSceneImageModel.id,
        mode: activeSceneImageModel.modes[0] || 'Create',
        prompt: fullPrompt,
        settings: sceneImageSettings,
        media,
        skipContinuityMerge: true,
      });

      if (res.ok && res.generation) {
        const done =
          res.generation.status === 'completed'
            ? res.generation
            : await pollGenerationUntilDone(res.generation.id);
        const url = done?.outputs?.[0]?.url;
        if (url) {
          updateActiveScene({
            sceneReferenceUrl: url,
            sceneReferenceGenId: done?.id,
            sceneReferenceSource: 'generated',
            imageModelId: activeSceneImageModel.id,
            status: 'draft',
          });
          showToast(`Scene reference generated with ${activeSceneImageModel.label}`);
        } else if (done?.error) {
          setPipelineError(done.error);
          updateActiveScene({ status: 'failed', error: done.error });
        }
      } else if (res.error) {
        setPipelineError(res.error);
        updateActiveScene({ status: 'failed', error: res.error });
      }
    } finally {
      setGeneratingSceneImage(false);
    }
  };

  const handleUploadSceneReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingSceneRef(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploaded = await uploadReferenceFile({
        label: `${activeScene.title} Scene Reference`,
        contentType: file.type || 'image/png',
        bytes: file.size,
        dataUrl,
      });
      if (uploaded?.publicUrl) {
        updateActiveScene({
          sceneReferenceUrl: uploaded.publicUrl,
          sceneReferenceSource: 'uploaded',
        });
        showToast('Uploaded custom scene / storyboard frame');
      }
    } finally {
      setUploadingSceneRef(false);
    }
  };

  // =========================================================================
  // INTELLIGENT PIPELINE EXECUTION (LIP SYNC & B-ROLL)
  // =========================================================================
  const prepareTrimmedAudioSubmissionUrl = useCallback(
    async (scene: MusicVideoSceneItem): Promise<string | null> => {
      if (!audioTrack) return null;
      const segStart = scene.audioSegment?.startSec ?? trimStartSec;
      const segEnd = scene.audioSegment?.endSec ?? trimEndSec;

      if (decodedBuffer) {
        try {
          const wavDataUrl = encodeAudioBufferSliceToWavDataUrl(
            decodedBuffer,
            segStart,
            segEnd
          );
          const approxBytes = Math.ceil((wavDataUrl.length * 3) / 4);
          const uploadedSlice = await uploadReferenceFile({
            label: `${audioTrack.title} [${formatTimecode(segStart)}-${formatTimecode(segEnd)}].wav`,
            contentType: 'audio/wav',
            bytes: approxBytes,
            dataUrl: wavDataUrl,
          });
          if (uploadedSlice?.publicUrl) {
            return uploadedSlice.publicUrl;
          }
          return wavDataUrl;
        } catch {
          // Fallback to original track reference if WAV slice fails
        }
      }
      return audioTrack.originalUrl || audioTrack.playbackUrl;
    },
    [audioTrack, trimStartSec, trimEndSec, decodedBuffer, uploadReferenceFile]
  );

  const handleGenerateSceneVideo = async (targetScene?: MusicVideoSceneItem) => {
    const scene = targetScene || activeScene;
    const mode = scene.mode;
    const pipeStrategy: MusicVideoSceneItem['pipelineStrategy'] =
      mode === 'b_roll'
        ? 'b_roll_video'
        : scene.pipelineStrategy === 'animate_then_lipsync'
        ? 'animate_then_lipsync'
        : 'native_lip_sync';

    if (mode === 'lip_sync' && !audioTrack) {
      setPipelineError(
        'Import an audio track first so lip-sync can align to your selected music segment.'
      );
      return;
    }

    const startModel =
      mode === 'b_roll'
        ? brollVideoModels.find((m) => m.id === scene.animationModelId) || brollVideoModels[0]
        : pipeStrategy === 'native_lip_sync'
        ? nativeLipSyncModels.find((m) => m.id === (scene.lipSyncModelId || scene.animationModelId)) ||
          nativeLipSyncModels[0]
        : animationVideoModels.find((m) => m.id === scene.animationModelId) ||
          animationVideoModels[0];

    if (!startModel) {
      setPipelineError('No compatible model available for this generation mode.');
      return;
    }

    const dedicatedSyncModel =
      mode === 'lip_sync' && pipeStrategy === 'animate_then_lipsync'
        ? dedicatedLipSyncModels.find((m) => m.id === scene.lipSyncModelId) ||
          dedicatedLipSyncModels[0]
        : undefined;

    const continuity = buildPerformerContinuity(scene.characterId, scene.wardrobeId);
    const startFrameUrl = scene.sceneReferenceUrl || continuity.char?.faceReferenceUrl;

    if (mode === 'lip_sync' && !startFrameUrl) {
      setPipelineError(
        'Create or upload a Scene Reference (or select a Character with a face portrait) before running Lip Sync.'
      );
      return;
    }

    setPipelineBusy(true);
    setPipelineError(null);
    updateActiveScene({
      status: mode === 'lip_sync' && pipeStrategy === 'native_lip_sync' ? 'syncing_lips' : 'animating',
      error: undefined,
    });

    try {
      const stage1Prompt = [
        continuity.text,
        mode === 'lip_sync'
          ? `MUSIC VIDEO LIP-SYNC PERFORMANCE: ${scene.performanceDirection}. Expression: ${scene.facialExpression}. Gestures: ${scene.gesturesAndBody}.`
          : `MUSIC VIDEO B-ROLL (${BROLL_TYPE_OPTIONS.find((b) => b.id === scene.bRollType)?.label || 'B-Roll'}): ${scene.sceneDescription}.`,
        scene.environmentAtmosphere ? `Environment: ${scene.environmentAtmosphere}.` : '',
        `Camera: ${scene.cameraFraming}, ${scene.cameraMovement}. Lighting: ${scene.lightingMood}. Style: ${scene.visualStyle}.`,
      ]
        .filter(Boolean)
        .join(' ');

      const step1Settings = sanitizeSettingsForModel(
        startModel,
        scene.modelSettings,
        activeAspectRatio
      );

      // ---------------------------------------------------------------------
      // BRANCH 1: B-ROLL GENERATION (No lip-sync model required)
      // ---------------------------------------------------------------------
      if (mode === 'b_roll') {
        setPipelineStageLabel(`Rendering B-Roll on ${startModel.label}...`);
        const media: MediaSlotInput[] = [];
        if (startFrameUrl && startModel.roles.some((r) => r.role === 'start')) {
          media.push({
            role: 'start',
            kind: 'image',
            url: startFrameUrl,
            label: `${scene.title} Start Frame`,
          });
        } else if (startFrameUrl && startModel.roles.some((r) => r.role === 'reference')) {
          media.push({
            role: 'reference',
            kind: 'image',
            url: startFrameUrl,
            label: `${scene.title} Reference`,
          });
        }

        const res = await submitGeneration({
          surface: 'video',
          modelId: startModel.id,
          mode: startModel.modes[0] || 'Create Video',
          prompt: stage1Prompt,
          settings: step1Settings,
          media,
          skipContinuityMerge: true,
        });
        if (!res.ok || !res.generation) {
          throw new Error(res.error || 'Failed to submit B-Roll video generation');
        }
        const done =
          res.generation.status === 'completed'
            ? res.generation
            : await pollGenerationUntilDone(res.generation.id);
        const videoUrl = done?.outputs?.[0]?.url;
        if (!videoUrl) {
          throw new Error(done?.error || 'B-Roll generation did not return a video output.');
        }

        updateActiveScene({
          status: 'completed',
          animationModelId: startModel.id,
          finalVideoUrl: videoUrl,
          finalVideoGenId: done?.id,
          generatedBaseVideoUrl: videoUrl,
          generatedBaseVideoGenId: done?.id,
        });
        showToast(`${scene.title} B-Roll rendered cleanly`);
        return;
      }

      // Prepare exact non-destructive trimmed audio slice
      setPipelineStageLabel('Slicing trimmed audio segment (non-destructive)...');
      const trimmedAudioUrl = await prepareTrimmedAudioSubmissionUrl(scene);
      if (!trimmedAudioUrl) {
        throw new Error('Could not prepare trimmed audio clip.');
      }

      // ---------------------------------------------------------------------
      // BRANCH 2: 1-STEP NATIVE AUDIO LIP SYNC (e.g. OmniHuman 1.5)
      // ---------------------------------------------------------------------
      if (pipeStrategy === 'native_lip_sync') {
        setPipelineStageLabel(`Synthesizing Lip-Sync Performance on ${startModel.label}...`);
        const media: MediaSlotInput[] = [];
        if (startFrameUrl) {
          const imgRole = startModel.roles.find((r) => r.kind === 'image')?.role || 'start';
          media.push({
            role: imgRole,
            kind: 'image',
            url: startFrameUrl,
            label: `${scene.title} Performer Frame`,
          });
        }
        media.push({
          role: 'audio',
          kind: 'audio',
          url: trimmedAudioUrl,
          label: `Trim ${formatTimecode(scene.audioSegment.startSec)}-${formatTimecode(scene.audioSegment.endSec)}`,
        });

        const res = await submitGeneration({
          surface: 'video',
          modelId: startModel.id,
          mode: startModel.modes[0] || 'Audio-Driven Lip Sync',
          prompt: stage1Prompt,
          settings: step1Settings,
          media,
          skipContinuityMerge: true,
        });
        if (!res.ok || !res.generation) {
          throw new Error(res.error || 'Failed to submit native lip-sync generation');
        }
        const done =
          res.generation.status === 'completed'
            ? res.generation
            : await pollGenerationUntilDone(res.generation.id);
        const videoUrl = done?.outputs?.[0]?.url;
        if (!videoUrl) {
          throw new Error(done?.error || 'Lip-sync generation did not return a video output.');
        }

        updateActiveScene({
          status: 'completed',
          lipSyncModelId: startModel.id,
          finalVideoUrl: videoUrl,
          finalVideoGenId: done?.id,
        });
        showToast(`${scene.title} Lip-Sync performance completed`);
        return;
      }

      // ---------------------------------------------------------------------
      // BRANCH 3: 2-STEP CHAINED PIPELINE (Scene Animation -> Dedicated Lip-Sync)
      // ---------------------------------------------------------------------
      if (!dedicatedSyncModel) {
        throw new Error('Select a compatible dedicated lip-sync processor model.');
      }

      let baseVideoUrl = scene.generatedBaseVideoUrl;
      let baseVideoGenId = scene.generatedBaseVideoGenId;
      if (!baseVideoUrl) {
        setPipelineStageLabel(`Step 1/2 · Animating scene motion via ${startModel.label}...`);
        const step1Media: MediaSlotInput[] = [];
        if (startFrameUrl && startModel.roles.some((r) => r.role === 'start')) {
          step1Media.push({
            role: 'start',
            kind: 'image',
            url: startFrameUrl,
            label: `${scene.title} Keyframe`,
          });
        }
        const res1 = await submitGeneration({
          surface: 'video',
          modelId: startModel.id,
          mode: startModel.modes[0] || 'Create Video',
          prompt: stage1Prompt,
          settings: step1Settings,
          media: step1Media,
          skipContinuityMerge: true,
        });
        if (!res1.ok || !res1.generation) {
          throw new Error(res1.error || 'Step 1 scene animation failed');
        }
        const done1 =
          res1.generation.status === 'completed'
            ? res1.generation
            : await pollGenerationUntilDone(res1.generation.id);
        baseVideoUrl = done1?.outputs?.[0]?.url;
        baseVideoGenId = done1?.id;
        if (!baseVideoUrl) {
          throw new Error(done1?.error || 'Step 1 did not return an animated video.');
        }
        updateActiveScene({
          generatedBaseVideoUrl: baseVideoUrl,
          generatedBaseVideoGenId: baseVideoGenId,
          animationModelId: startModel.id,
          status: 'syncing_lips',
        });
      }

      setPipelineStageLabel(
        `Step 2/2 · Synchronizing mouth & audio via ${dedicatedSyncModel.label}...`
      );
      const step2Settings = sanitizeSettingsForModel(
        dedicatedSyncModel,
        scene.modelSettings,
        String(step1Settings.aspect_ratio || activeAspectRatio)
      );
      const res2 = await submitGeneration({
        surface: 'video',
        modelId: dedicatedSyncModel.id,
        mode: dedicatedSyncModel.modes[0] || 'Video + Audio Lip Sync',
        prompt: `${continuity.text} Synchronize performer vocal articulation to music audio track. ${scene.facialExpression}.`,
        settings: step2Settings,
        media: [
          {
            role: 'video',
            kind: 'video',
            url: baseVideoUrl,
            label: `${scene.title} Base Animated Shot`,
          },
          {
            role: 'audio',
            kind: 'audio',
            url: trimmedAudioUrl,
            label: `Trimmed Music Audio`,
          },
        ],
        skipContinuityMerge: true,
      });

      if (!res2.ok || !res2.generation) {
        throw new Error(res2.error || 'Step 2 lip-sync synchronization failed');
      }
      const done2 =
        res2.generation.status === 'completed'
          ? res2.generation
          : await pollGenerationUntilDone(res2.generation.id);
      const finalVideoUrl = done2?.outputs?.[0]?.url;
      if (!finalVideoUrl) {
        throw new Error(done2?.error || 'Step 2 lip-sync model did not return a video output.');
      }

      updateActiveScene({
        status: 'completed',
        animationModelId: startModel.id,
        lipSyncModelId: dedicatedSyncModel.id,
        generatedBaseVideoUrl: baseVideoUrl,
        generatedBaseVideoGenId: baseVideoGenId,
        finalVideoUrl,
        finalVideoGenId: done2?.id,
      });
      showToast(`${scene.title} animated and lip-synced cleanly`);
    } catch (err) {
      const msg = (err as Error).message || 'Music Video generation failed';
      setPipelineError(msg);
      updateActiveScene({ status: 'failed', error: msg });
    } finally {
      setPipelineBusy(false);
      setPipelineStageLabel(null);
    }
  };

  // =========================================================================
  // SCENE SEQUENCE MANAGEMENT
  // =========================================================================
  const handleAddScene = () => {
    const lastScene = scenes[scenes.length - 1];
    const nextStart = lastScene
      ? Number(
          Math.min(
            Math.max(0, (audioTrack?.durationSec || 60) - 5),
            lastScene.audioSegment.endSec
          ).toFixed(1)
        )
      : trimStartSec;
    const newScene = createInitialScene(scenes.length + 1, nextStart, 5, activeAspectRatio);
    if (activeScene.characterId) newScene.characterId = activeScene.characterId;
    if (activeScene.wardrobeId) newScene.wardrobeId = activeScene.wardrobeId;
    setScenes((prev) => [...prev, newScene]);
    setActiveSceneId(newScene.id);
    setActiveSubTab('studio');
    showToast(`Added ${newScene.title} to sequence`);
  };

  const handleMoveScene = (sceneId: string, dir: -1 | 1) => {
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === sceneId);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(idx, 1);
      copy.splice(target, 0, moved);
      return copy.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const handleDuplicateScene = (scene: MusicVideoSceneItem) => {
    const clone: MusicVideoSceneItem = {
      ...scene,
      id: `mv_scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      order: scenes.length + 1,
      title: `${scene.title} Copy`,
      status: scene.finalVideoUrl ? 'completed' : 'draft',
      updatedAt: new Date().toISOString(),
    };
    setScenes((prev) => [...prev, clone]);
    setActiveSceneId(clone.id);
    showToast(`Duplicated "${scene.title}"`);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (scenes.length <= 1) {
      showToast('Keep at least 1 scene in your music video sequence');
      return;
    }
    setScenes((prev) => {
      const filtered = prev
        .filter((s) => s.id !== sceneId)
        .map((s, i) => ({ ...s, order: i + 1 }));
      if (activeSceneId === sceneId && filtered[0]) {
        setActiveSceneId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Master Cut Playable Scenes
  const playableSequenceScenes = useMemo(
    () => scenes.filter((s) => Boolean(s.finalVideoUrl || s.generatedBaseVideoUrl)),
    [scenes]
  );

  const toggleMasterPreview = async () => {
    if (playableSequenceScenes.length === 0) {
      showToast('Generate at least one scene clip to preview the Music Video Master Cut');
      return;
    }
    if (masterPlaying) {
      masterVideoRef.current?.pause();
      masterAudioRef.current?.pause();
      setMasterPlaying(false);
      return;
    }
    const first = playableSequenceScenes[0];
    setMasterSceneIndex(0);
    setMasterPlaying(true);
    if (masterAudioRef.current && audioTrack) {
      masterAudioRef.current.currentTime = first.audioSegment.startSec || 0;
      await masterAudioRef.current.play().catch(() => {});
    }
    if (masterVideoRef.current) {
      masterVideoRef.current.currentTime = 0;
      await masterVideoRef.current.play().catch(() => {});
    }
  };

  const handleMasterClipEnded = () => {
    if (!masterPlaying) return;
    const nextIdx = masterSceneIndex + 1;
    if (nextIdx >= playableSequenceScenes.length) {
      setMasterPlaying(false);
      masterAudioRef.current?.pause();
      return;
    }
    setMasterSceneIndex(nextIdx);
  };

  const handleExportProjectManifest = () => {
    const manifest = {
      projectTitle,
      aspectRatio: activeAspectRatio,
      audioTrack: audioTrack
        ? {
            title: audioTrack.title,
            sourceType: audioTrack.sourceType,
            durationSec: audioTrack.durationSec,
          }
        : null,
      scenes: scenes.map((s) => ({
        order: s.order,
        title: s.title,
        mode: s.mode,
        bRollType: s.mode === 'b_roll' ? s.bRollType : undefined,
        audioSegment: s.audioSegment,
        sceneReferenceUrl: s.sceneReferenceUrl,
        finalVideoUrl: s.finalVideoUrl,
      })),
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-music-video-cut.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported Music Video Sequence Manifest');
  };

  // Completed image uploads & generations for Option B reference picker
  const availableImageLibrary = useMemo(() => {
    const items: Array<{ id: string; label: string; url: string }> = [];
    for (const u of uploads) {
      if (u.kind === 'image' && u.publicUrl) {
        items.push({ id: u.id, label: u.label, url: u.publicUrl });
      }
    }
    for (const g of generations) {
      if (g.surface === 'image' && g.status === 'completed' && g.outputs?.[0]?.url) {
        items.push({
          id: g.id,
          label: g.prompt.slice(0, 32) || g.modelLabel,
          url: g.outputs[0].url,
        });
      }
    }
    return items.slice(0, 12);
  }, [uploads, generations]);

  const activePerformer = characters.find((c) => c.id === activeScene.characterId) || null;
  const activeOutfit =
    wardrobes.find((w) => w.id === (activeScene.wardrobeId || activePerformer?.defaultWardrobeId)) ||
    null;

  // Dynamic Settings Renderer honoring exact model.settings schema
  const renderDynamicModelSettings = (
    model: ModelEntry | undefined,
    currentSettings: Record<string, string | number | boolean>,
    onChangeSetting: (key: string, val: string | number | boolean) => void
  ) => {
    if (!model || model.settings.length === 0) {
      return (
        <div className="text-[11px] text-zinc-500">
          This model configures parameters automatically.
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {model.settings.map((def) => {
          const val = currentSettings[def.key] ?? def.defaultValue;
          if (def.type === 'enum') {
            const selectedOpt = def.options.find((o) => o.value === String(val));
            const settingVisual = getSettingOptionVisual(
              def.key,
              selectedOpt?.label || String(val)
            );
            return (
              <div key={def.key} className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  {def.label}
                </label>
                <div className="flex items-center gap-2">
                  {settingVisual && <GearVisual spec={settingVisual} size="sm" />}
                  <select
                    value={String(val)}
                    onChange={(e) => onChangeSetting(def.key, e.target.value)}
                    className="flex-1 min-w-0 h-9 px-2.5 rounded-xl bg-[#0B0C10] border border-white/10 text-xs text-white focus:outline-none focus:border-[#46ecd5]"
                  >
                    {def.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          }
          if (def.type === 'boolean') {
            return (
              <div
                key={def.key}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0B0C10] border border-white/10"
              >
                <span className="text-xs text-zinc-200">{def.label}</span>
                <Switch
                  checked={Boolean(val)}
                  onCheckedChange={(checked) => onChangeSetting(def.key, checked)}
                />
              </div>
            );
          }
          if (def.type === 'range') {
            return (
              <div key={def.key} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span className="uppercase">{def.label}</span>
                  <span className="text-[#46ecd5] font-mono-tabular">{String(val)}</span>
                </div>
                <input
                  type="range"
                  min={def.min}
                  max={def.max}
                  step={def.step}
                  value={Number(val)}
                  onChange={(e) => onChangeSetting(def.key, Number(e.target.value))}
                  className="w-full accent-[#46ecd5]"
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const trackTotalDuration = audioTrack?.durationSec || 30;
  const trimStartPct = Math.max(0, Math.min(100, (trimStartSec / trackTotalDuration) * 100));
  const trimEndPct = Math.max(
    trimStartPct + 1,
    Math.min(100, (trimEndSec / trackTotalDuration) * 100)
  );
  const playheadPct = Math.max(0, Math.min(100, (currentTimeSec / trackTotalDuration) * 100));
  const waveformBars =
    audioTrack && audioTrack.waveformPeaks && audioTrack.waveformPeaks.length > 0
      ? audioTrack.waveformPeaks
      : audioTrack
      ? createSyntheticPeaks(audioTrack.title)
      : [];

  return (
    <div className="flex-1 w-full max-w-[1540px] mx-auto px-3 sm:px-6 py-4 space-y-5">
      {/* Hidden native audio element for full & segment preview */}
      <audio
        ref={audioRef}
        src={audioTrack?.playbackUrl || undefined}
        onTimeUpdate={handleAudioTimeUpdate}
        onLoadedMetadata={handleAudioLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          setPlayingSelectionOnly(false);
        }}
        className="hidden"
      />

      {/* ===================================================================
          TOP STUDIO WORKSPACE BAR
         =================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onBackToDirector}
            className="shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Director</span>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#46ecd5]">
              <Music className="w-3.5 h-3.5" />
              <span>Cinema Studio · Music Video Production</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => onProjectTitleChange(e.target.value)}
                className="font-display text-2xl font-bold uppercase tracking-wide bg-transparent text-white focus:outline-none border-b border-transparent focus:border-[#46ecd5] max-w-xs sm:max-w-md truncate"
              />
              <span className="text-xs font-mono-tabular text-zinc-400">
                {scenes.length} {scenes.length === 1 ? 'Scene' : 'Scenes'} · {activeAspectRatio}
              </span>
            </div>
          </div>
        </div>

        <AnimatedPillTabs
          layoutId="music-video-subtabs"
          activeId={activeSubTab}
          items={[
            { id: 'studio', label: 'Scene & Video Studio' },
            { id: 'cast', label: `Cast & Wardrobe (${characters.length})` },
            { id: 'sequence', label: `Sequence & Master Cut (${scenes.length})` },
          ]}
          onChange={(id) => setActiveSubTab(id)}
        />
      </div>

      {/* ===================================================================
          PERSISTENT MASTER AUDIO DECK & INTERACTIVE WAVEFORM TRIM TIMELINE
         =================================================================== */}
      <SpotlightCard className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#46ecd5]/15 border border-[#46ecd5]/40 flex items-center justify-center shrink-0 text-[#46ecd5]">
              <Music className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">
                {audioTrack ? audioTrack.title : 'Master Music Track'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {audioTrack
                  ? `${audioTrack.sourceType === 'url' ? 'Direct URL' : 'Uploaded Master'} · Non-destructive trim drives lip-sync & timing`
                  : 'Upload an audio file or import from a direct audio URL (.mp3, .wav, .m4a, .ogg, .flac)'}
              </p>
            </div>
          </div>

          {/* Import Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={audioUploadInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
              onChange={handleAudioFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="accent"
              size="sm"
              disabled={audioImporting}
              onClick={() => audioUploadInputRef.current?.click()}
            >
              {audioImporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{audioTrack ? 'Replace Audio File' : 'Upload Audio'}</span>
            </Button>

            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Link2 className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={audioUrlInput}
                  onChange={(e) => setAudioUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleImportAudioUrl();
                  }}
                  placeholder="https://example.com/track.mp3"
                  className="h-8 pl-8 w-52 sm:w-64 text-xs"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={audioImporting || !audioUrlInput.trim()}
                onClick={handleImportAudioUrl}
              >
                Import URL
              </Button>
            </div>
          </div>
        </div>

        {audioImportError && (
          <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {audioImportError}
          </div>
        )}

        {audioTrack && (
          <div className="space-y-3 pt-1">
            {/* Transport Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="default" size="sm" onClick={togglePlayFull}>
                  {isPlaying && !playingSelectionOnly ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>{isPlaying && !playingSelectionOnly ? 'Pause' : 'Play Track'}</span>
                </Button>

                <Button
                  type="button"
                  variant={playingSelectionOnly ? 'accent' : 'secondary'}
                  size="sm"
                  onClick={togglePlaySelection}
                >
                  <Scissors className="w-3.5 h-3.5 text-[#46ecd5]" />
                  <span>{playingSelectionOnly ? 'Stop Segment' : 'Preview Selected Trim'}</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setLoopSelection((v) => !v)}
                  className={`h-8 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    loopSelection
                      ? 'bg-[#46ecd5]/15 border-[#46ecd5]/40 text-[#46ecd5]'
                      : 'bg-[#111319] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Loop</span>
                </button>

                <div className="px-3 py-1 rounded-xl bg-[#0B0C10] border border-white/10 text-xs font-mono-tabular text-white">
                  {formatTimecode(currentTimeSec)}{' '}
                  <span className="text-zinc-500">/ {formatTimecode(trackTotalDuration)}</span>
                </div>
              </div>

              {/* Volume & Selection Readout */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#0B0C10] border border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsMuted((m) => !m)}
                    className="text-zinc-400 hover:text-white"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || audioVolume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-[#46ecd5]" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={isMuted ? 0 : audioVolume}
                    onChange={(e) => {
                      setIsMuted(false);
                      setAudioVolume(Number(e.target.value));
                    }}
                    className="w-20 accent-[#46ecd5]"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-mono-tabular text-zinc-300">
                  <span>
                    Start{' '}
                    <strong ref={startBadgeRef} className="text-[#46ecd5]">
                      {formatTimecode(trimStartSec)}
                    </strong>
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span>
                    End{' '}
                    <strong ref={endBadgeRef} className="text-[#46ecd5]">
                      {formatTimecode(trimEndSec)}
                    </strong>
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span>
                    Clip{' '}
                    <strong ref={durBadgeRef} className="text-white">
                      {trimDurationSec.toFixed(1)}s
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Waveform Timeline with Silky-Smooth Draggable Handles */}
            <div className="space-y-2">
              <div
                ref={timelineTrackRef}
                onClick={(e) => {
                  if (draggingHandle || justDraggedRef.current) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  seekAudioTo(ratio * trackTotalDuration);
                }}
                className="relative h-24 rounded-2xl bg-[#08090C] border border-white/10 overflow-hidden select-none touch-none cursor-pointer"
              >
                {/* Base Unselected Waveform Layer (memoized) */}
                <div className="absolute inset-0 pointer-events-none">
                  <WaveformBarsLayer peaks={waveformBars} barClassName="bg-zinc-600/55" />
                </div>

                {/* GPU Clipped Active Selected Waveform Layer (no per-bar React re-renders!) */}
                <div
                  ref={selectedWaveLayerRef}
                  style={{
                    clipPath: `inset(0 ${Math.max(0, 100 - trimEndPct)}% 0 ${Math.max(0, trimStartPct)}%)`,
                    willChange: 'clip-path',
                  }}
                  className="absolute inset-0 pointer-events-none"
                >
                  <WaveformBarsLayer peaks={waveformBars} barClassName="bg-[#46ecd5]" />
                </div>

                {/* Unselected Shading Masks */}
                <div
                  ref={leftShadeRef}
                  style={{ width: `${trimStartPct}%`, willChange: 'width' }}
                  className="absolute inset-y-0 left-0 bg-black/55 pointer-events-none"
                />
                <div
                  ref={rightShadeRef}
                  style={{ left: `${trimEndPct}%`, right: 0, willChange: 'left' }}
                  className="absolute inset-y-0 bg-black/55 pointer-events-none"
                />

                {/* Draggable Selected Region Overlay */}
                <div
                  ref={selectionWindowRef}
                  style={{
                    left: `${trimStartPct}%`,
                    width: `${Math.max(0.8, trimEndPct - trimStartPct)}%`,
                    willChange: 'left, width',
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    } catch {
                      // fallback silently if synthetic pointer
                    }
                    dragAnchorRef.current = {
                      pointerX: e.clientX,
                      initStart: trimStartRef.current,
                      initEnd: trimEndRef.current,
                    };
                    setDraggingHandle('window');
                  }}
                  title="Drag selected segment smoothly across track"
                  className="absolute inset-y-0 border-y-2 border-[#46ecd5]/85 bg-[#46ecd5]/10 cursor-grab active:cursor-grabbing touch-none"
                />

                {/* Draggable Left Start Handle */}
                <div
                  ref={startHandleRef}
                  style={{ left: `calc(${trimStartPct}% - 8px)`, willChange: 'left' }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    } catch {
                      // fallback silently
                    }
                    setDraggingHandle('start');
                  }}
                  onClick={(e) => e.stopPropagation()}
                  title="Drag trim start handle"
                  className={`group absolute inset-y-0 w-4 cursor-ew-resize flex items-center justify-center z-10 touch-none ${
                    draggingHandle === 'start' ? 'scale-x-110' : ''
                  }`}
                >
                  <div className="w-2.5 h-full bg-[#46ecd5] group-hover:bg-teal-300 shadow-[0_0_12px_rgba(70,236,213,0.6)] flex items-center justify-center rounded-l-sm">
                    <div className="w-0.5 h-8 bg-[#090A0C] rounded-full" />
                  </div>
                </div>

                {/* Draggable Right End Handle */}
                <div
                  ref={endHandleRef}
                  style={{ left: `calc(${trimEndPct}% - 8px)`, willChange: 'left' }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    } catch {
                      // fallback silently
                    }
                    setDraggingHandle('end');
                  }}
                  onClick={(e) => e.stopPropagation()}
                  title="Drag trim end handle"
                  className={`group absolute inset-y-0 w-4 cursor-ew-resize flex items-center justify-center z-10 touch-none ${
                    draggingHandle === 'end' ? 'scale-x-110' : ''
                  }`}
                >
                  <div className="w-2.5 h-full bg-[#46ecd5] group-hover:bg-teal-300 shadow-[0_0_12px_rgba(70,236,213,0.6)] flex items-center justify-center rounded-r-sm">
                    <div className="w-0.5 h-8 bg-[#090A0C] rounded-full" />
                  </div>
                </div>

                {/* Playhead Line */}
                <div
                  style={{ left: `${playheadPct}%` }}
                  className="absolute inset-y-0 w-[2px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none z-20"
                />
              </div>

              {/* Fine Nudge & Quick Duration Snap Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono uppercase text-zinc-400">
                    Snap Selection Length:
                  </span>
                  {[5, 8, 10, 15].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => snapTrimDuration(sec)}
                      className={`px-2.5 py-1 rounded-lg border font-mono-tabular text-[11px] transition-colors ${
                        Math.abs(trimDurationSec - sec) < 0.25
                          ? 'bg-[#46ecd5]/20 border-[#46ecd5]/50 text-[#46ecd5] font-bold'
                          : 'bg-[#101218] border-white/10 text-zinc-300 hover:border-white/25'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      type="button"
                      onClick={() =>
                        setTrimStartSec((s) => Number(Math.max(0, s - 0.5).toFixed(1)))
                      }
                      className="px-2 py-1 rounded-lg bg-[#101218] border border-white/10 text-[11px] font-mono-tabular text-zinc-300 hover:text-white"
                    >
                      Start -0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTrimStartSec((s) =>
                          Number(Math.min(trimEndSec - 1, s + 0.5).toFixed(1))
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-[#101218] border border-white/10 text-[11px] font-mono-tabular text-zinc-300 hover:text-white"
                    >
                      Start +0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTrimEndSec((eSec) =>
                          Number(Math.max(trimStartSec + 1, eSec - 0.5).toFixed(1))
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-[#101218] border border-white/10 text-[11px] font-mono-tabular text-zinc-300 hover:text-white"
                    >
                      End -0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTrimEndSec((eSec) =>
                          Number(Math.min(trackTotalDuration, eSec + 0.5).toFixed(1))
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-[#101218] border border-white/10 text-[11px] font-mono-tabular text-zinc-300 hover:text-white"
                    >
                      End +0.5s
                    </button>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  onClick={applyTimelineTrimToActiveScene}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Use Segment for {activeScene.title}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </SpotlightCard>

      {/* ===================================================================
          SUB-TAB 1: CAST & WARDROBE (CHARACTERS & APPEARANCE CREATION)
         =================================================================== */}
      {activeSubTab === 'cast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Create Performer Identity */}
          <SpotlightCard className="lg:col-span-6 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-bold uppercase text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#46ecd5]" />
                  <span>Create Performer Identity</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Generate AI character faces or upload photos, then lock into My Elements for scene continuity.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-zinc-400">
                  Artist / Character Name
                </label>
                <Input
                  value={castName}
                  onChange={(e) => setCastName(e.target.value)}
                  placeholder="e.g. Zuri Vance"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-zinc-400">
                  Performance Role
                </label>
                <Input
                  value={castRole}
                  onChange={(e) => setCastRole(e.target.value)}
                  placeholder="e.g. Lead Vocalist / Dancer"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-zinc-400">
                Facial Structure, Skin, Hair & Identity Features
              </label>
              <Textarea
                rows={3}
                value={castAppearance}
                onChange={(e) => setCastAppearance(e.target.value)}
                placeholder="Describe face geometry, age, skin tone, hair style, signature makeup or facial markings..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={castPortraitModelId}
                onChange={(e) => setCastPortraitModelId(e.target.value)}
                className="h-9 px-3 rounded-xl bg-[#0B0C10] border border-white/10 text-xs text-white focus:outline-none focus:border-[#46ecd5]"
              >
                {sceneImageModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.provider})
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="accent"
                size="sm"
                disabled={castBusy}
                onClick={handleGenerateCastPortrait}
              >
                {castBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                <span>Generate Face Plate</span>
              </Button>

              <input
                ref={castPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleCastPhotoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={castBusy}
                onClick={() => castPhotoInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </Button>
            </div>

            {castPortraitPreviewUrl && (
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#0B0C10] border border-white/10">
                <img
                  src={castPortraitPreviewUrl}
                  alt="Performer Identity Preview"
                  className="w-20 h-24 rounded-xl object-cover border border-white/15 shrink-0"
                />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-white">Identity Reference Ready</div>
                  <p className="text-zinc-400">
                    Locked facial features will travel across scene frames, animations, and lip-sync runs.
                  </p>
                </div>
              </div>
            )}

            <ShimmerButton
              type="button"
              disabled={castBusy || !castName.trim()}
              onClick={handleSavePerformer}
              className="w-full justify-center"
            >
              <span>Save Performer to My Elements</span>
            </ShimmerButton>
          </SpotlightCard>

          {/* Create Appearance / Wardrobe Outfit */}
          <SpotlightCard className="lg:col-span-6 p-5 space-y-4">
            <div>
              <h3 className="font-display text-xl font-bold uppercase text-white flex items-center gap-2">
                <Shirt className="w-4 h-4 text-[#46ecd5]" />
                <span>Design Wardrobe & Character Appearances</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Create multiple looks, stage costumes, and outfits that persist across scenes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-zinc-400">
                  Outfit / Look Name
                </label>
                <Input
                  value={wardrobeName}
                  onChange={(e) => setWardrobeName(e.target.value)}
                  placeholder="e.g. Verse 2 Chrome Stage Look"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-zinc-400">
                  Style Category
                </label>
                <select
                  value={wardrobeCategory}
                  onChange={(e) => setWardrobeCategory(e.target.value as WardrobeCategory)}
                  className="w-full h-9 px-3 rounded-xl bg-[#0B0C10] border border-white/10 text-xs text-white focus:outline-none focus:border-[#46ecd5]"
                >
                  {WARDROBE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-zinc-400">
                Garments & Costume Details
              </label>
              <Textarea
                rows={2}
                value={wardrobeGarments}
                onChange={(e) => setWardrobeGarments(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-zinc-400">Footwear</label>
                <Input value={wardrobeShoes} onChange={(e) => setWardrobeShoes(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-zinc-400">Accessories</label>
                <Input
                  value={wardrobeAccessories}
                  onChange={(e) => setWardrobeAccessories(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-zinc-400">
                  Color Palette
                </label>
                <Input
                  value={wardrobePalette}
                  onChange={(e) => setWardrobePalette(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="accent"
                size="sm"
                disabled={wardrobeBusy}
                onClick={handleGenerateWardrobePlate}
              >
                {wardrobeBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Generate Lookbook Plate</span>
              </Button>
              <input
                ref={wardrobePhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleWardrobePhotoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={wardrobeBusy}
                onClick={() => wardrobePhotoInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Outfit Photo</span>
              </Button>
            </div>

            {wardrobePreviewUrl && (
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#0B0C10] border border-white/10">
                <img
                  src={wardrobePreviewUrl}
                  alt="Wardrobe Preview"
                  className="w-16 h-20 rounded-xl object-cover border border-white/15 shrink-0"
                />
                <div className="text-xs text-zinc-300">
                  Costume reference ready to assign across music-video scenes.
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="default"
              disabled={wardrobeBusy || !wardrobeName.trim()}
              onClick={handleSaveWardrobe}
              className="w-full"
            >
              <span>Save Wardrobe to My Elements</span>
            </Button>
          </SpotlightCard>

          {/* Saved My Elements Performers & Wardrobes */}
          <SpotlightCard className="lg:col-span-6 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#46ecd5]" />
                <span>My Elements Performers ({characters.length})</span>
              </h4>
            </div>
            <ScrollArea className="h-64 pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {characters.map((char: CharacterProfile) => {
                  const selected = activeScene.characterId === char.id;
                  return (
                    <div
                      key={char.id}
                      onClick={() => {
                        updateActiveScene({ characterId: char.id });
                        showToast(`Assigned @${char.name} to ${activeScene.title}`);
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                        selected
                          ? 'bg-[#46ecd5]/15 border-[#46ecd5]/60'
                          : 'bg-[#0B0C10] border-white/10 hover:border-white/25'
                      }`}
                    >
                      {char.faceReferenceUrl ? (
                        <img
                          src={char.faceReferenceUrl}
                          alt={char.name}
                          className="w-12 h-12 rounded-xl object-cover border border-white/15 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 text-xs font-bold text-[#46ecd5]">
                          {char.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">@{char.name}</div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {char.roleTitle} · {char.identityId}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </SpotlightCard>

          <SpotlightCard className="lg:col-span-6 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Shirt className="w-4 h-4 text-[#46ecd5]" />
                <span>Saved Costumes & Outfits ({wardrobes.length})</span>
              </h4>
            </div>
            <ScrollArea className="h-64 pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {wardrobes.map((ward: WardrobeItem) => {
                  const selected = activeScene.wardrobeId === ward.id;
                  return (
                    <div
                      key={ward.id}
                      onClick={() => {
                        updateActiveScene({ wardrobeId: ward.id });
                        showToast(`Assigned outfit "${ward.name}" to ${activeScene.title}`);
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                        selected
                          ? 'bg-[#46ecd5]/15 border-[#46ecd5]/60'
                          : 'bg-[#0B0C10] border-white/10 hover:border-white/25'
                      }`}
                    >
                      {ward.referenceImageUrl ? (
                        <img
                          src={ward.referenceImageUrl}
                          alt={ward.name}
                          className="w-12 h-12 rounded-xl object-cover border border-white/15 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                          <Shirt className="w-4 h-4 text-[#46ecd5]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{ward.name}</div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {ward.category} · {ward.wardrobeCode}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </SpotlightCard>
        </div>
      )}

      {/* ===================================================================
          SUB-TAB 2: SCENE & VIDEO STUDIO (MAIN CREATIVE WORKFLOW)
         =================================================================== */}
      {activeSubTab === 'studio' && (
        <div className="space-y-4">
          {/* Scene Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-[#101218] border border-white/[0.07]">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {scenes.map((sc) => {
                const isSelected = sc.id === activeScene.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setActiveSceneId(sc.id);
                      if (sc.audioSegment) {
                        setTrimStartSec(sc.audioSegment.startSec);
                        setTrimEndSec(sc.audioSegment.endSec);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap border transition-all ${
                      isSelected
                        ? 'bg-[#46ecd5]/15 border-[#46ecd5]/50 text-[#46ecd5] font-bold'
                        : 'bg-[#161922] border-white/[0.06] text-zinc-300 hover:text-white'
                    }`}
                  >
                    <span className="font-mono-tabular">
                      {String(sc.order).padStart(2, '0')}
                    </span>
                    <span>{sc.title}</span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {sc.mode === 'lip_sync' ? 'Lip Sync' : 'B-Roll'}
                    </span>
                    {sc.finalVideoUrl && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="secondary" size="sm" onClick={handleAddScene}>
                <Plus className="w-3.5 h-3.5 text-[#46ecd5]" />
                <span>Add Scene</span>
              </Button>
            </div>
          </div>

          {/* 12-Column Split: 7-Col Composer | 5-Col Visual Monitor & Model Pipeline */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* LEFT 7 COLS: GENERATION MODE, CAST, SCENE REFERENCE & DIRECTION */}
            <div className="xl:col-span-7 space-y-4">
              {/* Step 1: Generation Mode & Scene Header */}
              <SpotlightCard className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                    <Input
                      value={activeScene.title}
                      onChange={(e) => updateActiveScene({ title: e.target.value })}
                      className="h-9 max-w-[220px] font-bold text-sm"
                    />
                    <span className="text-xs font-mono-tabular text-zinc-400">
                      {formatTimecode(activeScene.audioSegment.startSec)} →{' '}
                      {formatTimecode(activeScene.audioSegment.endSec)} (
                      {activeScene.audioSegment.durationSec.toFixed(1)}s)
                    </span>
                  </div>

                  {/* MODE A (LIP SYNC) vs MODE B (B-ROLL) */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0B0C10] border border-white/10">
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveScene({
                          mode: 'lip_sync',
                          pipelineStrategy: 'native_lip_sync',
                          modelSettings: {},
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        sceneMode === 'lip_sync'
                          ? 'bg-[#46ecd5] text-[#090A0C]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Lip Sync Performance</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveScene({
                          mode: 'b_roll',
                          pipelineStrategy: 'b_roll_video',
                          modelSettings: {},
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        sceneMode === 'b_roll'
                          ? 'bg-[#46ecd5] text-[#090A0C]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>B-Roll Generation</span>
                    </button>
                  </div>
                </div>

                {/* Performer & Outfit Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono uppercase text-zinc-400">
                        Performer (My Elements)
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('cast')}
                        className="text-[11px] text-[#46ecd5] hover:underline"
                      >
                        Manage Cast →
                      </button>
                    </div>
                    <select
                      value={activeScene.characterId || ''}
                      onChange={(e) =>
                        updateActiveScene({
                          characterId: e.target.value || null,
                        })
                      }
                      className="w-full h-9 px-3 rounded-xl bg-[#0B0C10] border border-white/10 text-xs text-white focus:outline-none focus:border-[#46ecd5]"
                    >
                      <option value="">
                        {sceneMode === 'b_roll'
                          ? 'No Performer (Pure Environment / Cutaway)'
                          : 'Select Performer...'}
                      </option>
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                          @{c.name} — {c.roleTitle} ({c.identityId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase text-zinc-400">
                      Costume / Wardrobe Appearance
                    </label>
                    <select
                      value={activeScene.wardrobeId || ''}
                      onChange={(e) =>
                        updateActiveScene({
                          wardrobeId: e.target.value || null,
                        })
                      }
                      className="w-full h-9 px-3 rounded-xl bg-[#0B0C10] border border-white/10 text-xs text-white focus:outline-none focus:border-[#46ecd5]"
                    >
                      <option value="">Default Character Appearance</option>
                      {wardrobes.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </SpotlightCard>

              {/* Step 2: Scene Creation & Visual References (Option A vs Option B) */}
              <SpotlightCard className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#46ecd5]" />
                      <span>Scene Frame & Visual Reference</span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Generate a continuity scene keyframe or upload pre-designed art / storyboard frames.
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0B0C10] border border-white/10">
                    <button
                      type="button"
                      onClick={() => setSceneRefOption('create')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        sceneRefOption === 'create'
                          ? 'bg-[#46ecd5]/20 text-[#46ecd5]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Option A · Create Scene
                    </button>
                    <button
                      type="button"
                      onClick={() => setSceneRefOption('upload')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        sceneRefOption === 'upload'
                          ? 'bg-[#46ecd5]/20 text-[#46ecd5]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Option B · Upload / Library
                    </button>
                  </div>
                </div>

                {sceneRefOption === 'create' ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase text-zinc-400">
                        Scene Visual Description
                      </label>
                      <Textarea
                        rows={2}
                        value={activeScene.sceneDescription}
                        onChange={(e) => updateActiveScene({ sceneDescription: e.target.value })}
                        placeholder="Describe action, blocking, pose, and visual composition..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase text-zinc-400">
                        Environment, Background & Atmosphere
                      </label>
                      <Input
                        value={activeScene.environmentAtmosphere}
                        onChange={(e) =>
                          updateActiveScene({ environmentAtmosphere: e.target.value })
                        }
                        placeholder="Stage architecture, weather, haze, practical lights..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Camera Framing Visual Selector */}
                      <div className="p-2.5 rounded-xl bg-[#0B0C10] border border-white/10 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[10px] font-mono uppercase text-zinc-400">
                            Camera Framing & Angle
                          </label>
                          <div className="flex items-center gap-1.5">
                            <GearVisual
                              spec={getCameraAngleVisual(activeScene.cameraFraming)}
                              size="sm"
                            />
                          </div>
                        </div>
                        <select
                          value={activeScene.cameraFraming}
                          onChange={(e) => updateActiveScene({ cameraFraming: e.target.value })}
                          className="w-full h-9 px-2 rounded-lg bg-[#141720] border border-white/10 text-xs text-white"
                        >
                          {CAMERA_ANGLES.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                          {CAMERA_ANGLES.map((a) => {
                            const selected = activeScene.cameraFraming === a;
                            return (
                              <button
                                key={a}
                                type="button"
                                onClick={() => updateActiveScene({ cameraFraming: a })}
                                title={a}
                                className={`shrink-0 px-2 py-1 rounded-lg border flex items-center gap-1.5 text-[10px] transition-all ${
                                  selected
                                    ? 'bg-[#46ecd5]/15 border-[#46ecd5]/50 text-[#46ecd5] font-bold'
                                    : 'bg-[#12141B] border-white/5 text-zinc-400 hover:text-white'
                                }`}
                              >
                                <GearVisual spec={getCameraAngleVisual(a)} size="xs" />
                                <span className="truncate max-w-[92px]">{a.split(' (')[0]}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Camera Movement Visual Selector */}
                      <div className="p-2.5 rounded-xl bg-[#0B0C10] border border-white/10 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[10px] font-mono uppercase text-zinc-400">
                            Camera Movement Rig
                          </label>
                          <GearVisual
                            spec={getCameraMovementVisual(activeScene.cameraMovement)}
                            size="sm"
                          />
                        </div>
                        <select
                          value={activeScene.cameraMovement}
                          onChange={(e) => updateActiveScene({ cameraMovement: e.target.value })}
                          className="w-full h-9 px-2 rounded-lg bg-[#141720] border border-white/10 text-xs text-white"
                        >
                          {CAMERA_MOVEMENTS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                          {CAMERA_MOVEMENTS.map((m) => {
                            const selected = activeScene.cameraMovement === m;
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => updateActiveScene({ cameraMovement: m })}
                                title={m}
                                className={`shrink-0 px-2 py-1 rounded-lg border flex items-center gap-1.5 text-[10px] transition-all ${
                                  selected
                                    ? 'bg-[#46ecd5]/15 border-[#46ecd5]/50 text-[#46ecd5] font-bold'
                                    : 'bg-[#12141B] border-white/5 text-zinc-400 hover:text-white'
                                }`}
                              >
                                <GearVisual spec={getCameraMovementVisual(m)} size="xs" />
                                <span className="truncate max-w-[92px]">{m}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Lighting Color Mood Visual Selector */}
                      <div className="p-2.5 rounded-xl bg-[#0B0C10] border border-white/10 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[10px] font-mono uppercase text-zinc-400">
                            Lighting & Color Grade
                          </label>
                          <GearVisual
                            spec={getColorGradeVisual(activeScene.lightingMood)}
                            size="sm"
                          />
                        </div>
                        <select
                          value={activeScene.lightingMood}
                          onChange={(e) => updateActiveScene({ lightingMood: e.target.value })}
                          className="w-full h-9 px-2 rounded-lg bg-[#141720] border border-white/10 text-xs text-white"
                        >
                          {LIGHTING_MOODS.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                          {LIGHTING_MOODS.map((l) => {
                            const selected = activeScene.lightingMood === l;
                            return (
                              <button
                                key={l}
                                type="button"
                                onClick={() => updateActiveScene({ lightingMood: l })}
                                title={l}
                                className={`shrink-0 px-2 py-1 rounded-lg border flex items-center gap-1.5 text-[10px] transition-all ${
                                  selected
                                    ? 'bg-[#46ecd5]/15 border-[#46ecd5]/50 text-[#46ecd5] font-bold'
                                    : 'bg-[#12141B] border-white/5 text-zinc-400 hover:text-white'
                                }`}
                              >
                                <GearVisual spec={getColorGradeVisual(l)} size="xs" />
                                <span className="truncate max-w-[96px]">{l}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Visual Film & Color Style Selector */}
                      <div className="p-2.5 rounded-xl bg-[#0B0C10] border border-white/10 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[10px] font-mono uppercase text-zinc-400">
                            Film Stock & Visual Look
                          </label>
                          <GearVisual
                            spec={getColorGradeVisual(activeScene.visualStyle)}
                            size="sm"
                          />
                        </div>
                        <select
                          value={activeScene.visualStyle}
                          onChange={(e) => updateActiveScene({ visualStyle: e.target.value })}
                          className="w-full h-9 px-2 rounded-lg bg-[#141720] border border-white/10 text-xs text-white"
                        >
                          {VISUAL_STYLES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                          {VISUAL_STYLES.map((st) => {
                            const selected = activeScene.visualStyle === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => updateActiveScene({ visualStyle: st })}
                                title={st}
                                className={`shrink-0 px-2 py-1 rounded-lg border flex items-center gap-1.5 text-[10px] transition-all ${
                                  selected
                                    ? 'bg-[#46ecd5]/15 border-[#46ecd5]/50 text-[#46ecd5] font-bold'
                                    : 'bg-[#12141B] border-white/5 text-zinc-400 hover:text-white'
                                }`}
                              >
                                <GearVisual spec={getColorGradeVisual(st)} size="xs" />
                                <span className="truncate max-w-[96px]">{st}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono uppercase text-zinc-400">
                          Image Engine:
                        </span>
                        <select
                          value={activeSceneImageModel?.id || ''}
                          onChange={(e) => {
                            const nextModel = sceneImageModels.find((m) => m.id === e.target.value);
                            setSelectedSceneImageModelId(e.target.value);
                            setSceneImageSettings(
                              sanitizeSettingsForModel(
                                nextModel,
                                sceneImageSettings,
                                activeAspectRatio
                              )
                            );
                          }}
                          className="h-9 px-3 rounded-xl bg-[#0B0C10] border border-white/10 text-xs text-white"
                        >
                          {sceneImageModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label} ({m.provider})
                            </option>
                          ))}
                        </select>
                      </div>

                      <Button
                        type="button"
                        variant="accent"
                        size="sm"
                        disabled={generatingSceneImage}
                        onClick={handleGenerateSceneFrame}
                      >
                        {generatingSceneImage ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="w-3.5 h-3.5" />
                        )}
                        <span>
                          Generate Scene Frame (
                          {activeSceneImageModel
                            ? calculateTokenCost(
                                activeSceneImageModel.id,
                                sceneImageSettings,
                                []
                              )
                            : 0}{' '}
                          TK)
                        </span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      ref={sceneRefUploadInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadSceneReference}
                      className="hidden"
                    />
                    <div
                      onClick={() => sceneRefUploadInputRef.current?.click()}
                      className="p-5 rounded-2xl border border-dashed border-[#46ecd5]/40 bg-[#0B0C10] hover:bg-[#46ecd5]/5 cursor-pointer text-center space-y-2 transition-colors"
                    >
                      {uploadingSceneRef ? (
                        <Loader2 className="w-6 h-6 text-[#46ecd5] animate-spin mx-auto" />
                      ) : (
                        <Upload className="w-6 h-6 text-[#46ecd5] mx-auto" />
                      )}
                      <div className="text-xs font-bold text-white">
                        Upload Scene Design or Storyboard Frame
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        PNG, JPG, or WebP frame used directly as the animation & performance visual anchor.
                      </p>
                    </div>

                    {availableImageLibrary.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-mono uppercase text-zinc-400">
                          Or Pick from Studio Images & Storyboard Frames
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {availableImageLibrary.map((img) => (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => {
                                updateActiveScene({
                                  sceneReferenceUrl: img.url,
                                  sceneReferenceSource: 'uploaded',
                                });
                                showToast('Attached library image as scene reference');
                              }}
                              className={`relative aspect-video rounded-xl overflow-hidden border transition-all ${
                                activeScene.sceneReferenceUrl === img.url
                                  ? 'border-[#46ecd5] ring-2 ring-[#46ecd5]/30'
                                  : 'border-white/10 hover:border-white/30'
                              }`}
                            >
                              <img
                                src={img.url}
                                alt={img.label}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </SpotlightCard>

              {/* Step 3: Mode-Specific Performance / B-Roll Direction */}
              <SpotlightCard className="p-5 space-y-4">
                {sceneMode === 'lip_sync' ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Mic className="w-4 h-4 text-[#46ecd5]" />
                          <span>Mode A · Vocal & Acting Lip-Sync Direction</span>
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Mouth movements synchronize strictly to trimmed audio{' '}
                          <span className="font-mono-tabular text-[#46ecd5]">
                            {formatTimecode(activeScene.audioSegment.startSec)}–
                            {formatTimecode(activeScene.audioSegment.endSec)}
                          </span>
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={applyTimelineTrimToActiveScene}
                      >
                        Sync to Timeline Trim
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono uppercase text-zinc-400">
                        Performance & Singing / Rap Acting Direction
                      </label>
                      <Textarea
                        rows={2}
                        value={activeScene.performanceDirection}
                        onChange={(e) =>
                          updateActiveScene({ performanceDirection: e.target.value })
                        }
                        placeholder="Describe vocal intensity, eye contact, head cadence, emotional delivery..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-zinc-400">
                          Facial Expression
                        </label>
                        <select
                          value={activeScene.facialExpression}
                          onChange={(e) =>
                            updateActiveScene({ facialExpression: e.target.value })
                          }
                          className="w-full h-9 px-3 rounded-xl bg-[#0B0C10] border border-white/10 text-xs text-white"
                        >
                          {FACIAL_EXPRESSIONS.map((exp) => (
                            <option key={exp} value={exp}>
                              {exp}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-zinc-400">
                          Gestures & Body Movement
                        </label>
                        <select
                          value={activeScene.gesturesAndBody}
                          onChange={(e) =>
                            updateActiveScene({ gesturesAndBody: e.target.value })
                          }
                          className="w-full h-9 px-3 rounded-xl bg-[#0B0C10] border border-white/10 text-xs text-white"
                        >
                          {GESTURE_DIRECTIONS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Film className="w-4 h-4 text-[#46ecd5]" />
                        <span>Mode B · Cinematic B-Roll Direction</span>
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Generate non-lip-sync performance, choreography, slow-motion, cutaways, or transitions.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BROLL_TYPE_OPTIONS.map((opt) => {
                        const selected = (activeScene.bRollType || 'environmental') === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateActiveScene({ bRollType: opt.id })}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              selected
                                ? 'bg-[#46ecd5]/15 border-[#46ecd5]/50 text-white'
                                : 'bg-[#0B0C10] border-white/10 text-zinc-300 hover:border-white/25'
                            }`}
                          >
                            <div className="text-xs font-bold">{opt.label}</div>
                            <div className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">
                              {opt.hint}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </SpotlightCard>
            </div>

            {/* RIGHT 5 COLS: INTELLIGENT MODEL SELECTION, SETTINGS & MONITOR */}
            <div className="xl:col-span-5 space-y-4">
              {/* Intelligent Pipeline & Model Selector */}
              <SpotlightCard className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#46ecd5]" />
                      <span>Intelligent Model Pipeline</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Only models and settings genuinely compatible with{' '}
                      {sceneMode === 'lip_sync' ? 'Audio Lip-Sync' : 'B-Roll Video'} are shown.
                    </p>
                  </div>
                </div>

                {sceneMode === 'lip_sync' && (
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0B0C10] border border-white/10">
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveScene({
                          pipelineStrategy: 'native_lip_sync',
                          modelSettings: {},
                        })
                      }
                      className={`px-2.5 py-2 rounded-lg text-[11px] font-bold text-left transition-all ${
                        effectivePipelineStrategy === 'native_lip_sync'
                          ? 'bg-[#46ecd5]/20 text-[#46ecd5] border border-[#46ecd5]/40'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>1-Step Native Lip Sync</div>
                      <div className="text-[10px] font-normal opacity-80">
                        Frame + Audio → Vocal Sync
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveScene({
                          pipelineStrategy: 'animate_then_lipsync',
                          modelSettings: {},
                        })
                      }
                      className={`px-2.5 py-2 rounded-lg text-[11px] font-bold text-left transition-all ${
                        effectivePipelineStrategy === 'animate_then_lipsync'
                          ? 'bg-[#46ecd5]/20 text-[#46ecd5] border border-[#46ecd5]/40'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>2-Step Animate → Lip Sync</div>
                      <div className="text-[10px] font-normal opacity-80">
                        Image → Video → Audio Sync
                      </div>
                    </button>
                  </div>
                )}

                {/* Visual Chain Map */}
                <div className="px-3 py-2 rounded-xl bg-[#0B0C10] border border-white/10 text-[11px] font-mono text-zinc-300 flex flex-wrap items-center gap-1.5">
                  <span className="text-[#46ecd5]">Scene Ref</span>
                  <span>→</span>
                  {sceneMode === 'b_roll' ? (
                    <span className="text-white font-bold">
                      {activePrimaryModel?.label || 'Video Model'}
                    </span>
                  ) : effectivePipelineStrategy === 'native_lip_sync' ? (
                    <span className="text-white font-bold">
                      {activePrimaryModel?.label || 'Native Lip-Sync'} + Audio Trim
                    </span>
                  ) : (
                    <>
                      <span className="text-white font-bold">
                        {activePrimaryModel?.label || 'Animator'}
                      </span>
                      <span>→</span>
                      <span className="text-white font-bold">
                        {activeDedicatedLipSyncModel?.label || 'Lip-Sync Syncer'}
                      </span>
                    </>
                  )}
                </div>

                {/* Primary Video / Animation / Native Lip-Sync Model Picker */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-zinc-400">
                    {sceneMode === 'b_roll'
                      ? 'Compatible B-Roll Video Model'
                      : effectivePipelineStrategy === 'native_lip_sync'
                      ? 'Native Audio Lip-Sync Model'
                      : 'Step 1 · Scene Animation Video Model'}
                  </label>
                  <select
                    value={activePrimaryModel?.id || ''}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      if (
                        sceneMode === 'lip_sync' &&
                        effectivePipelineStrategy === 'native_lip_sync'
                      ) {
                        updateActiveScene({ lipSyncModelId: nextId, modelSettings: {} });
                      } else {
                        updateActiveScene({ animationModelId: nextId, modelSettings: {} });
                      }
                    }}
                    className="w-full h-10 px-3 rounded-xl bg-[#0B0C10] border border-white/10 text-xs text-white focus:outline-none focus:border-[#46ecd5]"
                  >
                    {primaryVideoModelPool.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} · {m.provider} ({m.category})
                      </option>
                    ))}
                  </select>
                  {activePrimaryModel && (
                    <p className="text-[11px] text-zinc-400 pt-0.5">
                      {activePrimaryModel.description}
                    </p>
                  )}
                </div>

                {/* Step 2 Dedicated Lip-Sync Model Picker */}
                {sceneMode === 'lip_sync' &&
                  effectivePipelineStrategy === 'animate_then_lipsync' && (
                    <div className="space-y-1 pt-2 border-t border-white/[0.06]">
                      <label className="text-[11px] font-mono uppercase text-zinc-400">
                        Step 2 · Audio-Driven Lip-Sync Processor
                      </label>
                      <select
                        value={activeDedicatedLipSyncModel?.id || ''}
                        onChange={(e) =>
                          updateActiveScene({
                            lipSyncModelId: e.target.value,
                            modelSettings: {},
                          })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-[#0B0C10] border border-white/10 text-xs text-white focus:outline-none focus:border-[#46ecd5]"
                      >
                        {dedicatedLipSyncModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label} · {m.provider}
                          </option>
                        ))}
                      </select>
                      {activeDedicatedLipSyncModel && (
                        <p className="text-[11px] text-zinc-400 pt-0.5">
                          {activeDedicatedLipSyncModel.description}
                        </p>
                      )}
                    </div>
                  )}

                {/* Dynamic Model Settings (Strictly from activeModel.settings) */}
                <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
                  <div className="text-[11px] font-mono uppercase text-zinc-400">
                    Supported Model Parameters
                  </div>
                  {renderDynamicModelSettings(
                    activeDedicatedLipSyncModel || activePrimaryModel,
                    activeDedicatedLipSyncModel
                      ? resolvedLipSyncStepSettings
                      : resolvedPrimarySettings,
                    (key, val) =>
                      updateActiveScene({
                        modelSettings: {
                          ...(activeScene.modelSettings || {}),
                          [key]: val,
                        },
                      })
                  )}
                </div>

                {pipelineError && (
                  <div className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                    {pipelineError}
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <ShimmerButton
                    type="button"
                    disabled={pipelineBusy}
                    onClick={() => handleGenerateSceneVideo()}
                    className="w-full justify-center py-3"
                  >
                    {pipelineBusy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{pipelineStageLabel || 'Generating Music Video Scene...'}</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4" />
                        <span>
                          {sceneMode === 'lip_sync'
                            ? `Generate Lip-Sync Scene · ${estimatedPipelineCredits} TK`
                            : `Generate B-Roll Shot · ${estimatedPipelineCredits} TK`}
                        </span>
                      </>
                    )}
                  </ShimmerButton>

                  {activeScene.generatedBaseVideoUrl &&
                    sceneMode === 'lip_sync' &&
                    effectivePipelineStrategy === 'animate_then_lipsync' && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={pipelineBusy}
                        onClick={() => {
                          updateActiveScene({
                            generatedBaseVideoUrl: undefined,
                            generatedBaseVideoGenId: undefined,
                          });
                          showToast(
                            'Cleared cached base animation; next run will re-animate Step 1'
                          );
                        }}
                        className="w-full"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Re-animate Step 1 Base Motion on Next Run</span>
                      </Button>
                    )}
                </div>
              </SpotlightCard>

              {/* Visual Monitor: Active Scene Frame & Output Video */}
              <SpotlightCard className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-300">
                    Scene Monitor · {activeScene.title}
                  </h4>
                  {activePerformer && (
                    <span className="text-[11px] text-[#46ecd5]">
                      @{activePerformer.name}
                      {activeOutfit ? ` · ${activeOutfit.name}` : ''}
                    </span>
                  )}
                </div>

                {activeScene.finalVideoUrl ? (
                  <div className="space-y-2">
                    <video
                      key={activeScene.finalVideoUrl}
                      src={activeScene.finalVideoUrl}
                      controls
                      playsInline
                      className="w-full aspect-video rounded-2xl bg-black object-cover border border-white/10"
                    />
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Final Rendered Video</span>
                      <a
                        href={activeScene.finalVideoUrl}
                        download={`${activeScene.title.replace(/\s+/g, '-')}.mp4`}
                        className="text-[#46ecd5] hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download Clip</span>
                      </a>
                    </div>
                  </div>
                ) : activeScene.sceneReferenceUrl ? (
                  <div className="space-y-2">
                    <img
                      src={activeScene.sceneReferenceUrl}
                      alt={activeScene.title}
                      className="w-full aspect-video rounded-2xl object-cover border border-white/10"
                    />
                    <div className="text-[11px] text-zinc-400">
                      Scene Reference Locked ({activeScene.sceneReferenceSource}) — ready to animate
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video rounded-2xl bg-[#0B0C10] border border-white/10 flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <Clapperboard className="w-8 h-8 text-zinc-600" />
                    <div className="text-xs font-semibold text-zinc-300">
                      No Scene Reference Yet
                    </div>
                    <p className="text-[11px] text-zinc-500 max-w-xs">
                      Generate a scene keyframe on the left or upload your own storyboard art before rendering video.
                    </p>
                  </div>
                )}
              </SpotlightCard>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          SUB-TAB 3: SEQUENCE & MASTER CUT ASSEMBLY
         =================================================================== */}
      {activeSubTab === 'sequence' && (
        <div className="space-y-5">
          {/* Synchronized Master Cut Preview */}
          <SpotlightCard className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold uppercase text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-[#46ecd5]" />
                  <span>Music Video Master Cut Preview</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Plays generated Lip Sync & B-Roll scenes in sequence aligned with your imported music track.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="default" size="sm" onClick={toggleMasterPreview}>
                  {masterPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>{masterPlaying ? 'Pause Master Cut' : 'Play Master Cut'}</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleExportProjectManifest}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Sequence</span>
                </Button>
                <Button type="button" variant="accent" size="sm" onClick={handleAddScene}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Scene</span>
                </Button>
              </div>
            </div>

            {audioTrack && (
              <audio ref={masterAudioRef} src={audioTrack.playbackUrl} className="hidden" />
            )}

            {playableSequenceScenes[masterSceneIndex]?.finalVideoUrl ? (
              <div className="space-y-2">
                <video
                  ref={masterVideoRef}
                  key={playableSequenceScenes[masterSceneIndex]?.id}
                  src={playableSequenceScenes[masterSceneIndex]?.finalVideoUrl}
                  autoPlay={masterPlaying}
                  muted={Boolean(audioTrack && masterPlaying)}
                  controls
                  onEnded={handleMasterClipEnded}
                  className="w-full max-h-[420px] rounded-2xl bg-black object-contain border border-white/10"
                />
                <div className="flex items-center justify-between text-xs font-mono-tabular text-zinc-300">
                  <span>
                    Playing Clip {masterSceneIndex + 1}/{playableSequenceScenes.length}:{' '}
                    <strong className="text-[#46ecd5]">
                      {playableSequenceScenes[masterSceneIndex]?.title}
                    </strong>
                  </span>
                  <span>
                    Audio Window:{' '}
                    {formatTimecode(playableSequenceScenes[masterSceneIndex].audioSegment.startSec)}{' '}
                    –{' '}
                    {formatTimecode(playableSequenceScenes[masterSceneIndex].audioSegment.endSec)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#0B0C10] border border-white/10 text-center space-y-2">
                <Video className="w-8 h-8 text-zinc-600 mx-auto" />
                <div className="text-sm font-semibold text-zinc-300">
                  No Rendered Video Clips in Sequence Yet
                </div>
                <p className="text-xs text-zinc-500">
                  Switch to Scene & Video Studio to render Lip Sync or B-Roll scenes and assemble them here.
                </p>
              </div>
            )}
          </SpotlightCard>

          {/* Reorderable Scene Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenes.map((sc, idx) => {
              const char = characters.find((c) => c.id === sc.characterId);
              return (
                <SpotlightCard key={sc.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-mono-tabular text-[#46ecd5]">
                        SCENE {String(idx + 1).padStart(2, '0')} ·{' '}
                        {sc.mode === 'lip_sync' ? 'Lip Sync' : 'B-Roll'}
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{sc.title}</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveScene(sc.id, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg bg-[#0B0C10] border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30"
                        title="Move Earlier"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveScene(sc.id, 1)}
                        disabled={idx === scenes.length - 1}
                        className="p-1.5 rounded-lg bg-[#0B0C10] border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30"
                        title="Move Later"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {sc.finalVideoUrl ? (
                    <video
                      src={sc.finalVideoUrl}
                      controls
                      className="w-full aspect-video rounded-xl bg-black object-cover border border-white/10"
                    />
                  ) : sc.sceneReferenceUrl ? (
                    <img
                      src={sc.sceneReferenceUrl}
                      alt={sc.title}
                      className="w-full aspect-video rounded-xl object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-full aspect-video rounded-xl bg-[#0B0C10] border border-white/10 flex items-center justify-center text-xs text-zinc-500">
                      Awaiting Scene Media
                    </div>
                  )}

                  <div className="text-[11px] font-mono-tabular text-zinc-400 flex items-center justify-between">
                    <span>
                      {formatTimecode(sc.audioSegment.startSec)} →{' '}
                      {formatTimecode(sc.audioSegment.endSec)} (
                      {sc.audioSegment.durationSec.toFixed(1)}s)
                    </span>
                    <span className="truncate max-w-[130px]">
                      {char ? `@${char.name}` : 'No Performer'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                    <Button
                      type="button"
                      variant="accent"
                      size="xs"
                      onClick={() => {
                        setActiveSceneId(sc.id);
                        setTrimStartSec(sc.audioSegment.startSec);
                        setTrimEndSec(sc.audioSegment.endSec);
                        setActiveSubTab('studio');
                      }}
                    >
                      Edit in Studio
                    </Button>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        disabled={pipelineBusy}
                        onClick={() => {
                          setActiveSceneId(sc.id);
                          void handleGenerateSceneVideo(sc);
                        }}
                        title="Regenerate Scene Clip"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={() => handleDuplicateScene(sc)}
                        title="Duplicate Scene"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteScene(sc.id)}
                        className="text-rose-400 hover:text-rose-300"
                        title="Delete Scene"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
