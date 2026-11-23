import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Film,
  Mic,
  Move,
  Palette,
  RotateCcw,
  Sliders,
  Sun,
  X,
} from 'lucide-react';
import type {
  ModelEntry,
  Surface,
  UniversalCreativeControlsState,
} from '../types/studio';
import { useRuns } from '../lib/useRuns';
import { DEFAULT_CREATIVE_CONTROLS } from '../lib/creativeControlsTranslator';
import { GearVisual } from './GearVisual';
import {
  getApertureVisual,
  getCameraAngleVisual,
  getCameraBodyVisual,
  getCameraMovementVisual,
  getColorGradeVisual,
  getLensOpticVisual,
} from '../catalog/cinemaGearVisuals';

export interface UniversalCreativeControlsBarProps {
  surface: Surface;
  activeModel?: ModelEntry;
  value?: UniversalCreativeControlsState;
  onChange?: (next: UniversalCreativeControlsState) => void;
  compact?: boolean;
  contextLabel?: string;
}

type CreativeTabId =
  | 'camera'
  | 'movement'
  | 'lighting'
  | 'color'
  | 'film'
  | 'audio';

const CAMERA_BODY_OPTIONS = [
  { id: 'Auto', label: 'Auto', sub: 'Optimal cinema sensor' },
  { id: 'Modern Digital', label: 'Modern Digital', sub: 'ARRI Alexa 65 Large Format' },
  { id: 'RED V-Raptor', label: 'RED V-Raptor 8K', sub: 'VV Global Shutter Cinema' },
  { id: 'Sony VENICE', label: 'Sony VENICE 2', sub: 'Full-Frame Dual Base ISO' },
  { id: '35mm Film', label: '35mm Film', sub: 'Panavision Kodak Vision3' },
  { id: '16mm Film', label: '16mm Film', sub: 'Super 16 Arriflex 416' },
  { id: '16mm Bolex', label: '16mm Bolex', sub: 'Hand-wound celluloid grain' },
  { id: 'IMAX 70mm', label: 'IMAX 70mm', sub: '15-perf 65mm monumental' },
  { id: 'Vintage Film', label: 'Vintage Film', sub: '1970s 35mm Eastmancolor' },
  { id: 'DV Camcorder', label: 'DV Camcorder', sub: 'MiniDV CCD texture' },
];

const LENS_OPTIONS = [
  { id: 'Auto', label: 'Auto', sub: 'Matched optical character' },
  { id: 'Standard Prime', label: 'Standard Prime', sub: '50mm signature balance' },
  { id: 'Wide Angle', label: 'Wide Angle', sub: '24mm spatial prime' },
  { id: 'Ultra Wide', label: 'Ultra Wide', sub: '14mm expansive sweep' },
  { id: 'Anamorphic', label: 'Anamorphic', sub: 'Panavision C-Series 2x' },
  { id: 'Telephoto', label: 'Telephoto', sub: '85mm compression' },
  { id: 'Macro', label: 'Macro', sub: '100mm micro probe' },
  { id: 'Portrait Lens', label: 'Portrait Lens', sub: '105mm facial isolation' },
  { id: 'Vintage Lens', label: 'Vintage Lens', sub: 'Cooke Panchro classic' },
  { id: 'Warm Vintage', label: 'Warm Vintage', sub: 'Amber spherical bloom' },
  { id: 'Halation Vintage', label: 'Halation Vintage', sub: 'Canon K35 soft glow' },
];

