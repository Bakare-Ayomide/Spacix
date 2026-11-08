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
  } = useRuns();

  const featuredModels = models.slice(0, 6);

  return (
    <div className="space-y-16 pb-16">
      {/* Full-bleed Quanta Hero with radial teal glow + dot field */}
      <section className="relative border-b border-white/10 quanta-dot-bg overflow-hidden py-10 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(70,236,213,0.18),transparent_62%)] pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="min-w-0 lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <SpacixLogo size="md" />
              <span className="text-white/20 hidden sm:inline">·</span>
              <span className="text-[11px] sm:text-xs font-mono-tabular uppercase tracking-widest text-[#46ecd5]">
                MULTI-MODEL CINEMA, STILL & AUDIO STUDIO
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-black uppercase tracking-tight text-white leading-[0.95] break-words">
              DIRECT EVERY FRAME WITH PRECISION AI RIGS
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 max-w-xl leading-relaxed">
              Generate 4K anamorphic stills, choreographed Steadicam video sequences, and synchronized modular scores across Nano Banana 2.1, Seedance 2.5, Kling 3.0 Pro, Grok Imagine 2.0, Soul 2.0, Flux 2, and Fish Audio S2.1—backed by permanent Cloudflare R2 storage.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => navigate('video', { model: 'seedance-2-5' })}
                className="px-6 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider bg-[#46ecd5] text-zinc-950 rounded-xl hover:brightness-105 transition-all flex items-center gap-2 shadow-lg shadow-[#46ecd5]/20"
              >
                <Film className="w-4 h-4" />
                <span>Open Video Studio</span>
              </button>
              <button
                onClick={() => navigate('image', { model: 'nano-banana-2-1' })}
                className="px-5 py-3 text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl transition-colors flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4 text-[#46ecd5]" />
                <span>Image Studio</span>
              </button>
              <button
                onClick={() => navigate('audio', { model: 'sonilo-music-v2' })}
                className="px-5 py-3 text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl transition-colors flex items-center gap-2"
              >
                <Music className="w-4 h-4 text-[#46ecd5]" />
                <span>Audio & Foley</span>
              </button>
            </div>
          </div>

          {/* Right Hero Featured Preset Preview Card */}
          <div className="min-w-0 lg:col-span-5">
            {presets[0] && (
              <div className="rounded-xl bg-[#111114] border border-white/15 overflow-hidden shadow-2xl">
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
                        FEATURED CAMERA RIG · {presets[0].category.toUpperCase()}
                      </div>
                      <h2 className="font-display text-2xl font-bold uppercase text-white">
                        {presets[0].title}
                      </h2>
                    </div>
                    <button
                      onClick={() => applyPresetToDock(presets[0])}
                      className="px-3.5 py-2 text-xs font-bold bg-[#46ecd5] text-zinc-950 rounded-lg hover:brightness-105 transition-all shrink-0"
                    >
                      Use Effect
                    </button>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between text-xs text-zinc-400">
                  <span className="truncate">{presets[0].promptTemplate}</span>
                  <span className="font-mono-tabular text-zinc-300 shrink-0 ml-3">
                    SPACIX DoP v2
                  </span>
                </div>
              </div>
            )}
          </div>
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
            const cost = priceFor(model.id, defaultSettings, []);

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
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 space-y-8">
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
  } = useRuns();

  const [filterTab, setFilterTab] = useState<
    'all' | 'image' | 'video' | 'audio' | 'uploads'
  >('all');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingProjId, setEditingProjId] = useState<string | null>(null);
  const [editingProjName, setEditingProjName] = useState('');

  const filteredGenerations = generations
    .filter((g) => (activeProjectId ? g.projectId === activeProjectId : true))
    .filter((g) => {
      if (filterTab === 'all' || filterTab === 'uploads') return true;
      return g.surface === filterTab;
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
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Projects Sidebar */}
      <aside className="min-w-0 w-full lg:col-span-3 bg-[#111114] border border-white/10 rounded-xl p-4 space-y-5">
        <div>
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
            SPACIX Vault & Projects
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Backed by Cloudflare R2 permanent object storage
          </p>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => setActiveProjectId(null)}
            className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
              activeProjectId === null
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
            {(['all', 'video', 'image', 'audio', 'uploads'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterTab(t)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase rounded-md transition-colors ${
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

        {filterTab === 'uploads' ? (
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
  );
};

// ============================================================================
// 5. PRICING PAGE (`/pricing`)
// ============================================================================
export const PricingPage: React.FC = () => {
  const { user, plans, topups, checkoutPlanOrTopup } = useRuns();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-12 space-y-14">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="flex justify-center">
          <SpacixLogo size="md" />
        </div>
        <div className="text-xs font-mono-tabular uppercase tracking-widest text-[#46ecd5]">
          TRANSPARENT CREDIT METERING · STRIPE BILLING
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-wide text-white">
          SPACIX PLANS & PRODUCTION CREDITS
        </h1>
        <p className="text-sm text-zinc-400">
          Subscription credits reset each billing cycle. Top-up packs never expire and are spent only after your monthly allowance is exhausted.
        </p>

        <div className="inline-flex items-center gap-1 p-1 bg-[#111114] border border-white/10 rounded-xl">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              billingCycle === 'annual'
                ? 'bg-[#46ecd5] text-zinc-950'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Annual Billing · Save 20%
          </button>
        </div>
      </div>

      {/* 4 Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => {
          const price =
            billingCycle === 'annual' ? plan.annualMonthlyUsd : plan.monthlyUsd;
          const isCurrent = user?.plan === plan.id;

          return (
            <div
              key={plan.id}
              className={`p-6 rounded-xl border flex flex-col justify-between gap-6 ${
                plan.id === 'plus'
                  ? 'bg-[#141418] border-[#46ecd5]'
                  : 'bg-[#111114] border-white/10'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-zinc-300">
                    {plan.name}
                  </span>
                  {plan.badge && (
                    <span className="text-[#46ecd5] font-mono-tabular font-semibold">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-5xl font-black font-mono-tabular text-white">
                      ${price}
                    </span>
                    <span className="text-xs text-zinc-400">/ month</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{plan.audience}</p>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900 border border-white/5 space-y-1">
                  <div className="font-mono-tabular text-sm font-bold text-[#46ecd5]">
                    ✦ {plan.monthlyCredits.toLocaleString()} credits / mo
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono-tabular">
                    Parallel: {plan.parallelLimits.video} video · {plan.parallelLimits.image} image · $1 = {plan.topupRatePerDollar} top-up credits
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-zinc-300">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#46ecd5] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.id === 'free' ? (
                <div className="py-2.5 px-4 text-center text-xs font-semibold text-zinc-500 border border-white/10 rounded-lg">
                  Included on Signup
                </div>
              ) : (
                <button
                  onClick={() =>
                    checkoutPlanOrTopup({
                      kind: 'subscription',
                      planId: plan.id,
                      billingCycle,
                    })
                  }
                  className={`w-full py-3 px-4 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-white/15 text-white hover:bg-white/20'
                      : 'bg-[#46ecd5] text-zinc-950 hover:brightness-105'
                  }`}
                >
                  {isCurrent ? 'Current Plan (Reset Cycle)' : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Top-up Credit Packs */}
      <div className="p-8 rounded-xl bg-[#111114] border border-white/10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase text-white">
              One-Time Credit Top-Up Packs
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Never expire · Higher subscription tiers unlock bonus credits per dollar automatically
            </p>
          </div>
          <div className="text-xs font-mono-tabular text-zinc-400">
            Active Tier Bonus Rate:{' '}
            <span className="text-[#46ecd5]">
              $1 ={' '}
              {plans.find((p) => p.id === (user?.plan || 'free'))
                ?.topupRatePerDollar || 80}{' '}
              credits
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topups.map((pack) => (
            <div
              key={pack.id}
              className="p-5 rounded-xl bg-[#16161A] border border-white/10 flex items-center justify-between gap-4"
            >
              <div>
                <div className="text-xs text-zinc-400">{pack.name}</div>
                <div className="text-2xl font-bold font-mono-tabular text-white mt-0.5">
                  ✦ {pack.credits.toLocaleString()}
                </div>
                {pack.tag && (
                  <div className="text-[11px] text-[#46ecd5] mt-0.5">{pack.tag}</div>
                )}
              </div>
              <button
                onClick={() =>
                  checkoutPlanOrTopup({ kind: 'topup', topupId: pack.id })
                }
                className="px-4 py-2.5 text-xs font-bold bg-[#46ecd5] text-zinc-950 rounded-lg hover:brightness-105 transition-all shrink-0"
              >
                Buy · ${pack.priceUsd}
              </button>
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
