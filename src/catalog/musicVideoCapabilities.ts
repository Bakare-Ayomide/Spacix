import { MODEL_CATALOG } from './models';
import {
  LipSyncCapabilityKind,
  ModelEntry,
  MusicVideoGenerationMode,
  SettingDefinition,
} from '../types/studio';

export interface MusicVideoModelCapability {
  modelId: string;
  lipSyncCapability: LipSyncCapabilityKind;
  capabilitySummary: string;
  supportsImageToVideo: boolean;
  supportsReferenceToVideo: boolean;
  supportsTextToVideo: boolean;
  supportsDirectAudioInput: boolean;
  requiresVideoInput: boolean;
  recommendedFor: ('lip_sync_native' | 'lip_sync_stage1_anim' | 'lip_sync_stage2_sync' | 'b_roll')[];
}

/**
 * Honest, capability-verified registry for Music Video Production.
 * Clearly distinguishes between:
 *  - native_audio_driven: generates video + synchronized lip movement directly from image + audio
 *  - dedicated_lipsync_step: applies audio-driven lip sync to an animated video clip (Stage 2)
 *  - requires_lipsync_step: generates cinematic video motion without audio-driven lip sync (pairs with Stage 2 for Lip Sync, or runs standalone for B-Roll)
 *  - video_no_lipsync: specialized camera/motion B-roll models (never advertised as lip-sync capable)
 */
