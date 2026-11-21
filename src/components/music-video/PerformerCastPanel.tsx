import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Loader2,
  Plus,
  Shirt,
  Sparkles,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import { useRuns } from '../../lib/useRuns';
import {
  CharacterExpression,
  CharacterProfile,
  WardrobeCategory,
  WardrobeItem,
} from '../../types/studio';
import { getMusicVideoImageModels } from '../../catalog/musicVideoCapabilities';
import { fileToDataUrl } from '../../lib/audioEngine';
import { Button, Input, Textarea } from '../ui/primitives';

export interface PerformerCastPanelProps {
  selectedCharacterIds: string[];
  selectedWardrobeId: string | null;
  onToggleCharacter: (charId: string) => void;
  onSelectWardrobe: (wardrobeId: string | null) => void;
}

const WARDROBE_CATEGORIES: WardrobeCategory[] = [
  'Streetwear',
  'Formal',
  'Costume',
  'Futuristic',
  'Casual',
  'Traditional',
  'Corporate',
  'Tactical',
];

const EXPRESSIONS: CharacterExpression[] = [
  'Neutral',
  'Determined',
  'Smiling',
  'Anger',
  'Crying',
  'Surprise',
  'Laughing',
  'Fear',
];

export const PerformerCastPanel: React.FC<PerformerCastPanelProps> = ({
  selectedCharacterIds,
  selectedWardrobeId,
  onToggleCharacter,
  onSelectWardrobe,
}) => {
  const {
    models,
    characters,
    wardrobes,
    generations,
    saveCharacter,
    saveWardrobe,
    uploadReferenceFile,
    submitGeneration,
    showToast,
  } = useRuns();

  const imageModels = useMemo(() => getMusicVideoImageModels(models), [models]);

  const [activeSubTab, setActiveSubTab] = useState<'cast' | 'create_character' | 'wardrobe'>('cast');

  // Create Character form state
  const [charName, setCharName] = useState('');
  const [charRole, setCharRole] = useState('Lead Vocalist');
  const [charAge, setCharAge] = useState('25–30');
  const [charGender, setCharGender] = useState('Female');
  const [charSkinTone, setCharSkinTone] = useState('Rich warm brown');
  const [charHairstyle, setCharHairstyle] = useState('Sculpted dark braids with subtle gold cuffs');
  const [charFeatures, setCharFeatures] = useState(
    'Expressive eyes, sharp cheekbones, natural skin texture, charismatic stage presence'
  );
  const [charExpression, setCharExpression] = useState<CharacterExpression>('Determined');
  const [charPortraitPrompt, setCharPortraitPrompt] = useState('');
  const [charImageModelId, setCharImageModelId] = useState(
    () => imageModels[0]?.id || 'soul-2-standard'
  );
  const [charPreviewUrl, setCharPreviewUrl] = useState('');
  const [charPendingGenId, setCharPendingGenId] = useState<string | null>(null);
  const [charBusy, setCharBusy] = useState(false);

  // Wardrobe & Outfit Designer state
  const [outfitName, setOutfitName] = useState('');
  const [outfitCategory, setOutfitCategory] = useState<WardrobeCategory>('Costume');
  const [outfitGarments, setOutfitGarments] = useState(
    'Tailored metallic-black leather trench over ribbed mesh bodysuit'
  );
  const [outfitShoes, setOutfitShoes] = useState('Chunky architectural combat boots');
  const [outfitAccessories, setOutfitAccessories] = useState(
    'Layered silver chains, sculptural ear cuffs, fingerless stage gloves'
  );
  const [outfitPalette, setOutfitPalette] = useState('Obsidian black, brushed chrome, deep crimson');
  const [outfitHairOverride, setOutfitHairOverride] = useState('');
  const [outfitPreviewUrl, setOutfitPreviewUrl] = useState('');
  const [outfitPendingGenId, setOutfitPendingGenId] = useState<string | null>(null);
  const [outfitBusy, setOutfitBusy] = useState(false);

  const charFileInputRef = useRef<HTMLInputElement | null>(null);
  const outfitFileInputRef = useRef<HTMLInputElement | null>(null);

  // Resolve pending generated character/wardrobe image once completed in global generations poll
  const resolvedCharImage = useMemo(() => {
    if (charPendingGenId) {
      const gen = generations.find((g) => g.id === charPendingGenId);
      if (gen?.status === 'completed' && gen.outputs[0]?.url) {
        return gen.outputs[0].url;
      }
    }
    return charPreviewUrl;
  }, [charPendingGenId, generations, charPreviewUrl]);

  const resolvedOutfitImage = useMemo(() => {
    if (outfitPendingGenId) {
      const gen = generations.find((g) => g.id === outfitPendingGenId);
      if (gen?.status === 'completed' && gen.outputs[0]?.url) {
        return gen.outputs[0].url;
      }
    }
    return outfitPreviewUrl;
  }, [outfitPendingGenId, generations, outfitPreviewUrl]);

  const handleUploadPerformerPhoto = async (file: File) => {
    setCharBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const uploaded = await uploadReferenceFile({
        label: file.name,
        contentType: file.type || 'image/jpeg',
        bytes: file.size,
        dataUrl,
      });
      setCharPreviewUrl(uploaded?.publicUrl || dataUrl);
      setCharPendingGenId(null);
      showToast(`Uploaded performer reference photo "${file.name}"`);
    } catch {
      showToast('Could not upload photo');
    } finally {
      setCharBusy(false);
    }
  };

  const handleGeneratePerformerFace = async () => {
    setCharBusy(true);
    try {
      const fullPrompt = [
        'Photorealistic music video performer identity portrait, clean studio lighting, sharp facial clarity for identity lock:',
        charName ? `${charName}, ${charRole}.` : `${charRole}.`,
        `${charAge} ${charGender}, ${charSkinTone} skin, ${charHairstyle}, ${charFeatures}, expression: ${charExpression}.`,
        charPortraitPrompt.trim(),
      ]
        .filter(Boolean)
        .join(' ');

      const res = await submitGeneration({
        surface: 'image',
        modelId: charImageModelId,
        mode: 'Create',
        prompt: fullPrompt,
        settings: {
          aspect_ratio: '3:4',
          resolution: '2K',
        },
        media: resolvedCharImage
          ? [{ role: 'reference', kind: 'image', url: resolvedCharImage, label: 'Base Identity' }]
          : [],
      });

      if (res.ok && res.generation) {
        setCharPendingGenId(res.generation.id);
        if (res.generation.outputs[0]?.url) {
          setCharPreviewUrl(res.generation.outputs[0].url);
        }
      }
    } finally {
      setCharBusy(false);
    }
  };

  const handleSavePerformer = async () => {
    if (!charName.trim()) {
      showToast('Enter a performer name before saving to My Elements');
      return;
    }
    setCharBusy(true);
    try {
      const saved: CharacterProfile | null = await saveCharacter({
        name: charName.trim(),
        roleTitle: charRole.trim() || 'Music Video Performer',
        faceReferenceUrl: resolvedCharImage || '',
        facialIdentityLock: true,
        consistencyLock: true,
        ageRange: charAge,
        genderPresentation: charGender,
        skinTone: charSkinTone,
        hairstyle: charHairstyle,
        distinctiveFeatures: charFeatures,
        activeExpression: charExpression,
        facePromptDescriptor: charPortraitPrompt || `${charAge} ${charGender}, ${charHairstyle}, ${charFeatures}`,
        defaultWardrobeId: selectedWardrobeId,
      });
      if (saved) {
        if (!selectedCharacterIds.includes(saved.id)) {
          onToggleCharacter(saved.id);
        }
        setCharName('');
        setCharPortraitPrompt('');
        setCharPreviewUrl('');
        setCharPendingGenId(null);
        setActiveSubTab('cast');
      }
    } finally {
      setCharBusy(false);
    }
  };

  const handleUploadWardrobePhoto = async (file: File) => {
    setOutfitBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const uploaded = await uploadReferenceFile({
        label: file.name,
        contentType: file.type || 'image/jpeg',
        bytes: file.size,
        dataUrl,
      });
      setOutfitPreviewUrl(uploaded?.publicUrl || dataUrl);
      setOutfitPendingGenId(null);
      showToast(`Uploaded wardrobe reference "${file.name}"`);
    } catch {
      showToast('Could not upload wardrobe photo');
    } finally {
      setOutfitBusy(false);
    }
  };

  const handleGenerateWardrobePlate = async () => {
    setOutfitBusy(true);
    try {
      const prompt = [
        `Music video costume & wardrobe lookbook plate (${outfitCategory}):`,
        outfitGarments,
        outfitShoes ? `Footwear: ${outfitShoes}.` : '',
        outfitAccessories ? `Accessories: ${outfitAccessories}.` : '',
        outfitPalette ? `Color palette: ${outfitPalette}.` : '',
        outfitHairOverride ? `Hair styling: ${outfitHairOverride}.` : '',
        'Full-body studio fashion lighting, crisp fabric texture, high-fashion music video editorial.',
      ]
        .filter(Boolean)
        .join(' ');

      const res = await submitGeneration({
        surface: 'image',
        modelId: charImageModelId,
        mode: 'Create',
        prompt,
        settings: {
          aspect_ratio: '3:4',
          resolution: '2K',
        },
        media: [],
      });

      if (res.ok && res.generation) {
        setOutfitPendingGenId(res.generation.id);
        if (res.generation.outputs[0]?.url) {
          setOutfitPreviewUrl(res.generation.outputs[0].url);
        }
      }
    } finally {
      setOutfitBusy(false);
    }
  };

  const handleSaveWardrobe = async () => {
    if (!outfitName.trim()) {
      showToast('Enter an outfit or costume name before saving');
      return;
    }
    setOutfitBusy(true);
    try {
      const saved: WardrobeItem | null = await saveWardrobe({
        name: outfitName.trim(),
        category: outfitCategory,
        garments: outfitGarments,
        shoes: outfitShoes,
        accessories: outfitAccessories,
        colorPalette: outfitPalette,
        hairstyleOverride: outfitHairOverride,
        referenceImageUrl: resolvedOutfitImage || '',
        assignedCharacterIds: selectedCharacterIds,
        sceneContinuityLock: true,
      });
      if (saved) {
        onSelectWardrobe(saved.id);
        setOutfitName('');
        setOutfitPreviewUrl('');
        setOutfitPendingGenId(null);
        setActiveSubTab('cast');
      }
    } finally {
      setOutfitBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-wide text-white uppercase">
            Performers, Appearances & Wardrobe
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Create new performers, upload reference photos, design outfits, or select saved cast directly from My Elements.
          </p>
        </div>

        <div className="inline-flex items-center rounded-xl bg-[#101218] p-1 border border-white/[0.08]">
          {[
            { id: 'cast', label: `My Elements Cast (${characters.length})` },
            { id: 'create_character', label: 'New Performer' },
            { id: 'wardrobe', label: `Wardrobe & Outfits (${wardrobes.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-[#46ecd5] text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: SELECT FROM MY ELEMENTS */}
      {activeSubTab === 'cast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Performers Grid */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#46ecd5]" />
                <span>Reusable Performers (My Elements)</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => setActiveSubTab('create_character')}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create or Upload Performer</span>
              </Button>
            </div>

            {characters.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#101218] border border-white/[0.08] text-center space-y-3">
                <p className="text-sm text-zinc-300 font-medium">
                  No performers in My Elements yet
                </p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Generate a performer portrait or upload an existing photograph to maintain facial consistency across every music video scene.
                </p>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setActiveSubTab('create_character')}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Performer</span>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {characters.map((chr) => {
                  const isLocked = selectedCharacterIds.includes(chr.id);
                  return (
                    <button
                      key={chr.id}
                      type="button"
                      onClick={() => onToggleCharacter(chr.id)}
                      className={`group text-left rounded-2xl border overflow-hidden transition-all cursor-pointer ${
                        isLocked
                          ? 'bg-[#121D1D] border-[#46ecd5]/60'
                          : 'bg-[#101218] border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <div className="aspect-[4/3] bg-[#0B0D12] relative overflow-hidden">
                        {chr.faceReferenceUrl ? (
                          <img
                            src={chr.faceReferenceUrl}
                            alt={chr.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#161922] to-[#0B0D12] text-zinc-500 gap-1.5">
                            <Users className="w-6 h-6 text-zinc-600" />
                            <span className="text-[11px] font-mono-tabular">{chr.identityId}</span>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-white truncate">
                            {chr.name}
                          </span>
                          {isLocked && (
                            <span className="w-5 h-5 rounded-full bg-[#46ecd5] text-zinc-950 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 truncate">
                          <span>{chr.roleTitle}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">{chr.identityId}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 line-clamp-2">
                          {chr.hairstyle || chr.distinctiveFeatures || 'Identity-locked performer'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Wardrobe Column */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                <Shirt className="w-4 h-4 text-[#46ecd5]" />
                <span>Active Scene Wardrobe</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => setActiveSubTab('wardrobe')}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Design Outfit</span>
              </Button>
            </div>

            <div className="rounded-2xl bg-[#101218] border border-white/[0.08] p-3 space-y-2 max-h-[420px] overflow-y-auto">
              <button
                type="button"
                onClick={() => onSelectWardrobe(null)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                  selectedWardrobeId === null
                    ? 'bg-[#162323] border-[#46ecd5]/50 text-white font-semibold'
                    : 'bg-[#141720] border-white/[0.06] text-zinc-400 hover:text-white'
                }`}
              >
                Default Performer Wardrobe (No Override)
              </button>

              {wardrobes.map((w) => {
                const active = selectedWardrobeId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onSelectWardrobe(active ? null : w.id)}
                    className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-3 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#162323] border-[#46ecd5]/50 text-white'
                        : 'bg-[#141720] border-white/[0.06] text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-lg bg-[#0B0D12] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                      {w.referenceImageUrl ? (
                        <img
                          src={w.referenceImageUrl}
                          alt={w.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Shirt className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{w.name}</div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {w.category} · {w.garments || w.colorPalette}
                      </div>
                    </div>
                    {active && <Check className="w-4 h-4 text-[#46ecd5] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CREATE / UPLOAD NEW PERFORMER */}
      {activeSubTab === 'create_character' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <input
            ref={charFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUploadPerformerPhoto(f);
              e.target.value = '';
            }}
          />

          {/* Left: Portrait Preview & Upload / Generate Controls */}
          <div className="lg:col-span-5 space-y-3">
            <div className="aspect-[3/4] rounded-2xl bg-[#0D0F15] border border-white/[0.08] overflow-hidden relative flex items-center justify-center">
              {resolvedCharImage ? (
                <img
                  src={resolvedCharImage}
                  alt={charName || 'Performer preview'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <UserCheck className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">
                    Generate a new facial identity or upload an existing artist photograph.
                  </p>
                </div>
              )}
              {charBusy && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 text-xs text-[#46ecd5]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing performer portrait...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={charBusy}
                onClick={() => charFileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </Button>
              <Button
                type="button"
                variant="accent"
                size="sm"
                disabled={charBusy}
                onClick={handleGeneratePerformerFace}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Face</span>
              </Button>
            </div>
          </div>

          {/* Right: Performer Identity Attributes */}
          <div className="lg:col-span-7 rounded-2xl bg-[#101218] border border-white/[0.08] p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Performer Name</label>
                <Input
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="e.g. Zara Vance"
                  className="bg-[#0B0D12] border-white/10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Role in Music Video</label>
                <Input
                  value={charRole}
                  onChange={(e) => setCharRole(e.target.value)}
                  placeholder="Lead Vocalist, Featured Artist, Dancer"
                  className="bg-[#0B0D12] border-white/10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Age Range</label>
                <Input
                  value={charAge}
                  onChange={(e) => setCharAge(e.target.value)}
                  className="bg-[#0B0D12] border-white/10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Presentation</label>
                <Input
                  value={charGender}
                  onChange={(e) => setCharGender(e.target.value)}
                  className="bg-[#0B0D12] border-white/10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Skin Tone</label>
                <Input
                  value={charSkinTone}
                  onChange={(e) => setCharSkinTone(e.target.value)}
                  className="bg-[#0B0D12] border-white/10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Default Expression</label>
                <select
                  value={charExpression}
                  onChange={(e) => setCharExpression(e.target.value as CharacterExpression)}
                  className="w-full h-9 rounded-xl bg-[#0B0D12] border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-[#46ecd5]"
                >
                  {EXPRESSIONS.map((ex) => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Hairstyle & Silhouette</label>
              <Input
                value={charHairstyle}
                onChange={(e) => setCharHairstyle(e.target.value)}
                className="bg-[#0B0D12] border-white/10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Distinctive Facial Features & Styling Notes
              </label>
              <Textarea
                rows={2}
                value={charFeatures}
                onChange={(e) => setCharFeatures(e.target.value)}
                className="bg-[#0B0D12] border-white/10 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Portrait Image Model
                </label>
                <select
                  value={charImageModelId}
                  onChange={(e) => setCharImageModelId(e.target.value)}
                  className="w-full h-9 rounded-xl bg-[#0B0D12] border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-[#46ecd5]"
                >
                  {imageModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.provider})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Extra Appearance Prompt (Optional)
                </label>
                <Input
                  value={charPortraitPrompt}
                  onChange={(e) => setCharPortraitPrompt(e.target.value)}
                  placeholder="Editorial makeup, studio rim lighting..."
                  className="bg-[#0B0D12] border-white/10 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/[0.06]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setActiveSubTab('cast')}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={charBusy || !charName.trim()}
                onClick={handleSavePerformer}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Save Performer to My Elements</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WARDROBE & COSTUME DESIGNER */}
      {activeSubTab === 'wardrobe' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <input
            ref={outfitFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUploadWardrobePhoto(f);
              e.target.value = '';
            }}
          />

          <div className="lg:col-span-5 space-y-3">
            <div className="aspect-[3/4] rounded-2xl bg-[#0D0F15] border border-white/[0.08] overflow-hidden relative flex items-center justify-center">
              {resolvedOutfitImage ? (
                <img
                  src={resolvedOutfitImage}
                  alt={outfitName || 'Wardrobe reference'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Shirt className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs text-zinc-400">
                    Generate a costume lookbook plate or upload an outfit reference image.
                  </p>
                </div>
              )}
              {outfitBusy && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 text-xs text-[#46ecd5]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating wardrobe lookbook...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={outfitBusy}
                onClick={() => outfitFileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Outfit</span>
              </Button>
              <Button
                type="button"
                variant="accent"
                size="sm"
                disabled={outfitBusy}
                onClick={handleGenerateWardrobePlate}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Lookbook</span>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl bg-[#101218] border border-white/[0.08] p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Outfit / Look Name</label>
                <Input
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  placeholder="e.g. Verse 1 Chrome Stage Look"
                  className="bg-[#0B0D12] border-white/10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Style Category</label>
                <select
                  value={outfitCategory}
                  onChange={(e) => setOutfitCategory(e.target.value as WardrobeCategory)}
                  className="w-full h-9 rounded-xl bg-[#0B0D12] border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-[#46ecd5]"
                >
                  {WARDROBE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Garments & Silhouette</label>
              <Textarea
                rows={2}
                value={outfitGarments}
                onChange={(e) => setOutfitGarments(e.target.value)}
                className="bg-[#0B0D12] border-white/10 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Footwear</label>
                <Input
                  value={outfitShoes}
                  onChange={(e) => setOutfitShoes(e.target.value)}
                  className="bg-[#0B0D12] border-white/10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Color Palette</label>
                <Input
                  value={outfitPalette}
                  onChange={(e) => setOutfitPalette(e.target.value)}
                  className="bg-[#0B0D12] border-white/10 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Accessories & Jewellery
                </label>
                <Input
                  value={outfitAccessories}
                  onChange={(e) => setOutfitAccessories(e.target.value)}
                  className="bg-[#0B0D12] border-white/10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Hairstyle Variation (Optional)
                </label>
                <Input
                  value={outfitHairOverride}
                  onChange={(e) => setOutfitHairOverride(e.target.value)}
                  placeholder="Leave blank to keep performer default"
                  className="bg-[#0B0D12] border-white/10 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/[0.06]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setActiveSubTab('cast')}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={outfitBusy || !outfitName.trim()}
                onClick={handleSaveWardrobe}
              >
                <Shirt className="w-3.5 h-3.5" />
                <span>Save Wardrobe Reference</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
