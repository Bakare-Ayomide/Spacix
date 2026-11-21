import { MODEL_CATALOG } from './models';
import { ModelEntry, Surface } from '../types/studio';

export type CinemaToolCategoryId =
  | 'production_elements'
  | 'media_generation'
  | 'film_production';

export type CinemaToolId =
  // PRODUCTION ELEMENTS
  | 'character_identity'
  | 'location_environment'
  | 'wardrobe_outfit'
  | 'prop_object'
  | 'visual_reference'
  // MEDIA GENERATION
  | 'image_creation'
  | 'video_creation'
  | 'voice_creation'
  | 'speech_dialogue'
  | 'music_sfx'
  | 'lip_sync'
  | 'motion_animation'
  // FILM PRODUCTION
  | 'script_screenplay'
  | 'scene_breakdown'
  | 'storyboard_planning'
  | 'camera_coverage'
  | 'lighting_cinema'
  | 'video_sequencing';

export interface CinemaToolSpec {
  id: CinemaToolId;
  category: CinemaToolCategoryId;
  label: string;
  shortLabel: string;
  description: string;
  targetSurface: Surface | 'llm';
  defaultModelId: string;
  defaultMode?: string;
  compatibleModelIds: string[];
  promptPlaceholder: string;
  directivePrefix: string;
  supportsCameraOptics: boolean;
  supportsLightingAndColor: boolean;
  supportsReferences: boolean;
  supportsDuration: boolean;
  supportsAspectRatio: boolean;
  supportsResolution: boolean;
  supportsAudioToggle: boolean;
}

export const CINEMA_TOOL_CATEGORIES: Array<{
  id: CinemaToolCategoryId;
  label: string;
  shortLabel: string;
}> = [
  {
    id: 'production_elements',
    label: 'Production Elements',
    shortLabel: 'Elements',
  },
  {
    id: 'media_generation',
    label: 'Media Generation',
    shortLabel: 'Media',
  },
  {
    id: 'film_production',
    label: 'Film Production',
    shortLabel: 'Production',
  },
];

// All image models in catalog
const IMAGE_MODEL_IDS = [
  'soul-2-standard',
  'soul-cinema',
  'nano-banana-2-1',
  'fal-nano-banana-pro',
  'flux-kontext-pro',
  'flux-2-pro',
  'grok-imagine-image-2',
  'grok-imagine-2-0',
  'ideogram-v4',
  'recraft-v4-1',
  'qwen-image-3',
  'z-image-turbo',
];

// Standard narrative video models
const VIDEO_MODEL_IDS = [
  'seedance-2-5',
  'kling-3-0-pro',
  'flux-3-max-video',
  'kling-o3-frames',
  'veo-3-1',
  'wan-3-0-prime',
  'hailuo-03-director',
  'ltx-video-2',
  'kling-3-0-turbo',
  'higgsfield-dop-lite',
];

// Motion & camera rig video models
const MOTION_VIDEO_MODEL_IDS = [
  'kling-3-0-motion',
  'higgsfield-dop-lite',
  'seedance-2-5',
  'kling-3-0-pro',
  'kling-o3-frames',
  'hailuo-03-director',
];

// Lip sync & speech-driven character performance video models
const LIP_SYNC_MODEL_IDS = [
  'seedance-2-5',
  'kling-3-0-pro',
  'wan-3-0-prime',
  'veo-3-1',
  'ltx-video-2',
];

// Voice creation & Speech/Dialogue TTS models
const VOICE_SPEECH_MODEL_IDS = [
  'inworld-tts-studio',
  'chatterbox-dia-tts',
  'fishaudio-s2-1-pro',
];

// Music & Sound Effects audio models
const MUSIC_SFX_MODEL_IDS = [
  'sonilo-music-v2',
  'elevenlabs-music',
  'beatoven-music-sfx',
  'seed-audio-v1',
];