const APERTURE_OPTIONS = [
  { id: 'Auto', label: 'Auto', sub: 'Balanced depth of field' },
  { id: 'f/1.4 Wide Open', label: 'f/1.4 Wide Open', sub: 'Creamy shallow bokeh' },
  { id: 'f/1.8', label: 'f/1.8', sub: 'Fast portrait separation' },
  { id: 'f/2', label: 'f/2.0', sub: 'Subject pop' },
  { id: 'f/2.8', label: 'f/2.8 Cinematic', sub: 'Classic narrative T2.8' },
  { id: 'f/4 Moderate', label: 'f/4.0 Moderate', sub: 'Balanced depth falloff' },
  { id: 'f/5.6', label: 'f/5.6', sub: 'Environmental clarity' },
  { id: 'f/8', label: 'f/8.0', sub: 'Crisp architectural plane' },
  { id: 'f/11 Deep Focus', label: 'f/11 Deep Focus', sub: 'Fore & background sharp' },
];

const SHOT_ANGLES = [
  { id: 'Auto', label: 'Auto Framing' },
  { id: 'Extreme Wide', label: 'Extreme Wide' },
  { id: 'Wide Shot', label: 'Wide Shot' },
  { id: 'Medium Shot', label: 'Medium Shot' },
  { id: 'Close-Up', label: 'Close-Up' },
  { id: 'Low Angle', label: 'Low Angle' },
  { id: 'High Overhead', label: 'High Overhead' },
  { id: 'Dutch Tilt', label: 'Dutch Tilt' },
  { id: 'POV', label: 'First-Person POV' },
];

const MOVEMENT_OPTIONS = [
  { id: 'Static Locked', label: 'Static Locked', desc: 'Fluid-head tripod lock' },
  { id: 'Dolly In', label: 'Dolly In', desc: 'Smooth push toward subject' },
  { id: 'Dolly Out', label: 'Dolly Out', desc: 'Pull-back spatial reveal' },
  { id: 'Tracking Shot', label: 'Tracking Shot', desc: 'Steadicam follow beside hero' },
  { id: 'Pan Left', label: 'Pan Left', desc: 'Horizontal whip or sweep' },
  { id: 'Tilt Up', label: 'Tilt Up', desc: 'Vertical upward reveal' },
  { id: 'Crane Up', label: 'Crane / Jib Up', desc: 'Elevated sweeping ascent' },
  { id: 'Orbit 360', label: 'Orbit 360', desc: 'Motorized gimbal wrap' },
  { id: 'Handheld', label: 'Handheld Verite', desc: 'Kinetic organic urgency' },
  { id: 'Snorricam', label: 'Snorricam', desc: 'Body-rigged face lock' },
  { id: 'Rack Focus', label: 'Rack Focus', desc: 'Focal plane shift' },
];

const LIGHTING_OPTIONS = [
  { id: 'Auto', label: 'Auto', desc: 'Scene-adaptive cinema exposure' },
  { id: 'Golden Hour', label: 'Golden Hour', desc: 'Warm low-angle sunlit rim' },
  { id: 'Window Light', label: 'Soft Window', desc: 'Diffused directional daylight' },
  { id: 'Practicals', label: 'Motivated Practicals', desc: 'Tungsten lamps & neon sources' },
  { id: 'Silhouette', label: 'Backlit Silhouette', desc: 'Strong rim outline vs shadow' },
  { id: 'Chiaroscuro Noir', label: 'Chiaroscuro Noir', desc: 'High-contrast sculpted shadow' },
  { id: 'Neon Cyber Rim', label: 'Neon Rim', desc: 'Cyan/magenta edge separation' },
  { id: 'Overcast Soft', label: 'Overcast Softbox', desc: 'Even diffused exterior skin' },
];

