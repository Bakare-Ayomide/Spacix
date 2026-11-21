import { CinemaProductionType } from '../types/studio';

export type StoryStudioStage = 'script' | 'assets' | 'storyboard' | 'editor';

export type StoryAssetCategory =
  | 'Character'
  | 'Location'
  | 'Wardrobe'
  | 'B-Roll'
  | 'Prop';

export type CameraSetupTaxonomyId =
  | 'EWS'
  | 'WS'
  | 'MFS'
  | 'M2S'
  | 'CU'
  | 'ECU'
  | 'OTS'
  | 'R-OTS'
  | 'DUTCH'
  | 'POV-TRACK';

export interface CameraSetupTaxonomySpec {
  id: CameraSetupTaxonomyId;
  label: string;
  shortCode: string;
  category: string;
  focalLength: string;
  framingDescription: string;
  promptDirective: string;
}

export const CINEMATOGRAPHY_TAXONOMY: CameraSetupTaxonomySpec[] = [
  {
    id: 'EWS',
    label: 'Extreme Wide / Establishing',
    shortCode: 'EWS',
    category: 'Scale & Geography',
    focalLength: '18mm Anamorphic',
    framingDescription: 'Vast architectural or landscape framing anchoring environment scale and weather.',
    promptDirective: 'Extreme wide establishing cinema shot, 18mm anamorphic lens, deep horizon, volumetric atmospheric depth',
  },
  {
    id: 'WS',
    label: 'Wide Master Shot',
    shortCode: 'WS',
    category: 'Scene Blocking',
    focalLength: '24mm Prime',
    framingDescription: 'Full room or street blocking showing all characters in spatial relationship.',
    promptDirective: 'Wide master cinema shot, 24mm Cooke S4 lens, head-to-toe character blocking within environment',
  },
  {
    id: 'MFS',
    label: 'Medium Full / Cowboy Shot',
    shortCode: 'MFS',
    category: 'Action & Posture',
    focalLength: '35mm Prime',
    framingDescription: 'Knees-up framing ideal for kinetic movement, wardrobe silhouette, and hand props.',
    promptDirective: 'Medium-full knees-up cinema shot, 35mm Summilux lens, clear wardrobe and hand prop visibility',
  },
  {
    id: 'M2S',
    label: 'Medium Two-Shot',
    shortCode: 'M2S',
    category: 'Ensemble Interaction',
    focalLength: '40mm Anamorphic',
    framingDescription: 'Waist-up framing of two subjects sharing the frame in confrontation or dialogue.',
    promptDirective: 'Medium two-shot waist-up framing, 40mm anamorphic lens, balanced dual-subject lighting',
  },
  {
    id: 'CU',
    label: 'Close-Up Portrait',
    shortCode: 'CU',
    category: 'Intimacy & Emotion',
    focalLength: '85mm f/1.4',
    framingDescription: 'Tight facial framing isolating micro-expressions, eye catchlights, and emotional performance.',
    promptDirective: 'Intimate cinema close-up portrait, 85mm f/1.4 lens, shallow depth of field, oval bokeh, crisp eye catchlights',
  },
  {
    id: 'ECU',
    label: 'Extreme Close-Up / Macro Insert',
    shortCode: 'ECU',
    category: 'Tactile & B-Roll Detail',
    focalLength: '100mm Macro Probe',
    framingDescription: 'Hyper-detailed macro insert of eyes, trembling fingers, clockwork, or hero props.',
    promptDirective: 'Extreme close-up macro probe insert shot, Laowa 24mm/100mm macro, razor-thin focus, tactile surface texture',
  },
  {
    id: 'OTS',
    label: 'Over-The-Shoulder (OTS)',
    shortCode: 'OTS',
    category: 'Dialogue Coverage',
    focalLength: '50mm Prime',
    framingDescription: 'Framed past the foreground shoulder/head of Character A onto the face of Character B.',
    promptDirective: 'Over-the-shoulder dialogue cinema shot, 50mm lens, soft out-of-focus foreground shoulder, sharp focus on speaking subject',
  },
  {
    id: 'R-OTS',
    label: 'Reverse Over-The-Shoulder',
    shortCode: 'R-OTS',
    category: 'Dialogue Coverage',
    focalLength: '50mm Prime',
    framingDescription: '180-degree axis-matched reverse angle capturing the counter-reaction and dialogue reply.',
    promptDirective: 'Reverse over-the-shoulder cinema angle matching 180-degree eyeline axis, 50mm prime lens, dramatic key light',
  },
  {
    id: 'DUTCH',
    label: 'Dutch Tilt / Tension Angle',
    shortCode: 'DUTCH',
    category: 'Psychological Tension',
    focalLength: '28mm Prime',
    framingDescription: 'Canted 18-degree horizon roll signaling disorientation, danger, or psychological fracture.',
    promptDirective: 'Canted Dutch-angle cinema framing, 18-degree tilted horizon, 28mm wide prime, high-contrast noir tension lighting',
  },
  {
    id: 'POV-TRACK',
    label: 'POV / Push-In Tracking',
    shortCode: 'POV-TRACK',
    category: 'Subjective Kinetic',
    focalLength: '32mm Steadicam',
    framingDescription: 'First-person subjective perspective or slow dolly push-in toward the subject.',
    promptDirective: 'Subjective POV Steadicam push-in shot, 32mm lens, immersive forward depth movement',
  },
];

