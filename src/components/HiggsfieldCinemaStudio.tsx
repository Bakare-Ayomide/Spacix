import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Clapperboard,
  Clock,
  Compass,
  Diamond,
  Download,
  Edit3,
  Eye,
  FileText,
  Film,
  Folder,
  Heart,
  Home,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  Mic,
  Move,
  Music,
  Package,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RectangleHorizontal,
  Scissors,
  Search,
  Shirt,
  Sliders,
  Sparkles,
  Sun,
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
  CharacterExpression,
  CinemaProductionType,
  LocationCategory,
  LocationItem,
  MediaSlotInput,
  MotionCategory,
  PropCategory,
  StudioId,
  SupportedCharacterLanguage,
  Surface,
  WardrobeCategory,
} from '../types/studio';
import { StoryStudioView } from './StoryStudioView';
import { AutomaticProductionWorkflow } from './AutomaticProductionWorkflow';
import { MusicVideoStudioView } from './MusicVideoStudioView';
import { GearVisual } from './GearVisual';
import {
  getApertureVisual,
  getCameraAngleVisual,
  getCameraBodyVisual,
  getCameraMovementVisual,
  getColorGradeVisual,
  getLensOpticVisual,
} from '../catalog/cinemaGearVisuals';
import {
  CINEMA_TOOL_CATEGORIES,
  CINEMA_TOOL_LIST,
  CINEMA_TOOLS,
  CinemaToolCategoryId,
  CinemaToolId,
  getCompatibleModelsForTool,
  resolveCompatibleModel,
} from '../catalog/modelCapabilities';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Input,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/primitives';
import {
  AnimatedPillTabs,
  BorderBeam,
  ShimmerButton,
  SpotlightCard,
} from './ui/aceternity-magic';

// High-resolution showcase assets matching the fanned 3-card stack in the reference screenshot
import showcaseMonologueImg from '../assets/images/showcase_cinema_monologue_1794663513979.jpg';
import showcaseCorridorImg from '../assets/images/showcase_corridor_tracking_1794663516993.jpg';
import showcaseArchitectureImg from '../assets/images/showcase_sunlit_architecture_1794663516452.jpg';

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

export interface StudioWorkspaceConfig {
  id: StudioId;
  title: string;
  shortBadge: string;
  defaultSurface: 'video' | 'image';
  setupCardLabel: string;
  cameraCardLabel: string;
  promptPlaceholder: string;
  vaultButtonLabel: string;
  directivePrefix: string;
}

export const STUDIO_WORKSPACE_CONFIGS: Record<StudioId, StudioWorkspaceConfig> = {
  cinema: {
    id: 'cinema',
    title: 'Cinema Studio',
    shortBadge: 'CINEMA',
    defaultSurface: 'video',
    setupCardLabel: 'Film setup',
    cameraCardLabel: 'Camera',
    promptPlaceholder: 'Describe your scene - use @ to add characters & locations',
    vaultButtonLabel: '4-Stage Story Studio',
    directivePrefix: 'Cinema Studio 4.0 Direction',
  },
  character: {
    id: 'character',
    title: 'Character Studio',
    shortBadge: 'CHARACTER',
    defaultSurface: 'image',
    setupCardLabel: 'Identity setup',
    cameraCardLabel: 'Portrait optics',
    promptPlaceholder:
      'Describe character face, body, expression, wardrobe & voice - use @ to reference saved assets',
    vaultButtonLabel: 'Character Vault & Voice Lab',
    directivePrefix: 'Character Studio Identity Lock',
  },
  motion: {
    id: 'motion',
    title: 'Motion Studio',
    shortBadge: 'MOTION',
    defaultSurface: 'video',
    setupCardLabel: 'Motion setup',
    cameraCardLabel: 'Camera & rig',
    promptPlaceholder:
      'Describe body movement, pose transfer, gesture or action - use @ to lock target character',
    vaultButtonLabel: 'Motion Choreographer & Keyframes',
    directivePrefix: 'Motion Control Studio Transfer',
  },
  wardrobe: {
    id: 'wardrobe',
    title: 'Wardrobe Studio',
    shortBadge: 'WARDROBE',
    defaultSurface: 'image',
    setupCardLabel: 'Wardrobe setup',
    cameraCardLabel: 'Lookbook lens',
    promptPlaceholder:
      'Describe garments, fabrics, footwear, accessories & jewellery - use @ to assign to a character',
    vaultButtonLabel: 'Wardrobe Closet & Lookbook',
    directivePrefix: 'Wardrobe Continuity Plate',
  },
  props: {
    id: 'props',
    title: 'Props Studio',
    shortBadge: 'PROPS',
    defaultSurface: 'image',
    setupCardLabel: 'Prop setup',
    cameraCardLabel: 'Macro & angle',
    promptPlaceholder:
      'Describe hero vehicle, gadget, weapon, artifact or furniture - use @ to link characters & sets',
    vaultButtonLabel: 'Props Vault & Registry',
    directivePrefix: 'Hero Prop Continuity Plate',
  },
  location: {
    id: 'location',
    title: 'Location Studio',
    shortBadge: 'LOCATION',
    defaultSurface: 'image',
    setupCardLabel: 'Set & weather',
    cameraCardLabel: 'Set camera',
    promptPlaceholder:
      'Describe INT./EXT. filming environment, architecture, time of day & weather - use @ for assets',
    vaultButtonLabel: 'Locations & Multi-Angle Sets',
    directivePrefix: 'Location Environment Plate',
  },
  storyboard: {
    id: 'storyboard',
    title: 'Storyboard Studio',
    shortBadge: 'STORYBOARD',
    defaultSurface: 'image',
    setupCardLabel: 'Board setup',
    cameraCardLabel: 'Framing & lens',
    promptPlaceholder:
      'Describe storyboard shot composition, blocking & camera angle - use @ to lock cast & set',
    vaultButtonLabel: 'Storyboard Sequence Grid',
    directivePrefix: 'Storyboard Continuity Frame',
  },
  marketing: {
    id: 'marketing',
    title: 'Marketing Studio',
    shortBadge: 'MARKETING',
    defaultSurface: 'video',
    setupCardLabel: 'Campaign setup',
    cameraCardLabel: 'Commercial rig',
    promptPlaceholder:
      'Describe commercial hook, UGC creator action & product showcase - use @ for character & prop',
    vaultButtonLabel: 'Campaign & UGC Builder',
    directivePrefix: 'Marketing & Commercial Production',
  },
  lipsync: {
    id: 'lipsync',
    title: 'Lip Sync Studio',
    shortBadge: 'LIP SYNC',
    defaultSurface: 'video',
    setupCardLabel: 'Dialogue & voice',
    cameraCardLabel: 'Close-up lens',
    promptPlaceholder:
      'Enter spoken dialogue or performance direction - use @ to lock speaking character face & voice',
    vaultButtonLabel: 'Multilingual Lip Sync Console',
    directivePrefix: 'Lip Sync Viseme Performance',
  },
  effects: {
    id: 'effects',
    title: 'Effects Studio',
    shortBadge: 'EFFECTS',
    defaultSurface: 'video',
    setupCardLabel: 'VFX preset',
    cameraCardLabel: 'Rig & motion',
    promptPlaceholder:
      'Describe visual effect transformation, particle simulation or camera rig - use @ for elements',
    vaultButtonLabel: 'VFX & Camera Rig Catalog',
    directivePrefix: 'Visual Effects & Camera Rig',
  },
  canvas: {
    id: 'canvas',
    title: 'Canvas Studio',
    shortBadge: 'CANVAS',
    defaultSurface: 'video',
    setupCardLabel: 'Node pipeline',
    cameraCardLabel: 'Optical chain',
    promptPlaceholder:
      'Describe connected multi-model keyframe-to-video scene - use @ to wire character, set & prop nodes',
    vaultButtonLabel: 'Node Graph Pipeline',
    directivePrefix: 'Connected Canvas Workflow',
  },
  editing: {
    id: 'editing',
    title: 'Editing Studio',
    shortBadge: 'EDITING',
    defaultSurface: 'video',
    setupCardLabel: 'Cut & pacing',
    cameraCardLabel: 'Master optics',
    promptPlaceholder:
      'Describe transition shot, B-roll insert or final sequence cut - use @ to keep scene continuity',
    vaultButtonLabel: 'Multi-Track Timeline Sequencer',
    directivePrefix: 'Timeline Sequence Assembly',
  },
};

const SHOWCASE_CARDS = [
  {
    id: 'monologue',
    image: showcaseMonologueImg,
    tag: 'WINDOW LIGHT · 50MM PRIME · f/1.4',
    title: 'Intimate Living Room Monologue',
    prompt:
      'Intimate dramatic monologue in a sunlit living room, soft daylight filtering through sheer lace curtains, 50mm Cooke Panchro prime lens at f/1.4, subtle film grain, authentic emotional performance.',
  },
  {
    id: 'corridor',
    image: showcaseCorridorImg,
    tag: '35MM STEADICAM · TWILIGHT FABLE',
    title: 'Architectural Corridor Tracking',
    prompt:
      'Low-angle Steadicam tracking shot gliding down a brutalist concrete corridor with recessed linear LED ceiling strips, 35mm anamorphic lens, crisp reflections on dark stone floor.',
  },
  {
    id: 'architecture',
    image: showcaseArchitectureImg,
    tag: '70MM ANAMORPHIC · GOLDEN HOUR',
    title: 'Sunlit Timber Atrium',
    prompt:
      'Monumental 70mm IMAX wide shot inside a warm timber skylight atrium during golden hour, volumetric sunbeams cutting through atmospheric dust motes, deep dynamic range.',
  },
];

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

const SUPPORTED_LANGUAGES: SupportedCharacterLanguage[] = [
  'English',
  'Nigerian Pidgin',
  'Yoruba',
  'Igbo',
  'Hausa',
  'French',
  'Swahili',
  'Spanish',
  'Arabic',
  'Mandarin',
];

export interface HiggsfieldCinemaStudioProps {
  studioId?: StudioId;
  initialSurface?: 'video' | 'image';
  renderStudioVault?: () => React.ReactNode;
}

