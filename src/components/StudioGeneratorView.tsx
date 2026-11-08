import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  ChevronRight,
  Download,
  Film,
  Globe,
  HelpCircle,
  History,
  LayoutGrid,
  Loader2,
  Music,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  GenerationRecord,
  MediaKind,
  MediaRole,
  Surface,
} from '../types/studio';
import {
  getModelById,
  getModelsBySurface,
  resolveProviderSpec,
} from '../catalog/models';
import { priceFor } from '../billing/price';
import { useRuns } from '../lib/useRuns';
import {
  AssetLibraryModal,
  ModelPickerModal,
  SettingsDialog,
} from './StudioModals';
import {
  ProviderBrandIcon,
  SpacixLogo,
} from './ProviderBrandIcon';

const SAMPLE_PROMPTS: Record<Surface, string[]> = {
  video: [
    'Low-angle Steadicam tracking shot following a matte-black endurance prototype exiting an alpine tunnel at dawn, 35mm anamorphic lens flare, wet asphalt reflections.',
    'Hitchcock dolly-zoom contrazoom on an astronaut standing inside a brutalist botanical conservatory, mist rising from dark ferns, volumetric sunbeams.',
    'Laowa 24mm f/14 macro probe lens gliding continuously through floating droplets of roasting espresso and golden crema at 1000fps.',
  ],
  image: [
    '2.39:1 anamorphic film still of a master horologist in a dimly lit Geneva workshop, tungsten key light, oval bokeh, Kodak Vision3 500T 5219 grain.',
    'Architectural monolith house carved into black Icelandic basalt sea cliffs during blue hour, warm interior hearth glow, Leica 35mm Summilux.',
    'Studio product photography of a machined titanium field synthesizer on raw travertine stone, crisp rim lighting, tactile knurled dials.',
  ],
  audio: [
    'Propulsive analog Buchla 200e arpeggio at 118 BPM with deep contrabass brass swells and taut metallic clockwork percussion.',
    'Late-night rain on a glass atrium roof blended with warm Rhodes electric piano chords and subtle tape flutter.',
    'Binaural mechanical camera shutter sequence followed by a deep sub-bass cinema horizon impact.',
  ],
};