export interface StoryStudioAsset {
  id: string;
  name: string;
  category: StoryAssetCategory;
  description: string;
  visualPrompt: string;
  attributes: {
    // Character attributes
    physicalFeatures?: string;
    clothingAndAccessories?: string;
    backstory?: string;
    voiceAndLanguage?: string;
    // Location attributes
    architectureAndSetting?: string;
    timeOfDay?: string;
    weather?: string;
    // Wardrobe attributes
    fabricAndTexture?: string;
    tailoringAndEra?: string;
    wornByCharacter?: string;
    // B-Roll / Prop attributes
    tactileDetail?: string;
    materialFinish?: string;
  };
  referenceImageUrl: string;
  generatedImageUrl: string;
  turnaroundUrls: string[];
  sceneIds: string[];
  continuityRefId?: string;
  status: 'idle' | 'queued' | 'generating' | 'ready' | 'failed';
  updatedAt: string;
}

export interface StoryboardAngleCoverage {
  id: string;
  angleLabel: string;
  taxonomyId: CameraSetupTaxonomyId;
  cameraPrompt: string;
  imageUrl: string;
  videoUrl: string;
  motionIntensity: 'Subtle' | 'Moderate' | 'Dynamic';
  status: 'idle' | 'queued' | 'generating_image' | 'generating_video' | 'ready' | 'failed';
}

export interface StoryStudioFrame {
  id: string;
  sceneId: string;
  sceneNumber: number;
  sceneHeading: string;
  shotNumber: number;
  shotTitle: string;
  taxonomyId: CameraSetupTaxonomyId;
  actionDescription: string;
  dialogueSpeaker: string;
  dialogueParenthetical?: string;
  dialogueText: string;
  durationSec: number;
  linkedAssetIds: string[];
  activeAngleId: string;
  angles: StoryboardAngleCoverage[];
  motionIntensity: 'Subtle' | 'Moderate' | 'Dynamic';
  cameraRigDirective: string;
}

export interface VideoTimelineClip {
  id: string;
  track: 'V1' | 'V2' | 'A1' | 'A2';
  label: string;
  sourceType: 'frame' | 'asset' | 'audio';
  sourceId: string;
  mediaUrl: string;
  thumbnailUrl: string;
  startTimeSec: number;
  durationSec: number;
  trimInSec: number;
  trimOutSec: number;
  opacity: number; // 0..1
  volume: number; // 0..1
  muted: boolean;
  dialogueSubtitle?: string;
}

export interface StoryStudioProject {
  id: string;
  title: string;
  logline: string;
  productionType: CinemaProductionType;
  globalStyle: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '2.39:1';
  defaultImageModel: string;
  defaultVideoModel: string;
  fullMarkdown: string;
  assets: StoryStudioAsset[];
  frames: StoryStudioFrame[];
  timelineClips: VideoTimelineClip[];
  createdAt: string;
  updatedAt: string;
}

export interface StorageVaultSnapshot {
  id: string;
  projectId: string;
  timestamp: string;
  reason: string;
  sceneCount: number;
  assetCount: number;
  frameCount: number;
  clipCount: number;
  projectData: StoryStudioProject;
}

export interface ParsedScreenplayScene {
  sceneId: string;
  sceneNumber: number;
  slugline: string;
  intExt: 'INT.' | 'EXT.' | 'INT./EXT.';
  locationName: string;
  timeOfDay: string;
  characters: string[];
  dialogueBlocks: Array<{
    speaker: string;
    parenthetical?: string;
    text: string;
  }>;
  actionBlocks: string[];
  transitions: string[];
  brainstormNotes: string[];
  rawMarkdown: string;
}

export const GLOBAL_VISUAL_STYLES: Array<{
  id: string;
  label: string;
  directive: string;
}> = [
  {
    id: 'Anamorphic Cinema 2.39:1',
    label: 'Anamorphic Cinema 2.39:1 (Panavision C-Series)',
    directive:
      '2.39:1 theatrical anamorphic cinema frame, Panavision C-Series glass, subtle horizontal blue streak flare, Kodak Vision3 500T 5219 film grain, rich shadow density',
  },
  {
    id: 'Lagos Neon Realism',
    label: 'Lagos Neon & Rain Realism (ARRI Alexa 65)',
    directive:
      'ARRI Alexa 65 large-format cinema look, humid tropical night rain reflections, warm tungsten street vendor glow against cyan neon, natural skin tones, deep contrast',
  },
  {
    id: 'A24 Indie Naturalism',
    label: 'A24 Indie Naturalism (35mm Leica Summilux)',
    directive:
      'A24 naturalistic 35mm film still, soft golden-hour window light, organic halation, muted earthy color palette, intimate handheld framing',
  },
  {
    id: 'Cyberpunk Neo-Noir',
    label: 'Cyberpunk Neo-Noir (Cooke Anamorphic / SF)',
    directive:
      'High-contrast neo-noir sci-fi cinematography, volumetric rain mist, bioluminescent amber and teal rim lighting, wet asphalt specular reflections',
  },
  {
    id: 'IMAX 70mm Documentary',
    label: 'IMAX 70mm Expedition (Ultra-Crisp Optical)',
    directive:
      'IMAX 15-perf 70mm large-format clarity, zero distortion, razor-sharp micro-contrast, natural atmospheric sunlight',
  },
  {
    id: 'Commercial Luxury High-Key',
    label: 'Luxury Editorial & Product Cinema (Laowa Probe)',
    directive:
      'High-end commercial studio lighting, sculpted softbox rim highlights, raw travertine and brushed titanium textures, 1000fps phantom high-speed clarity',
  },
];

