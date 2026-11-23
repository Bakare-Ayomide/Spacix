import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Check,
  CheckCircle2,
  Clapperboard,
  Download,
  Edit3,
  FileText,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  Mic,
  Music,
  Package,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Shirt,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Video,
  Volume2,
  Wand2,
} from 'lucide-react';
import { useRuns } from '../lib/useRuns';
import {
  CinemaProductionType,
  MediaSlotInput,
  SupportedCharacterLanguage,
  UniversalCreativeControlsState,
} from '../types/studio';
import {
  getCompatibleModelsForTool,
  resolveCompatibleModel,
} from '../catalog/modelCapabilities';
import {
  Badge,
  Button,
  Input,
  Progress,
  Textarea,
} from './ui/primitives';
import {
  AnimatedPillTabs,
  BorderBeam,
  ShimmerButton,
  SpotlightCard,
} from './ui/aceternity-magic';
import { GearVisual } from './GearVisual';
import {
  getCameraAngleVisual,
  getCameraMovementVisual,
  getLensOpticVisual,
} from '../catalog/cinemaGearVisuals';
import { UniversalCreativeControlsBar } from './UniversalCreativeControlsBar';
import {
  buildCharacterTurnaroundPrompt,
  CHARACTER_TURNAROUND_ASPECT_RATIO,
} from '../lib/characterTurnaround';
import { translateCreativeControlsForModel } from '../lib/creativeControlsTranslator';
import {
  MultiTrackTimelineEditor,
  TimelineClipItem,
  TimelineTrackConfig,
} from './MultiTrackTimelineEditor';

export type AutoProdStageId = 1 | 2 | 3 | 4;

export interface AutoProdDialogueLine {
  id: string;
  sceneId: string;
  speaker: string;
  parenthetical: string;
  line: string;
  kind: 'dialogue' | 'narration';
}

export interface AutoProdScene {
  sceneId: string;
  sceneNumber: number;
  heading: string;
  settingType: 'INT.' | 'EXT.' | 'INT./EXT.';
  locationName: string;
  timeOfDay: 'Day' | 'Night' | 'Dawn' | 'Golden Hour' | 'Sunset';
  actions: string;
  dialogueLines: AutoProdDialogueLine[];
  charactersInScene: string[];
  propsInScene: string[];
  wardrobesInScene: string[];
  sfxCues?: string[];
  ambienceCues?: string[];
  musicCues?: string[];
  productionNotes: string;
}

export interface AutoProdCharacterBio {
  name: string;
  role?: string;
  ethnicity?: string;
  skinTone?: string;
  gender?: string;
  ageRange?: string;
  facialStructure?: string;
  bodyType?: string;
  hairstyle?: string;
  clothing?: string;
  personality?: string;
  voiceDescription?: string;
  language?: SupportedCharacterLanguage;
  accentDialect?: string;
}

export interface AutoProdAsset {
  id: string;
  category: 'Character' | 'Location' | 'Wardrobe' | 'Prop' | 'Voice';
  name: string;
  sceneRefs: string[];
  characterRef?: string;
  description: string;
  generationPrompt: string;
  modelId: string;
  outputUrl: string;
  outputKind: 'image' | 'audio';
  status: 'idle' | 'generating' | 'ready' | 'approved' | 'error';
  language?: SupportedCharacterLanguage;
  voicePersona?: string;
  audioKind?: 'dialogue' | 'narration' | 'sfx' | 'ambience' | 'music';
  accentDialect?: string;
  emotion?: string;
  speakingStyle?: string;
  characterBio?: AutoProdCharacterBio;
  reusedElementId?: string;
  error?: string;
}

export interface AutoProdStoryboardShot {
  id: string;
  sceneId: string;
  sceneHeading: string;
  shotNumber: string;
  cameraFraming:
    | 'Wide Establishing'
    | 'Medium Wide'
    | 'Medium Two-Shot'
    | 'Close-Up'
    | 'Extreme Close-Up'
    | 'Over-the-Shoulder'
    | 'Reverse Shot'
    | 'Low-Angle Hero'
    | 'POV';
  cameraMovement: string;
  lens: string;
  lighting: string;
  timeOfDay?: string;
  wardrobeName?: string;
  characterNames: string[];
  characterPositioning: string;
  actionDescription: string;
  editInstruction?: string;
  emotion: string;
  dialogueOrNarration: string;
  speaker: string;
  locationName: string;
  imageModelId: string;
  frameImageUrl: string;
  frameStatus: 'idle' | 'generating' | 'ready' | 'approved' | 'error';
  frameError?: string;
  videoModelId: string;
  videoClipUrl: string;
  videoDurationSec: number;
  aspectRatio?: '16:9' | '21:9' | '9:16' | '1:1' | '4:3' | '3:4';
  videoStatus: 'idle' | 'generating' | 'ready' | 'error';
  videoError?: string;
  creativeControlsOverride?: UniversalCreativeControlsState;
}

export interface AutoProdProjectState {
  title: string;
  ideaDescription: string;
  productionFormat: CinemaProductionType;
  aspectRatio: '16:9' | '21:9' | '9:16' | '1:1' | '4:3' | '3:4';
  creativeInstructions: string;
  referenceNotes: string;
  referenceUrls: Array<{ id: string; label: string; url: string; kind: 'image' | 'video' | 'doc' }>;
  screenplayMarkdown: string;
  screenplayApproved: boolean;
  scenes: AutoProdScene[];
  assets: AutoProdAsset[];
  assetsApproved: boolean;
  shots: AutoProdStoryboardShot[];
  storyboardApproved: boolean;
  soundtrackUrl: string;
  soundtrackPrompt: string;
  soundtrackModelId: string;
  timelineTracks?: TimelineTrackConfig[];
  timelineClips?: TimelineClipItem[];
  updatedAt: string;
}

const STORAGE_KEY = 'spacix_cinema_auto_production_v1';

const CAMERA_FRAMING_OPTIONS: AutoProdStoryboardShot['cameraFraming'][] = [
  'Wide Establishing',
  'Medium Wide',
  'Medium Two-Shot',
  'Close-Up',
  'Extreme Close-Up',
  'Over-the-Shoulder',
  'Reverse Shot',
  'Low-Angle Hero',
  'POV',
];

const CAMERA_MOVEMENT_OPTIONS = [
  'Static Locked',
  'Dolly in',
  'Dolly out',
  'Tracking shot',
  'Crane up',
  'Pan left',
  'Tilt up',
  'Rack focus',
  'Orbit 360',
  'Snorricam',
];

function extractCharacterBiosFromMarkdown(markdown: string): Map<string, AutoProdCharacterBio> {
  const bios = new Map<string, AutoProdCharacterBio>();
  const lines = markdown.split(/\r?\n/);
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('>')) continue;
    const match = trimmed.match(/^>\s*CHARACTER:\s*@?([A-Za-z0-9_ -]+)\s*\|(.*)$/i);
    if (!match) continue;
    const name = match[1].trim().toUpperCase();
    const fields = match[2].split('|').map((s) => s.trim());
    const bio: AutoProdCharacterBio = { name };
    for (const f of fields) {
      const idx = f.indexOf(':');
      if (idx === -1) continue;
      const key = f.slice(0, idx).trim().toLowerCase();
      const val = f.slice(idx + 1).trim();
      if (key.includes('role')) bio.role = val;
      else if (key.includes('ethnicity') || key.includes('culture')) bio.ethnicity = val;
      else if (key.includes('skin')) bio.skinTone = val;
      else if (key.includes('gender')) bio.gender = val;
      else if (key.includes('age')) bio.ageRange = val;
      else if (key.includes('facial')) bio.facialStructure = val;
      else if (key.includes('body')) bio.bodyType = val;
      else if (key.includes('hair')) bio.hairstyle = val;
      else if (key.includes('cloth') || key.includes('costume') || key.includes('wardrobe')) bio.clothing = val;
      else if (key.includes('person') || key.includes('mood')) bio.personality = val;
      else if (key.includes('voice')) bio.voiceDescription = val;
      else if (key.includes('lang')) bio.language = val as SupportedCharacterLanguage;
      else if (key.includes('accent') || key.includes('dialect')) bio.accentDialect = val;
    }
    bios.set(name, bio);
  }
  return bios;
}

function parseMarkdownToStructuredScenes(markdown: string): AutoProdScene[] {
  const lines = markdown.split(/\r?\n/);
  const scenes: AutoProdScene[] = [];
  let current: AutoProdScene | null = null;
  let pendingSpeaker = '';
  let pendingParenthetical = '';

  const flushCurrent = () => {
    if (current) {
      scenes.push(current);
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('# ')) continue;

    // Scene heading: ### INT. LOCATION - NIGHT <!-- scene-id: scene-01 -->
    if (trimmed.startsWith('### ')) {
      flushCurrent();
      const idMatch = trimmed.match(/<!--\s*scene-id:\s*([^\s>]+)\s*-->/i);
      const cleanHeading = trimmed
        .replace(/^###\s+/, '')
        .replace(/<!--.*?-->/g, '')
        .trim();

      const settingType: 'INT.' | 'EXT.' | 'INT./EXT.' = cleanHeading.startsWith('INT./EXT.')
        ? 'INT./EXT.'
        : cleanHeading.startsWith('INT.')
        ? 'INT.'
        : 'EXT.';

      const withoutPrefix = cleanHeading.replace(/^(INT\.\/EXT\.|INT\.|EXT\.)\s*/i, '');
      const parts = withoutPrefix.split(/\s+-\s+/);
      const locationName = (parts[0] || 'MAIN SOUNDSTAGE').trim();
      const rawTime = (parts[1] || 'NIGHT').toUpperCase();
      const timeOfDay: AutoProdScene['timeOfDay'] = rawTime.includes('DAWN')
        ? 'Dawn'
        : rawTime.includes('GOLD')
        ? 'Golden Hour'
        : rawTime.includes('SUNSET') || rawTime.includes('DUSK')
        ? 'Sunset'
        : rawTime.includes('DAY')
        ? 'Day'
        : 'Night';

      current = {
        sceneId: idMatch?.[1] || `scene-0${scenes.length + 1}`,
        sceneNumber: scenes.length + 1,
        heading: cleanHeading,
        settingType,
        locationName,
        timeOfDay,
        actions: '',
        dialogueLines: [],
        charactersInScene: [],
        propsInScene: [],
        wardrobesInScene: [],
        sfxCues: [],
        ambienceCues: [],
        musicCues: [],
        productionNotes: '',
      };
      pendingSpeaker = '';
      pendingParenthetical = '';
      continue;
    }

    if (!current) continue;

    if (trimmed.startsWith('#####')) continue;

    if (trimmed.startsWith('>')) {
      const note = trimmed.replace(/^>\s*/, '');
      current.productionNotes = current.productionNotes
        ? `${current.productionNotes} | ${note}`
        : note;
      continue;
    }

    // Character cue on its own line: @AMARA
    if (/^@[A-Z0-9_ -]{2,30}$/i.test(trimmed)) {
      pendingSpeaker = trimmed.slice(1).trim().toUpperCase();
      pendingParenthetical = '';
      if (!current.charactersInScene.includes(pendingSpeaker)) {
        current.charactersInScene.push(pendingSpeaker);
      }
      continue;
    }

    if (pendingSpeaker && trimmed.startsWith('(') && trimmed.endsWith(')')) {
      pendingParenthetical = trimmed.slice(1, -1).trim();
      continue;
    }

    if (pendingSpeaker) {
      current.dialogueLines.push({
        id: `dlg_${current.sceneId}_${current.dialogueLines.length + 1}`,
        sceneId: current.sceneId,
        speaker: pendingSpeaker,
        parenthetical: pendingParenthetical || 'natural delivery',
        // Copy exact verbatim dialogue from screenplay — never alter or truncate
        line: rawLine.trim(),
        kind: pendingSpeaker === 'NARRATOR' || pendingSpeaker === 'V.O.' ? 'narration' : 'dialogue',
      });
      pendingSpeaker = '';
      pendingParenthetical = '';
      continue;
    }

    // Action line: extract inline @CHARACTER, [PROP: ...], [WARDROBE: ...], [SFX: ...], [AMBIENCE: ...], [MUSIC: ...]
    const charMatches = trimmed.matchAll(/@([A-Za-z0-9_]+)/g);
    for (const m of charMatches) {
      const cname = m[1].toUpperCase();
      if (!current.charactersInScene.includes(cname)) {
        current.charactersInScene.push(cname);
      }
    }

    const propMatches = trimmed.matchAll(/\[PROP:\s*([^\]]+)\]/gi);
    for (const m of propMatches) {
      const pname = m[1].trim();
      if (pname && !current.propsInScene.includes(pname)) {
        current.propsInScene.push(pname);
      }
    }

    const wardMatches = trimmed.matchAll(/\[WARDROBE:\s*([^\]]+)\]/gi);
    for (const m of wardMatches) {
      const wname = m[1].trim();
      if (wname && !current.wardrobesInScene.includes(wname)) {
        current.wardrobesInScene.push(wname);
      }
    }

    const sfxMatches = trimmed.matchAll(/\[SFX:\s*([^\]]+)\]/gi);
    for (const m of sfxMatches) {
      const cue = m[1].trim();
      if (cue && current.sfxCues && !current.sfxCues.includes(cue)) {
        current.sfxCues.push(cue);
      }
    }

    const ambMatches = trimmed.matchAll(/\[AMBIENCE:\s*([^\]]+)\]/gi);
    for (const m of ambMatches) {
      const cue = m[1].trim();
      if (cue && current.ambienceCues && !current.ambienceCues.includes(cue)) {
        current.ambienceCues.push(cue);
      }
    }

    const musMatches = trimmed.matchAll(/\[MUSIC:\s*([^\]]+)\]/gi);
    for (const m of musMatches) {
      const cue = m[1].trim();
      if (cue && current.musicCues && !current.musicCues.includes(cue)) {
        current.musicCues.push(cue);
      }
    }

    current.actions = current.actions ? `${current.actions} ${trimmed}` : trimmed;
  }

  flushCurrent();
  return scenes;
}