export const MUSIC_VIDEO_MODEL_CAPABILITIES: Record<string, MusicVideoModelCapability> = {
  // ---- NATIVE AUDIO-DRIVEN LIP SYNC (SINGLE PASS) ----
  'omnihuman-1-5-lipsync': {
    modelId: 'omnihuman-1-5-lipsync',
    lipSyncCapability: 'native_audio_driven',
    capabilitySummary: 'Native audio-driven singing & full-body performance directly from image + trimmed audio',
    supportsImageToVideo: true,
    supportsReferenceToVideo: true,
    supportsTextToVideo: false,
    supportsDirectAudioInput: true,
    requiresVideoInput: false,
    recommendedFor: ['lip_sync_native'],
  },
  'hedra-character-3': {
    modelId: 'hedra-character-3',
    lipSyncCapability: 'native_audio_driven',
    capabilitySummary: 'Native audio-driven vocal acting & facial micro-expressions from portrait + trimmed audio',
    supportsImageToVideo: true,
    supportsReferenceToVideo: false,
    supportsTextToVideo: false,
    supportsDirectAudioInput: true,
    requiresVideoInput: false,
    recommendedFor: ['lip_sync_native'],
  },
  'veed-fabric-lipsync': {
    modelId: 'veed-fabric-lipsync',
    lipSyncCapability: 'native_audio_driven',
    capabilitySummary: 'Fast native audio-to-avatar lip sync from scene reference + trimmed audio',
    supportsImageToVideo: true,
    supportsReferenceToVideo: false,
    supportsTextToVideo: false,
    supportsDirectAudioInput: true,
    requiresVideoInput: false,
    recommendedFor: ['lip_sync_native'],
  },

  // ---- DEDICATED POST-PROCESS LIP SYNC PROCESSORS (STAGE 2) ----
  'sync-lipsync-2-pro': {
    modelId: 'sync-lipsync-2-pro',
    lipSyncCapability: 'dedicated_lipsync_step',
    capabilitySummary: 'Dedicated audio-to-video lip synchronization pass preserving camera motion & scene continuity',
    supportsImageToVideo: false,
    supportsReferenceToVideo: false,
    supportsTextToVideo: false,
    supportsDirectAudioInput: true,
    requiresVideoInput: true,
    recommendedFor: ['lip_sync_stage2_sync'],
  },
  'kling-lipsync-pro': {
    modelId: 'kling-lipsync-pro',
    lipSyncCapability: 'dedicated_lipsync_step',
    capabilitySummary: 'Dedicated jaw & mouth viseme alignment applied onto animated video clips',
    supportsImageToVideo: false,
    supportsReferenceToVideo: false,
    supportsTextToVideo: false,
    supportsDirectAudioInput: true,
    requiresVideoInput: true,
    recommendedFor: ['lip_sync_stage2_sync'],
  },

  // ---- VIDEO ANIMATION MODELS (STANDALONE FOR B-ROLL, OR STAGE 1 -> LIP-SYNC PASS) ----
  'seedance-2-5': {
    modelId: 'seedance-2-5',
    lipSyncCapability: 'requires_lipsync_step',
    capabilitySummary: 'Generates cinematic video without external audio lip sync; pairs with a lip-sync processor for singing',
    supportsImageToVideo: true,
    supportsReferenceToVideo: true,
    supportsTextToVideo: true,
    supportsDirectAudioInput: false,
    requiresVideoInput: false,
    recommendedFor: ['lip_sync_stage1_anim', 'b_roll'],
  },
  'kling-3-0-pro': {
    modelId: 'kling-3-0-pro',
    lipSyncCapability: 'requires_lipsync_step',
    capabilitySummary: 'Expressive 4K character acting & physics; requires a separate lip-sync step for audio mouth sync',
    supportsImageToVideo: true,
    supportsReferenceToVideo: true,
    supportsTextToVideo: true,
    supportsDirectAudioInput: false,
    requiresVideoInput: false,
    recommendedFor: ['lip_sync_stage1_anim', 'b_roll'],
  },
  'wan-3-0-prime': {
    modelId: 'wan-3-0-prime',
    lipSyncCapability: 'requires_lipsync_step',
    capabilitySummary: 'Atmospheric cinema motion; requires a dedicated lip-sync step for external music vocal sync',
    supportsImageToVideo: true,
    supportsReferenceToVideo: true,
    supportsTextToVideo: true,
    supportsDirectAudioInput: false,
    requiresVideoInput: false,
    recommendedFor: ['lip_sync_stage1_anim', 'b_roll'],
  },
  'minimax-h3': {
    modelId: 'minimax-h3',
    lipSyncCapability: 'requires_lipsync_step',
    capabilitySummary: 'Theatrical close-up acting & lighting; requires separate lip-sync pass for external song audio',
    supportsImageToVideo: true,
    supportsReferenceToVideo: false,
    supportsTextToVideo: true,
    supportsDirectAudioInput: false,
    requiresVideoInput: false,
    recommendedFor: ['lip_sync_stage1_anim', 'b_roll'],
  },
  'ltx-2-5-pro': {
    modelId: 'ltx-2-5-pro',
    lipSyncCapability: 'requires_lipsync_step',
    capabilitySummary: 'High-FPS smooth camera sweeps (24/50 fps); pairs with lip-sync processor if vocals are needed',
    supportsImageToVideo: true,
    supportsReferenceToVideo: false,
    supportsTextToVideo: true,
    supportsDirectAudioInput: false,
    requiresVideoInput: false,
    recommendedFor: ['lip_sync_stage1_anim', 'b_roll'],
  },

  // ---- PURE B-ROLL / CAMERA CHOREOGRAPHY MODELS (NO LIP SYNC) ----
  'flux-3-max-video': {
    modelId: 'flux-3-max-video',
    lipSyncCapability: 'video_no_lipsync',
    capabilitySummary: 'Photorealistic B-roll cinematography without external lip sync',
    supportsImageToVideo: true,
    supportsReferenceToVideo: false,
    supportsTextToVideo: true,
    supportsDirectAudioInput: false,
    requiresVideoInput: false,
    recommendedFor: ['b_roll'],
  },
  'kling-o3-frames': {
    modelId: 'kling-o3-frames',
    lipSyncCapability: 'video_no_lipsync',
    capabilitySummary: 'First-to-last frame B-roll transitions & visual match cuts',
    supportsImageToVideo: true,
    supportsReferenceToVideo: false,
    supportsTextToVideo: false,
    supportsDirectAudioInput: false,
    requiresVideoInput: false,
    recommendedFor: ['b_roll'],
  },
  'kling-3-0-turbo': {
    modelId: 'kling-3-0-turbo',
    lipSyncCapability: 'video_no_lipsync',
    capabilitySummary: 'Fast B-roll action beats & rapid visual inserts',
    supportsImageToVideo: true,
    supportsReferenceToVideo: false,
    supportsTextToVideo: true,
    supportsDirectAudioInput: false,
    requiresVideoInput: false,
    recommendedFor: ['b_roll'],
  },
  'seedance-2-0-fast': {
    modelId: 'seedance-2-0-fast',
    lipSyncCapability: 'video_no_lipsync',
    capabilitySummary: 'High-speed B-roll & dynamic cutaway generator',
    supportsImageToVideo: true,
    supportsReferenceToVideo: false,
    supportsTextToVideo: true,
    supportsDirectAudioInput: false,
    requiresVideoInput: false,
    recommendedFor: ['b_roll'],
  },
  'higgsfield-dop-lite': {
    modelId: 'higgsfield-dop-lite',
    lipSyncCapability: 'video_no_lipsync',
    capabilitySummary: 'Camera rig motion (SnorriCam, 360 Orbit, Dolly Zoom) from a single scene keyframe',
    supportsImageToVideo: true,
    supportsReferenceToVideo: false,
    supportsTextToVideo: false,
    supportsDirectAudioInput: false,
    requiresVideoInput: false,
    recommendedFor: ['b_roll'],
  },
};