const SYNC_MIRROR_KEY = 'spacix_story_studio_mirror_v1';
const SYNC_PROJECTS_INDEX_KEY = 'spacix_story_studio_projects_index_v1';
const DB_NAME = 'SpacixStoryVaultDB';
const DB_VERSION = 1;
const MAX_SNAPSHOTS_PER_PROJECT = 40;

// ============================================================================
// 1. STABLE SCENE UUID INJECTION & MARKDOWN SCREENPLAY PARSER
// ============================================================================

function makeShortUuid(prefix = 'scene'): string {
  const rand = Math.random().toString(36).substring(2, 9);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}-${time}-${rand}`;
}

/**
 * Ensures every `### INT.` / `### EXT.` / `### INT./EXT.` scene heading line
 * contains a persistent `<!-- scene-id: ... -->` comment token.
 */
export function ensureStableSceneIds(markdown: string): {
  markdown: string;
  mutated: boolean;
} {
  const lines = markdown.split('\n');
  let mutated = false;
  const seenIds = new Set<string>();

  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    const isSlugline =
      /^###\s+(INT\.\/EXT\.|INT\.|EXT\.|I\/E\.)/i.test(trimmed) ||
      /^###\s+SCENE\b/i.test(trimmed);

    if (!isSlugline) return line;

    const existingMatch = line.match(/<!--\s*scene-id:\s*([a-zA-Z0-9_-]+)\s*-->/);
    if (existingMatch && existingMatch[1] && !seenIds.has(existingMatch[1])) {
      seenIds.add(existingMatch[1]);
      return line;
    }

    const cleanHeading = line.replace(/<!--\s*scene-id:\s*[a-zA-Z0-9_-]+\s*-->/g, '').trimEnd();
    const newId = makeShortUuid('scene');
    seenIds.add(newId);
    mutated = true;
    return `${cleanHeading} <!-- scene-id: ${newId} -->`;
  });

  return {
    markdown: mutated ? updatedLines.join('\n') : markdown,
    mutated,
  };
}

/**
 * Parses screenplay markdown into structured scenes with stable UUIDs,
 * characters, dialogue cues, parentheticals, action blocks, transitions, and notes.
 */