export const CINEMA_TOOLS: Record<CinemaToolId, CinemaToolSpec> = {
  // =========================================================================
  // 1. PRODUCTION ELEMENTS
  // =========================================================================
  character_identity: {
    id: 'character_identity',
    category: 'production_elements',
    label: 'Characters & Facial Identities',
    shortLabel: 'Characters',
    description: 'Create permanent character portraits, turnaround sheets, and locked facial IDs.',
    targetSurface: 'image',
    defaultModelId: 'soul-2-standard',
    defaultMode: 'Create',
    compatibleModelIds: IMAGE_MODEL_IDS,
    promptPlaceholder:
      'Describe character face, age, skin texture, hair, expression & signature look to lock as a reusable @Character...',
    directivePrefix: 'Character Identity Reference Plate — neutral studio portrait, consistent facial structure',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: false,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: false,
  },
  location_environment: {
    id: 'location_environment',
    category: 'production_elements',
    label: 'Locations & Environments',
    shortLabel: 'Locations',
    description: 'Establish INT./EXT. filming sets, architecture, weather, and lighting plates.',
    targetSurface: 'image',
    defaultModelId: 'soul-cinema',
    defaultMode: 'Create',
    compatibleModelIds: IMAGE_MODEL_IDS,
    promptPlaceholder:
      'Describe INT./EXT. filming environment, architecture, time of day, weather & spatial depth...',
    directivePrefix: 'Filming Location Master Plate — wide architectural establishing view, locked atmosphere',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: false,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: false,
  },
  wardrobe_outfit: {
    id: 'wardrobe_outfit',
    category: 'production_elements',
    label: 'Wardrobes & Outfits',
    shortLabel: 'Wardrobes',
    description: 'Design character costumes, fabrics, footwear, and scene-locked outfits.',
    targetSurface: 'image',
    defaultModelId: 'soul-2-standard',
    defaultMode: 'Create',
    compatibleModelIds: IMAGE_MODEL_IDS,
    promptPlaceholder:
      'Describe garments, fabric drape, color palette, footwear & accessories for continuity...',
    directivePrefix: 'Wardrobe & Costume Lookbook Plate — full-body fabric detail, clean continuity reference',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: false,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: false,
  },
  prop_object: {
    id: 'prop_object',
    category: 'production_elements',
    label: 'Props & Objects',
    shortLabel: 'Props',
    description: 'Generate hero vehicles, gadgets, artifacts, and set objects.',
    targetSurface: 'image',
    defaultModelId: 'nano-banana-2-1',
    defaultMode: 'Create',
    compatibleModelIds: IMAGE_MODEL_IDS,
    promptPlaceholder:
      'Describe hero prop, vehicle, gadget or artifact, material finish, scale & surface details...',
    directivePrefix: 'Hero Prop Continuity Plate — crisp macro product & object detail',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: false,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: false,
  },
  visual_reference: {
    id: 'visual_reference',
    category: 'production_elements',
    label: 'Visual References',
    shortLabel: 'References',
    description: 'Manage up to 50 active continuity references (characters, sets, photos, frames).',
    targetSurface: 'image',
    defaultModelId: 'flux-kontext-pro',
    defaultMode: 'Create',
    compatibleModelIds: IMAGE_MODEL_IDS,
    promptPlaceholder:
      'Generate or refine a visual style frame or reference plate using @characters and @locations...',
    directivePrefix: 'Visual Continuity Reference Frame',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: false,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: false,
  },

  // =========================================================================
  // 2. MEDIA GENERATION
  // =========================================================================
  image_creation: {
    id: 'image_creation',
    category: 'media_generation',
    label: 'Image Creation',
    shortLabel: 'Image',
    description: 'Generate high-resolution cinematic stills, keyframes, and concept photography.',
    targetSurface: 'image',
    defaultModelId: 'soul-cinema',
    defaultMode: 'Create',
    compatibleModelIds: IMAGE_MODEL_IDS,
    promptPlaceholder:
      'Describe your cinematic still or keyframe — use @ to add characters, locations & props...',
    directivePrefix: 'Cinema Studio 4.0 Still Photography',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: false,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: false,
  },
  video_creation: {
    id: 'video_creation',
    category: 'media_generation',
    label: 'Video Creation',
    shortLabel: 'Video',
    description: 'Direct full-motion cinema shots with optical lenses, lighting, and movement.',
    targetSurface: 'video',
    defaultModelId: 'seedance-2-5',
    defaultMode: 'Create Video',
    compatibleModelIds: VIDEO_MODEL_IDS,
    promptPlaceholder:
      'Describe your scene — use @ to add characters & locations, or # for camera movements...',
    directivePrefix: 'Cinema Studio 4.0 Direction',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: true,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: true,
  },
  voice_creation: {
    id: 'voice_creation',
    category: 'media_generation',
    label: 'Voice Creation',
    shortLabel: 'Voice',
    description: 'Synthesize expressive character voice profiles, narrator timbres, and voice clones.',
    targetSurface: 'audio',
    defaultModelId: 'chatterbox-dia-tts',
    defaultMode: 'Text to Speech',
    compatibleModelIds: VOICE_SPEECH_MODEL_IDS,
    promptPlaceholder:
      'Enter the character voice sample text or narration line to synthesize with vocal emotion...',
    directivePrefix: '',
    supportsCameraOptics: false,
    supportsLightingAndColor: false,
    supportsReferences: false,
    supportsDuration: true,
    supportsAspectRatio: false,
    supportsResolution: false,
    supportsAudioToggle: false,
  },
  speech_dialogue: {
    id: 'speech_dialogue',
    category: 'media_generation',
    label: 'Speech & Dialogue',
    shortLabel: 'Dialogue',
    description: 'Generate multi-language spoken dialogue and dramatic voiceover tracks.',
    targetSurface: 'audio',
    defaultModelId: 'inworld-tts-studio',
    defaultMode: 'Voice & SFX',
    compatibleModelIds: VOICE_SPEECH_MODEL_IDS,
    promptPlaceholder:
      'Enter exact spoken dialogue or scene narration for your character to perform...',
    directivePrefix: '',
    supportsCameraOptics: false,
    supportsLightingAndColor: false,
    supportsReferences: false,
    supportsDuration: true,
    supportsAspectRatio: false,
    supportsResolution: false,
    supportsAudioToggle: false,
  },
  music_sfx: {
    id: 'music_sfx',
    category: 'media_generation',
    label: 'Music & Sound Effects',
    shortLabel: 'Music & SFX',
    description: 'Compose film scores, ambient beds, and binaural foley sound effects.',
    targetSurface: 'audio',
    defaultModelId: 'sonilo-music-v2',
    defaultMode: 'Music & Score',
    compatibleModelIds: MUSIC_SFX_MODEL_IDS,
    promptPlaceholder:
      'Describe film score instrumentation, tempo & mood, or foley sound effect (e.g. rain on neon asphalt)...',
    directivePrefix: '',
    supportsCameraOptics: false,
    supportsLightingAndColor: false,
    supportsReferences: false,
    supportsDuration: true,
    supportsAspectRatio: false,
    supportsResolution: false,
    supportsAudioToggle: false,
  },
  lip_sync: {
    id: 'lip_sync',
    category: 'media_generation',
    label: 'Lip Sync Performance',
    shortLabel: 'Lip Sync',
    description: 'Synchronize spoken dialogue and facial expressions onto character video shots.',
    targetSurface: 'video',
    defaultModelId: 'seedance-2-5',
    defaultMode: 'Create Video',
    compatibleModelIds: LIP_SYNC_MODEL_IDS,
    promptPlaceholder:
      'Describe character close-up performance and spoken line — use @ to lock speaking character...',
    directivePrefix: 'Synchronized Viseme Lip-Sync Performance — expressive facial articulation',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: true,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: true,
  },
  motion_animation: {
    id: 'motion_animation',
    category: 'media_generation',
    label: 'Motion & Animation',
    shortLabel: 'Motion',
    description: 'Transfer choreography, body movement, or camera rig paths onto characters and keyframes.',
    targetSurface: 'video',
    defaultModelId: 'kling-3-0-motion',
    defaultMode: 'Motion Control',
    compatibleModelIds: MOTION_VIDEO_MODEL_IDS,
    promptPlaceholder:
      'Describe body choreography, stunt action, or camera rig path — attach start frame or driving motion video...',
    directivePrefix: 'Motion Control & Camera Rig Transfer',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: true,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: false,
  },

  // =========================================================================
  // 3. FILM PRODUCTION
  // =========================================================================
  script_screenplay: {
    id: 'script_screenplay',
    category: 'film_production',
    label: 'Script & Screenplay',
    shortLabel: 'Screenplay',
    description: 'Write, format, and AI co-write full industry-standard screenplays with scenes and dialogue.',
    targetSurface: 'llm',
    defaultModelId: 'soul-cinema',
    compatibleModelIds: IMAGE_MODEL_IDS,
    promptPlaceholder:
      'Enter a scene concept or director instruction to generate screenplay scenes, or visualize a script beat...',
    directivePrefix: 'Screenplay Scene Visualization',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: false,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: false,
  },
  scene_breakdown: {
    id: 'scene_breakdown',
    category: 'film_production',
    label: 'Scene Breakdown',
    shortLabel: 'Breakdown',
    description: 'Extract characters, locations, props, wardrobes, and shot lists from any scene.',
    targetSurface: 'llm',
    defaultModelId: 'soul-cinema',
    compatibleModelIds: IMAGE_MODEL_IDS,
    promptPlaceholder:
      'Paste or describe a scene to break down into camera-ready shots and production elements...',
    directivePrefix: 'Scene Breakdown & Pre-Visualization',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: false,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: false,
  },
  storyboard_planning: {
    id: 'storyboard_planning',
    category: 'film_production',
    label: 'Storyboard',
    shortLabel: 'Storyboard',
    description: 'Plan shot-by-shot visual storyboards with continuity-locked characters and sets.',
    targetSurface: 'image',
    defaultModelId: 'nano-banana-2-1',
    defaultMode: 'Create',
    compatibleModelIds: IMAGE_MODEL_IDS,
    promptPlaceholder:
      'Describe storyboard frame composition, shot size, camera angle & character blocking...',
    directivePrefix: 'Storyboard Continuity Keyframe — clear cinematic composition & staging',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: false,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: false,
  },
  camera_coverage: {
    id: 'camera_coverage',
    category: 'film_production',
    label: 'Camera Angles & Shot Coverage',
    shortLabel: 'Camera Angles',
    description: 'Configure sensor bodies, anamorphic lenses, T-stops, and multi-angle coverage.',
    targetSurface: 'video',
    defaultModelId: 'higgsfield-dop-lite',
    defaultMode: 'Create Video',
    compatibleModelIds: VIDEO_MODEL_IDS,
    promptPlaceholder:
      'Direct multi-angle camera coverage (Wide, Medium, Close-Up, Over-the-Shoulder, Reverse Shot)...',
    directivePrefix: 'Multi-Angle Camera Coverage Shot',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: true,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: true,
  },
  lighting_cinema: {
    id: 'lighting_cinema',
    category: 'film_production',
    label: 'Lighting & Cinematography',
    shortLabel: 'Lighting & Color',
    description: 'Set up practicals, window key light, silhouette rim light, and film color LUTs.',
    targetSurface: 'video',
    defaultModelId: 'seedance-2-5',
    defaultMode: 'Create Video',
    compatibleModelIds: [...VIDEO_MODEL_IDS, ...IMAGE_MODEL_IDS],
    promptPlaceholder:
      'Describe lighting mood, color palette, key-to-fill ratio & atmospheric haze...',
    directivePrefix: 'Master Cinematography & Lighting Setup',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: true,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: true,
  },
  video_sequencing: {
    id: 'video_sequencing',
    category: 'film_production',
    label: 'Video Editing & Sequencing',
    shortLabel: 'Sequencer',
    description: 'Assemble generated shots, voice dialogue, music, and SFX on a multi-track timeline.',
    targetSurface: 'video',
    defaultModelId: 'seedance-2-5',
    defaultMode: 'Create Video',
    compatibleModelIds: VIDEO_MODEL_IDS,
    promptPlaceholder:
      'Generate a bridging transition shot or B-roll insert for the timeline sequence...',
    directivePrefix: 'Timeline Sequence Cut & B-Roll Insert',
    supportsCameraOptics: true,
    supportsLightingAndColor: true,
    supportsReferences: true,
    supportsDuration: true,
    supportsAspectRatio: true,
    supportsResolution: true,
    supportsAudioToggle: true,
  },
};

