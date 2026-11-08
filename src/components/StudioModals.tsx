import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Film,
  Flag,
  Globe,
  Mail,
  Music,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ApiProviderId,
  MediaKind,
  MediaRole,
  ModelEntry,
  Surface,
} from '../types/studio';
import { priceFor } from '../billing/price';
import { STUDIO_PLANS, TOPUP_PACKS } from '../billing/plans';
import { useRuns } from '../lib/useRuns';
import {
  ApiProviderBadge,
  ProviderBrandIcon,
  SpacixLogo,
} from './ProviderBrandIcon';
import { AuthFormCard } from './AuthPage';

// ============================================================================
// 1. MODEL PICKER MODAL (Grouped by Surface & Family)
// ============================================================================
export const ModelPickerModal: React.FC<{
  open: boolean;
  onClose: () => void;
  surface: Surface;
  selectedModelId: string;
  selectedProvider?: ApiProviderId;
  onSelectModel: (model: ModelEntry, provider?: ApiProviderId) => void;
}> = ({
  open,
  onClose,
  surface,
  selectedModelId,
  onSelectModel,
}) => {
  const { models } = useRuns();
  const [activeSurface, setActiveSurface] = useState<Surface>(surface);
  const [query, setQuery] = useState('');

  if (!open) return null;

  const filtered = models
    .filter((m) => m.surface === activeSurface)
    .filter(
      (m) =>
        !query.trim() ||
        m.label.toLowerCase().includes(query.toLowerCase()) ||
        m.family.toLowerCase().includes(query.toLowerCase()) ||
        m.provider.toLowerCase().includes(query.toLowerCase()) ||
        m.description.toLowerCase().includes(query.toLowerCase()) ||
        m.bestFor.toLowerCase().includes(query.toLowerCase())
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[88vh] flex flex-col bg-[#111114] border border-white/10 rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <SpacixLogo size="sm" />
            <span className="text-white/20">·</span>
            <div>
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                Select Production Model
              </h2>
              <p className="text-xs text-zinc-400">
                Choose cinema video, optical still, and studio audio architectures
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close model picker"
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-6 py-3 bg-[#151519] border-b border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-white/5">
              {(['video', 'image', 'audio'] as Surface[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSurface(s)}
                  className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeSurface === s
                      ? 'bg-[#46ecd5] text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {s} Models
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Nano Banana, Seedance, Kling, Flux, Grok..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-900 border border-white/10 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#46ecd5]"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((model) => {
            const defaultSettings: Record<string, string | number | boolean> = {};
            for (const s of model.settings) defaultSettings[s.key] = s.defaultValue;
            const startingCost = priceFor(model.id, defaultSettings, []);
            const isSelected = model.id === selectedModelId;

            return (
              <div
                key={model.id}
                onClick={() => {
                  onSelectModel(model);
                  onClose();
                }}
                className={`cursor-pointer text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-zinc-900/90 border-[#46ecd5]'
                    : 'bg-[#18181C]/70 border-white/10 hover:border-white/25 hover:bg-[#18181C]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                      <ProviderBrandIcon provider={model.provider} size={15} />
                      <span>{model.provider}</span>
                      <span className="mx-1">·</span>
                      <span>{model.category}</span>
                      {model.badges.length > 0 && (
                        <>
                          <span className="mx-1">·</span>
                          <span className="text-[#46ecd5] font-mono-tabular">
                            {model.badges.join(' / ')}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="font-mono-tabular text-xs font-semibold text-zinc-200">
                      from ✦ {startingCost}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{model.label}</span>
                    </h3>
                    {isSelected && <Check className="w-4 h-4 text-[#46ecd5] shrink-0" />}
                  </div>

                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{model.description}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="truncate">Best for: {model.bestFor}</span>
                    <span className="font-mono-tabular text-[#46ecd5] shrink-0 ml-2">
                      {model.modes.join(' · ')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. SETTINGS DIALOG (Renders enum -> Select, range -> Slider, boolean -> Switch)
// ============================================================================
export const SettingsDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  model: ModelEntry;
  settings: Record<string, string | number | boolean>;
  onChangeSetting: (key: string, value: string | number | boolean) => void;
  onResetDefaults: () => void;
}> = ({ open, onClose, model, settings, onChangeSetting, onResetDefaults }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#111114] border border-white/10 rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-[#46ecd5]" />
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
              {model.label} Parameters
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings dialog"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {model.settings.map((def) => {
            const val = settings[def.key] ?? def.defaultValue;

            if (def.type === 'enum') {
              return (
                <div key={def.key} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-zinc-200">{def.label}</label>
                    <span className="font-mono-tabular text-zinc-400">{String(val)}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {def.options.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChangeSetting(def.key, opt.value)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors text-left truncate ${
                          String(val) === opt.value
                            ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                            : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            if (def.type === 'range') {
              return (
                <div key={def.key} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-zinc-200">{def.label}</label>
                    <span className="font-mono-tabular text-[#46ecd5]">
                      {Number(val)}
                      {def.unit || ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={def.min}
                    max={def.max}
                    step={def.step}
                    value={Number(val)}
                    onChange={(e) => onChangeSetting(def.key, Number(e.target.value))}
                    className="w-full accent-[#46ecd5] bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-mono-tabular text-zinc-500">
                    <span>{def.min}</span>
                    <span>Default: {def.defaultValue}</span>
                    <span>{def.max}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={def.key}
                className="flex items-center justify-between gap-4 py-2 border-t border-white/5"
              >
                <div>
                  <div className="text-xs font-medium text-zinc-200">{def.label}</div>
                  {def.description && (
                    <div className="text-[11px] text-zinc-500 mt-0.5">{def.description}</div>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(val)}
                  onClick={() => onChangeSetting(def.key, !val)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    val ? 'bg-[#46ecd5] justify-end' : 'bg-zinc-800 justify-start'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full transition-transform ${
                      val ? 'bg-zinc-950' : 'bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-[#151519] border-t border-white/10">
          <button
            type="button"
            onClick={onResetDefaults}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Reset to Model Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-[#46ecd5] text-zinc-950 rounded-lg hover:brightness-105 transition-all"
          >
            Apply Parameters
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. ASSET LIBRARY MODAL (Uploads + Generated Library Picker for Media Slots)
// ============================================================================
export const AssetLibraryModal: React.FC<{
  open: boolean;
  onClose: () => void;
  targetRole: MediaRole;
  targetKind: MediaKind;
  onSelectMedia: (item: { role: MediaRole; kind: MediaKind; url: string; label: string }) => void;
}> = ({ open, onClose, targetRole, targetKind, onSelectMedia }) => {
  const { uploads, generations, uploadReferenceFile } = useRuns();
  const [tab, setTab] = useState<'uploads' | 'generations'>('uploads');
  const [uploading, setUploading] = useState(false);

  if (!open) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      const created = await uploadReferenceFile({
        label: file.name,
        contentType: file.type || 'image/png',
        bytes: file.size,
        dataUrl,
      });
      setUploading(false);
      if (created) {
        onSelectMedia({
          role: targetRole,
          kind: created.kind,
          url: created.publicUrl,
          label: created.label,
        });
        onClose();
      }
    };
    reader.readAsDataURL(file);
  };

  const completedGenerations = generations.filter(
    (g) => g.status === 'completed' && g.outputs.length > 0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#111114] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
              Select {targetRole.toUpperCase()} ({targetKind})
            </h2>
            <p className="text-xs text-zinc-400">
              Upload a reference file (JPEG, PNG, WebP, MP4, WAV) or pick from your SPACIX library
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close asset library"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-3 bg-[#151519] border-b border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('uploads')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === 'uploads'
                  ? 'bg-[#46ecd5] text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Uploads ({uploads.length})
            </button>
            <button
              onClick={() => setTab('generations')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                tab === 'generations'
                  ? 'bg-[#46ecd5] text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              SPACIX Generations ({completedGenerations.length})
            </button>
          </div>

          <label className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-lg cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-[#46ecd5]" />
            <span>{uploading ? 'Uploading to R2...' : 'Upload File'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,audio/wav"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4">
          {tab === 'uploads' &&
            uploads.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onSelectMedia({
                    role: targetRole,
                    kind: u.kind,
                    url: u.publicUrl,
                    label: u.label,
                  });
                  onClose();
                }}
                className="group text-left bg-[#18181C] border border-white/10 hover:border-[#46ecd5] rounded-xl overflow-hidden transition-all"
              >
                <div className="aspect-video bg-zinc-900 relative overflow-hidden">
                  <img
                    src={u.publicUrl}
                    alt={u.label}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-medium text-white truncate">{u.label}</div>
                  <div className="text-[11px] font-mono-tabular text-zinc-500 mt-0.5">
                    {u.kind.toUpperCase()} · {Math.round(u.bytes / 1024)} KB
                  </div>
                </div>
              </button>
            ))}

          {tab === 'generations' &&
            completedGenerations.map((g) => {
              const out = g.outputs[0];
              if (!out) return null;
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    onSelectMedia({
                      role: targetRole,
                      kind: out.kind,
                      url: out.url,
                      label: `${g.modelLabel} Frame`,
                    });
                    onClose();
                  }}
                  className="group text-left bg-[#18181C] border border-white/10 hover:border-[#46ecd5] rounded-xl overflow-hidden transition-all"
                >
                  <div className="aspect-video bg-zinc-900 relative overflow-hidden flex items-center justify-center">
                    {out.kind === 'audio' ? (
                      <Music className="w-8 h-8 text-[#46ecd5]" />
                    ) : (
                      <img
                        src={out.url}
                        alt={g.prompt}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs font-medium text-white truncate">{g.prompt}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{g.modelLabel}</div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. GENERATION DETAIL LIGHTBOX MODAL
// ============================================================================
export const GenerationDetailModal: React.FC = () => {
  const {
    user,
    selectedGeneration,
    setSelectedGeneration,
    reuseGenerationInDock,
    togglePublishGeneration,
    deleteGeneration,
    downloadGeneration,
    projects,
    moveGenerationToProject,
    showToast,
  } = useRuns();

  if (!selectedGeneration) return null;
  const gen = selectedGeneration;
  const out = gen.outputs[0];

  const handleCopyPrompt = () => {
    navigator.clipboard?.writeText(gen.prompt);
    showToast('Prompt copied to clipboard');
  };

  const handleReport = async () => {
    try {
      await fetch('/api/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId: gen.id,
          reason: 'Flagged from generation detail lightbox',
        }),
      });
    } catch {
      // Ignore transient network error
    }
    showToast('Reported to community moderation queue');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
      onClick={() => setSelectedGeneration(null)}
    >
      <div
        className="w-full max-w-5xl bg-[#111114] border border-white/10 rounded-xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 max-h-[92vh] overflow-y-auto lg:overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lg:col-span-8 bg-[#09090B] flex items-center justify-center p-3 sm:p-6 min-h-[240px] sm:min-h-[320px] relative">
          {out?.kind === 'audio' ? (
            <div className="w-full max-w-md p-6 rounded-xl bg-[#151519] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#46ecd5]/15 border border-[#46ecd5]/40 flex items-center justify-center">
                  <Music className="w-6 h-6 text-[#46ecd5]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{gen.modelLabel}</div>
                  <div className="text-xs font-mono-tabular text-zinc-400">
                    {out.durationSec || 15}s Master WAV · R2 Archived
                  </div>
                </div>
              </div>
              <audio controls src={out.url} className="w-full" />
            </div>
          ) : out ? (
            out.kind === 'video' &&
            (out.url.endsWith('.mp4') ||
              out.url.endsWith('.webm') ||
              out.url.includes('vm.runware.ai') ||
              out.url.startsWith('data:video/')) ? (
              <video
                src={out.url}
                controls
                autoPlay
                loop
                playsInline
                className="max-h-[72vh] w-auto object-contain rounded-lg border border-white/10"
              />
            ) : (
              <img
                src={out.url}
                alt={gen.prompt}
                referrerPolicy="no-referrer"
                className="max-h-[72vh] w-auto object-contain rounded-lg border border-white/10"
              />
            )
          ) : (
            <div className="text-sm text-zinc-400"> Status: {gen.status.toUpperCase()}</div>
          )}
        </div>

        <div className="lg:col-span-4 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-zinc-400">
                  <span>{gen.surface.toUpperCase()}</span>
                  <span className="mx-1.5">·</span>
                  <span className="font-mono-tabular text-[#46ecd5]">✦ {gen.cost} credits</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">{gen.modelLabel}</h3>
              </div>
              <button
                onClick={() => setSelectedGeneration(null)}
                aria-label="Close detail view"
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Prompt</span>
                <button
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center gap-1 text-zinc-300 hover:text-[#46ecd5]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
              <p className="text-xs text-zinc-200 bg-zinc-900/90 border border-white/10 rounded-lg p-3 leading-relaxed">
                {gen.prompt}
              </p>
            </div>

            <div className="space-y-2 text-xs border-t border-white/10 pt-4">
              <div className="text-zinc-400 font-medium">
                {user?.role === 'admin' ? 'Admin API Gateway & Provenance' : 'Parameters & R2 Provenance'}
              </div>
              {user?.role === 'admin' && (
                <>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-zinc-500">API Provider</span>
                    <ApiProviderBadge providerId={gen.apiProvider || 'higgsfield'} active />
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-zinc-500">Endpoint</span>
                    <span className="font-mono-tabular text-[11px] text-zinc-200 truncate max-w-[190px]">
                      {gen.modelPath}
                    </span>
                  </div>
                  {gen.callingPattern && (
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="text-zinc-500">Calling Mode</span>
                      <span className="font-mono-tabular uppercase text-[11px] text-[#46ecd5]">
                        {gen.callingPattern}
                      </span>
                    </div>
                  )}
                </>
              )}
              {Object.entries(gen.settings).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500">{k}</span>
                  <span className="font-mono-tabular">{String(v)}</span>
                </div>
              ))}
              {out?.r2Key && (
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500">Cloudflare R2 Key</span>
                  <span className="font-mono-tabular text-[11px] truncate max-w-[180px]">
                    {out.r2Key}
                  </span>
                </div>
              )}
            </div>

            {projects.length > 0 && (
              <div className="space-y-1.5 border-t border-white/10 pt-4">
                <label className="text-xs text-zinc-400 block">Assign to Project</label>
                <select
                  value={gen.projectId || ''}
                  onChange={(e) =>
                    moveGenerationToProject(gen.id, e.target.value ? e.target.value : null)
                  }
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-white/10 rounded-lg text-white"
                >
                  <option value="">No project (Unassigned)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-2.5 pt-6 border-t border-white/10 mt-6">
            <button
              onClick={() => reuseGenerationInDock(gen, false)}
              className="w-full py-2.5 px-4 text-xs font-bold bg-[#46ecd5] text-zinc-950 rounded-lg hover:brightness-105 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Reuse Prompt & Settings</span>
            </button>

            {gen.surface === 'image' && out && (
              <button
                onClick={() => reuseGenerationInDock(gen, true)}
                className="w-full py-2 px-4 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Film className="w-4 h-4 text-[#46ecd5]" />
                <span>Animate Still in Video Studio</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              {out && (
                <button
                  type="button"
                  onClick={(e) => downloadGeneration(gen, e)}
                  className="py-2 px-3 text-xs font-medium bg-zinc-900 hover:bg-[#46ecd5] hover:text-zinc-950 border border-white/10 text-zinc-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              )}
              <button
                onClick={() => togglePublishGeneration(gen.id, !gen.isPublic)}
                className="py-2 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 rounded-lg flex items-center justify-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5 text-[#46ecd5]" />
                <span>{gen.isPublic ? 'Unpublish' : 'Publish'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleReport}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1"
              >
                <Flag className="w-3 h-3" />
                <span>Report content</span>
              </button>
              <button
                onClick={() => deleteGeneration(gen.id)}
                className="text-[11px] text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. AUTHENTICATION MODAL (Real Database Login, Sign Up, Remember Me & Reset)
// ============================================================================
export const AuthMagicLinkModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen } = useRuns();

  if (!authModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={() => setAuthModalOpen(false)}
    >
      <div
        className="w-full max-w-md my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <AuthFormCard isModal onClose={() => setAuthModalOpen(false)} />
      </div>
    </div>
  );
};

// ============================================================================
// 6. UPGRADE & TOP-UP CREDITS MODAL (Stripe Checkout Integration)
// ============================================================================
export const UpgradeCreditsModal: React.FC = () => {
  const { upgradeModalOpen, setUpgradeModalOpen, user, checkoutPlanOrTopup } = useRuns();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  if (!upgradeModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={() => setUpgradeModalOpen(false)}
    >
      <div
        className="w-full max-w-4xl bg-[#111114] border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <SpacixLogo size="sm" />
            <span className="text-white/20">·</span>
            <div>
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                Upgrade Plan or Add Top-Up Credits
              </h2>
              <p className="text-xs text-zinc-400">
                Current balance:{' '}
                <span className="text-[#46ecd5] font-mono-tabular font-semibold">
                  ✦ {user?.credits.total ?? 0} credits
                </span>{' '}
                ({user?.credits.subscription ?? 0} subscription · {user?.credits.topup ?? 0} non-expiring top-up)
              </p>
            </div>
          </div>
          <button
            onClick={() => setUpgradeModalOpen(false)}
            aria-label="Close upgrade modal"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
              Instant Credit Top-Up Packs (Never Expire)
            </h3>
            <span className="text-xs text-zinc-400">
              Processed via Stripe Checkout · Instant ledger grant
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TOPUP_PACKS.map((pack) => (
              <div
                key={pack.id}
                className="p-4 rounded-xl bg-[#18181C] border border-white/10 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{pack.name}</span>
                    {pack.tag && <span className="text-[#46ecd5]">{pack.tag}</span>}
                  </div>
                  <div className="text-2xl font-bold font-mono-tabular text-white mt-1">
                    ✦ {pack.credits.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono-tabular mt-0.5">
                    ${pack.priceUsd} one-time payment
                  </div>
                </div>
                <button
                  onClick={() => checkoutPlanOrTopup({ kind: 'topup', topupId: pack.id })}
                  className="w-full py-2 px-3 text-xs font-bold bg-[#46ecd5] text-zinc-950 rounded-lg hover:brightness-105 transition-all"
                >
                  Buy ✦ {pack.credits.toLocaleString()} (${pack.priceUsd})
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
              SPACIX Subscriptions (Monthly Allowance Reset)
            </h3>
            <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-white/10">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  billingCycle === 'monthly' ? 'bg-white text-zinc-950' : 'text-zinc-400'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  billingCycle === 'annual' ? 'bg-[#46ecd5] text-zinc-950' : 'text-zinc-400'
                }`}
              >
                Annual (20% OFF)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STUDIO_PLANS.filter((p) => p.id !== 'free').map((plan) => {
              const price = billingCycle === 'annual' ? plan.annualMonthlyUsd : plan.monthlyUsd;
              const isCurrent = user?.plan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-4 ${
                    plan.id === 'plus'
                      ? 'bg-zinc-900/90 border-[#46ecd5]'
                      : 'bg-[#18181C] border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>{plan.name}</span>
                      {plan.badge && <span className="text-[#46ecd5] font-semibold">{plan.badge}</span>}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-mono-tabular text-white">
                        ${price}
                      </span>
                      <span className="text-xs text-zinc-400">/ month</span>
                    </div>
                    <div className="text-xs font-mono-tabular text-[#46ecd5] mt-1">
                      ✦ {plan.monthlyCredits.toLocaleString()} credits / mo
                    </div>
                    <ul className="mt-3 space-y-1.5 text-xs text-zinc-400">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#46ecd5] shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() =>
                      checkoutPlanOrTopup({
                        kind: 'subscription',
                        planId: plan.id,
                        billingCycle,
                      })
                    }
                    className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                      isCurrent
                        ? 'bg-white/10 text-white hover:bg-white/15'
                        : 'bg-[#46ecd5] text-zinc-950 hover:brightness-105'
                    }`}
                  >
                    {isCurrent ? 'Reset / Renew Allowance' : `Switch to ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
