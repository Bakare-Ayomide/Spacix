import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  CreditCard,
  Download,
  Edit3,
  Film,
  Flag,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Music,
  Search,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';
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
import { Badge, Button } from './ui/primitives';
import { BorderBeam, ShimmerButton, SpotlightCard } from './ui/aceternity-magic';

// ============================================================================
// 1. EXPLORE / HOME PAGE (`/`)
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
    motionTemplates,
    cinemaProjects,
    calculateTokenCost,
  } = useRuns();

  const featuredModels = models.slice(0, 6);

  return (
    <div className="space-y-16 pb-16">
      {/* Full-bleed Quanta Hero with radial teal glow + dot field */}
      <section className="relative border-b border-white/10 quanta-dot-bg overflow-hidden py-10 sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(70,236,213,0.18),transparent_62%)] pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="min-w-0 lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <SpacixLogo size="md" />
              <span className="text-white/20 hidden sm:inline">·</span>
              <Badge variant="default" className="font-mono uppercase tracking-widest">
                UNIFIED AI FILM PRODUCTION ENVIRONMENT
              </Badge>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-black uppercase tracking-tight text-white leading-[0.95] break-words">
              ONE UNIFIED CINEMA STUDIO FOR COMPLETE FILMMAKING
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 max-w-xl leading-relaxed">
              Direct complete films inside one streamlined workspace. Create persistent characters, locations, wardrobes, and props; generate cinema video, photography, voice dialogue, lip sync, and scores; or run the 4-Stage Automatic Production pipeline from idea to finished cut.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <ShimmerButton
                onClick={() => navigate('cinema')}
                className="px-6 py-3 rounded-xl text-xs sm:text-sm"
              >
                <Film className="w-4 h-4" />
                <span>Enter Cinema Studio</span>
              </ShimmerButton>
              <Button
                variant="accent"
                size="lg"
                onClick={() => navigate('cinema', { mode: 'automatic' })}
              >
                <span>Launch Automatic Production (4-Stage)</span>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('cinema', { tab: 'elements' })}
              >
                <span>
                  My Elements (
                  {characters.length + locations.length + wardrobes.length + propsList.length})
                </span>
              </Button>
            </div>
          </div>

          {/* Right Hero Featured Preset Preview Card with Magic UI BorderBeam */}
          <div className="min-w-0 lg:col-span-5">
            {presets[0] && (
              <SpotlightCard className="overflow-hidden shadow-2xl">
                <BorderBeam />
                <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                  <img
                    src={presets[0].previewSvgDataUrl}
                    alt={presets[0].title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-mono-tabular text-[#46ecd5]">
                        CINEMA STUDIO 4.0 · {presets[0].category.toUpperCase()}
                      </div>
                      <h2 className="font-display text-2xl font-bold uppercase text-white">
                        {presets[0].title}
                      </h2>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate('cinema')}
                      className="shrink-0"
                    >
                      Direct in Studio
                    </Button>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between text-xs text-zinc-400">
                  <span className="truncate">{presets[0].promptTemplate}</span>
                  <Badge variant="outline" className="font-mono shrink-0 ml-3">
                    Cinema Studio
                  </Badge>
                </div>
              </SpotlightCard>
            )}
          </div>
        </div>
      </section>

      {/* UNIFIED CINEMA STUDIO CAPABILITIES OVERVIEW */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono-tabular uppercase tracking-widest text-[#46ecd5]">
              ALL CREATION TOOLS INSIDE ONE WORKSPACE
            </div>
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white mt-0.5">
              00. Inside Cinema Studio
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Production Elements, Media Generation, Film Production, and 4-Stage Automatic Film Creation—unified in a single studio environment.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular">
            <Badge variant="secondary">
              Characters: <strong className="text-[#46ecd5] ml-1">{characters.length}</strong>
            </Badge>
            <Badge variant="secondary">
              Locations: <strong className="text-[#46ecd5] ml-1">{locations.length}</strong>
            </Badge>
            <Badge variant="secondary">
              Wardrobes: <strong className="text-[#46ecd5] ml-1">{wardrobes.length}</strong>
            </Badge>
            <Badge variant="secondary">
              Props: <strong className="text-[#46ecd5] ml-1">{propsList.length}</strong>
            </Badge>
            <Badge variant="secondary">
              Projects: <strong className="text-[#46ecd5] ml-1">{cinemaProjects.length}</strong>
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              badge: '01 · PRODUCTION ELEMENTS',
              title: 'Characters, Sets, Wardrobes & Props',
              desc: 'Create permanent character facial identities, INT./EXT. locations, outfits, props, and up to 50 visual references per shot.',
              action: () =>
                navigate('cinema', {
                  category: 'production_elements',
                  tool: 'character_identity',
                }),
            },
            {
              badge: '02 · MEDIA GENERATION',
              title: 'Image, Video, Voice, Lip Sync & Music',
              desc: 'Intelligent model-capability routing automatically connects each creative task to the right image, video, speech, or music engine.',
              action: () =>
                navigate('cinema', { category: 'media_generation', tool: 'video_creation' }),
            },
            {
              badge: '03 · FILM PRODUCTION',
              title: 'Screenplay, Storyboard & Sequencing',
              desc: 'Write scripts, break down scenes, plan camera angles and lighting schemes, and assemble multi-track sequences.',
              action: () =>
                navigate('cinema', { category: 'film_production', tool: 'storyboard_planning' }),
            },
            {
              badge: '04 · AUTOMATIC PRODUCTION',
              title: '4-Stage Guided Film Creation',
              desc: 'Go from raw idea to approved screenplay, extracted production assets, continuity storyboard frames, and animated video clips.',
              action: () => navigate('cinema', { mode: 'automatic' }),
            },
          ].map((card) => (
            <SpotlightCard
              key={card.badge}
              onClick={card.action}
              className="group cursor-pointer p-5 hover:border-[#46ecd5]/60 text-left flex flex-col justify-between gap-4 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#46ecd5]">
                  <span>{card.badge}</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">
                    OPEN →
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-white group-hover:text-[#46ecd5] transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{card.desc}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* Top Verified Models Grid */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
              01. Production Model Catalog
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Curated cinema video, optical still, and studio audio architectures with deterministic credit metering
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('video')}
              className="text-xs font-semibold text-[#46ecd5] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>Explore all {models.length} models</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredModels.map((model) => {
            const defaultSettings: Record<string, string | number | boolean> = {};
            for (const s of model.settings) defaultSettings[s.key] = s.defaultValue;
            const cost = calculateTokenCost(model.id, defaultSettings, []);

            return (
              <div
                key={model.id}
                onClick={() =>
                  navigate(model.surface, {
                    model: model.id,
                  })
                }
                className={`group cursor-pointer p-5 rounded-xl border border-white/10 hover:border-[#46ecd5]/60 bg-gradient-to-br ${model.previewGradient} flex flex-col justify-between gap-5 transition-all`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <ProviderBrandIcon provider={model.provider} size={15} />
                      <span>{model.provider} · {model.surface.toUpperCase()}</span>
                    </span>
                    <span className="font-mono-tabular text-[#46ecd5]">
                      from ✦ {cost}
                    </span>
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
                      <span
                        key={badge}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-black/50 border border-white/10 text-[11px] font-mono-tabular text-[#46ecd5]"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 truncate text-[11px]">
                      Best for: {model.bestFor}
                    </span>
                    <span className="text-white font-semibold group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                      Launch →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Camera & Visual Effects Strip */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
              02. Camera Rigs & Visual Effects
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Pre-configured lens choreography, Nano Banana architectural twilight, and probe macro templates
            </p>
          </div>
          <button
            onClick={() => navigate('effects')}
            className="text-xs font-semibold text-[#46ecd5] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>All Effects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.slice(0, 3).map((preset) => (
            <div
              key={preset.id}
              className="rounded-xl bg-[#111114] border border-white/10 hover:border-white/25 overflow-hidden flex flex-col justify-between transition-all"
            >
              <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                <img
                  src={preset.previewSvgDataUrl}
                  alt={preset.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <div className="text-[11px] text-zinc-400">
                    <span>{preset.category}</span>
                    <span className="mx-1.5">·</span>
                    <span>{preset.surface.toUpperCase()}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {preset.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {preset.description}
                  </p>
                </div>
                <button
                  onClick={() => applyPresetToDock(preset)}
                  className="w-full py-2 px-3 text-xs font-bold bg-[#46ecd5] text-zinc-950 rounded-lg hover:brightness-105 transition-all"
                >
                  Use Effect in Studio
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Public Community Teaser */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
              03. SPACIX Community Showcase
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Recent R2-archived masters published by SPACIX directors — click any work to inspect or recreate
            </p>
          </div>
          <button
            onClick={() => navigate('community')}
            className="text-xs font-semibold text-[#46ecd5] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Open Community Feed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
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

        <div className="flex items-center gap-1 p-1 bg-[#111114] border border-white/10 rounded-lg max-w-full overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat
                  ? 'bg-[#46ecd5] text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {selectedPreset && (
        <div className="p-6 rounded-xl bg-[#111114] border border-[#46ecd5]/50 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
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
              <div className="text-xs text-[#46ecd5] font-mono-tabular">
                {selectedPreset.category.toUpperCase()} · {selectedPreset.surface.toUpperCase()}
              </div>
              <button
                onClick={() => setSelectedPreset(null)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Close Inspector
              </button>
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
              <button
                onClick={() => applyPresetToDock(selectedPreset)}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#46ecd5] text-zinc-950 rounded-lg hover:brightness-105 transition-all"
              >
                Use Effect in Studio
              </button>
              <span className="text-xs text-zinc-400">
                Target Model:{' '}
                <strong className="text-zinc-200">
                  {models.find((m) => m.id === selectedPreset.modelId)?.label ||
                    selectedPreset.modelId}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((preset) => {
          const model = models.find((m) => m.id === preset.modelId);
          return (
            <div
              key={preset.id}
              className="rounded-xl bg-[#111114] border border-white/10 hover:border-white/25 overflow-hidden flex flex-col justify-between transition-all"
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
                    <span>{preset.category}</span>
                    <span>·</span>
                    <span>{model?.label || preset.modelId}</span>
                  </div>
                  <h3
                    onClick={() => setSelectedPreset(preset)}
                    className="text-lg font-bold text-white mt-1 cursor-pointer hover:text-[#46ecd5]"
                  >
                    {preset.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                  <button
                    onClick={() => applyPresetToDock(preset)}
                    className="flex-1 py-2 px-3 text-xs font-bold bg-[#46ecd5] text-zinc-950 rounded-lg hover:brightness-105 transition-all"
                  >
                    Use Effect
                  </button>
                  <button
                    onClick={() => setSelectedPreset(preset)}
                    className="py-2 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 rounded-lg"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            </div>
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
          <div className="flex items-center gap-1 p-1 bg-[#111114] border border-white/10 rounded-lg max-w-full overflow-x-auto no-scrollbar">
            {(['all', 'video', 'image', 'audio'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSurfaceFilter(s)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase rounded-md transition-colors shrink-0 ${
                  surfaceFilter === s
                    ? 'bg-[#46ecd5] text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by prompt or model..."
              className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs bg-[#111114] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#46ecd5]"
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
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => reuseGenerationInDock(gen, false)}
                  className="text-[#46ecd5] hover:underline font-medium"
                >
                  Recreate
                </button>
                <button
                  onClick={(e) => downloadGeneration(gen, e)}
                  title="Download generation"
                  aria-label="Download generation"
                  className="p-1 rounded bg-white/5 hover:bg-[#46ecd5] text-zinc-300 hover:text-zinc-950 border border-white/10 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleReport(gen.id)}
                  title="Report community item"
                  aria-label="Report community item"
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
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
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Autumn Campaign"
              className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-zinc-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#46ecd5]"
            />
            <button
              type="submit"
              aria-label="Create project"
              className="p-2 bg-[#46ecd5] text-zinc-950 rounded-lg hover:brightness-105 shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
        </form>
      </aside>

      {/* Main Assets Feed */}
      <section className="min-w-0 w-full lg:col-span-9 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#111114] border border-white/10 rounded-xl">
          <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg max-w-full overflow-x-auto no-scrollbar">
            {(
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
            ).map((t) => (
              <button
                key={t}
                onClick={() => setFilterTab(t)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filterTab === t
                    ? 'bg-[#46ecd5] text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

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
      <div className="relative rounded-3xl bg-gradient-to-b from-[#14161D] to-[#0D0E12] border border-white/10 p-8 sm:p-14 text-center overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <div className="flex justify-center">
            <SpacixLogo size="md" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#46ecd5]/10 border border-[#46ecd5]/30 text-[11px] font-mono-tabular font-bold uppercase tracking-[0.2em] text-[#46ecd5]">
            <span className="w-2 h-2 rounded-full bg-[#46ecd5] animate-pulse" />
            <span>COMING SOON · OFFICIAL PRICING RELEASE</span>
          </div>

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
                <input
                  type="email"
                  required
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="Enter your email for pricing launch updates..."
                  className="flex-1 px-4 py-3 rounded-xl bg-[#090A0D] border border-white/15 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#46ecd5]"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-[#46ecd5] hover:brightness-110 text-zinc-950 text-xs font-extrabold uppercase tracking-wider transition-all shrink-0"
                >
                  Notify Me
                </button>
              </form>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400">
            <button
              type="button"
              onClick={() => navigate('cinema')}
              className="inline-flex items-center gap-1.5 text-[#46ecd5] font-bold hover:underline"
            >
              <span>Enter Cinema Studio 4.0</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span>·</span>
            <span>No credit card required during preview access</span>
          </div>
        </div>
      </div>

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
            <div
              key={tier.name}
              className={`p-6 rounded-2xl border flex flex-col justify-between gap-6 ${
                tier.badge
                  ? 'bg-[#14161C] border-[#46ecd5]/60 shadow-[0_12px_40px_rgba(70,236,213,0.08)]'
                  : 'bg-[#111216] border-white/10'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    {tier.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono-tabular font-semibold text-[#46ecd5]">
                    {tier.badge || 'COMING SOON'}
                  </span>
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
            </div>
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
            <button
              onClick={() => navigate('admin')}
              className="px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-[#46ecd5] border border-[#46ecd5]/30 rounded-lg flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>Open Admin Console</span>
            </button>
          )}
          <button
            onClick={() => setUpgradeModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold bg-[#46ecd5] text-zinc-950 rounded-lg hover:brightness-105"
          >
            Add Credits / Change Plan
          </button>
          <button
            onClick={logout}
            className="px-3.5 py-2 text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Profile & Password Security Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form
          onSubmit={handleUpdateProfileName}
          className="p-5 rounded-xl bg-[#111114] border border-white/10 space-y-4 text-xs"
        >
          <h2 className="font-display text-xl font-bold uppercase text-white">
            Account Profile
          </h2>
          <div>
            <label className="text-zinc-400 block mb-1">Display Name</label>
            <input
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="text-zinc-400 block mb-1">Registered Email</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full px-3 py-2 bg-zinc-950 border border-white/5 rounded-lg text-zinc-500 font-mono-tabular"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider"
          >
            Save Profile Name
          </button>
        </form>

        <form
          onSubmit={handleChangePassword}
          className="p-5 rounded-xl bg-[#111114] border border-white/10 space-y-3.5 text-xs"
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
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 block mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pwdSaving}
            className="px-4 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {pwdSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Credit Buckets Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-[#111114] border border-white/10">
          <div className="text-xs text-zinc-400">Total Available Credits</div>
          <div className="font-display text-4xl font-black font-mono-tabular text-[#46ecd5] mt-1">
            ✦ {user.credits.total.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Subscription bucket spent first, then non-expiring top-ups
          </div>
        </div>
        <div className="p-5 rounded-xl bg-[#111114] border border-white/10">
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
        </div>
        <div className="p-5 rounded-xl bg-[#111114] border border-white/10">
          <div className="text-xs text-zinc-400">Top-Up Bucket (Never Expires)</div>
          <div className="font-display text-4xl font-black font-mono-tabular text-white mt-1">
            ✦ {user.credits.topup.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 font-mono-tabular mt-1">
            Stripe Customer: {user.stripeCustomerId || 'Lazy init at checkout'}
          </div>
        </div>
      </div>

      {/* Append-Only Idempotent Credit Ledger Table */}
      <div className="rounded-xl bg-[#111114] border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
            Append-Only Credit Ledger (`credit_ledger`)
          </h2>
          <span className="text-xs font-mono-tabular text-zinc-400">
            Unique index: &#123;reason, refType, refId&#125;
          </span>
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
        <form
          onSubmit={handleSubmitSupportTicket}
          className="min-w-0 lg:col-span-5 p-4 sm:p-6 rounded-xl bg-[#111114] border border-white/10 space-y-4 text-xs"
        >
          <h2 className="font-display text-xl font-bold uppercase text-white">
            Contact SPACIX Support
          </h2>
          <div>
            <label className="text-zinc-400 block mb-1">Topic Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
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
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your question..."
              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="text-zinc-400 block mb-1">Message</label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Include generation ID or invoice details if applicable..."
              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-white"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 px-4 font-bold uppercase tracking-wider bg-[#46ecd5] text-zinc-950 rounded-lg"
          >
            Submit Support Ticket
          </button>
        </form>

        <div className="min-w-0 lg:col-span-7 p-4 sm:p-6 rounded-xl bg-[#111114] border border-white/10 space-y-4 text-xs">
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
                    <span className="uppercase font-mono-tabular text-zinc-300">
                      {t.status}
                    </span>
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
        </div>
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
        <span className="text-xs font-mono-tabular uppercase text-[#46ecd5]">
          SPACIX STUDIO LEGAL DOCUMENTATION
        </span>
      </div>
      <h1 className="font-display text-4xl font-bold uppercase text-white">
        {section === 'privacy'
          ? 'Privacy & R2 Data Retention Policy'
          : section === 'acceptable-use'
          ? 'Acceptable Use & Content Safety Policy'
          : 'Terms of Service & Commercial License'}
      </h1>
      <div className="p-6 rounded-xl bg-[#111114] border border-white/10 space-y-4 text-xs text-zinc-300 leading-relaxed">
        <p>
          1. <strong>Commercial Ownership</strong>: Paid Creator, Studio Plus, and Production Ultra subscribers retain full commercial rights to all images, videos, and audio synthesized in SPACIX Studio.
        </p>
        <p>
          2. <strong>Credit Metering & Refunds</strong>: Credits are debited atomically upon submission. Any run that fails upstream, is canceled while queued, or is blocked by automated content moderation (`nsfw`) is automatically and idempotently refunded to your credit ledger.
        </p>
        <p>
          3. <strong>Permanent Media Storage</strong>: While upstream inference providers retain temporary outputs for 7 days, SPACIX automatically archives completed assets to our dedicated Cloudflare R2 storage bucket (`u/&#123;userId&#125;/&#123;generationId&#125;/`).
        </p>
      </div>
    </div>
  );
};