const COLOR_PRESETS = [
  {
    id: 'Auto',
    name: 'Auto',
    desc: 'Natural neutral cinema color science',
    swatches: ['#18181b', '#3f3f46', '#71717a', '#d4d4d8'],
  },
  {
    id: 'Twilight Fable',
    name: 'Twilight Fable',
    desc: 'Deep cyan-teal shadows with golden highlights',
    swatches: ['#0f2933', '#24525e', '#b89648', '#dfc178'],
  },
  {
    id: 'Kodak 2383',
    name: 'Kodak 2383 Print',
    desc: 'Classic theatrical print blacks & warm skin tones',
    swatches: ['#121010', '#4f3327', '#c7884b', '#f2dbb7'],
  },
  {
    id: 'Static Noon',
    name: 'Static Noon',
    desc: 'High-contrast monochrome silver gelatin with olive tint',
    swatches: ['#111315', '#4b5249', '#9ca68f', '#f4f5f0'],
  },
  {
    id: 'Back Row Kissing Seats',
    name: 'Back Row Kissing Seats',
    desc: 'Saturated neon crimson & electric cobalt theater glow',
    swatches: ['#3b0a0a', '#dc2626', '#1d4ed8', '#a3e635'],
  },
  {
    id: 'On the Other Side of the Port',
    name: 'Portra Coastal',
    desc: 'Maritime slate blues with warm terracotta highlights',
    swatches: ['#141619', '#3b4d71', '#b91c1c', '#d4c5b9'],
  },
  {
    id: 'The Emerald Ambush',
    name: 'Emerald Canopy',
    desc: 'Lush rainforest greens & diffused moss shadows',
    swatches: ['#0a1910', '#274e35', '#659970', '#a3c9a8'],
  },
  {
    id: 'Highway Standoff',
    name: 'Highway Standoff',
    desc: 'Sun-baked desert ochre & western sky contrast',
    swatches: ['#1c1610', '#6e5534', '#c9a96e', '#1e3a8a'],
  },
];

const GENRE_OPTIONS = ['General', 'Drama', 'Action', 'Sci-Fi Noir', 'Thriller', 'Horror', 'Epic', 'Music Video', 'Documentary'];
const ERA_OPTIONS = ['Auto', '1920s', '1960s', '1970s', '1980s', '1990s', '2000s', '2020s', '2090s'];
const TEMPO_OPTIONS = ['Auto', 'Calm', 'Measured', 'Dynamic', 'Frenetic'];
const ASPECT_RATIO_OPTIONS = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];

function useDragScroll() {
  const ref = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const scrollTop = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    dragging.current = true;
    startY.current = e.clientY;
    startX.current = e.clientX;
    scrollTop.current = el.scrollTop;
    scrollLeft.current = el.scrollLeft;
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !dragging.current) return;
    const dy = e.clientY - startY.current;
    const dx = e.clientX - startX.current;
    el.scrollTop = scrollTop.current - dy;
    el.scrollLeft = scrollLeft.current - dx;
  };

  const stop = () => {
    dragging.current = false;
  };

  return {
    ref,
    onMouseDown,
    onMouseMove,
    onMouseUp: stop,
    onMouseLeave: stop,
  };
}