export const HiggsfieldCinemaStudio: React.FC<HiggsfieldCinemaStudioProps> = ({
  studioId = 'cinema',
  initialSurface,
  renderStudioVault,
}) => {
  const {
    models,
    generations,
    characters,
    wardrobes,
    propsList,
    locations,
    motionTemplates,
    cinemaProjects,
    presets,
    activeContinuity,
    setActiveContinuity,
    submitGeneration,
    uploadReferenceFile,
    composeContinuityPrompt,
    saveCharacter,
    saveMotionTemplate,
    saveWardrobe,
    saveProp,
    saveLocation,
    saveCinemaProject,
    calculateTokenCost,
    navigate,
    routeParams,
    showToast,
  } = useRuns();

  const studioConfig = STUDIO_WORKSPACE_CONFIGS[studioId] || STUDIO_WORKSPACE_CONFIGS.cinema;

  // ==========================================================================
  // WORKSPACE MODE, CONTEXTUAL TOOL & NAVIGATION STATE
  // ==========================================================================
  const [workingMode, setWorkingMode] = useState<'director' | 'auto_production' | 'music_video' | 'production'>('director');
  const [activeCategory, setActiveCategory] = useState<CinemaToolCategoryId>('media_generation');
  const [activeToolId, setActiveToolId] = useState<CinemaToolId>('video_creation');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'home' | 'elements' | 'favorites' | 'project'>('home');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [projectSort, setProjectSort] = useState<'recent' | 'alpha' | 'type'>('recent');
  const [activeSubfolder, setActiveSubfolder] = useState<'all' | 'scenes' | 'versions' | 'deliverables'>('all');
  const [favoriteGenIds, setFavoriteGenIds] = useState<string[]>([]);
  const [activeShowcaseIdx, setActiveShowcaseIdx] = useState<number>(0);
  const [showLiveMonitor, setShowLiveMonitor] = useState<boolean>(false);

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
  // UNIVERSAL GENERATION WORKSPACE & DIRECTOR'S PANEL STATE
  // ==========================================================================
  const [dockSurface, setDockSurface] = useState<Surface>(
    () => initialSurface || studioConfig.defaultSurface
  );

  const [scenePrompt, setScenePrompt] = useState('');
  const [selectedVideoModelId, setSelectedVideoModelId] = useState('seedance-2-5');
  const [selectedImageModelId, setSelectedImageModelId] = useState('soul-2-standard');
  const [selectedAudioModelId, setSelectedAudioModelId] = useState('inworld-tts-studio');
  const [voicePersona, setVoicePersona] = useState<string>('noir_narrator');
  const [resolution, setResolution] = useState<'1080p' | '2K' | '4K'>('1080p');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '21:9' | '9:16' | '1:1'>('16:9');
  const [durationSec, setDurationSec] = useState<number>(5);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [selectedEmotion, setSelectedEmotion] = useState<string>('Auto');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const activeToolSpec = useMemo(
    () => CINEMA_TOOLS[activeToolId] || CINEMA_TOOLS.video_creation,
    [activeToolId]
  );

  // Sync URL/Header routeParams (tab, mode, category, tool) with Cinema Studio state
  useEffect(() => {
    if (routeParams?.mode === 'auto_production') {
      setWorkingMode('auto_production');
    } else if (routeParams?.mode === 'music_video') {
      setWorkingMode('music_video');
    } else if (routeParams?.mode === 'production') {
      setWorkingMode('production');
    }
    if (routeParams?.tab === 'elements') {
      setWorkingMode('director');
      setSidebarTab('elements');
    } else if (routeParams?.tab === 'favorites') {
      setWorkingMode('director');
      setSidebarTab('favorites');
    } else if (routeParams?.tab === 'projects') {
      setWorkingMode('director');
      setSidebarTab('project');
    } else if (routeParams?.tab === 'home') {
      setWorkingMode('director');
      setSidebarTab('home');
    }
    if (
      routeParams?.category === 'production_elements' ||
      routeParams?.category === 'media_generation' ||
      routeParams?.category === 'film_production'
    ) {
      setActiveCategory(routeParams.category);
    }
    if (routeParams?.tool) {
      const foundTool = CINEMA_TOOL_LIST.find((t) => t.id === routeParams.tool);
      if (foundTool) {
        setActiveCategory(foundTool.category);
        setActiveToolId(foundTool.id);
        setDockSurface(
          foundTool.targetSurface === 'llm' ? 'image' : foundTool.targetSurface
        );
      }
    }
  }, [routeParams]);

  // Select a tool inside Cinema Studio and automatically route surface & model capability
  const handleSelectCinemaTool = (toolId: CinemaToolId) => {
    const spec = CINEMA_TOOLS[toolId];
    if (!spec) return;
    setActiveToolId(spec.id);
    setActiveCategory(spec.category);
    setWorkingMode('director');

    const effectiveSurface: Surface =
      spec.targetSurface === 'llm' ? 'image' : spec.targetSurface;

    // Switch surface to match the tool's primary capability
    setDockSurface(effectiveSurface);

    // Ensure the selected model for that surface is compatible with this tool
    const compatible = resolveCompatibleModel(
      spec.id,
      effectiveSurface === 'video'
        ? selectedVideoModelId
        : effectiveSurface === 'audio'
        ? selectedAudioModelId
        : selectedImageModelId,
      models,
      effectiveSurface
    );

    if (effectiveSurface === 'video') {
      setSelectedVideoModelId(compatible.id);
    } else if (effectiveSurface === 'audio') {
      setSelectedAudioModelId(compatible.id);
    } else {
      setSelectedImageModelId(compatible.id);
    }

    // Open contextual panel only when user selects a tool that benefits from it
    if (spec.id === 'visual_reference') {
      setActivePopover('references');
    } else if (spec.id === 'camera_coverage') {
      setActivePopover('camera');
    } else if (spec.id === 'lighting_cinema') {
      setActivePopover('lighting');
    } else if (spec.id === 'script_screenplay' || spec.id === 'scene_breakdown') {
      setAiDirectorOpen(true);
    } else if (spec.id === 'video_sequencing') {
      setWorkingMode('production');
    }
  };

  // Studio-specific quick builder state (accessible inside Film/Studio Setup popover)
  const [quickCharName, setQuickCharName] = useState('');
  const [quickCharRole, setQuickCharRole] = useState('Lead Protagonist');
  const [quickCharLang, setQuickCharLang] = useState<SupportedCharacterLanguage>('English');
  const [quickCharFeatures, setQuickCharFeatures] = useState(
    'Athletic build, braided crown locs, warm confident gaze'
  );
  const [quickMotionName, setQuickMotionName] = useState('Kinetic Walk & Turn');
  const [quickMotionCat, setQuickMotionCat] = useState<MotionCategory>('Walking');
  const [quickWardrobeName, setQuickWardrobeName] = useState('');
  const [quickWardrobeCat, setQuickWardrobeCat] = useState<WardrobeCategory>('Traditional');
  const [quickWardrobeGarments, setQuickWardrobeGarments] = useState(
    'Hand-loomed indigo Agbada with gold embroidery'
  );
  const [quickPropName, setQuickPropName] = useState('');
  const [quickPropCat, setQuickPropCat] = useState<PropCategory>('Cars & Vehicles');
  const [quickPropFinish, setQuickPropFinish] = useState('Matte Obsidian & Brushed Titanium');
  const [quickLocName, setQuickLocName] = useState('');
  const [quickLocSetting, setQuickLocSetting] = useState<'INT.' | 'EXT.' | 'INT./EXT.'>('EXT.');
  const [quickLocCat, setQuickLocCat] = useState<LocationCategory>('Cities');
  const [quickLocTime, setQuickLocTime] = useState<LocationItem['timeOfDay']>('Night');
  const [quickLocWeather, setQuickLocWeather] = useState<LocationItem['weather']>('Rain');
  const [quickLipSyncLang, setQuickLipSyncLang] = useState<SupportedCharacterLanguage>('English');
  const [quickLipSyncLine, setQuickLipSyncLine] = useState(
    'Every frame remembers our face, voice, and soul across the entire production.'
  );
  const [quickMarketingFormat, setQuickMarketingFormat] = useState('UGC Creator Review (9:16)');

  // Stage 3 Director's Panel Popover State
  const [activePopover, setActivePopover] = useState<
    null | 'references' | 'film_setup' | 'camera' | 'color_palette' | 'lighting' | 'models' | 'at_elements'
  >(null);
  const [filmSetupTab, setFilmSetupTab] = useState<'studio' | 'genre' | 'era' | 'tempo'>(() =>
    studioId === 'cinema' ? 'genre' : 'studio'
  );

  useEffect(() => {
    setFilmSetupTab(studioId === 'cinema' ? 'genre' : 'studio');
  }, [studioId]);

  const [cameraModalTab, setCameraModalTab] = useState<'setup' | 'movement'>('setup');
  const [movementSearch, setMovementSearch] = useState('');
  const [paletteSearch, setPaletteSearch] = useState('');
  const [lightingSearch, setLightingSearch] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
  const audioModels = useMemo(
    () => models.filter((m) => m.surface === 'audio'),
    [models]
  );

  // Intelligent Model-Capability Routing: filter models strictly by active tool & surface
  const compatibleModels = useMemo(
    () => getCompatibleModelsForTool(activeToolId, models, dockSurface),
    [activeToolId, models, dockSurface]
  );

  const activeModel = useMemo(() => {
    const requestedId =
      dockSurface === 'video'
        ? selectedVideoModelId
        : dockSurface === 'audio'
        ? selectedAudioModelId
        : selectedImageModelId;
    return resolveCompatibleModel(activeToolId, requestedId, models, dockSurface);
  }, [
    activeToolId,
    dockSurface,
    selectedVideoModelId,
    selectedAudioModelId,
    selectedImageModelId,
    models,
  ]);

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

  const sortedProjects = useMemo(() => {
    const filtered = cinemaProjects.filter((p) =>
      !projectSearch.trim()
        ? true
        : p.title.toLowerCase().includes(projectSearch.toLowerCase())
    );
    const copy = [...filtered];
    if (projectSort === 'alpha') {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    } else if (projectSort === 'type') {
      copy.sort((a, b) => a.productionType.localeCompare(b.productionType));
    }
    return copy;
  }, [cinemaProjects, projectSearch, projectSort]);

  const estimatedCredits = useMemo(() => {
    const modelId =
      activeModel?.id || (dockSurface === 'video' ? 'seedance-2-5' : 'soul-2-standard');
    const settingsPayload: Record<string, string | number | boolean> = {
      aspect_ratio: aspectRatio === '21:9' ? '16:9' : aspectRatio,
      resolution,
    };
    if (dockSurface === 'video') {
      settingsPayload.duration = durationSec;
      settingsPayload.sound = soundEnabled;
    }
    const refMedia: MediaSlotInput[] = allReferences
      .filter((r) => Boolean(r.url))
      .map((r) => ({
        role: r.kind === 'video' ? 'video' : 'reference',
        kind: r.kind === 'video' ? 'video' : 'image',
        url: r.url,
        label: r.label,
      }));
    return calculateTokenCost(modelId, settingsPayload, refMedia, batchSize);
  }, [
    activeModel,
    dockSurface,
    aspectRatio,
    resolution,
    durationSec,
    soundEnabled,
    allReferences,
    batchSize,
    calculateTokenCost,
  ]);

  // Summary labels for the 5 Director's Panel cards in the dock
  const filmSetupSummary = useMemo(() => {
    const parts = [
      filmSetup.genre !== 'Auto' ? filmSetup.genre : '',
      filmSetup.era !== 'Auto' ? filmSetup.era : '',
      filmSetup.tempo !== 'Auto' ? filmSetup.tempo : '',
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(' · ');
    if (studioId === 'character' && activeContinuity.characterIds.length > 0) {
      const c = characters.find((item) => item.id === activeContinuity.characterIds[0]);
      return c ? c.name : 'Auto';
    }
    if (studioId === 'wardrobe' && activeContinuity.wardrobeId) {
      const w = wardrobes.find((item) => item.id === activeContinuity.wardrobeId);
      return w ? w.name : 'Auto';
    }
    if (studioId === 'location' && activeContinuity.locationId) {
      const l = locations.find((item) => item.id === activeContinuity.locationId);
      return l ? l.name : 'Auto';
    }
    return 'Auto';
  }, [filmSetup, studioId, activeContinuity, characters, wardrobes, locations]);

  const cameraSummary = useMemo(() => {
    const parts = [
      cameraOptics.camera !== 'Auto' ? cameraOptics.camera : '',
      cameraOptics.lens !== 'Auto' ? cameraOptics.lens : '',
      cameraOptics.aperture !== 'Auto' ? cameraOptics.aperture : '',
      ...cameraOptics.movements,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Auto';
  }, [cameraOptics]);

  // Ordered showcase cards based on activeShowcaseIdx
  const orderedShowcase = useMemo(() => {
    const total = SHOWCASE_CARDS.length;
    return [
      SHOWCASE_CARDS[activeShowcaseIdx % total],
      SHOWCASE_CARDS[(activeShowcaseIdx + 1) % total],
      SHOWCASE_CARDS[(activeShowcaseIdx + 2) % total],
    ];
  }, [activeShowcaseIdx]);

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

    if (studioId === 'lipsync' && quickLipSyncLine.trim()) {
      directives.push(
        `Spoken Language: ${quickLipSyncLang}, synchronized viseme lip performance speaking: "${quickLipSyncLine.trim()}"`
      );
    }
    if (studioId === 'marketing') {
      directives.push(`Commercial Format: ${quickMarketingFormat}`);
    }

    const cleanScene =
      rawUserPrompt.trim() ||
      `Cinematic ${studioConfig.title} production shot from "${projectTitle}" (${productionType})`;

    return directives.length > 0
      ? `[${studioConfig.directivePrefix} — ${directives.join(' | ')}] ${cleanScene}`
      : `[${studioConfig.directivePrefix}] ${cleanScene}`;
  };

  const handleGenerateShot = async (overridePrompt?: string, overrideMedia?: MediaSlotInput[]) => {
    // Intelligent Model-Capability Routing: resolve strictly compatible model for the current tool & surface
    const routedModel = resolveCompatibleModel(
      activeToolId,
      activeModel?.id,
      models,
      dockSurface
    );

    const isAudioTask = routedModel.surface === 'audio' || dockSurface === 'audio';
    const rawText = (overridePrompt ?? scenePrompt).trim();

    const directed = isAudioTask
      ? rawText || `Cinematic ${activeToolSpec.label} for "${projectTitle}"`
      : buildDirectedPrompt(rawText);

    const extraMedia: MediaSlotInput[] = overrideMedia ? [...overrideMedia] : [];

    if (!isAudioTask) {
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
    }

    const composed = isAudioTask
      ? { prompt: directed, media: [] as MediaSlotInput[] }
      : composeContinuityPrompt(directed, undefined, extraMedia);

    setIsSubmitting(true);
    try {
      for (let i = 0; i < batchSize; i++) {
        const settingsPayload: Record<string, string | number | boolean> =
          routedModel.surface === 'audio'
            ? {
                duration: String(durationSec || 10),
                voice_persona: voicePersona,
                speaking_rate: 1.0,
                instrumental_only: activeToolId === 'music_sfx',
              }
            : {
                aspect_ratio: aspectRatio === '21:9' ? '16:9' : aspectRatio,
                resolution,
                ...(routedModel.surface === 'video'
                  ? { duration: durationSec, sound: soundEnabled }
                  : {}),
              };

        const res = await submitGeneration({
          surface: routedModel.surface,
          modelId: routedModel.id,
          mode:
            routedModel.modes[0] ||
            (routedModel.surface === 'video'
              ? 'Create Video'
              : routedModel.surface === 'audio'
              ? 'Voice & SFX'
              : 'Create'),
          prompt: composed.prompt,
          settings: settingsPayload,
          media: composed.media,
        });
        if (res.generation?.id) {
          setInspectedGenId(res.generation.id);
          setShowLiveMonitor(true);
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
    showToast('Added shot to References rack (up to 50)');
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
      logline: `New virtual production directed in SPACIX ${studioConfig.title}.`,
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
      showToast(`Created project "${created.title}"`);
    }
  };

  // Studio-specific quick-save handlers inside the popover modal
  const handleQuickSaveCharacter = async () => {
    if (!quickCharName.trim()) {
      showToast('Enter a character name first');
      return;
    }
    const saved = await saveCharacter({
      name: quickCharName.trim(),
      roleTitle: quickCharRole,
      facialIdentityLock: true,
      identitySeed: Math.floor(100000 + Math.random() * 900000),
      facePromptDescriptor: quickCharFeatures,
      ageRange: '25-32',
      genderPresentation: 'Hero Lead',
      skinTone: 'Warm Natural',
      bodyType: 'Athletic',
      height: '5\'10"',
      hairstyle: 'Signature Style',
      eyeColor: 'Deep Brown',
      distinctiveFeatures: quickCharFeatures,
      voiceId: `VLOCK-${Math.floor(1000 + Math.random() * 9000)}`,
      voiceName: `${quickCharName.trim()} Locked Voice`,
      voiceIdentityLock: true,
      voiceCloneConsent: true,
      primaryLanguage: quickCharLang,
      supportedLanguages: [quickCharLang, 'English'],
      speechAccent: 'Authentic Native',
      pitch: 'Medium',
      tone: 'Warm & Resonant',
      defaultEmotion: 'Determined',
      speakingSpeed: 1.0,
      deliveryStyle: 'Naturalistic Cinema',
      activeExpression: 'Determined',
      expressionSheetUrls: {},
      defaultWardrobeId: wardrobes[0]?.id || null,
      consistencyLock: true,
    });
    if (saved) {
      insertElementToken(`@${saved.name.toUpperCase()}`, saved.id);
      setQuickCharName('');
      showToast(`Saved & locked character @${saved.name} [${saved.identityId}]`);
    }
  };

  const handleQuickSaveWardrobe = async () => {
    if (!quickWardrobeName.trim()) {
      showToast('Enter an outfit name first');
      return;
    }
    const saved = await saveWardrobe({
      name: quickWardrobeName.trim(),
      category: quickWardrobeCat,
      description: quickWardrobeGarments,
      garments: quickWardrobeGarments,
      shoes: 'Matched production footwear',
      accessories: 'Signature continuity accessories',
      jewellery: 'Subtle metallic accents',
      hairstyleOverride: '',
      colorPalette: activePalette.name,
      referenceImageUrl: '',
      assignedCharacterIds: activeContinuity.characterIds,
      sceneContinuityLock: true,
    });
    if (saved) {
      setActiveContinuity((prev) => ({ ...prev, wardrobeId: saved.id }));
      setQuickWardrobeName('');
      showToast(`Saved & locked wardrobe "${saved.name}"`);
    }
  };

  const handleQuickSaveProp = async () => {
    if (!quickPropName.trim()) {
      showToast('Enter a prop name first');
      return;
    }
    const saved = await saveProp({
      name: quickPropName.trim(),
      category: quickPropCat,
      description: `${quickPropName.trim()} (${quickPropCat})`,
      materialAndFinish: quickPropFinish,
      scaleAndDimensions: 'Hero production scale',
      referenceImageUrl: '',
      assignedCharacterIds: activeContinuity.characterIds,
      assignedSceneIds: [],
      appearanceLock: true,
    });
    if (saved) {
      insertElementToken(`[PROP: ${saved.name}]`, undefined, undefined, saved.id);
      setQuickPropName('');
      showToast(`Saved & locked prop "${saved.name}"`);
    }
  };

  const handleQuickSaveLocation = async () => {
    if (!quickLocName.trim()) {
      showToast('Enter a location name first');
      return;
    }
    const saved = await saveLocation({
      name: quickLocName.trim(),
      category: quickLocCat,
      settingType: quickLocSetting,
      timeOfDay: quickLocTime,
      weather: quickLocWeather,
      description: `${quickLocSetting} ${quickLocName.trim()} (${quickLocTime}, ${quickLocWeather})`,
      lightingAndMood: activeLighting.name,
      primaryImageUrl: '',
      cameraAngleReferences: [],
      continuityLock: true,
    });
    if (saved) {
      insertElementToken(`@${saved.name.toUpperCase()}`, undefined, saved.id);
      setQuickLocName('');
      showToast(`Saved & locked location @${saved.name}`);
    }
  };

  const handleQuickSaveMotion = async () => {
    if (!quickMotionName.trim()) {
      showToast('Enter a motion preset name');
      return;
    }
    const saved = await saveMotionTemplate({
      name: quickMotionName.trim(),
      movementCategory: quickMotionCat,
      referenceVideoUrl: '',
      sourceImageUrl: '',
      targetCharacterId: activeContinuity.characterIds[0] || characters[0]?.id || null,
      preserveAppearanceLock: true,
      bodyPoseTransfer: true,
      facialExpressionTransfer: true,
      handGestureControl: true,
      cameraMovement: cameraOptics.movements[0] || 'Tracking shot',
      keyframes: [
        { timeSec: 0, x: 20, y: 65, poseNote: 'Start stance', expression: 'Neutral' },
        { timeSec: 5, x: 75, y: 45, poseNote: 'Final mark', expression: 'Determined' },
      ],
      motionPrompt: scenePrompt || `${quickMotionCat} motion transfer`,
    });
    if (saved) {
      setActiveContinuity((prev) => ({ ...prev, motionTemplateId: saved.id }));
      showToast(`Saved & locked motion preset "${saved.name}"`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#090A0C] text-zinc-100 flex flex-col overflow-x-hidden">
      {/* ====================================================================
          MAIN UNIFIED STUDIO WORKSPACE
          Matches attached screenshot across all 12 SPACIX Studios
          ==================================================================== */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Mobile Backdrop for Left Sidebar Drawer */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 lg:hidden"
          />
        )}

        {/* ================================================================
            1. FIXED NARROW LEFT SIDEBAR (EXACT MATCH TO SCREENSHOT)
            Top: [SPACIX Logo / Studio Switcher ⌄] [◧]
            Nav: Home, My elements, My favorites
            Projects: Search, Sorting, + New project
            Bottom: Community
            ================================================================ */}
        <aside
          className={`${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } ${
            sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'
          } fixed lg:static inset-y-0 left-0 w-64 max-w-[85vw] shrink-0 bg-[#0E0F12] border-r border-white/[0.07] flex flex-col justify-between transition-all duration-200 select-none z-50 lg:z-20`}
        >
          <div className="p-3 space-y-4 overflow-y-auto no-scrollbar">
            {/* Top Row: [SPACIX Cinema Studio Identity] + [◧ Collapse Toggle] */}
            <div className="flex items-center justify-between gap-1.5 relative">
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-[#18191E] border border-white/10 flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src="/brand/logo.png"
                      alt="SPACIX"
                      className="h-4 w-auto object-contain shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="text-[11px] font-extrabold tracking-wider uppercase text-white truncate">
                      CINEMA STUDIO
                    </span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#46ecd5] shrink-0" />
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setMobileSidebarOpen(false);
                  } else {
                    setSidebarCollapsed((v) => !v);
                  }
                }}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="w-9 h-9 rounded-2xl bg-[#18191E] hover:bg-[#202228] border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center shrink-0 transition-colors"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Sidebar Navigation: Home, My elements, My favorites */}
            <nav className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setWorkingMode('director');
                  setSidebarTab('home');
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-2xl text-xs font-bold transition-all ${
                  sidebarTab === 'home' && workingMode === 'director'
                    ? 'bg-[#1C1E24] text-white shadow-inner border border-white/10'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-7 h-7 rounded-xl bg-gradient-to-b from-zinc-600/60 to-zinc-800 border border-white/15 flex items-center justify-center shrink-0 shadow">
                  <Home className="w-3.5 h-3.5 text-white" />
                </span>
                {!sidebarCollapsed && <span>Home</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setWorkingMode('director');
                  setSidebarTab('elements');
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-2xl text-xs font-bold transition-all ${
                  sidebarTab === 'elements' && workingMode === 'director'
                    ? 'bg-[#1C1E24] text-white shadow-inner border border-white/10'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-gradient-to-b from-sky-400/40 to-blue-600/40 border border-sky-400/50 flex items-center justify-center shrink-0 text-sky-200 font-mono text-xs font-extrabold shadow">
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
                onClick={() => {
                  setWorkingMode('director');
                  setSidebarTab('favorites');
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-2xl text-xs font-bold transition-all ${
                  sidebarTab === 'favorites' && workingMode === 'director'
                    ? 'bg-[#1C1E24] text-white shadow-inner border border-white/10'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-gradient-to-b from-pink-400/40 to-rose-600/40 border border-pink-400/50 flex items-center justify-center shrink-0 shadow">
                    <Heart className="w-3.5 h-3.5 text-pink-200 fill-pink-200" />
                  </span>
                  {!sidebarCollapsed && <span>My favorites</span>}
                </div>
                {!sidebarCollapsed && favoriteGenIds.length > 0 && (
                  <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300">
                    {favoriteGenIds.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setWorkingMode('music_video');
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-2xl text-xs font-bold transition-all ${
                  workingMode === 'music_video'
                    ? 'bg-[#46ecd5]/15 text-[#46ecd5] shadow-inner border border-[#46ecd5]/40'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-gradient-to-b from-[#46ecd5]/35 to-teal-700/40 border border-[#46ecd5]/50 flex items-center justify-center shrink-0 shadow">
                    <Music className="w-3.5 h-3.5 text-[#46ecd5]" />
                  </span>
                  {!sidebarCollapsed && <span>Music Video Studio</span>}
                </div>
              </button>
            </nav>

            {/* Projects Section with Search, Sorting & New Project */}
            {!sidebarCollapsed && (
              <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-zinc-400">Projects</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setProjectSearchOpen((v) => !v)}
                      title="Search projects"
                      className={`p-1 rounded-lg transition-colors ${
                        projectSearchOpen || projectSearch
                          ? 'text-[#46ecd5] bg-white/5'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextSort =
                          projectSort === 'recent'
                            ? 'alpha'
                            : projectSort === 'alpha'
                            ? 'type'
                            : 'recent';
                        setProjectSort(nextSort);
                        showToast(
                          `Projects sorted by: ${
                            nextSort === 'recent'
                              ? 'Most Recent'
                              : nextSort === 'alpha'
                              ? 'Name (A–Z)'
                              : 'Format Type'
                          }`
                        );
                      }}
                      title={`Sort projects (current: ${projectSort})`}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {projectSearchOpen && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="Search projects..."
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-[#16181D] border border-white/10 text-[11px] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#46ecd5]"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCreateNewProduction}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-2xl hover:bg-white/5 text-xs font-semibold text-zinc-300 hover:text-white transition-all"
                >
                  <span className="w-7 h-7 rounded-xl bg-[#1B1D23] border border-white/10 flex items-center justify-center shrink-0">
                    <Plus className="w-3.5 h-3.5 text-zinc-300" />
                  </span>
                  <span>New project</span>
                </button>

                {/* Active Production List */}
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {sortedProjects.map((proj) => {
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
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-all ${
                            isSelected
                              ? 'bg-[#1C1E24] text-white font-bold border border-white/10'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="truncate">{proj.title}</span>
                          <span className="text-[10px] font-mono-tabular text-zinc-500">
                            {proj.aspectRatio}
                          </span>
                        </button>
                        {isSelected && sidebarTab === 'project' && (
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
                                onClick={() => setActiveSubfolder(folder.id)}
                                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                                  activeSubfolder === folder.id
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

          {/* Bottom Community & Pricing Navigation */}
          <div className="p-3 border-t border-white/[0.06] space-y-1">
            <button
              type="button"
              onClick={() => navigate('pricing')}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-2xl text-xs font-bold text-zinc-200 hover:text-white hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-gradient-to-b from-[#46ecd5]/30 to-teal-700/30 border border-[#46ecd5]/40 flex items-center justify-center shrink-0 text-[#46ecd5] font-mono text-[11px] font-extrabold">
                  ✦
                </span>
                {!sidebarCollapsed && <span>Pricing</span>}
              </div>
              {!sidebarCollapsed && (
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#46ecd5]/15 text-[#46ecd5] border border-[#46ecd5]/30">
                  Soon
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('community')}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-2xl text-xs font-bold text-zinc-200 hover:text-white hover:bg-white/5 transition-all"
            >
              <span className="w-7 h-7 rounded-xl bg-gradient-to-b from-zinc-600/50 to-zinc-800 border border-white/15 flex items-center justify-center shrink-0">
                <Compass className="w-3.5 h-3.5 text-zinc-200" />
              </span>
              {!sidebarCollapsed && <span>Community</span>}
            </button>
          </div>
        </aside>

        {/* ================================================================
            2. LARGE CENTRAL CREATIVE WORKSPACE + UNIVERSAL COMPOSER
            ================================================================ */}
        <main className="flex-1 min-w-0 flex flex-col justify-between overflow-y-auto overflow-x-hidden relative bg-[#090A0C]">
          {/* ================================================================
              PERSISTENT PROJECT HEADER & COMPACT CONTEXTUAL TOOL NAVIGATION
              Categories: Production Elements | Media Generation | Film Production
              Modes: Studio Workspace | Automatic Production (4-Stage) | Multi-Track Sequencer
              ================================================================ */}
          <div className="border-b border-white/[0.07] bg-[#090A0C]/95 backdrop-blur-md sticky top-0 z-20">
            {/* Row 1: Persistent Project Header + Category Switcher + Mode Controls */}
            <div className="px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="lg:hidden h-8 w-8 rounded-xl shrink-0"
                  title="Open Studio Sidebar"
                >
                  <PanelLeftOpen className="w-4 h-4 text-[#46ecd5]" />
                </Button>

                <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#13151B] border border-white/10">
                  <Clapperboard className="w-3.5 h-3.5 text-[#46ecd5] shrink-0" />
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none w-28 sm:w-40 truncate"
                    title="Active Production Title"
                  />
                  <Badge variant="outline" className="hidden md:inline-flex font-mono text-[10px]">
                    {productionType}
                  </Badge>
                </div>

                {/* 3 Logical Tool Category Pills — Framer Motion AnimatedPillTabs */}
                <div className="hidden sm:block">
                  <AnimatedPillTabs
                    layoutId="cinema-tool-category-tabs"
                    activeId={workingMode === 'director' ? activeCategory : ''}
                    items={CINEMA_TOOL_CATEGORIES.map((cat) => ({
                      id: cat.id,
                      label: cat.label,
                    }))}
                    onChange={(catId) => {
                      setWorkingMode('director');
                      setActiveCategory(catId);
                      const firstTool = CINEMA_TOOL_LIST.find((t) => t.category === catId);
                      if (firstTool) handleSelectCinemaTool(firstTool.id);
                    }}
                  />
                </div>
              </div>

              {/* Right Controls: Command Palette (⌘K) | Automatic Production (4-Stage) | Multi-Track Sequencer | AI Director */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setCommandPaletteOpen(true)}
                      className="hidden sm:inline-flex gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5 text-[#46ecd5]" />
                      <span>Tools</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-[10px] text-zinc-400">
                        ⌘K
                      </kbd>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open Cinema Studio Command Palette (⌘K)</TooltipContent>
                </Tooltip>

                <Button
                  type="button"
                  variant={workingMode === 'music_video' ? 'default' : 'accent'}
                  size="sm"
                  onClick={() =>
                    setWorkingMode((prev) =>
                      prev === 'music_video' ? 'director' : 'music_video'
                    )
                  }
                  className="whitespace-nowrap"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>
                    {workingMode === 'music_video' ? '← Director' : 'Music Video'}
                  </span>
                </Button>

                <Button
                  type="button"
                  variant={workingMode === 'auto_production' ? 'default' : 'accent'}
                  size="sm"
                  onClick={() =>
                    setWorkingMode((prev) =>
                      prev === 'auto_production' ? 'director' : 'auto_production'
                    )
                  }
                  className="whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {workingMode === 'auto_production'
                      ? '← Studio Workspace'
                      : 'Automatic Production'}
                  </span>
                </Button>

                <Button
                  type="button"
                  variant={workingMode === 'production' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() =>
                    setWorkingMode((prev) => (prev === 'production' ? 'director' : 'production'))
                  }
                  className="whitespace-nowrap"
                >
                  <Layers className="w-3.5 h-3.5 text-[#46ecd5]" />
                  <span className="hidden md:inline">
                    {workingMode === 'production' ? '← Workspace' : 'Timeline & Vault'}
                  </span>
                </Button>

                <Button
                  type="button"
                  variant={aiDirectorOpen ? 'accent' : 'secondary'}
                  size="sm"
                  onClick={() => setAiDirectorOpen((v) => !v)}
                  className="shrink-0"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#46ecd5]" />
                  <span className="hidden xl:inline">AI Director</span>
                </Button>
              </div>
            </div>

            {/* Row 2: Compact Contextual Tool Bar (Shows tools for active category only when in Studio Workspace) */}
            {workingMode === 'director' && (
              <div className="px-3 sm:px-6 py-1.5 border-t border-white/[0.04] bg-[#0D0E12]/90 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                {/* Mobile Category Switcher */}
                <div className="flex sm:hidden items-center gap-1 pr-2 border-r border-white/10 shrink-0">
                  {CINEMA_TOOL_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${
                        activeCategory === cat.id
                          ? 'bg-[#46ecd5]/20 text-[#46ecd5]'
                          : 'text-zinc-500'
                      }`}
                    >
                      {cat.shortLabel}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {CINEMA_TOOL_LIST.filter((t) => t.category === activeCategory).map((tool) => {
                    const isToolSelected = activeToolId === tool.id;
                    return (
                      <Tooltip key={tool.id}>
                        <TooltipTrigger asChild>
                          <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => {
                              handleSelectCinemaTool(tool.id);
                              toast.success(`Switched to ${tool.label}`);
                            }}
                            className={`relative px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 border ${
                              isToolSelected
                                ? 'bg-[#46ecd5]/15 text-[#46ecd5] border-[#46ecd5]/40 font-bold shadow-[0_0_15px_rgba(70,236,213,0.18)]'
                                : 'bg-[#14161C] text-zinc-300 border-white/[0.05] hover:text-white hover:border-white/15'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                            <span>{tool.shortLabel}</span>
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent>{tool.description}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono text-zinc-400 shrink-0">
                  <span>ACTIVE TOOL:</span>
                  <Badge variant="default" className="uppercase font-mono">
                    {activeToolSpec.label}
                  </Badge>
                  <span>·</span>
                  <span>ENGINE: {activeModel?.label}</span>
                </div>
              </div>
            )}
          </div>

          {workingMode === 'music_video' ? (
            /* DEDICATED MUSIC VIDEO PRODUCTION STUDIO INSIDE CINEMA STUDIO */
            <MusicVideoStudioView
              projectId={selectedProjId}
              projectTitle={projectTitle}
              activeAspectRatio={aspectRatio}
              onProjectTitleChange={(t) => setProjectTitle(t)}
              onBackToDirector={() => setWorkingMode('director')}
            />
          ) : workingMode === 'auto_production' ? (
            /* 4-STAGE GUIDED AUTOMATIC FILM PRODUCTION WORKFLOW */
            <div className="flex-1 w-full max-w-[1480px] mx-auto px-3 sm:px-6 py-4 overflow-x-hidden">
              <AutomaticProductionWorkflow
                projectTitle={projectTitle}
                productionType={productionType}
                onProjectTitleChange={(t) => setProjectTitle(t)}
                onOpenAdvancedStoryStudio={() => setWorkingMode('production')}
              />
            </div>
          ) : workingMode === 'production' ? (
            /* FULL STUDIO VAULT / 4-STAGE PIPELINE VIEW INSIDE UNIFIED SHELL */
            <div className="flex-1 w-full max-w-[1560px] mx-auto px-3 sm:px-6 py-4 overflow-x-hidden">
              {renderStudioVault ? (
                renderStudioVault()
              ) : (
                <StoryStudioView onSwitchToLegacyCinema={() => setWorkingMode('director')} />
              )}
            </div>
          ) : (
            <>
              {/* ============================================================
                  CENTER VIEWPORT: UPPER-CENTRE SHOWCASE + GENEROUS EMPTY SPACE
                  ============================================================ */}
              <div className="flex-1 flex flex-col justify-center px-3 sm:px-8 py-4 sm:py-6 max-w-[1280px] w-full mx-auto">
                {sidebarTab === 'elements' ? (
                  /* @ MY ELEMENTS — REUSABLE CONTINUITY VAULT (ACETERNITY SPOTLIGHT CARDS + SHADCN SCROLLAREA) */
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                      <div>
                        <div className="text-xs font-mono-tabular text-sky-400 uppercase tracking-wider">
                          @ MY ELEMENTS — REUSABLE CONTINUITY VAULT ({allReferences.length}/50 ACTIVE)
                        </div>
                        <h2 className="font-display text-2xl font-bold uppercase text-white mt-0.5">
                          Characters, Locations, Wardrobes & Props
                        </h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setActivePopover('film_setup');
                            setFilmSetupTab('studio');
                          }}
                        >
                          + Quick Create Element
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setWorkingMode('auto_production')}
                        >
                          Open Automatic Production
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Characters Column */}
                      <SpotlightCard className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-[#46ecd5]" />
                            <span>Characters ({characters.length})</span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              setSidebarTab('home');
                              handleSelectCinemaTool('character_identity');
                            }}
                            className="text-[#46ecd5]"
                          >
                            + Character Tool
                          </Button>
                        </div>
                        <ScrollArea className="h-64 pr-1">
                          <div className="space-y-2">
                            {characters.map((c) => {
                              const locked = activeContinuity.characterIds.includes(c.id);
                              return (
                                <div
                                  key={c.id}
                                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
                                    locked
                                      ? 'bg-[#46ecd5]/15 border-[#46ecd5]'
                                      : 'bg-[#0D0E12] border-white/10 hover:border-white/20'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="font-bold text-white truncate">@{c.name}</div>
                                    <div className="text-[10px] text-zinc-400 truncate">
                                      {c.identityId} · {c.primaryLanguage}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant={locked ? 'default' : 'secondary'}
                                    size="xs"
                                    onClick={() =>
                                      insertElementToken(`@${c.name.toUpperCase()}`, c.id)
                                    }
                                    className="shrink-0"
                                  >
                                    {locked ? 'In Shot' : '+ Cast'}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </SpotlightCard>

                      {/* Locations Column */}
                      <SpotlightCard className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-[#46ecd5]" />
                            <span>Locations ({locations.length})</span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              setSidebarTab('home');
                              handleSelectCinemaTool('location_environment');
                            }}
                            className="text-[#46ecd5]"
                          >
                            + Location Tool
                          </Button>
                        </div>
                        <ScrollArea className="h-64 pr-1">
                          <div className="space-y-2">
                            {locations.map((loc) => {
                              const locked = activeContinuity.locationId === loc.id;
                              return (
                                <div
                                  key={loc.id}
                                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
                                    locked
                                      ? 'bg-[#46ecd5]/15 border-[#46ecd5]'
                                      : 'bg-[#0D0E12] border-white/10 hover:border-white/20'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="font-bold text-white truncate">@{loc.name}</div>
                                    <div className="text-[10px] text-zinc-400 truncate">
                                      {loc.settingType} · {loc.timeOfDay} · {loc.weather}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant={locked ? 'default' : 'secondary'}
                                    size="xs"
                                    onClick={() =>
                                      insertElementToken(
                                        `@${loc.name.toUpperCase()}`,
                                        undefined,
                                        loc.id
                                      )
                                    }
                                    className="shrink-0"
                                  >
                                    {locked ? 'Active Set' : '+ Set'}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </SpotlightCard>

                      {/* Wardrobes Column */}
                      <SpotlightCard className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                            <Shirt className="w-4 h-4 text-[#46ecd5]" />
                            <span>Wardrobes ({wardrobes.length})</span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              setSidebarTab('home');
                              handleSelectCinemaTool('wardrobe_outfit');
                            }}
                            className="text-[#46ecd5]"
                          >
                            + Wardrobe Tool
                          </Button>
                        </div>
                        <ScrollArea className="h-64 pr-1">
                          <div className="space-y-2">
                            {wardrobes.map((w) => {
                              const locked = activeContinuity.wardrobeId === w.id;
                              return (
                                <div
                                  key={w.id}
                                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
                                    locked
                                      ? 'bg-[#46ecd5]/15 border-[#46ecd5]'
                                      : 'bg-[#0D0E12] border-white/10 hover:border-white/20'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="font-bold text-white truncate">{w.name}</div>
                                    <div className="text-[10px] text-zinc-400 truncate">
                                      {w.category}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant={locked ? 'default' : 'secondary'}
                                    size="xs"
                                    onClick={() =>
                                      setActiveContinuity((prev) => ({
                                        ...prev,
                                        wardrobeId: locked ? null : w.id,
                                      }))
                                    }
                                    className="shrink-0"
                                  >
                                    {locked ? 'Locked' : '+ Outfit'}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </SpotlightCard>

                      {/* Props Column */}
                      <SpotlightCard className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                            <Package className="w-4 h-4 text-[#46ecd5]" />
                            <span>Props ({propsList.length})</span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              setSidebarTab('home');
                              handleSelectCinemaTool('prop_object');
                            }}
                            className="text-[#46ecd5]"
                          >
                            + Props Tool
                          </Button>
                        </div>
                        <ScrollArea className="h-64 pr-1">
                          <div className="space-y-2">
                            {propsList.map((p) => {
                              const locked = activeContinuity.propIds.includes(p.id);
                              return (
                                <div
                                  key={p.id}
                                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
                                    locked
                                      ? 'bg-[#46ecd5]/15 border-[#46ecd5]'
                                      : 'bg-[#0D0E12] border-white/10 hover:border-white/20'
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="font-bold text-white truncate">{p.name}</div>
                                    <div className="text-[10px] text-zinc-400 truncate">
                                      {p.category}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant={locked ? 'default' : 'secondary'}
                                    size="xs"
                                    onClick={() =>
                                      insertElementToken(
                                        `[PROP: ${p.name}]`,
                                        undefined,
                                        undefined,
                                        p.id
                                      )
                                    }
                                    className="shrink-0"
                                  >
                                    {locked ? 'In Shot' : '+ Prop'}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </SpotlightCard>
                    </div>
                  </div>
                ) : (
                  /* UPPER-CENTRE MEDIA SHOWCASE ("COMMUNITIES") + HEADLINE (EXACT SCREENSHOT MATCH) */
                  <div className="space-y-6 sm:space-y-8 my-auto py-4">
                    <div className="flex flex-col items-center text-center space-y-5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.18em] text-white">
                          COMMUNITIES
                        </span>
                        {inspectedGen && inspectedGen.outputs[0] && (
                          <button
                            type="button"
                            onClick={() => setShowLiveMonitor((v) => !v)}
                            className="px-2.5 py-0.5 rounded-full bg-[#181A20] border border-white/15 text-[10px] font-mono text-[#46ecd5] hover:bg-white/10"
                          >
                            {showLiveMonitor ? 'Show Showcase Stack' : 'Show Latest Generated Shot'}
                          </button>
                        )}
                      </div>

                      {/* Fanned 3-Card Media Showcase Stack (Exact Match to Screenshot) */}
                      <div className="relative w-full max-w-xl h-44 sm:h-56 flex items-center justify-center px-4 select-none">
                        {/* Back Right Fanned Card */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowLiveMonitor(false);
                            setActiveShowcaseIdx((prev) => (prev + 2) % SHOWCASE_CARDS.length);
                          }}
                          className="w-56 sm:w-80 h-36 sm:h-48 rounded-3xl overflow-hidden border border-white/15 bg-zinc-900 absolute translate-x-10 sm:translate-x-20 rotate-[4deg] scale-90 opacity-85 shadow-2xl transition-all duration-300 hover:opacity-100 focus:outline-none"
                          title={orderedShowcase[2].title}
                        >
                          <img
                            src={orderedShowcase[2].image}
                            alt={orderedShowcase[2].title}
                            className="w-full h-full object-cover"
                          />
                        </button>

                        {/* Middle Fanned Card */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowLiveMonitor(false);
                            setActiveShowcaseIdx((prev) => (prev + 1) % SHOWCASE_CARDS.length);
                          }}
                          className="w-56 sm:w-80 h-36 sm:h-48 rounded-3xl overflow-hidden border border-white/15 bg-zinc-900 absolute translate-x-5 sm:translate-x-10 rotate-[2deg] scale-95 opacity-95 shadow-2xl transition-all duration-300 hover:opacity-100 focus:outline-none"
                          title={orderedShowcase[1].title}
                        >
                          <img
                            src={orderedShowcase[1].image}
                            alt={orderedShowcase[1].title}
                            className="w-full h-full object-cover"
                          />
                        </button>

                        {/* Front Primary Showcase / Monitor Card */}
                        <div
                          onClick={() => {
                            if (!showLiveMonitor) {
                              setScenePrompt(orderedShowcase[0].prompt);
                              showToast(`Loaded "${orderedShowcase[0].title}" prompt into composer`);
                            }
                          }}
                          className="w-64 sm:w-[360px] h-40 sm:h-52 rounded-3xl overflow-hidden border border-white/20 bg-[#14161B] relative z-10 -translate-x-2 sm:-translate-x-4 shadow-[0_24px_60px_rgba(0,0,0,0.9)] cursor-pointer group transition-transform duration-300 hover:scale-[1.01]"
                        >
                          {showLiveMonitor && inspectedGen && inspectedGen.outputs[0] ? (
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
                            <>
                              <img
                                src={orderedShowcase[0].image}
                                alt={orderedShowcase[0].title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-left">
                                <span className="text-[10px] font-mono text-[#46ecd5]">
                                  {orderedShowcase[0].tag}
                                </span>
                                <span className="text-xs font-bold text-white">
                                  {orderedShowcase[0].title} — Click to load prompt
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Center Headline from Screenshot */}
                      <div className="pt-4 sm:pt-8 space-y-1">
                        <h1 className="font-display text-2xl sm:text-4xl font-extrabold uppercase tracking-wider text-[#46ecd5]">
                          HERE, YOUR IDEAS COMES ALIVE
                        </h1>
                      </div>
                    </div>

                    {/* Stage 5 & 6 Shot Inspector (Shown when user inspects or generates a live shot) */}
                    {showLiveMonitor && inspectedGen && inspectedGen.outputs[0] && (
                      <div className="rounded-2xl bg-[#121418] border border-white/10 p-3.5 max-w-[980px] mx-auto space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 rounded bg-[#46ecd5]/15 border border-[#46ecd5]/40 text-[10px] font-mono font-bold text-[#46ecd5] uppercase">
                              {studioConfig.shortBadge} SHOT INSPECTOR
                            </span>
                            <span className="text-xs font-bold text-white truncate">
                              {inspectedGen.modelLabel} · {inspectedGen.prompt.slice(0, 65)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAddGenerationAsReference(inspectedGen.id)}
                              className="px-2.5 py-1 rounded-xl bg-[#1A1D24] hover:bg-[#242832] border border-white/10 text-[11px] font-semibold text-zinc-200 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3 text-[#46ecd5]" />
                              <span>Use as Ref ({allReferences.length}/50)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExtendShot('forward')}
                              className="px-2.5 py-1 rounded-xl bg-[#1A1D24] hover:bg-[#242832] border border-white/10 text-[11px] font-semibold text-zinc-200 flex items-center gap-1"
                            >
                              <ArrowRight className="w-3 h-3 text-[#46ecd5]" />
                              <span>Extend +5s</span>
                            </button>

                            <a
                              href={inspectedGen.outputs[0].url}
                              download={`spacix-${studioId}-${inspectedGen.id}`}
                              className="px-2.5 py-1 rounded-xl bg-[#46ecd5] text-zinc-950 text-[11px] font-bold flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Favorites or Project Subfolder Drawer when selected from Sidebar */}
                    {(sidebarTab === 'favorites' || sidebarTab === 'project') &&
                      generations.length > 0 && (
                        <div className="max-w-[980px] mx-auto space-y-2.5 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                              {sidebarTab === 'favorites'
                                ? `Saved Favorites (${favoriteGenIds.length})`
                                : `${projectTitle} · Dailies (${generations.length})`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSidebarTab('home')}
                              className="text-[11px] text-zinc-400 hover:text-white"
                            >
                              Close Strip
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {generations
                              .filter((g) =>
                                sidebarTab === 'favorites'
                                  ? favoriteGenIds.includes(g.id)
                                  : activeSubfolder === 'deliverables'
                                  ? deliverableIds.includes(g.id)
                                  : true
                              )
                              .slice(0, 4)
                              .map((gen) => {
                                const out = gen.outputs[0];
                                const isFav = favoriteGenIds.includes(gen.id);
                                return (
                                  <div
                                    key={gen.id}
                                    onClick={() => {
                                      setInspectedGenId(gen.id);
                                      setShowLiveMonitor(true);
                                    }}
                                    className="cursor-pointer rounded-xl overflow-hidden bg-[#14161B] border border-white/10 hover:border-[#46ecd5]"
                                  >
                                    <div className="aspect-video bg-black relative">
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
                                      ) : null}
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
                                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-zinc-300"
                                      >
                                        <Heart
                                          className={`w-3 h-3 ${
                                            isFav ? 'text-pink-400 fill-pink-400' : ''
                                          }`}
                                        />
                                      </button>
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

              {/* ============================================================
                  FLOATING DIRECTOR'S PANEL POPOVER MODALS (ABOVE COMPOSER)
                  Matching Screenshots: Film setup, Camera, Color palette, Lighting
                  ============================================================ */}
              {activePopover && (
                <>
                  <div
                    onClick={() => setActivePopover(null)}
                    className="fixed inset-0 bg-black/70 z-40 sm:hidden"
                  />
                  <div className="fixed inset-x-0 bottom-0 sm:static z-50 p-2 sm:px-8 sm:pb-3 max-w-[1040px] w-full mx-auto max-h-[82vh] overflow-y-auto">
                    {/* 1. FILM SETUP & STUDIO SETUP POPOVER MODAL */}
                    {activePopover === 'film_setup' && (
                      <div className="rounded-3xl bg-[#18191D] border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden">
                        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10">
                          <span className="text-base font-bold text-white">
                            {studioConfig.setupCardLabel}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActivePopover(null);
                                setWorkingMode('production');
                              }}
                              className="px-3 py-1.5 rounded-full bg-[#46ecd5]/15 hover:bg-[#46ecd5]/25 border border-[#46ecd5]/40 text-xs font-bold text-[#46ecd5]"
                            >
                              Open Full {studioConfig.vaultButtonLabel}
                            </button>
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

                        <div className="grid grid-cols-1 sm:grid-cols-12 min-h-[300px] sm:min-h-[340px]">
                          {/* Left Tabs: Studio Controls (when in specialized studio) + Genre, Era, Tempo */}
                          <div className="sm:col-span-3 border-b sm:border-b-0 sm:border-r border-white/10 p-2.5 sm:p-3 flex sm:flex-col gap-1.5 sm:space-y-1 overflow-x-auto">
                            {studioId !== 'cinema' && (
                              <button
                                type="button"
                                onClick={() => setFilmSetupTab('studio')}
                                className={`flex-1 sm:w-full flex items-center justify-between gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
                                  filmSetupTab === 'studio'
                                    ? 'bg-[#25272E] text-[#46ecd5]'
                                    : 'text-zinc-400 hover:text-white'
                                }`}
                              >
                                <span>{studioConfig.shortBadge}</span>
                                <span className="w-2 h-2 rounded-full bg-[#46ecd5]" />
                              </button>
                            )}
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
                                className={`flex-1 sm:w-full flex items-center justify-between gap-2 px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
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
                          <div className="sm:col-span-9 p-4 sm:p-6 flex flex-col justify-between">
                            {filmSetupTab === 'studio' && (
                              <div className="space-y-4 text-xs">
                                {studioId === 'character' && (
                                  <>
                                    <div>
                                      <div className="text-sm font-bold text-white">
                                        Character Identity & Voice Lock
                                      </div>
                                      <div className="text-xs text-zinc-400">
                                        Create a permanent character identity or lock a saved character into the composer
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                      <input
                                        type="text"
                                        value={quickCharName}
                                        onChange={(e) => setQuickCharName(e.target.value)}
                                        placeholder="Character Name (e.g. Kemi)"
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      />
                                      <input
                                        type="text"
                                        value={quickCharRole}
                                        onChange={(e) => setQuickCharRole(e.target.value)}
                                        placeholder="Role (e.g. Lead Detective)"
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      />
                                      <select
                                        value={quickCharLang}
                                        onChange={(e) =>
                                          setQuickCharLang(
                                            e.target.value as SupportedCharacterLanguage
                                          )
                                        }
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      >
                                        {SUPPORTED_LANGUAGES.map((l) => (
                                          <option key={l} value={l}>
                                            Voice: {l}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={quickCharFeatures}
                                        onChange={(e) => setQuickCharFeatures(e.target.value)}
                                        placeholder="Appearance & distinctive features..."
                                        className="flex-1 px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      />
                                      <button
                                        type="button"
                                        onClick={handleQuickSaveCharacter}
                                        className="px-4 py-2 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold shrink-0"
                                      >
                                        + Save & Lock ID
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                      {characters.map((c) => {
                                        const locked = activeContinuity.characterIds.includes(c.id);
                                        return (
                                          <button
                                            key={c.id}
                                            type="button"
                                            onClick={() =>
                                              insertElementToken(`@${c.name.toUpperCase()}`, c.id)
                                            }
                                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                                              locked
                                                ? 'bg-[#46ecd5]/20 border-[#46ecd5] text-[#46ecd5]'
                                                : 'bg-[#22242B] border-white/10 text-zinc-300'
                                            }`}
                                          >
                                            @{c.name} [{c.identityId}]
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}

                                {studioId === 'motion' && (
                                  <>
                                    <div>
                                      <div className="text-sm font-bold text-white">
                                        Motion Transfer & Pose Rig
                                      </div>
                                      <div className="text-xs text-zinc-400">
                                        Transfer reference-video movement onto your locked character
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                      <input
                                        type="text"
                                        value={quickMotionName}
                                        onChange={(e) => setQuickMotionName(e.target.value)}
                                        placeholder="Motion Preset Name"
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      />
                                      <select
                                        value={quickMotionCat}
                                        onChange={(e) =>
                                          setQuickMotionCat(e.target.value as MotionCategory)
                                        }
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      >
                                        {[
                                          'Walking',
                                          'Running',
                                          'Dancing',
                                          'Fighting',
                                          'Gesture & Hand',
                                          'Facial Performance',
                                          'Camera Path',
                                        ].map((cat) => (
                                          <option key={cat} value={cat}>
                                            {cat}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={handleQuickSaveMotion}
                                        className="px-4 py-2 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold"
                                      >
                                        + Save Motion Rig
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {motionTemplates.map((m) => (
                                        <button
                                          key={m.id}
                                          type="button"
                                          onClick={() => {
                                            setActiveContinuity((prev) => ({
                                              ...prev,
                                              motionTemplateId: m.id,
                                            }));
                                            setScenePrompt((prev) =>
                                              `${prev} [MOTION: ${m.name} - ${m.movementCategory}]`.trim()
                                            );
                                          }}
                                          className={`px-3 py-1.5 rounded-xl border text-xs ${
                                            activeContinuity.motionTemplateId === m.id
                                              ? 'bg-[#46ecd5]/20 border-[#46ecd5] text-[#46ecd5]'
                                              : 'bg-[#22242B] border-white/10 text-zinc-300'
                                          }`}
                                        >
                                          {m.name} ({m.movementCategory})
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {studioId === 'wardrobe' && (
                                  <>
                                    <div>
                                      <div className="text-sm font-bold text-white">
                                        Wardrobe & Outfit Continuity
                                      </div>
                                      <div className="text-xs text-zinc-400">
                                        Create and lock character outfits across scenes
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      <input
                                        type="text"
                                        value={quickWardrobeName}
                                        onChange={(e) => setQuickWardrobeName(e.target.value)}
                                        placeholder="Outfit Name (e.g. Royal Indigo Agbada)"
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      />
                                      <select
                                        value={quickWardrobeCat}
                                        onChange={(e) =>
                                          setQuickWardrobeCat(e.target.value as WardrobeCategory)
                                        }
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      >
                                        {[
                                          'Traditional',
                                          'Formal',
                                          'Casual',
                                          'Corporate',
                                          'Futuristic',
                                          'Costume',
                                          'Streetwear',
                                          'Tactical',
                                        ].map((c) => (
                                          <option key={c} value={c}>
                                            {c}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={quickWardrobeGarments}
                                        onChange={(e) => setQuickWardrobeGarments(e.target.value)}
                                        placeholder="Garments, fabrics, footwear & jewellery..."
                                        className="flex-1 px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      />
                                      <button
                                        type="button"
                                        onClick={handleQuickSaveWardrobe}
                                        className="px-4 py-2 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold shrink-0"
                                      >
                                        + Save Outfit
                                      </button>
                                    </div>
                                  </>
                                )}

                                {studioId === 'props' && (
                                  <>
                                    <div>
                                      <div className="text-sm font-bold text-white">
                                        Hero Props & Vehicles Registry
                                      </div>
                                      <div className="text-xs text-zinc-400">
                                        Register a reusable prop with locked finish and scale
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      <input
                                        type="text"
                                        value={quickPropName}
                                        onChange={(e) => setQuickPropName(e.target.value)}
                                        placeholder="Prop Name (e.g. Matte-Black Defender)"
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      />
                                      <select
                                        value={quickPropCat}
                                        onChange={(e) =>
                                          setQuickPropCat(e.target.value as PropCategory)
                                        }
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      >
                                        {[
                                          'Cars & Vehicles',
                                          'Phones & Tech',
                                          'Furniture',
                                          'Weapons & Action',
                                          'Bags & Luggage',
                                          'Hero Artifacts',
                                        ].map((c) => (
                                          <option key={c} value={c}>
                                            {c}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={quickPropFinish}
                                        onChange={(e) => setQuickPropFinish(e.target.value)}
                                        placeholder="Material & finish..."
                                        className="flex-1 px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      />
                                      <button
                                        type="button"
                                        onClick={handleQuickSaveProp}
                                        className="px-4 py-2 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold shrink-0"
                                      >
                                        + Save Prop
                                      </button>
                                    </div>
                                  </>
                                )}

                                {studioId === 'location' && (
                                  <>
                                    <div>
                                      <div className="text-sm font-bold text-white">
                                        Filming Location & Environment Lock
                                      </div>
                                      <div className="text-xs text-zinc-400">
                                        Register an INT./EXT. filming location with locked weather & time of day
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                      <select
                                        value={quickLocSetting}
                                        onChange={(e) =>
                                          setQuickLocSetting(
                                            e.target.value as 'INT.' | 'EXT.' | 'INT./EXT.'
                                          )
                                        }
                                        className="px-2.5 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      >
                                        <option value="EXT.">EXT.</option>
                                        <option value="INT.">INT.</option>
                                        <option value="INT./EXT.">INT./EXT.</option>
                                      </select>
                                      <input
                                        type="text"
                                        value={quickLocName}
                                        onChange={(e) => setQuickLocName(e.target.value)}
                                        placeholder="Location Name"
                                        className="sm:col-span-2 px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      />
                                      <select
                                        value={quickLocCat}
                                        onChange={(e) =>
                                          setQuickLocCat(e.target.value as LocationCategory)
                                        }
                                        className="px-2.5 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      >
                                        {[
                                          'Cities',
                                          'Houses',
                                          'Offices',
                                          'Streets',
                                          'Villages',
                                          'Landscapes',
                                          'Studios & Sets',
                                        ].map((c) => (
                                          <option key={c} value={c}>
                                            {c}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={quickLocTime}
                                        onChange={(e) =>
                                          setQuickLocTime(
                                            e.target.value as LocationItem['timeOfDay']
                                          )
                                        }
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      >
                                        {[
                                          'Night',
                                          'Day',
                                          'Golden Hour',
                                          'Sunset',
                                          'Dawn',
                                          'Blue Hour',
                                        ].map((t) => (
                                          <option key={t} value={t}>
                                            {t}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        value={quickLocWeather}
                                        onChange={(e) =>
                                          setQuickLocWeather(
                                            e.target.value as LocationItem['weather']
                                          )
                                        }
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      >
                                        {[
                                          'Rain',
                                          'Clear',
                                          'Fog',
                                          'Harmattan Dust',
                                          'Overcast',
                                          'Storm',
                                        ].map((w) => (
                                          <option key={w} value={w}>
                                            {w}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={handleQuickSaveLocation}
                                        className="px-4 py-2 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold ml-auto"
                                      >
                                        + Save Set
                                      </button>
                                    </div>
                                  </>
                                )}

                                {studioId === 'lipsync' && (
                                  <>
                                    <div>
                                      <div className="text-sm font-bold text-white">
                                        Multilingual Lip-Sync & Voice Performance
                                      </div>
                                      <div className="text-xs text-zinc-400">
                                        Synchronize spoken dialogue with your locked character identity
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      <select
                                        value={quickLipSyncLang}
                                        onChange={(e) =>
                                          setQuickLipSyncLang(
                                            e.target.value as SupportedCharacterLanguage
                                          )
                                        }
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      >
                                        {SUPPORTED_LANGUAGES.map((l) => (
                                          <option key={l} value={l}>
                                            Language: {l}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        value={selectedEmotion}
                                        onChange={(e) => setSelectedEmotion(e.target.value)}
                                        className="px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      >
                                        {EMOTION_DIRECTIONS.map((em) => (
                                          <option key={em} value={em}>
                                            Expression: {em}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <textarea
                                      rows={2}
                                      value={quickLipSyncLine}
                                      onChange={(e) => setQuickLipSyncLine(e.target.value)}
                                      placeholder="Enter spoken dialogue line to lip-sync..."
                                      className="w-full px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                    />
                                  </>
                                )}

                                {studioId === 'effects' && (
                                  <>
                                    <div>
                                      <div className="text-sm font-bold text-white">
                                        Camera Rigs & Visual Effects Presets
                                      </div>
                                      <div className="text-xs text-zinc-400">
                                        Click any VFX preset to load its optical template into the composer
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto">
                                      {presets.map((p) => (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => {
                                            setScenePrompt(p.promptTemplate);
                                            setDockSurface(
                                              p.surface === 'image' ? 'image' : 'video'
                                            );
                                            showToast(`Loaded "${p.title}" into composer`);
                                          }}
                                          className="p-2.5 rounded-xl bg-[#22242B] hover:bg-[#2C2F38] border border-white/10 text-left space-y-1"
                                        >
                                          <div className="font-bold text-white truncate">
                                            {p.title}
                                          </div>
                                          <div className="text-[10px] text-[#46ecd5]">
                                            {p.category}
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}

                                {(studioId === 'marketing' ||
                                  studioId === 'storyboard' ||
                                  studioId === 'canvas' ||
                                  studioId === 'editing') && (
                                  <div className="space-y-3">
                                    <div>
                                      <div className="text-sm font-bold text-white">
                                        {studioConfig.title} Quick Configuration
                                      </div>
                                      <div className="text-xs text-zinc-400">
                                        Configure format and continuity assets or open the full {studioConfig.vaultButtonLabel}
                                      </div>
                                    </div>
                                    {studioId === 'marketing' && (
                                      <select
                                        value={quickMarketingFormat}
                                        onChange={(e) => {
                                          setQuickMarketingFormat(e.target.value);
                                          if (e.target.value.includes('9:16')) {
                                            setAspectRatio('9:16');
                                          } else {
                                            setAspectRatio('16:9');
                                          }
                                        }}
                                        className="w-full px-3 py-2 rounded-xl bg-[#22242B] border border-white/10 text-white"
                                      >
                                        <option value="UGC Creator Review (9:16)">
                                          UGC Creator Review (9:16 Vertical)
                                        </option>
                                        <option value="Hero Product Commercial (16:9)">
                                          Hero Product Commercial (16:9 Widescreen)
                                        </option>
                                        <option value="Social Brand Hook (9:16)">
                                          Social Brand Hook (9:16 Vertical)
                                        </option>
                                      </select>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActivePopover(null);
                                        setWorkingMode('production');
                                      }}
                                      className="px-4 py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold inline-flex items-center gap-2"
                                    >
                                      <Layers className="w-4 h-4" />
                                      <span>Launch Full {studioConfig.vaultButtonLabel}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {filmSetupTab === 'genre' && (
                              <>
                                <div>
                                  <div className="text-sm font-bold text-white">Select genre</div>
                                  <div className="text-xs text-zinc-400">
                                    Story conventions the model should follow
                                  </div>
                                </div>

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

                                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                                      {ERA_PRESETS.map((era) => {
                                        const active = filmSetup.era === era.id;
                                        return (
                                          <button
                                            key={era.id}
                                            type="button"
                                            onClick={() =>
                                              setFilmSetup((prev) => ({ ...prev, era: era.id }))
                                            }
                                            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                              active
                                                ? 'text-lime-400 text-sm sm:text-base scale-110'
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
                          <span className="text-base font-bold text-white">
                            {studioConfig.cameraCardLabel}
                          </span>
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

                        <div className="grid grid-cols-1 sm:grid-cols-12 min-h-[300px] sm:min-h-[360px]">
                          <div className="sm:col-span-3 border-b sm:border-b-0 sm:border-r border-white/10 p-2.5 sm:p-3 flex sm:flex-col gap-1.5 sm:space-y-1">
                            <button
                              type="button"
                              onClick={() => setCameraModalTab('setup')}
                              className={`flex-1 sm:w-full flex items-center justify-between px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
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
                              className={`flex-1 sm:w-full flex items-center justify-between px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${
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

                          <div className="sm:col-span-9 p-3.5 sm:p-5">
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

                                  <div className="w-full px-2.5 space-y-2">
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
                                          className={`w-full py-2 px-3 rounded-2xl transition-all flex items-center gap-2.5 text-left ${
                                            active
                                              ? 'bg-[#2A2D35] border-2 border-white text-white shadow-lg scale-[1.03]'
                                              : 'bg-[#1D1F25] border border-white/5 text-zinc-400 hover:text-zinc-200 opacity-80 hover:opacity-100'
                                          }`}
                                        >
                                          <GearVisual
                                            spec={getCameraBodyVisual(cam.id)}
                                            size="md"
                                            className="shrink-0"
                                          />
                                          <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold truncate">{cam.label}</div>
                                            <div className="text-[10px] opacity-75 truncate">{cam.sub}</div>
                                          </div>
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

                                  <div className="w-full px-2.5 space-y-2">
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
                                          className={`w-full py-2 px-3 rounded-2xl transition-all flex items-center gap-2.5 text-left ${
                                            active
                                              ? 'bg-[#2A2D35] border-2 border-white text-white shadow-lg scale-[1.03]'
                                              : 'bg-[#1D1F25] border border-white/5 text-zinc-400 hover:text-zinc-200 opacity-80 hover:opacity-100'
                                          }`}
                                        >
                                          <GearVisual
                                            spec={getLensOpticVisual(lens.id)}
                                            size="md"
                                            className="shrink-0"
                                          />
                                          <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold truncate">{lens.label}</div>
                                            <div className="text-[10px] opacity-75 truncate">{lens.sub}</div>
                                          </div>
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

                                  <div className="w-full px-2.5 space-y-2">
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
                                          className={`w-full py-2 px-3 rounded-2xl transition-all flex items-center gap-2.5 text-left ${
                                            active
                                              ? 'bg-[#2A2D35] border-2 border-white text-white shadow-lg scale-[1.03]'
                                              : 'bg-[#1D1F25] border border-white/5 text-zinc-400 hover:text-zinc-200 opacity-80 hover:opacity-100'
                                          }`}
                                        >
                                          <GearVisual
                                            spec={getApertureVisual(ap.id)}
                                            size="sm"
                                            className="shrink-0"
                                          />
                                          <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold truncate">{ap.label}</div>
                                            <div className="text-[10px] opacity-75 truncate">{ap.sub}</div>
                                          </div>
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
                                          } border transition-all p-2.5 flex flex-col justify-between relative overflow-hidden ${
                                            isSelected
                                              ? 'border-lime-400 ring-2 ring-lime-400/30'
                                              : 'border-white/10 group-hover:border-white/30'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between relative z-10">
                                            <span className="px-1.5 py-0.5 rounded bg-black/55 text-[10px] font-mono text-lime-300">
                                              #{move.label.replace(/\s+/g, '')}
                                            </span>
                                            {isSelected && (
                                              <span className="w-5 h-5 rounded-full bg-lime-400 text-zinc-950 text-[10px] font-extrabold flex items-center justify-center">
                                                {orderIdx + 1}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center justify-center py-0.5">
                                            <GearVisual
                                              spec={getCameraMovementVisual(move.label)}
                                              size="lg"
                                              className="group-hover:scale-110 transition-transform"
                                            />
                                          </div>
                                          <div className="text-[10px] text-zinc-200 text-left line-clamp-1 relative z-10">
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

                    {/* 3. COLOR PALETTE POPOVER MODAL */}
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
                                      className={`h-24 bg-gradient-to-br ${pal.previewGradient} p-2 flex items-center gap-2 text-left`}
                                    >
                                      <GearVisual
                                        spec={getColorGradeVisual(pal.name)}
                                        size="lg"
                                        className="group-hover:scale-110 transition-transform"
                                      />
                                      <span className="text-[10px] text-zinc-200 line-clamp-3 drop-shadow">
                                        {pal.description}
                                      </span>
                                    </div>
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

                    {/* 4. LIGHTING POPOVER MODAL */}
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

                    {/* 6. INTELLIGENT CAPABILITY-ROUTED MODEL SELECTOR POPOVER */}
                    {activePopover === 'models' && (
                      <div className="rounded-3xl bg-[#18191D] border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.9)] p-5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                          <div>
                            <div className="text-sm font-bold text-white">
                              Compatible Models for {activeToolSpec.label} (
                              {dockSurface.toUpperCase()})
                            </div>
                            <div className="text-xs text-zinc-400">
                              Automatically filtered so {dockSurface} tasks only route to verified{' '}
                              {dockSurface}-capable engines
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
                          {compatibleModels.map((m) => {
                            const isSel = activeModel?.id === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  if (m.surface === 'video') setSelectedVideoModelId(m.id);
                                  else if (m.surface === 'audio') setSelectedAudioModelId(m.id);
                                  else setSelectedImageModelId(m.id);
                                  setDockSurface(m.surface);
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
                                    {calculateTokenCost(m.id, {
                                      resolution,
                                      ...(m.surface !== 'image'
                                        ? { duration: durationSec }
                                        : {}),
                                    })}{' '}
                                    TK
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
                </>
              )}

              {/* ============================================================
                  UNIVERSAL FLOATING GENERATION COMPOSER (BOTTOM CENTRE)
                  Dynamic surface & model-capability routing across Image, Video & Audio
                  ============================================================ */}
              <div className="px-2 sm:px-8 pb-3 sm:pb-6 pt-2 max-w-[1040px] w-full mx-auto sticky bottom-0 z-20">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-2.5">
                  {/* Left Vertical Image / Video / Audio Mode Selector Pill */}
                  <div className="rounded-2xl sm:rounded-3xl bg-[#15161A] border border-white/10 p-1 sm:p-1.5 flex flex-row sm:flex-col justify-center sm:justify-between gap-1 shrink-0 shadow-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setDockSurface('image');
                        if (activeToolSpec.targetSurface !== 'image') {
                          setActiveToolId('image_creation');
                        }
                      }}
                      className={`flex-1 sm:flex-initial px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl flex flex-row sm:flex-col items-center justify-center gap-1.5 sm:gap-1 text-[11px] font-bold transition-all ${
                        dockSurface === 'image'
                          ? 'bg-[#25272F] text-white shadow'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDockSurface('video');
                        if (activeToolSpec.targetSurface !== 'video') {
                          setActiveToolId('video_creation');
                        }
                      }}
                      className={`flex-1 sm:flex-initial px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl flex flex-row sm:flex-col items-center justify-center gap-1.5 sm:gap-1 text-[11px] font-bold transition-all ${
                        dockSurface === 'video'
                          ? 'bg-[#25272F] text-white shadow'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      <span>Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDockSurface('audio');
                        if (activeToolSpec.targetSurface !== 'audio') {
                          setActiveToolId('voice_creation');
                          setActiveCategory('media_generation');
                        }
                      }}
                      className={`flex-1 sm:flex-initial px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl flex flex-row sm:flex-col items-center justify-center gap-1.5 sm:gap-1 text-[11px] font-bold transition-all ${
                        dockSurface === 'audio'
                          ? 'bg-[#25272F] text-[#46ecd5] shadow'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      <span>Audio</span>
                    </button>
                  </div>

                  {/* Universal Floating Composer Box with Magic UI BorderBeam */}
                  <div className="relative flex-1 min-w-0 rounded-2xl sm:rounded-3xl bg-[#15161A] border border-white/12 p-2.5 sm:p-3.5 space-y-2.5 sm:space-y-3 shadow-[0_24px_70px_rgba(0,0,0,0.9)] overflow-hidden">
                    <BorderBeam />
                    {/* Compact Top Control Row: References, Film Setup, Camera, Color Palette, Lighting */}
                    <div className="flex overflow-x-auto no-scrollbar sm:grid sm:grid-cols-5 gap-2 pb-0.5 sm:pb-0">
                      {/* 1. References 0/50 */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover(
                            activePopover === 'references' ? null : 'references'
                          )
                        }
                        className={`min-w-[128px] sm:min-w-0 shrink-0 p-2 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                          activePopover === 'references'
                            ? 'bg-[#24272F] border-white/25'
                            : 'bg-[#1D1F25] border-white/[0.06] hover:border-white/15'
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

                      {/* 2. Film setup / Studio setup */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePopover(
                            activePopover === 'film_setup' ? null : 'film_setup'
                          )
                        }
                        className={`min-w-[128px] sm:min-w-0 shrink-0 p-2 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                          activePopover === 'film_setup'
                            ? 'bg-[#24272F] border-white/25'
                            : 'bg-[#1D1F25] border-white/[0.06] hover:border-white/15'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-stone-300/40 via-stone-500/30 to-zinc-800 border border-white/15 flex items-center justify-center shrink-0">
                          <Film className="w-4 h-4 text-zinc-100" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-400 truncate">
                            Film setup
                          </div>
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
                        className={`min-w-[128px] sm:min-w-0 shrink-0 p-2 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                          activePopover === 'camera'
                            ? 'bg-[#24272F] border-white/25'
                            : 'bg-[#1D1F25] border-white/[0.06] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center -space-x-2 shrink-0">
                          <GearVisual
                            spec={getCameraBodyVisual(cameraOptics.camera)}
                            size="sm"
                          />
                          <GearVisual
                            spec={getLensOpticVisual(cameraOptics.lens)}
                            size="xs"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] text-zinc-400 truncate">
                            Camera · Optics
                          </div>
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
                        className={`min-w-[128px] sm:min-w-0 shrink-0 p-2 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                          activePopover === 'color_palette'
                            ? 'bg-[#24272F] border-white/25'
                            : 'bg-[#1D1F25] border-white/[0.06] hover:border-white/15'
                        }`}
                      >
                        <GearVisual
                          spec={getColorGradeVisual(activePalette.name)}
                          size="sm"
                        />
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
                        className={`min-w-[128px] sm:min-w-0 shrink-0 p-2 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                          activePopover === 'lighting'
                            ? 'bg-[#24272F] border-white/25'
                            : 'bg-[#1D1F25] border-white/[0.06] hover:border-white/15'
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

                    {/* Large Prompt Input Area */}
                    <div className="relative pt-0.5">
                      <textarea
                        rows={2}
                        value={scenePrompt}
                        onChange={(e) => setScenePrompt(e.target.value)}
                        placeholder={activeToolSpec.promptPlaceholder}
                        className="w-full bg-transparent text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none resize-none px-1.5"
                      />
                    </div>

                    {/* Bottom Toolbar inside Composer (Contextually Adapts to Image / Video / Audio Tool) */}
                    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* + Upload Reference */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => refUploadInputRef.current?.click()}
                              className="w-7 h-7 rounded-full bg-[#22242B] hover:bg-[#2C2F37] text-zinc-300 flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Upload Reference Photo or Video</TooltipContent>
                        </Tooltip>

                        {/* @ Add Character / Location Element */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() =>
                                setActivePopover(
                                  activePopover === 'at_elements' ? null : 'at_elements'
                                )
                              }
                              className="w-7 h-7 rounded-full bg-[#22242B] hover:bg-[#2C2F37] text-zinc-300 font-mono text-xs font-bold flex items-center justify-center transition-colors"
                            >
                              @
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Insert @Character, @Location or Prop</TooltipContent>
                        </Tooltip>

                        {/* [⚃] Quick Element / Film Setup Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() =>
                                setActivePopover(
                                  activePopover === 'film_setup' ? null : 'film_setup'
                                )
                              }
                              className="w-7 h-7 rounded-full bg-[#22242B] hover:bg-[#2C2F37] text-zinc-300 flex items-center justify-center transition-colors"
                            >
                              <Maximize2 className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Open Film & Continuity Setup</TooltipContent>
                        </Tooltip>

                        {/* Capability-Routed Model Selector Pill */}
                        <button
                          type="button"
                          onClick={() =>
                            setActivePopover(activePopover === 'models' ? null : 'models')
                          }
                          className="px-3 py-1.5 rounded-full bg-[#22242B] hover:bg-[#2B2E37] border border-white/5 text-[11px] font-bold text-white flex items-center gap-1.5"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-[#46ecd5] shrink-0" />
                          <span>{activeModel?.label || 'Cinema Studio 4.0'}</span>
                          <ChevronRight className="w-3 h-3 text-zinc-400" />
                        </button>

                        {/* Contextual Settings: Show Resolution & Aspect Ratio only for Image & Video */}
                        {dockSurface !== 'audio' && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setResolution((prev) =>
                                  prev === '1080p' ? '2K' : prev === '2K' ? '4K' : '1080p'
                                )
                              }
                              className="px-2.5 py-1.5 rounded-full bg-[#22242B] hover:bg-[#2B2E37] text-[11px] font-semibold text-zinc-200 flex items-center gap-1"
                            >
                              <Diamond className="w-3 h-3 text-zinc-400" />
                              <span>{resolution}</span>
                            </button>

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
                              className="px-2.5 py-1.5 rounded-full bg-[#22242B] hover:bg-[#2B2E37] text-[11px] font-semibold text-zinc-200 flex items-center gap-1"
                            >
                              <RectangleHorizontal className="w-3 h-3 text-zinc-400" />
                              <span>{aspectRatio}</span>
                            </button>
                          </>
                        )}

                        {/* Contextual Settings: Duration & Audio Toggle for Video */}
                        {dockSurface === 'video' && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setDurationSec((prev) => (prev === 5 ? 8 : prev === 8 ? 10 : 5))
                              }
                              className="px-2.5 py-1.5 rounded-full bg-[#22242B] hover:bg-[#2B2E37] text-[11px] font-semibold text-zinc-200 flex items-center gap-1"
                            >
                              <Clock className="w-3 h-3 text-zinc-400" />
                              <span>{durationSec}s</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSoundEnabled((v) => !v)}
                              className="px-2.5 py-1.5 rounded-full bg-[#22242B] hover:bg-[#2B2E37] text-[11px] font-semibold text-zinc-200 flex items-center gap-1"
                            >
                              {soundEnabled ? (
                                <Volume2 className="w-3 h-3 text-zinc-300" />
                              ) : (
                                <VolumeX className="w-3 h-3 text-zinc-500" />
                              )}
                              <span>{soundEnabled ? 'On' : 'Off'}</span>
                            </button>
                          </>
                        )}

                        {/* Contextual Settings: Voice Persona (Radix Select) & Audio Duration for Audio / Voice / Music */}
                        {dockSurface === 'audio' && (
                          <>
                            {activeToolId !== 'music_sfx' && (
                              <Select value={voicePersona} onValueChange={(v) => setVoicePersona(v)}>
                                <SelectTrigger className="h-7 w-40 rounded-full bg-[#22242B] border-white/5 text-[11px] px-2.5 py-1">
                                  <SelectValue placeholder="Voice Persona" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="noir_narrator">Voice: Noir Narrator</SelectItem>
                                  <SelectItem value="warm_heroine">Voice: Warm Heroine</SelectItem>
                                  <SelectItem value="trailer_baritone">Voice: Trailer Baritone</SelectItem>
                                  <SelectItem value="documentary_clear">Voice: Documentary</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setDurationSec((prev) => (prev === 5 ? 10 : prev === 10 ? 30 : 5))
                              }
                              className="px-2.5 py-1.5 rounded-full bg-[#22242B] hover:bg-[#2B2E37] text-[11px] font-semibold text-zinc-200 flex items-center gap-1"
                            >
                              <Clock className="w-3 h-3 text-zinc-400" />
                              <span>{durationSec}s</span>
                            </button>
                          </>
                        )}

                        {/* Output Quantity Stepper ("- 1/4 +") */}
                        <div className="px-2.5 py-1.5 rounded-full bg-[#22242B] text-[11px] font-mono-tabular text-zinc-200 flex items-center gap-2">
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

                      {/* Cyan Magic UI ShimmerButton GENERATE - {cost}TK */}
                      <ShimmerButton
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleGenerateShot()}
                        className="w-full sm:w-auto justify-center shrink-0"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>GENERATING...</span>
                          </>
                        ) : (
                          <span>GENERATE - {estimatedCredits}TK</span>
                        )}
                      </ShimmerButton>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>

        {/* ================================================================
            3. AI DIRECTOR RIGHT DRAWER (SCREENPLAY-TO-SHOT BREAKDOWN)
            ================================================================ */}
        <AnimatePresence>
          {aiDirectorOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAiDirectorOpen(false)}
                className="fixed inset-0 bg-black/75 z-40 xl:hidden"
              />
              <motion.aside
                initial={{ x: 24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 24, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed xl:static inset-y-0 right-0 w-full max-w-md xl:w-96 shrink-0 bg-[#121317] border-l border-white/10 p-4 flex flex-col justify-between overflow-y-auto z-50 xl:z-20 space-y-4 shadow-2xl"
              >
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setAiDirectorOpen(false)}
                      className="h-7 w-7 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <label className="block text-zinc-300 font-semibold">
                      Scene Description or Screenplay Beat
                    </label>
                    <Textarea
                      rows={3}
                      value={aiDirectorInput}
                      onChange={(e) => setAiDirectorInput(e.target.value)}
                      placeholder="e.g. A king enters his palace and discovers that his throne room is empty..."
                    />
                    <ShimmerButton
                      type="button"
                      disabled={aiDirectorBusy}
                      onClick={handleRunAIDirectorBreakdown}
                      className="w-full justify-center rounded-xl py-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {aiDirectorBusy
                          ? 'Breaking Scene into Shots...'
                          : 'Break Scene into Directed Shot List'}
                      </span>
                    </ShimmerButton>
                  </div>

                  <div className="space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Suggested Shot Coverage ({aiShotList.length} Shots)
                    </div>
                    {aiShotList.map((shot) => (
                      <SpotlightCard
                        key={shot.shotNumber}
                        className="p-3 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tabular font-bold text-[#46ecd5] flex items-center gap-1.5">
                            <GearVisual spec={getCameraAngleVisual(shot.camera)} size="xs" />
                            <span>
                              SHOT {shot.shotNumber} · {shot.camera}
                            </span>
                          </span>
                          <Badge variant="outline" className="gap-1">
                            <GearVisual spec={getCameraMovementVisual(shot.movement)} size="xs" />
                            <span>#{shot.movement}</span>
                          </Badge>
                        </div>
                        <p className="text-zinc-200 text-[11px] leading-relaxed">
                          {shot.action}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-zinc-400">
                            Light: {shot.lighting} · {shot.emotion}
                          </span>
                          <Button
                            type="button"
                            variant="accent"
                            size="xs"
                            onClick={() => {
                              applyAIShotToDirectorPanel(shot);
                              if (window.innerWidth < 1280) setAiDirectorOpen(false);
                            }}
                          >
                            Load into Composer
                          </Button>
                        </div>
                      </SpotlightCard>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 text-[11px] text-zinc-400">
                  Need the full {studioConfig.vaultButtonLabel}?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAiDirectorOpen(false);
                      setWorkingMode('production');
                    }}
                    className="text-[#46ecd5] font-bold hover:underline"
                  >
                    Open {studioConfig.vaultButtonLabel} →
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ================================================================
            4. CMDK COMMAND PALETTE DIALOG (⌘K) — TOOLS, MODES & ENGINES
            ================================================================ */}
        <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
          <CommandInput placeholder="Search Cinema Studio tools, workflows, or engines (⌘K)..." />
          <CommandList>
            <CommandEmpty>No matching Cinema Studio tools or engines found.</CommandEmpty>
            <CommandGroup heading="Workflows & Studio Modes">
              <CommandItem
                onSelect={() => {
                  setWorkingMode('music_video');
                  setCommandPaletteOpen(false);
                }}
              >
                <Music className="w-4 h-4 text-[#46ecd5]" />
                <span>Music Video Production Studio (Lip Sync & B-Roll)</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setWorkingMode('auto_production');
                  setCommandPaletteOpen(false);
                }}
              >
                <Sparkles className="w-4 h-4 text-[#46ecd5]" />
                <span>Automatic Production (4-Stage Film Pipeline)</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setWorkingMode('director');
                  setCommandPaletteOpen(false);
                }}
              >
                <Clapperboard className="w-4 h-4 text-[#46ecd5]" />
                <span>Cinema Studio Director Workspace</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setWorkingMode('production');
                  setCommandPaletteOpen(false);
                }}
              >
                <Layers className="w-4 h-4 text-[#46ecd5]" />
                <span>Multi-Track Timeline & Vault</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            {CINEMA_TOOL_CATEGORIES.map((cat) => (
              <CommandGroup key={cat.id} heading={cat.label}>
                {CINEMA_TOOL_LIST.filter((t) => t.category === cat.id).map((tool) => (
                  <CommandItem
                    key={tool.id}
                    onSelect={() => {
                      handleSelectCinemaTool(tool.id);
                      setCommandPaletteOpen(false);
                      toast.success(`Activated ${tool.label}`);
                    }}
                  >
                    <Wand2 className="w-3.5 h-3.5 text-[#46ecd5]" />
                    <div className="flex-1 flex items-center justify-between">
                      <span>{tool.label}</span>
                      <span className="text-[10px] font-mono uppercase text-zinc-500">
                        {tool.targetSurface}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </CommandDialog>
      </div>
    </div>
  );
};
