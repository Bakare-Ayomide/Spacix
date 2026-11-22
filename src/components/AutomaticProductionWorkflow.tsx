import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
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
  productionNotes: string;
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
  status: 'idle' | 'generating' | 'ready' | 'approved';
  language?: SupportedCharacterLanguage;
  voicePersona?: string;
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
  characterNames: string[];
  characterPositioning: string;
  actionDescription: string;
  emotion: string;
  dialogueOrNarration: string;
  speaker: string;
  locationName: string;
  imageModelId: string;
  frameImageUrl: string;
  frameStatus: 'idle' | 'generating' | 'ready' | 'approved';
  videoModelId: string;
  videoClipUrl: string;
  videoDurationSec: number;
  videoStatus: 'idle' | 'generating' | 'ready';
}

export interface AutoProdProjectState {
  title: string;
  ideaDescription: string;
  productionFormat: CinemaProductionType;
  aspectRatio: '16:9' | '21:9' | '9:16' | '1:1';
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
        line: trimmed,
        kind: pendingSpeaker === 'NARRATOR' || pendingSpeaker === 'V.O.' ? 'narration' : 'dialogue',
      });
      pendingSpeaker = '';
      pendingParenthetical = '';
      continue;
    }

    // Action line: extract inline @CHARACTER, [PROP: ...], [WARDROBE: ...]
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

    current.actions = current.actions ? `${current.actions} ${trimmed}` : trimmed;
  }

  flushCurrent();
  return scenes;
}