export const UniversalCreativeControlsBar: React.FC<UniversalCreativeControlsBarProps> = ({
  surface,
  value,
  onChange,
  compact = false,
  contextLabel,
}) => {
  const { creativeControls, setCreativeControls } = useRuns();
  const state = value || creativeControls;
  const updateState = (updater: (prev: UniversalCreativeControlsState) => UniversalCreativeControlsState) => {
    const next = updater(state);
    if (onChange) onChange(next);
    else setCreativeControls(next);
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CreativeTabId>(
    surface === 'audio' ? 'audio' : 'camera'
  );

  const camColumnScroll = useDragScroll();
  const lensColumnScroll = useDragScroll();
  const apertureColumnScroll = useDragScroll();
  const bodyScroll = useDragScroll();

  const openTab = (tab: CreativeTabId) => {
    setActiveTab(tab);
    setModalOpen(true);
  };

  const availableTabs: Array<{ id: CreativeTabId; label: string; icon: React.ReactNode }> =
    useMemo(() => {
      if (surface === 'audio') {
        return [{ id: 'audio', label: 'Audio Direction', icon: <Mic className="w-3.5 h-3.5" /> }];
      }
      return [
        { id: 'camera', label: 'Camera Setup', icon: <Camera className="w-3.5 h-3.5" /> },
        { id: 'movement', label: 'Movement & Angles', icon: <Move className="w-3.5 h-3.5" /> },
        { id: 'lighting', label: 'Lighting', icon: <Sun className="w-3.5 h-3.5" /> },
        { id: 'color', label: 'Color Grading', icon: <Palette className="w-3.5 h-3.5" /> },
        { id: 'film', label: 'Film Setup', icon: <Film className="w-3.5 h-3.5" /> },
      ];
    }, [surface]);

  return (
    <>
      {/* Compact Trigger Strip with Real Transparent Gear Thumbnails */}
      <div
        className={`flex flex-wrap items-center gap-1.5 ${
          compact ? 'text-[11px]' : 'text-xs'
        }`}
      >
        {surface === 'audio' ? (
          <button
            type="button"
            onClick={() => openTab('audio')}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-[#46ecd5]/50 text-zinc-200 transition"
          >
            <Mic className="w-3.5 h-3.5 text-[#46ecd5]" />
            <span className="font-semibold">
              {state.audioDirection.voiceTone} · {state.audioDirection.pacing} ·{' '}
              {state.audioDirection.musicMood}
            </span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => openTab('camera')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-[#46ecd5]/50 text-zinc-200 transition"
              title="Camera, Lens & Aperture Setup"
            >
              <GearVisual
                spec={getCameraBodyVisual(state.cameraSetup.cameraBody)}
                size="xs"
              />
              <span className="font-medium truncate max-w-[140px]">
                {state.cameraSetup.cameraBody === 'Auto'
                  ? 'Camera: Auto'
                  : state.cameraSetup.cameraBody}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openTab('camera')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-[#46ecd5]/50 text-zinc-200 transition"
              title="Lens & Aperture"
            >
              <GearVisual
                spec={getLensOpticVisual(state.cameraSetup.lens)}
                size="xs"
              />
              <span className="font-medium truncate max-w-[140px]">
                {state.cameraSetup.lens}
                {state.cameraSetup.aperture !== 'Auto'
                  ? ` · ${state.cameraSetup.aperture.split(' ')[0]}`
                  : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openTab('movement')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-[#46ecd5]/50 text-zinc-200 transition"
              title="Camera Movement & Shot Angle"
            >
              <GearVisual
                spec={
                  state.cameraMovement.movements[0]
                    ? getCameraMovementVisual(state.cameraMovement.movements[0])
                    : getCameraAngleVisual(state.cameraMovement.shotAngle)
                }
                size="xs"
              />
              <span className="font-medium truncate max-w-[140px]">
                {state.cameraMovement.movements[0] ||
                  (state.cameraMovement.shotAngle !== 'Auto'
                    ? state.cameraMovement.shotAngle
                    : 'Rig & Angle')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openTab('color')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-[#46ecd5]/50 text-zinc-200 transition"
              title="Color Grading & LUT"
            >
              <GearVisual
                spec={getColorGradeVisual(state.colorGrading.presetId)}
                size="xs"
              />
              <span className="font-medium truncate max-w-[130px]">
                {state.colorGrading.presetId === 'Auto'
                  ? 'Color: Auto'
                  : state.colorGrading.presetId}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openTab('lighting')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-[#46ecd5]/50 text-zinc-200 transition"
              title="Lighting Scheme"
            >
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-medium truncate max-w-[110px]">
                {state.lighting.scheme}
              </span>
            </button>

            <button
              type="button"
              onClick={() => openTab('film')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/90 border border-white/10 hover:border-[#46ecd5]/50 text-zinc-200 transition"
              title="Film Setup & Aspect Ratio"
            >
              <Sliders className="w-3.5 h-3.5 text-[#46ecd5]" />
              <span className="font-medium">
                {state.filmLook.aspectRatio} · {state.filmLook.genre}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Responsive Universal Cinematography Studio Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-[calc(100vw-1rem)] max-w-5xl max-h-[90vh] rounded-2xl border border-white/15 bg-[#0c0d10] shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-zinc-950/90">
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#46ecd5]">
                  {contextLabel || 'SPACIX UNIVERSAL CINEMATOGRAPHY'}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  Camera, Optics, Lighting & Color Science
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => updateState(() => DEFAULT_CREATIVE_CONTROLS)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-zinc-900 text-xs text-zinc-300 hover:text-white transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold hover:brightness-105 transition"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Bar */}
            <div className="px-4 sm:px-6 py-2.5 border-b border-white/10 bg-zinc-950/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {availableTabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      active
                        ? 'bg-[#46ecd5] text-zinc-950'
                        : 'bg-zinc-900/80 text-zinc-300 hover:text-white border border-white/10'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Tab Content */}
            <div
              ref={bodyScroll.ref}
              onMouseDown={bodyScroll.onMouseDown}
              onMouseMove={bodyScroll.onMouseMove}
              onMouseUp={bodyScroll.onMouseUp}
              onMouseLeave={bodyScroll.onMouseLeave}
              className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 sm:p-6"
            >
              {/* TAB 1: 3-Column CAMERA / LENS / APERTURE Photographic Selector */}
              {activeTab === 'camera' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Column 1: CAMERA */}
                  <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-3 flex flex-col max-h-[56vh]">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-400 pb-2.5 mb-2 border-b border-white/10 flex items-center justify-between shrink-0">
                      <span>CAMERA</span>
                      <span className="text-[#46ecd5]">{state.cameraSetup.cameraBody}</span>
                    </div>
                    <div
                      ref={camColumnScroll.ref}
                      onMouseDown={camColumnScroll.onMouseDown}
                      onMouseMove={camColumnScroll.onMouseMove}
                      onMouseUp={camColumnScroll.onMouseUp}
                      onMouseLeave={camColumnScroll.onMouseLeave}
                      className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5 cursor-grab active:cursor-grabbing"
                    >
                      {CAMERA_BODY_OPTIONS.map((opt) => {
                        const selected = state.cameraSetup.cameraBody === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              updateState((prev) => ({
                                ...prev,
                                cameraSetup: { ...prev.cameraSetup, cameraBody: opt.id },
                              }))
                            }
                            className={`w-full rounded-xl p-2.5 text-left flex items-center gap-3 transition border ${
                              selected
                                ? 'bg-[#46ecd5]/12 border-[#46ecd5] text-white'
                                : 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:bg-zinc-900'
                            }`}
                          >
                            <GearVisual spec={getCameraBodyVisual(opt.id)} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate">{opt.label}</div>
                              <div className="text-[10px] text-zinc-400 truncate">{opt.sub}</div>
                            </div>
                            {selected && <Check className="w-4 h-4 text-[#46ecd5] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 2: LENS */}
                  <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-3 flex flex-col max-h-[56vh]">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-400 pb-2.5 mb-2 border-b border-white/10 flex items-center justify-between shrink-0">
                      <span>LENS</span>
                      <span className="text-[#46ecd5]">{state.cameraSetup.lens}</span>
                    </div>
                    <div
                      ref={lensColumnScroll.ref}
                      onMouseDown={lensColumnScroll.onMouseDown}
                      onMouseMove={lensColumnScroll.onMouseMove}
                      onMouseUp={lensColumnScroll.onMouseUp}
                      onMouseLeave={lensColumnScroll.onMouseLeave}
                      className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5 cursor-grab active:cursor-grabbing"
                    >
                      {LENS_OPTIONS.map((opt) => {
                        const selected = state.cameraSetup.lens === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              updateState((prev) => ({
                                ...prev,
                                cameraSetup: { ...prev.cameraSetup, lens: opt.id },
                              }))
                            }
                            className={`w-full rounded-xl p-2.5 text-left flex items-center gap-3 transition border ${
                              selected
                                ? 'bg-[#46ecd5]/12 border-[#46ecd5] text-white'
                                : 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:bg-zinc-900'
                            }`}
                          >
                            <GearVisual spec={getLensOpticVisual(opt.id)} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate">{opt.label}</div>
                              <div className="text-[10px] text-zinc-400 truncate">{opt.sub}</div>
                            </div>
                            {selected && <Check className="w-4 h-4 text-[#46ecd5] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 3: APERTURE */}
                  <div className="rounded-xl border border-white/10 bg-zinc-950/70 p-3 flex flex-col max-h-[56vh]">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-400 pb-2.5 mb-2 border-b border-white/10 flex items-center justify-between shrink-0">
                      <span>APERTURE</span>
                      <span className="text-[#46ecd5]">{state.cameraSetup.aperture}</span>
                    </div>
                    <div
                      ref={apertureColumnScroll.ref}
                      onMouseDown={apertureColumnScroll.onMouseDown}
                      onMouseMove={apertureColumnScroll.onMouseMove}
                      onMouseUp={apertureColumnScroll.onMouseUp}
                      onMouseLeave={apertureColumnScroll.onMouseLeave}
                      className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5 cursor-grab active:cursor-grabbing"
                    >
                      {APERTURE_OPTIONS.map((opt) => {
                        const selected = state.cameraSetup.aperture === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              updateState((prev) => ({
                                ...prev,
                                cameraSetup: { ...prev.cameraSetup, aperture: opt.id },
                              }))
                            }
                            className={`w-full rounded-xl p-2.5 text-left flex items-center gap-3 transition border ${
                              selected
                                ? 'bg-[#46ecd5]/12 border-[#46ecd5] text-white'
                                : 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:bg-zinc-900'
                            }`}
                          >
                            <GearVisual spec={getApertureVisual(opt.id)} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate">{opt.label}</div>
                              <div className="text-[10px] text-zinc-400 truncate">{opt.sub}</div>
                            </div>
                            {selected && <Check className="w-4 h-4 text-[#46ecd5] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MOVEMENT & ANGLES */}
              {activeTab === 'movement' && (
                <div className="space-y-5">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2.5">
                      Camera Angle & Framing
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                      {SHOT_ANGLES.map((ang) => {
                        const selected = state.cameraMovement.shotAngle === ang.id;
                        return (
                          <button
                            key={ang.id}
                            type="button"
                            onClick={() =>
                              updateState((prev) => ({
                                ...prev,
                                cameraMovement: { ...prev.cameraMovement, shotAngle: ang.id },
                              }))
                            }
                            className={`rounded-xl p-2.5 border flex flex-col items-center gap-2 text-center transition ${
                              selected
                                ? 'bg-[#46ecd5]/12 border-[#46ecd5] text-white'
                                : 'bg-zinc-900/70 border-white/10 text-zinc-300 hover:bg-zinc-900'
                            }`}
                          >
                            <GearVisual spec={getCameraAngleVisual(ang.id)} size="md" />
                            <span className="text-xs font-semibold">{ang.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                        Camera Rig & Motion (Select up to 2)
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(['Slow', 'Medium', 'Fast'] as const).map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() =>
                              updateState((prev) => ({
                                ...prev,
                                cameraMovement: { ...prev.cameraMovement, speed: spd },
                              }))
                            }
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                              state.cameraMovement.speed === spd
                                ? 'bg-[#46ecd5] text-zinc-950 border-[#46ecd5]'
                                : 'bg-zinc-900 text-zinc-300 border-white/10'
                            }`}
                          >
                            {spd}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {MOVEMENT_OPTIONS.map((mov) => {
                        const selected = state.cameraMovement.movements.includes(mov.id);
                        return (
                          <button
                            key={mov.id}
                            type="button"
                            onClick={() =>
                              updateState((prev) => {
                                const exists = prev.cameraMovement.movements.includes(mov.id);
                                const next = exists
                                  ? prev.cameraMovement.movements.filter((m) => m !== mov.id)
                                  : [...prev.cameraMovement.movements, mov.id].slice(-2);
                                return {
                                  ...prev,
                                  cameraMovement: { ...prev.cameraMovement, movements: next },
                                };
                              })
                            }
                            className={`rounded-xl p-2.5 border flex items-center gap-3 text-left transition ${
                              selected
                                ? 'bg-[#46ecd5]/12 border-[#46ecd5] text-white'
                                : 'bg-zinc-900/70 border-white/10 text-zinc-300 hover:bg-zinc-900'
                            }`}
                          >
                            <GearVisual spec={getCameraMovementVisual(mov.id)} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate">{mov.label}</div>
                              <div className="text-[10px] text-zinc-400 truncate">{mov.desc}</div>
                            </div>
                            {selected && <Check className="w-4 h-4 text-[#46ecd5] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LIGHTING */}
              {activeTab === 'lighting' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {LIGHTING_OPTIONS.map((opt) => {
                      const selected = state.lighting.scheme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            updateState((prev) => ({
                              ...prev,
                              lighting: { ...prev.lighting, scheme: opt.id },
                            }))
                          }
                          className={`rounded-xl p-3 border text-left transition ${
                            selected
                              ? 'bg-[#46ecd5]/12 border-[#46ecd5] text-white'
                              : 'bg-zinc-900/70 border-white/10 text-zinc-300 hover:bg-zinc-900'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold">{opt.label}</span>
                            {selected && <Check className="w-3.5 h-3.5 text-[#46ecd5]" />}
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-snug">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">Key Intensity</span>
                        <span className="font-mono text-[#46ecd5]">{state.lighting.intensity}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={state.lighting.intensity}
                        onChange={(e) =>
                          updateState((prev) => ({
                            ...prev,
                            lighting: { ...prev.lighting, intensity: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-[#46ecd5]"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">Color Kelvin Warmth</span>
                        <span className="font-mono text-[#46ecd5]">{state.lighting.warmth}</span>
                      </div>
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        value={state.lighting.warmth}
                        onChange={(e) =>
                          updateState((prev) => ({
                            ...prev,
                            lighting: { ...prev.lighting, warmth: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-[#46ecd5]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: COLOR GRADING & LUT */}
              {activeTab === 'color' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {COLOR_PRESETS.map((lut) => {
                      const selected = state.colorGrading.presetId === lut.id;
                      return (
                        <button
                          key={lut.id}
                          type="button"
                          onClick={() =>
                            updateState((prev) => ({
                              ...prev,
                              colorGrading: { ...prev.colorGrading, presetId: lut.id },
                            }))
                          }
                          className={`rounded-xl p-3 border text-left transition flex flex-col gap-2 ${
                            selected
                              ? 'bg-[#46ecd5]/12 border-[#46ecd5] text-white'
                              : 'bg-zinc-900/70 border-white/10 text-zinc-300 hover:bg-zinc-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <GearVisual spec={getColorGradeVisual(lut.id)} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate">{lut.name}</div>
                              <div className="flex items-center gap-1 mt-1">
                                {lut.swatches.map((hex) => (
                                  <span
                                    key={hex}
                                    className="w-3 h-3 rounded-sm border border-white/15"
                                    style={{ backgroundColor: hex }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-snug">{lut.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
                    {[
                      { key: 'lutIntensity', label: 'LUT Strength', min: 0, max: 100 },
                      { key: 'contrast', label: 'Contrast', min: -40, max: 40 },
                      { key: 'saturation', label: 'Saturation', min: -60, max: 60 },
                      { key: 'grain', label: '35mm Film Grain', min: 0, max: 100 },
                    ].map((slider) => {
                      const k = slider.key as keyof UniversalCreativeControlsState['colorGrading'];
                      return (
                        <div key={slider.key}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-400">{slider.label}</span>
                            <span className="font-mono text-[#46ecd5]">
                              {state.colorGrading[k]}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={slider.min}
                            max={slider.max}
                            value={Number(state.colorGrading[k])}
                            onChange={(e) =>
                              updateState((prev) => ({
                                ...prev,
                                colorGrading: {
                                  ...prev.colorGrading,
                                  [k]: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full accent-[#46ecd5]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: FILM SETUP */}
              {activeTab === 'film' && (
                <div className="space-y-5">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                      Output Orientation & Aspect Ratio
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {ASPECT_RATIO_OPTIONS.map((ar) => {
                        const selected = state.filmLook.aspectRatio === ar;
                        return (
                          <button
                            key={ar}
                            type="button"
                            onClick={() =>
                              updateState((prev) => ({
                                ...prev,
                                filmLook: { ...prev.filmLook, aspectRatio: ar },
                              }))
                            }
                            className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold transition ${
                              selected
                                ? 'bg-[#46ecd5] text-zinc-950 border-[#46ecd5]'
                                : 'bg-zinc-900/70 text-zinc-300 border-white/10 hover:text-white'
                            }`}
                          >
                            {ar}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                      Production Genre
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {GENRE_OPTIONS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() =>
                            updateState((prev) => ({
                              ...prev,
                              filmLook: { ...prev.filmLook, genre: g },
                            }))
                          }
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                            state.filmLook.genre === g
                              ? 'bg-[#46ecd5] text-zinc-950 border-[#46ecd5]'
                              : 'bg-zinc-900/70 text-zinc-300 border-white/10'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                        Cinema Era / Stock
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ERA_OPTIONS.map((era) => (
                          <button
                            key={era}
                            type="button"
                            onClick={() =>
                              updateState((prev) => ({
                                ...prev,
                                filmLook: { ...prev.filmLook, era },
                              }))
                            }
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                              state.filmLook.era === era
                                ? 'bg-[#46ecd5] text-zinc-950 border-[#46ecd5]'
                                : 'bg-zinc-900/70 text-zinc-300 border-white/10'
                            }`}
                          >
                            {era}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                        Editorial Tempo
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {TEMPO_OPTIONS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              updateState((prev) => ({
                                ...prev,
                                filmLook: { ...prev.filmLook, tempo: t },
                              }))
                            }
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                              state.filmLook.tempo === t
                                ? 'bg-[#46ecd5] text-zinc-950 border-[#46ecd5]'
                                : 'bg-zinc-900/70 text-zinc-300 border-white/10'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: AUDIO DIRECTION */}
              {activeTab === 'audio' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      field: 'voiceTone' as const,
                      label: 'Vocal Tone',
                      options: ['Natural Studio', 'Warm & Intimate', 'Commanding Epic', 'Gritty Whisper', 'Bright Commercial'],
                    },
                    {
                      field: 'pacing' as const,
                      label: 'Delivery Pacing',
                      options: ['Slow Deliberate', 'Measured', 'Conversational', 'Energetic Rapid'],
                    },
                    {
                      field: 'musicMood' as const,
                      label: 'Sonic Mood',
                      options: ['Atmospheric', 'Tension Pulse', 'Afrobeats Groove', 'Orchestral Swell', 'Minimalist Ambient'],
                    },
                    {
                      field: 'acousticSpace' as const,
                      label: 'Acoustic Space',
                      options: ['Studio Dry', 'Intimate Room', 'Cathedral Hall', 'Rain Street Exterior'],
                    },
                  ].map((group) => (
                    <div
                      key={group.field}
                      className="rounded-xl border border-white/10 bg-zinc-950/70 p-4 space-y-2.5"
                    >
                      <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                        {group.label}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              updateState((prev) => ({
                                ...prev,
                                audioDirection: {
                                  ...prev.audioDirection,
                                  [group.field]: opt,
                                },
                              }))
                            }
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                              state.audioDirection[group.field] === opt
                                ? 'bg-[#46ecd5] text-zinc-950 border-[#46ecd5]'
                                : 'bg-zinc-900 text-zinc-300 border-white/10'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