export function getCapabilityForModel(modelId: string): MusicVideoModelCapability {
  return (
    MUSIC_VIDEO_MODEL_CAPABILITIES[modelId] || {
      modelId,
      lipSyncCapability: 'video_no_lipsync',
      capabilitySummary: 'Standard video generation (no native audio lip sync)',
      supportsImageToVideo: true,
      supportsReferenceToVideo: false,
      supportsTextToVideo: true,
      supportsDirectAudioInput: false,
      requiresVideoInput: false,
      recommendedFor: ['b_roll'],
    }
  );
}

export function getMusicVideoImageModels(allModels: ModelEntry[] = MODEL_CATALOG): ModelEntry[] {
  return allModels.filter((m) => m.surface === 'image');
}

export function getNativeLipSyncModels(allModels: ModelEntry[] = MODEL_CATALOG): ModelEntry[] {
  return allModels.filter(
    (m) =>
      m.surface === 'video' &&
      MUSIC_VIDEO_MODEL_CAPABILITIES[m.id]?.lipSyncCapability === 'native_audio_driven'
  );
}

export function getDedicatedLipSyncProcessors(allModels: ModelEntry[] = MODEL_CATALOG): ModelEntry[] {
  return allModels.filter(
    (m) =>
      m.surface === 'video' &&
      MUSIC_VIDEO_MODEL_CAPABILITIES[m.id]?.lipSyncCapability === 'dedicated_lipsync_step'
  );
}

export function getTwoStageAnimationModels(allModels: ModelEntry[] = MODEL_CATALOG): ModelEntry[] {
  return allModels.filter(
    (m) =>
      m.surface === 'video' &&
      MUSIC_VIDEO_MODEL_CAPABILITIES[m.id]?.lipSyncCapability === 'requires_lipsync_step'
  );
}