function buildAssetsFromScenes(
  scenes: AutoProdScene[],
  existingAssets: AutoProdAsset[]
): AutoProdAsset[] {
  const result: AutoProdAsset[] = [];
  const findExisting = (category: AutoProdAsset['category'], name: string) =>
    existingAssets.find(
      (a) => a.category === category && a.name.toLowerCase() === name.toLowerCase()
    );

  // 1. Characters
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
    result.push(
      existing
        ? { ...existing, sceneRefs }
        : {
            id: `ast_chr_${charName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            category: 'Character',
            name: charName,
            sceneRefs,
            description: `Lead character @${charName} with locked facial identity, consistent bone structure, and expressive cinema performance.`,
            generationPrompt: `Cinematic character identity reference portrait of ${charName}, neutral 50mm studio lighting, photorealistic skin texture, expressive eyes, consistent facial identity plate, 8k cinema still`,
            modelId: 'soul-2-standard',
            outputUrl: '',
            outputKind: 'image',
            status: 'idle',
            language: 'English',
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
    result.push(
      existing
        ? { ...existing, sceneRefs: refs }
        : {
            id: `ast_loc_${locName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            category: 'Location',
            name: locName,
            sceneRefs: refs,
            description: `${scene.settingType} ${locName} (${scene.timeOfDay}) filming environment plate.`,
            generationPrompt: `Wide 24mm anamorphic establishing location plate of ${scene.settingType} ${locName} at ${scene.timeOfDay}, cinematic volumetric lighting, production design master reference, no people`,
            modelId: 'soul-cinema',
            outputUrl: '',
            outputKind: 'image',
            status: 'idle',
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
    wardMap.set(`${firstChar} Hero Wardrobe`, {
      refs: scenes.map((s) => s.heading),
      charHint: firstChar,
    });
  }
  for (const [wName, { refs, charHint }] of wardMap.entries()) {
    const existing = findExisting('Wardrobe', wName);
    result.push(
      existing
        ? { ...existing, sceneRefs: refs }
        : {
            id: `ast_wrd_${wName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            category: 'Wardrobe',
            name: wName,
            sceneRefs: refs,
            characterRef: charHint,
            description: `Continuity costume and wardrobe reference for ${charHint || 'cast'}: ${wName}.`,
            generationPrompt: `Cinema costume lookbook reference plate of ${wName}, high-detail fabric texture, tailored silhouette, studio rim lighting`,
            modelId: 'soul-2-standard',
            outputUrl: '',
            outputKind: 'image',
            status: 'idle',
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
    result.push(
      existing
        ? { ...existing, sceneRefs: refs }
        : {
            id: `ast_prp_${pName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            category: 'Prop',
            name: pName,
            sceneRefs: refs,
            description: `Hero production prop with locked finish and scale: ${pName}.`,
            generationPrompt: `Macro hero prop continuity photograph of ${pName}, brushed metal and tactile material detail, dramatic rim lighting on dark soundstage`,
            modelId: 'nano-banana-2-1',
            outputUrl: '',
            outputKind: 'image',
            status: 'idle',
          }
    );
  }

  // 5. Voice & Dialogue Audio Assets (routed strictly to Voice/TTS Audio Models!)
  for (const sc of scenes) {
    for (const dlg of sc.dialogueLines) {
      const voiceAssetName = `${dlg.speaker} — "${dlg.line.slice(0, 34)}${dlg.line.length > 34 ? '...' : ''}"`;
      const existing = existingAssets.find((a) => a.id === `ast_voc_${dlg.id}`);
      result.push(
        existing || {
          id: `ast_voc_${dlg.id}`,
          category: 'Voice',
          name: voiceAssetName,
          sceneRefs: [sc.heading],
          characterRef: dlg.speaker,
          description: `Spoken ${dlg.kind} by @${dlg.speaker} (${dlg.parenthetical}) in ${sc.heading}.`,
          generationPrompt: dlg.line,
          modelId: 'inworld-tts-studio',
          outputUrl: '',
          outputKind: 'audio',
          status: 'idle',
          language: 'English',
          voicePersona: 'noir_narrator',
        }
      );
    }
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
    submitGeneration,
    uploadReferenceFile,
    saveCharacter,
    saveLocation,
    saveWardrobe,
    saveProp,
    saveCinemaProject,
    calculateTokenCost,
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
    const initialAssets = buildAssetsFromScenes(initialScenes, []);
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
        const nextAssets = buildAssetsFromScenes(nextScenes, prodState.assets);
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
    const nextAssets = buildAssetsFromScenes(nextScenes, prodState.assets);
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
    const nextAssets = buildAssetsFromScenes(nextScenes, prodState.assets);
    const nextShots = buildStoryboardShotsFromScenes(nextScenes, prodState.shots);
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
      aspectRatio: prodState.aspectRatio,
      logline: prodState.ideaDescription,
      screenplayRaw: prodState.screenplayMarkdown,
    });
    setActiveStage(2);
    showToast('Stage 1 Screenplay approved — extracted Stage 2 Production Assets');
  };

  // =========================================================================
  // STAGE 2 HANDLERS — PRODUCTION ASSETS (IMAGE & VOICE/AUDIO ROUTING)
  // =========================================================================
  const handleGenerateSingleAsset = async (asset: AutoProdAsset) => {
    setProdState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) =>
        a.id === asset.id ? { ...a, status: 'generating' } : a
      ),
    }));

    // Strict model-capability routing: Voice assets MUST route to audio/TTS models; visual assets MUST route to image models!
    const isVoice = asset.category === 'Voice' || asset.outputKind === 'audio';
    const toolId = isVoice
      ? 'speech_dialogue'
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

    const settingsPayload: Record<string, string | number | boolean> = isVoice
      ? {
          voice_persona: asset.voicePersona || 'noir_narrator',
          speaking_rate: 1.0,
          duration: '10',
        }
      : {
          aspect_ratio: asset.category === 'Character' || asset.category === 'Wardrobe' ? '1:1' : prodState.aspectRatio === '21:9' ? '16:9' : prodState.aspectRatio,
          resolution: '2K',
        };

    const res = await submitGeneration({
      surface: isVoice ? 'audio' : 'image',
      modelId: compatibleModel.id,
      mode: compatibleModel.modes[0] || (isVoice ? 'Voice & SFX' : 'Create'),
      prompt: asset.generationPrompt,
      settings: settingsPayload,
      media: [],
    });

    const outUrl = res.generation?.outputs?.[0]?.url || '';
    if (outUrl) {
      setProdState((prev) => ({
        ...prev,
        assets: prev.assets.map((a) =>
          a.id === asset.id
            ? {
                ...a,
                modelId: compatibleModel.id,
                outputUrl: outUrl,
                status: 'approved',
              }
            : a
        ),
        updatedAt: new Date().toISOString(),
      }));

      // Persist visual element into global MySQL Continuity Library so it's reusable everywhere
      if (asset.category === 'Character') {
        await saveCharacter({
          name: asset.name,
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
    } else {
      setProdState((prev) => ({
        ...prev,
        assets: prev.assets.map((a) =>
          a.id === asset.id ? { ...a, status: 'idle' } : a
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
      showToast('All Stage 2 production assets generated & synced to Continuity Library');
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
    // Attach approved Character reference images from Stage 2
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
    // Attach approved Location reference image from Stage 2
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
        s.id === shot.id ? { ...s, frameStatus: 'generating' } : s
      ),
    }));

    // Strict routing to Image model for Storyboard Keyframe generation
    const imageModel = resolveCompatibleModel(
      'storyboard_planning',
      shot.imageModelId,
      models,
      'image'
    );

    const continuityMedia = collectContinuityMediaForShot(shot);
    const fullFramePrompt = [
      `[Storyboard Keyframe · Shot ${shot.shotNumber} · ${shot.cameraFraming} · Lens: ${shot.lens} · Lighting: ${shot.lighting}]`,
      `Location: ${shot.sceneHeading}.`,
      `Blocking: ${shot.characterPositioning}.`,
      `Action: ${shot.actionDescription}`,
      shot.emotion ? `Expression: ${shot.emotion}.` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const res = await submitGeneration({
      surface: 'image',
      modelId: imageModel.id,
      mode: imageModel.modes[0] || 'Create',
      prompt: fullFramePrompt,
      settings: {
        aspect_ratio: prodState.aspectRatio === '21:9' ? '16:9' : prodState.aspectRatio,
        resolution: '2K',
      },
      media: continuityMedia,
    });

    const outUrl = res.generation?.outputs?.[0]?.url || '';
    setProdState((prev) => ({
      ...prev,
      shots: prev.shots.map((s) =>
        s.id === shot.id
          ? {
              ...s,
              imageModelId: imageModel.id,
              frameImageUrl: outUrl || s.frameImageUrl,
              frameStatus: outUrl ? 'approved' : 'idle',
            }
          : s
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleGenerateAllStoryboardFrames = async () => {
    setBatchBusy(true);
    try {
      const pending = prodState.shots.filter((s) => !s.frameImageUrl);
      for (const shot of pending) {
        await handleGenerateStoryboardFrame(shot);
      }
      showToast('Generated all storyboard keyframes with Stage 2 continuity locks');
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
      videoClipUrl: '',
      videoStatus: 'idle',
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
    showToast('Stage 3 Storyboard approved — ready for Stage 4 Video Animation & Sequencing');
  };

  // =========================================================================
  // STAGE 4 HANDLERS — ANIMATION & VIDEO GENERATION + SEQUENCER
  // =========================================================================
  const handleAnimateShotToVideo = async (shot: AutoProdStoryboardShot) => {
    setProdState((prev) => ({
      ...prev,
      shots: prev.shots.map((s) =>
        s.id === shot.id ? { ...s, videoStatus: 'generating' } : s
      ),
    }));

    // Strict routing to Video model for Shot Animation
    const videoModel = resolveCompatibleModel(
      'video_creation',
      shot.videoModelId,
      models,
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
      `[Cinema Animation · Shot ${shot.shotNumber} · ${shot.cameraFraming} · Camera Move: ${shot.cameraMovement} · Lens: ${shot.lens} · Lighting: ${shot.lighting}]`,
      shot.actionDescription,
      shot.dialogueOrNarration
        ? `@${shot.speaker} speaks with expressive lip sync: "${shot.dialogueOrNarration}"`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    const res = await submitGeneration({
      surface: 'video',
      modelId: videoModel.id,
      mode: videoModel.modes[0] || 'Create Video',
      prompt: animPrompt,
      settings: {
        aspect_ratio: prodState.aspectRatio === '21:9' ? '16:9' : prodState.aspectRatio,
        duration: shot.videoDurationSec || 5,
        resolution: '1080p',
        sound: true,
      },
      media: mediaInputs,
    });

    const outUrl = res.generation?.outputs?.[0]?.url || '';
    setProdState((prev) => ({
      ...prev,
      shots: prev.shots.map((s) =>
        s.id === shot.id
          ? {
              ...s,
              videoModelId: videoModel.id,
              videoClipUrl: outUrl || s.videoClipUrl,
              videoStatus: outUrl ? 'ready' : 'idle',
            }
          : s
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAnimateAllStage4Shots = async () => {
    setBatchBusy(true);
    try {
      for (const shot of prodState.shots) {
        if (!shot.videoClipUrl) {
          await handleAnimateShotToVideo(shot);
        }
      }
      showToast('All storyboard shots animated into video clips');
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
    const outUrl = res.generation?.outputs?.[0]?.url || '';
    if (outUrl) {
      setProdState((prev) => ({
        ...prev,
        soundtrackUrl: outUrl,
        updatedAt: new Date().toISOString(),
      }));
      showToast(`Generated master score via ${musicModel.label}`);
    }
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
              const compatibleList = isVoice
                ? voiceAudioModels
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
                        {asset.category} · {isVoice ? 'AUDIO TTS MODEL' : 'IMAGE MODEL'}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          asset.outputUrl
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {asset.outputUrl ? 'Approved' : 'Ready to Generate'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white truncate">{asset.name}</h4>
                      <div className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">
                        Scenes: {asset.sceneRefs.join(' · ')}
                      </div>
                    </div>

                    {/* Preview Box (Image or Audio Player) */}
                    <div className="rounded-xl overflow-hidden bg-[#0E1015] border border-white/10 aspect-video flex items-center justify-center relative">
                      {asset.outputUrl ? (
                        isVoice ? (
                          <div className="w-full p-4 space-y-2 text-center">
                            <div className="flex items-center justify-center gap-2 text-[#46ecd5] text-xs font-bold">
                              <Volume2 className="w-4 h-4" />
                              <span>Voice Audio Ready (@{asset.characterRef})</span>
                            </div>
                            <audio
                              src={asset.outputUrl}
                              controls
                              className="w-full h-9"
                            />
                          </div>
                        ) : (
                          <img
                            src={asset.outputUrl}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
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
                              ? 'Synthesize character dialogue via Voice TTS model'
                              : `Generate ${asset.category.toLowerCase()} continuity plate`}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Prompt / Dialogue Line Editor */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                        {isVoice ? 'Spoken Dialogue / Narration Text' : 'Visual Generation Prompt'}
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
                  </div>

                  {/* Compatible Model Selector & Generate Button */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between gap-2">
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
                        className="flex-1 px-2.5 py-1.5 rounded-xl bg-[#101218] border border-white/10 text-[11px] text-zinc-200"
                      >
                        {compatibleList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label} ({m.surface.toUpperCase()})
                          </option>
                        ))}
                      </select>

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
                          {asset.outputUrl ? 'Regenerate' : 'Generate'} · {cost}TK
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

                      return (
                        <div
                          key={shot.id}
                          className="rounded-2xl bg-[#11131A] border border-white/10 p-3.5 flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#46ecd5] text-zinc-950 font-mono text-[10px] font-extrabold">
                                SHOT {shot.shotNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddAlternativeAngleShot(shot)}
                                className="text-[10px] font-semibold text-[#46ecd5] hover:underline"
                              >
                                + Alt Angle Coverage
                              </button>
                            </div>

                            {/* Storyboard Frame Preview */}
                            <div className="aspect-video rounded-xl overflow-hidden bg-black border border-white/10 relative flex items-center justify-center">
                              {shot.frameImageUrl ? (
                                <img
                                  src={shot.frameImageUrl}
                                  alt={`Shot ${shot.shotNumber}`}
                                  className="w-full h-full object-cover"
                                />
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
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-[#46ecd5]/40 text-[9px] font-mono text-[#46ecd5]">
                                  {continuityRefs.length} Continuity Ref(s) Locked
                                </span>
                              )}
                            </div>

                            {/* Camera Framing & Movement Controls with Real Transparent Gear Graphics */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2 rounded-lg bg-[#13161E] border border-white/5 space-y-1.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <label className="block text-[9px] font-mono uppercase text-zinc-400">
                                    Camera Angle / Framing
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
                            </div>

                            {/* Shot Description & Blocking Editor */}
                            <div>
                              <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-0.5">
                                Action, Positioning & Expression
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

                            {shot.dialogueOrNarration && (
                              <div className="p-2 rounded-lg bg-[#191C25] border-l-2 border-[#46ecd5] text-[11px] text-zinc-300">
                                <span className="font-mono font-bold text-[#46ecd5]">
                                  @{shot.speaker}:
                                </span>{' '}
                                “{shot.dialogueOrNarration}”
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
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
                              className="flex-1 px-2 py-1.5 rounded-lg bg-[#191C25] border border-white/10 text-[11px] text-zinc-300"
                            >
                              {storyboardImageModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.label}
                                </option>
                              ))}
                            </select>

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
                                {shot.frameImageUrl ? 'Regen Frame' : 'Render Frame'} · {frameCost}TK
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
                  onClick={handleAnimateAllStage4Shots}
                  className="px-4 py-2 rounded-xl bg-[#46ecd5] hover:brightness-110 text-zinc-950 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                >
                  {batchBusy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Animating All Shots...</span>
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

            {/* Master Sequence Player + Score & Audio Track Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-7 rounded-2xl bg-black border border-white/10 overflow-hidden">
                <div className="aspect-video relative flex items-center justify-center bg-[#090B10]">
                  {activeSequenceShot?.videoClipUrl ? (
                    <video
                      key={activeSequenceShot.videoClipUrl}
                      src={activeSequenceShot.videoClipUrl}
                      controls
                      autoPlay={isPlayingSequence}
                      onEnded={() => {
                        if (activeSequenceShotIdx < prodState.shots.length - 1) {
                          setActiveSequenceShotIdx((prev) => prev + 1);
                        } else {
                          setIsPlayingSequence(false);
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : activeSequenceShot?.frameImageUrl ? (
                    <img
                      src={activeSequenceShot.frameImageUrl}
                      alt={`Shot ${activeSequenceShot.shotNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2 text-zinc-400">
                      <Film className="w-8 h-8 mx-auto text-[#46ecd5]" />
                      <div className="text-sm font-bold text-white">
                        Shot {activeSequenceShot?.shotNumber || '01'} ·{' '}
                        {activeSequenceShot?.cameraFraming}
                      </div>
                      <div className="text-xs">
                        Click “Animate Shot” on any card below to render video footage using your compatible Video Model.
                      </div>
                    </div>
                  )}

                  {activeSequenceShot && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 border border-white/15 text-[11px] font-mono text-white">
                      SHOT {activeSequenceShot.shotNumber} · {activeSequenceShot.cameraFraming} ·{' '}
                      {activeSequenceShot.cameraMovement}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-[#151821] border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlayingSequence((v) => !v)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-extrabold flex items-center gap-1.5"
                    >
                      {isPlayingSequence ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause Sequence</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Play Full Sequence</span>
                        </>
                      )}
                    </button>
                    <span className="text-xs font-mono-tabular text-zinc-300">
                      Shot {activeSequenceShotIdx + 1} of {prodState.shots.length}
                    </span>
                  </div>

                  {activeSequenceShot?.videoClipUrl && (
                    <a
                      href={activeSequenceShot.videoClipUrl}
                      download={`spacix-${prodState.title}-shot-${activeSequenceShot.shotNumber}.mp4`}
                      className="px-3 py-1.5 rounded-xl bg-[#1E222D] hover:bg-[#272C3A] border border-white/10 text-xs font-bold text-white flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-[#46ecd5]" />
                      <span>Download Shot MP4</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Right Column: Multi-Track Audio & Timeline Strip */}
              <div className="lg:col-span-5 rounded-2xl bg-[#161922] border border-white/10 p-4 space-y-4">
                <div>
                  <div className="text-xs font-mono uppercase text-[#46ecd5]">
                    MULTI-TRACK TIMELINE & SOUNDTRACK
                  </div>
                  <h4 className="text-sm font-bold text-white mt-0.5">
                    Video Track + Voice Dialogue + Music Score
                  </h4>
                </div>

                {/* Track V1: Video Shot Strip */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-zinc-400">
                    Track V1 · Video Sequence ({prodState.shots.length} Cuts)
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {prodState.shots.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveSequenceShotIdx(idx)}
                        className={`px-2.5 py-2 rounded-xl border text-left shrink-0 min-w-[96px] transition-all ${
                          idx === activeSequenceShotIdx
                            ? 'bg-[#46ecd5]/20 border-[#46ecd5] text-white'
                            : s.videoClipUrl
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                            : 'bg-[#101218] border-white/10 text-zinc-400'
                        }`}
                      >
                        <div className="text-[10px] font-mono font-bold">
                          SHOT {s.shotNumber}
                        </div>
                        <div className="text-[9px] truncate">{s.cameraFraming}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Track A1: Dialogue Voice Assets from Stage 2 */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-zinc-400">
                    Track A1 · Dialogue & Voice Tracks (
                    {prodState.assets.filter((a) => a.category === 'Voice').length})
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {prodState.assets
                      .filter((a) => a.category === 'Voice')
                      .map((voc) => (
                        <div
                          key={voc.id}
                          className="p-2 rounded-xl bg-[#101218] border border-white/10 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="truncate text-zinc-200">{voc.name}</span>
                          {voc.outputUrl ? (
                            <audio src={voc.outputUrl} controls className="h-7 w-36 shrink-0" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleGenerateSingleAsset(voc)}
                              className="px-2 py-1 rounded bg-[#46ecd5]/15 text-[#46ecd5] text-[10px] font-bold shrink-0"
                            >
                              Synthesize Voice
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Track A2: Music & Score Generator (routed strictly to Audio Music models) */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="text-[10px] font-mono uppercase text-zinc-400">
                    Track A2 · Film Score & Soundscape (Audio Music Model)
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

                    <div className="aspect-video rounded-xl overflow-hidden bg-black border border-white/10 relative flex items-center justify-center">
                      {shot.videoClipUrl ? (
                        <video
                          src={shot.videoClipUrl}
                          controls
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : shot.frameImageUrl ? (
                        <img
                          src={shot.frameImageUrl}
                          alt={`Shot ${shot.shotNumber}`}
                          className="w-full h-full object-cover opacity-85"
                        />
                      ) : (
                        <div className="text-xs text-zinc-500 p-4 text-center">
                          Ready to animate shot
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-zinc-300 line-clamp-2">{shot.actionDescription}</p>
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
                        className="flex-1 px-2 py-1.5 rounded-lg bg-[#191C25] border border-white/10 text-[11px] text-zinc-200"
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