export function parseScreenplayScenes(markdown: string): ParsedScreenplayScene[] {
  const { markdown: normalized } = ensureStableSceneIds(markdown);
  const lines = normalized.split('\n');
  const scenes: ParsedScreenplayScene[] = [];

  let currentScene: ParsedScreenplayScene | null = null;
  let currentRawLines: string[] = [];
  let pendingSpeaker: string | null = null;
  let pendingParenthetical: string | undefined = undefined;

  const flushScene = () => {
    if (currentScene) {
      currentScene.rawMarkdown = currentRawLines.join('\n').trim();
      scenes.push(currentScene);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    const isSlugline =
      /^###\s+(INT\.\/EXT\.|INT\.|EXT\.|I\/E\.)/i.test(trimmed) ||
      /^###\s+SCENE\b/i.test(trimmed);

    if (isSlugline) {
      flushScene();
      const idMatch = rawLine.match(/<!--\s*scene-id:\s*([a-zA-Z0-9_-]+)\s*-->/);
      const sceneId = idMatch ? idMatch[1] : makeShortUuid('scene');
      const cleanSlug = trimmed
        .replace(/^###\s+/, '')
        .replace(/<!--\s*scene-id:\s*[a-zA-Z0-9_-]+\s*-->/g, '')
        .trim();

      let intExt: 'INT.' | 'EXT.' | 'INT./EXT.' = 'INT.';
      if (/^INT\.\/EXT\.|^I\/E\./i.test(cleanSlug)) intExt = 'INT./EXT.';
      else if (/^EXT\./i.test(cleanSlug)) intExt = 'EXT.';

      const withoutPrefix = cleanSlug
        .replace(/^(INT\.\/EXT\.|INT\.|EXT\.|I\/E\.)\s*/i, '')
        .trim();
      const dashParts = withoutPrefix.split(/\s+[-—–]\s+/);
      const locationName = (dashParts[0] || 'UNNAMED LOCATION').trim();
      const timeOfDay = (dashParts[1] || 'DAY').trim().toUpperCase();

      currentScene = {
        sceneId,
        sceneNumber: scenes.length + 1,
        slugline: cleanSlug,
        intExt,
        locationName,
        timeOfDay,
        characters: [],
        dialogueBlocks: [],
        actionBlocks: [],
        transitions: [],
        brainstormNotes: [],
        rawMarkdown: '',
      };
      currentRawLines = [rawLine];
      pendingSpeaker = null;
      pendingParenthetical = undefined;
      continue;
    }

    if (!currentScene) {
      // Ignore document title H1 before first scene, or create an opening scene if content starts immediately
      if (/^#\s+/.test(trimmed) || !trimmed) continue;
      currentScene = {
        sceneId: 'scene-prologue',
        sceneNumber: 1,
        slugline: 'EXT. PROLOGUE - DAY',
        intExt: 'EXT.',
        locationName: 'PROLOGUE',
        timeOfDay: 'DAY',
        characters: [],
        dialogueBlocks: [],
        actionBlocks: [],
        transitions: [],
        brainstormNotes: [],
        rawMarkdown: '',
      };
      currentRawLines = [];
    }

    currentRawLines.push(rawLine);

    if (!trimmed) {
      pendingSpeaker = null;
      pendingParenthetical = undefined;
      continue;
    }

    // Transition: ##### CUT TO:
    if (/^#####\s+/.test(trimmed) || /(CUT TO:|DISSOLVE TO:|SMASH CUT TO:|FADE OUT\.)$/i.test(trimmed)) {
      currentScene.transitions.push(trimmed.replace(/^#####\s+/, '').trim());
      pendingSpeaker = null;
      continue;
    }

    // Brainstorming blockquote: > note
    if (/^>\s*/.test(trimmed)) {
      currentScene.brainstormNotes.push(trimmed.replace(/^>\s*/, '').trim());
      continue;
    }

    // Character cue: `@CHARACTER` or `**CHARACTER**` or uppercase character cue line (2..28 chars)
    const explicitCharMatch =
      trimmed.match(/^@([A-Z][A-Z0-9\s.'-]{1,28})$/) ||
      trimmed.match(/^\*\*([A-Z][A-Z0-9\s.'-]{1,28})\*\*$/);

    const isAllCapsCue =
      !explicitCharMatch &&
      /^[A-Z][A-Z\s.'-]{1,24}(\s*\([A-Z.\s]+\))?$/.test(trimmed) &&
      !trimmed.endsWith('.') &&
      !trimmed.endsWith(':') &&
      trimmed.length <= 28;

    if (explicitCharMatch || isAllCapsCue) {
      const rawSpeaker = explicitCharMatch
        ? explicitCharMatch[1]
        : trimmed.replace(/\s*\(.*?\)\s*$/, '');
      const cleanSpeaker = rawSpeaker.trim().toUpperCase();
      pendingSpeaker = cleanSpeaker;
      pendingParenthetical = undefined;
      if (!currentScene.characters.includes(cleanSpeaker)) {
        currentScene.characters.push(cleanSpeaker);
      }
      continue;
    }

    // Parenthetical: (whispering)
    if (pendingSpeaker && /^\(.*\)$/.test(trimmed)) {
      pendingParenthetical = trimmed;
      continue;
    }

    // Dialogue line following a character cue
    if (pendingSpeaker) {
      currentScene.dialogueBlocks.push({
        speaker: pendingSpeaker,
        parenthetical: pendingParenthetical,
        text: trimmed.replace(/^["“]|["”]$/g, ''),
      });
      pendingSpeaker = null;
      pendingParenthetical = undefined;
      continue;
    }

    // Otherwise it's an Action / Description paragraph
    currentScene.actionBlocks.push(trimmed);
  }

  flushScene();
  return scenes;
}

// ============================================================================
// 2. AUTOMATIC ENTITY DISCOVERY (CHARACTERS, LOCATIONS, WARDROBE, B-ROLL, PROPS)
// ============================================================================

export function extractEntitiesFromScript(
  markdown: string,
  existingAssets: StoryStudioAsset[],
  globalStyle: string
): StoryStudioAsset[] {
  const scenes = parseScreenplayScenes(markdown);
  const byKey = new Map<string, StoryStudioAsset>();

  for (const asset of existingAssets) {
    byKey.set(`${asset.category}:${asset.name.toUpperCase()}`, { ...asset });
  }

  const upsertAsset = (
    category: StoryAssetCategory,
    name: string,
    sceneId: string,
    defaults: Partial<StoryStudioAsset>
  ) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const key = `${category}:${cleanName.toUpperCase()}`;
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.sceneIds.includes(sceneId)) {
        existing.sceneIds = [...existing.sceneIds, sceneId];
      }
      byKey.set(key, existing);
      return;
    }

    const newAsset: StoryStudioAsset = {
      id: makeShortUuid('ast'),
      name: cleanName,
      category,
      description: defaults.description || `${cleanName} (${category}) featured in screenplay.`,
      visualPrompt:
        defaults.visualPrompt ||
        `${cleanName}, ${category.toLowerCase()} concept sheet, ${globalStyle}`,
      attributes: defaults.attributes || {},
      referenceImageUrl: '',
      generatedImageUrl: '',
      turnaroundUrls: [],
      sceneIds: [sceneId],
      status: 'idle',
      updatedAt: new Date().toISOString(),
    };
    byKey.set(key, newAsset);
  };

  for (const scene of scenes) {
    // 1. Location Entity
    if (scene.locationName && scene.locationName !== 'PROLOGUE') {
      upsertAsset('Location', scene.locationName, scene.sceneId, {
        description: `${scene.intExt} ${scene.locationName} (${scene.timeOfDay}). ${
          scene.actionBlocks[0] || 'Primary filming environment.'
        }`,
        visualPrompt: `4-angle cinema location continuity sheet for ${scene.intExt} ${scene.locationName} at ${scene.timeOfDay}, wide architectural establishing view, reverse angle, atmospheric lighting, ${globalStyle}`,
        attributes: {
          architectureAndSetting: `${scene.intExt} ${scene.locationName}`,
          timeOfDay: scene.timeOfDay,
          weather: 'Cinematic Atmosphere',
        },
      });
    }

    // 2. Character Entities + Implied Wardrobe
    for (const charName of scene.characters) {
      const charContext =
        scene.actionBlocks.find((b) =>
          b.toUpperCase().includes(charName.toUpperCase())
        ) || `Lead character appearing in ${scene.locationName}.`;

      upsertAsset('Character', charName, scene.sceneId, {
        description: charContext,
        visualPrompt: `Character casting turnaround sheet for ${charName}: front portrait, 3/4 view, side profile, neutral expression, photorealistic skin texture, consistent facial identity, ${globalStyle}`,
        attributes: {
          physicalFeatures: 'Distinctive cinema lead facial structure, expressive eyes',
          clothingAndAccessories: `Signature ensemble worn in ${scene.locationName}`,
          backstory: charContext,
          voiceAndLanguage: 'English / Nigerian Pidgin / Multilingual',
        },
      });

      // Wardrobe look for character if mentioned in action
      const wardrobeMatch = charContext.match(
        /\b(suit|jacket|coat|agbada|kaftan|dress|trench|uniform|hoodie|armor|blazer|silk|leather)\b/i
      );
      if (wardrobeMatch) {
        const garmentWord = wardrobeMatch[1];
        const wardrobeTitle = `${charName}'s ${
          garmentWord.charAt(0).toUpperCase() + garmentWord.slice(1).toLowerCase()
        } Ensemble`;
        upsertAsset('Wardrobe', wardrobeTitle, scene.sceneId, {
          description: `Hero costume worn by ${charName} in ${scene.locationName}: ${charContext}`,
          visualPrompt: `Mannequin fashion editorial costume sheet for ${wardrobeTitle}, bespoke tailoring, fabric weave macro detail, studio rim lighting, ${globalStyle}`,
          attributes: {
            fabricAndTexture: `Bespoke ${garmentWord.toLowerCase()} with tactile weave`,
            tailoringAndEra: 'Contemporary Cinema Production',
            wornByCharacter: charName,
          },
        });
      }
    }

    // 3. B-Roll & Cutaways + Props discovery from Action paragraphs
    const fullActionText = scene.actionBlocks.join(' ');

    // B-Roll cues: `[B-ROLL: ...]` or atmospheric keywords
    const explicitBrollMatches = fullActionText.matchAll(/\[B-ROLL:\s*([^\]]+)\]/gi);
    for (const match of explicitBrollMatches) {
      const brollLabel = match[1].trim();
      upsertAsset('B-Roll', brollLabel, scene.sceneId, {
        description: `Tactile cutaway insert in ${scene.locationName}: ${brollLabel}`,
        visualPrompt: `Extreme close-up macro B-roll cutaway of ${brollLabel}, shallow depth of field, atmospheric lighting, ${globalStyle}`,
        attributes: {
          tactileDetail: brollLabel,
        },
      });
    }

    // Automatic atmospheric B-Roll extraction if scene has rich visual cues
    const brollPatterns: Array<{ regex: RegExp; title: string; detail: string }> = [
      {
        regex: /\b(neon|rain|wet asphalt|puddle|reflection)\b/i,
        title: `${scene.locationName} Neon Rain Reflections`,
        detail: 'Macro cutaway of rain droplets rippling across neon-lit asphalt',
      },
      {
        regex: /\b(coffee|espresso|steam|teacup|glass)\b/i,
        title: 'Rising Steam & Glass Condensation Insert',
        detail: '100mm macro insert of warm steam curling in tungsten backlight',
      },
      {
        regex: /\b(clock|watch|chronograph|gears|ticking)\b/i,
        title: 'Chronograph Escapement Macro Cutaway',
        detail: 'Laowa probe macro insert of mechanical gears ticking in sync',
      },
      {
        regex: /\b(trembling hands|fingers|knuckles|pulse)\b/i,
        title: 'Trembling Hands Close-Up Insert',
        detail: 'Tight tactile insert on fingers gripping the edge under tension',
      },
    ];

    for (const pat of brollPatterns) {
      if (pat.regex.test(fullActionText)) {
        upsertAsset('B-Roll', pat.title, scene.sceneId, {
          description: pat.detail,
          visualPrompt: `${pat.detail}, 100mm macro cinema lens, ${globalStyle}`,
          attributes: {
            tactileDetail: pat.detail,
          },
        });
      }
    }

    // Props extraction: `[PROP: ...]` or key physical nouns
    const explicitPropMatches = fullActionText.matchAll(/\[PROP:\s*([^\]]+)\]/gi);
    for (const match of explicitPropMatches) {
      const propLabel = match[1].trim();
      upsertAsset('Prop', propLabel, scene.sceneId, {
        description: `Key story prop in ${scene.locationName}: ${propLabel}`,
        visualPrompt: `Clean studio hero prop product photography of ${propLabel} on dark slate surface, crisp rim lighting, ${globalStyle}`,
        attributes: {
          materialFinish: 'Hero production prop finish',
        },
      });
    }

    const propKeywords: Array<{ regex: RegExp; name: string; desc: string }> = [
      {
        regex: /\b(briefcase|ledger|hard drive|encrypted drive|dossier)\b/i,
        name: 'Encrypted Titanium Ledger Drive',
        desc: 'Brushed titanium field drive with biometric status LED',
      },
      {
        regex: /\b(vintage car|mercedes|suv|motorcycle|sedan|coupe)\b/i,
        name: 'Matte-Black Hero Vehicle',
        desc: 'Hero production vehicle with rain-streaked bodywork and warm headlamps',
      },
      {
        regex: /\b(phone|communicator|transceiver|walkie|terminal)\b/i,
        name: 'Tactical Field Transceiver',
        desc: 'OLED glass communicator showing live telemetry waveform',
      },
    ];

    for (const pk of propKeywords) {
      if (pk.regex.test(fullActionText)) {
        upsertAsset('Prop', pk.name, scene.sceneId, {
          description: pk.desc,
          visualPrompt: `Hero prop studio photography of ${pk.name}, ${pk.desc}, ${globalStyle}`,
          attributes: {
            materialFinish: pk.desc,
          },
        });
      }
    }
  }

  return Array.from(byKey.values());
}

// ============================================================================
// 3. AUTOMATED SCENE SHOT BREAKDOWN TO MULTI-ANGLE STORYBOARD FRAMES
// ============================================================================

export function autoBreakdownScenesToFrames(
  markdown: string,
  assets: StoryStudioAsset[],
  existingFrames: StoryStudioFrame[],
  globalStyle: string
): StoryStudioFrame[] {
  const scenes = parseScreenplayScenes(markdown);
  const frames: StoryStudioFrame[] = [];
  let globalShotCounter = 1;

  for (const scene of scenes) {
    const sceneAssets = assets.filter((a) => a.sceneIds.includes(scene.sceneId));
    const sceneAssetIds = sceneAssets.map((a) => a.id);

    // 1. Establishing / Master Shot for the Scene
    const masterFrameId =
      existingFrames.find(
        (f) => f.sceneId === scene.sceneId && f.shotNumber === 1
      )?.id || makeShortUuid('frm');

    const masterAngles: StoryboardAngleCoverage[] = [
      {
        id: `${masterFrameId}-ang-ws`,
        angleLabel: 'Wide Master',
        taxonomyId: 'EWS',
        cameraPrompt: `${scene.slugline}. ${
          scene.actionBlocks[0] || 'Establishing wide master shot of the environment.'
        } Extreme wide 18mm anamorphic establishing frame, ${globalStyle}`,
        imageUrl: '',
        videoUrl: '',
        motionIntensity: 'Subtle',
        status: 'idle',
      },
      {
        id: `${masterFrameId}-ang-med`,
        angleLabel: 'Medium Blocking',
        taxonomyId: 'MFS',
        cameraPrompt: `${scene.slugline}. ${
          scene.actionBlocks[0] || 'Medium blocking shot of characters entering.'
        } 35mm medium-full shot, ${globalStyle}`,
        imageUrl: '',
        videoUrl: '',
        motionIntensity: 'Moderate',
        status: 'idle',
      },
      {
        id: `${masterFrameId}-ang-ecu`,
        angleLabel: 'Macro B-Roll Cutaway',
        taxonomyId: 'ECU',
        cameraPrompt: `Atmospheric macro B-roll detail inside ${scene.locationName} (${scene.timeOfDay}), 100mm macro probe lens, shallow depth of field, ${globalStyle}`,
        imageUrl: '',
        videoUrl: '',
        motionIntensity: 'Subtle',
        status: 'idle',
      },
    ];

    // Preserve any already-generated media from existing frame
    const prevMaster = existingFrames.find((f) => f.id === masterFrameId);
    const mergedMasterAngles = prevMaster ? prevMaster.angles : masterAngles;

    frames.push({
      id: masterFrameId,
      sceneId: scene.sceneId,
      sceneNumber: scene.sceneNumber,
      sceneHeading: scene.slugline,
      shotNumber: globalShotCounter++,
      shotTitle: `${scene.locationName} — Establishing Master`,
      taxonomyId: 'EWS',
      actionDescription:
        scene.actionBlocks[0] ||
        `Camera establishes ${scene.intExt} ${scene.locationName} during ${scene.timeOfDay}.`,
      dialogueSpeaker: '',
      dialogueText: '',
      durationSec: 5,
      linkedAssetIds: sceneAssetIds,
      activeAngleId: mergedMasterAngles[0]?.id || `${masterFrameId}-ang-ws`,
      angles: mergedMasterAngles,
      motionIntensity: 'Subtle',
      cameraRigDirective: 'Slow Steadicam pedestal push-in across environment',
    });

    // 2. Dialogue & Action Coverage Shots per Scene
    scene.dialogueBlocks.forEach((dlg, idx) => {
      const shotId =
        existingFrames.find(
          (f) =>
            f.sceneId === scene.sceneId &&
            f.dialogueSpeaker === dlg.speaker &&
            f.dialogueText === dlg.text
        )?.id || makeShortUuid('frm');

      const primaryTax: CameraSetupTaxonomyId = idx % 2 === 0 ? 'OTS' : 'CU';
      const charAsset = assets.find(
        (a) =>
          a.category === 'Character' &&
          a.name.toUpperCase() === dlg.speaker.toUpperCase()
      );
      const locAsset = assets.find(
        (a) =>
          a.category === 'Location' &&
          a.name.toUpperCase() === scene.locationName.toUpperCase()
      );
      const linkedIds = [charAsset?.id, locAsset?.id].filter(Boolean) as string[];

      const defaultAngles: StoryboardAngleCoverage[] = [
        {
          id: `${shotId}-ang-cu`,
          angleLabel: 'Close-Up Performance',
          taxonomyId: 'CU',
          cameraPrompt: `Close-up 85mm portrait of ${dlg.speaker} in ${scene.locationName} (${scene.timeOfDay}), ${
            dlg.parenthetical || 'delivering intense dialogue'
          }: "${dlg.text}", ${globalStyle}`,
          imageUrl: charAsset?.generatedImageUrl || charAsset?.referenceImageUrl || '',
          videoUrl: '',
          motionIntensity: 'Moderate',
          status: charAsset?.generatedImageUrl ? 'ready' : 'idle',
        },
        {
          id: `${shotId}-ang-ots`,
          angleLabel: 'Over-The-Shoulder',
          taxonomyId: 'OTS',
          cameraPrompt: `Over-the-shoulder 50mm dialogue coverage onto ${dlg.speaker} inside ${scene.locationName}, speaking "${dlg.text}", ${globalStyle}`,
          imageUrl: '',
          videoUrl: '',
          motionIntensity: 'Subtle',
          status: 'idle',
        },
        {
          id: `${shotId}-ang-rots`,
          angleLabel: 'Reverse OTS',
          taxonomyId: 'R-OTS',
          cameraPrompt: `Reverse 180-degree axis angle capturing listener reaction to ${dlg.speaker} in ${scene.locationName}, ${globalStyle}`,
          imageUrl: '',
          videoUrl: '',
          motionIntensity: 'Subtle',
          status: 'idle',
        },
      ];

      const prevShot = existingFrames.find((f) => f.id === shotId);
      const finalAngles = prevShot ? prevShot.angles : defaultAngles;

      frames.push({
        id: shotId,
        sceneId: scene.sceneId,
        sceneNumber: scene.sceneNumber,
        sceneHeading: scene.slugline,
        shotNumber: globalShotCounter++,
        shotTitle: `${dlg.speaker} Dialogue Coverage`,
        taxonomyId: primaryTax,
        actionDescription:
          scene.actionBlocks[idx + 1] ||
          `${dlg.speaker} delivers dialogue ${dlg.parenthetical || ''} in ${scene.locationName}.`,
        dialogueSpeaker: dlg.speaker,
        dialogueParenthetical: dlg.parenthetical,
        dialogueText: dlg.text,
        durationSec: 5,
        linkedAssetIds: linkedIds.length > 0 ? linkedIds : sceneAssetIds,
        activeAngleId: finalAngles[0]?.id || `${shotId}-ang-cu`,
        angles: finalAngles,
        motionIntensity: 'Moderate',
        cameraRigDirective: 'Subtle 85mm breathing focus pull on speaker eyes',
      });
    });
  }

  return frames;
}

// ============================================================================
// 4. DEFAULT SEED SCREENPLAY PROJECT (WHEN VAULT IS EMPTY)
// ============================================================================

export const DEFAULT_STORY_STUDIO_MARKDOWN = `# ECHOES OF EKO ATLANTIC

> High-stakes neo-noir thriller set across flooded neon causeways and acoustic glass towers in Lagos.

### EXT. EKO ATLANTIC CAUSEWAY - NIGHT <!-- scene-id: scene-eko-01 -->

 sheets of tropical rain hammer the matte-black coupe idling above the seawall. Neon reflections ripple across wet asphalt. [B-ROLL: Rain droplets rippling across cyan neon asphalt]

@AMARA
(into encrypted transceiver, hushed)
The coastal telemetry ledger wasn't erased. Someone moved the master drive inside the conservatory tower before the seawall locked.

Amara checks the [PROP: Encrypted Titanium Ledger Drive] glowing amber on the passenger console.

##### CUT TO:

### INT. CONSERVATORY ATRIUM TOWER - NIGHT <!-- scene-id: scene-eko-02 -->

Towering botanical ferns mist under sodium security beams. KEMI stands beside a glass monolith terminal wearing a tailored midnight agbada trench coat. [B-ROLL: Rising steam and glass condensation on terminal]

@KEMI
(turning calmly)
You crossed three flooded checkpoints for a drive that only unlocks with two voices, Amara.

@AMARA
(stepping into the key light)
Then it's a good thing I brought the original recording.

##### DISSOLVE TO:
`;

export function createDefaultStoryStudioProject(
  title = 'Echoes of Eko Atlantic',
  productionType: CinemaProductionType = 'Movies'
): StoryStudioProject {
  const globalStyle = GLOBAL_VISUAL_STYLES[0].directive;
  const { markdown } = ensureStableSceneIds(DEFAULT_STORY_STUDIO_MARKDOWN);
  const assets = extractEntitiesFromScript(markdown, [], globalStyle);
  const frames = autoBreakdownScenesToFrames(markdown, assets, [], globalStyle);

  return {
    id: makeShortUuid('story'),
    title,
    logline:
      'An acoustic forensic investigator and a rogue architect confront a city-scale cover-up during a coastal storm.',
    productionType,
    globalStyle,
    aspectRatio: '16:9',
    defaultImageModel: 'nano-banana-2-1',
    defaultVideoModel: 'seedance-2-5',
    fullMarkdown: markdown,
    assets,
    frames,
    timelineClips: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// 5. SYNCHRONOUS LOCAL MIRROR + INDEXEDDB ACID VAULT + SNAPSHOT ROLLBACK
// ============================================================================

export function writeSyncMirror(project: StoryStudioProject): void {
  try {
    const stamped = { ...project, updatedAt: new Date().toISOString() };
    localStorage.setItem(SYNC_MIRROR_KEY, JSON.stringify(stamped));

    const rawIndex = localStorage.getItem(SYNC_PROJECTS_INDEX_KEY);
    const list: StoryStudioProject[] = rawIndex ? JSON.parse(rawIndex) : [];
    const idx = list.findIndex((p) => p.id === stamped.id);
    if (idx >= 0) {
      list[idx] = stamped;
    } else {
      list.unshift(stamped);
    }
    localStorage.setItem(SYNC_PROJECTS_INDEX_KEY, JSON.stringify(list.slice(0, 25)));
  } catch {
    // Ignore storage quota errors in restricted private browsing
  }
}

export function readSyncMirror(): StoryStudioProject | null {
  try {
    const raw = localStorage.getItem(SYNC_MIRROR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoryStudioProject;
    if (parsed && parsed.id && typeof parsed.fullMarkdown === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function readAllProjectsFromSyncMirror(): StoryStudioProject[] {
  try {
    const raw = localStorage.getItem(SYNC_PROJECTS_INDEX_KEY);
    if (!raw) {
      const single = readSyncMirror();
      return single ? [single] : [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function openVaultIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          const snapStore = db.createObjectStore('snapshots', { keyPath: 'id' });
          snapStore.createIndex('by_project', 'projectId', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveProjectToVault(
  project: StoryStudioProject,
  snapshotReason?: string
): Promise<void> {
  writeSyncMirror(project);
  const db = await openVaultIdb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(['projects', 'snapshots'], 'readwrite');
      const projStore = tx.objectStore('projects');
      projStore.put({ ...project, updatedAt: new Date().toISOString() });

      if (snapshotReason) {
        const snapStore = tx.objectStore('snapshots');
        const scenes = parseScreenplayScenes(project.fullMarkdown);
        const snap: StorageVaultSnapshot = {
          id: makeShortUuid('snap'),
          projectId: project.id,
          timestamp: new Date().toISOString(),
          reason: snapshotReason,
          sceneCount: scenes.length,
          assetCount: project.assets.length,
          frameCount: project.frames.length,
          clipCount: project.timelineClips.length,
          projectData: JSON.parse(JSON.stringify(project)),
        };
        snapStore.put(snap);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function listProjectsFromVault(): Promise<StoryStudioProject[]> {
  const mirrorList = readAllProjectsFromSyncMirror();
  const db = await openVaultIdb();
  if (!db) return mirrorList;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const req = store.getAll();
      req.onsuccess = () => {
        const idbList = (req.result || []) as StoryStudioProject[];
        const mergedMap = new Map<string, StoryStudioProject>();
        for (const p of [...mirrorList, ...idbList]) {
          const existing = mergedMap.get(p.id);
          if (!existing || p.updatedAt >= existing.updatedAt) {
            mergedMap.set(p.id, p);
          }
        }
        const sorted = Array.from(mergedMap.values()).sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        );
        resolve(sorted);
      };
      req.onerror = () => resolve(mirrorList);
    } catch {
      resolve(mirrorList);
    }
  });
}

export async function deleteProjectFromVault(projectId: string): Promise<void> {
  try {
    const list = readAllProjectsFromSyncMirror().filter((p) => p.id !== projectId);
    localStorage.setItem(SYNC_PROJECTS_INDEX_KEY, JSON.stringify(list));
    const current = readSyncMirror();
    if (current?.id === projectId) {
      if (list[0]) {
        localStorage.setItem(SYNC_MIRROR_KEY, JSON.stringify(list[0]));
      } else {
        localStorage.removeItem(SYNC_MIRROR_KEY);
      }
    }
  } catch {
    // ignore
  }

  const db = await openVaultIdb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(['projects'], 'readwrite');
      tx.objectStore('projects').delete(projectId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function listSnapshotsFromVault(
  projectId: string
): Promise<StorageVaultSnapshot[]> {
  const db = await openVaultIdb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction('snapshots', 'readonly');
      const store = tx.objectStore('snapshots');
      const index = store.index('by_project');
      const req = index.getAll(projectId);
      req.onsuccess = () => {
        const rows = ((req.result || []) as StorageVaultSnapshot[]).sort((a, b) =>
          b.timestamp.localeCompare(a.timestamp)
        );
        resolve(rows.slice(0, MAX_SNAPSHOTS_PER_PROJECT));
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

// ============================================================================
// 6. PORTABLE JSON PROJECT ARCHIVE EXPORT & IMPORT
// ============================================================================

export function exportPortableProjectArchive(project: StoryStudioProject): void {
  const payload = {
    schema: 'spacix.story-studio.archive.v1',
    exportedAt: new Date().toISOString(),
    project,
  };
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  a.href = url;
  a.download = `${safeName || 'story-studio-project'}.spacix.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function parsePortableProjectArchive(rawJson: string): StoryStudioProject {
  const parsed = JSON.parse(rawJson);
  const proj: StoryStudioProject = parsed.project ? parsed.project : parsed;
  if (!proj || typeof proj.fullMarkdown !== 'string') {
    throw new Error('Invalid Story Studio archive JSON format.');
  }
  const { markdown } = ensureStableSceneIds(proj.fullMarkdown);
  return {
    ...proj,
    id: proj.id || makeShortUuid('story'),
    title: proj.title || 'Imported Story Project',
    fullMarkdown: markdown,
    assets: Array.isArray(proj.assets) ? proj.assets : [],
    frames: Array.isArray(proj.frames) ? proj.frames : [],
    timelineClips: Array.isArray(proj.timelineClips) ? proj.timelineClips : [],
    updatedAt: new Date().toISOString(),
  };
}