export const CINEMA_TOOL_LIST: CinemaToolSpec[] = Object.values(CINEMA_TOOLS);

/**
 * Returns strictly compatible models from the catalog for a given Cinema Studio tool.
 * Guarantees we NEVER route an image task to a video model or an audio task to an image model.
 */
export function getCompatibleModelsForTool(
  toolId: CinemaToolId,
  allModels: ModelEntry[] = MODEL_CATALOG,
  overrideSurface?: Surface
): ModelEntry[] {
  const spec = CINEMA_TOOLS[toolId] || CINEMA_TOOLS.video_creation;
  const effectiveSurface: Surface =
    overrideSurface ||
    (spec.targetSurface === 'llm' ? 'image' : spec.targetSurface);

  // Filter strictly by surface first so we never mix incompatible surfaces
  const surfaceFiltered = allModels.filter((m) => m.surface === effectiveSurface);

  // If no overrideSurface was forced or if overrideSurface matches the tool's native surface, prioritize compatibleModelIds
  if (!overrideSurface || overrideSurface === spec.targetSurface) {
    const preferred = surfaceFiltered.filter((m) =>
      spec.compatibleModelIds.includes(m.id)
    );
    if (preferred.length > 0) {
      // Sort according to order in compatibleModelIds
      return preferred.sort(
        (a, b) =>
          spec.compatibleModelIds.indexOf(a.id) -
          spec.compatibleModelIds.indexOf(b.id)
      );
    }
  }

  return surfaceFiltered;
}

/**
 * Resolves a guaranteed compatible model for a specific task.
 */
export function resolveCompatibleModel(
  toolId: CinemaToolId,
  preferredModelId?: string,
  allModels: ModelEntry[] = MODEL_CATALOG,
  overrideSurface?: Surface
): ModelEntry {
  const compatible = getCompatibleModelsForTool(toolId, allModels, overrideSurface);
  if (preferredModelId) {
    const match = compatible.find((m) => m.id === preferredModelId);
    if (match) return match;
  }
  const spec = CINEMA_TOOLS[toolId] || CINEMA_TOOLS.video_creation;
  const defaultMatch = compatible.find((m) => m.id === spec.defaultModelId);
  return defaultMatch || compatible[0] || allModels[0];
}
