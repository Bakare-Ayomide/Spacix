import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clapperboard,
  Clock,
  Compass,
  Download,
  Edit3,
  Eye,
  Film,
  Folder,
  FolderPlus,
  Heart,
  Home,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Maximize2,
  Mic,
  Move,
  Music,
  Package,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shirt,
  Sliders,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Users,
  Video,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import { useRuns } from '../lib/useRuns';
import {
  CinemaProductionProject,
  CinemaProductionType,
  MediaSlotInput,
  ProductionScene,
  ProductionShot,
  StudioId,
} from '../types/studio';
import { StoryStudioView } from './StoryStudioView';
import { MusicVideoStudio } from './MusicVideoStudio';
import { SPACI6X_STUDIOS } from './ContinuityStudiosView';

// ============================================================================
// HIGGSFIELD CINEMA STUDIO 4.0 — VISUAL DIRECTING PRESETS & OPTICS CATALOG
// ============================================================================

export interface FilmSetupConfig {
  genre: string;
  era: string;
  tempo: string;
}

export interface CameraOpticsConfig {
  camera: string;
  lens: string;
  aperture: string;
  movements: string[];
}

export interface ColorGradePreset {
  id: string;
  name: string;
  description: string;
  promptTokens: string;
  swatches: string[];
  previewGradient: string;
}

export interface LightingSchemePreset {
  id: string;
  name: string;
  description: string;
  promptTokens: string;
  previewGradient: string;
}

export interface ReferenceSlotItem {
  id: string;
  kind: 'character' | 'location' | 'prop' | 'wardrobe' | 'image' | 'video';
  label: string;
  sublabel: string;
  url: string;
  entityId?: string;
}

export interface AIDirectorShotSuggestion {
  shotNumber: string;
  camera: string;
  lens: string;
  movement: string;
  lighting: string;
  emotion: string;
  action: string;
}

const GENRE_PRESETS = [
  {
    id: 'General',
    label: 'General',
    subtitle: 'Balanced cinematic storytelling',
    gradient: 'from-lime-500/40 via-emerald-600/30 to-zinc-900',
    prompt: 'narrative cinema grade, balanced dramatic staging',
  },
  {
    id: 'Drama',
    label: 'Drama',
    subtitle: 'Intimate character-driven emotional realism',
    gradient: 'from-amber-500/35 via-orange-900/40 to-zinc-950',
    prompt: 'intimate dramatic cinema, nuanced emotional blocking, natural skin texture',
  },
  {
    id: 'Action',
    label: 'Action',
    subtitle: 'High-impact kinetic choreography & visceral tension',
    gradient: 'from-cyan-500/35 via-blue-900/40 to-zinc-950',
    prompt: 'kinetic action cinema, dynamic camera energy, crisp motion shutters',
  },
  {
    id: 'Sci-Fi Noir',
    label: 'Sci-Fi Noir',
    subtitle: 'Atmospheric neon shadows & futuristic scale',
    gradient: 'from-teal-400/40 via-indigo-900/45 to-zinc-950',
    prompt: 'neo-noir sci-fi cinematography, wet reflective surfaces, volumetric atmosphere',
  },
  {
    id: 'Thriller',
    label: 'Thriller',
    subtitle: 'Taut psychological suspense & shadow framing',
    gradient: 'from-emerald-600/35 via-slate-900/50 to-black',
    prompt: 'taut psychological thriller framing, negative space tension, low-key contrast',
  },
  {
    id: 'Horror',
    label: 'Horror',
    subtitle: 'Unsettling dread, deep shadows & eerie practicals',
    gradient: 'from-rose-700/35 via-red-950/50 to-black',
    prompt: 'elevated atmospheric horror, chiaroscuro dread, unsettling depth',
  },
  {
    id: 'Epic',
    label: 'Epic',
    subtitle: 'Monumental widescreen vistas & grand scale',
    gradient: 'from-yellow-500/35 via-amber-800/40 to-zinc-950',
    prompt: 'monumental 70mm epic scale, sweeping vistas, heroic composition',
  },
  {
    id: 'Documentary',
    label: 'Documentary',
    subtitle: 'Authentic observational realism & natural light',
    gradient: 'from-sky-500/30 via-zinc-800/50 to-zinc-950',
    prompt: 'cinema verite observational documentary look, available light authenticity',
  },
];

const ERA_PRESETS = [
  { id: '1920s', label: '1920s', prompt: '1920s silver nitrate orthochromatic film look' },
  { id: '1960s', label: '1960s', prompt: '1960s Technicolor & French New Wave 35mm celluloid' },
  { id: '1970s', label: '1970s', prompt: '1970s New Hollywood Eastmancolor 5254 warm grain' },
  { id: '1980s', label: '1980s', prompt: '1980s analog anamorphic film stock with warm halation' },
  { id: '1990s', label: '1990s', prompt: '1990s Super 35 celluloid print with rich blacks' },
  { id: 'Auto', label: 'Auto', prompt: '' },
  { id: '2000s', label: '2000s', prompt: '2000s bleach-bypass high-contrast cinema print' },
  { id: '2020s', label: '2020s', prompt: '2020s large-format digital cinema sensor clarity' },
  { id: '2090s', label: '2090s', prompt: '2090s futuristic holographic cyber-cinema optics' },
];

const TEMPO_PRESETS = [
  {
    id: 'Calm',
    label: 'Calm',
    subtitle: 'Contemplative, lingering takes & unhurried rhythm',
    bars: 2,
    prompt: 'contemplative slow-burn pacing, lingering deliberate camera cadence',
  },
  {
    id: 'Auto',
    label: 'Auto',
    subtitle: 'Natural narrative pacing matched to scene action',
    bars: 3,
    prompt: '',
  },
  {
    id: 'Measured',
    label: 'Measured',
    subtitle: 'Steady dramatic pulse with purposeful movement',
    bars: 3,
    prompt: 'measured dramatic pacing, poised theatrical rhythm',
  },
  {
    id: 'Dynamic',
    label: 'Dynamic',
    subtitle: 'Energetic momentum & responsive camera tracking',
    bars: 4,
    prompt: 'dynamic kinetic pacing, brisk purposeful motion',
  },
  {
    id: 'Frenetic',
    label: 'Frenetic',
    subtitle: 'High-adrenaline urgency & rapid kinetic energy',
    bars: 5,
    prompt: 'high-adrenaline urgent tempo, visceral rapid kinetic energy',
  },
];

const CAMERA_BODIES = [
  { id: 'DV Camcorder', label: 'DV Camcorder', sub: 'MiniDV CCD texture', prompt: 'shot on vintage MiniDV camcorder CCD sensor' },
  { id: 'Auto', label: 'Auto', sub: 'Optimal cinema sensor', prompt: '' },
  { id: 'Modern', label: 'Modern', sub: 'ARRI Alexa 65 Large Format', prompt: 'shot on ARRI Alexa 65 large-format cinema camera' },
  { id: '35mm Film', label: '35mm Film', sub: 'Panavision Millennium XL2', prompt: 'shot on 35mm Kodak Vision3 500T film camera, organic film grain' },
  { id: '16mm Bolex', label: '16mm Bolex', sub: 'Super 16 celluloid grain', prompt: 'shot on Super 16mm Arriflex 416 film camera, tactile celluloid grain' },
  { id: 'IMAX 70mm', label: 'IMAX 70mm', sub: '15-perf 65mm monumental', prompt: 'shot on IMAX 15/70mm film camera, extreme resolving power' },
];

const LENS_OPTICS = [
  { id: 'Halation Vintage', label: 'Halation Vintage', sub: 'Canon K35 / Cooke Panchro', prompt: 'vintage Canon K35 prime lens with warm highlight halation' },
  { id: 'Auto', label: 'Auto', sub: 'Matched optical character', prompt: '' },
  { id: 'Clean Sharp', label: 'Clean Sharp', sub: 'ARRI Signature Prime', prompt: 'ARRI Signature Prime lens, edge-to-edge optical clarity' },
  { id: 'Anamorphic', label: 'Anamorphic', sub: 'Panavision C-Series 2x', prompt: 'Panavision C-Series 2x anamorphic lens, oval bokeh and horizontal blue lens flare' },
  { id: '24mm Wide', label: '24mm Wide', sub: 'Spatial wide perspective', prompt: '24mm wide-angle cinema prime lens, deep spatial perspective' },
  { id: '85mm Portrait', label: '85mm Portrait', sub: 'Intimate telephoto compression', prompt: '85mm portrait cinema prime lens, compressed background separation' },
];

const APERTURE_STOPS = [
  { id: 'f/11 Deep Focus', label: 'f/11 Deep Focus', sub: 'Everything razor sharp', prompt: 'f/11 deep focus cinematography, foreground and background sharp' },
  { id: 'Auto', label: 'Auto', sub: 'Balanced depth of field', prompt: '' },
  { id: 'f/1.4 Wide Open', label: 'f/1.4 Wide Open', sub: 'Dreamy shallow bokeh', prompt: 'f/1.4 wide-open aperture, razor-thin focal plane, creamy optical bokeh' },
  { id: 'f/2.0 Shallow', label: 'f/2.0 Shallow', sub: 'Subject isolation', prompt: 'f/2.0 shallow depth of field, soft background falloff' },
  { id: 'f/2.8 Cinematic', label: 'f/2.8 Cinematic', sub: 'Classic narrative T2.8', prompt: 'T2.8 narrative cinema stop, natural subject separation' },
  { id: 'f/5.6 Balanced', label: 'f/5.6 Balanced', sub: 'Environmental context', prompt: 'f/5.6 medium-deep aperture, clear environmental context' },
];

const CAMERA_MOVEMENTS = [
  { id: 'Snorricam', label: 'Snorricam', desc: 'Body-mounted subject lock', gradient: 'from-lime-500/30 via-emerald-900/40 to-zinc-950' },
  { id: 'Robot arm', label: 'Robot arm', desc: 'Precision Bolt high-speed arc', gradient: 'from-cyan-500/30 via-teal-900/40 to-zinc-950' },
  { id: 'Tilt up', label: 'Tilt up', desc: 'Vertical reveal upward', gradient: 'from-emerald-500/30 via-green-950/40 to-zinc-950' },
  { id: 'Rack focus', label: 'Rack focus', desc: 'Shift focal plane between subjects', gradient: 'from-amber-500/30 via-lime-900/40 to-zinc-950' },
  { id: 'Tilt down', label: 'Tilt down', desc: 'Vertical descent framing', gradient: 'from-teal-500/30 via-slate-900/40 to-zinc-950' },
  { id: 'POV', label: 'POV', desc: 'First-person subjective perspective', gradient: 'from-sky-500/30 via-emerald-950/40 to-zinc-950' },
  { id: 'Pan left', label: 'Pan left', desc: 'Smooth horizontal pan left', gradient: 'from-lime-400/30 via-zinc-900/50 to-zinc-950' },
  { id: 'Crane up', label: 'Crane up', desc: 'Sweeping jib elevation', gradient: 'from-emerald-400/30 via-teal-950/40 to-zinc-950' },
  { id: 'Dolly in', label: 'Dolly in', desc: 'Slow push-in toward subject', gradient: 'from-cyan-400/30 via-slate-900/40 to-zinc-950' },
  { id: 'Dolly out', label: 'Dolly out', desc: 'Pull-back spatial reveal', gradient: 'from-indigo-400/30 via-slate-900/40 to-zinc-950' },
  { id: 'Tracking shot', label: 'Tracking shot', desc: 'Steadicam follow alongside subject', gradient: 'from-amber-400/30 via-zinc-900/40 to-zinc-950' },
  { id: 'Orbit 360', label: 'Orbit 360', desc: 'Circular parallax wrap around hero', gradient: 'from-rose-400/30 via-zinc-900/40 to-zinc-950' },
];