export const GenerationTile: React.FC<{
  gen: GenerationRecord;
  onOpenDetail: (gen: GenerationRecord) => void;
}> = ({ gen, onOpenDetail }) => {
  const {
    cancelGeneration,
    reuseGenerationInDock,
    togglePublishGeneration,
    deleteGeneration,
    downloadGeneration,
  } = useRuns();
  const [elapsedSec, setElapsedSec] = useState(1);

  const isRunning =
    gen.status === 'pending_submit' ||
    gen.status === 'queued' ||
    gen.status === 'in_progress';

  useEffect(() => {
    if (!isRunning) return;
    const update = () => {
      const diff = Math.max(
        1,
        Math.round((Date.now() - new Date(gen.createdAt).getTime()) / 1000)
      );
      setElapsedSec(diff);
    };
    update();
    const t = setInterval(update, 500);
    return () => clearInterval(t);
  }, [isRunning, gen.createdAt]);

  const out = gen.outputs[0];

  if (isRunning) {
    return (
      <div className="rounded-xl bg-[#141418] border border-[#46ecd5]/40 p-5 flex flex-col justify-between min-h-[240px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#46ecd5]/10 via-transparent to-transparent animate-pulse pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#46ecd5] font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {gen.status === 'queued'
                ? 'QUEUED IN STUDIO CLUSTER'
                : 'SYNTHESIZING MASTER'}
            </span>
          </div>
          <span className="font-mono-tabular text-zinc-400">{elapsedSec}s elapsed</span>
        </div>

        <div className="relative z-10 my-4 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white">{gen.modelLabel}</span>
            <span className="text-[11px] font-mono-tabular uppercase text-zinc-400">
              {gen.surface}
            </span>
          </div>
          <p className="text-xs text-zinc-400 line-clamp-2">{gen.prompt}</p>
        </div>

        <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-[11px] font-mono-tabular text-zinc-400">
            Reserved: ✦ {gen.cost} credits
          </span>
          {(gen.status === 'queued' || gen.status === 'pending_submit') && (
            <button
              onClick={() => cancelGeneration(gen.id)}
              className="px-3 py-1 text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg transition-colors"
            >
              Cancel & Refund
            </button>
          )}
        </div>
      </div>
    );
  }

  if (gen.status === 'failed' || gen.status === 'nsfw' || gen.status === 'canceled') {
    const isNsfw = gen.status === 'nsfw';
    return (
      <div className="rounded-xl bg-[#141418] border border-rose-500/30 p-5 flex flex-col justify-between min-h-[220px]">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-rose-400 font-semibold">
            {isNsfw ? <Ban className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>
              {isNsfw
                ? 'CONTENT FILTER BLOCKED'
                : gen.status === 'canceled'
                ? 'CANCELED BY USER'
                : 'GENERATION FAILED'}
            </span>
          </div>
          <span className="font-mono-tabular text-[#46ecd5]">
            +✦ {gen.cost} refunded
          </span>
        </div>

        <div className="my-3 space-y-1">
          <div className="text-xs font-semibold text-zinc-200">{gen.modelLabel}</div>
          <p className="text-xs text-zinc-400 line-clamp-2">{gen.prompt}</p>
          <p className="text-[11px] text-rose-300/90 pt-1">
            {gen.error || 'Blocked by content filter. Credits refunded.'}
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <button
            onClick={() => reuseGenerationInDock(gen, false)}
            className="text-xs text-zinc-300 hover:text-[#46ecd5] inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Edit & Retry</span>
          </button>
          <button
            onClick={() => deleteGeneration(gen.id)}
            aria-label="Delete failed tile"
            className="text-xs text-zinc-500 hover:text-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-xl bg-[#121216] border border-white/10 hover:border-white/25 overflow-hidden flex flex-col justify-between transition-all">
      <div
        onClick={() => onOpenDetail(gen)}
        className="relative aspect-video bg-[#09090B] cursor-pointer overflow-hidden flex items-center justify-center"
      >
        {out?.kind === 'audio' ? (
          <div
            className="w-full h-full p-5 flex flex-col justify-between bg-gradient-to-br from-[#46ecd5]/15 via-zinc-900 to-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular text-[#46ecd5] font-semibold">
                AUDIO MASTER · {out.durationSec || 15}S
              </span>
              <Music className="w-4 h-4 text-[#46ecd5]" />
            </div>
            <div className="flex items-end gap-1 h-12 my-2">
              {(out.waveform || [35, 65, 80, 45, 90, 55, 70, 40, 85, 60, 75, 50, 95, 62, 48, 72]).map(
                (bar, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${Math.max(18, bar)}%` }}
                    className="flex-1 bg-[#46ecd5]/75 rounded-t"
                  />
                )
              )}
            </div>
            <audio controls src={out.url} className="w-full h-8" />
          </div>
        ) : out ? (
          <>
            {out.kind === 'video' &&
            (out.url.endsWith('.mp4') ||
              out.url.endsWith('.webm') ||
              out.url.includes('vm.runware.ai') ||
              out.url.startsWith('data:video/')) ? (
              <video
                src={out.url}
                muted
                autoPlay
                loop
                playsInline
                controls
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            ) : (
              <img
                src={out.url}
                alt={gen.prompt}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </>
        ) : null}

        {/* Top-Right Action Rail (Visible on mobile, hover on desktop) */}
        <div
          className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => reuseGenerationInDock(gen, false)}
            title="Reuse prompt & settings"
            aria-label="Reuse prompt & settings"
            className="p-2 rounded-lg bg-black/80 hover:bg-[#46ecd5] text-white hover:text-zinc-950 border border-white/15 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {gen.surface === 'image' && (
            <button
              onClick={() => reuseGenerationInDock(gen, true)}
              title="Animate image in Video Studio"
              aria-label="Animate image in Video Studio"
              className="p-2 rounded-lg bg-black/80 hover:bg-[#46ecd5] text-white hover:text-zinc-950 border border-white/15 transition-colors"
            >
              <Film className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => togglePublishGeneration(gen.id, !gen.isPublic)}
            title={gen.isPublic ? 'Unpublish from Community' : 'Publish to Community'}
            aria-label={gen.isPublic ? 'Unpublish from Community' : 'Publish to Community'}
            className={`p-2 rounded-lg border transition-colors ${
              gen.isPublic
                ? 'bg-[#46ecd5] text-zinc-950 border-[#46ecd5]'
                : 'bg-black/80 text-white hover:bg-white/20 border-white/15'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
          </button>
          {out && (
            <button
              type="button"
              onClick={(e) => downloadGeneration(gen, e)}
              title="Download asset"
              aria-label="Download asset"
              className="p-2 rounded-lg bg-black/80 hover:bg-[#46ecd5] text-white hover:text-zinc-950 border border-white/15 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3.5 flex flex-col justify-between gap-2 min-w-0">
        <p
          onClick={() => onOpenDetail(gen)}
          className="text-xs text-zinc-200 line-clamp-2 cursor-pointer hover:text-white break-words"
        >
          {gen.prompt}
        </p>
        <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 pt-1.5 border-t border-white/5">
          <div className="flex items-center gap-1.5 truncate min-w-0">
            <span className="uppercase font-mono-tabular text-zinc-400 shrink-0">
              {gen.surface}
            </span>
            <span>·</span>
            <span className="text-zinc-300 font-medium truncate">{gen.modelLabel}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono-tabular text-[#46ecd5]">✦ {gen.cost}</span>
            {out && (
              <button
                type="button"
                onClick={(e) => downloadGeneration(gen, e)}
                title="Download generated media"
                aria-label="Download generated media"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-[#46ecd5] text-zinc-300 hover:text-zinc-950 border border-white/10 transition-colors inline-flex items-center justify-center"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const StudioGeneratorView: React.FC<{ surface: Surface }> = ({ surface }) => {
  const {
    dockDraft,
    setDockDraft,
    applyModelToDock,
    submitGeneration,
    cancelGeneration,
    generations,
    setSelectedGeneration,
    presets,
    applyPresetToDock,
  } = useRuns();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assetModalRole, setAssetModalRole] = useState<{
    open: boolean;
    role: MediaRole;
    kind: MediaKind;
  }>({ open: false, role: 'start', kind: 'image' });
  const [rightTab, setRightTab] = useState<'history' | 'how-it-works'>('history');
  const [gridCols, setGridCols] = useState<2 | 3>(2);
  const [submitting, setSubmitting] = useState(false);

  // Sync dock surface when route changes
  useEffect(() => {
    if (dockDraft.surface !== surface) {
      const surfaceModels = getModelsBySurface(surface);
      if (surfaceModels[0]) {
        applyModelToDock(surfaceModels[0].id, surface);
      }
    }
  }, [surface, dockDraft.surface, applyModelToDock]);

  const activeModel =
    getModelById(dockDraft.modelId) || getModelsBySurface(surface)[0];

  const activeProviderSpec = resolveProviderSpec(activeModel, dockDraft.apiProvider);

  const creditCost = priceFor(
    activeModel.id,
    dockDraft.settings,
    dockDraft.media,
    { apiProvider: activeProviderSpec.providerId }
  );

  const surfaceGenerations = generations.filter((g) => g.surface === surface);
  const queuedRun = surfaceGenerations.find(
    (g) => g.status === 'queued' || g.status === 'pending_submit'
  );

  // Validate required media slots or prompt for button tooltip
  let invalidReason: string | null = null;
  if (activeModel.requirePrompt && !dockDraft.prompt.trim()) {
    invalidReason = 'Enter a prompt in the dock to generate';
  } else {
    for (const r of activeModel.roles) {
      if (r.required && !dockDraft.media.some((m) => m.role === r.role)) {
        invalidReason = `Attach required ${r.label} before generating`;
        break;
      }
    }
  }

  const handleGenerateClick = async () => {
    if (invalidReason || submitting) return;
    setSubmitting(true);
    await submitGeneration();
    setSubmitting(false);
  };

  const handleCycleSamplePrompt = () => {
    const list = SAMPLE_PROMPTS[surface];
    const currentIdx = list.indexOf(dockDraft.prompt);
    const next = list[(currentIdx + 1) % list.length];
    setDockDraft((prev) => ({ ...prev, prompt: next }));
  };

  const headlineEnums = activeModel.settings.filter(
    (s) => s.type === 'enum' && s.headline
  );

  return (
    <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
      {/* =================================================================== */}
      {/* LEFT CONTROL DOCK (~380px on desktop, 4 of 12 columns)              */}
      {/* =================================================================== */}
      <aside className="min-w-0 w-full lg:col-span-4 xl:col-span-4 bg-[#111114] border border-white/10 rounded-xl flex flex-col overflow-hidden lg:sticky lg:top-20">
        {/* 1. Surface Mode Selector Tabs */}
        <div className="p-2.5 sm:p-3 bg-[#151519] border-b border-white/10 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {activeModel.modes.map((m) => (
            <button
              key={m}
              onClick={() => setDockDraft((prev) => ({ ...prev, mode: m }))}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                dockDraft.mode === m
                  ? 'bg-[#46ecd5] text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="p-3.5 sm:p-4 space-y-4 overflow-y-auto lg:max-h-[calc(100vh-230px)]">
          {/* 2. Active Model Card */}
          <div
            className={`p-4 rounded-xl border border-white/10 bg-gradient-to-br ${activeModel.previewGradient} relative overflow-hidden`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono-tabular uppercase tracking-wider text-zinc-300">
                  <ProviderBrandIcon provider={activeModel.provider} size={15} />
                  <span>{activeModel.provider}</span>
                  <span className="mx-1">·</span>
                  <span style={{ color: activeModel.previewAccent }}>
                    {activeModel.category}
                  </span>
                </div>
                <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white mt-1">
                  {activeModel.label}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-black/60 hover:bg-black/80 text-white border border-white/15 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Change
              </button>
            </div>
            <p className="text-xs text-zinc-300 mt-2 line-clamp-2">
              {activeModel.description}
            </p>
          </div>

          {/* 3. Dynamic Media Reference & Keyframe Slots */}
          {activeModel.roles.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-300">
                  Frames & Reference Media
                </span>
                <span className="text-[11px] text-zinc-500">
                  Signed R2 / SPACIX Upload
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {activeModel.roles.map((roleSpec) => {
                  const attached = dockDraft.media.filter(
                    (m) => m.role === roleSpec.role
                  );
                  const canAddMore = attached.length < roleSpec.maxCount;

                  return (
                    <div
                      key={roleSpec.role}
                      className="p-3 rounded-xl bg-[#16161A] border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-200 font-medium">
                          {roleSpec.label}
                          {roleSpec.required && (
                            <span className="text-[#46ecd5] ml-1">*</span>
                          )}
                        </span>
                        <span className="font-mono-tabular text-[11px] text-zinc-500">
                          {attached.length}/{roleSpec.maxCount}
                        </span>
                      </div>

                      {attached.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {attached.map((item, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-200"
                            >
                              <span className="truncate max-w-[160px]">
                                {item.label || `${item.role} ${idx + 1}`}
                              </span>
                              <button
                                type="button"
                                aria-label="Remove attached reference"
                                onClick={() =>
                                  setDockDraft((prev) => ({
                                    ...prev,
                                    media: prev.media.filter((m) => m !== item),
                                  }))
                                }
                                className="p-0.5 text-zinc-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {canAddMore && (
                        <button
                          type="button"
                          onClick={() =>
                            setAssetModalRole({
                              open: true,
                              role: roleSpec.role,
                              kind: roleSpec.kind,
                            })
                          }
                          className="w-full py-2 px-3 rounded-lg border border-dashed border-white/15 hover:border-[#46ecd5] text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#46ecd5]" />
                          <span>
                            Add {roleSpec.label} ({roleSpec.kind.toUpperCase()})
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Prompt Textarea with Sample Cycler & Enhance Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="studio-prompt-input" className="font-medium text-zinc-200">
                Director Prompt
              </label>
              <button
                type="button"
                onClick={handleCycleSamplePrompt}
                className="inline-flex items-center gap-1 text-[#46ecd5] hover:underline text-xs font-medium"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Try sample prompt</span>
              </button>
            </div>

            <textarea
              id="studio-prompt-input"
              rows={4}
              value={dockDraft.prompt}
              onChange={(e) =>
                setDockDraft((prev) => ({ ...prev, prompt: e.target.value }))
              }
              placeholder={`Describe camera lens, movement, lighting, and subject for ${activeModel.label}...`}
              className="w-full p-3 text-xs bg-[#16161A] border border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#46ecd5] resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="font-mono-tabular">
                {dockDraft.prompt.length} / 1000 chars
              </span>

              {activeModel.supportsEnhancePrompt && (
                <label className="inline-flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={Boolean(dockDraft.settings.enhance_prompt ?? true)}
                    onChange={(e) =>
                      setDockDraft((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          enhance_prompt: e.target.checked,
                        },
                      }))
                    }
                    className="accent-[#46ecd5] rounded"
                  />
                  <span>Enhance prompt</span>
                </label>
              )}
            </div>
          </div>

          {/* 5. Headline Settings Row + "More" Dialog Trigger */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-300">Output Configuration</span>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-[#46ecd5]"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>All Settings</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {headlineEnums.slice(0, 2).map((def) => {
                if (def.type !== 'enum') return null;
                return (
                  <div key={def.key} className="space-y-1">
                    <label className="text-[11px] text-zinc-500 block">
                      {def.label}
                    </label>
                    <select
                      value={String(
                        dockDraft.settings[def.key] ?? def.defaultValue
                      )}
                      onChange={(e) =>
                        setDockDraft((prev) => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            [def.key]: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-2.5 py-2 text-xs bg-[#16161A] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#46ecd5]"
                    >
                      {def.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6. Sticky Generate Footer */}
        <div className="p-4 bg-[#151519] border-t border-white/10 space-y-2">
          {queuedRun ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateClick}
                disabled={Boolean(invalidReason) || submitting}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#46ecd5] text-zinc-950 hover:brightness-105 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Queue Another · ✦ {creditCost}</span>
              </button>
              <button
                type="button"
                onClick={() => cancelGeneration(queuedRun.id)}
                className="py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors shrink-0"
              >
                Cancel Queued
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateClick}
              disabled={Boolean(invalidReason) || submitting}
              title={invalidReason || `Generate with ${activeModel.label}`}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wider bg-[#46ecd5] text-zinc-950 hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#46ecd5]/15"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {submitting ? 'Submitting to Cluster...' : `Generate ✦ ${creditCost}`}
              </span>
            </button>
          )}

          {invalidReason && (
            <div className="text-[11px] text-amber-400/90 text-center">
              {invalidReason}
            </div>
          )}
        </div>
      </aside>

      {/* =================================================================== */}
      {/* RIGHT CANVAS (History Feed / How It Works / Empty State)            */}
      {/* =================================================================== */}
      <section className="min-w-0 w-full lg:col-span-8 xl:col-span-8 space-y-4">
        {/* Canvas Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-[#111114] border border-white/10 rounded-xl">
          <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-white/5 max-w-full overflow-x-auto no-scrollbar">
            <button
              onClick={() => setRightTab('history')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                rightTab === 'history'
                  ? 'bg-[#46ecd5] text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({surfaceGenerations.length})</span>
            </button>
            <button
              onClick={() => setRightTab('how-it-works')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                rightTab === 'how-it-works'
                  ? 'bg-[#46ecd5] text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How It Works</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-400">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Density:</span>
              <button
                onClick={() => setGridCols(2)}
                className={`px-2 py-1 rounded font-mono-tabular ${
                  gridCols === 2 ? 'bg-white/15 text-white' : 'hover:text-white'
                }`}
              >
                2×
              </button>
              <button
                onClick={() => setGridCols(3)}
                className={`px-2 py-1 rounded font-mono-tabular ${
                  gridCols === 3 ? 'bg-white/15 text-white' : 'hover:text-white'
                }`}
              >
                3×
              </button>
            </div>
          </div>
        </div>

        {rightTab === 'how-it-works' ? (
          <div className="p-4 sm:p-8 rounded-xl bg-[#111114] border border-white/10 space-y-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white">
                {surface === 'video'
                  ? 'MAKE CINEMA VIDEOS IN ONE CLICK'
                  : surface === 'audio'
                  ? 'SCORE & FOLEY YOUR SCENES'
                  : 'ANAMORPHIC & EDITORIAL STILL SYNTHESIS'}
              </h2>
              <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
                Every model in SPACIX Studio connects to our managed cinema inference cluster, reserves credits atomically before dispatch, and archives finished media permanently to Cloudflare R2.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-[#16161A] border border-white/10 space-y-2">
                <div className="font-mono-tabular text-xs font-bold text-[#46ecd5]">
                  01. SELECT MODEL & RIG
                </div>
                <h3 className="text-base font-bold text-white">
                  Pick the Right Architecture
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Use Seedance 2.5 or Kling 3.0 Pro for narrative cinema, DoP Rig for SnorriCam/crane moves, and Nano Banana 2.1 or Soul 2.0 for optical stills.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-[#16161A] border border-white/10 space-y-2">
                <div className="font-mono-tabular text-xs font-bold text-[#46ecd5]">
                  02. ATTACH KEYFRAMES
                </div>
                <h3 className="text-base font-bold text-white">
                  Lock Start, End & Style Refs
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Upload reference frames via signed URLs or animate any still image from your library directly into a video sequence.
                </p>
              </div>
              <div className="p-5 rounded-xl bg-[#16161A] border border-white/10 space-y-2">
                <div className="font-mono-tabular text-xs font-bold text-[#46ecd5]">
                  03. ARCHIVE & PUBLISH
                </div>
                <h3 className="text-base font-bold text-white">
                  Permanent R2 Storage
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Completed runs copy automatically to R2 so they never expire after 7 days. Failed or filtered runs refund credits automatically.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                One-Click Curated Presets for {surface.toUpperCase()}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {presets
                  .filter((p) => p.surface === surface)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        applyPresetToDock(p);
                        setRightTab('history');
                      }}
                      className="p-3.5 rounded-xl bg-[#16161A] border border-white/10 hover:border-[#46ecd5] text-left flex items-center justify-between gap-3 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{p.title}</div>
                        <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                          {p.description}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#46ecd5] shrink-0" />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ) : surfaceGenerations.length === 0 ? (
          /* ScreenEmptyState */
          <div className="p-5 sm:p-10 rounded-xl bg-[#111114] border border-white/10 text-center space-y-6 quanta-dot-bg">
            <div className="flex justify-center">
              <SpacixLogo size="lg" />
            </div>
            <div className="max-w-lg mx-auto space-y-2">
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold uppercase tracking-wide text-white">
                {surface === 'video'
                  ? 'MAKE VIDEOS IN ONE CLICK'
                  : surface === 'audio'
                  ? 'GENERATE STUDIO AUDIO & SCORES'
                  : 'CREATE 4K CINEMA FRAMES'}
              </h2>
              <p className="text-xs text-zinc-400">
                No {surface} generations in your SPACIX library yet. Pick a sample prompt on the left or launch a preset below.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              <div className="p-4 rounded-xl bg-[#16161A] border border-white/10">
                <div className="text-xs font-mono-tabular text-[#46ecd5] font-bold">
                  01. ADD FRAME OR PROMPT
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Describe your shot or attach a reference image from your library.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#16161A] border border-white/10">
                <div className="text-xs font-mono-tabular text-[#46ecd5] font-bold">
                  02. CHOOSE MODEL
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Switch between Nano Banana 2.1, Seedance 2.5, Kling 3.0, or Sonilo v2.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#16161A] border border-white/10">
                <div className="text-xs font-mono-tabular text-[#46ecd5] font-bold">
                  03. GET R2 MASTER
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Download high-bitrate outputs or animate stills into video.
                </p>
              </div>
            </div>

            <button
              onClick={handleCycleSamplePrompt}
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-[#46ecd5] text-zinc-950 rounded-lg hover:brightness-105 transition-all"
            >
              Load Director Sample Prompt
            </button>
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 ${
              gridCols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'
            } gap-4`}
          >
            {surfaceGenerations.map((gen) => (
              <GenerationTile
                key={gen.id}
                gen={gen}
                onOpenDetail={(g) => setSelectedGeneration(g)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      <ModelPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        surface={surface}
        selectedModelId={activeModel.id}
        selectedProvider={activeProviderSpec.providerId}
        onSelectModel={(m, prov) => applyModelToDock(m.id, m.surface, prov)}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        model={activeModel}
        settings={dockDraft.settings}
        onChangeSetting={(k, v) =>
          setDockDraft((prev) => ({
            ...prev,
            settings: { ...prev.settings, [k]: v },
          }))
        }
        onResetDefaults={() => {
          const defaults: Record<string, string | number | boolean> = {};
          for (const s of activeModel.settings) defaults[s.key] = s.defaultValue;
          setDockDraft((prev) => ({ ...prev, settings: defaults }));
        }}
      />

      <AssetLibraryModal
        open={assetModalRole.open}
        onClose={() => setAssetModalRole((prev) => ({ ...prev, open: false }))}
        targetRole={assetModalRole.role}
        targetKind={assetModalRole.kind}
        onSelectMedia={(item) =>
          setDockDraft((prev) => ({
            ...prev,
            media: [...prev.media, item],
          }))
        }
      />
    </div>
  );
};
