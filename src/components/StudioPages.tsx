import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  Clapperboard,
  CreditCard,
  Download,
  Edit3,
  Film,
  Flag,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  MapPin,
  Mic,
  Music,
  Palette,
  Play,
  Search,
  Shield,
  Shirt,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Users,
  Video,
  Wand2,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  CreditLedgerEntry,
  PresetEffect,
  SupportTicket,
  Surface,
} from '../types/studio';
import { priceFor } from '../billing/price';
import { useRuns } from '../lib/useRuns';
import { GenerationTile } from './StudioGeneratorView';
import { AdminDashboardView } from './AdminDashboardView';
import {
  ProviderBrandIcon,
  SpacixLogo,
} from './ProviderBrandIcon';
import {
  ContinuityStudioBar,
  SPACI6X_STUDIOS,
} from './ContinuityStudiosView';
import { HiggsfieldCinemaStudio } from './HiggsfieldCinemaStudio';
import {
  Badge,
  Button,
  Input,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/primitives';
import { AnimatedPillTabs, BorderBeam, ShimmerButton, SpotlightCard } from './ui/aceternity-magic';

// ============================================================================
// 1. EXPLORE / HOME PAGE (`/`) — COMMERCIAL CREATIVE PLATFORM SHOWCASE
// ============================================================================
export const ExplorePage: React.FC = () => {
  const {
    models,
    presets,
    communityItems,
    navigate,
    applyPresetToDock,
    setSelectedGeneration,
    characters,
    wardrobes,
    propsList,
    locations,
    cinemaProjects,
    calculateTokenCost,
  } = useRuns();

  const [modelSurfaceFilter, setModelSurfaceFilter] = useState<'all' | Surface>('all');
  const [activeSuiteTab, setActiveSuiteTab] = useState<string>('all');

  const filteredModels = models
    .filter((m) => (modelSurfaceFilter === 'all' ? true : m.surface === modelSurfaceFilter))
    .slice(0, 6);

  const totalElementsCount =
    characters.length + locations.length + wardrobes.length + propsList.length;

  const STUDIO_CAPABILITY_SUITES = [
    {
      id: 'production_elements',
      categoryLabel: 'PRODUCTION ELEMENTS',
      badge: 'STAGE 01 · CONTINUITY VAULT',
      icon: Users,
      title: 'Characters, Locations, Wardrobes & Props',
      desc: 'Lock up to 50 visual references per shot—facial identities, INT./EXT. sets, custom outfits, and hero vehicles across your entire film.',
      metrics: `${characters.length} Characters · ${locations.length} Sets · ${wardrobes.length} Outfits`,
      chips: ['@Character ID', '@Location Set', 'Wardrobe Lock', 'Hero Props', '50 Refs/Shot'],
      actionLabel: 'Open Elements in Studio',
      action: () =>
        navigate('cinema', {
          category: 'production_elements',
          tool: 'character_identity',
        }),
    },
    {
      id: 'media_generation',
      categoryLabel: 'MEDIA GENERATION',
      badge: 'STAGE 02 · CAPABILITY ROUTING',
      icon: Video,
      title: 'Cinema Video, Optical Still, Voice & Lip Sync',
      desc: 'Intelligent model-capability routing connects each creative task to verified video, image, dialogue, lip-sync, or score engines.',
      metrics: `${models.filter((m) => m.surface === 'video').length} Video · ${
        models.filter((m) => m.surface === 'image').length
      } Image · ${models.filter((m) => m.surface === 'audio').length} Audio`,
      chips: ['Cinema Video 4.0', 'Optical Still', 'Multilingual Lip Sync', 'Original Score'],
      actionLabel: 'Launch Media Composer',
      action: () =>
        navigate('cinema', { category: 'media_generation', tool: 'video_creation' }),
    },
    {
      id: 'film_production',
      categoryLabel: 'FILM PRODUCTION',
      badge: 'STAGE 03 · DIRECTOR CONTROLS',
      icon: Clapperboard,
      title: 'Screenplay, Optics, Lighting & Sequencing',
      desc: 'Direct shots with ARRI/Panavision lenses, aperture depth-of-field, 12-swatch color grades, practical lighting, and multi-track timeline editing.',
      metrics: `${cinemaProjects.length} Active Productions · Multi-Track Timeline`,
      chips: ['Anamorphic Lenses', 'Color Grade LUTs', 'Practical Lighting', 'Shot Coverage'],
      actionLabel: 'Direct in Cinema Studio',
      action: () =>
        navigate('cinema', { category: 'film_production', tool: 'storyboard_planning' }),
    },
    {
      id: 'automatic_production',
      categoryLabel: 'AUTOMATIC PRODUCTION',
      badge: 'STAGE 04 · 4-STAGE PIPELINE',
      icon: Sparkles,
      title: '4-Stage Guided Film Creation Pipeline',
      desc: 'Turn a raw concept into an editable screenplay, extracted character & location sheets, continuity storyboard frames, and animated scenes.',
      metrics: 'Idea → Screenplay → Assets → Storyboard → Video',
      chips: ['1. Screenplay', '2. Asset Sheets', '3. Storyboard Grid', '4. Motion Cut'],
      actionLabel: 'Start 4-Stage Pipeline',
      action: () => navigate('cinema', { mode: 'automatic' }),
    },
  ];

  const visibleSuites =
    activeSuiteTab === 'all'
      ? STUDIO_CAPABILITY_SUITES
      : STUDIO_CAPABILITY_SUITES.filter((s) => s.id === activeSuiteTab);

  return (
    <div className="space-y-16 pb-20">
      {/* =================================================================== */}
      {/* HERO WORKBENCH: ACETERNITY SPOTLIGHT + RADIX TABS + MAGIC UI BEAM   */}
      {/* =================================================================== */}
      <section className="relative border-b border-white/10 quanta-dot-bg overflow-hidden py-10 sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(70,236,213,0.20),transparent_55%),radial-gradient(circle_at_80%_75%,rgba(56,189,248,0.12),transparent_50%)] pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Hero Column */}
          <div className="min-w-0 lg:col-span-6 space-y-6">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-[#12151E]/90 border border-[#46ecd5]/30 px-3.5 py-1.5 shadow-[0_0_25px_rgba(70,236,213,0.15)]">
              <Badge variant="default" className="font-mono text-[10px] uppercase tracking-widest">
                CINEMA STUDIO 4.0
              </Badge>
              <span className="text-xs font-semibold text-zinc-200">
                Unified Virtual Film Production & AI Direction Suite
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-[0.94] break-words">
              DIRECT COMPLETE FILMS IN{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#46ecd5] via-teal-200 to-sky-400">
                ONE UNIFIED STUDIO
              </span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 max-w-xl leading-relaxed">
              Establish persistent <strong className="text-white">@Characters</strong>,{' '}
              <strong className="text-white">@Locations</strong>, wardrobes, and props; dial in cinema cameras, anamorphic lenses, color palettes, and lighting; or launch the{' '}
              <strong className="text-[#46ecd5]">4-Stage Automatic Production</strong> workflow from concept to finished sequence.
            </p>

            {/* Primary CTA Row (Magic UI ShimmerButton + shadcn Buttons) */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <ShimmerButton
                onClick={() => navigate('cinema')}
                className="px-6 py-3.5 rounded-2xl text-xs sm:text-sm shadow-[0_0_35px_rgba(70,236,213,0.35)]"
              >
                <Clapperboard className="w-4 h-4" />
                <span>Enter Cinema Studio 4.0</span>
                <ArrowRight className="w-4 h-4" />
              </ShimmerButton>

              <Button
                variant="accent"
                size="lg"
                onClick={() => navigate('cinema', { mode: 'automatic' })}
                className="rounded-2xl gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#46ecd5]" />
                <span>4-Stage Automatic Film Production</span>
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('cinema', { tab: 'elements' })}
                className="rounded-2xl gap-2"
              >
                <Users className="w-4 h-4 text-[#46ecd5]" />
                <span>@My Elements ({totalElementsCount})</span>
              </Button>
            </div>

            {/* Quick Tool Jump Strip */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Direct Access into Cinema Studio Workspace Tools:
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '@Character Identity', cat: 'production_elements', tool: 'character_identity', icon: Users },
                  { label: '@Location Sets', cat: 'production_elements', tool: 'location_environment', icon: MapPin },
                  { label: 'Wardrobe Lock', cat: 'production_elements', tool: 'wardrobe_outfit', icon: Shirt },
                  { label: 'Cinema Video', cat: 'media_generation', tool: 'video_creation', icon: Video },
                  { label: 'Optical Still', cat: 'media_generation', tool: 'image_creation', icon: ImageIcon },
                  { label: 'Voice & Lip Sync', cat: 'media_generation', tool: 'lip_sync', icon: Mic },
                  { label: 'Camera & Optics', cat: 'film_production', tool: 'camera_coverage', icon: Camera },
                ].map((chip) => {
                  const ChipIcon = chip.icon;
                  return (
                    <Button
                      key={chip.tool}
                      variant="outline"
                      size="xs"
                      onClick={() =>
                        navigate('cinema', { category: chip.cat, tool: chip.tool })
                      }
                      className="rounded-xl bg-[#11131A]/90 border-white/10 hover:border-[#46ecd5]/50 hover:text-[#46ecd5] gap-1.5"
                    >
                      <ChipIcon className="w-3 h-3 text-[#46ecd5]" />
                      <span>{chip.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Hero Column: Interactive Radix UI Tabs Live Studio Preview Deck */}
          <div className="min-w-0 lg:col-span-6">
            <SpotlightCard className="overflow-hidden border-white/15 bg-[#11131A]/95 shadow-[0_28px_90px_rgba(0,0,0,0.85)] p-4 sm:p-5">
              <BorderBeam />
              <Tabs defaultValue="director" className="w-full space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#46ecd5] animate-pulse" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      INTERACTIVE STUDIO PREVIEW
                    </span>
                  </div>
                  <TabsList className="bg-[#0B0C10] border border-white/10 p-1 rounded-xl">
                    <TabsTrigger value="director" className="text-[11px] px-2.5 py-1">
                      Director Dock
                    </TabsTrigger>
                    <TabsTrigger value="autoprod" className="text-[11px] px-2.5 py-1">
                      4-Stage Auto
                    </TabsTrigger>
                    <TabsTrigger value="optics" className="text-[11px] px-2.5 py-1">
                      Optics & LUTs
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab 1: Director Dock Preview */}
                <TabsContent value="director" className="space-y-3.5 mt-0">
                  {presets[0] && (
                    <div className="aspect-video rounded-2xl bg-zinc-950 relative overflow-hidden border border-white/10">
                      <img
                        src={presets[0].previewSvgDataUrl}
                        alt={presets[0].title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <Badge variant="default" className="font-mono text-[10px]">
                          LIVE MONITOR · 21:9 ANAMORPHIC
                        </Badge>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          REFS: {totalElementsCount}/50
                        </Badge>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-mono text-[#46ecd5] uppercase">
                            ACTIVE SCENE PRESET · {presets[0].category}
                          </div>
                          <h2 className="font-display text-2xl font-bold uppercase text-white">
                            {presets[0].title}
                          </h2>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => navigate('cinema')}
                        >
                          Open in Cinema Studio →
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Simulated Director Control Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: 'References', val: `${totalElementsCount}/50`, icon: Users },
                      { label: 'Film Setup', val: 'Sci-Fi · Noir', icon: Film },
                      { label: 'Camera', val: 'ARRI 65 · 35mm', icon: Camera },
                      { label: 'Color Grade', val: 'Twilight Fable', icon: Palette },
                      { label: 'Lighting', val: 'Practicals', icon: Sun },
                    ].map((ctrl) => {
                      const CtrlIcon = ctrl.icon;
                      return (
                        <button
                          key={ctrl.label}
                          type="button"
                          onClick={() => navigate('cinema')}
                          className="p-2.5 rounded-xl bg-[#171922] hover:bg-[#1E222D] border border-white/10 hover:border-[#46ecd5]/40 text-left transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                            <CtrlIcon className="w-3 h-3 text-[#46ecd5]" />
                            <span className="truncate">{ctrl.label}</span>
                          </div>
                          <div className="text-xs font-bold text-white truncate mt-1">
                            {ctrl.val}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Tab 2: 4-Stage Automatic Film Production Preview */}
                <TabsContent value="autoprod" className="space-y-3.5 mt-0">
                  <div className="p-4 rounded-2xl bg-[#0C0E14] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="default" className="mb-1">
                          GUIDED 4-STAGE PIPELINE
                        </Badge>
                        <h3 className="text-base font-bold text-white">
                          From Concept to Complete Multi-Scene Film
                        </h3>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate('cinema', { mode: 'automatic' })}
                      >
                        Launch Pipeline →
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      {[
                        {
                          step: 'STAGE 01',
                          title: 'Screenplay & Scene Breakdown',
                          desc: 'Generates structured INT./EXT. scenes, @CHARACTER dialogue, and camera notes.',
                        },
                        {
                          step: 'STAGE 02',
                          title: 'Character, Location & Prop Sheets',
                          desc: 'Extracts and generates locked visual reference sheets for every entity.',
                        },
                        {
                          step: 'STAGE 03',
                          title: 'Continuity Storyboard Frames',
                          desc: 'Synthesizes shot-by-shot keyframes preserving character & set identity.',
                        },
                        {
                          step: 'STAGE 04',
                          title: 'Motion Video, Voice & Lip Sync',
                          desc: 'Converts approved storyboard frames into directed video and dialogue.',
                        },
                      ].map((st) => (
                        <div
                          key={st.step}
                          onClick={() => navigate('cinema', { mode: 'automatic' })}
                          className="p-3 rounded-xl bg-[#151821] border border-white/10 hover:border-[#46ecd5]/40 cursor-pointer transition-all"
                        >
                          <div className="text-[10px] font-mono font-bold text-[#46ecd5]">
                            {st.step}
                          </div>
                          <div className="font-bold text-white mt-0.5">{st.title}</div>
                          <div className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                            {st.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 3: Optics & Color Grading Preview */}
                <TabsContent value="optics" className="space-y-3.5 mt-0">
                  <div className="p-4 rounded-2xl bg-[#0C0E14] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono text-[#46ecd5] uppercase">
                          VIRTUAL CINEMATOGRAPHY RIG
                        </div>
                        <h3 className="text-base font-bold text-white">
                          Cameras, Anamorphic Lenses, 12-Swatch LUTs & Lighting
                        </h3>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() =>
                          navigate('cinema', {
                            category: 'film_production',
                            tool: 'lighting_cinematography',
                          })
                        }
                      >
                        Configure Optics →
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      {[
                        { tag: 'CAMERA BODY', name: 'ARRI Alexa 65 IMAX', sub: 'Large-format 65mm sensor' },
                        { tag: 'OPTICAL LENS', name: 'Panavision C-Series', sub: '2x Anamorphic bokeh flare' },
                        { tag: 'APERTURE', name: 'f/1.4 Shallow DOF', sub: 'Creamy subject isolation' },
                        { tag: 'MOVEMENT', name: 'FPV Tracking Dolly', sub: 'Dynamic kinetic subject lock' },
                        { tag: 'COLOR PALETTE', name: 'The Emerald Ambush', sub: '12-swatch cinema print LUT' },
                        { tag: 'LIGHTING', name: 'Sodium Street Rim', sub: 'Volumetric wet-asphalt practicals' },
                      ].map((item) => (
                        <div
                          key={item.name}
                          onClick={() => navigate('cinema')}
                          className="p-2.5 rounded-xl bg-[#151821] border border-white/10 hover:border-[#46ecd5]/40 cursor-pointer"
                        >
                          <div className="text-[9px] font-mono text-[#46ecd5]">{item.tag}</div>
                          <div className="font-bold text-white truncate mt-0.5">{item.name}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{item.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 00. UNIFIED CINEMA STUDIO ARCHITECTURE (FILTERABLE SUITE CARDS)     */}
      {/* =================================================================== */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono-tabular uppercase tracking-widest text-[#46ecd5]">
              UNIFIED PRODUCTION ARCHITECTURE
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wide text-white mt-0.5">
              00. Everything Inside One Cinema Studio
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              All character, wardrobe, location, media generation, and filmmaking tools live inside a single cohesive studio environment.
            </p>
          </div>

          <AnimatedPillTabs
            layoutId="explore-suite-filter"
            activeId={activeSuiteTab}
            items={[
              { id: 'all', label: 'All 4 Suites' },
              { id: 'production_elements', label: 'Production Elements' },
              { id: 'media_generation', label: 'Media Generation' },
              { id: 'film_production', label: 'Film Production' },
              { id: 'automatic_production', label: '4-Stage Auto' },
            ]}
            onChange={(id) => setActiveSuiteTab(id)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleSuites.map((card) => {
            const SuiteIcon = card.icon;
            return (
              <SpotlightCard
                key={card.id}
                onClick={card.action}
                className="group cursor-pointer p-5 border-white/10 hover:border-[#46ecd5]/60 text-left flex flex-col justify-between gap-5 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="font-mono text-[10px]">
                      {card.badge}
                    </Badge>
                    <span className="w-8 h-8 rounded-xl bg-[#46ecd5]/10 border border-[#46ecd5]/30 flex items-center justify-center text-[#46ecd5]">
                      <SuiteIcon className="w-4 h-4" />
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-white group-hover:text-[#46ecd5] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{card.desc}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {card.chips.map((chip) => (
                      <Badge key={chip} variant="secondary" className="text-[10px] font-mono">
                        {chip}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-zinc-400 truncate">
                    {card.metrics}
                  </span>
                  <span className="font-bold text-[#46ecd5] group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                    {card.actionLabel} →
                  </span>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </section>

      {/* =================================================================== */}
      {/* 01. INTERACTIVE PRODUCTION MODEL CATALOG WITH ANIMATED FILTER TABS  */}
      {/* =================================================================== */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono-tabular uppercase tracking-widest text-[#46ecd5]">
              CAPABILITY-ROUTED INFERENCE ENGINES
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wide text-white mt-0.5">
              01. Production Model Catalog
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Curated cinema video, optical still, and studio audio architectures with deterministic token metering
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AnimatedPillTabs
              layoutId="explore-model-surface-tabs"
              activeId={modelSurfaceFilter}
              items={[
                { id: 'all', label: `All (${models.length})` },
                {
                  id: 'video',
                  label: `Video (${models.filter((m) => m.surface === 'video').length})`,
                },
                {
                  id: 'image',
                  label: `Image (${models.filter((m) => m.surface === 'image').length})`,
                },
                {
                  id: 'audio',
                  label: `Audio (${models.filter((m) => m.surface === 'audio').length})`,
                },
              ]}
              onChange={(val) => setModelSurfaceFilter(val as 'all' | Surface)}
            />
            <Button
              variant="cyanGhost"
              size="sm"
              onClick={() => navigate('cinema')}
            >
              <span>Open Studio Router</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map((model) => {
            const defaultSettings: Record<string, string | number | boolean> = {};
            for (const s of model.settings) defaultSettings[s.key] = s.defaultValue;
            const cost = calculateTokenCost(model.id, defaultSettings, []);

            return (
              <SpotlightCard
                key={model.id}
                onClick={() =>
                  navigate('cinema', {
                    model: model.id,
                  })
                }
                className={`group cursor-pointer p-5 border-white/10 hover:border-[#46ecd5]/60 bg-gradient-to-br ${model.previewGradient} flex flex-col justify-between gap-5 transition-all`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <ProviderBrandIcon provider={model.provider} size={15} />
                      <span>
                        {model.provider} · {model.surface.toUpperCase()}
                      </span>
                    </span>
                    <Badge variant="default" className="font-mono-tabular">
                      from ✦ {cost} TK
                    </Badge>
                  </div>
                  <h3 className="font-display text-2xl font-bold uppercase tracking-wide text-white group-hover:text-[#46ecd5] transition-colors">
                    {model.label}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">
                    {model.description}
                  </p>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {model.badges.map((badge) => (
                      <Badge
                        key={badge}
                        variant="secondary"
                        className="font-mono-tabular text-[#46ecd5]"
                      >
                        {badge}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 truncate text-[11px]">
                      Best for: {model.bestFor}
                    </span>
                    <span className="text-[#46ecd5] font-bold group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                      Direct in Studio →
                    </span>
                  </div>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </section>

      {/* =================================================================== */}
      {/* 02. CAMERA RIGS & VISUAL EFFECTS                                    */}
      {/* =================================================================== */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono-tabular uppercase tracking-widest text-[#46ecd5]">
              OPTICAL CHOREOGRAPHY & LOOKS
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wide text-white mt-0.5">
              02. Camera Rigs & Visual Effects
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Pre-configured lens choreography, architectural twilight grades, and macro probe templates
            </p>
          </div>
          <Button
            variant="cyanGhost"
            size="sm"
            onClick={() => navigate('effects')}
          >
            <span>Explore All {presets.length} Effects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.slice(0, 3).map((preset) => (
            <SpotlightCard
              key={preset.id}
              className="overflow-hidden flex flex-col justify-between transition-all p-0 border-white/10 hover:border-[#46ecd5]/50"
            >
              <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                <img
                  src={preset.previewSvgDataUrl}
                  alt={preset.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {preset.category}
                  </Badge>
                  <Badge variant="default" className="text-[10px]">
                    {preset.surface.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {preset.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {preset.description}
                  </p>
                </div>
                <ShimmerButton
                  onClick={() => applyPresetToDock(preset)}
                  className="w-full py-2 text-xs justify-center"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Load Rig in Cinema Studio</span>
                </ShimmerButton>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* =================================================================== */}
      {/* 03. PUBLIC COMMUNITY SHOWCASE                                       */}
      {/* =================================================================== */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono-tabular uppercase tracking-widest text-[#46ecd5]">
              DIRECTOR REELS & DAILIES
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wide text-white mt-0.5">
              03. SPACIX Community Showcase
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Recent R2-archived masters published by SPACIX directors — click any work to inspect or remix in Cinema Studio
            </p>
          </div>
          <Button
            variant="cyanGhost"
            size="sm"
            onClick={() => navigate('community')}
          >
            <span>Open Community Feed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {communityItems.slice(0, 4).map((gen) => (
            <GenerationTile
              key={gen.id}
              gen={gen}
              onOpenDetail={(g) => setSelectedGeneration(g)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

// ============================================================================
// 2. EFFECTS / PRESET GALLERY & DETAIL PAGE (`/effects`)
// ============================================================================
export const EffectsPage: React.FC = () => {
  const { presets, applyPresetToDock, models } = useRuns();
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedPreset, setSelectedPreset] = useState<PresetEffect | null>(null);

  const categories = [
    'All',
    'Camera Motion',
    'Visual VFX',
    'Cinematic Look',
    'Sonic Atmosphere',
  ];

  const filtered = presets.filter((p) =>
    categoryFilter === 'All' ? true : p.category === categoryFilter
  );

  return (
    <HiggsfieldCinemaStudio
      studioId="effects"
      renderStudioVault={() => (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="min-w-0">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-wide text-white">
            Camera Rigs & Visual Effects
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Select a preset to pre-load its model, lens parameters, and director prompt template
          </p>
        </div>

        <AnimatedPillTabs
          layoutGroupId="effects-category-tabs"
          value={categoryFilter}
          onChange={setCategoryFilter}
          items={categories.map((cat) => ({ value: cat, label: cat }))}
        />
      </div>

      {selectedPreset && (
        <SpotlightCard className="p-6 border-[#46ecd5]/50 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative">
          <BorderBeam />
          <div className="lg:col-span-5 aspect-video rounded-lg overflow-hidden bg-zinc-950 border border-white/10">
            <img
              src={selectedPreset.previewSvgDataUrl}
              alt={selectedPreset.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="default" className="font-mono-tabular">
                {selectedPreset.category.toUpperCase()} · {selectedPreset.surface.toUpperCase()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPreset(null)}
              >
                Close Inspector
              </Button>
            </div>
            <h2 className="font-display text-3xl font-bold uppercase text-white">
              {selectedPreset.title}
            </h2>
            <p className="text-sm text-zinc-300">{selectedPreset.description}</p>
            <div className="p-3.5 rounded-lg bg-zinc-900 border border-white/10 space-y-1">
              <div className="text-[11px] text-zinc-400">Director Prompt Template</div>
              <p className="text-xs text-zinc-200 font-mono-tabular">
                {selectedPreset.promptTemplate}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ShimmerButton
                onClick={() => applyPresetToDock(selectedPreset)}
                className="px-5 py-2.5 text-xs"
              >
                Use Effect in Studio
              </ShimmerButton>
              <span className="text-xs text-zinc-400">
                Target Model:{' '}
                <strong className="text-zinc-200">
                  {models.find((m) => m.id === selectedPreset.modelId)?.label ||
                    selectedPreset.modelId}
                </strong>
              </span>
            </div>
          </div>
        </SpotlightCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((preset) => {
          const model = models.find((m) => m.id === preset.modelId);
          return (
            <SpotlightCard
              key={preset.id}
              className="overflow-hidden flex flex-col justify-between transition-all p-0"
            >
              <div
                onClick={() => setSelectedPreset(preset)}
                className="aspect-video bg-zinc-950 cursor-pointer relative overflow-hidden"
              >
                <img
                  src={preset.previewSvgDataUrl}
                  alt={preset.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover hover:scale-[1.02] transition-transform"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    {model && <ProviderBrandIcon provider={model.provider} size={14} />}
                    <Badge variant="outline" className="text-[10px]">{preset.category}</Badge>
                    <span>·</span>
                    <span>{model?.label || preset.modelId}</span>
                  </div>
                  <h3
                    onClick={() => setSelectedPreset(preset)}
                    className="text-lg font-bold text-white mt-1.5 cursor-pointer hover:text-[#46ecd5]"
                  >
                    {preset.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => applyPresetToDock(preset)}
                    className="flex-1"
                  >
                    Use Effect
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedPreset(preset)}
                  >
                    Inspect
                  </Button>
                </div>
              </div>
            </SpotlightCard>
          );
        })}
      </div>
      </div>
      )}
    />
  );
};

// ============================================================================
// 3. PUBLIC COMMUNITY SHOWCASE (`/community`)
// ============================================================================
export const CommunityPage: React.FC = () => {
  const {
    communityItems,
    setSelectedGeneration,
    reuseGenerationInDock,
    downloadGeneration,
    showToast,
  } = useRuns();
  const [surfaceFilter, setSurfaceFilter] = useState<'all' | Surface>('all');
  const [query, setQuery] = useState('');

  const filtered = communityItems
    .filter((g) => (surfaceFilter === 'all' ? true : g.surface === surfaceFilter))
    .filter(
      (g) =>
        !query.trim() ||
        g.prompt.toLowerCase().includes(query.toLowerCase()) ||
        g.modelLabel.toLowerCase().includes(query.toLowerCase())
    );

  const handleReport = async (generationId: string) => {
    try {
      await fetch('/api/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId, reason: 'Community feed report' }),
      });
    } catch {
      // Ignore transient network error
    }
    showToast('Submitted report to moderation queue');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="min-w-0">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-wide text-white">
            SPACIX Community Feed
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Public generations shared by SPACIX creators — inspect prompts, settings, or click Recreate
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <AnimatedPillTabs
            layoutGroupId="community-surface-tabs"
            value={surfaceFilter}
            onChange={(v) => setSurfaceFilter(v as 'all' | Surface)}
            items={(['all', 'video', 'image', 'audio'] as const).map((s) => ({
              value: s,
              label: s.toUpperCase(),
            }))}
          />

          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by prompt or model..."
              className="w-full sm:w-64 pl-9 h-8 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((gen) => (
          <div key={gen.id} className="space-y-2 min-w-0">
            <GenerationTile
              gen={gen}
              onOpenDetail={(g) => setSelectedGeneration(g)}
            />
            <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
              <span className="truncate">By {gen.userName || 'SPACIX Director'}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="cyanGhost"
                  size="sm"
                  onClick={() => reuseGenerationInDock(gen, false)}
                  className="h-7 px-2 text-xs"
                >
                  Recreate
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={(e) => downloadGeneration(gen, e)}
                      aria-label="Download generation"
                      className="h-7 w-7"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download generation</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReport(gen.id)}
                      aria-label="Report community item"
                      className="h-7 w-7 text-zinc-500 hover:text-zinc-200"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Report community item</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 4. ASSETS LIBRARY & PROJECTS SIDEBAR (`/assets` & `/projects/[id]`)
// ============================================================================
export const AssetsLibraryPage: React.FC = () => {
  const {
    generations,
    uploads,
    projects,
    createProject,
    renameProject,
    deleteProject,
    uploadReferenceFile,
    setSelectedGeneration,
    deleteGeneration,
    togglePublishGeneration,
    moveGenerationToProject,
    characters,
    wardrobes,
    propsList,
    locations,
    motionTemplates,
    cinemaProjects,
    activeContinuity,
    setActiveContinuity,
    navigate,
  } = useRuns();

  const [filterTab, setFilterTab] = useState<
    | 'all'
    | 'characters'
    | 'wardrobes'
    | 'props'
    | 'locations'
    | 'motion'
    | 'productions'
    | 'image'
    | 'video'
    | 'audio'
    | 'uploads'
  >('all');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [editingProjName, setEditingProjName] = useState('');

  const filteredGenerations = generations
    .filter((g) => (activeProjectId ? g.projectId === activeProjectId : true))
    .filter((g) => {
      if (filterTab === 'image' || filterTab === 'video' || filterTab === 'audio') {
        return g.surface === filterTab;
      }
      return true;
    });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await createProject(newProjectName.trim());
    setNewProjectName('');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBatchDelete = async () => {
    for (const id of selectedIds) {
      await deleteGeneration(id);
    }
    setSelectedIds([]);
  };

  const handleBatchPublish = async () => {
    for (const id of selectedIds) {
      await togglePublishGeneration(id, true);
    }
    setSelectedIds([]);
  };

  const handleUploadAsset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await uploadReferenceFile({
        label: file.name,
        contentType: file.type || 'image/png',
        bytes: file.size,
        dataUrl: String(reader.result || ''),
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#09090B]">
      <ContinuityStudioBar />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Projects Sidebar */}
      <aside className="min-w-0 w-full lg:col-span-3 bg-[#111114] border border-white/10 rounded-xl p-4 space-y-5">
        <div>
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
            SPACIX Continuity Asset Vault
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Shared database library across all 12 SPACI6X Studios
          </p>
        </div>

        {/* Continuity Asset Summary Quick Filters */}
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            onClick={() => setFilterTab('characters')}
            className={`p-2 rounded-lg border text-left transition-colors ${
              filterTab === 'characters'
                ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            <div className="text-[10px] text-zinc-400 uppercase">Characters</div>
            <div className="font-mono-tabular font-bold text-[#46ecd5]">{characters.length}</div>
          </button>
          <button
            onClick={() => setFilterTab('wardrobes')}
            className={`p-2 rounded-lg border text-left transition-colors ${
              filterTab === 'wardrobes'
                ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            <div className="text-[10px] text-zinc-400 uppercase">Wardrobes</div>
            <div className="font-mono-tabular font-bold text-[#46ecd5]">{wardrobes.length}</div>
          </button>
          <button
            onClick={() => setFilterTab('props')}
            className={`p-2 rounded-lg border text-left transition-colors ${
              filterTab === 'props'
                ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            <div className="text-[10px] text-zinc-400 uppercase">Props</div>
            <div className="font-mono-tabular font-bold text-[#46ecd5]">{propsList.length}</div>
          </button>
          <button
            onClick={() => setFilterTab('locations')}
            className={`p-2 rounded-lg border text-left transition-colors ${
              filterTab === 'locations'
                ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            <div className="text-[10px] text-zinc-400 uppercase">Locations</div>
            <div className="font-mono-tabular font-bold text-[#46ecd5]">{locations.length}</div>
          </button>
          <button
            onClick={() => setFilterTab('motion')}
            className={`p-2 rounded-lg border text-left transition-colors ${
              filterTab === 'motion'
                ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            <div className="text-[10px] text-zinc-400 uppercase">Motion Rigs</div>
            <div className="font-mono-tabular font-bold text-[#46ecd5]">{motionTemplates.length}</div>
          </button>
          <button
            onClick={() => setFilterTab('productions')}
            className={`p-2 rounded-lg border text-left transition-colors ${
              filterTab === 'productions'
                ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            <div className="text-[10px] text-zinc-400 uppercase">Productions</div>
            <div className="font-mono-tabular font-bold text-[#46ecd5]">{cinemaProjects.length}</div>
          </button>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => {
              setActiveProjectId(null);
              setFilterTab('all');
            }}
            className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
              activeProjectId === null && filterTab === 'all'
                ? 'bg-[#46ecd5] text-zinc-950 font-bold'
                : 'text-zinc-300 hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>All Generations</span>
            </span>
            <span className="font-mono-tabular">{generations.length}</span>
          </button>

          {projects.map((proj) => (
            <div
              key={proj.id}
              className={`group rounded-lg px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                activeProjectId === proj.id
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {editingProjId === proj.id ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await renameProject(proj.id, editingProjName);
                    setEditingProjId(null);
                  }}
                  className="flex items-center gap-1 flex-1"
                >
                  <input
                    type="text"
                    value={editingProjName}
                    onChange={(e) => setEditingProjName(e.target.value)}
                    className="w-full px-2 py-0.5 text-xs bg-zinc-900 border border-[#46ecd5] rounded text-white"
                  />
                  <button type="submit" className="text-[#46ecd5] text-xs px-1">
                    Save
                  </button>
                </form>
              ) : (
                <>
                  <button
                    onClick={() => setActiveProjectId(proj.id)}
                    className="flex items-center gap-2 truncate flex-1 text-left"
                  >
                    <Folder className="w-4 h-4 text-[#46ecd5] shrink-0" />
                    <span className="truncate">{proj.name}</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-tabular text-[11px]">
                      {proj.generationCount}
                    </span>
                    <button
                      onClick={() => {
                        setEditingProjId(proj.id);
                        setEditingProjName(proj.name);
                      }}
                      aria-label="Rename project"
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-zinc-400 hover:text-white"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (activeProjectId === proj.id) setActiveProjectId(null);
                        deleteProject(proj.id);
                      }}
                      aria-label="Delete project"
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-zinc-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateProject} className="pt-3 border-t border-white/10 space-y-2">
          <label className="text-xs font-medium text-zinc-300 block">
            New Project Folder
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Autumn Campaign"
              className="flex-1 min-w-0 h-8 text-xs"
            />
            <Button
              type="submit"
              variant="default"
              size="icon"
              aria-label="Create project"
              className="h-8 w-8 shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </aside>

      {/* Main Assets Feed */}
      <section className="min-w-0 w-full lg:col-span-9 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#111114] border border-white/10 rounded-xl">
          <AnimatedPillTabs
            layoutGroupId="assets-vault-tabs"
            value={filterTab}
            onChange={(v) => setFilterTab(v as typeof filterTab)}
            items={(
              [
                'all',
                'characters',
                'wardrobes',
                'props',
                'locations',
                'motion',
                'productions',
                'video',
                'image',
                'audio',
                'uploads',
              ] as const
            ).map((t) => ({ value: t, label: t.toUpperCase() }))}
          />

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 pr-2 border-r border-white/10">
                <span className="text-xs font-mono-tabular text-[#46ecd5]">
                  {selectedIds.length} selected
                </span>
                {projects.length > 0 && (
                  <select
                    onChange={async (e) => {
                      const val = e.target.value || null;
                      for (const id of selectedIds) {
                        await moveGenerationToProject(id, val);
                      }
                      setSelectedIds([]);
                    }}
                    className="px-2.5 py-1 text-xs bg-zinc-900 border border-white/10 rounded-lg text-white"
                  >
                    <option value="">Move to project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleBatchPublish}
                  className="px-2.5 py-1 text-xs bg-white/10 hover:bg-white/15 text-white rounded-lg"
                >
                  Publish
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="px-2.5 py-1 text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg"
                >
                  Delete
                </button>
              </div>
            )}

            <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-lg cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-[#46ecd5]" />
              <span>Upload Reference</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,audio/wav"
                onChange={handleUploadAsset}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {filterTab === 'characters' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((ch) => (
              <div
                key={ch.id}
                className="p-4 rounded-xl bg-[#111114] border border-white/10 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  {ch.faceReferenceUrl ? (
                    <img
                      src={ch.faceReferenceUrl}
                      alt={ch.name}
                      className="w-16 h-16 rounded-lg object-cover border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-xs font-mono-tabular text-[#46ecd5] shrink-0">
                      ID
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono-tabular text-[#46ecd5]">
                      {ch.identityId} · {ch.voiceId}
                    </div>
                    <h3 className="text-sm font-bold text-white truncate">{ch.name}</h3>
                    <div className="text-[11px] text-zinc-400">
                      {ch.ageRange} · {ch.skinTone} · {ch.primaryLanguage}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() =>
                      setActiveContinuity((prev) => ({
                        ...prev,
                        characterIds: [ch.id],
                      }))
                    }
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                      activeContinuity.characterIds.includes(ch.id)
                        ? 'bg-[#46ecd5] text-zinc-950'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10'
                    }`}
                  >
                    {activeContinuity.characterIds.includes(ch.id)
                      ? 'Locked in Bus'
                      : 'Lock Character'}
                  </button>
                  <button
                    onClick={() => navigate('character')}
                    className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-zinc-300"
                  >
                    Edit Studio
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : filterTab === 'wardrobes' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wardrobes.map((w) => (
              <div
                key={w.id}
                className="p-4 rounded-xl bg-[#111114] border border-white/10 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="text-[10px] font-mono-tabular text-[#46ecd5]">
                    {w.id} · {w.category}
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5">{w.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{w.description}</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() =>
                      setActiveContinuity((prev) => ({ ...prev, wardrobeId: w.id }))
                    }
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                      activeContinuity.wardrobeId === w.id
                        ? 'bg-[#46ecd5] text-zinc-950'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10'
                    }`}
                  >
                    {activeContinuity.wardrobeId === w.id ? 'Locked in Bus' : 'Lock Wardrobe'}
                  </button>
                  <button
                    onClick={() => navigate('wardrobe')}
                    className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-zinc-300"
                  >
                    Open Studio
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : filterTab === 'props' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {propsList.map((pr) => (
              <div
                key={pr.id}
                className="p-4 rounded-xl bg-[#111114] border border-white/10 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="text-[10px] font-mono-tabular text-[#46ecd5]">
                    {pr.id} · {pr.category}
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5">{pr.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{pr.description}</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() =>
                      setActiveContinuity((prev) => ({
                        ...prev,
                        propIds: [pr.id],
                      }))
                    }
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                      activeContinuity.propIds.includes(pr.id)
                        ? 'bg-[#46ecd5] text-zinc-950'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10'
                    }`}
                  >
                    {activeContinuity.propIds.includes(pr.id) ? 'Locked in Bus' : 'Lock Prop'}
                  </button>
                  <button
                    onClick={() => navigate('props')}
                    className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-zinc-300"
                  >
                    Open Studio
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : filterTab === 'locations' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="p-4 rounded-xl bg-[#111114] border border-white/10 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="text-[10px] font-mono-tabular text-[#46ecd5]">
                    {loc.locationCode} · {loc.settingType} · {loc.timeOfDay}
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5">{loc.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{loc.description}</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() =>
                      setActiveContinuity((prev) => ({ ...prev, locationId: loc.id }))
                    }
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                      activeContinuity.locationId === loc.id
                        ? 'bg-[#46ecd5] text-zinc-950'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10'
                    }`}
                  >
                    {activeContinuity.locationId === loc.id
                      ? 'Locked in Bus'
                      : 'Lock Location'}
                  </button>
                  <button
                    onClick={() => navigate('location')}
                    className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-zinc-300"
                  >
                    Open Studio
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : filterTab === 'motion' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {motionTemplates.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-xl bg-[#111114] border border-white/10 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="text-[10px] font-mono-tabular text-[#46ecd5]">
                    {m.motionCode} · {m.movementCategory}
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5">{m.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{m.motionPrompt}</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() =>
                      setActiveContinuity((prev) => ({
                        ...prev,
                        motionTemplateId: m.id,
                      }))
                    }
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                      activeContinuity.motionTemplateId === m.id
                        ? 'bg-[#46ecd5] text-zinc-950'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10'
                    }`}
                  >
                    {activeContinuity.motionTemplateId === m.id
                      ? 'Locked in Bus'
                      : 'Lock Motion Rig'}
                  </button>
                  <button
                    onClick={() => navigate('motion')}
                    className="px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-zinc-300"
                  >
                    Open Studio
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : filterTab === 'productions' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cinemaProjects.map((cp) => (
              <div
                key={cp.id}
                className="p-4 rounded-xl bg-[#111114] border border-white/10 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="text-[10px] font-mono-tabular text-[#46ecd5]">
                    {cp.id} · {cp.productionType.toUpperCase()} · {cp.scenes.length} SCENES
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">{cp.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{cp.logline}</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      setActiveContinuity((prev) => ({
                        ...prev,
                        cinemaProjectId: cp.id,
                      }));
                      navigate('cinema');
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold"
                  >
                    Open in Cinema Studio
                  </button>
                  <button
                    onClick={() => {
                      setActiveContinuity((prev) => ({
                        ...prev,
                        cinemaProjectId: cp.id,
                      }));
                      navigate('storyboard');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs border border-white/10"
                  >
                    Storyboard
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : filterTab === 'uploads' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploads.map((u) => (
              <div
                key={u.id}
                className="rounded-xl bg-[#111114] border border-white/10 overflow-hidden"
              >
                <div className="aspect-video bg-zinc-950">
                  <img
                    src={u.publicUrl}
                    alt={u.label}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3.5 flex items-center justify-between text-xs">
                  <span className="text-white font-medium truncate">{u.label}</span>
                  <span className="font-mono-tabular text-zinc-500">
                    {Math.round(u.bytes / 1024)} KB
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGenerations.map((gen) => {
              const isChecked = selectedIds.includes(gen.id);
              return (
                <div key={gen.id} className="relative">
                  <button
                    onClick={() => toggleSelect(gen.id)}
                    aria-label="Select generation"
                    className={`absolute top-2.5 left-2.5 z-20 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      isChecked
                        ? 'bg-[#46ecd5] border-[#46ecd5] text-zinc-950'
                        : 'bg-black/70 border-white/30 text-transparent hover:border-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <GenerationTile
                    gen={gen}
                    onOpenDetail={(g) => setSelectedGeneration(g)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
      </div>
    </div>
  );
};

// ============================================================================
// 5. PRICING PAGE (`/pricing`)
// ============================================================================
export const PricingPage: React.FC = () => {
  const { user, navigate, showToast } = useRuns();
  const [notifyEmail, setNotifyEmail] = useState(user?.email || '');
  const [notified, setNotified] = useState(false);

  const upcomingTiers = [
    {
      name: 'Creator Access',
      subtitle: 'For independent filmmakers & visual storytellers',
      highlights: [
        'Full access to all 12 SPACIX Production Studios',
        'Persistent Character, Wardrobe, Prop & Location continuity locks',
        'Standard 1080p & 2K Cinema Studio 4.0 generation queue',
      ],
    },
    {
      name: 'Pro Director',
      subtitle: 'For high-volume directors, commercial creators & editors',
      badge: 'MOST POPULAR',
      highlights: [
        'Priority multi-model GPU routing for Video, Image & Audio',
        '4K optical mastering, up to 50 visual references per shot',
        'Multilingual Voice Cloning, Lip Sync & Motion Control rigs',
      ],
    },
    {
      name: 'Studio & Enterprise',
      subtitle: 'For production houses, agencies & collaborative teams',
      highlights: [
        'Shared studio asset vaults & multi-seat project continuity',
        'Dedicated high-concurrency rendering & custom LUT pipelines',
        'Rollover production credit pools & priority technical desk',
      ],
    },
  ];

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail.trim()) return;
    setNotified(true);
    showToast('You are on the priority list for SPACIX Pricing & Plans launch');
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col justify-center max-w-[1240px] mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-14">
      {/* Hero Coming Soon Section */}
      <SpotlightCard className="relative rounded-3xl bg-gradient-to-b from-[#14161D] to-[#0D0E12] border border-white/10 p-8 sm:p-14 text-center overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        <BorderBeam />
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <div className="flex justify-center">
            <SpacixLogo size="md" />
          </div>

          <Badge variant="default" className="px-3.5 py-1.5 text-[11px] font-mono-tabular font-bold uppercase tracking-[0.2em]">
            <span className="w-2 h-2 rounded-full bg-[#46ecd5] animate-pulse" />
            <span>COMING SOON · OFFICIAL PRICING RELEASE</span>
          </Badge>

          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-wide text-white leading-tight">
            Tailored Studio Plans &amp; Production Pricing Coming Soon
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto">
            We are finalizing transparent, creator-first subscription plans and non-expiring production credit packages designed for solo directors, commercial agencies, and full-scale virtual film studios. During our current rollout phase, you can continue exploring and directing across all 12 SPACIX Studios seamlessly.
          </p>

          {/* Early Notification & Direct Studio Action */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
            {notified ? (
              <div className="w-full py-3 px-5 rounded-xl bg-[#46ecd5]/15 border border-[#46ecd5]/40 text-xs font-bold text-[#46ecd5] flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                <span>Priority notification registered — we will notify you as soon as plans go live.</span>
              </div>
            ) : (
              <form
                onSubmit={handleNotifySubmit}
                className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <Input
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="Enter your email for pricing launch updates..."
                  className="flex-1 h-11 rounded-xl bg-[#090A0D]"
                />
                <ShimmerButton
                  type="submit"
                  className="px-5 py-3 text-xs shrink-0"
                >
                  Notify Me
                </ShimmerButton>
              </form>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400">
            <Button
              type="button"
              variant="cyanGhost"
              size="sm"
              onClick={() => navigate('cinema')}
            >
              <span>Enter Cinema Studio 4.0</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
            <span>·</span>
            <span>No credit card required during preview access</span>
          </div>
        </div>
      </SpotlightCard>

      {/* Preview of Upcoming Architecture */}
      <div className="space-y-6">
        <div className="text-center space-y-1.5">
          <div className="text-xs font-mono-tabular uppercase tracking-widest text-[#46ecd5]">
            WHAT TO EXPECT
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white">
            Upcoming Membership &amp; Credit Architecture
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            Every tier is engineered around predictable per-shot token metering and full production continuity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {upcomingTiers.map((tier) => (
            <SpotlightCard
              key={tier.name}
              className={`p-6 rounded-2xl border flex flex-col justify-between gap-6 relative ${
                tier.badge
                  ? 'bg-[#14161C] border-[#46ecd5]/60 shadow-[0_12px_40px_rgba(70,236,213,0.08)]'
                  : 'bg-[#111216] border-white/10'
              }`}
            >
              {tier.badge && <BorderBeam />}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    {tier.name}
                  </span>
                  <Badge variant={tier.badge ? 'default' : 'outline'} className="font-mono-tabular">
                    {tier.badge || 'COMING SOON'}
                  </Badge>
                </div>

                <div>
                  <div className="font-display text-2xl font-extrabold uppercase text-white">
                    Pricing Soon to Come
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{tier.subtitle}</p>
                </div>

                <ul className="space-y-2.5 text-xs text-zinc-300 pt-2 border-t border-white/10">
                  {tier.highlights.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#46ecd5] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="py-2.5 px-4 rounded-xl bg-zinc-900/90 border border-white/10 text-center text-xs font-semibold text-zinc-400">
                Launching Soon
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 6. ACCOUNT & BILLING LEDGER PAGE (`/account` & `/account/billing`)
// ============================================================================
export const AccountBillingPage: React.FC = () => {
  const {
    user,
    sessionToken,
    setUpgradeModalOpen,
    showToast,
    navigate,
    changePassword,
    updateProfile,
    logout,
  } = useRuns();
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('billing');
  const [message, setMessage] = useState('');

  // Profile & Password Security state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  const loadAccountData = () => {
    fetch('/api/billing/ledger', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.entries) setLedger(data.entries);
      })
      .catch(() => {});

    fetch('/api/support', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tickets) setTickets(data.tickets);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (user?.name) setProfileName(user.name);
  }, [user?.name]);

  useEffect(() => {
    loadAccountData();
  }, [sessionToken, user?.credits.total]);

  const handleSubmitSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ subject, category, priority: 'medium', message }),
      });
      if (res.ok) {
        showToast('Submitted ticket to SPACIX Support Desk');
        setSubject('');
        setMessage('');
        loadAccountData();
      }
    } catch {
      showToast('Submitted ticket to SPACIX Support Desk');
    }
  };

  const handleUpdateProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    await updateProfile({ name: profileName.trim() });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }
    setPwdSaving(true);
    const res = await changePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setPwdSaving(false);
    if (!res.ok) {
      setPwdError(res.error || 'Could not update password.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-5">
        <h2 className="font-display text-3xl font-bold uppercase text-white">
          Sign in to View Your Account & Ledger
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400">
          Access your credit wallet, append-only transaction ledger, password security, and support tickets.
        </p>
        <button
          onClick={() => navigate('auth')}
          className="px-6 py-3 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold uppercase tracking-wide text-white">
            SPACIX Account, Wallet & Security
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 break-words">
            {user.name} · <span className="font-mono-tabular">{user.email}</span> · Role:{' '}
            <span className="uppercase text-zinc-200">{user.role}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {user.role === 'admin' && (
            <Button
              variant="cyanGhost"
              size="sm"
              onClick={() => navigate('admin')}
            >
              <Shield className="w-4 h-4" />
              <span>Open Admin Console</span>
            </Button>
          )}
          <ShimmerButton
            onClick={() => setUpgradeModalOpen(true)}
            className="px-3.5 py-2 text-xs"
          >
            Add Credits / Change Plan
          </ShimmerButton>
          <Button
            variant="destructive"
            size="sm"
            onClick={logout}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Profile & Password Security Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SpotlightCard className="p-5">
          <form
            onSubmit={handleUpdateProfileName}
            className="space-y-4 text-xs"
          >
            <h2 className="font-display text-xl font-bold uppercase text-white">
              Account Profile
            </h2>
            <div>
              <label className="text-zinc-400 block mb-1">Display Name</label>
              <Input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">Registered Email</label>
              <Input
                type="email"
                disabled
                value={user.email}
                className="font-mono-tabular opacity-60"
              />
            </div>
            <Button type="submit" variant="default" size="sm">
              Save Profile Name
            </Button>
          </form>
        </SpotlightCard>

        <SpotlightCard className="p-5">
          <form
            onSubmit={handleChangePassword}
            className="space-y-3.5 text-xs"
          >
            <h2 className="font-display text-xl font-bold uppercase text-white">
              Change Password
            </h2>
            {pwdError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
                {pwdError}
              </div>
            )}
            <div>
              <label className="text-zinc-400 block mb-1">Current Password</label>
              <Input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 block mb-1">New Password</label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">Confirm New Password</label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={pwdSaving}
            >
              {pwdSaving ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </SpotlightCard>
      </div>

      {/* Credit Buckets Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SpotlightCard className="p-5">
          <div className="text-xs text-zinc-400">Total Available Credits</div>
          <div className="font-display text-4xl font-black font-mono-tabular text-[#46ecd5] mt-1">
            ✦ {user.credits.total.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Subscription bucket spent first, then non-expiring top-ups
          </div>
        </SpotlightCard>
        <SpotlightCard className="p-5">
          <div className="text-xs text-zinc-400">
            Subscription Bucket ({user.plan.toUpperCase()})
          </div>
          <div className="font-display text-4xl font-black font-mono-tabular text-white mt-1">
            ✦ {user.credits.subscription.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono-tabular mt-1">
            Resets on paid invoice:{' '}
            {user.planRenewsAt
              ? new Date(user.planRenewsAt).toLocaleDateString()
              : 'No active renewal'}
          </div>
        </SpotlightCard>
        <SpotlightCard className="p-5">
          <div className="text-xs text-zinc-400">Top-Up Bucket (Never Expires)</div>
          <div className="font-display text-4xl font-black font-mono-tabular text-white mt-1">
            ✦ {user.credits.topup.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono-tabular mt-1">
            Stripe Customer: {user.stripeCustomerId || 'Lazy init at checkout'}
          </div>
        </SpotlightCard>
      </div>

      {/* Append-Only Idempotent Credit Ledger Table */}
      <div className="rounded-xl bg-[#111114] border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
            Append-Only Credit Ledger (`credit_ledger`)
          </h2>
          <Badge variant="outline" className="font-mono-tabular">
            Unique index: &#123;reason, refType, refId&#125;
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 bg-[#151519]">
                <th className="py-3 px-4 font-medium">Timestamp</th>
                <th className="py-3 px-4 font-medium">Reason</th>
                <th className="py-3 px-4 font-medium">Bucket</th>
                <th className="py-3 px-4 font-medium">Note / Reference</th>
                <th className="py-3 px-4 font-medium text-right">Delta</th>
                <th className="py-3 px-4 font-medium text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ledger.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-mono-tabular text-zinc-400">
                    {new Date(row.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-zinc-200">
                    {row.reason}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 uppercase">{row.bucket}</td>
                  <td className="py-3 px-4 text-zinc-300">
                    {row.note || `${row.refType}:${row.refId}`}
                  </td>
                  <td
                    className={`py-3 px-4 font-mono-tabular font-bold text-right ${
                      row.delta >= 0 ? 'text-[#46ecd5]' : 'text-zinc-300'
                    }`}
                  >
                    {row.delta >= 0 ? `+${row.delta}` : row.delta}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-right text-zinc-200">
                    ✦ {row.balanceAfter.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Support Tickets Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <SpotlightCard className="min-w-0 lg:col-span-5 p-4 sm:p-6">
          <form
            onSubmit={handleSubmitSupportTicket}
            className="space-y-4 text-xs"
          >
            <h2 className="font-display text-xl font-bold uppercase text-white">
              Contact SPACIX Support
            </h2>
            <div>
              <label className="text-zinc-400 block mb-1">Topic Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
                className="w-full h-9 px-3 bg-zinc-900/90 border border-white/10 rounded-xl text-white text-xs"
              >
                <option value="billing">Billing & Credits</option>
                <option value="api_provider">API Provider / Endpoint</option>
                <option value="generation_failure">Generation Refund Request</option>
                <option value="account">Account & Commercial Rights</option>
                <option value="feature_request">Feature Request</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">Subject</label>
              <Input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your question..."
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">Message</label>
              <Textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Include generation ID or invoice details if applicable..."
              />
            </div>
            <ShimmerButton
              type="submit"
              className="w-full py-2.5 px-4 text-xs"
            >
              Submit Support Ticket
            </ShimmerButton>
          </form>
        </SpotlightCard>

        <SpotlightCard className="min-w-0 lg:col-span-7 p-4 sm:p-6 space-y-4 text-xs">
          <h2 className="font-display text-xl font-bold uppercase text-white">
            Your Support Tickets ({tickets.length})
          </h2>
          {tickets.length === 0 ? (
            <p className="text-zinc-400">No support tickets submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl bg-zinc-900/70 border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tabular text-[#46ecd5] font-bold">
                      #{t.id} · {t.category.toUpperCase()}
                    </span>
                    <Badge variant="outline" className="uppercase font-mono-tabular">
                      {t.status}
                    </Badge>
                  </div>
                  <div className="font-bold text-white">{t.subject}</div>
                  {t.messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded bg-black/40 border border-white/5 text-zinc-300"
                    >
                      <span className="font-semibold text-[#46ecd5]">{m.authorName}: </span>
                      <span>{m.message}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </SpotlightCard>
      </div>
    </div>
  );
};

// ============================================================================
// 7. ADMIN CONSOLE (`/admin`)
// ============================================================================
export const AdminConsolePage: React.FC = () => {
  return <AdminDashboardView />;
};

// ============================================================================
// 8. LEGAL PAGES (`/legal/terms`, `/legal/privacy`, `/legal/acceptable-use`)
// ============================================================================
export const LegalPage: React.FC<{ section?: string }> = ({ section = 'terms' }) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div className="flex items-center gap-3">
        <SpacixLogo size="sm" />
        <span className="text-white/20">·</span>
        <Badge variant="default" className="font-mono-tabular uppercase">
          SPACIX STUDIO LEGAL DOCUMENTATION
        </Badge>
      </div>
      <h1 className="font-display text-4xl font-bold uppercase text-white">
        {section === 'privacy'
          ? 'Privacy & R2 Data Retention Policy'
          : section === 'acceptable-use'
          ? 'Acceptable Use & Content Safety Policy'
          : 'Terms of Service & Commercial License'}
      </h1>
      <SpotlightCard className="p-6 space-y-4 text-xs text-zinc-300 leading-relaxed">
        <p>
          1. <strong>Commercial Ownership</strong>: Paid Creator, Studio Plus, and Production Ultra subscribers retain full commercial rights to all images, videos, and audio synthesized in SPACIX Studio.
        </p>
        <p>
          2. <strong>Credit Metering & Refunds</strong>: Credits are debited atomically upon submission. Any run that fails upstream, is canceled while queued, or is blocked by automated content moderation (`nsfw`) is automatically and idempotently refunded to your credit ledger.
        </p>
        <p>
          3. <strong>Permanent Media Storage</strong>: While upstream inference providers retain temporary outputs for 7 days, SPACIX automatically archives completed assets to our dedicated Cloudflare R2 storage bucket (`u/&#123;userId&#125;/&#123;generationId&#125;/`).
        </p>
      </SpotlightCard>
    </div>
  );
};