const COLOR_PALETTES: ColorGradePreset[] = [
  {
    id: 'Auto',
    name: 'Auto',
    description: 'Scene-adaptive cinema color science',
    promptTokens: '',
    swatches: ['#18181b', '#27272a', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#e4e4e7'],
    previewGradient: 'from-zinc-700 via-zinc-800 to-zinc-950',
  },
  {
    id: 'Static Noon',
    name: 'Static Noon',
    description: 'High-contrast monochrome silver gelatin with olive undertones',
    promptTokens: 'Static Noon color grade, high-contrast silver monochrome with subtle warm olive midtones',
    swatches: ['#111315', '#2a2e2b', '#4b5249', '#76806c', '#9ca68f', '#cbd2c4', '#f4f5f0'],
    previewGradient: 'from-zinc-200/40 via-stone-700/60 to-black',
  },
  {
    id: 'Twilight Fable',
    name: 'Twilight Fable',
    description: 'Deep cyan-teal shadows with golden tungsten highlights',
    promptTokens: 'Twilight Fable LUT, deep Prussian teal shadows, warm golden ochre highlights, Kodachrome contrast',
    swatches: ['#09151a', '#13313d', '#24525e', '#7c6b3b', '#b89648', '#dfc178', '#78502b'],
    previewGradient: 'from-teal-900/70 via-amber-600/40 to-slate-950',
  },
  {
    id: 'Back Row Kissing Seats',
    name: 'Back Row Kissing Seats',
    description: 'Saturated neon crimson, electric cobalt & velvet shadows',
    promptTokens: 'Back Row Kissing Seats color palette, saturated crimson reds, electric cobalt blues, neon theater glow',
    swatches: ['#3b0a0a', '#7f1d1d', '#dc2626', '#1d4ed8', '#22c55e', '#a3e635', '#ef4444'],
    previewGradient: 'from-red-600/60 via-blue-700/50 to-zinc-950',
  },
  {
    id: 'On the Other Side of the Port',
    name: 'On the Other Side of the Port',
    description: 'Nostalgic coastal Kodak Portra 400 with maritime blues & brick red',
    promptTokens: 'Kodak Portra 400 coastal film palette, muted maritime slate blues, warm terracotta reds, soft daylight',
    swatches: ['#141619', '#7f1d1d', '#3b4d71', '#6b82a8', '#9ab0cb', '#d4c5b9', '#b91c1c'],
    previewGradient: 'from-sky-700/50 via-rose-800/40 to-slate-950',
  },
  {
    id: 'The Emerald Ambush',
    name: 'The Emerald Ambush',
    description: 'Lush rainforest greens, moss shadows & diffused canopy light',
    promptTokens: 'The Emerald Ambush color grade, deep forest canopy greens, organic moss shadows, misty shafts of light',
    swatches: ['#0a1910', '#163020', '#274e35', '#3d704c', '#659970', '#a3c9a8', '#1e3a29'],
    previewGradient: 'from-emerald-800/60 via-green-950/70 to-black',
  },
  {
    id: 'Highway Standoff',
    name: 'Highway Standoff',
    description: 'Sun-baked desert ochre, dusty denim & western gold',
    promptTokens: 'Highway Standoff color palette, sun-baked desert ochre, dusty cobalt sky, warm golden-hour contrast',
    swatches: ['#1c1610', '#3d2f1d', '#6e5534', '#9c7a49', '#c9a96e', '#e5d3a7', '#1e3a8a'],
    previewGradient: 'from-amber-600/55 via-yellow-900/50 to-stone-950',
  },
  {
    id: 'The Faded Fresco',
    name: 'The Faded Fresco',
    description: 'Soft European pastel daylight, warm sandstone & sage',
    promptTokens: 'The Faded Fresco color grade, soft pastel sandstone, warm Mediterranean sage, gentle highlight roll-off',
    swatches: ['#2b2620', '#4a4236', '#736754', '#9c8f79', '#bfb5a2', '#dfd9cc', '#3f382e'],
    previewGradient: 'from-stone-400/40 via-amber-900/35 to-zinc-950',
  },
];

const LIGHTING_PRESETS: LightingSchemePreset[] = [
  {
    id: 'Auto',
    name: 'Auto',
    description: 'Natural scene-aware cinema lighting',
    promptTokens: '',
    previewGradient: 'from-zinc-400/30 via-zinc-700/40 to-zinc-950',
  },
  {
    id: 'Silhouette',
    name: 'Silhouette',
    description: 'Dramatic golden backlight carving a stark dark subject outline',
    promptTokens: 'dramatic backlit silhouette lighting, strong golden rim light against deep shadow foreground',
    previewGradient: 'from-amber-500/60 via-orange-900/50 to-black',
  },
  {
    id: 'Practicals',
    name: 'Practicals',
    description: 'In-frame torches, lamps, and neon sources illuminating the darkness',
    promptTokens: 'motivated practical lighting, warm torch and tungsten practical lamps glowing against cool midnight blue',
    previewGradient: 'from-blue-900/60 via-amber-500/45 to-black',
  },
  {
    id: 'Window',
    name: 'Window',
    description: 'Soft directional daylight streaming through interior window panes',
    promptTokens: 'soft directional window key light, Roger Deakins natural interior falloff, gentle shadow contrast',
    previewGradient: 'from-sky-300/40 via-slate-800/60 to-zinc-950',
  },
  {
    id: 'Overhead fall',
    name: 'Overhead fall',
    description: 'Top-down interrogation & soundstage pool of light',
    promptTokens: 'overhead top-down softbox lighting falloff, dramatic eye-socket shadows, sculpted cheekbones',
    previewGradient: 'from-emerald-500/35 via-teal-950/60 to-black',
  },
  {
    id: 'Soft Cross',
    name: 'Soft Cross',
    description: 'Wrapping dual cross-keys for expressive character close-ups',
    promptTokens: 'soft cross-key cinema lighting, diffused warm key and cool fill, flattering facial modeling',
    previewGradient: 'from-rose-400/35 via-indigo-950/50 to-zinc-950',
  },
];

const EMOTION_DIRECTIONS = [
  'Auto',
  'Neutral',
  'Sadness',
  'Determined',
  'Joy',
  'Anger',
  'Fear',
  'Surprise',
  'Contemplative',
];

export const HiggsfieldCinemaStudio: React.FC = () => {
  const {
    models,
    generations,
    uploads,
    characters,
    wardrobes,
    propsList,
    locations,
    cinemaProjects,
    activeContinuity,
    setActiveContinuity,
    submitGeneration,
    uploadReferenceFile,
    composeContinuityPrompt,
    saveCinemaProject,
    navigate,
    routeParams,
    showToast,
  } = useRuns();

  // ==========================================================================
  // WORKSPACE MODE & NAVIGATION STATE
  // ==========================================================================
  const [workingMode, setWorkingMode] = useState<'director' | 'music_video' | 'production'>(() =>
    routeParams?.mode === 'music_video' ? 'music_video' : 'director'
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'home' | 'elements' | 'favorites' | 'project'>('home');
  const [projectSearch, setProjectSearch] = useState('');
  const [activeSubfolder, setActiveSubfolder] = useState<'all' | 'scenes' | 'versions' | 'deliverables'>('all');
  const [favoriteGenIds, setFavoriteGenIds] = useState<string[]>([]);

  // Active Production Project State
  const [selectedProjId, setSelectedProjId] = useState<string | null>(
    () => cinemaProjects[0]?.id || null
  );
  const [projectTitle, setProjectTitle] = useState(
    () => cinemaProjects[0]?.title || 'ECHOES OF LAGOS'
  );
  const [productionType, setProductionType] = useState<CinemaProductionType>(
    () => cinemaProjects[0]?.productionType || 'Short Films'
  );

  // ==========================================================================
  // HIGGSFIELD CINEMA STUDIO 4.0 DOCK & DIRECTOR'S PANEL STATE
  // ==========================================================================
  const [dockSurface, setDockSurface] = useState<'video' | 'image'>('video');
  const [scenePrompt, setScenePrompt] = useState('');
  const [selectedVideoModelId, setSelectedVideoModelId] = useState('seedance-2-5');
  const [selectedImageModelId, setSelectedImageModelId] = useState('soul-2-standard');
  const [resolution, setResolution] = useState<'1080p' | '2K' | '4K'>('1080p');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '21:9' | '9:16' | '1:1'>('16:9');
  const [durationSec, setDurationSec] = useState<number>(5);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('Auto');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Stage 3 Director's Panel Popover State
  const [activePopover, setActivePopover] = useState<
    null | 'references' | 'film_setup' | 'camera' | 'color_palette' | 'lighting' | 'models' | 'at_elements'
  >(null);
  const [filmSetupTab, setFilmSetupTab] = useState<'genre' | 'era' | 'tempo'>('genre');
  const [cameraModalTab, setCameraModalTab] = useState<'setup' | 'movement'>('setup');
  const [movementSearch, setMovementSearch] = useState('');
  const [paletteSearch, setPaletteSearch] = useState('');
  const [lightingSearch, setLightingSearch] = useState('');

  // Custom user-created presets in modals
  const [customPalettes, setCustomPalettes] = useState<ColorGradePreset[]>([]);
  const [customLighting, setCustomLighting] = useState<LightingSchemePreset[]>([]);
  const [newPaletteName, setNewPaletteName] = useState('');
  const [newLightingName, setNewLightingName] = useState('');

  // Director's Panel Active Values
  const [filmSetup, setFilmSetup] = useState<FilmSetupConfig>({
    genre: 'Auto',
    era: 'Auto',
    tempo: 'Auto',
  });
  const [cameraOptics, setCameraOptics] = useState<CameraOpticsConfig>({
    camera: 'Auto',
    lens: 'Auto',
    aperture: 'Auto',
    movements: [],
  });
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('Auto');
  const [selectedLightingId, setSelectedLightingId] = useState<string>('Auto');

  // Up to 50 References per generation (Stage 2)
  const [customRefs, setCustomRefs] = useState<ReferenceSlotItem[]>([]);
  const refUploadInputRef = useRef<HTMLInputElement>(null);

  // Stage 5 & 6: Active Shot Inspector, Extend, Edit Video & Finalize Color Grading
  const [inspectedGenId, setInspectedGenId] = useState<string | null>(null);
  const [gradeContrast, setGradeContrast] = useState(100);
  const [gradeSaturation, setGradeSaturation] = useState(105);
  const [gradeWarmth, setGradeWarmth] = useState(0);
  const [gradeHalation, setGradeHalation] = useState(15);
  const [deliverableIds, setDeliverableIds] = useState<string[]>([]);

  // AI Director Assistant Drawer & Screenplay-to-Shot Breakdown
  const [aiDirectorOpen, setAiDirectorOpen] = useState(false);
  const [aiDirectorInput, setAiDirectorInput] = useState(
    'A king enters his palace at midnight and discovers that his throne room is empty.'
  );
  const [aiDirectorBusy, setAiDirectorBusy] = useState(false);
  const [aiShotList, setAiShotList] = useState<AIDirectorShotSuggestion[]>([
    {
      shotNumber: '01',
      camera: 'Extreme Wide · 24mm Anamorphic',
      lens: 'Anamorphic',
      movement: 'Crane up',
      lighting: 'Silhouette',
      emotion: 'Contemplative',
      action: 'Establish the towering obsidian palace courtyard under rain and torchlight.',
    },
    {
      shotNumber: '02',
      camera: 'Medium Wide · 35mm Film',
      lens: 'Halation Vintage',
      movement: 'Dolly in',
      lighting: 'Practicals',
      emotion: 'Determined',
      action: 'The king pushes open the heavy bronze doors and enters the grand hall.',
    },
    {
      shotNumber: '03',
      camera: 'Tracking Shot · Modern',
      lens: 'Clean Sharp',
      movement: 'Tracking shot',
      lighting: 'Window',
      emotion: 'Neutral',
      action: 'Steadicam follows the king past marble pillars toward the dais.',
    },
    {
      shotNumber: '04',
      camera: 'Close-Up · 85mm Portrait',
      lens: '85mm Portrait',
      movement: 'Rack focus',
      lighting: 'Soft Cross',
      emotion: 'Surprise',
      action: 'The king stops mid-stride as his eyes lock onto the dais.',
    },
    {
      shotNumber: '05',
      camera: 'POV · 24mm Wide',
      lens: '24mm Wide',
      movement: 'POV',
      lighting: 'Overhead fall',
      emotion: 'Fear',
      action: 'Subjective POV revealing the empty throne bathed in cold overhead moonlight.',
    },
    {
      shotNumber: '06',
      camera: 'Extreme Close-Up · f/1.4 Wide Open',
      lens: 'Anamorphic',
      movement: 'Dolly in',
      lighting: 'Silhouette',
      emotion: 'Sadness',
      action: 'Extreme close-up on the king’s eyes as realization and grief take hold.',
    },
  ]);

  // ==========================================================================
  // COMPUTED REFERENCES (UP TO 50) & ACTIVE MODEL
  // ==========================================================================
  const allReferences = useMemo<ReferenceSlotItem[]>(() => {
    const list: ReferenceSlotItem[] = [];
    for (const chrId of activeContinuity.characterIds) {
      const c = characters.find((item) => item.id === chrId);
      if (c) {
        list.push({
          id: `ref_chr_${c.id}`,
          kind: 'character',
          label: `@${c.name}`,
          sublabel: `${c.identityId} · ${c.primaryLanguage}`,
          url: c.faceReferenceUrl || '',
          entityId: c.id,
        });
      }
    }
    if (activeContinuity.locationId) {
      const loc = locations.find((item) => item.id === activeContinuity.locationId);
      if (loc) {
        list.push({
          id: `ref_loc_${loc.id}`,
          kind: 'location',
          label: `@${loc.name}`,
          sublabel: `${loc.settingType} · ${loc.timeOfDay}`,
          url: loc.primaryImageUrl || '',
          entityId: loc.id,
        });
      }
    }
    if (activeContinuity.wardrobeId) {
      const w = wardrobes.find((item) => item.id === activeContinuity.wardrobeId);
      if (w) {
        list.push({
          id: `ref_wrd_${w.id}`,
          kind: 'wardrobe',
          label: w.name,
          sublabel: w.category,
          url: w.referenceImageUrl || '',
          entityId: w.id,
        });
      }
    }
    for (const propId of activeContinuity.propIds) {
      const p = propsList.find((item) => item.id === propId);
      if (p) {
        list.push({
          id: `ref_prp_${p.id}`,
          kind: 'prop',
          label: p.name,
          sublabel: p.category,
          url: p.referenceImageUrl || '',
          entityId: p.id,
        });
      }
    }
    for (const cr of customRefs) {
      if (list.length < 50) {
        list.push(cr);
      }
    }
    return list.slice(0, 50);
  }, [activeContinuity, characters, locations, wardrobes, propsList, customRefs]);

  const videoModels = useMemo(
    () => models.filter((m) => m.surface === 'video'),
    [models]
  );
  const imageModels = useMemo(
    () => models.filter((m) => m.surface === 'image'),
    [models]
  );

  const activeModel = useMemo(() => {
    const targetId = dockSurface === 'video' ? selectedVideoModelId : selectedImageModelId;
    return (
      models.find((m) => m.id === targetId) ||
      (dockSurface === 'video' ? videoModels[0] : imageModels[0]) ||
      models[0]
    );
  }, [dockSurface, selectedVideoModelId, selectedImageModelId, models, videoModels, imageModels]);

  const allPalettes = useMemo(
    () => [...COLOR_PALETTES, ...customPalettes],
    [customPalettes]
  );
  const allLighting = useMemo(
    () => [...LIGHTING_PRESETS, ...customLighting],
    [customLighting]
  );

  const activePalette = useMemo(
    () => allPalettes.find((p) => p.id === selectedPaletteId) || COLOR_PALETTES[0],
    [allPalettes, selectedPaletteId]
  );
  const activeLighting = useMemo(
    () => allLighting.find((l) => l.id === selectedLightingId) || LIGHTING_PRESETS[0],
    [allLighting, selectedLightingId]
  );

  const inspectedGen = useMemo(
    () =>
      generations.find((g) => g.id === inspectedGenId) ||
      generations.find((g) => g.status === 'completed' && g.outputs.length > 0) ||
      null,
    [generations, inspectedGenId]
  );

  const estimatedCredits = useMemo(() => {
    const base = activeModel
      ? Math.max(5, Math.round(activeModel.baseHfUsd * 200))
      : dockSurface === 'video'
      ? 65
      : 15;
    const resMult = resolution === '4K' ? 1.5 : resolution === '2K' ? 1.2 : 1;
    const durMult = dockSurface === 'video' && durationSec > 5 ? 1.6 : 1;
    return Math.round(base * resMult * durMult * batchSize);
  }, [activeModel, dockSurface, resolution, durationSec, batchSize]);

  // Summary labels for the 5 Director's Panel cards in the dock
  const filmSetupSummary = useMemo(() => {
    const parts = [
      filmSetup.genre !== 'Auto' ? filmSetup.genre : '',
      filmSetup.era !== 'Auto' ? filmSetup.era : '',
      filmSetup.tempo !== 'Auto' ? filmSetup.tempo : '',
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Auto';
  }, [filmSetup]);

  const cameraSummary = useMemo(() => {
    const parts = [
      cameraOptics.camera !== 'Auto' ? cameraOptics.camera : '',
      cameraOptics.lens !== 'Auto' ? cameraOptics.lens : '',
      cameraOptics.aperture !== 'Auto' ? cameraOptics.aperture : '',
      ...cameraOptics.movements,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Auto';
  }, [cameraOptics]);

  // ==========================================================================
  // COMPOSE FULL CINEMATOGRAPHY + CONTINUITY PROMPT & GENERATE (STAGE 3 & 4)
  // ==========================================================================
  const buildDirectedPrompt = (rawUserPrompt: string): string => {
    const directives: string[] = [];

    if (filmSetup.genre !== 'Auto') {
      const g = GENRE_PRESETS.find((item) => item.id === filmSetup.genre);
      directives.push(g?.prompt || `${filmSetup.genre} cinema genre`);
    }
    if (filmSetup.era !== 'Auto') {
      const e = ERA_PRESETS.find((item) => item.id === filmSetup.era);
      directives.push(e?.prompt || `${filmSetup.era} period look`);
    }
    if (filmSetup.tempo !== 'Auto') {
      const t = TEMPO_PRESETS.find((item) => item.id === filmSetup.tempo);
      if (t?.prompt) directives.push(t.prompt);
    }

    if (cameraOptics.camera !== 'Auto') {
      const c = CAMERA_BODIES.find((item) => item.id === cameraOptics.camera);
      directives.push(c?.prompt || `Camera: ${cameraOptics.camera}`);
    }
    if (cameraOptics.lens !== 'Auto') {
      const l = LENS_OPTICS.find((item) => item.id === cameraOptics.lens);
      directives.push(l?.prompt || `Lens: ${cameraOptics.lens}`);
    }
    if (cameraOptics.aperture !== 'Auto') {
      const a = APERTURE_STOPS.find((item) => item.id === cameraOptics.aperture);
      directives.push(a?.prompt || `Aperture: ${cameraOptics.aperture}`);
    }
    if (cameraOptics.movements.length > 0) {
      directives.push(`Camera movement sequence: ${cameraOptics.movements.join(' -> ')}`);
    }

    if (activePalette.id !== 'Auto' && activePalette.promptTokens) {
      directives.push(activePalette.promptTokens);
    }
    if (activeLighting.id !== 'Auto' && activeLighting.promptTokens) {
      directives.push(activeLighting.promptTokens);
    }
    if (selectedEmotion !== 'Auto') {
      directives.push(`Character emotional performance: ${selectedEmotion}`);
    }

    const cleanScene =
      rawUserPrompt.trim() ||
      `Cinematic shot from "${projectTitle}" (${productionType})`;

    return directives.length > 0
      ? `[Cinema Studio 4.0 Direction — ${directives.join(' | ')}] ${cleanScene}`
      : cleanScene;
  };

  const handleGenerateShot = async (overridePrompt?: string, overrideMedia?: MediaSlotInput[]) => {
    const directed = buildDirectedPrompt(overridePrompt ?? scenePrompt);
    const extraMedia: MediaSlotInput[] = overrideMedia ? [...overrideMedia] : [];

    for (const ref of customRefs) {
      if (ref.url) {
        extraMedia.push({
          role: ref.kind === 'video' ? 'video' : 'reference',
          kind: ref.kind === 'video' ? 'video' : 'image',
          url: ref.url,
          label: ref.label,
        });
      }
    }

    const composed = composeContinuityPrompt(directed, undefined, extraMedia);
    const modelId =
      activeModel?.id || (dockSurface === 'video' ? 'seedance-2-5' : 'soul-2-standard');

    setIsSubmitting(true);
    try {
      for (let i = 0; i < batchSize; i++) {
        const settingsPayload: Record<string, string | number | boolean> = {
          aspect_ratio: aspectRatio === '21:9' ? '16:9' : aspectRatio,
          resolution,
        };
        if (dockSurface === 'video') {
          settingsPayload.duration = durationSec;
          settingsPayload.sound = soundEnabled;
        }
        const res = await submitGeneration({
          surface: dockSurface,
          modelId,
          mode: dockSurface === 'video' ? 'Create Video' : 'Create',
          prompt: composed.prompt,
          settings: settingsPayload,
          media: composed.media,
        });
        if (res.generation?.id) {
          setInspectedGenId(res.generation.id);
        }
      }
      setActivePopover(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================================
  // STAGE 5 WORKFLOWS: USE AS REFERENCE, EXTEND CLIP, EDIT VIDEO
  // ==========================================================================
  const handleAddGenerationAsReference = (genId: string) => {
    const gen = generations.find((g) => g.id === genId);
    const out = gen?.outputs?.[0];
    if (!gen || !out) return;
    if (allReferences.length >= 50) {
      showToast('Maximum 50 visual references reached for this generation');
      return;
    }
    setCustomRefs((prev) => [
      ...prev,
      {
        id: `ref_gen_${gen.id}_${Date.now()}`,
        kind: out.kind === 'video' ? 'video' : 'image',
        label: `Shot #${gen.id.slice(-4)}`,
        sublabel: gen.modelLabel,
        url: out.url,
      },
    ]);
    showToast('Added shot to Cinema Studio 4.0 References rack (up to 50)');
  };

  const handleExtendShot = async (direction: 'forward' | 'backward') => {
    if (!inspectedGen || !inspectedGen.outputs[0]) return;
    const out = inspectedGen.outputs[0];
    setDockSurface('video');
    const extendPrompt =
      direction === 'forward'
        ? `Continue shot seamlessly forward (+5s continuation): ${inspectedGen.prompt}`
        : `Precede shot seamlessly backward (-5s prequel motion): ${inspectedGen.prompt}`;
    setScenePrompt(extendPrompt);
    await handleGenerateShot(extendPrompt, [
      {
        role: direction === 'forward' ? 'start' : 'end',
        kind: out.kind === 'video' ? 'video' : 'image',
        url: out.url,
        label: `${direction === 'forward' ? 'Continue From' : 'Lead Into'} Shot`,
      },
    ]);
  };

  const handleUploadCustomReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      const isVideo = file.type.startsWith('video/');
      const upl = await uploadReferenceFile({
        label: file.name,
        contentType: file.type || (isVideo ? 'video/mp4' : 'image/png'),
        bytes: file.size,
        dataUrl,
      });
      if (upl) {
        setCustomRefs((prev) => [
          ...prev,
          {
            id: `ref_upl_${upl.id}`,
            kind: isVideo ? 'video' : 'image',
            label: file.name.slice(0, 22),
            sublabel: isVideo ? 'Video Ref' : 'Photo Ref',
            url: upl.publicUrl,
          },
        ]);
      }
    };
    reader.readAsDataURL(file);
  };

  // ==========================================================================
  // AI DIRECTOR ASSISTANT: INTERPRET SCENE & POPULATE SETTINGS + SHOT LIST
  // ==========================================================================
  const handleRunAIDirectorBreakdown = async () => {
    if (!aiDirectorInput.trim()) return;
    setAiDirectorBusy(true);
    try {
      const res = await fetch('/api/story-studio/ai-cowriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'outline',
          instruction: aiDirectorInput,
          currentMarkdown: `# ${projectTitle}\n\n${aiDirectorInput}`,
          title: projectTitle,
          globalStyle: `${filmSetup.genre !== 'Auto' ? filmSetup.genre : 'Cinema'} / ${
            cameraOptics.lens !== 'Auto' ? cameraOptics.lens : '35mm Anamorphic'
          }`,
          libraryAssets: [
            ...characters.map((c) => ({ category: 'Character', name: c.name })),
            ...locations.map((l) => ({ category: 'Location', name: l.name })),
            ...propsList.map((p) => ({ category: 'Prop', name: p.name })),
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      const cleanBrief = aiDirectorInput.trim();
      const charLead = characters[0]?.name ? `@${characters[0].name}` : 'the protagonist';
      const locLead = locations[0]?.name ? `@${locations[0].name}` : 'the main set';

      const generatedShots: AIDirectorShotSuggestion[] = [
        {
          shotNumber: '01',
          camera: 'Modern',
          lens: '24mm Wide',
          movement: 'Crane up',
          lighting: 'Silhouette',
          emotion: 'Contemplative',
          action: `Extreme Wide establishing ${locLead}: ${cleanBrief}`,
        },
        {
          shotNumber: '02',
          camera: '35mm Film',
          lens: 'Anamorphic',
          movement: 'Dolly in',
          lighting: 'Practicals',
          emotion: 'Determined',
          action: `Medium Wide as ${charLead} enters the space and surveys the environment.`,
        },
        {
          shotNumber: '03',
          camera: 'Modern',
          lens: 'Clean Sharp',
          movement: 'Tracking shot',
          lighting: 'Window',
          emotion: 'Neutral',
          action: `Tracking shot following ${charLead} moving through the room (${
            data?.provider ? `AI Engine: ${data.provider}` : 'Continuity Locked'
          }).`,
        },
        {
          shotNumber: '04',
          camera: '35mm Film',
          lens: '85mm Portrait',
          movement: 'Rack focus',
          lighting: 'Soft Cross',
          emotion: 'Surprise',
          action: `Close-Up on ${charLead} noticing a critical detail in the scene.`,
        },
        {
          shotNumber: '05',
          camera: 'Modern',
          lens: '24mm Wide',
          movement: 'POV',
          lighting: 'Overhead fall',
          emotion: 'Fear',
          action: `Subjective POV revealing what ${charLead} just discovered.`,
        },
        {
          shotNumber: '06',
          camera: '35mm Film',
          lens: 'Anamorphic',
          movement: 'Dolly in',
          lighting: 'Silhouette',
          emotion: 'Sadness',
          action: `Extreme Close-Up capturing ${charLead}'s emotional reaction in f/1.4 shallow focus.`,
        },
      ];
      setAiShotList(generatedShots);
      showToast('AI Director prepared 6 camera-directed shots for review');
    } finally {
      setAiDirectorBusy(false);
    }
  };

  const applyAIShotToDirectorPanel = (shot: AIDirectorShotSuggestion) => {
    setCameraOptics((prev) => ({
      ...prev,
      camera: CAMERA_BODIES.some((c) => c.id === shot.camera) ? shot.camera : '35mm Film',
      lens: LENS_OPTICS.some((l) => l.id === shot.lens) ? shot.lens : 'Anamorphic',
      aperture: shot.shotNumber === '06' || shot.shotNumber === '04' ? 'f/1.4 Wide Open' : 'f/2.8 Cinematic',
      movements: [shot.movement],
    }));
    if (LIGHTING_PRESETS.some((l) => l.id === shot.lighting)) {
      setSelectedLightingId(shot.lighting);
    }
    setSelectedEmotion(shot.emotion);
    setScenePrompt(`${shot.action} #${shot.movement.replace(/\s+/g, '')}`);
    showToast(`Loaded Shot ${shot.shotNumber} into Director's Panel — ready to review & generate`);
  };

  // Helper to cycle through wheel items in Camera Setup modal
  const cycleWheelOption = <T extends { id: string }>(
    list: T[],
    currentId: string,
    dir: -1 | 1
  ): string => {
    const idx = list.findIndex((item) => item.id === currentId);
    const nextIdx = (idx + dir + list.length) % list.length;
    return list[nextIdx].id;
  };

  const toggleCameraMovement = (moveLabel: string) => {
    setCameraOptics((prev) => {
      const exists = prev.movements.includes(moveLabel);
      const nextMoves = exists
        ? prev.movements.filter((m) => m !== moveLabel)
        : [...prev.movements, moveLabel];
      return { ...prev, movements: nextMoves };
    });
    const tag = `#${moveLabel.replace(/\s+/g, '')}`;
    if (!scenePrompt.includes(tag)) {
      setScenePrompt((prev) => `${prev.trim()} ${tag}`.trim());
    }
  };

  const insertElementToken = (token: string, chrId?: string, locId?: string, propId?: string) => {
    setScenePrompt((prev) => (prev.includes(token) ? prev : `${prev.trim()} ${token} `.trimStart()));
    if (chrId) {
      setActiveContinuity((prev) => ({
        ...prev,
        characterIds: prev.characterIds.includes(chrId)
          ? prev.characterIds
          : [...prev.characterIds, chrId],
      }));
    }
    if (locId) {
      setActiveContinuity((prev) => ({ ...prev, locationId: locId }));
    }
    if (propId) {
      setActiveContinuity((prev) => ({
        ...prev,
        propIds: prev.propIds.includes(propId) ? prev.propIds : [...prev.propIds, propId],
      }));
    }
  };

  // Create a new production project in MySQL
  const handleCreateNewProduction = async () => {
    const nextTitle = `PRODUCTION ${cinemaProjects.length + 1}`;
    const created = await saveCinemaProject({
      title: nextTitle,
      productionType: 'Short Films',
      aspectRatio: '16:9',
      logline: 'New virtual film production directed in SPACI6X Cinema Studio.',
      screenplayRaw: `INT. MAIN SOUNDSTAGE - NIGHT\nCamera dollies in on the hero under soft cross lighting.`,
      castCharacterIds: characters.map((c) => c.id),
      wardrobeIds: wardrobes.map((w) => w.id),
      propIds: propsList.map((p) => p.id),
      locationIds: locations.map((l) => l.id),
      scenes: [],
    });
    if (created) {
      setSelectedProjId(created.id);
      setProjectTitle(created.title);
      setProductionType(created.productionType);
      showToast(`Created production "${created.title}"`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#090A0C] text-zinc-100 flex flex-col">
      {/* ====================================================================
          TOP STUDIO & CONTINUITY BAR (12 SPACI6X STUDIOS + MODE SWITCHER)
          ==================================================================== */}
      <div className="bg-[#0D0E11] border-b border-white/10 px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {SPACI6X_STUDIOS.map((st) => {
            const isActive = st.id === 'cinema';
            return (
              <button
                key={st.id}
                onClick={() => navigate(st.id as StudioId)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#46ecd5] text-zinc-950 font-bold shadow-sm'
                    : 'bg-[#141519] text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                <Clapperboard className="w-3 h-3" />
                <span>{st.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Three Working Modes Toggle: DIRECTOR MODE vs MUSIC VIDEO vs PRODUCTION MODE */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center p-0.5 rounded-xl bg-[#141519] border border-white/10">
            <button
              type="button"
              onClick={() => setWorkingMode('director')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                workingMode === 'director'
                  ? 'bg-[#46ecd5] text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>DIRECTOR MODE</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkingMode('music_video')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                workingMode === 'music_video'
                  ? 'bg-[#46ecd5] text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>MUSIC VIDEO</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkingMode('production')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                workingMode === 'production'
                  ? 'bg-[#46ecd5] text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>PRODUCTION MODE</span>
            </button>
          </div>

          {workingMode === 'director' && (
            <button
              type="button"
              onClick={() => setAiDirectorOpen((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                aiDirectorOpen
                  ? 'bg-[#46ecd5]/20 border-[#46ecd5] text-[#46ecd5]'
                  : 'bg-[#141519] border-white/10 text-zinc-200 hover:border-white/25'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 text-[#46ecd5]" />
              <span>AI Director</span>
            </button>
          )}
        </div>
      </div>

      {/* ====================================================================
          MAIN WORKSPACE BODY
          ==================================================================== */}
      {workingMode === 'production' ? (
        <div className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4">
          <StoryStudioView onSwitchToLegacyCinema={() => setWorkingMode('director')} />
        </div>
      ) : workingMode === 'music_video' ? (
        <MusicVideoStudio projectId={selectedProjId} projectTitle={projectTitle} />
      ) : (
        <div className="flex-1 flex relative overflow-hidden">
          {/* ================================================================
              A. LEFT PERSISTENT PRODUCTION & ELEMENTS SIDEBAR (HIGGSFIELD UI)
              ================================================================ */}
          <aside
            className={`${
              sidebarCollapsed ? 'w-16' : 'w-64'
            } shrink-0 bg-[#121316] border-r border-white/10 flex flex-col justify-between transition-all duration-200 select-none z-20`}
          >
            <div className="p-3 space-y-4 overflow-y-auto no-scrollbar">
              {/* Top Brand Pill & Collapse Toggle */}
              <div className="flex items-center justify-between gap-2">
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1A1C20] border border-white/10 flex-1 min-w-0">
                    <img
                      src="/brand/logo.png"
                      alt="SPACIX"
                      className="h-5 w-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="text-xs font-extrabold tracking-wider uppercase text-white truncate">
                      CINEMA 4.0
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  className="p-2 rounded-xl bg-[#1A1C20] hover:bg-[#22252B] border border-white/10 text-zinc-400 hover:text-white"
                >
                  {sidebarCollapsed ? (
                    <PanelLeftOpen className="w-4 h-4" />
                  ) : (
                    <PanelLeftClose className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Primary Navigation: Home, My elements, My favorites */}
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSidebarTab('home')}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    sidebarTab === 'home'
                      ? 'bg-[#202227] text-white shadow-inner border border-white/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                    <Home className="w-3.5 h-3.5 text-zinc-200" />
                  </span>
                  {!sidebarCollapsed && <span>Home</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setSidebarTab('elements')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    sidebarTab === 'elements'
                      ? 'bg-[#202227] text-white shadow-inner border border-white/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0 text-sky-400 font-mono text-xs font-extrabold">
                      @
                    </span>
                    {!sidebarCollapsed && <span>My elements</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                      {characters.length + locations.length + propsList.length + wardrobes.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSidebarTab('favorites')}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    sidebarTab === 'favorites'
                      ? 'bg-[#202227] text-white shadow-inner border border-white/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-400/40 flex items-center justify-center shrink-0">
                      <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
                    </span>
                    {!sidebarCollapsed && <span>My favorites</span>}
                  </div>
                  {!sidebarCollapsed && favoriteGenIds.length > 0 && (
                    <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300">
                      {favoriteGenIds.length}
                    </span>
                  )}
                </button>
              </nav>

              {/* Projects Section */}
              {!sidebarCollapsed && (
                <div className="pt-3 border-t border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-semibold text-zinc-400">Projects</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setWorkingMode('production')}
                        title="Open 4-Stage Storyboard & Script Pipeline"
                        className="p-1 text-zinc-500 hover:text-white"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="Search productions..."
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-[#181A1F] border border-white/10 text-[11px] text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateNewProduction}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[#1A1C22] hover:bg-[#22252D] border border-white/10 text-xs font-semibold text-zinc-200 transition-all"
                  >
                    <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-[#46ecd5]" />
                    </span>
                    <span>New project</span>
                  </button>

                  {/* Active Production List + Subfolders (Scenes / Versions / Deliverables) */}
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {cinemaProjects
                      .filter((p) =>
                        !projectSearch.trim()
                          ? true
                          : p.title.toLowerCase().includes(projectSearch.toLowerCase())
                      )
                      .map((proj) => {
                        const isSelected = proj.id === selectedProjId;
                        return (
                          <div key={proj.id} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProjId(proj.id);
                                setProjectTitle(proj.title);
                                setProductionType(proj.productionType);
                                setAspectRatio(proj.aspectRatio);
                                setSidebarTab('project');
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-all ${
                                isSelected
                                  ? 'bg-[#46ecd5]/15 text-[#46ecd5] font-bold border border-[#46ecd5]/30'
                                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <span className="truncate">{proj.title}</span>
                              <span className="text-[10px] font-mono-tabular opacity-75">
                                {proj.aspectRatio}
                              </span>
                            </button>
                            {isSelected && (
                              <div className="pl-4 space-y-0.5 text-[11px]">
                                {(
                                  [
                                    { id: 'scenes', label: `Scenes (${proj.scenes?.length || 1})` },
                                    { id: 'versions', label: `Versions (${generations.length})` },
                                    {
                                      id: 'deliverables',
                                      label: `Deliverables (${deliverableIds.length})`,
                                    },
                                  ] as const
                                ).map((folder) => (
                                  <button
                                    key={folder.id}
                                    type="button"
                                    onClick={() => {
                                      setActiveSubfolder(folder.id);
                                      setSidebarTab('project');
                                    }}
                                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded ${
                                      activeSubfolder === folder.id && sidebarTab === 'project'
                                        ? 'text-[#46ecd5] bg-white/5 font-semibold'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                  >
                                    <Folder className="w-3 h-3" />
                                    <span>{folder.label}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Community Button */}
            <div className="p-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => navigate('explore')}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-all"
              >
                <span className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                  <Compass className="w-3.5 h-3.5 text-[#46ecd5]" />
                </span>
                {!sidebarCollapsed && <span>Community</span>}
              </button>
            </div>
          </aside>

          {/* ================================================================
              B. CENTER DIRECTING WORKSPACE + FLOATING COMMAND DOCK
              ================================================================ */}
          <main className="flex-1 flex flex-col justify-between overflow-y-auto relative bg-[#0A0B0E]">
            {/* Top Project Status Bar */}
            <div className="px-4 sm:px-8 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 bg-[#0D0E12]/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-[#46ecd5]/15 border border-[#46ecd5]/40 text-[10px] font-mono-tabular font-bold text-[#46ecd5] uppercase">
                  {productionType}
                </span>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  aria-label="Production title"
                  className="bg-transparent text-sm sm:text-base font-extrabold text-white focus:outline-none border-b border-transparent focus:border-[#46ecd5] px-1"
                />
                <span className="text-[11px] text-emerald-400 font-mono-tabular flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Continuity Active ({allReferences.length}/50 Refs)</span>
                </span>
              </div>

              {/* Active Continuity Quick-Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSidebarTab('elements')}
                  className="px-2.5 py-1 rounded-lg bg-[#16181D] hover:bg-[#1E2128] border border-white/10 text-zinc-300 flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    Cast ({activeContinuity.characterIds.length}/{characters.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkingMode('production')}
                  className="px-2.5 py-1 rounded-lg bg-[#16181D] hover:bg-[#1E2128] border border-white/10 text-zinc-300 flex items-center gap-1.5"
                >
                  <Clapperboard className="w-3.5 h-3.5 text-[#46ecd5]" />
                  <span>Script & Storyboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('editing')}
                  className="px-2.5 py-1 rounded-lg bg-[#16181D] hover:bg-[#1E2128] border border-white/10 text-zinc-300 flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#46ecd5]" />
                  <span>Video Timeline</span>
                </button>
              </div>
            </div>

            {/* ==============================================================
                CENTER VIEWPORT CONTENT (HOME / ELEMENTS / FAVORITES / PROJECT)
                ============================================================== */}
            <div className="flex-1 px-4 sm:px-8 py-6 max-w-[1360px] w-full mx-auto space-y-8">
              {sidebarTab === 'elements' ? (
                /* C. REFERENCE AND ELEMENTS LIBRARY (@ MY ELEMENTS) */
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <div className="text-xs font-mono-tabular text-sky-400 uppercase tracking-wider">
                        @ MY ELEMENTS — REUSABLE CONTINUITY VAULT (UP TO 50 PER SHOT)
                      </div>
                      <h2 className="font-display text-2xl font-bold uppercase text-white mt-0.5">
                        Characters, Locations, Wardrobes, Props & Visual References
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('character')}
                        className="px-3 py-1.5 rounded-lg bg-[#16181E] hover:bg-[#1F222A] border border-white/10 text-xs font-semibold text-white"
                      >
                        + Character Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('location')}
                        className="px-3 py-1.5 rounded-lg bg-[#16181E] hover:bg-[#1F222A] border border-white/10 text-xs font-semibold text-white"
                      >
                        + Location Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('wardrobe')}
                        className="px-3 py-1.5 rounded-lg bg-[#16181E] hover:bg-[#1F222A] border border-white/10 text-xs font-semibold text-white"
                      >
                        + Wardrobe Studio
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('props')}
                        className="px-3 py-1.5 rounded-lg bg-[#16181E] hover:bg-[#1F222A] border border-white/10 text-xs font-semibold text-white"
                      >
                        + Props Studio
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Characters Column */}
                    <div className="rounded-2xl bg-[#131519] border border-white/10 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-[#46ecd5]" />
                          <span>Characters ({characters.length})</span>
                        </span>
                        <button
                          onClick={() => navigate('character')}
                          className="text-[11px] text-[#46ecd5] hover:underline"
                        >
                          Manage
                        </button>
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {characters.map((c) => {
                          const locked = activeContinuity.characterIds.includes(c.id);
                          return (
                            <div
                              key={c.id}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                locked
                                  ? 'bg-[#46ecd5]/15 border-[#46ecd5]'
                                  : 'bg-[#0D0E12] border-white/10'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate">@{c.name}</div>
                                <div className="text-[10px] text-zinc-400 truncate">
                                  {c.identityId} · {c.primaryLanguage}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  insertElementToken(`@${c.name.toUpperCase()}`, c.id)
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                                  locked
                                    ? 'bg-[#46ecd5] text-zinc-950'
                                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                                }`}
                              >
                                {locked ? 'In Shot' : '+ Cast'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Locations Column */}
                    <div className="rounded-2xl bg-[#131519] border border-white/10 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#46ecd5]" />
                          <span>Locations ({locations.length})</span>
                        </span>
                        <button
                          onClick={() => navigate('location')}
                          className="text-[11px] text-[#46ecd5] hover:underline"
                        >
                          Manage
                        </button>
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {locations.map((loc) => {
                          const locked = activeContinuity.locationId === loc.id;
                          return (
                            <div
                              key={loc.id}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                locked
                                  ? 'bg-[#46ecd5]/15 border-[#46ecd5]'
                                  : 'bg-[#0D0E12] border-white/10'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate">@{loc.name}</div>
                                <div className="text-[10px] text-zinc-400 truncate">
                                  {loc.settingType} · {loc.timeOfDay} · {loc.weather}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  insertElementToken(
                                    `@${loc.name.toUpperCase()}`,
                                    undefined,
                                    loc.id
                                  )
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                                  locked
                                    ? 'bg-[#46ecd5] text-zinc-950'
                                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                                }`}
                              >
                                {locked ? 'Active Set' : '+ Set'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Wardrobes Column */}
                    <div className="rounded-2xl bg-[#131519] border border-white/10 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                          <Shirt className="w-4 h-4 text-[#46ecd5]" />
                          <span>Wardrobes ({wardrobes.length})</span>
                        </span>
                        <button
                          onClick={() => navigate('wardrobe')}
                          className="text-[11px] text-[#46ecd5] hover:underline"
                        >
                          Manage
                        </button>
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {wardrobes.map((w) => {
                          const locked = activeContinuity.wardrobeId === w.id;
                          return (
                            <div
                              key={w.id}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                locked
                                  ? 'bg-[#46ecd5]/15 border-[#46ecd5]'
                                  : 'bg-[#0D0E12] border-white/10'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate">{w.name}</div>
                                <div className="text-[10px] text-zinc-400 truncate">
                                  {w.category}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveContinuity((prev) => ({
                                    ...prev,
                                    wardrobeId: locked ? null : w.id,
                                  }))
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                                  locked
                                    ? 'bg-[#46ecd5] text-zinc-950'
                                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                                }`}
                              >
                                {locked ? 'Locked' : '+ Outfit'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Props Column */}
                    <div className="rounded-2xl bg-[#131519] border border-white/10 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-[#46ecd5]" />
                          <span>Props ({propsList.length})</span>
                        </span>
                        <button
                          onClick={() => navigate('props')}
                          className="text-[11px] text-[#46ecd5] hover:underline"
                        >
                          Manage
                        </button>
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {propsList.map((p) => {
                          const locked = activeContinuity.propIds.includes(p.id);
                          return (
                            <div
                              key={p.id}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                locked
                                  ? 'bg-[#46ecd5]/15 border-[#46ecd5]'
                                  : 'bg-[#0D0E12] border-white/10'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate">{p.name}</div>
                                <div className="text-[10px] text-zinc-400 truncate">
                                  {p.category}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  insertElementToken(
                                    `[PROP: ${p.name}]`,
                                    undefined,
                                    undefined,
                                    p.id
                                  )
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                                  locked
                                    ? 'bg-[#46ecd5] text-zinc-950'
                                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                                }`}
                              >
                                {locked ? 'In Shot' : '+ Prop'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* HOME / DIRECTOR STAGE (MATCHING HIGGSFIELD CINEMA STUDIO SCREENSHOTS) */
                <div className="space-y-8">
                  {/* Top Fanned Showcase Carousel ("COMMUNITIES") + Active Shot Monitor */}
                  <div className="flex flex-col items-center text-center space-y-4 pt-2">
                    <div className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.22em] text-zinc-200">
                      COMMUNITIES
                    </div>

                    {/* Fanned 3-Card Cinema Stack */}
                    <div className="relative w-full max-w-xl h-52 sm:h-60 flex items-center justify-center">
                      {/* Back Right Card */}
                      <div className="w-64 sm:w-80 h-44 sm:h-52 rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-br from-amber-700/40 via-stone-900 to-black absolute translate-x-14 sm:translate-x-20 scale-90 opacity-75 shadow-2xl">
                        <div className="p-4 h-full flex flex-col justify-end text-left bg-gradient-to-t from-black/80 via-transparent to-transparent">
                          <span className="text-[10px] font-mono uppercase text-amber-300">
                            70MM ANAMORPHIC · GOLDEN HOUR
                          </span>
                          <span className="text-xs font-bold text-white">
                            Architectural Sunbeams & Dust
                          </span>
                        </div>
                      </div>

                      {/* Middle Card */}
                      <div className="w-64 sm:w-80 h-44 sm:h-52 rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-br from-slate-600/50 via-zinc-900 to-black absolute translate-x-7 sm:translate-x-10 scale-95 opacity-90 shadow-2xl">
                        <div className="p-4 h-full flex flex-col justify-end text-left bg-gradient-to-t from-black/80 via-transparent to-transparent">
                          <span className="text-[10px] font-mono uppercase text-cyan-300">
                            35MM STEADICAM · TWILIGHT FABLE
                          </span>
                          <span className="text-xs font-bold text-white">
                            Neo-Noir Corridor Tracking
                          </span>
                        </div>
                      </div>

                      {/* Front Primary Monitor Card (Shows latest generated shot or interactive cinema reel) */}
                      <div className="w-72 sm:w-96 h-48 sm:h-56 rounded-2xl overflow-hidden border border-white/20 bg-[#14161B] relative z-10 shadow-[0_24px_60px_rgba(0,0,0,0.85)] group">
                        {inspectedGen && inspectedGen.outputs[0] ? (
                          inspectedGen.outputs[0].kind === 'video' ? (
                            <video
                              src={inspectedGen.outputs[0].url}
                              controls
                              loop
                              muted
                              autoPlay
                              playsInline
                              style={{
                                filter: `contrast(${gradeContrast}%) saturate(${gradeSaturation}%) sepia(${Math.max(
                                  0,
                                  gradeWarmth
                                )}%)`,
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={inspectedGen.outputs[0].url}
                              alt={inspectedGen.prompt}
                              style={{
                                filter: `contrast(${gradeContrast}%) saturate(${gradeSaturation}%) sepia(${Math.max(
                                  0,
                                  gradeWarmth
                                )}%)`,
                              }}
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-stone-700/60 via-zinc-900 to-black flex flex-col justify-between p-5 text-left">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-black/50 border border-white/15 text-[10px] font-mono text-[#46ecd5]">
                                WINDOW LIGHT · 50MM PRIME · f/1.4
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                24 FPS
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-bold text-white">
                                Intimate Living Room Monologue
                              </div>
                              <p className="text-[11px] text-zinc-300 line-clamp-2">
                                Soft daylight through sheer curtains, shallow depth of field, authentic character emotion.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Center Headline from Screenshot */}
                    <h1 className="font-display text-2xl sm:text-4xl font-extrabold uppercase tracking-wider text-[#46ecd5] pt-2">
                      HERE, YOUR IDEAS COMES ALIVE
                    </h1>
                  </div>

                  {/* Stage 5 & 6: Iterative Video Workflows Bar (References / Extend / Edit Video / Color Grade) */}
                  {inspectedGen && inspectedGen.outputs[0] && (
                    <div className="rounded-2xl bg-[#121418] border border-white/10 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 rounded bg-[#46ecd5]/15 border border-[#46ecd5]/40 text-[10px] font-mono font-bold text-[#46ecd5] uppercase">
                            STAGE 5 & 6 · SHOT INSPECTOR
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            {inspectedGen.modelLabel} · {inspectedGen.prompt.slice(0, 75)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddGenerationAsReference(inspectedGen.id)}
                            className="px-3 py-1.5 rounded-xl bg-[#1A1D24] hover:bg-[#242832] border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#46ecd5]" />
                            <span>Use as Reference ({allReferences.length}/50)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExtendShot('forward')}
                            className="px-3 py-1.5 rounded-xl bg-[#1A1D24] hover:bg-[#242832] border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-[#46ecd5]" />
                            <span>Extend Forward (+5s)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExtendShot('backward')}
                            className="px-3 py-1.5 rounded-xl bg-[#1A1D24] hover:bg-[#242832] border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 text-[#46ecd5]" />
                            <span>Extend Backward</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setScenePrompt(inspectedGen.prompt);
                              setActivePopover('camera');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#1A1D24] hover:bg-[#242832] border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#46ecd5]" />
                            <span>Edit Video / Re-Direct</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeliverableIds((prev) =>
                                prev.includes(inspectedGen.id)
                                  ? prev
                                  : [...prev, inspectedGen.id]
                              );
                              showToast('Marked shot as Approved Deliverable in project');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#46ecd5]/20 border border-[#46ecd5]/40 text-xs font-bold text-[#46ecd5] flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Deliverable</span>
                          </button>

                          <a
                            href={inspectedGen.outputs[0].url}
                            download={`spacix-shot-${inspectedGen.id}.mp4`}
                            className="px-3 py-1.5 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>

                      {/* Stage 6 Finalize Color Grading Sliders */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10 text-[11px]">
                        <div>
                          <div className="flex justify-between text-zinc-400 mb-1">
                            <span>Contrast</span>
                            <span className="font-mono text-white">{gradeContrast}%</span>
                          </div>
                          <input
                            type="range"
                            min={75}
                            max={135}
                            value={gradeContrast}
                            onChange={(e) => setGradeContrast(Number(e.target.value))}
                            className="w-full accent-[#46ecd5]"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-zinc-400 mb-1">
                            <span>Color Saturation</span>
                            <span className="font-mono text-white">{gradeSaturation}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={160}
                            value={gradeSaturation}
                            onChange={(e) => setGradeSaturation(Number(e.target.value))}
                            className="w-full accent-[#46ecd5]"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-zinc-400 mb-1">
                            <span>Warmth / Tint</span>
                            <span className="font-mono text-white">+{gradeWarmth}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={45}
                            value={gradeWarmth}
                            onChange={(e) => setGradeWarmth(Number(e.target.value))}
                            className="w-full accent-[#46ecd5]"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-zinc-400 mb-1">
                            <span>Optical Halation</span>
                            <span className="font-mono text-white">{gradeHalation}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={50}
                            value={gradeHalation}
                            onChange={(e) => setGradeHalation(Number(e.target.value))}
                            className="w-full accent-[#46ecd5]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generated Shots & Project Deliverables Strip */}
                  {generations.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                            Production Dailies & Versions ({generations.length})
                          </span>
                          <div className="flex items-center gap-1 text-[11px]">
                            {(['all', 'scenes', 'versions', 'deliverables'] as const).map(
                              (tab) => (
                                <button
                                  key={tab}
                                  type="button"
                                  onClick={() => setActiveSubfolder(tab)}
                                  className={`px-2 py-0.5 rounded capitalize ${
                                    activeSubfolder === tab
                                      ? 'bg-[#46ecd5]/20 text-[#46ecd5] font-bold'
                                      : 'text-zinc-500 hover:text-zinc-300'
                                  }`}
                                >
                                  {tab}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                        {generations
                          .filter((g) => {
                            if (sidebarTab === 'favorites') {
                              return favoriteGenIds.includes(g.id);
                            }
                            if (activeSubfolder === 'deliverables') {
                              return deliverableIds.includes(g.id);
                            }
                            return true;
                          })
                          .slice(0, 10)
                          .map((gen) => {
                            const out = gen.outputs[0];
                            const isFav = favoriteGenIds.includes(gen.id);
                            const isInspected = inspectedGen?.id === gen.id;
                            return (
                              <div
                                key={gen.id}
                                onClick={() => setInspectedGenId(gen.id)}
                                className={`group cursor-pointer rounded-xl overflow-hidden bg-[#14161B] border transition-all ${
                                  isInspected
                                    ? 'border-[#46ecd5] ring-1 ring-[#46ecd5]/40'
                                    : 'border-white/10 hover:border-white/25'
                                }`}
                              >
                                <div className="aspect-video bg-black relative overflow-hidden">
                                  {out ? (
                                    out.kind === 'video' ? (
                                      <video
                                        src={out.url}
                                        muted
                                        loop
                                        playsInline
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <img
                                        src={out.url}
                                        alt={gen.prompt}
                                        className="w-full h-full object-cover"
                                      />
                                    )
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                                      <Loader2 className="w-4 h-4 animate-spin text-[#46ecd5]" />
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFavoriteGenIds((prev) =>
                                        prev.includes(gen.id)
                                          ? prev.filter((id) => id !== gen.id)
                                          : [...prev, gen.id]
                                      );
                                    }}
                                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-zinc-300 hover:text-pink-400"
                                  >
                                    <Heart
                                      className={`w-3 h-3 ${
                                        isFav ? 'text-pink-400 fill-pink-400' : ''
                                      }`}
                                    />
                                  </button>
                                </div>
                                <div className="p-2.5 space-y-1">
                                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                    <span>{gen.modelLabel}</span>
                                    <span className="uppercase text-[#46ecd5]">
                                      {gen.surface}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zinc-200 line-clamp-1">
                                    {gen.prompt}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==============================================================
                FLOATING DIRECTOR'S PANEL POPOVER MODALS (ABOVE COMMAND DOCK)
                Matching Screenshots: Film setup, Camera, Color palette, Lighting
                ============================================================== */}
            {activePopover && (
              <div className="px-4 sm:px-8 pb-3 max-w-[1060px] w-full mx-auto z-30">
                {/* 1. FILM SETUP POPOVER MODAL (Genre / Era / Tempo) */}
                {activePopover === 'film_setup' && (
                  <div className="rounded-3xl bg-[#18191D] border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                      <span className="text-base font-bold text-white">Film setup</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFilmSetup({ genre: 'Auto', era: 'Auto', tempo: 'Auto' })
                          }
                          className="px-3.5 py-1.5 rounded-full bg-[#25272D] hover:bg-[#2E3138] text-xs font-semibold text-zinc-200"
                        >
                          Reset all
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          className="p-1.5 rounded-full text-zinc-400 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 min-h-[340px]">
                      {/* Left Tabs: Genre, Era, Tempo */}
                      <div className="sm:col-span-3 border-r border-white/10 p-3 space-y-1">
                        {(
                          [
                            { id: 'genre', label: 'Genre', activeVal: filmSetup.genre },
                            { id: 'era', label: 'Era', activeVal: filmSetup.era },
                            { id: 'tempo', label: 'Tempo', activeVal: filmSetup.tempo },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFilmSetupTab(tab.id)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                              filmSetupTab === tab.id
                                ? 'bg-[#25272E] text-white'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            <span>{tab.label}</span>
                            {tab.activeVal !== 'Auto' && (
                              <span className="w-2 h-2 rounded-full bg-lime-400" />
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Right Content Area */}
                      <div className="sm:col-span-9 p-6 flex flex-col justify-between">
                        {filmSetupTab === 'genre' && (
                          <>
                            <div>
                              <div className="text-sm font-bold text-white">Select genre</div>
                              <div className="text-xs text-zinc-400">
                                Story conventions the model should follow
                              </div>
                            </div>

                            {/* Center Arched Preview Card */}
                            <div className="my-4 flex items-center justify-center gap-4">
                              {GENRE_PRESETS.map((g) => {
                                const isSel =
                                  (filmSetup.genre === 'Auto' && g.id === 'General') ||
                                  filmSetup.genre === g.id;
                                if (!isSel) return null;
                                return (
                                  <div
                                    key={g.id}
                                    className={`w-72 h-40 rounded-2xl border border-white/20 bg-gradient-to-br ${g.gradient} p-5 flex flex-col justify-end relative shadow-2xl`}
                                  >
                                    <span className="w-2 h-2 rounded-full bg-lime-400 absolute bottom-3 right-3" />
                                    <div className="text-sm font-extrabold text-white">
                                      {g.label}
                                    </div>
                                    <div className="text-[11px] text-zinc-300">
                                      {g.subtitle}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Carousel Controls + Quick Pills */}
                            <div className="flex flex-col items-center gap-3">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFilmSetup((prev) => ({
                                      ...prev,
                                      genre: cycleWheelOption(
                                        GENRE_PRESETS,
                                        prev.genre === 'Auto' ? 'General' : prev.genre,
                                        -1
                                      ),
                                    }))
                                  }
                                  className="w-8 h-8 rounded-full bg-[#25272E] hover:bg-[#30333C] border border-white/10 flex items-center justify-center text-zinc-200"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="px-6 py-1.5 rounded-full bg-[#25272E] border border-white/15 text-xs font-bold text-white min-w-[120px] text-center">
                                  {filmSetup.genre === 'Auto' ? 'General' : filmSetup.genre}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFilmSetup((prev) => ({
                                      ...prev,
                                      genre: cycleWheelOption(
                                        GENRE_PRESETS,
                                        prev.genre === 'Auto' ? 'General' : prev.genre,
                                        1
                                      ),
                                    }))
                                  }
                                  className="w-8 h-8 rounded-full bg-[#25272E] hover:bg-[#30333C] border border-white/10 flex items-center justify-center text-zinc-200"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {GENRE_PRESETS.map((g) => (
                                  <button
                                    key={g.id}
                                    type="button"
                                    onClick={() =>
                                      setFilmSetup((prev) => ({ ...prev, genre: g.id }))
                                    }
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                      filmSetup.genre === g.id
                                        ? 'bg-lime-400 text-zinc-950 font-bold'
                                        : 'bg-[#22242A] text-zinc-400 hover:text-white'
                                    }`}
                                  >
                                    {g.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {filmSetupTab === 'era' && (
                          <>
                            <div>
                              <div className="text-sm font-bold text-white">Select era</div>
                              <div className="text-xs text-zinc-400">
                                The period the film belongs to
                              </div>
                            </div>

                            <div className="my-4 flex flex-col items-center gap-5">
                              <div className="w-72 h-36 rounded-2xl border border-white/20 bg-gradient-to-tr from-indigo-500/40 via-amber-400/35 to-rose-500/40 p-5 flex flex-col justify-end shadow-2xl">
                                <div className="text-xs font-mono uppercase text-lime-300">
                                  OPTICAL PERIOD STOCK
                                </div>
                                <div className="text-base font-extrabold text-white">
                                  {filmSetup.era}
                                </div>
                              </div>

                              {/* Horizontal Era Tick Ruler (Matching Screenshot) */}
                              <div className="w-full max-w-lg space-y-2">
                                <div className="flex items-end justify-between px-4 h-7">
                                  {Array.from({ length: 25 }).map((_, idx) => (
                                    <div
                                      key={idx}
                                      className={`w-0.5 rounded-full ${
                                        idx === 12
                                          ? 'h-7 bg-lime-400'
                                          : idx % 4 === 0
                                          ? 'h-5 bg-zinc-500'
                                          : 'h-3 bg-zinc-700'
                                      }`}
                                    />
                                  ))}
                                </div>

                                <div className="flex items-center justify-center gap-3">
                                  {ERA_PRESETS.map((era) => {
                                    const active = filmSetup.era === era.id;
                                    return (
                                      <button
                                        key={era.id}
                                        type="button"
                                        onClick={() =>
                                          setFilmSetup((prev) => ({ ...prev, era: era.id }))
                                        }
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                          active
                                            ? 'text-lime-400 text-base scale-110'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                      >
                                        {era.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {filmSetupTab === 'tempo' && (
                          <>
                            <div>
                              <div className="text-sm font-bold text-white">Select tempo</div>
                              <div className="text-xs text-zinc-400">
                                Pacing of the montage
                              </div>
                            </div>

                            <div className="my-4 flex items-center justify-center">
                              {TEMPO_PRESETS.map((t) => {
                                if (t.id !== filmSetup.tempo) return null;
                                return (
                                  <div
                                    key={t.id}
                                    className="w-80 h-40 rounded-2xl border border-white/20 bg-gradient-to-br from-emerald-600/40 via-teal-900/50 to-zinc-950 p-4 flex flex-col justify-between shadow-2xl"
                                  >
                                    <div className="text-xs font-bold text-white">
                                      {t.label} Pacing
                                    </div>
                                    <div className="space-y-2">
                                      <div className="text-[11px] text-zinc-200">
                                        {t.subtitle}
                                      </div>
                                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                                        {Array.from({ length: 5 }).map((_, idx) => (
                                          <div
                                            key={idx}
                                            className={`h-1.5 rounded-full ${
                                              idx < t.bars ? 'bg-lime-400' : 'bg-white/20'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2">
                              {TEMPO_PRESETS.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() =>
                                    setFilmSetup((prev) => ({ ...prev, tempo: t.id }))
                                  }
                                  className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                                    filmSetup.tempo === t.id
                                      ? 'bg-[#282B33] border-white/30 text-white'
                                      : 'bg-[#1F2127] border-white/5 text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CAMERA POPOVER MODAL (Setup 3-Drum Wheels + Movement Grid) */}
                {activePopover === 'camera' && (
                  <div className="rounded-3xl bg-[#18191D] border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                      <span className="text-base font-bold text-white">Camera</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCameraOptics({
                              camera: 'Auto',
                              lens: 'Auto',
                              aperture: 'Auto',
                              movements: [],
                            })
                          }
                          className="px-3.5 py-1.5 rounded-full bg-[#25272D] hover:bg-[#2E3138] text-xs font-semibold text-zinc-200"
                        >
                          Reset all
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          className="p-1.5 rounded-full text-zinc-400 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 min-h-[360px]">
                      {/* Left Tabs: Setup, Movement */}
                      <div className="sm:col-span-3 border-r border-white/10 p-3 space-y-1">
                        <button
                          type="button"
                          onClick={() => setCameraModalTab('setup')}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            cameraModalTab === 'setup'
                              ? 'bg-[#25272E] text-white'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span>Setup</span>
                          {(cameraOptics.camera !== 'Auto' ||
                            cameraOptics.lens !== 'Auto' ||
                            cameraOptics.aperture !== 'Auto') && (
                            <span className="w-2 h-2 rounded-full bg-lime-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCameraModalTab('movement')}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            cameraModalTab === 'movement'
                              ? 'bg-[#25272E] text-white'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span>Movement</span>
                          {cameraOptics.movements.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-lime-400 text-zinc-950 text-[10px]">
                              {cameraOptics.movements.length}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Right Content: 3-Column Drum Wheels OR Camera Movement Grid */}
                      <div className="sm:col-span-9 p-5">
                        {cameraModalTab === 'setup' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
                            {/* Column 1: CAMERA */}
                            <div className="flex flex-col items-center justify-between py-2 border-r border-white/5">
                              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                                CAMERA
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setCameraOptics((prev) => ({
                                    ...prev,
                                    camera: cycleWheelOption(CAMERA_BODIES, prev.camera, -1),
                                  }))
                                }
                                className="p-1.5 rounded-full bg-[#23252C] text-zinc-400 hover:text-white"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>

                              <div className="w-full px-3 space-y-2.5">
                                {CAMERA_BODIES.map((cam) => {
                                  const active = cameraOptics.camera === cam.id;
                                  return (
                                    <button
                                      key={cam.id}
                                      type="button"
                                      onClick={() =>
                                        setCameraOptics((prev) => ({
                                          ...prev,
                                          camera: cam.id,
                                        }))
                                      }
                                      className={`w-full py-3 px-4 rounded-full transition-all flex flex-col items-center text-center ${
                                        active
                                          ? 'bg-[#2A2D35] border-2 border-white text-white shadow-lg scale-105'
                                          : 'bg-[#1D1F25] border border-white/5 text-zinc-500 hover:text-zinc-300 opacity-70'
                                      }`}
                                    >
                                      <Camera className="w-4 h-4 mb-1 opacity-80" />
                                      <span className="text-xs font-bold">{cam.label}</span>
                                      <span className="text-[10px] opacity-75">{cam.sub}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setCameraOptics((prev) => ({
                                    ...prev,
                                    camera: cycleWheelOption(CAMERA_BODIES, prev.camera, 1),
                                  }))
                                }
                                className="p-1.5 rounded-full bg-[#23252C] text-zinc-400 hover:text-white"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Column 2: LENS */}
                            <div className="flex flex-col items-center justify-between py-2 border-r border-white/5">
                              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                                LENS
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setCameraOptics((prev) => ({
                                    ...prev,
                                    lens: cycleWheelOption(LENS_OPTICS, prev.lens, -1),
                                  }))
                                }
                                className="p-1.5 rounded-full bg-[#23252C] text-zinc-400 hover:text-white"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>

                              <div className="w-full px-3 space-y-2.5">
                                {LENS_OPTICS.map((lens) => {
                                  const active = cameraOptics.lens === lens.id;
                                  return (
                                    <button
                                      key={lens.id}
                                      type="button"
                                      onClick={() =>
                                        setCameraOptics((prev) => ({
                                          ...prev,
                                          lens: lens.id,
                                        }))
                                      }
                                      className={`w-full py-3 px-4 rounded-full transition-all flex flex-col items-center text-center ${
                                        active
                                          ? 'bg-[#2A2D35] border-2 border-white text-white shadow-lg scale-105'
                                          : 'bg-[#1D1F25] border border-white/5 text-zinc-500 hover:text-zinc-300 opacity-70'
                                      }`}
                                    >
                                      <Eye className="w-4 h-4 mb-1 opacity-80" />
                                      <span className="text-xs font-bold">{lens.label}</span>
                                      <span className="text-[10px] opacity-75">{lens.sub}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setCameraOptics((prev) => ({
                                    ...prev,
                                    lens: cycleWheelOption(LENS_OPTICS, prev.lens, 1),
                                  }))
                                }
                                className="p-1.5 rounded-full bg-[#23252C] text-zinc-400 hover:text-white"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Column 3: APERTURE */}
                            <div className="flex flex-col items-center justify-between py-2">
                              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                                APERTURE
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setCameraOptics((prev) => ({
                                    ...prev,
                                    aperture: cycleWheelOption(
                                      APERTURE_STOPS,
                                      prev.aperture,
                                      -1
                                    ),
                                  }))
                                }
                                className="p-1.5 rounded-full bg-[#23252C] text-zinc-400 hover:text-white"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>

                              <div className="w-full px-3 space-y-2.5">
                                {APERTURE_STOPS.map((ap) => {
                                  const active = cameraOptics.aperture === ap.id;
                                  return (
                                    <button
                                      key={ap.id}
                                      type="button"
                                      onClick={() =>
                                        setCameraOptics((prev) => ({
                                          ...prev,
                                          aperture: ap.id,
                                        }))
                                      }
                                      className={`w-full py-3 px-4 rounded-full transition-all flex flex-col items-center text-center ${
                                        active
                                          ? 'bg-[#2A2D35] border-2 border-white text-white shadow-lg scale-105'
                                          : 'bg-[#1D1F25] border border-white/5 text-zinc-500 hover:text-zinc-300 opacity-70'
                                      }`}
                                    >
                                      <Sun className="w-4 h-4 mb-1 opacity-80" />
                                      <span className="text-xs font-bold">{ap.label}</span>
                                      <span className="text-[10px] opacity-75">{ap.sub}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setCameraOptics((prev) => ({
                                    ...prev,
                                    aperture: cycleWheelOption(
                                      APERTURE_STOPS,
                                      prev.aperture,
                                      1
                                    ),
                                  }))
                                }
                                className="p-1.5 rounded-full bg-[#23252C] text-zinc-400 hover:text-white"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Camera Movement Tab (Matching Screenshot_20261109-161150) */
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-sm font-bold text-white">
                                  Direct a camera move
                                </div>
                                <div className="text-xs text-zinc-400">
                                  Adds to the prompt box, or type{' '}
                                  <span className="text-lime-400 font-mono">#</span> there.
                                  Several per shot; order matters.
                                </div>
                              </div>
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={movementSearch}
                                  onChange={(e) => setMovementSearch(e.target.value)}
                                  placeholder="Search moves..."
                                  className="pl-8 pr-3 py-1.5 rounded-xl bg-[#22242B] border border-white/10 text-xs text-white"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
                              {CAMERA_MOVEMENTS.filter((m) =>
                                !movementSearch.trim()
                                  ? true
                                  : m.label
                                      .toLowerCase()
                                      .includes(movementSearch.toLowerCase())
                              ).map((move) => {
                                const orderIdx = cameraOptics.movements.indexOf(move.label);
                                const isSelected = orderIdx >= 0;
                                return (
                                  <button
                                    key={move.id}
                                    type="button"
                                    onClick={() => toggleCameraMovement(move.label)}
                                    className="group text-center space-y-1.5 focus:outline-none"
                                  >
                                    <div
                                      className={`aspect-[4/3] rounded-2xl bg-gradient-to-br ${
                                        move.gradient
                                      } border transition-all p-3 flex flex-col justify-between relative overflow-hidden ${
                                        isSelected
                                          ? 'border-lime-400 ring-2 ring-lime-400/30'
                                          : 'border-white/10 group-hover:border-white/30'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="px-1.5 py-0.5 rounded bg-black/50 text-[10px] font-mono text-lime-300">
                                          #{move.label.replace(/\s+/g, '')}
                                        </span>
                                        {isSelected && (
                                          <span className="w-5 h-5 rounded-full bg-lime-400 text-zinc-950 text-[10px] font-extrabold flex items-center justify-center">
                                            {orderIdx + 1}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-zinc-200 text-left">
                                        {move.desc}
                                      </div>
                                    </div>
                                    <div className="text-xs font-semibold text-white">
                                      {move.label}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. COLOR PALETTE POPOVER MODAL (Matching Screenshot_20261109-161236) */}
                {activePopover === 'color_palette' && (
                  <div className="rounded-3xl bg-[#18191D] border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.9)] p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <div className="text-base font-bold text-white">Color palette</div>
                        <div className="text-xs text-zinc-400">
                          Palette the color grade should follow
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={paletteSearch}
                          onChange={(e) => setPaletteSearch(e.target.value)}
                          placeholder="Filter palettes..."
                          className="px-3 py-1.5 rounded-xl bg-[#23252C] border border-white/10 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedPaletteId('Auto')}
                          className="px-3.5 py-1.5 rounded-full bg-[#25272D] hover:bg-[#2E3138] text-xs font-semibold text-zinc-200"
                        >
                          Reset all
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          className="p-1.5 rounded-full text-zinc-400 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-h-80 overflow-y-auto pr-1">
                      {/* + New Palette Creator Card */}
                      <div className="rounded-2xl bg-[#22242A] border border-white/10 p-3 flex flex-col justify-between space-y-2">
                        <div className="text-xs font-bold text-white">New palette</div>
                        <input
                          type="text"
                          value={newPaletteName}
                          onChange={(e) => setNewPaletteName(e.target.value)}
                          placeholder="e.g. Lagos Midnight Cyan"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#16181D] border border-white/10 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newPaletteName.trim()) return;
                            const id = newPaletteName.trim();
                            setCustomPalettes((prev) => [
                              ...prev,
                              {
                                id,
                                name: id,
                                description: 'Custom production color palette',
                                promptTokens: `${id} cinema color grade palette`,
                                swatches: [
                                  '#090d16',
                                  '#0e7490',
                                  '#06b6d4',
                                  '#46ecd5',
                                  '#f59e0b',
                                  '#f43f5e',
                                  '#f8fafc',
                                ],
                                previewGradient: 'from-cyan-500/50 via-amber-500/40 to-zinc-950',
                              },
                            ]);
                            setSelectedPaletteId(id);
                            setNewPaletteName('');
                          }}
                          className="w-full py-1.5 rounded-xl bg-[#2E313A] hover:bg-[#383C47] text-xs font-bold text-white flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Palette</span>
                        </button>
                      </div>

                      {allPalettes
                        .filter((p) =>
                          !paletteSearch.trim()
                            ? true
                            : p.name.toLowerCase().includes(paletteSearch.toLowerCase())
                        )
                        .map((pal) => {
                          const active = selectedPaletteId === pal.id;
                          return (
                            <button
                              key={pal.id}
                              type="button"
                              onClick={() => setSelectedPaletteId(pal.id)}
                              className="group text-center space-y-1.5 focus:outline-none"
                            >
                              <div
                                className={`rounded-2xl overflow-hidden border transition-all ${
                                  active
                                    ? 'border-white ring-2 ring-white/40'
                                    : 'border-white/10 group-hover:border-white/30'
                                }`}
                              >
                                <div
                                  className={`h-24 bg-gradient-to-br ${pal.previewGradient} p-2.5 flex items-end text-left`}
                                >
                                  <span className="text-[10px] text-zinc-200 line-clamp-2 drop-shadow">
                                    {pal.description}
                                  </span>
                                </div>
                                {/* 7-Color Swatch Strip along bottom of card */}
                                <div className="grid grid-cols-7 h-4">
                                  {pal.swatches.map((hex, idx) => (
                                    <span
                                      key={idx}
                                      style={{ backgroundColor: hex }}
                                      className="w-full h-full"
                                    />
                                  ))}
                                </div>
                              </div>
                              <div
                                className={`text-xs font-semibold truncate ${
                                  active ? 'text-white font-bold' : 'text-zinc-400'
                                }`}
                              >
                                {pal.name}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* 4. LIGHTING POPOVER MODAL (Matching Screenshot_20261109-161329) */}
                {activePopover === 'lighting' && (
                  <div className="rounded-3xl bg-[#18191D] border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.9)] p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <div className="text-base font-bold text-white">Lighting</div>
                        <div className="text-xs text-zinc-400">
                          Pick a scheme or place your own lights
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={lightingSearch}
                          onChange={(e) => setLightingSearch(e.target.value)}
                          placeholder="Filter lighting..."
                          className="px-3 py-1.5 rounded-xl bg-[#23252C] border border-white/10 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedLightingId('Auto')}
                          className="px-3.5 py-1.5 rounded-full bg-[#25272D] hover:bg-[#2E3138] text-xs font-semibold text-zinc-200"
                        >
                          Reset all
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          className="p-1.5 rounded-full text-zinc-400 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-h-80 overflow-y-auto pr-1">
                      {/* + New Lighting Preset Card */}
                      <div className="rounded-2xl bg-[#22242A] border border-white/10 p-3.5 flex flex-col justify-between space-y-2">
                        <div className="text-xs font-bold text-white">New lighting preset</div>
                        <input
                          type="text"
                          value={newLightingName}
                          onChange={(e) => setNewLightingName(e.target.value)}
                          placeholder="e.g. Sodium Vapor Street Rim"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#16181D] border border-white/10 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newLightingName.trim()) return;
                            const id = newLightingName.trim();
                            setCustomLighting((prev) => [
                              ...prev,
                              {
                                id,
                                name: id,
                                description: 'Custom studio lighting rig',
                                promptTokens: `${id} cinema lighting setup`,
                                previewGradient: 'from-amber-500/45 via-cyan-900/45 to-black',
                              },
                            ]);
                            setSelectedLightingId(id);
                            setNewLightingName('');
                          }}
                          className="w-full py-1.5 rounded-xl bg-[#2E313A] hover:bg-[#383C47] text-xs font-bold text-white flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Save Lighting Preset</span>
                        </button>
                      </div>

                      {allLighting
                        .filter((l) =>
                          !lightingSearch.trim()
                            ? true
                            : l.name.toLowerCase().includes(lightingSearch.toLowerCase())
                        )
                        .map((light) => {
                          const active = selectedLightingId === light.id;
                          return (
                            <button
                              key={light.id}
                              type="button"
                              onClick={() => setSelectedLightingId(light.id)}
                              className="group text-center space-y-1.5 focus:outline-none"
                            >
                              <div
                                className={`h-28 rounded-2xl bg-gradient-to-br ${
                                  light.previewGradient
                                } border p-3.5 flex flex-col justify-end text-left transition-all ${
                                  active
                                    ? 'border-white ring-2 ring-white/40'
                                    : 'border-white/10 group-hover:border-white/30'
                                }`}
                              >
                                <div className="text-[11px] text-zinc-200 line-clamp-2">
                                  {light.description}
                                </div>
                              </div>
                              <div
                                className={`text-xs font-semibold ${
                                  active ? 'text-white font-bold' : 'text-zinc-300'
                                }`}
                              >
                                {light.name}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* 5. REFERENCES (0/50) & @ ELEMENTS POPOVER MODAL */}
                {(activePopover === 'references' || activePopover === 'at_elements') && (
                  <div className="rounded-3xl bg-[#18191D] border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.9)] p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <div className="text-base font-bold text-white">
                          Visual References & @Elements ({allReferences.length}/50)
                        </div>
                        <div className="text-xs text-zinc-400">
                          Combine reusable Characters, Locations, Props, Wardrobes, Photos & Video references for continuity
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={refUploadInputRef}
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleUploadCustomReference}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => refUploadInputRef.current?.click()}
                          className="px-3.5 py-1.5 rounded-full bg-[#46ecd5] text-zinc-950 text-xs font-bold flex items-center gap-1"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Photo / Video Ref</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePopover(null)}
                          className="p-1.5 rounded-full text-zinc-400 hover:text-white"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Active Reference Rack */}
                    {allReferences.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-white/10">
                        {allReferences.map((r) => (
                          <div
                            key={r.id}
                            className="px-3 py-1.5 rounded-xl bg-[#23262E] border border-[#46ecd5]/40 text-xs flex items-center gap-2"
                          >
                            <span className="font-bold text-[#46ecd5]">{r.label}</span>
                            <span className="text-[10px] text-zinc-400">{r.sublabel}</span>
                            {r.id.startsWith('ref_gen_') || r.id.startsWith('ref_upl_') ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomRefs((prev) =>
                                    prev.filter((item) => item.id !== r.id)
                                  )
                                }
                                className="text-zinc-400 hover:text-rose-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Select Saved Characters, Locations, Props */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold uppercase text-zinc-400">
                          @Characters ({characters.length})
                        </div>
                        {characters.map((c) => {
                          const active = activeContinuity.characterIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() =>
                                insertElementToken(`@${c.name.toUpperCase()}`, c.id)
                              }
                              className={`w-full p-2 rounded-xl border text-left text-xs flex items-center justify-between ${
                                active
                                  ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                                  : 'bg-[#202228] border-white/5 text-zinc-300'
                              }`}
                            >
                              <span>@{c.name}</span>
                              <span className="text-[10px] text-[#46ecd5]">{c.identityId}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold uppercase text-zinc-400">
                          @Locations ({locations.length})
                        </div>
                        {locations.map((l) => {
                          const active = activeContinuity.locationId === l.id;
                          return (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() =>
                                insertElementToken(`@${l.name.toUpperCase()}`, undefined, l.id)
                              }
                              className={`w-full p-2 rounded-xl border text-left text-xs flex items-center justify-between ${
                                active
                                  ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                                  : 'bg-[#202228] border-white/5 text-zinc-300'
                              }`}
                            >
                              <span>@{l.name}</span>
                              <span className="text-[10px] text-zinc-400">{l.timeOfDay}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold uppercase text-zinc-400">
                          Props & Wardrobes ({propsList.length + wardrobes.length})
                        </div>
                        {propsList.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              insertElementToken(
                                `[PROP: ${p.name}]`,
                                undefined,
                                undefined,
                                p.id
                              )
                            }
                            className="w-full p-2 rounded-xl bg-[#202228] border border-white/5 text-left text-xs text-zinc-300 flex items-center justify-between"
                          >
                            <span>{p.name}</span>
                            <span className="text-[10px] text-zinc-500">{p.category}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. MULTI-MODEL ENGINE SELECTOR POPOVER */}
                {activePopover === 'models' && (
                  <div className="rounded-3xl bg-[#18191D] border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.9)] p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div>
                        <div className="text-sm font-bold text-white">
                          Select {dockSurface === 'video' ? 'Cinema Video' : 'Cinema Image'} Engine
                        </div>
                        <div className="text-xs text-zinc-400">
                          Camera & optics settings remain independent of the underlying generation model
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivePopover(null)}
                        className="p-1 text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto">
                      {(dockSurface === 'video' ? videoModels : imageModels).map((m) => {
                        const isSel = activeModel?.id === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              if (dockSurface === 'video') setSelectedVideoModelId(m.id);
                              else setSelectedImageModelId(m.id);
                              setActivePopover(null);
                            }}
                            className={`p-3 rounded-2xl border text-left transition-all ${
                              isSel
                                ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                                : 'bg-[#22242B] border-white/10 text-zinc-300 hover:border-white/25'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{m.label}</span>
                              <span className="text-[10px] font-mono text-[#46ecd5]">
                                {Math.max(5, Math.round(m.baseHfUsd * 200))} TK
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                              {m.bestFor || m.family}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                HIGGSFIELD CINEMA STUDIO 4.0 FLOATING COMMAND DOCK
                Exact match for Video Mode & Image Mode screenshots
                ============================================================== */}
            <div className="px-3 sm:px-8 pb-5 pt-2 max-w-[1080px] w-full mx-auto sticky bottom-0 z-20">
              <div className="flex items-stretch gap-2.5">
                {/* Left Vertical Image / Video Surface Switcher Pill */}
                <div className="rounded-3xl bg-[#16171B] border border-white/10 p-1.5 flex flex-col justify-between shrink-0 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => setDockSurface('image')}
                    className={`px-3 py-3 rounded-2xl flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
                      dockSurface === 'image'
                        ? 'bg-[#262830] text-white shadow'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDockSurface('video')}
                    className={`px-3 py-3 rounded-2xl flex flex-col items-center gap-1 text-[11px] font-bold transition-all ${
                      dockSurface === 'video'
                        ? 'bg-[#262830] text-white shadow'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>Video</span>
                  </button>
                </div>

                {/* Main Command Dock Container */}
                {dockSurface === 'video' ? (
                  /* VIDEO MODE DOCK (Matching Here__Your_Ideas_comes_Alive.png) */
                  <div className="flex-1 rounded-3xl bg-[#16171B] border border-white/15 p-3 sm:p-4 space-y-3 shadow-[0_20px_70px_rgba(0,0,0,0.85)]">
                    {/* Top Row: 5 Visual Director's Panel Trigger Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {/* 1. References 0/50 */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover(
                            activePopover === 'references' ? null : 'references'
                          )
                        }
                        className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                          activePopover === 'references'
                            ? 'bg-[#252830] border-white/30'
                            : 'bg-[#1E2026] border-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-xl bg-[#141519] border border-white/10 flex items-center justify-center shrink-0">
                          <Plus className="w-4 h-4 text-zinc-300" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-400">References</div>
                          <div className="text-xs font-bold text-white font-mono-tabular">
                            {allReferences.length}/50
                          </div>
                        </div>
                      </button>

                      {/* 2. Film setup */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover(
                            activePopover === 'film_setup' ? null : 'film_setup'
                          )
                        }
                        className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                          activePopover === 'film_setup'
                            ? 'bg-[#252830] border-white/30'
                            : 'bg-[#1E2026] border-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-stone-400/30 to-zinc-800 border border-white/15 flex items-center justify-center shrink-0">
                          <Film className="w-4 h-4 text-zinc-200" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-400">Film setup</div>
                          <div className="text-xs font-bold text-white truncate">
                            {filmSetupSummary}
                          </div>
                        </div>
                      </button>

                      {/* 3. Camera */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover(activePopover === 'camera' ? null : 'camera')
                        }
                        className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                          activePopover === 'camera'
                            ? 'bg-[#252830] border-white/30'
                            : 'bg-[#1E2026] border-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500/30 to-indigo-950 border border-white/15 flex items-center justify-center shrink-0">
                          <Camera className="w-4 h-4 text-sky-300" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-400">Camera</div>
                          <div className="text-xs font-bold text-white truncate">
                            {cameraSummary}
                          </div>
                        </div>
                      </button>

                      {/* 4. Color palette */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover(
                            activePopover === 'color_palette' ? null : 'color_palette'
                          )
                        }
                        className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                          activePopover === 'color_palette'
                            ? 'bg-[#252830] border-white/30'
                            : 'bg-[#1E2026] border-white/5 hover:border-white/20'
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-xl bg-gradient-to-br ${activePalette.previewGradient} border border-white/15 flex items-center justify-center shrink-0`}
                        >
                          <Palette className="w-4 h-4 text-lime-300" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-400">Color palette</div>
                          <div className="text-xs font-bold text-white truncate">
                            {activePalette.name}
                          </div>
                        </div>
                      </button>

                      {/* 5. Lighting */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover(activePopover === 'lighting' ? null : 'lighting')
                        }
                        className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                          activePopover === 'lighting'
                            ? 'bg-[#252830] border-white/30'
                            : 'bg-[#1E2026] border-white/5 hover:border-white/20'
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-xl bg-gradient-to-br ${activeLighting.previewGradient} border border-white/15 flex items-center justify-center shrink-0`}
                        >
                          <Sun className="w-4 h-4 text-sky-300" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-400">Lighting</div>
                          <div className="text-xs font-bold text-white truncate">
                            {activeLighting.name}
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Middle Scene Prompt Box */}
                    <div className="relative">
                      <textarea
                        rows={2}
                        value={scenePrompt}
                        onChange={(e) => setScenePrompt(e.target.value)}
                        placeholder="Describe your scene - use @ to add characters & locations, or # for camera moves"
                        className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none resize-none px-1"
                      />
                    </div>

                    {/* Bottom Controls Row inside Dock */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* + Upload Reference */}
                        <button
                          type="button"
                          onClick={() => refUploadInputRef.current?.click()}
                          title="Upload Reference Photo or Video"
                          className="w-7 h-7 rounded-full bg-[#22242B] hover:bg-[#2C2F37] text-zinc-300 flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {/* @ Add Character / Location Element */}
                        <button
                          type="button"
                          onClick={() =>
                            setActivePopover(
                              activePopover === 'at_elements' ? null : 'at_elements'
                            )
                          }
                          title="Insert @Character, @Location or Prop"
                          className="w-7 h-7 rounded-full bg-[#22242B] hover:bg-[#2C2F37] text-zinc-300 font-mono text-xs font-bold flex items-center justify-center"
                        >
                          @
                        </button>

                        {/* Emotion Performance Selector */}
                        <select
                          value={selectedEmotion}
                          onChange={(e) => setSelectedEmotion(e.target.value)}
                          title="Character Emotional Performance"
                          className="px-2.5 py-1 rounded-full bg-[#22242B] border border-white/5 text-[11px] font-semibold text-zinc-200"
                        >
                          {EMOTION_DIRECTIONS.map((em) => (
                            <option key={em} value={em}>
                              Emotion: {em}
                            </option>
                          ))}
                        </select>

                        {/* Model Selector Pill ("Cinema Studio 4.0 >") */}
                        <button
                          type="button"
                          onClick={() =>
                            setActivePopover(activePopover === 'models' ? null : 'models')
                          }
                          className="px-3 py-1 rounded-full bg-[#22242B] hover:bg-[#2B2E37] border border-white/10 text-[11px] font-bold text-white flex items-center gap-1.5"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-white" />
                          <span>{activeModel?.label || 'Cinema Studio 4.0'}</span>
                          <ChevronRight className="w-3 h-3 text-zinc-400" />
                        </button>

                        {/* Resolution Pill */}
                        <button
                          type="button"
                          onClick={() =>
                            setResolution((prev) =>
                              prev === '1080p' ? '2K' : prev === '2K' ? '4K' : '1080p'
                            )
                          }
                          className="px-2.5 py-1 rounded-full bg-[#22242B] text-[11px] font-semibold text-zinc-200"
                        >
                          {resolution}
                        </button>

                        {/* Aspect Ratio Pill */}
                        <button
                          type="button"
                          onClick={() =>
                            setAspectRatio((prev) =>
                              prev === '16:9'
                                ? '21:9'
                                : prev === '21:9'
                                ? '9:16'
                                : prev === '9:16'
                                ? '1:1'
                                : '16:9'
                            )
                          }
                          className="px-2.5 py-1 rounded-full bg-[#22242B] text-[11px] font-semibold text-zinc-200"
                        >
                          {aspectRatio}
                        </button>

                        {/* Duration Pill */}
                        <button
                          type="button"
                          onClick={() =>
                            setDurationSec((prev) => (prev === 5 ? 8 : prev === 8 ? 10 : 5))
                          }
                          className="px-2.5 py-1 rounded-full bg-[#22242B] text-[11px] font-semibold text-zinc-200 flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>{durationSec}s</span>
                        </button>

                        {/* Audio Toggle Pill */}
                        <button
                          type="button"
                          onClick={() => setSoundEnabled((v) => !v)}
                          className="px-2.5 py-1 rounded-full bg-[#22242B] text-[11px] font-semibold text-zinc-200 flex items-center gap-1"
                        >
                          {soundEnabled ? (
                            <Volume2 className="w-3 h-3 text-[#46ecd5]" />
                          ) : (
                            <VolumeX className="w-3 h-3 text-zinc-500" />
                          )}
                          <span>{soundEnabled ? 'On' : 'Off'}</span>
                        </button>

                        {/* Batch Stepper (- 1/4 +) */}
                        <div className="px-2.5 py-1 rounded-full bg-[#22242B] text-[11px] font-mono-tabular text-zinc-200 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setBatchSize((b) => Math.max(1, b - 1))}
                            className="text-zinc-400 hover:text-white"
                          >
                            -
                          </button>
                          <span>{batchSize}/4</span>
                          <button
                            type="button"
                            onClick={() => setBatchSize((b) => Math.min(4, b + 1))}
                            className="text-zinc-400 hover:text-white"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Cyan GENERATE Button */}
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleGenerateShot()}
                        className="px-5 py-2 rounded-full bg-[#46ecd5] hover:brightness-110 text-zinc-950 text-xs font-extrabold uppercase tracking-wider shadow-[0_0_25px_rgba(70,236,213,0.4)] disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>DIRECTING...</span>
                          </>
                        ) : (
                          <span>GENERATE - {estimatedCredits}TK</span>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* IMAGE MODE DOCK (Matching Screenshot_20261109-161623_Quetta_c063e9db.jpg) */
                  <div className="flex-1 rounded-3xl bg-[#16171B] border border-white/15 p-3 sm:p-4 flex flex-col sm:flex-row items-stretch justify-between gap-3 shadow-[0_20px_70px_rgba(0,0,0,0.85)]">
                    {/* Left: Prompt Input + Model / Aspect / Resolution Pills */}
                    <div className="flex-1 flex flex-col justify-between space-y-3">
                      <textarea
                        rows={2}
                        value={scenePrompt}
                        onChange={(e) => setScenePrompt(e.target.value)}
                        placeholder="Describe what you want to create..."
                        className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none resize-none px-1"
                      />

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => refUploadInputRef.current?.click()}
                          className="w-7 h-7 rounded-full bg-[#22242B] hover:bg-[#2C2F37] text-zinc-300 flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setActivePopover(activePopover === 'models' ? null : 'models')
                          }
                          className="px-3 py-1.5 rounded-full bg-[#22242B] hover:bg-[#2C2F37] text-xs font-bold text-white flex items-center gap-1.5"
                        >
                          <span className="text-lime-400 font-extrabold">~</span>
                          <span>{activeModel?.label || 'Higgsfield Soul Cinema'}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setAspectRatio((prev) =>
                              prev === '16:9' ? '21:9' : prev === '21:9' ? '9:16' : '16:9'
                            )
                          }
                          className="px-3 py-1.5 rounded-full bg-[#22242B] text-xs font-semibold text-zinc-200"
                        >
                          {aspectRatio}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setResolution((prev) => (prev === '2K' ? '4K' : '2K'))
                          }
                          className="px-3 py-1.5 rounded-full bg-[#22242B] text-xs font-semibold text-zinc-200 lowercase"
                        >
                          {resolution}
                        </button>
                      </div>
                    </div>

                    {/* Right: CHARACTER Card + Camera Card + Generate Button */}
                    <div className="flex items-stretch gap-2.5 shrink-0">
                      {/* CHARACTER Card */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover(
                            activePopover === 'at_elements' ? null : 'at_elements'
                          )
                        }
                        className="w-28 rounded-2xl bg-gradient-to-b from-[#2A2C34] to-[#1D1F25] border border-white/10 hover:border-white/30 p-2.5 flex flex-col justify-between text-left transition-all"
                      >
                        <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5 text-zinc-200" />
                        </span>
                        <div>
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                            CHARACTER
                          </div>
                          {activeContinuity.characterIds[0] && (
                            <div className="text-[10px] text-[#46ecd5] truncate">
                              {
                                characters.find(
                                  (c) => c.id === activeContinuity.characterIds[0]
                                )?.name
                              }
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Camera Card ("Camera / Lens · Auto") */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover(activePopover === 'camera' ? null : 'camera')
                        }
                        className="w-36 rounded-2xl bg-gradient-to-b from-[#2A2C34] to-[#1D1F25] border border-white/10 hover:border-white/30 p-2.5 flex flex-col justify-between text-left transition-all"
                      >
                        <div className="flex justify-end">
                          <span className="w-7 h-7 rounded-full bg-black/60 border border-white/15 flex items-center justify-center">
                            <Camera className="w-3.5 h-3.5 text-sky-400" />
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Camera</div>
                          <div className="text-[10px] text-zinc-400 truncate">
                            Lens · {cameraOptics.lens}
                          </div>
                        </div>
                      </button>

                      {/* Generate Button */}
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleGenerateShot()}
                        className="px-5 rounded-2xl bg-[#46ecd5] hover:brightness-110 text-zinc-950 text-xs font-extrabold uppercase tracking-wider flex flex-col items-center justify-center shadow-[0_0_25px_rgba(70,236,213,0.4)] disabled:opacity-50"
                      >
                        <span>{isSubmitting ? '...' : 'GENERATE'}</span>
                        <span className="text-[10px] font-mono opacity-80">
                          {estimatedCredits}TK
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* ================================================================
              D. AI DIRECTOR RIGHT DRAWER (SCREENPLAY-TO-SHOT BREAKDOWN)
              ================================================================ */}
          {aiDirectorOpen && (
            <aside className="w-80 sm:w-96 shrink-0 bg-[#121317] border-l border-white/10 p-4 flex flex-col justify-between overflow-y-auto z-20 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-[#46ecd5]" />
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-white">
                        AI Director Assistant
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Prepares shots & camera settings; you control generation
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiDirectorOpen(false)}
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scene Input to Break Down into Shots */}
                <div className="space-y-2 text-xs">
                  <label className="block text-zinc-300 font-semibold">
                    Scene Description or Screenplay Beat
                  </label>
                  <textarea
                    rows={3}
                    value={aiDirectorInput}
                    onChange={(e) => setAiDirectorInput(e.target.value)}
                    placeholder="e.g. A king enters his palace and discovers that his throne room is empty..."
                    className="w-full p-2.5 rounded-xl bg-[#0B0C0F] border border-white/10 text-white text-xs"
                  />
                  <button
                    type="button"
                    disabled={aiDirectorBusy}
                    onClick={handleRunAIDirectorBreakdown}
                    className="w-full py-2 rounded-xl bg-[#46ecd5] text-zinc-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {aiDirectorBusy
                        ? 'Breaking Scene into Shots...'
                        : 'Break Scene into Directed Shot List'}
                    </span>
                  </button>
                </div>

                {/* Shot List Cards */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Suggested Shot Coverage ({aiShotList.length} Shots)
                  </div>
                  {aiShotList.map((shot) => (
                    <div
                      key={shot.shotNumber}
                      className="p-3 rounded-xl bg-[#181A20] border border-white/10 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono-tabular font-bold text-[#46ecd5]">
                          SHOT {shot.shotNumber} · {shot.camera}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-zinc-300">
                          #{shot.movement}
                        </span>
                      </div>
                      <p className="text-zinc-200 text-[11px] leading-relaxed">
                        {shot.action}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-zinc-400">
                          Light: {shot.lighting} · {shot.emotion}
                        </span>
                        <button
                          type="button"
                          onClick={() => applyAIShotToDirectorPanel(shot)}
                          className="px-2.5 py-1 rounded-lg bg-[#46ecd5]/20 hover:bg-[#46ecd5] text-[#46ecd5] hover:text-zinc-950 font-bold text-[11px] transition-all"
                        >
                          Load into Director Panel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 text-[11px] text-zinc-400">
                Want to edit the full multi-scene screenplay and multi-track timeline?{' '}
                <button
                  type="button"
                  onClick={() => setWorkingMode('production')}
                  className="text-[#46ecd5] font-bold hover:underline"
                >
                  Switch to Production Mode →
                </button>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
};