function buildAssetsFromScenes(
  scenes: AutoProdScene[],
  existingAssets: AutoProdAsset[],
  markdown = '',
  reusableLibrary?: {
    characters?: Array<{ id: string; name: string; faceReferenceUrl?: string; roleTitle?: string; primaryLanguage?: SupportedCharacterLanguage; speechAccent?: string; distinctiveFeatures?: string }>;
    locations?: Array<{ id: string; name: string; primaryImageUrl?: string; description?: string }>;
    wardrobes?: Array<{ id: string; name: string; referenceImageUrl?: string; garments?: string }>;
    props?: Array<{ id: string; name: string; referenceImageUrl?: string; description?: string }>;
  }
): AutoProdAsset[] {
  const result: AutoProdAsset[] = [];
  const bios = extractCharacterBiosFromMarkdown(markdown);
  const findExisting = (category: AutoProdAsset['category'], name: string) =>
    existingAssets.find(
      (a) => a.category === category && a.name.toLowerCase() === name.toLowerCase()
    );

  // 1. Characters (Always 1:1 4-Panel Turnaround Sheets + full trait profiles + My Elements reuse check)
  const charMap = new Map<string, string[]>();
  for (const sc of scenes) {
    for (const ch of sc.charactersInScene) {
      const prev = charMap.get(ch) || [];
      if (!prev.includes(sc.heading)) prev.push(sc.heading);
      charMap.set(ch, prev);
    }
  }
  for (const [charName, sceneRefs] of charMap.entries()) {
    const existing = findExisting('Character', charName);
    const bio = bios.get(charName.toUpperCase());
    const savedChar = reusableLibrary?.characters?.find(
      (c) => c.name.toLowerCase() === charName.toLowerCase()
    );
    const appearanceLine = bio
      ? [
          bio.role ? `Role: ${bio.role}` : '',
          bio.ethnicity || '',
          bio.skinTone ? `${bio.skinTone} skin tone` : '',
          bio.gender || '',
          bio.ageRange ? `age ${bio.ageRange}` : '',
          bio.facialStructure || '',
          bio.bodyType || '',
          bio.hairstyle ? `${bio.hairstyle} hair` : '',
          bio.personality ? `${bio.personality}` : '',
        ]
          .filter(Boolean)
          .join(', ')
      : savedChar?.distinctiveFeatures ||
        `Lead character @${charName} with locked facial identity and expressive cinema performance.`;

    result.push(
      existing
        ? { ...existing, sceneRefs, characterBio: existing.characterBio || bio }
        : {
            id: `ast_chr_${charName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            category: 'Character',
            name: charName,
            sceneRefs,
            description: appearanceLine,
            generationPrompt: buildCharacterTurnaroundPrompt({
              name: charName,
              role: bio?.role || savedChar?.roleTitle || 'Lead Character',
              appearance: appearanceLine,
              wardrobe: bio?.clothing,
            }),
            modelId: 'soul-2-standard',
            outputUrl: savedChar?.faceReferenceUrl || '',
            outputKind: 'image',
            status: savedChar?.faceReferenceUrl ? 'approved' : 'idle',
            language: bio?.language || savedChar?.primaryLanguage || 'English',
            accentDialect: bio?.accentDialect || savedChar?.speechAccent || 'Neutral',
            characterBio: bio,
            reusedElementId: savedChar?.faceReferenceUrl ? savedChar.id : undefined,
          }
    );
  }

  // 2. Locations
  const locMap = new Map<string, { scene: AutoProdScene; refs: string[] }>();
  for (const sc of scenes) {
    const key = sc.locationName.toUpperCase();
    const entry = locMap.get(key);
    if (entry) {
      entry.refs.push(sc.heading);
    } else {
      locMap.set(key, { scene: sc, refs: [sc.heading] });
    }
  }
  for (const [locName, { scene, refs }] of locMap.entries()) {
    const existing = findExisting('Location', locName);
    const savedLoc = reusableLibrary?.locations?.find(
      (l) => l.name.toLowerCase() === locName.toLowerCase()
    );
    result.push(
      existing
        ? { ...existing, sceneRefs: refs }
        : {
            id: `ast_loc_${locName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            category: 'Location',
            name: locName,
            sceneRefs: refs,
            description: savedLoc?.description || `${scene.settingType} ${locName} (${scene.timeOfDay}) filming environment plate.`,
            generationPrompt: `Wide 24mm anamorphic establishing location plate of ${scene.settingType} ${locName} at ${scene.timeOfDay}, cinematic volumetric lighting, production design master reference, no people`,
            modelId: 'soul-cinema',
            outputUrl: savedLoc?.primaryImageUrl || '',
            outputKind: 'image',
            status: savedLoc?.primaryImageUrl ? 'approved' : 'idle',
            reusedElementId: savedLoc?.primaryImageUrl ? savedLoc.id : undefined,
          }
    );
  }

  // 3. Wardrobes
  const wardMap = new Map<string, { refs: string[]; charHint?: string }>();
  for (const sc of scenes) {
    for (const w of sc.wardrobesInScene) {
      const prev = wardMap.get(w) || { refs: [], charHint: sc.charactersInScene[0] };
      if (!prev.refs.includes(sc.heading)) prev.refs.push(sc.heading);
      wardMap.set(w, prev);
    }
  }
  if (wardMap.size === 0 && charMap.size > 0) {
    const firstChar = Array.from(charMap.keys())[0];
    wardMap.set(bios.get(firstChar)?.clothing || `${firstChar} Hero Wardrobe`, {
      refs: scenes.map((s) => s.heading),
      charHint: firstChar,
    });
  }
  for (const [wName, { refs, charHint }] of wardMap.entries()) {
    const existing = findExisting('Wardrobe', wName);
    const savedWard = reusableLibrary?.wardrobes?.find(
      (w) => w.name.toLowerCase() === wName.toLowerCase()
    );
    result.push(
      existing
        ? { ...existing, sceneRefs: refs }
        : {
            id: `ast_wrd_${wName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            category: 'Wardrobe',
            name: wName,
            sceneRefs: refs,
            characterRef: charHint,
            description: `Continuity costume and wardrobe reference for ${charHint || 'cast'}: ${savedWard?.garments || wName}.`,
            generationPrompt: `Cinema costume lookbook reference plate of ${wName}, high-detail fabric texture, tailored silhouette, studio rim lighting`,
            modelId: 'soul-2-standard',
            outputUrl: savedWard?.referenceImageUrl || '',
            outputKind: 'image',
            status: savedWard?.referenceImageUrl ? 'approved' : 'idle',
            reusedElementId: savedWard?.referenceImageUrl ? savedWard.id : undefined,
          }
    );
  }

  // 4. Props
  const propMap = new Map<string, string[]>();
  for (const sc of scenes) {
    for (const p of sc.propsInScene) {
      const prev = propMap.get(p) || [];
      if (!prev.includes(sc.heading)) prev.push(sc.heading);
      propMap.set(p, prev);
    }
  }
  for (const [pName, refs] of propMap.entries()) {
    const existing = findExisting('Prop', pName);
    const savedProp = reusableLibrary?.props?.find(
      (p) => p.name.toLowerCase() === pName.toLowerCase()
    );
    result.push(
      existing
        ? { ...existing, sceneRefs: refs }
        : {
            id: `ast_prp_${pName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            category: 'Prop',
            name: pName,
            sceneRefs: refs,
            description: savedProp?.description || `Hero production prop with locked finish and scale: ${pName}.`,
            generationPrompt: `Macro hero prop continuity photograph of ${pName}, brushed metal and tactile material detail, dramatic rim lighting on dark soundstage`,
            modelId: 'nano-banana-2-1',
            outputUrl: savedProp?.referenceImageUrl || '',
            outputKind: 'image',
            status: savedProp?.referenceImageUrl ? 'approved' : 'idle',
            reusedElementId: savedProp?.referenceImageUrl ? savedProp.id : undefined,
          }
    );
  }

  // 5. Verbatim Spoken Dialogue & Narration + Scene SFX / Ambience / Music Cues
  for (const sc of scenes) {
    for (const dlg of sc.dialogueLines) {
      const bio = bios.get(dlg.speaker.toUpperCase());
      const voiceAssetName = `${dlg.speaker} — ${dlg.kind === 'narration' ? 'Narration' : 'Dialogue'}: "${dlg.line.slice(0, 32)}${dlg.line.length > 32 ? '...' : ''}"`;
      const existing = existingAssets.find((a) => a.id === `ast_voc_${dlg.id}`);
      result.push(
        existing || {
          id: `ast_voc_${dlg.id}`,
          category: 'Voice',
          name: voiceAssetName,
          sceneRefs: [sc.heading],
          characterRef: dlg.speaker,
          description: `Verbatim ${dlg.kind} by @${dlg.speaker} (${dlg.parenthetical}) in ${sc.heading}.`,
          generationPrompt: dlg.line,
          modelId: 'inworld-tts-studio',
          outputUrl: '',
          outputKind: 'audio',
          status: 'idle',
          audioKind: dlg.kind,
          language: (bio?.language as SupportedCharacterLanguage) || 'English',
          accentDialect: bio?.accentDialect || 'Neutral',
          emotion: dlg.parenthetical,
          speakingStyle: bio?.voiceDescription || 'Natural cinema dialogue delivery',
          voicePersona: 'noir_narrator',
        }
      );
    }

    sc.sfxCues?.forEach((sfx, idx) => {
      const id = `ast_sfx_${sc.sceneId}_${idx + 1}`;
      const existing = existingAssets.find((a) => a.id === id);
      result.push(
        existing || {
          id,
          category: 'Voice',
          name: `SFX (${sc.sceneNumber}): ${sfx.slice(0, 34)}`,
          sceneRefs: [sc.heading],
          characterRef: 'SFX FOLEY',
          description: `Scene ${sc.sceneNumber} sound effect cue in ${sc.locationName}.`,
          generationPrompt: `Clean isolated film sound effect (no dialogue): ${sfx}. Recorded foley cinema master.`,
          modelId: 'sonilo-sfx-v1',
          outputUrl: '',
          outputKind: 'audio',
          status: 'idle',
          audioKind: 'sfx',
        }
      );
    });

    sc.ambienceCues?.forEach((amb, idx) => {
      const id = `ast_amb_${sc.sceneId}_${idx + 1}`;
      const existing = existingAssets.find((a) => a.id === id);
      result.push(
        existing || {
          id,
          category: 'Voice',
          name: `Ambience (${sc.sceneNumber}): ${amb.slice(0, 30)}`,
          sceneRefs: [sc.heading],
          characterRef: 'AMBIENCE',
          description: `Scene ${sc.sceneNumber} atmospheric room tone / environment bed.`,
          generationPrompt: `Cinematic atmospheric environment bed (no speech): ${amb}.`,
          modelId: 'sonilo-sfx-v1',
          outputUrl: '',
          outputKind: 'audio',
          status: 'idle',
          audioKind: 'ambience',
        }
      );
    });
  }

  return result;
}

function buildStoryboardShotsFromScenes(
  scenes: AutoProdScene[],
  existingShots: AutoProdStoryboardShot[]
): AutoProdStoryboardShot[] {
  const shots: AutoProdStoryboardShot[] = [];
  let globalCounter = 1;

  for (const sc of scenes) {
    const cleanAction = sc.actions
      .replace(/\[PROP:[^\]]+\]/gi, '')
      .replace(/\[WARDROBE:[^\]]+\]/gi, '')
      .replace(/\[B-ROLL:[^\]]+\]/gi, '')
      .trim();

    // Shot A: Wide Establishing Shot of the Scene Location & Characters
    const estId = `shot_${sc.sceneId}_est`;
    const prevEst = existingShots.find((s) => s.id === estId);
    shots.push(
      prevEst
        ? { ...prevEst, shotNumber: String(globalCounter++).padStart(2, '0') }
        : {
            id: estId,
            sceneId: sc.sceneId,
            sceneHeading: sc.heading,
            shotNumber: String(globalCounter++).padStart(2, '0'),
            cameraFraming: 'Wide Establishing',
            cameraMovement: 'Crane up',
            lens: '24mm Anamorphic',
            lighting: sc.timeOfDay === 'Night' ? 'Practicals' : 'Window',
            characterNames: sc.charactersInScene,
            characterPositioning:
              sc.charactersInScene.length > 0
                ? `${sc.charactersInScene.join(' & ')} positioned in foreground entering ${sc.locationName}`
                : `Wide architectural framing of ${sc.locationName}`,
            actionDescription:
              cleanAction || `Establishing ${sc.heading} with deep spatial atmosphere.`,
            emotion: 'Determined',
            dialogueOrNarration: sc.dialogueLines[0]?.line || '',
            speaker: sc.dialogueLines[0]?.speaker || '',
            locationName: sc.locationName,
            imageModelId: 'soul-cinema',
            frameImageUrl: '',
            frameStatus: 'idle',
            videoModelId: 'seedance-2-5',
            videoClipUrl: '',
            videoDurationSec: 5,
            videoStatus: 'idle',
          }
    );

    // Shot B+: Character Dialogue / Action Coverage Shots (Over-the-Shoulder, Close-Up, Reverse Shot)
    if (sc.dialogueLines.length > 0) {
      sc.dialogueLines.forEach((dlg, idx) => {
        const shotId = `shot_${sc.sceneId}_dlg_${idx + 1}`;
        const prevDlgShot = existingShots.find((s) => s.id === shotId);
        const framing: AutoProdStoryboardShot['cameraFraming'] =
          idx === 0
            ? 'Medium Two-Shot'
            : idx % 2 === 1
            ? 'Close-Up'
            : 'Over-the-Shoulder';
        shots.push(
          prevDlgShot
            ? { ...prevDlgShot, shotNumber: String(globalCounter++).padStart(2, '0') }
            : {
                id: shotId,
                sceneId: sc.sceneId,
                sceneHeading: sc.heading,
                shotNumber: String(globalCounter++).padStart(2, '0'),
                cameraFraming: framing,
                cameraMovement: idx % 2 === 0 ? 'Dolly in' : 'Rack focus',
                lens: idx % 2 === 1 ? '85mm Portrait' : '35mm Film',
                lighting: sc.timeOfDay === 'Night' ? 'Soft Cross' : 'Window',
                characterNames: [dlg.speaker],
                characterPositioning: `@${dlg.speaker} framed in ${framing} (${dlg.parenthetical})`,
                actionDescription: `@${dlg.speaker} delivers dialogue (${dlg.parenthetical}) inside ${sc.locationName}.`,
                emotion: 'Determined',
                dialogueOrNarration: dlg.line,
                speaker: dlg.speaker,
                locationName: sc.locationName,
                imageModelId: 'soul-2-standard',
                frameImageUrl: '',
                frameStatus: 'idle',
                videoModelId: 'seedance-2-5',
                videoClipUrl: '',
                videoDurationSec: 5,
                videoStatus: 'idle',
              }
        );
      });
    } else {
      const actId = `shot_${sc.sceneId}_act`;
      const prevAct = existingShots.find((s) => s.id === actId);
      shots.push(
        prevAct
          ? { ...prevAct, shotNumber: String(globalCounter++).padStart(2, '0') }
          : {
              id: actId,
              sceneId: sc.sceneId,
              sceneHeading: sc.heading,
              shotNumber: String(globalCounter++).padStart(2, '0'),
              cameraFraming: 'Close-Up',
              cameraMovement: 'Tracking shot',
              lens: '50mm Master Prime',
              lighting: 'Silhouette',
              characterNames: sc.charactersInScene,
              characterPositioning: 'Center frame dynamic movement',
              actionDescription: cleanAction || `Dramatic close-up in ${sc.locationName}.`,
              emotion: 'Contemplative',
              dialogueOrNarration: '',
              speaker: '',
              locationName: sc.locationName,
              imageModelId: 'soul-2-standard',
              frameImageUrl: '',
              frameStatus: 'idle',
              videoModelId: 'seedance-2-5',
              videoClipUrl: '',
              videoDurationSec: 5,
              videoStatus: 'idle',
            }
      );
    }
  }

  return shots;
}

