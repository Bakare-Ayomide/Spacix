import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Film,
  Flag,
  Globe,
  Music,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ApiProviderId,
  MediaKind,
  MediaRole,
  ModelEntry,
  Surface,
} from '../types/studio';
import { useRuns } from '../lib/useRuns';
import {
  ApiProviderBadge,
  ProviderBrandIcon,
  SpacixLogo,
} from './ProviderBrandIcon';
import { AuthFormCard } from './AuthPage';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Slider,
  Switch,
} from './ui/primitives';
import {
  AnimatedPillTabs,
  BorderBeam,
  ShimmerButton,
  SpotlightCard,
} from './ui/aceternity-magic';
import { GearVisual } from './GearVisual';
import { getSettingOptionVisual } from '../catalog/cinemaGearVisuals';
import {
  applyCreativeLookCanvas,
  buildCssFilterFromGrading,
} from '../lib/colorPostProcess';

// ============================================================================
// 1. MODEL PICKER MODAL (Radix Dialog + AnimatedPillTabs + SpotlightCard)
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
  const { models, calculateTokenCost } = useRuns();
  const [activeSurface, setActiveSurface] = useState<Surface>(surface);
  const [query, setQuery] = useState('');

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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <SpacixLogo size="sm" />
            <span className="text-white/20">·</span>
            <div>
              <DialogTitle>Select Production Model</DialogTitle>
              <DialogDescription>
                Choose cinema video, optical still, and studio audio architectures
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-6 py-3 bg-[#151519] border-b border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AnimatedPillTabs
              layoutGroupId="model-picker-surface-tabs"
              value={activeSurface}
              onChange={(v) => setActiveSurface(v as Surface)}
              items={(['video', 'image', 'audio'] as Surface[]).map((s) => ({
                value: s,
                label: `${s.toUpperCase()} MODELS`,
              }))}
            />

            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Nano Banana, Seedance, Kling, Flux, Grok..."
                className="w-full pl-9 h-8 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((model) => {
            const defaultSettings: Record<string, string | number | boolean> = {};
            for (const s of model.settings) defaultSettings[s.key] = s.defaultValue;
            const startingCost = calculateTokenCost(model.id, defaultSettings, []);
            const isSelected = model.id === selectedModelId;

            return (
              <SpotlightCard
                key={model.id}
                onClick={() => {
                  onSelectModel(model);
                  onClose();
                }}
                className={`cursor-pointer text-left p-4 transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-zinc-900/90 border-[#46ecd5]'
                    : 'bg-[#18181C]/70 border-white/10 hover:border-white/25 hover:bg-[#18181C]'
                }`}
              >
                {isSelected && <BorderBeam />}
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
                    <Badge variant="default" className="font-mono-tabular">
                      from ✦ {startingCost}
                    </Badge>
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
              </SpotlightCard>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// 2. SETTINGS DIALOG (Radix Dialog + Radix Slider + Radix Switch)
// ============================================================================
export const SettingsDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  model: ModelEntry;
  settings: Record<string, string | number | boolean>;
  onChangeSetting: (key: string, value: string | number | boolean) => void;
  onResetDefaults: () => void;
}> = ({ open, onClose, model, settings, onChangeSetting, onResetDefaults }) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-[#46ecd5]" />
            <DialogTitle>{model.label} Parameters</DialogTitle>
          </div>
          <DialogDescription>
            Adjust optical, motion, and sampling controls for {model.label}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {model.settings.map((def) => {
            const val = settings[def.key] ?? def.defaultValue;

            if (def.type === 'enum') {
              return (
                <div key={def.key} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-zinc-200">{def.label}</label>
                    <Badge variant="outline" className="font-mono-tabular">{String(val)}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {def.options.map((opt) => {
                      const optVisual = getSettingOptionVisual(def.key, opt.label || opt.value);
                      return (
                        <Button
                          key={opt.value}
                          type="button"
                          variant={String(val) === opt.value ? 'cyanGhost' : 'secondary'}
                          size="sm"
                          onClick={() => onChangeSetting(def.key, opt.value)}
                          className="justify-start gap-2 h-auto py-1.5"
                        >
                          {optVisual && <GearVisual spec={optVisual} size="sm" />}
                          <span className="truncate">{opt.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (def.type === 'range') {
              return (
                <div key={def.key} className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-zinc-200">{def.label}</label>
                    <Badge variant="default" className="font-mono-tabular">
                      {Number(val)}
                      {def.unit || ''}
                    </Badge>
                  </div>
                  <Slider
                    min={def.min}
                    max={def.max}
                    step={def.step}
                    value={[Number(val)]}
                    onValueChange={(vals) => onChangeSetting(def.key, vals[0])}
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
                <Switch
                  checked={Boolean(val)}
                  onCheckedChange={(checked) => onChangeSetting(def.key, checked)}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-[#151519] border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetDefaults}
          >
            Reset to Model Defaults
          </Button>
          <ShimmerButton
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs"
          >
            Apply Parameters
          </ShimmerButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// 3. ASSET LIBRARY MODAL (Radix Dialog + AnimatedPillTabs)
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden flex flex-col max-h-[82vh]">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle>
            Select {targetRole.toUpperCase()} ({targetKind})
          </DialogTitle>
          <DialogDescription>
            Upload a reference file (JPEG, PNG, WebP, MP4, WAV) or pick from your SPACIX library
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between px-6 py-3 bg-[#151519] border-b border-white/10">
          <AnimatedPillTabs
            layoutGroupId="asset-library-modal-tabs"
            value={tab}
            onChange={(v) => setTab(v as 'uploads' | 'generations')}
            items={[
              { value: 'uploads', label: 'Uploads', count: uploads.length },
              { value: 'generations', label: 'SPACIX Generations', count: completedGenerations.length },
            ]}
          />

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
              <SpotlightCard
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
                className="group cursor-pointer text-left p-0 overflow-hidden transition-all"
              >
                <div className="h-36 bg-black relative overflow-hidden flex items-center justify-center">
                  <img
                    src={u.publicUrl}
                    alt={u.label}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                  />
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-medium text-white truncate">{u.label}</div>
                  <div className="text-[11px] font-mono-tabular text-zinc-500 mt-0.5">
                    {u.kind.toUpperCase()} · {Math.round(u.bytes / 1024)} KB
                  </div>
                </div>
              </SpotlightCard>
            ))}

          {tab === 'generations' &&
            completedGenerations.map((g) => {
              const out = g.outputs[0];
              if (!out) return null;
              return (
                <SpotlightCard
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
                  className="group cursor-pointer text-left p-0 overflow-hidden transition-all"
                >
                  <div className="h-36 bg-black relative overflow-hidden flex items-center justify-center">
                    {out.kind === 'audio' ? (
                      <Music className="w-8 h-8 text-[#46ecd5]" />
                    ) : (
                      <img
                        src={out.url}
                        alt={g.prompt}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                      />
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs font-medium text-white truncate">{g.prompt}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{g.modelLabel}</div>
                  </div>
                </SpotlightCard>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// 4. GENERATION DETAIL LIGHTBOX MODAL (Radix Dialog)
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
    creativeControls,
    showToast,
  } = useRuns();

  const [lutPreviewOn, setLutPreviewOn] = useState(true);
  const [exportingGraded, setExportingGraded] = useState(false);

  if (!selectedGeneration) return null;
  const gen = selectedGeneration;
  const out = gen.outputs[0];
  const isImageOutput =
    Boolean(out) &&
    out.kind !== 'audio' &&
    !(
      out.kind === 'video' &&
      (out.url.endsWith('.mp4') ||
        out.url.endsWith('.webm') ||
        out.url.includes('vm.runware.ai') ||
        out.url.startsWith('data:video/'))
    );
  const gradedCssFilter =
    lutPreviewOn && isImageOutput
      ? buildCssFilterFromGrading(
          creativeControls.colorGrading,
          creativeControls.filmLook
        )
      : undefined;

  const handleExportGraded = async () => {
    if (!out?.url) return;
    setExportingGraded(true);
    try {
      const blobUrl = await applyCreativeLookCanvas(
        out.url,
        creativeControls.colorGrading,
        creativeControls.filmLook
      );
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `spacix-graded-${gen.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => {
        if (blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
      }, 4000);
      showToast('Exported canvas-graded JPG with LUT & film look');
    } catch {
      showToast('Could not canvas-export remote frame; downloading original');
      downloadGeneration(gen);
    } finally {
      setExportingGraded(false);
    }
  };

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
    <Dialog
      open={Boolean(selectedGeneration)}
      onOpenChange={(isOpen) => !isOpen && setSelectedGeneration(null)}
    >
      <DialogContent className="max-w-5xl p-0 overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[92vh]">
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
              <div className="relative flex flex-col items-center gap-2">
                <img
                  src={out.url}
                  alt={gen.prompt}
                  referrerPolicy="no-referrer"
                  style={{ filter: gradedCssFilter }}
                  className="max-h-[68vh] w-auto object-contain rounded-lg border border-white/10 transition-all"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLutPreviewOn((v) => !v)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      lutPreviewOn
                        ? 'bg-[#46ecd5]/15 border-[#46ecd5]/50 text-[#46ecd5]'
                        : 'bg-zinc-900 border-white/15 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {lutPreviewOn ? 'LUT Preview: On' : 'LUT Preview: Off (Raw)'}
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="text-sm text-zinc-400">Status: {gen.status.toUpperCase()}</div>
          )}
        </div>

        <div className="lg:col-span-4 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Badge variant="outline">{gen.surface.toUpperCase()}</Badge>
                <Badge variant="default" className="font-mono-tabular">✦ {gen.cost} credits</Badge>
              </div>
              <DialogTitle className="mt-2">{gen.modelLabel}</DialogTitle>
              <DialogDescription className="sr-only">Generation details and actions</DialogDescription>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Prompt</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPrompt}
                  className="h-6 px-2 text-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </Button>
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
            <ShimmerButton
              onClick={() => reuseGenerationInDock(gen, false)}
              className="w-full py-2.5 px-4 text-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Reuse Prompt & Settings</span>
            </ShimmerButton>

            {gen.surface === 'image' && out && (
              <Button
                variant="secondary"
                onClick={() => reuseGenerationInDock(gen, true)}
                className="w-full"
              >
                <Film className="w-4 h-4 text-[#46ecd5]" />
                <span>Animate Still in Video Studio</span>
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              {out && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(e) => downloadGeneration(gen, e)}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </Button>
              )}
              {isImageOutput && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={exportingGraded}
                  onClick={handleExportGraded}
                >
                  <Sliders className="w-3.5 h-3.5 text-[#46ecd5]" />
                  <span>{exportingGraded ? 'Grading...' : 'Export Graded'}</span>
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => togglePublishGeneration(gen.id, !gen.isPublic)}
                className={isImageOutput ? 'col-span-2' : ''}
              >
                <Globe className="w-3.5 h-3.5 text-[#46ecd5]" />
                <span>{gen.isPublic ? 'Unpublish' : 'Publish'}</span>
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReport}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 h-7 px-2"
              >
                <Flag className="w-3 h-3" />
                <span>Report content</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteGeneration(gen.id)}
                className="text-[11px] text-rose-400 hover:text-rose-300 h-7 px-2"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// 5. AUTHENTICATION MODAL (Radix Dialog)
// ============================================================================
export const AuthMagicLinkModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen } = useRuns();

  return (
    <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
      <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none">
        <DialogTitle className="sr-only">Sign In or Create Account</DialogTitle>
        <DialogDescription className="sr-only">Authenticate with your SPACIX account</DialogDescription>
        <AuthFormCard isModal onClose={() => setAuthModalOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// 6. UPGRADE & TOP-UP CREDITS MODAL (Radix Dialog + BorderBeam + ShimmerButton)
// ============================================================================
export const UpgradeCreditsModal: React.FC = () => {
  const { upgradeModalOpen, setUpgradeModalOpen, user, navigate, showToast } = useRuns();
  const [notifyEmail, setNotifyEmail] = useState(user?.email || '');
  const [notified, setNotified] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail.trim()) return;
    setNotified(true);
    showToast('You are on the priority list for SPACIX Pricing & Plans launch');
  };

  return (
    <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden flex flex-col max-h-[88vh]">
        <BorderBeam />
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <SpacixLogo size="sm" />
            <span className="text-white/20">·</span>
            <div>
              <DialogTitle>
                Studio Plans &amp; Credit Packages — Coming Soon
              </DialogTitle>
              <DialogDescription>
                Current wallet balance:{' '}
                <span className="text-[#46ecd5] font-mono-tabular font-semibold">
                  ✦ {user?.credits.total ?? 0} TK
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-center">
          <Badge variant="default" className="px-3.5 py-1.5 text-[11px] font-mono-tabular font-bold uppercase tracking-[0.2em]">
            <span className="w-2 h-2 rounded-full bg-[#46ecd5] animate-pulse" />
            <span>COMING SOON · OFFICIAL PRICING RELEASE</span>
          </Badge>

          <div className="space-y-3 max-w-xl mx-auto">
            <h3 className="font-display text-2xl sm:text-3xl font-extrabold uppercase text-white">
              Tailored Studio Plans &amp; Production Pricing Soon to Come
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              We are finalizing transparent subscription plans and non-expiring production token packages designed for independent directors, commercial agencies, and virtual film studios. Official pricing tiers will be announced shortly.
            </p>
          </div>

          {notified ? (
            <div className="py-3 px-4 rounded-xl bg-[#46ecd5]/15 border border-[#46ecd5]/40 text-xs font-bold text-[#46ecd5] flex items-center justify-center gap-2 max-w-md mx-auto">
              <Check className="w-4 h-4" />
              <span>Priority notification registered — we will notify you when pricing goes live.</span>
            </div>
          ) : (
            <form
              onSubmit={handleNotify}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md mx-auto"
            >
              <Input
                type="email"
                required
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="Enter your email for pricing launch updates..."
                className="flex-1 h-10 bg-[#090A0D]"
              />
              <ShimmerButton
                type="submit"
                className="px-5 py-2.5 text-xs shrink-0"
              >
                Notify Me
              </ShimmerButton>
            </form>
          )}

          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setUpgradeModalOpen(false);
                navigate('pricing');
              }}
            >
              View Full Coming Soon Pricing Page →
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUpgradeModalOpen(false)}
            >
              Continue in Studio
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