export function getBRollVideoModels(
  allModels: ModelEntry[] = MODEL_CATALOG,
  hasSceneImage = false
): ModelEntry[] {
  return allModels.filter((m) => {
    if (m.surface !== 'video') return false;
    const cap = MUSIC_VIDEO_MODEL_CAPABILITIES[m.id];
    if (!cap) return true;
    // Never include dedicated lip-sync-only processors or native-audio-only avatars in B-Roll mode
    if (
      cap.lipSyncCapability === 'dedicated_lipsync_step' ||
      cap.lipSyncCapability === 'native_audio_driven'
    ) {
      return false;
    }
    // Exclude motion-control models that strictly require a driving video unless explicitly matched
    const requiresDrivingVideo = m.roles.some((r) => r.role === 'video' && r.required);
    if (requiresDrivingVideo) return false;
    // If no scene image is attached yet, exclude models that strictly require a start image
    const requiresStartImage = m.roles.some((r) => r.role === 'start' && r.required);
    const requiresEndImage = m.roles.some((r) => r.role === 'end' && r.required);
    if (requiresEndImage) return false;
    if (!hasSceneImage && requiresStartImage) return false;
    return true;
  });
}

export interface DynamicModelControls {
  aspectRatios: Array<{ value: string; label: string }>;
  resolutions: Array<{ value: string; label: string }>;
  durations: Array<{ value: string; label: string }>;
  advancedSettings: SettingDefinition[];
}

/**
 * Extracts ONLY the settings genuinely supported by the selected model.
 */
export function getDynamicControlsForModel(model: ModelEntry | undefined): DynamicModelControls {
  if (!model) {
    return {
      aspectRatios: [
        { value: '16:9', label: '16:9 Landscape' },
        { value: '9:16', label: '9:16 Portrait' },
        { value: '1:1', label: '1:1 Square' },
      ],
      resolutions: [{ value: '1080p', label: '1080p Full HD' }],
      durations: [{ value: '5', label: '5s' }],
      advancedSettings: [],
    };
  }

  let aspectRatios: Array<{ value: string; label: string }> = [];
  let resolutions: Array<{ value: string; label: string }> = [];
  let durations: Array<{ value: string; label: string }> = [];
  const advancedSettings: SettingDefinition[] = [];

  for (const s of model.settings) {
    if (s.key === 'aspect_ratio' && s.type === 'enum') {
      aspectRatios = s.options;
    } else if (s.key === 'resolution' && s.type === 'enum') {
      resolutions = s.options;
    } else if (s.key === 'duration' && s.type === 'enum') {
      durations = s.options;
    } else {
      advancedSettings.push(s);
    }
  }

  return {
    aspectRatios,
    resolutions,
    durations,
    advancedSettings,
  };
}

export function getCapabilityBadgeLabel(kind: LipSyncCapabilityKind): string {
  switch (kind) {
    case 'native_audio_driven':
      return 'Native Audio-Driven Lip Sync';
    case 'dedicated_lipsync_step':
      return 'Dedicated Lip-Sync Processor';
    case 'requires_lipsync_step':
      return 'Video Animation (Pairs with Lip-Sync Step)';
    case 'video_no_lipsync':
      return 'Cinematic Video (No Lip Sync)';
  }
}

export function getDefaultModelForMusicVideoMode(
  mode: MusicVideoGenerationMode,
  lipSyncPipelineType: 'native' | 'two_stage',
  allModels: ModelEntry[] = MODEL_CATALOG
): { animationModelId: string; lipSyncModelId: string } {
  const nativeModels = getNativeLipSyncModels(allModels);
  const twoStageAnim = getTwoStageAnimationModels(allModels);
  const dedicatedSync = getDedicatedLipSyncProcessors(allModels);
  const bRollModels = getBRollVideoModels(allModels, true);

  if (mode === 'b_roll') {
    return {
      animationModelId: bRollModels[0]?.id || 'seedance-2-5',
      lipSyncModelId: '',
    };
  }

  if (lipSyncPipelineType === 'native') {
    return {
      animationModelId: nativeModels[0]?.id || 'omnihuman-1-5-lipsync',
      lipSyncModelId: nativeModels[0]?.id || 'omnihuman-1-5-lipsync',
    };
  }

  return {
    animationModelId: twoStageAnim[0]?.id || 'seedance-2-5',
    lipSyncModelId: dedicatedSync[0]?.id || 'sync-lipsync-2-pro',
  };
}