const DEFAULT_SCREENPLAY = [
  '# ECHOES OF LAGOS',
  '',
  '> Production Format: Short Films | Visual Direction: Anamorphic 35mm Cinema, Rain-Slicked Neon & Warm Tungsten Practicals',
  '',
  '### EXT. LAGOS MARINA CAUSEWAY - NIGHT <!-- scene-id: scene-01 -->',
  '',
  'Rain lashes the elevated glass highway overlooking the Atlantic harbour. @AMARA stands beside a [PROP: Matte-Black Tactical Defender], wearing her [WARDROBE: Indigo Embroidered Trench Coat]. [B-ROLL: Anamorphic lens flare streaking across wet asphalt]',
  '',
  '@AMARA',
  '(into encrypted earpiece, calm and resolute)',
  'The sovereign ledger signal is active underneath Victoria Island. Lock the perimeter before the syndicate arrives.',
  '',
  '@KEMI',
  '(stepping out with a biometric scanner, urgent)',
  'Every tower on the lagoon is mirroring our frequency. We have three minutes to reach the vault.',
  '',
  '##### CUT TO:',
  '',
  '### INT. SUBTERRANEAN ARCHIVE VAULT - NIGHT <!-- scene-id: scene-02 -->',
  '',
  'Overhead softbox light carves through cool mist inside the concrete vault. @AMARA and @KEMI approach the central glass plinth housing the [PROP: Brass Quantum Chronometer]. @KEMI wears a [WARDROBE: Charcoal Tactical Blazer].',
  '',
  '@KEMI',
  '(eyes wide as the chronometer rings spin)',
  'These coordinates map every memory of the city. Nothing was ever erased.',
  '',
  '@AMARA',
  '(placing her palm on the scanner)',
  'Then let us broadcast the truth to every screen in the republic.',
].join('\n');

export const AutomaticProductionWorkflow: React.FC<{
  projectTitle: string;
  productionType: CinemaProductionType;
  onProjectTitleChange?: (newTitle: string) => void;
  onOpenAdvancedStoryStudio?: () => void;
}> = ({
  projectTitle,
  productionType,
  onProjectTitleChange,
  onOpenAdvancedStoryStudio,
}) => {
  const {
    models,
    characters,
    locations,
    wardrobes,
    propsList,
    voices,
    submitGeneration,
    pollGenerationUntilDone,
    uploadReferenceFile,
    saveCharacter,
    saveLocation,
    saveWardrobe,
    saveProp,
    saveCinemaProject,
    calculateTokenCost,
    creativeControls,
    setLightboxItem,
    showToast,
  } = useRuns();

  const [activeStage, setActiveStage] = useState<AutoProdStageId>(1);
  const [prodState, setProdState] = useState<AutoProdProjectState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AutoProdProjectState;
        if (parsed && parsed.screenplayMarkdown && Array.isArray(parsed.scenes)) {
          return parsed;
        }
      }
    } catch {
      // ignore storage read error
    }
    const initialScenes = parseMarkdownToStructuredScenes(DEFAULT_SCREENPLAY);
    const initialAssets = buildAssetsFromScenes(initialScenes, [], DEFAULT_SCREENPLAY, {
      characters,
      locations,
      wardrobes,
      props: propsList,
    });
    const initialShots = buildStoryboardShotsFromScenes(initialScenes, []);
    return {
      title: projectTitle || 'ECHOES OF LAGOS',
      ideaDescription:
        'Two investigators race across a rain-slicked Lagos midnight to unlock a subterranean quantum archive containing the city’s erased history.',
      productionFormat: productionType || 'Short Films',
      aspectRatio: '16:9',
      creativeInstructions:
        'Shot on 35mm Panavision Anamorphic lenses, Twilight Fable color grade, motivated practical lighting, taut thriller pacing.',
      referenceNotes: '',
      referenceUrls: [],
      screenplayMarkdown: DEFAULT_SCREENPLAY,
      screenplayApproved: false,
      scenes: initialScenes,
      assets: initialAssets,
      assetsApproved: false,
      shots: initialShots,
      storyboardApproved: false,
      soundtrackUrl: '',
      soundtrackPrompt:
        'Cinematic neo-noir hybrid score with deep analog brass pulse, rain ambience, and tension strings',
      soundtrackModelId: 'sonilo-music-v2',
      updatedAt: new Date().toISOString(),
    };
  });

  // Persist state on every change so moving backwards or forwards between stages never loses work
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prodState));
    } catch {
      // ignore quota error
    }
  }, [prodState]);

  const [isGeneratingScreenplay, setIsGeneratingScreenplay] = useState(false);
  const [screenplayViewTab, setScreenplayViewTab] = useState<'structured' | 'markdown'>('structured');
  const [assetCategoryTab, setAssetCategoryTab] = useState<
    'All' | 'Character' | 'Location' | 'Wardrobe' | 'Prop' | 'Voice'
  >('All');
  const [batchBusy, setBatchBusy] = useState(false);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [activeSequenceShotIdx, setActiveSequenceShotIdx] = useState(0);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Strictly routed model lists per task capability
  const characterImageModels = useMemo(
    () => getCompatibleModelsForTool('character_identity', models, 'image'),
    [models]
  );
  const locationImageModels = useMemo(
    () => getCompatibleModelsForTool('location_environment', models, 'image'),
    [models]
  );
  const propImageModels = useMemo(
    () => getCompatibleModelsForTool('prop_object', models, 'image'),
    [models]
  );
  const storyboardImageModels = useMemo(
    () => getCompatibleModelsForTool('storyboard_planning', models, 'image'),
    [models]
  );
  const voiceAudioModels = useMemo(
    () => getCompatibleModelsForTool('speech_dialogue', models, 'audio'),
    [models]
  );
  const musicAudioModels = useMemo(
    () => getCompatibleModelsForTool('music_sfx', models, 'audio'),
    [models]
  );
  const animationVideoModels = useMemo(
    () => getCompatibleModelsForTool('video_creation', models, 'video'),
    [models]
  );

  // =========================================================================
  // STAGE 1 HANDLERS — IDEA & SCREENPLAY
  // =========================================================================
  const handleUploadStage1Ref = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kind: 'image' | 'video' | 'doc' = file.type.startsWith('video/')
      ? 'video'
      : file.type.startsWith('image/')
      ? 'image'
      : 'doc';
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      const upl = await uploadReferenceFile({
        label: file.name,
        contentType: file.type || (kind === 'video' ? 'video/mp4' : 'image/png'),
        bytes: file.size,
        dataUrl,
      });
      if (upl?.publicUrl) {
        setProdState((prev) => ({
          ...prev,
          referenceUrls: [
            ...prev.referenceUrls,
            { id: `ref_${Date.now()}`, label: file.name, url: upl.publicUrl, kind },
          ],
          updatedAt: new Date().toISOString(),
        }));
        showToast(`Attached reference "${file.name}" to production brief`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerateScreenplayFromIdea = async () => {
    setIsGeneratingScreenplay(true);
    try {
      const res = await fetch('/api/cinema/auto-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'screenplay',
          title: prodState.title,
          ideaDescription: prodState.ideaDescription,
          productionFormat: prodState.productionFormat,
          creativeInstructions: prodState.creativeInstructions,
          referenceNotes: prodState.referenceNotes,
        }),
      });
      const data = await res.json();
      if (data?.markdown) {
        const nextScenes = parseMarkdownToStructuredScenes(data.markdown);
        const nextAssets = buildAssetsFromScenes(nextScenes, prodState.assets, data.markdown, {
          characters,
          locations,
          wardrobes,
          props: propsList,
        });
        const nextShots = buildStoryboardShotsFromScenes(nextScenes, prodState.shots);
        setProdState((prev) => ({
          ...prev,
          screenplayMarkdown: data.markdown,
          scenes: nextScenes,
          assets: nextAssets,
          shots: nextShots,
          screenplayApproved: false,
          updatedAt: new Date().toISOString(),
        }));
        showToast(
          `Generated ${nextScenes.length} structured scenes & extracted ${nextAssets.length} production assets`
        );
      }
    } catch {
      showToast('Screenplay updated from idea brief');
    } finally {
      setIsGeneratingScreenplay(false);
    }
  };

  const handleScreenplayMarkdownEdit = (newMarkdown: string) => {
    const nextScenes = parseMarkdownToStructuredScenes(newMarkdown);
    const nextAssets = buildAssetsFromScenes(nextScenes, prodState.assets, newMarkdown, {
      characters,
      locations,
      wardrobes,
      props: propsList,
    });
    const nextShots = buildStoryboardShotsFromScenes(nextScenes, prodState.shots);
    setProdState((prev) => ({
      ...prev,
      screenplayMarkdown: newMarkdown,
      scenes: nextScenes,
      assets: nextAssets,
      shots: nextShots,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleApproveStage1AndContinue = async () => {
    const nextScenes = parseMarkdownToStructuredScenes(prodState.screenplayMarkdown);
    let nextAssets = buildAssetsFromScenes(
      nextScenes,
      prodState.assets,
      prodState.screenplayMarkdown,
      { characters, locations, wardrobes, props: propsList }
    );
    const nextShots = buildStoryboardShotsFromScenes(nextScenes, prodState.shots);

    // Optional AI structured enrichment pass (strictly preserves verbatim dialogue)
    try {
      const analyzeRes = await fetch('/api/cinema/auto-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'analyze',
          screenplayMarkdown: prodState.screenplayMarkdown,
        }),
      });
      const analyzeJson = await analyzeRes.json();
      const analysis = analyzeJson?.analysis;
      if (analysis?.characters && Array.isArray(analysis.characters)) {
        nextAssets = nextAssets.map((ast) => {
          if (ast.category !== 'Character') return ast;
          const matched = analysis.characters.find(
            (c: AutoProdCharacterBio) =>
              c.name && c.name.toLowerCase().includes(ast.name.toLowerCase())
          );
          if (!matched) return ast;
          const desc = [
            matched.role ? `Role: ${matched.role}` : '',
            matched.ethnicity || '',
            matched.skinTone ? `${matched.skinTone} skin` : '',
            matched.gender || '',
            matched.ageRange ? `age ${matched.ageRange}` : '',
            matched.facialStructure || '',
            matched.bodyType || '',
            matched.hairstyle ? `${matched.hairstyle} hair` : '',
            matched.personality || '',
          ]
            .filter(Boolean)
            .join(', ');
          return {
            ...ast,
            description: desc || ast.description,
            characterBio: { ...ast.characterBio, ...matched },
            language: (matched.language as SupportedCharacterLanguage) || ast.language,
            accentDialect: matched.accentDialect || ast.accentDialect,
            generationPrompt: buildCharacterTurnaroundPrompt({
              name: ast.name,
              role: matched.role || ast.characterBio?.role,
              appearance: desc || ast.description,
              wardrobe: matched.clothing || ast.characterBio?.clothing,
            }),
          };
        });
      }
    } catch {
      // Fallback cleanly to deterministic extraction
    }

    setProdState((prev) => ({
      ...prev,
      screenplayApproved: true,
      scenes: nextScenes,
      assets: nextAssets,
      shots: nextShots,
      updatedAt: new Date().toISOString(),
    }));
    await saveCinemaProject({
      title: prodState.title,
      productionType: prodState.productionFormat,
      aspectRatio: prodState.aspectRatio === '4:3' || prodState.aspectRatio === '3:4' ? '16:9' : prodState.aspectRatio,
      logline: prodState.ideaDescription,
      screenplayRaw: prodState.screenplayMarkdown,
    });
    setActiveStage(2);
    showToast('Stage 1 Screenplay approved — extracted Stage 2 Production Assets');
  };

  // =========================================================================
  // STAGE 2 HANDLERS — PRODUCTION ASSETS (IMAGE & VOICE/AUDIO ROUTING)
  // =========================================================================
  const handleUploadStage2AssetFile = async (
    asset: AutoProdAsset,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setProdState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) =>
        a.id === asset.id ? { ...a, status: 'generating', error: undefined } : a
      ),
    }));
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const uploaded = await uploadReferenceFile({
        label: `${asset.category}: ${asset.name}`,
        contentType: file.type || (asset.outputKind === 'audio' ? 'audio/mpeg' : 'image/png'),
        bytes: file.size,
        dataUrl,
      });
      const finalUrl = uploaded?.publicUrl || dataUrl;
      setProdState((prev) => ({
        ...prev,
        assets: prev.assets.map((a) =>
          a.id === asset.id
            ? { ...a, outputUrl: finalUrl, status: 'approved', error: undefined }
            : a
        ),
        updatedAt: new Date().toISOString(),
      }));
      showToast(`Imported file for ${asset.name}`);
    } catch (err) {
      setProdState((prev) => ({
        ...prev,
        assets: prev.assets.map((a) =>
          a.id === asset.id
            ? { ...a, status: 'error', error: (err as Error).message || 'Upload failed' }
            : a
        ),
      }));
    }
  };

  const handleGenerateSingleAsset = async (asset: AutoProdAsset) => {
    setProdState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) =>
        a.id === asset.id ? { ...a, status: 'generating', error: undefined } : a
      ),
    }));

    const isVoice = asset.category === 'Voice' || asset.outputKind === 'audio';
    const isSfxOrAmb = asset.audioKind === 'sfx' || asset.audioKind === 'ambience' || asset.audioKind === 'music';
    const toolId = isVoice
      ? isSfxOrAmb
        ? 'music_sfx'
        : 'speech_dialogue'
      : asset.category === 'Character'
      ? 'character_identity'
      : asset.category === 'Location'
      ? 'location_environment'
      : asset.category === 'Wardrobe'
      ? 'wardrobe_outfit'
      : 'prop_object';

    const compatibleModel = resolveCompatibleModel(
      toolId,
      asset.modelId,
      models,
      isVoice ? 'audio' : 'image'
    );

    try {
      let promptToSend = asset.generationPrompt;
      let settingsPayload: Record<string, string | number | boolean> = {};

      if (isVoice) {
        if (isSfxOrAmb) {
          promptToSend = asset.generationPrompt;
          settingsPayload = { duration: '10', instrumental_only: true };
        } else {
          // Strict verbatim spoken text preservation + voice traits metadata
          const langPrefix = [
            asset.language && asset.language !== 'English' ? `Language: ${asset.language}` : '',
            asset.accentDialect && asset.accentDialect !== 'Neutral'
              ? `Accent/Dialect: ${asset.accentDialect}`
              : '',
            asset.emotion ? `Emotion: ${asset.emotion}` : '',
            asset.speakingStyle ? `Style: ${asset.speakingStyle}` : '',
          ]
            .filter(Boolean)
            .join(', ');
          promptToSend = langPrefix
            ? `[${langPrefix}] "${asset.generationPrompt}"`
            : asset.generationPrompt;
          settingsPayload = {
            voice_persona: asset.voicePersona || 'noir_narrator',
            speaking_rate: 1.0,
            duration: '12',
          };
        }
      } else {
        const translated = translateCreativeControlsForModel(
          creativeControls,
          compatibleModel,
          'image'
        );
        if (asset.category === 'Character') {
          promptToSend = buildCharacterTurnaroundPrompt({
            name: asset.name,
            role: asset.characterBio?.role || 'Character',
            appearance: `${asset.description}. ${asset.generationPrompt}`,
            wardrobe: asset.characterBio?.clothing,
            styleNotes: translated.promptDirective,
          });
          settingsPayload = {
            ...translated.nativeSettingsPatch,
            aspect_ratio: CHARACTER_TURNAROUND_ASPECT_RATIO,
            resolution: '2K',
          };
        } else {
          promptToSend = translated.promptDirective
            ? `${asset.generationPrompt}. [CINEMATOGRAPHY: ${translated.promptDirective}]`
            : asset.generationPrompt;
          settingsPayload = {
            ...translated.nativeSettingsPatch,
            aspect_ratio: asset.category === 'Wardrobe' ? '1:1' : prodState.aspectRatio,
            resolution: '2K',
          };
        }
      }

      const res = await submitGeneration({
        surface: isVoice ? 'audio' : 'image',
        modelId: compatibleModel.id,
        mode: compatibleModel.modes[0] || (isVoice ? 'Voice & SFX' : 'Create'),
        prompt: promptToSend,
        settings: settingsPayload,
        media: [],
        skipContinuityMerge: true,
      });

      if (!res.ok || !res.generation) {
        throw new Error(res.error || 'Failed to submit asset generation');
      }

      const done =
        res.generation.status === 'completed'
          ? res.generation
          : await pollGenerationUntilDone(res.generation.id);

      const outUrl = done?.outputs?.[0]?.url || '';
      if (!outUrl) {
        throw new Error(done?.error || 'Generation completed without media output.');
      }

      setProdState((prev) => ({
        ...prev,
        assets: prev.assets.map((a) =>
          a.id === asset.id
            ? {
                ...a,
                modelId: compatibleModel.id,
                outputUrl: outUrl,
                status: 'approved',
                error: undefined,
              }
            : a
        ),
        updatedAt: new Date().toISOString(),
      }));

      // Persist visual element into global Continuity Library
      if (asset.category === 'Character') {
        await saveCharacter({
          name: asset.name,
          roleTitle: asset.characterBio?.role,
          ageRange: asset.characterBio?.ageRange,
          genderPresentation: asset.characterBio?.gender,
          skinTone: asset.characterBio?.skinTone,
          bodyType: asset.characterBio?.bodyType,
          hairstyle: asset.characterBio?.hairstyle,
          primaryLanguage: asset.language,
          speechAccent: asset.accentDialect,
          faceReferenceUrl: outUrl,
          facialIdentityLock: true,
          distinctiveFeatures: asset.description,
          consistencyLock: true,
        });
      } else if (asset.category === 'Location') {
        await saveLocation({
          name: asset.name,
          category: 'Cities',
          settingType: 'EXT.',
          timeOfDay: 'Night',
          weather: 'Rain',
          description: asset.description,
          primaryImageUrl: outUrl,
          continuityLock: true,
        });
      } else if (asset.category === 'Wardrobe') {
        await saveWardrobe({
          name: asset.name,
          category: 'Traditional',
          description: asset.description,
          referenceImageUrl: outUrl,
          sceneContinuityLock: true,
        });
      } else if (asset.category === 'Prop') {
        await saveProp({
          name: asset.name,
          category: 'Hero Artifacts',
          description: asset.description,
          referenceImageUrl: outUrl,
          appearanceLock: true,
        });
      }
    } catch (err) {
      const msg = (err as Error).message || 'Generation failed';
      setProdState((prev) => ({
        ...prev,
        assets: prev.assets.map((a) =>
          a.id === asset.id ? { ...a, status: 'error', error: msg } : a
        ),
      }));
    }
  };

  const handleGenerateAllStage2Assets = async () => {
    setBatchBusy(true);
    try {
      const pending = prodState.assets.filter((a) => !a.outputUrl);
      for (const ast of pending) {
        await handleGenerateSingleAsset(ast);
      }
      showToast('Generated missing Stage 2 production assets');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleApproveStage2AndContinue = () => {
    setProdState((prev) => ({
      ...prev,
      assetsApproved: true,
      assets: prev.assets.map((a) => (a.outputUrl ? { ...a, status: 'approved' } : a)),
      updatedAt: new Date().toISOString(),
    }));
    setActiveStage(3);
    showToast('Stage 2 Production Assets approved — ready for Stage 3 Storyboard Planning');
  };

  // =========================================================================
  // STAGE 3 HANDLERS — STORYBOARD & SHOT PLANNING (CONTINUITY-LOCKED FRAMES)
  // =========================================================================
  const collectContinuityMediaForShot = (shot: AutoProdStoryboardShot): MediaSlotInput[] => {
    const media: MediaSlotInput[] = [];
    for (const cname of shot.characterNames) {
      const charAsset = prodState.assets.find(
        (a) =>
          a.category === 'Character' &&
          a.name.toLowerCase() === cname.toLowerCase() &&
          a.outputUrl
      );
      if (charAsset) {
        media.push({
          role: 'reference',
          kind: 'image',
          url: charAsset.outputUrl,
          label: `@${charAsset.name}`,
        });
      }
    }
    const locAsset = prodState.assets.find(
      (a) =>
        a.category === 'Location' &&
        a.name.toLowerCase() === shot.locationName.toLowerCase() &&
        a.outputUrl
    );
    if (locAsset) {
      media.push({
        role: 'reference',
        kind: 'image',
        url: locAsset.outputUrl,
        label: `@${locAsset.name}`,
      });
    }
    return media.slice(0, 4);
  };

  const handleGenerateStoryboardFrame = async (shot: AutoProdStoryboardShot) => {
    setProdState((prev) => ({
      ...prev,
      shots: prev.shots.map((s) =>
        s.id === shot.id ? { ...s, frameStatus: 'generating', frameError: undefined } : s
      ),
    }));

    const imageModel = resolveCompatibleModel(
      'storyboard_planning',
      shot.imageModelId,
      models,
      'image'
    );

    try {
      const translated = translateCreativeControlsForModel(
        shot.creativeControlsOverride || creativeControls,
        imageModel,
        'image'
      );
      const continuityMedia = collectContinuityMediaForShot(shot);
      const targetAspect = shot.aspectRatio || prodState.aspectRatio;
      const fullFramePrompt = [
        `[Storyboard Keyframe · Shot ${shot.shotNumber} · ${shot.cameraFraming} · Lens: ${shot.lens} · Lighting: ${shot.lighting}${shot.timeOfDay ? ` · Time: ${shot.timeOfDay}` : ''}]`,
        `Location: ${shot.sceneHeading}.`,
        shot.wardrobeName ? `Wardrobe: ${shot.wardrobeName}.` : '',
        `Blocking: ${shot.characterPositioning}.`,
        `Action: ${shot.actionDescription}`,
        shot.editInstruction ? `Director Revision Notes: ${shot.editInstruction}.` : '',
        shot.emotion ? `Expression: ${shot.emotion}.` : '',
        translated.promptDirective ? `[CINEMATOGRAPHY: ${translated.promptDirective}]` : '',
      ]
        .filter(Boolean)
        .join(' ');

      const res = await submitGeneration({
        surface: 'image',
        modelId: imageModel.id,
        mode: imageModel.modes[0] || 'Create',
        prompt: fullFramePrompt,
        settings: {
          ...translated.nativeSettingsPatch,
          aspect_ratio: targetAspect,
          resolution: '2K',
        },
        media: continuityMedia,
        creativeControlsOverride: shot.creativeControlsOverride,
      });

      if (!res.ok || !res.generation) {
        throw new Error(res.error || 'Failed to generate storyboard frame');
      }
      const done =
        res.generation.status === 'completed'
          ? res.generation
          : await pollGenerationUntilDone(res.generation.id);
      const outUrl = done?.outputs?.[0]?.url || '';
      if (!outUrl) {
        throw new Error(done?.error || 'Storyboard frame generation returned no image');
      }

      setProdState((prev) => ({
        ...prev,
        shots: prev.shots.map((s) =>
          s.id === shot.id
            ? {
                ...s,
                imageModelId: imageModel.id,
                frameImageUrl: outUrl,
                frameStatus: 'ready',
                frameError: undefined,
              }
            : s
        ),
        updatedAt: new Date().toISOString(),
      }));
    } catch (err) {
      const msg = (err as Error).message || 'Frame generation failed';
      setProdState((prev) => ({
        ...prev,
        shots: prev.shots.map((s) =>
          s.id === shot.id ? { ...s, frameStatus: 'error', frameError: msg } : s
        ),
      }));
    }
  };

  const handleUploadStoryboardFrame = async (
    shot: AutoProdStoryboardShot,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });
    const uploaded = await uploadReferenceFile({
      label: `Shot ${shot.shotNumber} Custom Frame`,
      contentType: file.type || 'image/png',
      bytes: file.size,
      dataUrl,
    });
    const finalUrl = uploaded?.publicUrl || dataUrl;
    setProdState((prev) => ({
      ...prev,
      shots: prev.shots.map((s) =>
        s.id === shot.id
          ? { ...s, frameImageUrl: finalUrl, frameStatus: 'approved', frameError: undefined }
          : s
      ),
      updatedAt: new Date().toISOString(),
    }));
    showToast(`Uploaded replacement frame for Shot ${shot.shotNumber}`);
  };

  const handleMoveStoryboardShot = (shotId: string, delta: -1 | 1) => {
    setProdState((prev) => {
      const idx = prev.shots.findIndex((s) => s.id === shotId);
      const nextIdx = idx + delta;
      if (idx === -1 || nextIdx < 0 || nextIdx >= prev.shots.length) return prev;
      const copy = [...prev.shots];
      const [moved] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, moved);
      return {
        ...prev,
        shots: copy.map((s, i) => ({ ...s, shotNumber: String(i + 1).padStart(2, '0') })),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleDeleteStoryboardShot = (shotId: string) => {
    setProdState((prev) => {
      if (prev.shots.length <= 1) return prev;
      return {
        ...prev,
        shots: prev.shots
          .filter((s) => s.id !== shotId)
          .map((s, i) => ({ ...s, shotNumber: String(i + 1).padStart(2, '0') })),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleGenerateAllStoryboardFrames = async () => {
    setBatchBusy(true);
    try {
      const pending = prodState.shots.filter((s) => !s.frameImageUrl);
      for (const shot of pending) {
        await handleGenerateStoryboardFrame(shot);
      }
      showToast('Generated storyboard keyframes with Stage 2 continuity locks');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleAddAlternativeAngleShot = (sourceShot: AutoProdStoryboardShot) => {
    const newShot: AutoProdStoryboardShot = {
      ...sourceShot,
      id: `shot_${sourceShot.sceneId}_alt_${Date.now().toString(36).slice(-4)}`,
      shotNumber: `${sourceShot.shotNumber}B`,
      cameraFraming:
        sourceShot.cameraFraming === 'Close-Up' ? 'Reverse Shot' : 'Close-Up',
      cameraMovement: 'Dolly in',
      lens: '85mm Portrait',
      frameImageUrl: '',
      frameStatus: 'idle',
      frameError: undefined,
      videoClipUrl: '',
      videoStatus: 'idle',
      videoError: undefined,
    };

    setProdState((prev) => {
      const idx = prev.shots.findIndex((s) => s.id === sourceShot.id);
      const next = [...prev.shots];
      next.splice(idx + 1, 0, newShot);
      return { ...prev, shots: next, updatedAt: new Date().toISOString() };
    });
    showToast(`Added alternative camera angle (${newShot.cameraFraming}) for Shot ${sourceShot.shotNumber}`);
  };

  const handleApproveStage3AndContinue = () => {
    setProdState((prev) => ({
      ...prev,
      storyboardApproved: true,
      updatedAt: new Date().toISOString(),
    }));
    setActiveStage(4);
    showToast('Stage 3 Storyboard approved — ready for Stage 4 Video Animation & Multitrack Cut');
  };

  // =========================================================================
  // STAGE 4 HANDLERS — ANIMATION & VIDEO GENERATION + FULL MULTITRACK EDITOR
  // =========================================================================
  const handleAnimateShotToVideo = async (shot: AutoProdStoryboardShot) => {
    setProdState((prev) => ({
      ...prev,
      shots: prev.shots.map((s) =>
        s.id === shot.id ? { ...s, videoStatus: 'generating', videoError: undefined } : s
      ),
    }));

    const videoModel = resolveCompatibleModel(
      'video_creation',
      shot.videoModelId,
      models,
      'video'
    );

    try {
      const translated = translateCreativeControlsForModel(
        shot.creativeControlsOverride || creativeControls,
        videoModel,
        'video'
      );
      const mediaInputs: MediaSlotInput[] = [];
      if (shot.frameImageUrl) {
        mediaInputs.push({
          role: 'start',
          kind: 'image',
          url: shot.frameImageUrl,
          label: `Storyboard Keyframe ${shot.shotNumber}`,
        });
      }
      for (const ref of collectContinuityMediaForShot(shot)) {
        mediaInputs.push(ref);
      }

      const animPrompt = [
        `[Cinema Animation · Shot ${shot.shotNumber} · ${shot.cameraFraming} · Camera Move: ${shot.cameraMovement} · Lens: ${shot.lens} · Lighting: ${shot.lighting}${shot.timeOfDay ? ` · ${shot.timeOfDay}` : ''}]`,
        shot.actionDescription,
        shot.dialogueOrNarration
          ? `@${shot.speaker} speaks with expressive lip sync: "${shot.dialogueOrNarration}"`
          : '',
        translated.promptDirective ? `[CINEMATOGRAPHY: ${translated.promptDirective}]` : '',
      ]
        .filter(Boolean)
        .join(' ');

      const res = await submitGeneration({
        surface: 'video',
        modelId: videoModel.id,
        mode: videoModel.modes[0] || 'Create Video',
        prompt: animPrompt,
        settings: {
          ...translated.nativeSettingsPatch,
          aspect_ratio: shot.aspectRatio || prodState.aspectRatio,
          duration: shot.videoDurationSec || 5,
          resolution: '1080p',
          sound: true,
        },
        media: mediaInputs,
        creativeControlsOverride: shot.creativeControlsOverride,
      });

      if (!res.ok || !res.generation) {
        throw new Error(res.error || 'Failed to submit video animation');
      }

      const done =
        res.generation.status === 'completed'
          ? res.generation
          : await pollGenerationUntilDone(res.generation.id);
      const outUrl = done?.outputs?.[0]?.url || '';
      if (!outUrl) {
        throw new Error(done?.error || 'Shot animation completed without video output.');
      }

      setProdState((prev) => ({
        ...prev,
        shots: prev.shots.map((s) =>
          s.id === shot.id
            ? {
                ...s,
                videoModelId: videoModel.id,
                videoClipUrl: outUrl,
                videoStatus: 'ready',
                videoError: undefined,
              }
            : s
        ),
        updatedAt: new Date().toISOString(),
      }));
    } catch (err) {
      const msg = (err as Error).message || 'Shot animation failed';
      setProdState((prev) => ({
        ...prev,
        shots: prev.shots.map((s) =>
          s.id === shot.id ? { ...s, videoStatus: 'error', videoError: msg } : s
        ),
      }));
    }
  };

  const handleAnimateAllStage4Shots = async (approvedOnly = false) => {
    setBatchBusy(true);
    try {
      const targets = prodState.shots.filter((shot) => {
        if (shot.videoClipUrl) return false;
        if (approvedOnly) return shot.frameStatus === 'approved' || Boolean(shot.frameImageUrl);
        return true;
      });
      for (const shot of targets) {
        await handleAnimateShotToVideo(shot);
      }
      showToast('Finished Stage 4 shot animations');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleGenerateSoundtrack = async () => {
    const musicModel = resolveCompatibleModel(
      'music_sfx',
      prodState.soundtrackModelId,
      models,
      'audio'
    );
    const res = await submitGeneration({
      surface: 'audio',
      modelId: musicModel.id,
      mode: musicModel.modes[0] || 'Music & Score',
      prompt: prodState.soundtrackPrompt,
      settings: { duration: '30', instrumental_only: true },
      media: [],
    });
    if (res.ok && res.generation) {
      const done =
        res.generation.status === 'completed'
          ? res.generation
          : await pollGenerationUntilDone(res.generation.id);
      const outUrl = done?.outputs?.[0]?.url || '';
      if (outUrl) {
        setProdState((prev) => ({
          ...prev,
          soundtrackUrl: outUrl,
          updatedAt: new Date().toISOString(),
        }));
        showToast(`Generated master score via ${musicModel.label}`);
      }
    }
  };

  const defaultMultitrackTracks = useMemo<TimelineTrackConfig[]>(
    () =>
      prodState.timelineTracks && prodState.timelineTracks.length > 0
        ? prodState.timelineTracks
        : [
            { id: 'v2', label: 'V2 · Overlays & B-Roll', kind: 'overlay', volume: 0.8 },
            { id: 'v1', label: 'V1 · Primary Video Cuts', kind: 'video', volume: 1 },
            { id: 't1', label: 'T1 · Titles & Captions', kind: 'text' },
            { id: 'a1', label: 'A1 · Dialogue', kind: 'audio', audioRole: 'dialogue', volume: 1 },
            { id: 'a2', label: 'A2 · Narration', kind: 'audio', audioRole: 'narration', volume: 1 },
            { id: 'a3', label: 'A3 · Music Score', kind: 'audio', audioRole: 'music', volume: 0.6 },
            { id: 'a4', label: 'A4 · SFX & Ambience', kind: 'audio', audioRole: 'sfx', volume: 0.75 },
          ],
    [prodState.timelineTracks]
  );

  const computedMultitrackClips = useMemo<TimelineClipItem[]>(() => {
    if (prodState.timelineClips && prodState.timelineClips.length > 0) {
      return prodState.timelineClips;
    }
    const items: TimelineClipItem[] = [];
    let cursor = 0;
    prodState.shots.forEach((s) => {
      const dur = s.videoDurationSec || 5;
      items.push({
        id: `tl_vid_${s.id}`,
        trackId: 'v1',
        title: `Shot ${s.shotNumber} · ${s.cameraFraming}`,
        mediaUrl: s.videoClipUrl || s.frameImageUrl || '',
        mediaKind: s.videoClipUrl ? 'video' : 'image',
        startSec: cursor,
        durationSec: dur,
        aspectRatio: s.aspectRatio || prodState.aspectRatio,
        sourceShotId: s.id,
      });
      if (s.dialogueOrNarration) {
        const matchingVoice = prodState.assets.find(
          (a) =>
            a.category === 'Voice' &&
            a.generationPrompt.trim() === s.dialogueOrNarration.trim()
        );
        items.push({
          id: `tl_dlg_${s.id}`,
          trackId: matchingVoice?.audioKind === 'narration' ? 'a2' : 'a1',
          title: `@${s.speaker}: ${s.dialogueOrNarration.slice(0, 24)}...`,
          mediaUrl: matchingVoice?.outputUrl || '',
          mediaKind: 'audio',
          startSec: Number((cursor + 0.3).toFixed(1)),
          durationSec: Math.max(2, dur - 0.5),
        });
      }
      cursor += dur;
    });
    if (prodState.soundtrackUrl) {
      items.push({
        id: 'tl_score_master',
        trackId: 'a3',
        title: 'Master Film Score',
        mediaUrl: prodState.soundtrackUrl,
        mediaKind: 'audio',
        startSec: 0,
        durationSec: Math.max(10, cursor),
        volume: 0.6,
      });
    }
    return items;
  }, [prodState.timelineClips, prodState.shots, prodState.assets, prodState.soundtrackUrl, prodState.aspectRatio]);

  const handleRebuildTimelineFromStage4 = () => {
    setProdState((prev) => ({
      ...prev,
      timelineClips: undefined,
      updatedAt: new Date().toISOString(),
    }));
    showToast('Synced latest Stage 4 videos & Stage 2 audio stems onto timeline');
  };

  const filteredAssets = useMemo(
    () =>
      assetCategoryTab === 'All'
        ? prodState.assets
        : prodState.assets.filter((a) => a.category === assetCategoryTab),
    [prodState.assets, assetCategoryTab]
  );

  const activeSequenceShot =
    prodState.shots[activeSequenceShotIdx] || prodState.shots[0] || null;

  return (
    <div className="space-y-6 pb-10">
      {/* ====================================================================
          4-STAGE AUTOMATIC PRODUCTION PROGRESS BAR & NAVIGATION
          ==================================================================== */}
      <SpotlightCard className="p-4 sm:p-5 space-y-4 shadow-2xl">
        <BorderBeam />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="font-mono uppercase tracking-wider">
                AUTOMATIC PRODUCTION
              </Badge>
              <span className="text-xs font-mono-tabular text-zinc-400">
                4-Stage End-to-End Guided Filmmaking Pipeline
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-wide text-white mt-1">
              {prodState.title} · {prodState.productionFormat} ({prodState.aspectRatio})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAdvancedStoryStudio && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onOpenAdvancedStoryStudio}
              >
                <Layers className="w-3.5 h-3.5 text-[#46ecd5]" />
                <span>Advanced Multi-Track Editor</span>
              </Button>
            )}
          </div>
        </div>

        {/* Radix UI Progress Bar across all 4 stages */}
        <Progress value={(activeStage / 4) * 100} className="h-1.5" />

        {/* 4-Stage Interactive Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {[
            {
              stage: 1 as AutoProdStageId,
              title: 'Stage 1 · Idea & Screenplay',
              sub: `${prodState.scenes.length} Scenes · ${
                prodState.screenplayApproved ? 'Approved' : 'In Review'
              }`,
              done: prodState.screenplayApproved,
            },
            {
              stage: 2 as AutoProdStageId,
              title: 'Stage 2 · Production Assets',
              sub: `${prodState.assets.filter((a) => a.outputUrl).length}/${
                prodState.assets.length
              } Generated (Cast, Sets, Voice)`,
              done: prodState.assetsApproved,
            },
            {
              stage: 3 as AutoProdStageId,
              title: 'Stage 3 · Storyboard & Shots',
              sub: `${prodState.shots.filter((s) => s.frameImageUrl).length}/${
                prodState.shots.length
              } Continuity Frames`,
              done: prodState.storyboardApproved,
            },
            {
              stage: 4 as AutoProdStageId,
              title: 'Stage 4 · Video & Sequencer',
              sub: `${prodState.shots.filter((s) => s.videoClipUrl).length}/${
                prodState.shots.length
              } Animated Clips`,
              done: prodState.shots.some((s) => Boolean(s.videoClipUrl)),
            },
          ].map((item) => {
            const isActive = activeStage === item.stage;
            return (
              <button
                key={item.stage}
                type="button"
                onClick={() => setActiveStage(item.stage)}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 ${
                  isActive
                    ? 'bg-[#1D222B] border-[#46ecd5] shadow-[0_0_25px_rgba(70,236,213,0.15)]'
                    : item.done
                    ? 'bg-[#151820] border-emerald-500/30 hover:border-emerald-400/50'
                    : 'bg-[#15171E] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="min-w-0">
                  <div
                    className={`text-xs font-extrabold uppercase tracking-wider truncate ${
                      isActive ? 'text-[#46ecd5]' : 'text-white'
                    }`}
                  >
                    {item.title}
                  </div>
                  <div className="text-[11px] font-mono-tabular text-zinc-400 truncate mt-0.5">
                    {item.sub}
                  </div>
                </div>
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <span
                    className={`w-6 h-6 rounded-full text-[11px] font-mono-tabular font-bold flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-[#46ecd5] text-zinc-950'
                        : 'bg-white/5 text-zinc-400'
                    }`}
                  >
                    {item.stage}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SpotlightCard>

      {/* ====================================================================
          STAGE 1 — IDEA & SCREENPLAY
          ==================================================================== */}
      {activeStage === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Production Idea & Brief Inputs */}
          <SpotlightCard className="lg:col-span-5 p-5 space-y-4 self-start">
            <div className="border-b border-white/10 pb-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#46ecd5]">
                STAGE 1 · PRODUCTION BRIEF
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                Idea, Format & Creative Direction
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Describe what you want to create. The screenplay engine generates structured scenes, characters, dialogue, locations, and production cues.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Production Title
                </label>
                <input
                  type="text"
                  value={prodState.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProdState((prev) => ({ ...prev, title: val }));
                    onProjectTitleChange?.(val);
                  }}
                  placeholder="e.g. ECHOES OF LAGOS"
                  className="w-full px-3 py-2 rounded-xl bg-[#191C24] border border-white/10 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    What You Want to Create
                  </label>
                  <select
                    value={prodState.productionFormat}
                    onChange={(e) =>
                      setProdState((prev) => ({
                        ...prev,
                        productionFormat: e.target.value as CinemaProductionType,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#191C24] border border-white/10 text-white"
                  >
                    {[
                      'Short Films',
                      'Movies',
                      'Commercials',
                      'Music Videos',
                      'Documentaries',
                      'Trailers',
                      'UGC',
                      'Interviews',
                      'Explainer Videos',
                      'Montages',
                    ].map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {fmt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Master Aspect Ratio
                  </label>
                  <select
                    value={prodState.aspectRatio}
                    onChange={(e) =>
                      setProdState((prev) => ({
                        ...prev,
                        aspectRatio: e.target.value as AutoProdProjectState['aspectRatio'],
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#191C24] border border-white/10 text-white"
                  >
                    <option value="16:9">16:9 Widescreen</option>
                    <option value="21:9">21:9 Anamorphic Scope</option>
                    <option value="9:16">9:16 Vertical</option>
                    <option value="1:1">1:1 Square</option>
                    <option value="4:3">4:3 Classic Academy</option>
                    <option value="3:4">3:4 Editorial Portrait</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Description of the Idea / Story Premise
                </label>
                <textarea
                  rows={4}
                  value={prodState.ideaDescription}
                  onChange={(e) =>
                    setProdState((prev) => ({ ...prev, ideaDescription: e.target.value }))
                  }
                  placeholder="Describe your story premise, characters, conflict, and key moments..."
                  className="w-full px-3 py-2 rounded-xl bg-[#191C24] border border-white/10 text-white leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Optional Creative Instructions (Camera, Tone, Lighting, Era)
                </label>
                <textarea
                  rows={2}
                  value={prodState.creativeInstructions}
                  onChange={(e) =>
                    setProdState((prev) => ({
                      ...prev,
                      creativeInstructions: e.target.value,
                    }))
                  }
                  placeholder="e.g. 35mm Panavision Anamorphic, neo-noir rain reflections, taut dialogue..."
                  className="w-full px-3 py-2 rounded-xl bg-[#191C24] border border-white/10 text-white"
                />
              </div>

              {/* Optional Reference Images, Videos or Documents */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-300">
                    Optional Reference Images, Videos or Documents
                  </label>
                  <input
                    ref={refInputRef}
                    type="file"
                    accept="image/*,video/*,.pdf,.txt,.md"
                    onChange={handleUploadStage1Ref}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => refInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-[#1E222B] hover:bg-[#272C38] border border-white/10 text-[11px] font-semibold text-[#46ecd5] flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Attach Reference</span>
                  </button>
                </div>

                {prodState.referenceUrls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {prodState.referenceUrls.map((ref) => (
                      <span
                        key={ref.id}
                        className="px-2.5 py-1 rounded-lg bg-[#191C24] border border-white/10 text-[11px] text-zinc-200 flex items-center gap-1.5"
                      >
                        <span className="truncate max-w-[140px]">{ref.label}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setProdState((prev) => ({
                              ...prev,
                              referenceUrls: prev.referenceUrls.filter((r) => r.id !== ref.id),
                            }))
                          }
                          className="text-zinc-500 hover:text-rose-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <ShimmerButton
                type="button"
                disabled={isGeneratingScreenplay}
                onClick={handleGenerateScreenplayFromIdea}
                className="w-full justify-center rounded-xl py-2.5"
              >
                {isGeneratingScreenplay ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Structured Screenplay...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate / Regenerate Complete Screenplay</span>
                  </>
                )}
              </ShimmerButton>
            </div>
          </SpotlightCard>

          {/* Right Column: Generated Screenplay Review, Scene Breakdown & Approval */}
          <SpotlightCard className="lg:col-span-7 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#46ecd5]">
                  GENERATED SCREENPLAY ({prodState.scenes.length} SCENES)
                </div>
                <h3 className="text-base font-bold text-white">
                  Review, Edit & Approve Screenplay
                </h3>
              </div>

              <AnimatedPillTabs
                layoutId="auto-prod-screenplay-view-tabs"
                activeId={screenplayViewTab}
                items={[
                  { id: 'structured', label: 'Structured Scenes', count: prodState.scenes.length },
                  { id: 'markdown', label: 'Edit Full Script' },
                ]}
                onChange={(id) => setScreenplayViewTab(id)}
              />
            </div>

            {screenplayViewTab === 'markdown' ? (
              <div className="space-y-2">
                <div className="text-[11px] text-zinc-400">
                  Edit the screenplay directly below. Scene headings (`### INT./EXT.`), `@CHARACTER` cues, `[PROP: ...]`, and `[WARDROBE: ...]` automatically sync with Stage 2 and Stage 3.
                </div>
                <textarea
                  rows={18}
                  value={prodState.screenplayMarkdown}
                  onChange={(e) => handleScreenplayMarkdownEdit(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-[#0D0F14] border border-white/10 font-mono text-xs text-zinc-100 leading-relaxed focus:outline-none focus:border-[#46ecd5]"
                />
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {prodState.scenes.map((sc) => (
                  <div
                    key={sc.sceneId}
                    className="rounded-2xl bg-[#171A22] border border-white/10 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#46ecd5]/15 text-[#46ecd5] font-mono text-[10px] font-bold">
                          SCENE {String(sc.sceneNumber).padStart(2, '0')}
                        </span>
                        <span className="font-mono text-xs font-bold text-white">
                          {sc.heading}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400">
                        Location: {sc.locationName} · {sc.timeOfDay}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">{sc.actions}</p>

                    {sc.dialogueLines.length > 0 && (
                      <div className="space-y-2 pl-3 border-l-2 border-[#46ecd5]/40">
                        {sc.dialogueLines.map((dlg) => (
                          <div key={dlg.id} className="text-xs">
                            <span className="font-mono font-bold text-[#46ecd5]">
                              @{dlg.speaker}
                            </span>{' '}
                            <span className="text-[11px] italic text-zinc-400">
                              ({dlg.parenthetical})
                            </span>
                            <div className="text-zinc-100 mt-0.5">“{dlg.line}”</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
                      {sc.charactersInScene.map((ch) => (
                        <span
                          key={ch}
                          className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30"
                        >
                          @{ch}
                        </span>
                      ))}
                      {sc.wardrobesInScene.map((w) => (
                        <span
                          key={w}
                          className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30"
                        >
                          Wardrobe: {w}
                        </span>
                      ))}
                      {sc.propsInScene.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        >
                          Prop: {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                Extracted:{' '}
                <strong className="text-white">
                  {prodState.assets.filter((a) => a.category === 'Character').length} Characters
                </strong>
                ,{' '}
                <strong className="text-white">
                  {prodState.assets.filter((a) => a.category === 'Location').length} Locations
                </strong>
                ,{' '}
                <strong className="text-white">
                  {prodState.assets.filter((a) => a.category === 'Prop').length} Props
                </strong>
                ,{' '}
                <strong className="text-white">
                  {prodState.assets.filter((a) => a.category === 'Voice').length} Dialogue Voice Cues
                </strong>
              </div>

              <ShimmerButton
                type="button"
                onClick={handleApproveStage1AndContinue}
                className="px-5 py-2.5 rounded-xl"
              >
                <Check className="w-4 h-4" />
                <span>Approve Screenplay & Continue to Stage 2</span>
                <ArrowRight className="w-4 h-4" />
              </ShimmerButton>
            </div>
          </SpotlightCard>
        </div>
      )}

      {/* ====================================================================
          STAGE 2 — PRODUCTION ASSETS
          ==================================================================== */}
      {activeStage === 2 && (
        <div className="rounded-3xl bg-[#12141A] border border-white/10 p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#46ecd5]">
                STAGE 2 · SCREENPLAY-EXTRACTED PRODUCTION ASSETS ({prodState.assets.length})
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Characters, Locations, Wardrobes, Props & Dialogue Voice Assets
              </h3>
              <p className="text-xs text-zinc-400">
                Visual elements route strictly to compatible Image Models; spoken dialogue and voice assets route strictly to Voice/TTS Audio Models.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={batchBusy}
                onClick={handleGenerateAllStage2Assets}
                className="px-4 py-2 rounded-xl bg-[#1F232D] hover:bg-[#282D3A] border border-[#46ecd5]/40 text-xs font-bold text-[#46ecd5] flex items-center gap-1.5 disabled:opacity-50"
              >
                {batchBusy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Assets...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate All Missing Assets</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleApproveStage2AndContinue}
                className="px-4 py-2 rounded-xl bg-[#46ecd5] hover:brightness-110 text-zinc-950 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Assets & Continue to Stage 3</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <UniversalCreativeControlsBar
            surface="image"
            compact
            contextLabel="STAGE 2 · ASSET LOOK & OPTICS"
          />

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'All', label: `All (${prodState.assets.length})` },
                {
                  id: 'Character',
                  label: `Characters (${
                    prodState.assets.filter((a) => a.category === 'Character').length
                  })`,
                },
                {
                  id: 'Location',
                  label: `Locations (${
                    prodState.assets.filter((a) => a.category === 'Location').length
                  })`,
                },
                {
                  id: 'Wardrobe',
                  label: `Wardrobes (${
                    prodState.assets.filter((a) => a.category === 'Wardrobe').length
                  })`,
                },
                {
                  id: 'Prop',
                  label: `Props (${
                    prodState.assets.filter((a) => a.category === 'Prop').length
                  })`,
                },
                {
                  id: 'Voice',
                  label: `Voice & Dialogue Audio (${
                    prodState.assets.filter((a) => a.category === 'Voice').length
                  })`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAssetCategoryTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  assetCategoryTab === tab.id
                    ? 'bg-[#46ecd5] text-zinc-950'
                    : 'bg-[#191C24] text-zinc-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => {
              const isVoice = asset.category === 'Voice' || asset.outputKind === 'audio';
              const isSfxOrAmb =
                asset.audioKind === 'sfx' ||
                asset.audioKind === 'ambience' ||
                asset.audioKind === 'music';
              const compatibleList = isVoice
                ? isSfxOrAmb
                  ? musicAudioModels
                  : voiceAudioModels
                : asset.category === 'Character' || asset.category === 'Wardrobe'
                ? characterImageModels
                : asset.category === 'Location'
                ? locationImageModels
                : propImageModels;

              const cost = calculateTokenCost(
                asset.modelId || compatibleList[0]?.id || 'soul-2-standard',
                isVoice ? { duration: '10' } : { resolution: '2K' }
              );

              return (
                <div
                  key={asset.id}
                  className="rounded-2xl bg-[#171A22] border border-white/10 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#46ecd5]/15 text-[#46ecd5] font-mono text-[10px] font-bold uppercase">
                        {isVoice
                          ? `${(asset.audioKind || 'dialogue').toUpperCase()} · AUDIO`
                          : asset.category === 'Character'
                          ? 'CHARACTER · 1:1 4-PANEL SHEET'
                          : `${asset.category} · IMAGE`}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          asset.reusedElementId
                            ? 'bg-sky-500/20 text-sky-300'
                            : asset.status === 'error'
                            ? 'bg-rose-500/20 text-rose-300'
                            : asset.outputUrl
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {asset.reusedElementId
                          ? 'Reused My Element ✓'
                          : asset.status === 'error'
                          ? 'Error'
                          : asset.outputUrl
                          ? 'Approved ✓'
                          : 'Pending'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white truncate">{asset.name}</h4>
                      <div className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">
                        Scenes: {asset.sceneRefs.join(' · ')}
                      </div>
                      {asset.category === 'Character' && (
                        <p className="text-[11px] text-zinc-300 mt-1 line-clamp-2">
                          {asset.description}
                        </p>
                      )}
                    </div>

                    {/* Preview Box (True Aspect Image + Lightbox OR Audio Player) */}
                    <div className="rounded-xl overflow-hidden bg-black border border-white/10 min-h-[160px] flex items-center justify-center relative group">
                      {asset.outputUrl ? (
                        isVoice ? (
                          <div className="w-full p-4 space-y-2 text-center bg-[#0E1015]">
                            <div className="flex items-center justify-center gap-2 text-[#46ecd5] text-xs font-bold">
                              <Volume2 className="w-4 h-4" />
                              <span>
                                {asset.audioKind === 'sfx'
                                  ? 'SFX Ready'
                                  : asset.audioKind === 'ambience'
                                  ? 'Ambience Ready'
                                  : `Voice Audio Ready (@${asset.characterRef})`}
                              </span>
                            </div>
                            <audio
                              src={asset.outputUrl}
                              controls
                              className="w-full h-9"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxItem({
                                kind: 'image',
                                url: asset.outputUrl,
                                title: asset.name,
                                subtitle: `${asset.category}${asset.category === 'Character' ? ' · 1:1 4-Panel Turnaround' : ''}`,
                                aspectRatio: asset.category === 'Character' ? '1:1' : prodState.aspectRatio,
                              })
                            }
                            className="relative w-full h-full flex items-center justify-center"
                          >
                            <img
                              src={asset.outputUrl}
                              alt={asset.name}
                              className="w-full max-h-[240px] object-contain"
                            />
                            <span className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 group-hover:bg-[#46ecd5] group-hover:text-black text-white border border-white/15">
                              <Maximize2 className="w-3 h-3" />
                            </span>
                          </button>
                        )
                      ) : (
                        <div className="text-center p-4 space-y-1 text-zinc-500">
                          {isVoice ? (
                            <Mic className="w-6 h-6 mx-auto text-[#46ecd5]/60" />
                          ) : (
                            <ImageIcon className="w-6 h-6 mx-auto text-[#46ecd5]/60" />
                          )}
                          <div className="text-[11px]">
                            {isVoice
                              ? 'Synthesize audio stem'
                              : asset.category === 'Character'
                              ? 'Generate 1:1 4-Panel Turnaround Sheet or upload photo'
                              : `Generate ${asset.category.toLowerCase()} continuity plate`}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reusable My Elements Picker + Voice Options */}
                    {isVoice && !isSfxOrAmb && (
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <select
                          value={asset.language || 'English'}
                          onChange={(e) => {
                            const val = e.target.value as SupportedCharacterLanguage;
                            setProdState((prev) => ({
                              ...prev,
                              assets: prev.assets.map((a) =>
                                a.id === asset.id ? { ...a, language: val } : a
                              ),
                            }));
                          }}
                          className="px-2 py-1 rounded-lg bg-[#101218] border border-white/10 text-zinc-200"
                        >
                          {(['English', 'Nigerian Pidgin', 'Yoruba', 'Igbo', 'Hausa', 'French', 'Spanish', 'Arabic', 'Swahili', 'Japanese'] as SupportedCharacterLanguage[]).map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={asset.accentDialect || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProdState((prev) => ({
                              ...prev,
                              assets: prev.assets.map((a) =>
                                a.id === asset.id ? { ...a, accentDialect: val } : a
                              ),
                            }));
                          }}
                          placeholder="Accent / Dialect"
                          className="px-2 py-1 rounded-lg bg-[#101218] border border-white/10 text-zinc-200"
                        />
                        {voices.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => {
                              const picked = voices.find((v) => v.id === e.target.value);
                              if (picked) {
                                setProdState((prev) => ({
                                  ...prev,
                                  assets: prev.assets.map((a) =>
                                    a.id === asset.id
                                      ? {
                                          ...a,
                                          outputUrl: picked.sampleAudioUrl,
                                          language: (
                                            typeof picked.language === 'string' && picked.language
                                              ? picked.language
                                              : a.language || 'English'
                                          ) as SupportedCharacterLanguage,
                                          accentDialect:
                                            [picked.accent, picked.dialect]
                                              .filter(Boolean)
                                              .join(' · ') || a.accentDialect,
                                          reusedElementId: picked.id,
                                          status: 'approved',
                                        }
                                      : a
                                  ),
                                }));
                              }
                            }}
                            className="col-span-2 px-2 py-1 rounded-lg bg-[#101218] border border-white/10 text-[#46ecd5]"
                          >
                            <option value="">Attach Saved My Elements Voice ({voices.length})...</option>
                            {voices.map((v) => (
                              <option key={v.id} value={v.id}>{v.name} ({v.language})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {/* Prompt / Verbatim Dialogue Editor */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                        {isVoice
                          ? isSfxOrAmb
                            ? 'SFX / Ambience Prompt'
                            : 'Exact Verbatim Dialogue / Narration'
                          : 'Visual Generation Prompt'}
                      </label>
                      <textarea
                        rows={2}
                        value={asset.generationPrompt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProdState((prev) => ({
                            ...prev,
                            assets: prev.assets.map((a) =>
                              a.id === asset.id ? { ...a, generationPrompt: val } : a
                            ),
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#101218] border border-white/10 text-xs text-zinc-200"
                      />
                    </div>

                    {asset.error && (
                      <div className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300 flex items-center justify-between gap-2">
                        <span className="truncate">{asset.error}</span>
                        <button
                          type="button"
                          onClick={() => handleGenerateSingleAsset(asset)}
                          className="text-white underline shrink-0 font-bold"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Compatible Model Selector, Device Import & Generate Button */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <select
                        value={asset.modelId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProdState((prev) => ({
                            ...prev,
                            assets: prev.assets.map((a) =>
                              a.id === asset.id ? { ...a, modelId: val } : a
                            ),
                          }));
                        }}
                        className="flex-1 min-w-0 px-2 py-1.5 rounded-xl bg-[#101218] border border-white/10 text-[11px] text-zinc-200"
                      >
                        {compatibleList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label} ({m.surface.toUpperCase()})
                          </option>
                        ))}
                      </select>

                      <label
                        title="Import file from device"
                        className="px-2.5 py-1.5 rounded-xl bg-[#101218] hover:bg-[#191D26] border border-white/10 text-[11px] text-zinc-300 cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Upload className="w-3 h-3 text-[#46ecd5]" />
                        <span className="hidden sm:inline">Upload</span>
                        <input
                          type="file"
                          accept={isVoice ? 'audio/*' : 'image/*'}
                          onChange={(e) => handleUploadStage2AssetFile(asset, e)}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        disabled={asset.status === 'generating'}
                        onClick={() => handleGenerateSingleAsset(asset)}
                        className="px-3 py-1.5 rounded-xl bg-[#46ecd5] hover:brightness-110 text-zinc-950 text-[11px] font-extrabold uppercase whitespace-nowrap flex items-center gap-1 disabled:opacity-50"
                      >
                        {asset.status === 'generating' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        <span>
                          {asset.outputUrl ? 'Regen' : 'Generate'} · {cost}TK
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveStage(1)}
              className="px-4 py-2 rounded-xl bg-[#191C24] hover:bg-[#222631] text-xs font-bold text-zinc-300 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Stage 1 (Screenplay)</span>
            </button>

            <button
              type="button"
              onClick={handleApproveStage2AndContinue}
              className="px-5 py-2.5 rounded-xl bg-[#46ecd5] hover:brightness-110 text-zinc-950 font-extrabold uppercase tracking-wider text-xs flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Approve Production Assets & Continue to Stage 3</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          STAGE 3 — STORYBOARD & SHOT PLANNING
          ==================================================================== */}
      {activeStage === 3 && (
        <div className="rounded-3xl bg-[#12141A] border border-white/10 p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#46ecd5]">
                STAGE 3 · VISUAL STORYBOARD & SHOT COVERAGE ({prodState.shots.length} SHOTS)
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Scene-by-Scene Camera Framing, Character Blocking & Continuity Frames
              </h3>
              <p className="text-xs text-zinc-400">
                Each shot automatically inherits your approved Stage 2 character, location, and prop references. Regenerate or edit any individual shot without rebuilding the storyboard.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={batchBusy}
                onClick={handleGenerateAllStoryboardFrames}
                className="px-4 py-2 rounded-xl bg-[#1F232D] hover:bg-[#282D3A] border border-[#46ecd5]/40 text-xs font-bold text-[#46ecd5] flex items-center gap-1.5 disabled:opacity-50"
              >
                {batchBusy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rendering Storyboard...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate All Storyboard Frames</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleApproveStage3AndContinue}
                className="px-4 py-2 rounded-xl bg-[#46ecd5] hover:brightness-110 text-zinc-950 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Storyboard & Continue to Stage 4</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <UniversalCreativeControlsBar
            surface="image"
            activeModel={models.find((m) => m.id === prodState.shots[0]?.imageModelId)}
            compact
            contextLabel="STAGE 3 · GLOBAL STORYBOARD CINEMATOGRAPHY"
          />

          {/* Storyboard Organised by Scenes */}
          <div className="space-y-6">
            {prodState.scenes.map((sc) => {
              const sceneShots = prodState.shots.filter((s) => s.sceneId === sc.sceneId);
              return (
                <div
                  key={sc.sceneId}
                  className="rounded-2xl bg-[#161922] border border-white/10 p-4 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-[#46ecd5]/15 text-[#46ecd5] font-mono text-xs font-bold">
                        SCENE {String(sc.sceneNumber).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-sm font-bold text-white">
                        {sc.heading}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-zinc-400">
                      {sceneShots.length} Planned Shots · Set: {sc.locationName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sceneShots.map((shot) => {
                      const frameCost = calculateTokenCost(shot.imageModelId, {
                        resolution: '2K',
                      });
                      const continuityRefs = collectContinuityMediaForShot(shot);
                      const isApproved = shot.frameStatus === 'approved';

                      return (
                        <div
                          key={shot.id}
                          className={`rounded-2xl bg-[#11131A] border p-3.5 flex flex-col justify-between gap-3 ${
                            isApproved ? 'border-emerald-500/40' : 'border-white/10'
                          }`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-[#46ecd5] text-zinc-950 font-mono text-[10px] font-extrabold">
                                  SHOT {shot.shotNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setProdState((prev) => ({
                                      ...prev,
                                      shots: prev.shots.map((s) =>
                                        s.id === shot.id
                                          ? {
                                              ...s,
                                              frameStatus:
                                                s.frameStatus === 'approved' ? 'ready' : 'approved',
                                            }
                                          : s
                                      ),
                                    }))
                                  }
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    isApproved
                                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                      : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  {isApproved ? 'Approved ✓' : 'Approve'}
                                </button>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveStoryboardShot(shot.id, -1)}
                                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300"
                                  title="Move shot up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveStoryboardShot(shot.id, 1)}
                                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300"
                                  title="Move shot down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddAlternativeAngleShot(shot)}
                                  className="px-1.5 py-0.5 rounded bg-[#46ecd5]/15 text-[10px] font-semibold text-[#46ecd5]"
                                  title="Add another shot / alternate angle"
                                >
                                  + Shot
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStoryboardShot(shot.id)}
                                  className="p-1 rounded bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300"
                                  title="Delete shot"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Storyboard Frame Preview (True Aspect Ratio + Lightbox) */}
                            <div className="min-h-[160px] rounded-xl overflow-hidden bg-black border border-white/10 relative flex items-center justify-center group">
                              {shot.frameImageUrl ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxItem({
                                      kind: 'image',
                                      url: shot.frameImageUrl,
                                      title: `Shot ${shot.shotNumber} · ${shot.cameraFraming}`,
                                      subtitle: `${shot.sceneHeading} · ${shot.aspectRatio || prodState.aspectRatio}`,
                                      aspectRatio: shot.aspectRatio || prodState.aspectRatio,
                                    })
                                  }
                                  className="relative w-full h-full flex items-center justify-center"
                                >
                                  <img
                                    src={shot.frameImageUrl}
                                    alt={`Shot ${shot.shotNumber}`}
                                    className="w-full max-h-[240px] object-contain"
                                  />
                                  <span className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 group-hover:bg-[#46ecd5] group-hover:text-black text-white border border-white/15">
                                    <Maximize2 className="w-3 h-3" />
                                  </span>
                                </button>
                              ) : (
                                <div className="text-center p-3 space-y-1 text-zinc-500">
                                  <Camera className="w-6 h-6 mx-auto text-[#46ecd5]/60" />
                                  <div className="text-[11px] font-semibold text-zinc-300">
                                    {shot.cameraFraming}
                                  </div>
                                  <div className="text-[10px]">
                                    {shot.lens} · {shot.cameraMovement}
                                  </div>
                                </div>
                              )}
                              {continuityRefs.length > 0 && (
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-[#46ecd5]/40 text-[9px] font-mono text-[#46ecd5] pointer-events-none">
                                  {continuityRefs.length} Continuity Ref(s) Locked
                                </span>
                              )}
                            </div>

                            {/* Camera Framing, Movement, Lighting & Orientation */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2 rounded-lg bg-[#13161E] border border-white/5 space-y-1.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <label className="block text-[9px] font-mono uppercase text-zinc-400">
                                    Camera Framing
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <GearVisual spec={getCameraAngleVisual(shot.cameraFraming)} size="sm" />
                                    <GearVisual spec={getLensOpticVisual(shot.lens)} size="xs" />
                                  </div>
                                </div>
                                <select
                                  value={shot.cameraFraming}
                                  onChange={(e) => {
                                    const val = e.target
                                      .value as AutoProdStoryboardShot['cameraFraming'];
                                    setProdState((prev) => ({
                                      ...prev,
                                      shots: prev.shots.map((s) =>
                                        s.id === shot.id ? { ...s, cameraFraming: val } : s
                                      ),
                                    }));
                                  }}
                                  className="w-full px-2 py-1 rounded-lg bg-[#191C25] border border-white/10 text-white"
                                >
                                  {CAMERA_FRAMING_OPTIONS.map((fr) => (
                                    <option key={fr} value={fr}>
                                      {fr}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="p-2 rounded-lg bg-[#13161E] border border-white/5 space-y-1.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <label className="block text-[9px] font-mono uppercase text-zinc-400">
                                    Camera Movement
                                  </label>
                                  <GearVisual spec={getCameraMovementVisual(shot.cameraMovement)} size="sm" />
                                </div>
                                <select
                                  value={shot.cameraMovement}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setProdState((prev) => ({
                                      ...prev,
                                      shots: prev.shots.map((s) =>
                                        s.id === shot.id ? { ...s, cameraMovement: val } : s
                                      ),
                                    }));
                                  }}
                                  className="w-full px-2 py-1 rounded-lg bg-[#191C25] border border-white/10 text-white"
                                >
                                  {CAMERA_MOVEMENT_OPTIONS.map((mv) => (
                                    <option key={mv} value={mv}>
                                      {mv}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <select
                                value={shot.lighting}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProdState((prev) => ({
                                    ...prev,
                                    shots: prev.shots.map((s) =>
                                      s.id === shot.id ? { ...s, lighting: val } : s
                                    ),
                                  }));
                                }}
                                className="px-2 py-1 rounded-lg bg-[#191C25] border border-white/10 text-zinc-200"
                              >
                                {['Practicals', 'Window', 'Soft Cross', 'Silhouette', 'Golden Hour', 'Neon Rim', 'Studio Softbox'].map((l) => (
                                  <option key={l} value={l}>Lighting: {l}</option>
                                ))}
                              </select>

                              <select
                                value={shot.aspectRatio || prodState.aspectRatio}
                                onChange={(e) => {
                                  const val = e.target.value as AutoProdStoryboardShot['aspectRatio'];
                                  setProdState((prev) => ({
                                    ...prev,
                                    shots: prev.shots.map((s) =>
                                      s.id === shot.id ? { ...s, aspectRatio: val } : s
                                    ),
                                  }));
                                }}
                                className="px-2 py-1 rounded-lg bg-[#191C25] border border-white/10 text-zinc-200 font-mono"
                              >
                                {(['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'] as const).map((ar) => (
                                  <option key={ar} value={ar}>Ratio: {ar}</option>
                                ))}
                              </select>
                            </div>

                            {/* Shot Description & Edit Instructions */}
                            <div>
                              <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-0.5">
                                Action, Blocking & Visual Prompt
                              </label>
                              <textarea
                                rows={2}
                                value={shot.actionDescription}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProdState((prev) => ({
                                    ...prev,
                                    shots: prev.shots.map((s) =>
                                      s.id === shot.id ? { ...s, actionDescription: val } : s
                                    ),
                                  }));
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-[#191C25] border border-white/10 text-xs text-zinc-200"
                              />
                            </div>

                            <div>
                              <input
                                type="text"
                                value={shot.editInstruction || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProdState((prev) => ({
                                    ...prev,
                                    shots: prev.shots.map((s) =>
                                      s.id === shot.id ? { ...s, editInstruction: val } : s
                                    ),
                                  }));
                                }}
                                placeholder="Edit instruction (e.g. warmer lantern glow, wider headroom)..."
                                className="w-full px-2.5 py-1 rounded-lg bg-[#191C25] border border-white/10 text-[11px] text-zinc-200 placeholder:text-zinc-500"
                              />
                            </div>

                            {shot.dialogueOrNarration && (
                              <div className="p-2 rounded-lg bg-[#191C25] border-l-2 border-[#46ecd5] text-[11px] text-zinc-300">
                                <span className="font-mono font-bold text-[#46ecd5]">
                                  @{shot.speaker}:
                                </span>{' '}
                                “{shot.dialogueOrNarration}”
                              </div>
                            )}

                            {shot.frameError && (
                              <div className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300 flex items-center justify-between">
                                <span className="truncate">{shot.frameError}</span>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateStoryboardFrame(shot)}
                                  className="text-white underline font-bold ml-2"
                                >
                                  Retry
                                </button>
                              </div>
                            )}

                            {/* Per-Shot Cinematography Override */}
                            <div className="pt-1 space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-mono uppercase text-zinc-400">
                                  {shot.creativeControlsOverride ? 'Per-Shot Override Active' : 'Using Project Look'}
                                </span>
                                {shot.creativeControlsOverride && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setProdState((prev) => ({
                                        ...prev,
                                        shots: prev.shots.map((s) =>
                                          s.id === shot.id
                                            ? { ...s, creativeControlsOverride: undefined }
                                            : s
                                        ),
                                      }))
                                    }
                                    className="text-zinc-400 hover:text-white underline"
                                  >
                                    Use Global
                                  </button>
                                )}
                              </div>
                              <UniversalCreativeControlsBar
                                surface="image"
                                activeModel={models.find((m) => m.id === shot.imageModelId)}
                                value={shot.creativeControlsOverride || creativeControls}
                                onChange={(next: UniversalCreativeControlsState) =>
                                  setProdState((prev) => ({
                                    ...prev,
                                    shots: prev.shots.map((s) =>
                                      s.id === shot.id
                                        ? { ...s, creativeControlsOverride: next }
                                        : s
                                    ),
                                  }))
                                }
                                compact
                                contextLabel={`SHOT ${shot.shotNumber} LOOK`}
                              />
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-1.5">
                            <select
                              value={shot.imageModelId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setProdState((prev) => ({
                                  ...prev,
                                  shots: prev.shots.map((s) =>
                                    s.id === shot.id ? { ...s, imageModelId: val } : s
                                  ),
                                }));
                              }}
                              className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[#191C25] border border-white/10 text-[11px] text-zinc-300"
                            >
                              {storyboardImageModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.label}
                                </option>
                              ))}
                            </select>

                            <label
                              title="Upload replacement frame"
                              className="px-2 py-1.5 rounded-xl bg-[#191C25] hover:bg-[#222631] border border-white/10 text-[11px] text-zinc-300 cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Upload className="w-3 h-3 text-[#46ecd5]" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleUploadStoryboardFrame(shot, e)}
                                className="hidden"
                              />
                            </label>

                            <button
                              type="button"
                              disabled={shot.frameStatus === 'generating'}
                              onClick={() => handleGenerateStoryboardFrame(shot)}
                              className="px-3 py-1.5 rounded-xl bg-[#46ecd5] hover:brightness-110 text-zinc-950 text-[11px] font-extrabold uppercase flex items-center gap-1 shrink-0 disabled:opacity-50"
                            >
                              {shot.frameStatus === 'generating' ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Camera className="w-3 h-3" />
                              )}
                              <span>
                                {shot.frameImageUrl ? 'Regen' : 'Render'} · {frameCost}TK
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveStage(2)}
              className="px-4 py-2 rounded-xl bg-[#191C24] hover:bg-[#222631] text-xs font-bold text-zinc-300 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Stage 2 (Assets)</span>
            </button>

            <button
              type="button"
              onClick={handleApproveStage3AndContinue}
              className="px-5 py-2.5 rounded-xl bg-[#46ecd5] hover:brightness-110 text-zinc-950 font-extrabold uppercase tracking-wider text-xs flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Approve Storyboard & Continue to Stage 4</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          STAGE 4 — ANIMATION & VIDEO GENERATION + SEQUENCER
          ==================================================================== */}
      {activeStage === 4 && (
        <div className="space-y-5">
          {/* Top Master Sequence Monitor & Multi-Track Timeline Preview */}
          <div className="rounded-3xl bg-[#12141A] border border-white/10 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#46ecd5]">
                  STAGE 4 · SHOT ANIMATION & MULTI-TRACK SEQUENCE ASSEMBLY
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Animate Storyboard Shots & Assemble Final Cut
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={batchBusy}
                  onClick={() => handleAnimateAllStage4Shots(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#1F232D] hover:bg-[#282D3A] border border-[#46ecd5]/40 text-xs font-bold text-[#46ecd5] flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Animate Approved Shots</span>
                </button>
                <button
                  type="button"
                  disabled={batchBusy}
                  onClick={() => handleAnimateAllStage4Shots(false)}
                  className="px-4 py-2 rounded-xl bg-[#46ecd5] hover:brightness-110 text-zinc-950 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                >
                  {batchBusy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Animating Shots...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-3.5 h-3.5" />
                      <span>Animate All Storyboard Shots</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <UniversalCreativeControlsBar
              surface="video"
              activeModel={models.find((m) => m.id === activeSequenceShot?.videoModelId)}
              compact
              contextLabel="STAGE 4 · SHOT ANIMATION & COLOR GRADE"
            />

            {/* Full Interactive Multitrack & Multilayer Editing Workspace */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono uppercase text-[#46ecd5]">
                  FULL MULTITRACK & MULTILAYER NLE TIMELINE (V1/V2 + DIALOGUE/NARRATION/MUSIC/SFX + TEXT)
                </span>
                <button
                  type="button"
                  onClick={handleRebuildTimelineFromStage4}
                  className="px-3 py-1.5 rounded-xl bg-[#1F232D] hover:bg-[#282D3A] border border-white/10 text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#46ecd5]" />
                  <span>Sync Latest Shots & Audio</span>
                </button>
              </div>
              <MultiTrackTimelineEditor
                title={`${prodState.title} — Master Multitrack Edit`}
                aspectRatio={prodState.aspectRatio}
                tracks={defaultMultitrackTracks}
                clips={computedMultitrackClips}
                onChangeTracks={(nextTracks) =>
                  setProdState((prev) => ({
                    ...prev,
                    timelineTracks: nextTracks,
                    updatedAt: new Date().toISOString(),
                  }))
                }
                onChangeClips={(nextClips) =>
                  setProdState((prev) => ({
                    ...prev,
                    timelineClips: nextClips,
                    updatedAt: new Date().toISOString(),
                  }))
                }
                onOpenLightbox={(item) => setLightboxItem(item)}
              />
            </div>

            {/* Score & Dialogue Track Quick Generator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div className="rounded-2xl bg-[#161922] border border-white/10 p-4 space-y-2">
                <div className="text-[10px] font-mono uppercase text-zinc-400">
                  Stage 2 Audio Stems ({prodState.assets.filter((a) => a.category === 'Voice').length})
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {prodState.assets
                    .filter((a) => a.category === 'Voice')
                    .map((voc) => (
                      <div
                        key={voc.id}
                        className="p-2 rounded-xl bg-[#101218] border border-white/10 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate text-zinc-200">{voc.name}</span>
                        {voc.outputUrl ? (
                          <audio src={voc.outputUrl} controls className="h-7 w-40 shrink-0" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGenerateSingleAsset(voc)}
                            className="px-2 py-1 rounded bg-[#46ecd5]/15 text-[#46ecd5] text-[10px] font-bold shrink-0"
                          >
                            Synthesize
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-2xl bg-[#161922] border border-white/10 p-4 space-y-2">
                <div className="text-[10px] font-mono uppercase text-zinc-400">
                  Master Score Composer (Audio Music Model)
                </div>
                <input
                  type="text"
                  value={prodState.soundtrackPrompt}
                  onChange={(e) =>
                    setProdState((prev) => ({ ...prev, soundtrackPrompt: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#101218] border border-white/10 text-xs text-white"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={prodState.soundtrackModelId}
                    onChange={(e) =>
                      setProdState((prev) => ({
                        ...prev,
                        soundtrackModelId: e.target.value,
                      }))
                    }
                    className="flex-1 px-2.5 py-1.5 rounded-xl bg-[#101218] border border-white/10 text-[11px] text-zinc-200"
                  >
                    {musicAudioModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} (AUDIO)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleGenerateSoundtrack}
                    className="px-3 py-1.5 rounded-xl bg-[#46ecd5] text-zinc-950 text-[11px] font-extrabold uppercase shrink-0"
                  >
                    Compose Score
                  </button>
                </div>
                {prodState.soundtrackUrl && (
                  <audio src={prodState.soundtrackUrl} controls className="w-full h-8 mt-1" />
                )}
              </div>
            </div>
          </div>

          {/* Individual Storyboard-to-Video Shot Animation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prodState.shots.map((shot) => {
              const vidCost = calculateTokenCost(shot.videoModelId, {
                duration: shot.videoDurationSec || 5,
                resolution: '1080p',
              });

              return (
                <div
                  key={shot.id}
                  className="rounded-2xl bg-[#12141A] border border-white/10 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#46ecd5] text-zinc-950 font-mono text-[10px] font-extrabold">
                        SHOT {shot.shotNumber} · {shot.cameraFraming}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {shot.cameraMovement} · {shot.videoDurationSec}s
                      </span>
                    </div>

                    <div className="min-h-[160px] rounded-xl overflow-hidden bg-black border border-white/10 relative flex items-center justify-center group">
                      {shot.videoClipUrl ? (
                        <>
                          <video
                            src={shot.videoClipUrl}
                            controls
                            loop
                            muted
                            playsInline
                            className="w-full max-h-[240px] object-contain"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxItem({
                                kind: 'video',
                                url: shot.videoClipUrl,
                                title: `Shot ${shot.shotNumber} · ${shot.cameraFraming}`,
                                aspectRatio: shot.aspectRatio || prodState.aspectRatio,
                              })
                            }
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 group-hover:bg-[#46ecd5] group-hover:text-black text-white border border-white/15"
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>
                        </>
                      ) : shot.frameImageUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxItem({
                              kind: 'image',
                              url: shot.frameImageUrl,
                              title: `Shot ${shot.shotNumber} Reference Frame`,
                              aspectRatio: shot.aspectRatio || prodState.aspectRatio,
                            })
                          }
                          className="relative w-full h-full flex items-center justify-center"
                        >
                          <img
                            src={shot.frameImageUrl}
                            alt={`Shot ${shot.shotNumber}`}
                            className="w-full max-h-[240px] object-contain opacity-85"
                          />
                          <span className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 group-hover:bg-[#46ecd5] group-hover:text-black text-white border border-white/15">
                            <Maximize2 className="w-3 h-3" />
                          </span>
                        </button>
                      ) : (
                        <div className="text-xs text-zinc-500 p-4 text-center">
                          Ready to animate shot
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-zinc-300 line-clamp-2">{shot.actionDescription}</p>
                    {shot.videoError && (
                      <div className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300 flex items-center justify-between">
                        <span className="truncate">{shot.videoError}</span>
                        <button
                          type="button"
                          onClick={() => handleAnimateShotToVideo(shot)}
                          className="text-white underline font-bold ml-2"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={shot.videoModelId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProdState((prev) => ({
                            ...prev,
                            shots: prev.shots.map((s) =>
                              s.id === shot.id ? { ...s, videoModelId: val } : s
                            ),
                          }));
                        }}
                        className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[#191C25] border border-white/10 text-[11px] text-zinc-200"
                      >
                        {animationVideoModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label} (VIDEO)
                          </option>
                        ))}
                      </select>

                      <select
                        value={shot.videoDurationSec}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setProdState((prev) => ({
                            ...prev,
                            shots: prev.shots.map((s) =>
                              s.id === shot.id ? { ...s, videoDurationSec: val } : s
                            ),
                          }));
                        }}
                        className="px-2 py-1.5 rounded-lg bg-[#191C25] border border-white/10 text-[11px] text-zinc-200 font-mono-tabular"
                      >
                        <option value={5}>5s</option>
                        <option value={8}>8s</option>
                        <option value={10}>10s</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={shot.videoStatus === 'generating'}
                      onClick={() => handleAnimateShotToVideo(shot)}
                      className="w-full py-2 rounded-xl bg-[#46ecd5] hover:brightness-110 text-zinc-950 text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {shot.videoStatus === 'generating' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Animating Shot...</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-3.5 h-3.5" />
                          <span>
                            {shot.videoClipUrl ? 'Regenerate Video Clip' : 'Animate Shot to Video'} ·{' '}
                            {vidCost}TK
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveStage(3)}
              className="px-4 py-2 rounded-xl bg-[#191C24] hover:bg-[#222631] text-xs font-bold text-zinc-300 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Stage 3 (Storyboard)</span>
            </button>

            {onOpenAdvancedStoryStudio && (
              <button
                type="button"
                onClick={onOpenAdvancedStoryStudio}
                className="px-4 py-2 rounded-xl bg-[#1E222D] hover:bg-[#272C3A] border border-[#46ecd5]/40 text-xs font-bold text-[#46ecd5] flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Open Advanced Multi-Track Timeline Editor</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
