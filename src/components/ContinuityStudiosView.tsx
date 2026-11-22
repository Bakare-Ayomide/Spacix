import React, { useMemo, useRef, useState } from 'react';
import {
  Clapperboard,
  Compass,
  Download,
  Film,
  Flame,
  FolderPlus,
  Layers,
  Lock,
  MapPin,
  Mic,
  Move,
  Music,
  Package,
  Play,
  Plus,
  Scissors,
  Shirt,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  UserCheck,
  Users,
  Video,
  Volume2,
  Wand2,
  Workflow,
} from 'lucide-react';
import {
  CameraAngleType,
  CanvasWorkflowNode,
  CharacterExpression,
  CharacterProfile,
  CinemaProductionProject,
  CinemaProductionType,
  LocationCategory,
  LocationItem,
  MediaSlotInput,
  MotionCategory,
  MotionKeyframe,
  MotionTemplateItem,
  ProductionScene,
  ProductionShot,
  PropCategory,
  PropItem,
  ShotSizeType,
  StudioId,
  SupportedCharacterLanguage,
  WardrobeCategory,
  WardrobeItem,
} from '../types/studio';
import { RoutePath, useRuns } from '../lib/useRuns';
import { GenerationTile } from './StudioGeneratorView';
import { StoryStudioView } from './StoryStudioView';
import { HiggsfieldCinemaStudio } from './HiggsfieldCinemaStudio';

export const SPACI6X_STUDIOS: Array<{
  id: StudioId;
  label: string;
  shortLabel: string;
  responsibility: string;
}> = [
  {
    id: 'cinema',
    label: 'Cinema Studio',
    shortLabel: 'Cinema',
    responsibility: 'Movies, screenplays, shot lists & 10 production formats',
  },
  {
    id: 'character',
    label: 'Character Studio',
    shortLabel: 'Character',
    responsibility: 'Permanent identity IDs, faces, bodies, voices & languages',
  },
  {
    id: 'motion',
    label: 'Motion Studio',
    shortLabel: 'Motion',
    responsibility: 'Reference-video motion transfer, pose & keyframe paths',
  },
  {
    id: 'wardrobe',
    label: 'Wardrobe Studio',
    shortLabel: 'Wardrobe',
    responsibility: 'Outfits, traditional/formal wear, accessories & scene lock',
  },
  {
    id: 'props',
    label: 'Props Studio',
    shortLabel: 'Props',
    responsibility: 'Vehicles, tech, weapons, artifacts & object continuity',
  },
  {
    id: 'location',
    label: 'Location Studio',
    shortLabel: 'Location',
    responsibility: 'INT./EXT. sets, time/weather & multi-angle plates',
  },
  {
    id: 'storyboard',
    label: 'Storyboard Studio',
    shortLabel: 'Storyboard',
    responsibility: 'Visual shot planning, camera lenses & board-to-shot video',
  },
  {
    id: 'marketing',
    label: 'Marketing Studio',
    shortLabel: 'Marketing',
    responsibility: 'Commercials, UGC creator ads & product reels',
  },
  {
    id: 'lipsync',
    label: 'Lip Sync Studio',
    shortLabel: 'Lip Sync',
    responsibility: 'Multilingual dialogue & facial lip synchronization',
  },
  {
    id: 'effects',
    label: 'Effects Studio',
    shortLabel: 'Effects',
    responsibility: 'Camera rigs, visual effects & transformations',
  },
  {
    id: 'canvas',
    label: 'Canvas Studio',
    shortLabel: 'Canvas',
    responsibility: 'Connected multi-model & continuity asset node workflows',
  },
  {
    id: 'editing',
    label: 'Editing Studio',
    shortLabel: 'Editing',
    responsibility: 'Video, dialogue, music, SFX tracks & final assembly',
  },
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

const EXPRESSIONS: CharacterExpression[] = [
  'Neutral',
  'Smiling',
  'Crying',
  'Anger',
  'Fear',
  'Surprise',
  'Determined',
  'Laughing',
];

const PRODUCTION_FORMATS: Array<{
  type: CinemaProductionType;
  toolsSummary: string;
  recommendedAspect: '16:9' | '21:9' | '9:16' | '1:1';
}> = [
  {
    type: 'Movies',
    toolsSummary: 'Screenplay, scenes, characters, dialogue and shot planning',
    recommendedAspect: '21:9',
  },
  {
    type: 'Short Films',
    toolsSummary: 'Screenplay, character continuity and complete scene production',
    recommendedAspect: '16:9',
  },
  {
    type: 'Music Videos',
    toolsSummary: 'Song upload, beat analysis, visual scenes and performance shots',
    recommendedAspect: '16:9',
  },
  {
    type: 'UGC',
    toolsSummary: 'Creator characters, product references and social-media formats',
    recommendedAspect: '9:16',
  },
  {
    type: 'Interviews',
    toolsSummary: 'Interview framing, multiple cameras and dialogue',
    recommendedAspect: '16:9',
  },
  {
    type: 'Documentaries',
    toolsSummary: 'Narration, archival visuals, interviews and B-roll',
    recommendedAspect: '16:9',
  },
  {
    type: 'Explainer Videos',
    toolsSummary: 'Script, narration, graphics and animations',
    recommendedAspect: '16:9',
  },
  {
    type: 'Montages',
    toolsSummary: 'Music synchronization, transitions and shot sequences',
    recommendedAspect: '16:9',
  },
  {
    type: 'Commercials',
    toolsSummary: 'Product shots, advertising scripts and promotional scenes',
    recommendedAspect: '16:9',
  },
  {
    type: 'Trailers',
    toolsSummary: 'Dramatic sequences, music and sound effects',
    recommendedAspect: '21:9',
  },
];

// ============================================================================
// SHARED CONTINUITY NAVIGATION & LOCK BAR
// ============================================================================
export const ContinuityStudioBar: React.FC<{ activeStudio?: StudioId }> = ({ activeStudio }) => {
  const {
    route,
    navigate,
    characters,
    wardrobes,
    propsList,
    locations,
    motionTemplates,
    cinemaProjects,
    activeContinuity,
    setActiveContinuity,
  } = useRuns();

  const toggleCharacterLock = (chrId: string) => {
    setActiveContinuity((prev) => {
      const exists = prev.characterIds.includes(chrId);
      const nextIds = exists
        ? prev.characterIds.filter((id) => id !== chrId)
        : [...prev.characterIds, chrId];
      const chr = characters.find((c) => c.id === chrId);
      return {
        ...prev,
        characterIds: nextIds,
        wardrobeId:
          !exists && chr?.defaultWardrobeId && !prev.wardrobeId
            ? chr.defaultWardrobeId
            : prev.wardrobeId,
      };
    });
  };

  return (
    <div className="bg-[#0D0D11] border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-2 space-y-2">
        {/* Cross-Studio Continuity Lock Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#46ecd5]/10 border border-[#46ecd5]/30 font-mono-tabular text-[11px] text-[#46ecd5] font-semibold whitespace-nowrap shrink-0">
              <Lock className="w-3 h-3" />
              <span>ACTIVE CONTINUITY BUS</span>
            </span>

            {/* Active Project Selector */}
            <select
              value={activeContinuity.projectId || ''}
              onChange={(e) =>
                setActiveContinuity((prev) => ({
                  ...prev,
                  projectId: e.target.value || null,
                }))
              }
              aria-label="Active Production Project"
              className="px-2.5 py-1 rounded bg-[#141419] border border-white/10 text-zinc-200 text-xs"
            >
              <option value="">All Productions ({cinemaProjects.length})</option>
              {cinemaProjects.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.title} ({cp.productionType})
                </option>
              ))}
            </select>

            {/* Locked Character Selector */}
            <select
              value={activeContinuity.characterIds[0] || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setActiveContinuity((prev) => ({ ...prev, characterIds: [] }));
                } else {
                  toggleCharacterLock(val);
                }
              }}
              aria-label="Lock Character Identity"
              className="px-2.5 py-1 rounded bg-[#141419] border border-white/10 text-zinc-200 text-xs"
            >
              <option value="">
                {activeContinuity.characterIds.length > 0
                  ? `${activeContinuity.characterIds.length} Character(s) Locked`
                  : `Lock Character (${characters.length})`}
              </option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {activeContinuity.characterIds.includes(c.id) ? '✓ ' : ''}
                  {c.name} [{c.identityId}] · {c.primaryLanguage}
                </option>
              ))}
            </select>

            {/* Locked Wardrobe Selector */}
            <select
              value={activeContinuity.wardrobeId || ''}
              onChange={(e) =>
                setActiveContinuity((prev) => ({
                  ...prev,
                  wardrobeId: e.target.value || null,
                }))
              }
              aria-label="Lock Wardrobe Outfit"
              className="px-2.5 py-1 rounded bg-[#141419] border border-white/10 text-zinc-200 text-xs"
            >
              <option value="">Wardrobe ({wardrobes.length})</option>
              {wardrobes.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} [{w.wardrobeCode}] ({w.category})
                </option>
              ))}
            </select>

            {/* Locked Location Selector */}
            <select
              value={activeContinuity.locationId || ''}
              onChange={(e) =>
                setActiveContinuity((prev) => ({
                  ...prev,
                  locationId: e.target.value || null,
                }))
              }
              aria-label="Lock Filming Location"
              className="px-2.5 py-1 rounded bg-[#141419] border border-white/10 text-zinc-200 text-xs"
            >
              <option value="">Location ({locations.length})</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.settingType} {l.name} [{l.locationCode}] ({l.timeOfDay})
                </option>
              ))}
            </select>

            {/* Locked Prop Selector */}
            <select
              value={activeContinuity.propIds[0] || ''}
              onChange={(e) => {
                const val = e.target.value;
                setActiveContinuity((prev) => ({
                  ...prev,
                  propIds: val ? [val] : [],
                }));
              }}
              aria-label="Lock Scene Prop"
              className="px-2.5 py-1 rounded bg-[#141419] border border-white/10 text-zinc-200 text-xs"
            >
              <option value="">Props ({propsList.length})</option>
              {propsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.propCode}] ({p.category})
                </option>
              ))}
            </select>

            {/* Locked Motion Template Selector */}
            <select
              value={activeContinuity.motionTemplateId || ''}
              onChange={(e) =>
                setActiveContinuity((prev) => ({
                  ...prev,
                  motionTemplateId: e.target.value || null,
                }))
              }
              aria-label="Lock Motion Rig"
              className="px-2.5 py-1 rounded bg-[#141419] border border-white/10 text-zinc-200 text-xs"
            >
              <option value="">Motion Rig ({motionTemplates.length})</option>
              {motionTemplates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} [{m.motionCode}] ({m.movementCategory})
                </option>
              ))}
            </select>
          </div>

          {(activeContinuity.characterIds.length > 0 ||
            activeContinuity.wardrobeId ||
            activeContinuity.locationId ||
            activeContinuity.propIds.length > 0 ||
            activeContinuity.motionTemplateId) && (
            <button
              onClick={() =>
                setActiveContinuity({
                  projectId: activeContinuity.projectId,
                  characterIds: [],
                  wardrobeId: null,
                  propIds: [],
                  locationId: null,
                  motionTemplateId: null,
                })
              }
              className="text-[11px] text-zinc-400 hover:text-white underline whitespace-nowrap shrink-0"
            >
              Clear Active Locks
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 1. CHARACTER STUDIO — IDENTITY & PERFORMANCE
// ============================================================================
export const CharacterStudioView: React.FC = () => {
  const {
    characters,
    wardrobes,
    propsList,
    generations,
    saveCharacter,
    deleteCharacter,
    submitGeneration,
    uploadReferenceFile,
    activeContinuity,
    setActiveContinuity,
    setSelectedGeneration,
    navigate,
    showToast,
  } = useRuns();

  const [selectedId, setSelectedId] = useState<string | null>(
    () => characters[0]?.id || null
  );
  const [isGeneratingFace, setIsGeneratingFace] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isGeneratingExpression, setIsGeneratingExpression] = useState(false);
  const [voiceTestLine, setVoiceTestLine] = useState(
    'We built this city from starlight and determination. Every scene remembers who we are.'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceFileInputRef = useRef<HTMLInputElement>(null);

  const emptyDraft: Partial<CharacterProfile> & { name: string } = {
    name: '',
    roleTitle: 'Lead Protagonist',
    faceReferenceUrl: '',
    facialIdentityLock: true,
    identitySeed: 482910,
    facePromptDescriptor: '',
    ageRange: '25-32',
    genderPresentation: 'Female',
    skinTone: 'Rich Mahogany',
    bodyType: 'Athletic',
    height: '5\'9" (175cm)',
    hairstyle: 'Braided Crown Locs',
    eyeColor: 'Dark Brown',
    distinctiveFeatures: 'High cheekbones, subtle brow scar, warm confident gaze',
    voiceName: 'Adaeze Studio Master',
    voiceMode: 'generated',
    voiceCloneConsent: false,
    voiceSampleUrl: '',
    voiceIdentityLock: true,
    primaryLanguage: 'English',
    supportedLanguages: ['English', 'Nigerian Pidgin', 'Yoruba', 'Igbo', 'Hausa', 'French'],
    speechAccent: 'Lagos Nigerian',
    pitch: 'Medium',
    tone: 'Warm & Resonant',
    defaultEmotion: 'Confident',
    speakingSpeed: 1.0,
    deliveryStyle: 'Dramatic Cinema',
    activeExpression: 'Neutral',
    expressionSheetUrls: {},
    defaultWardrobeId: null,
    assignedWardrobeIds: [],
    assignedPropIds: [],
    consistencyLock: true,
    continuityNotes: 'Preserve exact facial bone structure, skin tone, voice timbre, and assigned wardrobe across all scenes.',
  };

  const [form, setForm] = useState<Partial<CharacterProfile> & { name: string }>(() => {
    const first = characters[0];
    return first ? { ...first } : emptyDraft;
  });

  const selectCharacter = (chr: CharacterProfile) => {
    setSelectedId(chr.id);
    setForm({ ...chr });
  };

  const startNewCharacter = () => {
    setSelectedId(null);
    setForm({
      ...emptyDraft,
      identityId: `CHR-ID-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      voiceId: `VOX-ID-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) {
      showToast('Please enter a character name');
      return null;
    }
    const saved = await saveCharacter(form);
    if (saved) {
      setSelectedId(saved.id);
      setForm({ ...saved });
    }
    return saved;
  };

  const handleUploadFaceRef = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      const upl = await uploadReferenceFile({
        label: `${form.name || 'Character'} Face Reference`,
        contentType: file.type || 'image/jpeg',
        bytes: file.size,
        dataUrl,
      });
      if (upl) {
        setForm((prev) => ({ ...prev, faceReferenceUrl: upl.publicUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadVoiceSample = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      const upl = await uploadReferenceFile({
        label: `${form.name || 'Character'} Voice Clone Reference`,
        contentType: file.type || 'audio/wav',
        bytes: file.size,
        dataUrl,
      });
      if (upl) {
        setForm((prev) => ({ ...prev, voiceSampleUrl: upl.publicUrl, voiceMode: 'cloned' }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGeneratePortrait = async () => {
    if (!form.name.trim()) {
      showToast('Enter character name before generating identity portrait');
      return;
    }
    setIsGeneratingFace(true);
    try {
      const outfit = wardrobes.find((w) => w.id === form.defaultWardrobeId);
      const portraitPrompt = `Cinema character identity reference portrait of ${form.name} (${form.identityId || 'LOCKED-ID'}), ${form.ageRange} year old ${form.genderPresentation}, ${form.skinTone} skin tone, ${form.bodyType} build, height ${form.height}, ${form.hairstyle} hairstyle, ${form.eyeColor} eyes, ${form.distinctiveFeatures || 'natural skin texture'}, facial expression: ${form.activeExpression || 'Neutral'}${outfit ? `, wearing ${outfit.name} (${outfit.garments})` : ''}. 85mm cinema portrait lens, neutral studio key lighting, 8k photorealistic continuity master.`;
      const res = await submitGeneration({
        surface: 'image',
        modelId: 'soul-2-standard',
        mode: 'Create',
        prompt: portraitPrompt,
        settings: { aspect_ratio: '1:1', quality: '1080p' },
        media: form.faceReferenceUrl
          ? [
              {
                role: 'reference',
                kind: 'image',
                url: form.faceReferenceUrl,
                label: 'Face Identity Reference',
              },
            ]
          : [],
      });
      const outUrl = res.generation?.outputs?.[0]?.url;
      if (outUrl) {
        const updated = { ...form, faceReferenceUrl: outUrl };
        setForm(updated);
        await saveCharacter(updated);
      }
    } finally {
      setIsGeneratingFace(false);
    }
  };

  const handleGenerateExpression = async (expr: CharacterExpression) => {
    setForm((prev) => ({ ...prev, activeExpression: expr }));
    if (!form.name.trim()) return;
    setIsGeneratingExpression(true);
    try {
      const exprPrompt = `Character expression reference frame for ${form.name} (${form.identityId || 'LOCKED'}), ${form.ageRange} ${form.genderPresentation}, ${form.skinTone} skin, ${form.hairstyle} hair, ${form.eyeColor} eyes, ${form.distinctiveFeatures}, showing clear "${expr}" facial emotion while preserving 100% identical facial bone structure and identity.`;
      const res = await submitGeneration({
        surface: 'image',
        modelId: 'soul-2-standard',
        mode: 'Create',
        prompt: exprPrompt,
        settings: { aspect_ratio: '1:1', quality: '1080p' },
        media: form.faceReferenceUrl
          ? [{ role: 'reference', kind: 'image', url: form.faceReferenceUrl, label: form.name }]
          : [],
      });
      const outUrl = res.generation?.outputs?.[0]?.url;
      if (outUrl) {
        const nextSheets = { ...(form.expressionSheetUrls || {}), [expr]: outUrl };
        const updated = { ...form, activeExpression: expr, expressionSheetUrls: nextSheets };
        setForm(updated);
        await saveCharacter(updated);
      }
    } finally {
      setIsGeneratingExpression(false);
    }
  };

  const handleGenerateVoiceSample = async () => {
    if (form.voiceMode === 'cloned' && !form.voiceCloneConsent) {
      showToast('Please confirm voice cloning consent before synthesizing cloned voice');
      return;
    }
    setIsGeneratingVoice(true);
    try {
      const voicePrompt = `Voice synthesis for character ${form.name} (${form.voiceId || 'VOX-LOCKED'}): Language: ${form.primaryLanguage}, Accent: ${form.speechAccent}, Pitch: ${form.pitch}, Tone: ${form.tone}, Emotion: ${form.defaultEmotion}, Speed: ${form.speakingSpeed}x, Delivery: ${form.deliveryStyle}. Spoken line: "${voiceTestLine}"`;
      const res = await submitGeneration({
        surface: 'audio',
        modelId: 'fish-speech-s2-1',
        mode: 'Voice Clone & TTS',
        prompt: voicePrompt,
        settings: { duration: 10, format: 'wav' },
        media: form.voiceSampleUrl
          ? [{ role: 'audio', kind: 'audio', url: form.voiceSampleUrl, label: 'Voice Clone Sample' }]
          : [],
      });
      const outUrl = res.generation?.outputs?.[0]?.url;
      if (outUrl) {
        const updated = { ...form, voiceSampleUrl: outUrl };
        setForm(updated);
        if (form.name.trim()) {
          await saveCharacter(updated);
        }
      }
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  return (
    <HiggsfieldCinemaStudio
      studioId="character"
      renderStudioVault={() => (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Studio Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="text-xs font-mono-tabular text-[#46ecd5] uppercase tracking-wider">
              01 · CHARACTER STUDIO — IDENTITY & PERFORMANCE CONTINUITY
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white mt-1">
              Permanent Character Identities & Multilingual Voices
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl">
              Every character receives a permanent Identity ID, facial identity lock, appearance matrix, voice identity lock (English, Nigerian Pidgin, Yoruba, Igbo, Hausa, French & more), expression sheet, and linked wardrobe outfits that persist across every studio.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={startNewCharacter}
              className="px-4 py-2.5 rounded-xl bg-[#16161D] hover:bg-[#1E1E28] border border-white/15 text-xs font-bold uppercase text-white flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#46ecd5]" />
              <span>New Character Profile</span>
            </button>
            <button
              onClick={() => handleSave()}
              className="px-5 py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105 flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Save Identity Profile</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Saved Characters Roster */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl bg-[#111115] border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Saved Character Roster ({characters.length})
                </h2>
                <span className="text-[11px] font-mono-tabular text-zinc-400">
                  MySQL Synced
                </span>
              </div>

              {characters.length === 0 ? (
                <div className="p-6 rounded-lg bg-[#0B0B0E] border border-white/5 text-center space-y-2">
                  <Users className="w-7 h-7 text-[#46ecd5] mx-auto" />
                  <div className="text-xs font-semibold text-white">
                    No Characters Saved Yet
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Fill out the Character Identity Profile on the right and click Save Identity Profile to create your first reusable character.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
                  {characters.map((chr) => {
                    const isSelected = selectedId === chr.id;
                    const isLockedInBus = activeContinuity.characterIds.includes(chr.id);
                    const outfit = wardrobes.find((w) => w.id === chr.defaultWardrobeId);
                    return (
                      <div
                        key={chr.id}
                        onClick={() => selectCharacter(chr)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                          isSelected
                            ? 'bg-[#171B1E] border-[#46ecd5]'
                            : 'bg-[#0C0C10] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-lg bg-zinc-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                            {chr.faceReferenceUrl ? (
                              <img
                                src={chr.faceReferenceUrl}
                                alt={chr.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-6 h-6 text-[#46ecd5]/60" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-sm text-white truncate">
                                {chr.name}
                              </span>
                              <span className="font-mono-tabular text-[10px] text-[#46ecd5] shrink-0">
                                {chr.identityId}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate">
                              {chr.roleTitle} · {chr.ageRange} · {chr.skinTone}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                              Voice: {chr.primaryLanguage} ({chr.speechAccent})
                            </div>
                            {outfit && (
                              <div className="text-[11px] text-[#46ecd5] truncate mt-0.5">
                                Wardrobe: {outfit.name}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveContinuity((prev) => {
                                const exists = prev.characterIds.includes(chr.id);
                                return {
                                  ...prev,
                                  characterIds: exists
                                    ? prev.characterIds.filter((id) => id !== chr.id)
                                    : [...prev.characterIds, chr.id],
                                  wardrobeId: chr.defaultWardrobeId || prev.wardrobeId,
                                };
                              });
                            }}
                            className={`px-2.5 py-1 rounded font-semibold flex items-center gap-1 ${
                              isLockedInBus
                                ? 'bg-[#46ecd5] text-zinc-950'
                                : 'bg-zinc-900 text-zinc-300 hover:text-white border border-white/10'
                            }`}
                          >
                            {isLockedInBus ? (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Locked in Continuity Bus</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>Lock for All Studios</span>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveContinuity((prev) => ({
                                  ...prev,
                                  characterIds: [chr.id],
                                  wardrobeId: chr.defaultWardrobeId || prev.wardrobeId,
                                }));
                                navigate('cinema');
                              }}
                              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300"
                            >
                              Use in Cinema →
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCharacter(chr.id);
                              }}
                              aria-label="Delete character"
                              className="p-1 text-zinc-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Complete Character Identity & Performance Editor */}
          <form onSubmit={handleSave} className="lg:col-span-8 space-y-6">
            {/* Section A: Permanent Identity ID & Face Lock */}
            <div className="rounded-xl bg-[#111115] border border-white/10 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    1. Permanent Identity & Face Lock
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Every generation referencing this character uses this saved identity ID and face reference rather than recreating a random look.
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono-tabular text-xs text-[#46ecd5]">
                  <span>ID: {form.identityId || 'CHR-ID-NEW'}</span>
                  <span>·</span>
                  <span>SEED: {form.identitySeed || 482910}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-4 space-y-2.5">
                  <div className="aspect-square rounded-xl bg-[#09090C] border border-white/10 overflow-hidden flex items-center justify-center relative">
                    {form.faceReferenceUrl ? (
                      <img
                        src={form.faceReferenceUrl}
                        alt={form.name || 'Character Face'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 space-y-1.5">
                        <Users className="w-8 h-8 text-[#46ecd5]/60 mx-auto" />
                        <div className="text-xs text-zinc-400">
                          Upload or Generate Face Master
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFaceRef}
                    className="hidden"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#46ecd5]" />
                      <span>Upload Face</span>
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingFace}
                      onClick={handleGeneratePortrait}
                      className="px-3 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>{isGeneratingFace ? 'Generating...' : 'Generate Face'}</span>
                    </button>
                  </div>
                </div>

                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-zinc-400 mb-1">Character Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Detective Kemi Adeyemi"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Production Role</label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Protagonist / Creator Host"
                      value={form.roleTitle || ''}
                      onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Age Range</label>
                    <select
                      value={form.ageRange || '25-32'}
                      onChange={(e) => setForm({ ...form, ageRange: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                    >
                      {['18-24', '25-32', '30-40', '40-50', '50-65', '65+'].map((r) => (
                        <option key={r} value={r}>
                          {r} years
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Gender / Presentation</label>
                    <select
                      value={form.genderPresentation || 'Female'}
                      onChange={(e) => setForm({ ...form, genderPresentation: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                    >
                      {['Female', 'Male', 'Non-Binary', 'Androgynous'].map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Skin Tone</label>
                    <input
                      type="text"
                      value={form.skinTone || ''}
                      onChange={(e) => setForm({ ...form, skinTone: e.target.value })}
                      placeholder="e.g. Rich Mahogany, Deep Ebony, Golden Bronze"
                      className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Body Type & Height</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={form.bodyType || ''}
                        onChange={(e) => setForm({ ...form, bodyType: e.target.value })}
                        placeholder="Athletic"
                        className="w-full px-2.5 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                      />
                      <input
                        type="text"
                        value={form.height || ''}
                        onChange={(e) => setForm({ ...form, height: e.target.value })}
                        placeholder="5'9 (175cm)"
                        className="w-full px-2.5 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Hairstyle</label>
                    <input
                      type="text"
                      value={form.hairstyle || ''}
                      onChange={(e) => setForm({ ...form, hairstyle: e.target.value })}
                      placeholder="e.g. Braided Crown Locs, Low Taper Fade"
                      className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Eyes & Distinctive Features</label>
                    <input
                      type="text"
                      value={form.distinctiveFeatures || ''}
                      onChange={(e) => setForm({ ...form, distinctiveFeatures: e.target.value })}
                      placeholder="e.g. Dark brown eyes, subtle left eyebrow scar"
                      className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 text-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.facialIdentityLock ?? true}
                        onChange={(e) =>
                          setForm({ ...form, facialIdentityLock: e.target.checked })
                        }
                        className="accent-[#46ecd5]"
                      />
                      <span>Facial Identity Lock (Enforce across all scenes)</span>
                    </label>
                    <label className="flex items-center gap-2 text-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.consistencyLock ?? true}
                        onChange={(e) =>
                          setForm({ ...form, consistencyLock: e.target.checked })
                        }
                        className="accent-[#46ecd5]"
                      />
                      <span>Full Body, Wardrobe & Voice Continuity Lock</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Section B: Voice, Multilingual Speech & Delivery */}
            <div className="rounded-xl bg-[#111115] border border-white/10 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    2. Voice Identity, Languages & Speech Delivery
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Supports English, Nigerian Pidgin, Yoruba, Igbo, Hausa, French and more with voice cloning consent and voice identity lock.
                  </p>
                </div>
                <span className="font-mono-tabular text-xs text-[#46ecd5]">
                  VOICE ID: {form.voiceId || 'VOX-ID-LOCKED'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Primary Language</label>
                  <select
                    value={form.primaryLanguage || 'English'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        primaryLanguage: e.target.value as SupportedCharacterLanguage,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Accent & Regional Inflection</label>
                  <input
                    type="text"
                    value={form.speechAccent || ''}
                    onChange={(e) => setForm({ ...form, speechAccent: e.target.value })}
                    placeholder="e.g. Lagos Nigerian, West African, Parisian French"
                    className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Voice Source Mode</label>
                  <select
                    value={form.voiceMode || 'generated'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        voiceMode: e.target.value as 'generated' | 'cloned' | 'selected',
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                  >
                    <option value="generated">AI Generated Voice Identity</option>
                    <option value="cloned">Voice Cloning (With Consent)</option>
                    <option value="selected">Studio Voice Preset</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Pitch</label>
                  <select
                    value={form.pitch || 'Medium'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pitch: e.target.value as CharacterProfile['pitch'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                  >
                    {['Low', 'Medium-Low', 'Medium', 'Medium-High', 'High'].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Tone & Emotion</label>
                  <input
                    type="text"
                    value={form.tone || ''}
                    onChange={(e) => setForm({ ...form, tone: e.target.value })}
                    placeholder="e.g. Warm & Resonant, Authoritative"
                    className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">
                    Speaking Speed ({form.speakingSpeed || 1.0}x) & Style
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.75"
                      max="1.5"
                      step="0.05"
                      value={form.speakingSpeed || 1.0}
                      onChange={(e) =>
                        setForm({ ...form, speakingSpeed: parseFloat(e.target.value) })
                      }
                      className="w-24 accent-[#46ecd5]"
                    />
                    <input
                      type="text"
                      value={form.deliveryStyle || ''}
                      onChange={(e) => setForm({ ...form, deliveryStyle: e.target.value })}
                      placeholder="Dramatic Cinema"
                      className="flex-1 px-2.5 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Supported Multilingual Toggles */}
              <div className="space-y-1.5">
                <div className="text-xs text-zinc-400">
                  Additional Fluent Languages for Dialogue & Lip-Sync:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const active = (form.supportedLanguages || []).includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          const curr = form.supportedLanguages || [];
                          const next = active
                            ? curr.filter((l) => l !== lang)
                            : [...curr, lang];
                          setForm({ ...form, supportedLanguages: next });
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          active
                            ? 'bg-[#46ecd5]/20 border border-[#46ecd5] text-[#46ecd5]'
                            : 'bg-[#09090C] border border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voice Cloning Consent + Sample Audition */}
              <div className="p-3.5 rounded-lg bg-[#09090C] border border-white/10 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-zinc-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.voiceCloneConsent ?? false}
                      onChange={(e) =>
                        setForm({ ...form, voiceCloneConsent: e.target.checked })
                      }
                      className="accent-[#46ecd5]"
                    />
                    <span>
                      I confirm explicit voice owner consent for voice cloning & synthesis
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={voiceFileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleUploadVoiceSample}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => voiceFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#46ecd5]" />
                      <span>Upload Voice Reference</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={voiceTestLine}
                    onChange={(e) => setVoiceTestLine(e.target.value)}
                    placeholder="Enter dialogue line in English, Pidgin, Yoruba, Igbo, Hausa, or French..."
                    className="flex-1 px-3 py-2 rounded-lg bg-[#121217] border border-white/10 text-white"
                  />
                  <button
                    type="button"
                    disabled={isGeneratingVoice}
                    onClick={handleGenerateVoiceSample}
                    className="px-4 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>
                      {isGeneratingVoice ? 'Synthesizing Voice...' : 'Synthesize Voice Audition'}
                    </span>
                  </button>
                </div>

                {form.voiceSampleUrl && (
                  <div className="pt-2">
                    <audio controls src={form.voiceSampleUrl} className="w-full h-8" />
                  </div>
                )}
              </div>
            </div>

            {/* Section C: Facial Expressions & Wardrobe / Props Links */}
            <div className="rounded-xl bg-[#111115] border border-white/10 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    3. Facial Expressions, Linked Wardrobe & Character Props
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Link saved outfits from Wardrobe Studio and objects from Props Studio to maintain continuity across scenes.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-zinc-400 flex items-center justify-between">
                  <span>Active Facial Expression & Expression Sheet Generator:</span>
                  {isGeneratingExpression && (
                    <span className="text-[#46ecd5] font-mono-tabular">
                      Generating expression frame...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EXPRESSIONS.map((expr) => {
                    const active = form.activeExpression === expr;
                    const sheetUrl = form.expressionSheetUrls?.[expr];
                    return (
                      <div
                        key={expr}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                            : 'bg-[#09090C] border-white/10 text-zinc-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, activeExpression: expr })}
                          className="font-semibold text-left truncate flex-1"
                        >
                          {expr} {sheetUrl ? '✓' : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerateExpression(expr)}
                          title={`Generate ${expr} expression reference`}
                          className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-[#46ecd5]"
                        >
                          Gen
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">
                    Default Linked Wardrobe Outfit (from Wardrobe Studio)
                  </label>
                  <select
                    value={form.defaultWardrobeId || ''}
                    onChange={(e) =>
                      setForm({ ...form, defaultWardrobeId: e.target.value || null })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                  >
                    <option value="">No Default Outfit Assigned</option>
                    {wardrobes.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} [{w.wardrobeCode}] — {w.category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">
                    Assigned Character Props (from Props Studio)
                  </label>
                  <select
                    value={form.assignedPropIds?.[0] || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        assignedPropIds: e.target.value ? [e.target.value] : [],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                  >
                    <option value="">No Default Prop Assigned</option>
                    {propsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.propCode}] — {p.category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
      )}
    />
  );
};

// ============================================================================
// 2. MOTION CONTROL STUDIO
// ============================================================================
export const MotionStudioView: React.FC = () => {
  const {
    characters,
    motionTemplates,
    saveMotionTemplate,
    deleteMotionTemplate,
    submitGeneration,
    uploadReferenceFile,
    activeContinuity,
    setActiveContinuity,
    showToast,
  } = useRuns();

  const [name, setName] = useState('Kinetic Steadicam Walk & Turn');
  const [movementCategory, setMovementCategory] = useState<MotionCategory>('Walking');
  const [targetCharacterId, setTargetCharacterId] = useState<string>(
    activeContinuity.characterIds[0] || characters[0]?.id || ''
  );
  const [referenceVideoUrl, setReferenceVideoUrl] = useState('');
  const [sourceImageUrl, setSourceImageUrl] = useState('');
  const [preserveAppearanceLock, setPreserveAppearanceLock] = useState(true);
  const [bodyPoseTransfer, setBodyPoseTransfer] = useState(true);
  const [facialExpressionTransfer, setFacialExpressionTransfer] = useState(true);
  const [handGestureControl, setHandGestureControl] = useState(true);
  const [cameraMovement, setCameraMovement] = useState('Low-Angle Steadicam Follow');
  const [motionPrompt, setMotionPrompt] = useState(
    'Transfer exact body stride, shoulder momentum, hand gesture, and head turn from the reference motion while preserving the character identity and wardrobe.'
  );
  const [keyframes, setKeyframes] = useState<MotionKeyframe[]>([
    { timeSec: 0, x: 18, y: 68, poseNote: 'Start position stance', expression: 'Neutral' },
    { timeSec: 3, x: 48, y: 54, poseNote: 'Mid-movement gesture & turn', expression: 'Determined' },
    { timeSec: 6, x: 78, y: 42, poseNote: 'Final mark close-up stop', expression: 'Smiling' },
  ]);
  const [activeKeyframeIdx, setActiveKeyframeIdx] = useState(0);
  const [isRunningTransfer, setIsRunningTransfer] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setKeyframes((prev) =>
      prev.map((kf, idx) =>
        idx === activeKeyframeIdx
          ? { ...kf, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) }
          : kf
      )
    );
  };

  const handleUploadRefVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      const upl = await uploadReferenceFile({
        label: `Motion Reference: ${file.name}`,
        contentType: file.type || 'video/mp4',
        bytes: file.size,
        dataUrl,
      });
      if (upl) {
        setReferenceVideoUrl(upl.publicUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMotion = async () => {
    const saved = await saveMotionTemplate({
      name,
      movementCategory,
      referenceVideoUrl,
      sourceImageUrl,
      targetCharacterId: targetCharacterId || null,
      preserveAppearanceLock,
      bodyPoseTransfer,
      facialExpressionTransfer,
      handGestureControl,
      cameraMovement,
      keyframes,
      motionPrompt,
    });
    return saved;
  };

  const handleExecuteMotionTransfer = async () => {
    setIsRunningTransfer(true);
    try {
      const chr = characters.find((c) => c.id === targetCharacterId);
      const kfSummary = keyframes
        .map((k) => `${k.timeSec}s@[x:${k.x}%,y:${k.y}% ${k.poseNote} (${k.expression})]`)
        .join(' -> ');
      const fullPrompt = `Motion Control Transfer (${movementCategory}, Camera: ${cameraMovement}, Path Keyframes: ${kfSummary}, Pose Transfer: ${bodyPoseTransfer ? 'ON' : 'OFF'}, Expression Transfer: ${facialExpressionTransfer ? 'ON' : 'OFF'}, Hand Gesture Control: ${handGestureControl ? 'ON' : 'OFF'}). ${motionPrompt}`;

      const mediaSlots: MediaSlotInput[] = [];
      if (chr?.faceReferenceUrl || sourceImageUrl) {
        mediaSlots.push({
          role: 'start',
          kind: 'image',
          url: sourceImageUrl || chr?.faceReferenceUrl || '',
          label: chr ? `${chr.name} Identity Frame` : 'Source Frame',
        });
      }
      if (referenceVideoUrl) {
        mediaSlots.push({
          role: 'video',
          kind: 'video',
          url: referenceVideoUrl,
          label: 'Reference Motion Video',
        });
      }

      if (targetCharacterId) {
        setActiveContinuity((prev) => ({ ...prev, characterIds: [targetCharacterId] }));
      }

      const res = await submitGeneration({
        surface: 'video',
        modelId: 'kling-3-0-pro',
        mode: 'Motion Control',
        prompt: fullPrompt,
        settings: { duration: 5, aspect_ratio: '16:9', resolution: '1080p' },
        media: mediaSlots,
      });

      const outUrl = res.generation?.outputs?.[0]?.url;
      await saveMotionTemplate({
        name,
        movementCategory,
        referenceVideoUrl,
        sourceImageUrl,
        targetCharacterId: targetCharacterId || null,
        preserveAppearanceLock,
        bodyPoseTransfer,
        facialExpressionTransfer,
        handGestureControl,
        cameraMovement,
        keyframes,
        motionPrompt,
        outputGenerationId: res.generation?.id,
        outputVideoUrl: outUrl,
      });
    } finally {
      setIsRunningTransfer(false);
    }
  };

  return (
    <HiggsfieldCinemaStudio
      studioId="motion"
      renderStudioVault={() => (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="text-xs font-mono-tabular text-[#46ecd5] uppercase tracking-wider">
              02 · MOTION CONTROL STUDIO — PERFORMANCE & TRAJECTORY TRANSFER
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white mt-1">
              Reference-Video Motion Transfer & Keyframe Path Choreographer
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl">
              Upload a reference video to transfer body movement, pose, facial expression, and hand gestures onto any saved Character while preserving their locked facial identity and wardrobe.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSaveMotion}
              className="px-4 py-2.5 rounded-xl bg-[#16161D] hover:bg-[#1E1E28] border border-white/15 text-xs font-bold uppercase text-white"
            >
              Save Motion Preset
            </button>
            <button
              disabled={isRunningTransfer}
              onClick={handleExecuteMotionTransfer}
              className="px-5 py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Move className="w-4 h-4" />
              <span>{isRunningTransfer ? 'Transferring Motion...' : 'Execute Motion Transfer'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Motion Transfer & Controls */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-xl bg-[#111115] border border-white/10 p-5 space-y-4 text-xs">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Motion Transfer Configuration
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-zinc-400 mb-1">Motion Rig Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Target Character (Identity Locked)</label>
                  <select
                    value={targetCharacterId}
                    onChange={(e) => setTargetCharacterId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                  >
                    <option value="">Select Saved Character...</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} [{c.identityId}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Movement Type</label>
                  <select
                    value={movementCategory}
                    onChange={(e) => setMovementCategory(e.target.value as MotionCategory)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                  >
                    {[
                      'Walking',
                      'Running',
                      'Dancing',
                      'Fighting',
                      'Dialogue Gesture',
                      'Stunt & Action',
                      'Camera Choreography',
                      'Reference Video Transfer',
                    ].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Camera Movement Control</label>
                  <select
                    value={cameraMovement}
                    onChange={(e) => setCameraMovement(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                  >
                    {[
                      'Low-Angle Steadicam Follow',
                      'Dolly Zoom Contrazoom',
                      '360 Orbital Tracking',
                      'Handheld Documentary',
                      'Static Locked Tripod',
                      'Crane Ascent / Descent',
                      'Whip Pan Action Follow',
                    ].map((cam) => (
                      <option key={cam} value={cam}>
                        {cam}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference Video Upload */}
              <div className="p-3.5 rounded-lg bg-[#09090C] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">
                    Reference Motion Video (Pose, Gesture & Expression Source)
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {referenceVideoUrl
                      ? `Loaded: ${referenceVideoUrl.slice(0, 50)}...`
                      : 'Upload an MP4 performance clip or use keyframe path control below'}
                  </div>
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleUploadRefVideo}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-semibold flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-[#46ecd5]" />
                  <span>Upload Reference Video</span>
                </button>
              </div>

              {/* Transfer Channel Locks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <label className="p-2.5 rounded-lg bg-[#09090C] border border-white/10 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preserveAppearanceLock}
                    onChange={(e) => setPreserveAppearanceLock(e.target.checked)}
                    className="accent-[#46ecd5]"
                  />
                  <span>Appearance Lock</span>
                </label>
                <label className="p-2.5 rounded-lg bg-[#09090C] border border-white/10 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bodyPoseTransfer}
                    onChange={(e) => setBodyPoseTransfer(e.target.checked)}
                    className="accent-[#46ecd5]"
                  />
                  <span>Body & Pose</span>
                </label>
                <label className="p-2.5 rounded-lg bg-[#09090C] border border-white/10 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={facialExpressionTransfer}
                    onChange={(e) => setFacialExpressionTransfer(e.target.checked)}
                    className="accent-[#46ecd5]"
                  />
                  <span>Facial Expression</span>
                </label>
                <label className="p-2.5 rounded-lg bg-[#09090C] border border-white/10 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={handGestureControl}
                    onChange={(e) => setHandGestureControl(e.target.checked)}
                    className="accent-[#46ecd5]"
                  />
                  <span>Hand & Gestures</span>
                </label>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Choreography & Action Notes</label>
                <textarea
                  rows={2}
                  value={motionPrompt}
                  onChange={(e) => setMotionPrompt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                />
              </div>
            </div>

            {/* Saved Motion Templates List */}
            <div className="rounded-xl bg-[#111115] border border-white/10 p-5 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Saved Motion Rigs ({motionTemplates.length})
              </h3>
              {motionTemplates.length === 0 ? (
                <p className="text-xs text-zinc-400">
                  No motion rigs saved yet. Configure a motion transfer or keyframe path and click Save Motion Preset.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {motionTemplates.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg bg-[#09090C] border border-white/10 flex flex-col justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{m.name}</span>
                          <span className="font-mono-tabular text-[10px] text-[#46ecd5]">
                            {m.motionCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {m.movementCategory} · {m.cameraMovement}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <button
                          onClick={() =>
                            setActiveContinuity((prev) => ({
                              ...prev,
                              motionTemplateId: m.id,
                            }))
                          }
                          className="text-[#46ecd5] font-semibold hover:underline"
                        >
                          Lock in Continuity Bus
                        </button>
                        <button
                          onClick={() => deleteMotionTemplate(m.id)}
                          aria-label="Delete motion preset"
                          className="text-zinc-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Interactive Motion Path & Keyframe Control Canvas */}
          <div className="lg:col-span-5 rounded-xl bg-[#111115] border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Interactive Motion Path & Keyframe Canvas
                </h2>
                <p className="text-xs text-zinc-400">
                  Select a keyframe below, then click anywhere on the stage to position the character's movement trajectory.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {keyframes.map((kf, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveKeyframeIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular font-semibold ${
                    activeKeyframeIdx === idx
                      ? 'bg-[#46ecd5] text-zinc-950'
                      : 'bg-[#09090C] text-zinc-300 border border-white/10'
                  }`}
                >
                  KF {idx + 1} ({kf.timeSec}s)
                </button>
              ))}
            </div>

            {/* Stage Viewport */}
            <div
              onClick={handleCanvasClick}
              className="aspect-video rounded-xl bg-[#07070A] border border-white/15 relative overflow-hidden cursor-crosshair select-none"
            >
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {keyframes.map((kf, idx) => {
                  const next = keyframes[idx + 1];
                  if (!next) return null;
                  return (
                    <line
                      key={idx}
                      x1={`${kf.x}%`}
                      y1={`${kf.y}%`}
                      x2={`${next.x}%`}
                      y2={`${next.y}%`}
                      stroke="#46ecd5"
                      strokeWidth="2"
                      strokeDasharray="5 4"
                    />
                  );
                })}
              </svg>

              {keyframes.map((kf, idx) => (
                <div
                  key={idx}
                  style={{ left: `${kf.x}%`, top: `${kf.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-md text-[10px] font-mono-tabular font-bold pointer-events-none ${
                    activeKeyframeIdx === idx
                      ? 'bg-[#46ecd5] text-zinc-950 ring-4 ring-[#46ecd5]/30'
                      : 'bg-zinc-900 text-white border border-[#46ecd5]'
                  }`}
                >
                  {kf.timeSec}s · {kf.poseNote}
                </div>
              ))}
            </div>

            {/* Active Keyframe Inspector */}
            {keyframes[activeKeyframeIdx] && (
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <label className="block text-zinc-400 mb-1">Pose / Action at Keyframe</label>
                  <input
                    type="text"
                    value={keyframes[activeKeyframeIdx].poseNote}
                    onChange={(e) =>
                      setKeyframes((prev) =>
                        prev.map((k, i) =>
                          i === activeKeyframeIdx ? { ...k, poseNote: e.target.value } : k
                        )
                      )
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-[#09090C] border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Expression at Keyframe</label>
                  <select
                    value={keyframes[activeKeyframeIdx].expression}
                    onChange={(e) =>
                      setKeyframes((prev) =>
                        prev.map((k, i) =>
                          i === activeKeyframeIdx
                            ? { ...k, expression: e.target.value as CharacterExpression }
                            : k
                        )
                      )
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-[#09090C] border border-white/10 text-white"
                  >
                    {EXPRESSIONS.map((ex) => (
                      <option key={ex} value={ex}>
                        {ex}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    />
  );
};

// ============================================================================
// 3. WARDROBE STUDIO
// ============================================================================
export const WardrobeStudioView: React.FC = () => {
  const {
    wardrobes,
    characters,
    saveWardrobe,
    deleteWardrobe,
    submitGeneration,
    uploadReferenceFile,
    activeContinuity,
    setActiveContinuity,
    showToast,
  } = useRuns();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<WardrobeCategory>('Traditional');
  const [garments, setGarments] = useState('');
  const [shoes, setShoes] = useState('');
  const [accessories, setAccessories] = useState('');
  const [jewellery, setJewellery] = useState('');
  const [hairstyleOverride, setHairstyleOverride] = useState('');
  const [colorPalette, setColorPalette] = useState('Deep Indigo, Gold Embroidery & Obsidian');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [assignedCharId, setAssignedCharId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleGenerateOutfit = async () => {
    if (!name.trim() && !garments.trim()) {
      showToast('Describe the outfit name or garments first');
      return;
    }
    setIsGenerating(true);
    try {
      const prompt = `Full-length cinema costume & wardrobe design sheet for "${name || category}" (${category} category): Garments: ${garments || 'bespoke tailored attire'}, Footwear: ${shoes || 'matching footwear'}, Accessories: ${accessories || 'minimalist'}, Jewellery: ${jewellery || 'subtle metallic accents'}, Color Palette: ${colorPalette}. Clean studio lookbook lighting, fabric texture macro detail, 8k fashion continuity plate.`;
      const res = await submitGeneration({
        surface: 'image',
        modelId: 'soul-2-standard',
        mode: 'Create',
        prompt,
        settings: { aspect_ratio: '3:4', quality: '1080p' },
        media: referenceImageUrl
          ? [{ role: 'reference', kind: 'image', url: referenceImageUrl, label: 'Wardrobe Ref' }]
          : [],
      });
      const outUrl = res.generation?.outputs?.[0]?.url;
      if (outUrl) {
        setReferenceImageUrl(outUrl);
      }
      await saveWardrobe({
        name: name || `${category} Look`,
        category,
        description: `${garments} · ${shoes} · ${accessories}`,
        garments,
        shoes,
        accessories,
        jewellery,
        hairstyleOverride,
        colorPalette,
        referenceImageUrl: outUrl || referenceImageUrl,
        assignedCharacterIds: assignedCharId ? [assignedCharId] : [],
        sceneContinuityLock: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveWardrobe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Enter an outfit name');
      return;
    }
    await saveWardrobe({
      name,
      category,
      description: `${garments} · ${shoes} · ${accessories}`,
      garments,
      shoes,
      accessories,
      jewellery,
      hairstyleOverride,
      colorPalette,
      referenceImageUrl,
      assignedCharacterIds: assignedCharId ? [assignedCharId] : [],
      sceneContinuityLock: true,
    });
    setName('');
  };

  return (
    <HiggsfieldCinemaStudio
      studioId="wardrobe"
      renderStudioVault={() => (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="text-xs font-mono-tabular text-[#46ecd5] uppercase tracking-wider">
              03 · WARDROBE STUDIO — COSTUME & OUTFIT CONTINUITY
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white mt-1">
              Character Outfits, Footwear, Jewellery & Scene Continuity
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl">
              Generate and save complete outfits across Formal, Casual, Traditional, Corporate, Futuristic, and Costume categories. Assign outfits to characters to preserve identical clothing across every shot.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Outfit Creator Form */}
          <form
            onSubmit={handleSaveWardrobe}
            className="lg:col-span-5 rounded-xl bg-[#111115] border border-white/10 p-5 space-y-3.5 text-xs"
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Create & Assign Complete Outfit
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1">Outfit Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Indigo Agbada / Tactical Trench"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as WardrobeCategory)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                >
                  {[
                    'Formal',
                    'Casual',
                    'Traditional',
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
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">
                Primary Garments (Top, Bottom, Outerwear & Fabric)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Hand-loomed indigo Aso-Oke Agbada with geometric gold bullion embroidery over fitted silk tunic"
                value={garments}
                onChange={(e) => setGarments(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1">Shoes & Footwear</label>
                <input
                  type="text"
                  placeholder="e.g. Polished oxblood leather loafers"
                  value={shoes}
                  onChange={(e) => setShoes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Accessories (Bags, Eyewear, Hats)</label>
                <input
                  type="text"
                  placeholder="e.g. Filigree fila cap, gold-rim spectacles"
                  value={accessories}
                  onChange={(e) => setAccessories(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Jewellery & Watches</label>
                <input
                  type="text"
                  placeholder="e.g. Coral bead necklace, brushed gold chronograph"
                  value={jewellery}
                  onChange={(e) => setJewellery(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Hairstyle Continuity Note</label>
                <input
                  type="text"
                  placeholder="Optional scene-specific hairstyle"
                  value={hairstyleOverride}
                  onChange={(e) => setHairstyleOverride(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Assign Outfit to Character</label>
              <select
                value={assignedCharId}
                onChange={(e) => setAssignedCharId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                <option value="">Available to All Characters</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} [{c.identityId}]
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = async () => {
                    const upl = await uploadReferenceFile({
                      label: `Wardrobe: ${name || f.name}`,
                      contentType: f.type || 'image/jpeg',
                      bytes: f.size,
                      dataUrl: String(r.result || ''),
                    });
                    if (upl) setReferenceImageUrl(upl.publicUrl);
                  };
                  r.readAsDataURL(f);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-semibold"
              >
                Upload Ref Image
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateOutfit}
                className="px-3.5 py-2 rounded-lg bg-[#46ecd5]/20 hover:bg-[#46ecd5]/30 border border-[#46ecd5]/50 text-[#46ecd5] font-bold"
              >
                {isGenerating ? 'Generating Look...' : 'AI Generate Look & Save'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold ml-auto"
              >
                Save Outfit
              </button>
            </div>
          </form>

          {/* Saved Wardrobe Grid */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Saved Wardrobe Library ({wardrobes.length})
            </h2>
            {wardrobes.length === 0 ? (
              <div className="p-10 rounded-xl bg-[#111115] border border-white/10 text-center space-y-2">
                <Shirt className="w-8 h-8 text-[#46ecd5] mx-auto" />
                <div className="text-sm font-bold text-white">No Saved Outfits Yet</div>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Design an outfit on the left or generate a wardrobe lookbook plate to lock character clothing across scenes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {wardrobes.map((w) => {
                  const isLocked = activeContinuity.wardrobeId === w.id;
                  const linkedChars = characters.filter(
                    (c) =>
                      c.defaultWardrobeId === w.id || w.assignedCharacterIds.includes(c.id)
                  );
                  return (
                    <div
                      key={w.id}
                      className={`rounded-xl border overflow-hidden flex flex-col justify-between ${
                        isLocked
                          ? 'bg-[#171B1E] border-[#46ecd5]'
                          : 'bg-[#111115] border-white/10'
                      }`}
                    >
                      <div className="p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono-tabular text-[#46ecd5]">
                            {w.wardrobeCode} · {w.category.toUpperCase()}
                          </span>
                          <button
                            onClick={() => deleteWardrobe(w.id)}
                            aria-label="Delete wardrobe"
                            className="text-zinc-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h3 className="text-base font-bold text-white">{w.name}</h3>
                        <p className="text-zinc-300 line-clamp-2">{w.garments}</p>
                        {(w.shoes || w.accessories || w.jewellery) && (
                          <div className="text-[11px] text-zinc-400">
                            {[w.shoes, w.accessories, w.jewellery].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        {linkedChars.length > 0 && (
                          <div className="text-[11px] text-[#46ecd5]">
                            Assigned to: {linkedChars.map((c) => c.name).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-[#0B0B0E] border-t border-white/10 flex items-center justify-between text-xs">
                        <button
                          onClick={() =>
                            setActiveContinuity((prev) => ({
                              ...prev,
                              wardrobeId: isLocked ? null : w.id,
                            }))
                          }
                          className={`px-3 py-1 rounded font-semibold ${
                            isLocked
                              ? 'bg-[#46ecd5] text-zinc-950'
                              : 'bg-zinc-900 text-zinc-300 hover:text-white border border-white/10'
                          }`}
                        >
                          {isLocked ? 'Locked in Continuity Bus' : 'Lock Outfit for Shots'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    />
  );
};

// ============================================================================
// 4. PROPS STUDIO
// ============================================================================
export const PropsStudioView: React.FC = () => {
  const {
    propsList,
    characters,
    saveProp,
    deleteProp,
    submitGeneration,
    activeContinuity,
    setActiveContinuity,
    showToast,
  } = useRuns();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<PropCategory>('Cars & Vehicles');
  const [description, setDescription] = useState('');
  const [materialAndFinish, setMaterialAndFinish] = useState('Matte Obsidian & Brushed Titanium');
  const [assignedCharId, setAssignedCharId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateProp = async (generateImage = false) => {
    if (!name.trim()) {
      showToast('Enter a prop name');
      return;
    }
    let refUrl = '';
    if (generateImage) {
      setIsGenerating(true);
      try {
        const res = await submitGeneration({
          surface: 'image',
          modelId: 'soul-2-standard',
          mode: 'Create',
          prompt: `Production hero prop reference plate of ${name} (${category}): ${description}, material & finish: ${materialAndFinish}. Clean neutral studio background, sharp commercial product lighting, 8k continuity reference.`,
          settings: { aspect_ratio: '4:3', quality: '1080p' },
          media: [],
        });
        refUrl = res.generation?.outputs?.[0]?.url || '';
      } finally {
        setIsGenerating(false);
      }
    }
    await saveProp({
      name,
      category,
      description,
      materialAndFinish,
      scaleAndDimensions: 'Standard hero scale',
      referenceImageUrl: refUrl,
      assignedCharacterIds: assignedCharId ? [assignedCharId] : [],
      assignedSceneIds: [],
      appearanceLock: true,
    });
    setName('');
    setDescription('');
  };

  return (
    <HiggsfieldCinemaStudio
      studioId="props"
      renderStudioVault={() => (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="border-b border-white/10 pb-6">
          <div className="text-xs font-mono-tabular text-[#46ecd5] uppercase tracking-wider">
            04 · PROPS STUDIO — OBJECT & ARTIFACT CONTINUITY
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white mt-1">
            Vehicles, Tech, Weapons, Furniture & Hero Objects
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl">
            Generate, save, and assign reusable props to characters and scenes so cars, phones, weapons, bags, and hero objects maintain identical appearance across every shot.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-xl bg-[#111115] border border-white/10 p-5 space-y-3.5 text-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Register Production Prop
            </h2>
            <div>
              <label className="block text-zinc-400 mb-1">Prop Name</label>
              <input
                type="text"
                placeholder="e.g. 1992 Matte-Black Defender / Engraved Brass Compass"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Prop Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PropCategory)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                {[
                  'Cars & Vehicles',
                  'Phones & Tech',
                  'Furniture',
                  'Weapons & Action',
                  'Bags & Luggage',
                  'Tools & Equipment',
                  'Household Objects',
                  'Hero Artifacts',
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Visual Description & Details</label>
              <textarea
                rows={2}
                placeholder="Describe exact shape, markings, model details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Material & Surface Finish</label>
              <input
                type="text"
                value={materialAndFinish}
                onChange={(e) => setMaterialAndFinish(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Assign to Character</label>
              <select
                value={assignedCharId}
                onChange={(e) => setAssignedCharId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                <option value="">Shared Production Prop</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} [{c.identityId}]
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleCreateProp(true)}
                className="px-3.5 py-2 rounded-lg bg-[#46ecd5]/20 border border-[#46ecd5]/50 text-[#46ecd5] font-bold"
              >
                {isGenerating ? 'Generating Prop...' : 'AI Generate Prop & Save'}
              </button>
              <button
                type="button"
                onClick={() => handleCreateProp(false)}
                className="px-4 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold"
              >
                Save Prop
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Saved Props Vault ({propsList.length})
            </h2>
            {propsList.length === 0 ? (
              <div className="p-10 rounded-xl bg-[#111115] border border-white/10 text-center space-y-2">
                <Package className="w-8 h-8 text-[#46ecd5] mx-auto" />
                <div className="text-sm font-bold text-white">No Props Saved Yet</div>
                <p className="text-xs text-zinc-400">
                  Create props on the left to lock object appearance across shots.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {propsList.map((p) => {
                  const isLocked = activeContinuity.propIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl bg-[#111115] border border-white/10 p-4 flex flex-col justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono-tabular text-[11px] text-[#46ecd5]">
                            {p.propCode} · {p.category}
                          </span>
                          <button
                            onClick={() => deleteProp(p.id)}
                            aria-label="Delete prop"
                            className="text-zinc-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h3 className="text-base font-bold text-white">{p.name}</h3>
                        <p className="text-zinc-300">{p.description}</p>
                        <div className="text-[11px] text-zinc-400">{p.materialAndFinish}</div>
                      </div>
                      <button
                        onClick={() =>
                          setActiveContinuity((prev) => ({
                            ...prev,
                            propIds: isLocked
                              ? prev.propIds.filter((id) => id !== p.id)
                              : [...prev.propIds, p.id],
                          }))
                        }
                        className={`w-full py-1.5 rounded font-semibold ${
                          isLocked
                            ? 'bg-[#46ecd5] text-zinc-950'
                            : 'bg-zinc-900 text-zinc-300 hover:text-white border border-white/10'
                        }`}
                      >
                        {isLocked ? 'Locked in Continuity Bus' : 'Lock Prop for Shots'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    />
  );
};

// ============================================================================
// 5. LOCATION STUDIO
// ============================================================================
export const LocationStudioView: React.FC = () => {
  const {
    locations,
    saveLocation,
    deleteLocation,
    submitGeneration,
    activeContinuity,
    setActiveContinuity,
    showToast,
  } = useRuns();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<LocationCategory>('Cities');
  const [settingType, setSettingType] = useState<'INT.' | 'EXT.' | 'INT./EXT.'>('EXT.');
  const [timeOfDay, setTimeOfDay] = useState<LocationItem['timeOfDay']>('Night');
  const [weather, setWeather] = useState<LocationItem['weather']>('Rain');
  const [description, setDescription] = useState('');
  const [lightingAndMood, setLightingAndMood] = useState(
    'Warm sodium streetlamps reflecting on wet asphalt, cyan neon rim light'
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSaveLocation = async (generatePlate = false) => {
    if (!name.trim()) {
      showToast('Enter a location name');
      return;
    }
    let plateUrl = '';
    if (generatePlate) {
      setIsGenerating(true);
      try {
        const res = await submitGeneration({
          surface: 'image',
          modelId: 'nano-banana-2-1',
          mode: 'Create',
          prompt: `Establishing cinema location plate: ${settingType} ${name} (${category}) — ${timeOfDay}, ${weather} weather. Architecture & environment: ${description}. Lighting: ${lightingAndMood}. 24mm anamorphic establishing wide shot, no people, 8k production environment reference.`,
          settings: { aspect_ratio: '16:9', quality: '2K' },
          media: [],
        });
        plateUrl = res.generation?.outputs?.[0]?.url || '';
      } finally {
        setIsGenerating(false);
      }
    }

    await saveLocation({
      name,
      category,
      settingType,
      timeOfDay,
      weather,
      description,
      lightingAndMood,
      primaryImageUrl: plateUrl,
      cameraAngleReferences: [
        {
          id: `ang_${Date.now()}_1`,
          angleLabel: 'Establishing Wide',
          lens: '24mm Anamorphic',
          imageUrl: plateUrl,
          promptNotes: `${settingType} ${name} wide establishing angle`,
        },
        {
          id: `ang_${Date.now()}_2`,
          angleLabel: 'Medium Room Axis',
          lens: '35mm Prime',
          imageUrl: plateUrl,
          promptNotes: `${settingType} ${name} medium dialogue axis`,
        },
        {
          id: `ang_${Date.now()}_3`,
          angleLabel: 'Reverse Counter-Angle',
          lens: '50mm Prime',
          imageUrl: plateUrl,
          promptNotes: `${settingType} ${name} reverse over-the-shoulder background`,
        },
      ],
      continuityLock: true,
    });
    setName('');
    setDescription('');
  };

  return (
    <HiggsfieldCinemaStudio
      studioId="location"
      renderStudioVault={() => (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="border-b border-white/10 pb-6">
          <div className="text-xs font-mono-tabular text-[#46ecd5] uppercase tracking-wider">
            05 · LOCATION STUDIO — FILMING ENVIRONMENTS & MULTI-ANGLE SETS
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white mt-1">
            Reusable Interior & Exterior Filming Locations
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl">
            Create houses, offices, streets, villages, cities, and landscapes with locked time-of-day, weather, and multi-camera angle references that persist across scenes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 rounded-xl bg-[#111115] border border-white/10 p-5 space-y-3.5 text-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Create Filming Location
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-zinc-400 mb-1">INT. / EXT.</label>
                <select
                  value={settingType}
                  onChange={(e) =>
                    setSettingType(e.target.value as 'INT.' | 'EXT.' | 'INT./EXT.')
                  }
                  className="w-full px-2.5 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                >
                  <option value="INT.">INT. (Interior)</option>
                  <option value="EXT.">EXT. (Exterior)</option>
                  <option value="INT./EXT.">INT./EXT.</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-zinc-400 mb-1">Location Name</label>
                <input
                  type="text"
                  placeholder="e.g. Victoria Island Glass Penthouse"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-zinc-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LocationCategory)}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                >
                  {[
                    'Houses',
                    'Offices',
                    'Streets',
                    'Villages',
                    'Cities',
                    'Landscapes',
                    'Studios & Sets',
                    'Sci-Fi & Fantasy',
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Time of Day</label>
                <select
                  value={timeOfDay}
                  onChange={(e) =>
                    setTimeOfDay(e.target.value as LocationItem['timeOfDay'])
                  }
                  className="w-full px-2.5 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                >
                  {['Day', 'Night', 'Sunset', 'Golden Hour', 'Dawn', 'Blue Hour'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Weather</label>
                <select
                  value={weather}
                  onChange={(e) => setWeather(e.target.value as LocationItem['weather'])}
                  className="w-full px-2.5 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                >
                  {[
                    'Clear',
                    'Rain',
                    'Fog',
                    'Harmattan Dust',
                    'Overcast',
                    'Storm',
                    'Snow',
                  ].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Architectural & Set Details</label>
              <textarea
                rows={2}
                placeholder="Describe layout, furniture, street textures, horizon..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Lighting & Atmospheric Mood</label>
              <input
                type="text"
                value={lightingAndMood}
                onChange={(e) => setLightingAndMood(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleSaveLocation(true)}
                className="px-3.5 py-2 rounded-lg bg-[#46ecd5]/20 border border-[#46ecd5]/50 text-[#46ecd5] font-bold"
              >
                {isGenerating ? 'Generating Plate...' : 'AI Generate Location Plate & Save'}
              </button>
              <button
                type="button"
                onClick={() => handleSaveLocation(false)}
                className="px-4 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold"
              >
                Save Location
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Saved Filming Locations ({locations.length})
            </h2>
            {locations.length === 0 ? (
              <div className="p-10 rounded-xl bg-[#111115] border border-white/10 text-center space-y-2">
                <MapPin className="w-8 h-8 text-[#46ecd5] mx-auto" />
                <div className="text-sm font-bold text-white">No Locations Saved Yet</div>
                <p className="text-xs text-zinc-400">
                  Create a filming location on the left to reuse it across scenes and shots.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {locations.map((loc) => {
                  const isLocked = activeContinuity.locationId === loc.id;
                  return (
                    <div
                      key={loc.id}
                      className="rounded-xl bg-[#111115] border border-white/10 p-4 flex flex-col justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono-tabular text-[11px] text-[#46ecd5]">
                            {loc.locationCode} · {loc.settingType} · {loc.timeOfDay.toUpperCase()} ·{' '}
                            {loc.weather.toUpperCase()}
                          </span>
                          <button
                            onClick={() => deleteLocation(loc.id)}
                            aria-label="Delete location"
                            className="text-zinc-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h3 className="text-base font-bold text-white">
                          {loc.settingType} {loc.name}
                        </h3>
                        <p className="text-zinc-300">{loc.description}</p>
                        <div className="text-[11px] text-zinc-400">
                          Angles: {loc.cameraAngleReferences.map((a) => a.angleLabel).join(' · ')}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setActiveContinuity((prev) => ({
                            ...prev,
                            locationId: isLocked ? null : loc.id,
                          }))
                        }
                        className={`w-full py-1.5 rounded font-semibold ${
                          isLocked
                            ? 'bg-[#46ecd5] text-zinc-950'
                            : 'bg-zinc-900 text-zinc-300 hover:text-white border border-white/10'
                        }`}
                      >
                        {isLocked ? 'Locked in Continuity Bus' : 'Lock Location for Scenes'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    />
  );
};

// ============================================================================
// 6. CINEMA STUDIO — COMPLETE PRODUCTION & SCREENPLAY PIPELINE
// ============================================================================
export const CinemaStudioView: React.FC = () => {
  const {
    cinemaProjects,
    characters,
    wardrobes,
    propsList,
    locations,
    motionTemplates,
    saveCinemaProject,
    deleteCinemaProject,
    submitGeneration,
    composeContinuityPrompt,
    navigate,
    showToast,
  } = useRuns();

  const [cinemaMode, setCinemaMode] = useState<'higgsfield-director' | 'story-studio' | 'classic'>('higgsfield-director');
  const [selectedProjId, setSelectedProjId] = useState<string | null>(
    () => cinemaProjects[0]?.id || null
  );
  const [title, setTitle] = useState(() => cinemaProjects[0]?.title || 'ECHOES OF LAGOS');
  const [productionType, setProductionType] = useState<CinemaProductionType>(
    () => cinemaProjects[0]?.productionType || 'Movies'
  );
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '21:9' | '9:16' | '1:1'>(
    () => cinemaProjects[0]?.aspectRatio || '21:9'
  );
  const [logline, setLogline] = useState(
    () =>
      cinemaProjects[0]?.logline ||
      'An investigative cyber-architect uncovers a frequency key hidden across Lagos Island.'
  );
  const [screenplayRaw, setScreenplayRaw] = useState(
    () =>
      cinemaProjects[0]?.screenplayRaw ||
      `INT. VICTORIA ISLAND PENTHOUSE LAB - NIGHT\nRain streaks down floor-to-ceiling glass overlooking the Atlantic.\n\nKEMI\n(speaking in English & Nigerian Pidgin)\nThe signal no be random noise. Every frame carries the same identity signature.\n\nEXT. MARINA EXPRESSWAY - NIGHT\nA matte-black Defender speeds beneath sodium streetlamps as drones banking overhead track its path.`
  );
  const [scenes, setScenes] = useState<ProductionScene[]>(
    () => cinemaProjects[0]?.scenes || []
  );
  const [busyShotId, setBusyShotId] = useState<string | null>(null);
  const scriptFileInputRef = useRef<HTMLInputElement>(null);

  const selectProject = (proj: CinemaProductionProject) => {
    setSelectedProjId(proj.id);
    setTitle(proj.title);
    setProductionType(proj.productionType);
    setAspectRatio(proj.aspectRatio);
    setLogline(proj.logline);
    setScreenplayRaw(proj.screenplayRaw);
    setScenes(proj.scenes || []);
  };

  // Parse formatted screenplay into structured Scenes, Dialogue, Character links & Shot Lists
  const handleParseScreenplayToScenesAndShots = async () => {
    const lines = screenplayRaw.split(/\r?\n/);
    const parsedScenes: ProductionScene[] = [];
    let currentScene: ProductionScene | null = null;
    let currentSpeaker: string | null = null;
    let currentParenthetical: string | undefined = undefined;

    const flushSceneShots = (sc: ProductionScene) => {
      if (sc.shots.length > 0) return;
      const defaultCharIds =
        sc.characterIds.length > 0
          ? sc.characterIds
          : characters[0]
          ? [characters[0].id]
          : [];
      const defaultWardrobe =
        defaultCharIds[0]
          ? characters.find((c) => c.id === defaultCharIds[0])?.defaultWardrobeId ||
            wardrobes[0]?.id ||
            null
          : wardrobes[0]?.id || null;

      sc.shots = [
        {
          id: `shot_${sc.sceneNumber}_A_${Date.now()}`,
          shotNumber: `${sc.sceneNumber}A`,
          shotSize: 'Wide',
          cameraAngle: 'Eye Level',
          cameraMovement: 'Slow Anamorphic Push-In',
          lens: '24mm Anamorphic',
          durationSec: 5,
          characterIds: defaultCharIds,
          wardrobeId: defaultWardrobe,
          propIds: sc.propIds,
          locationId: sc.locationId,
          actionPrompt: `Establishing shot of ${sc.slugline}: ${sc.actionDescription || sc.summary}`,
          dialogueSnippet: sc.dialogueLines[0]?.text || '',
          voiceLanguage: sc.dialogueLines[0]?.language || 'English',
          sfxNotes: 'Ambient room tone & atmospheric score',
          continuityVerified: true,
        },
        {
          id: `shot_${sc.sceneNumber}_B_${Date.now() + 1}`,
          shotNumber: `${sc.sceneNumber}B`,
          shotSize: 'Medium Close-Up',
          cameraAngle: 'Over-the-Shoulder',
          cameraMovement: 'Subtle Handheld Breathing',
          lens: '50mm Prime',
          durationSec: 5,
          characterIds: defaultCharIds,
          wardrobeId: defaultWardrobe,
          propIds: sc.propIds,
          locationId: sc.locationId,
          actionPrompt: `Character performance shot in ${sc.slugline}: ${
            sc.dialogueLines[0]
              ? `${sc.dialogueLines[0].characterName} speaks: "${sc.dialogueLines[0].text}"`
              : sc.actionDescription
          }`,
          dialogueSnippet: sc.dialogueLines[0]?.text || '',
          voiceLanguage: sc.dialogueLines[0]?.language || 'English',
          sfxNotes: 'Dialogue focus + subtle foley',
          continuityVerified: true,
        },
      ];
    };

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        currentSpeaker = null;
        continue;
      }

      if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(trimmed)) {
        if (currentScene) {
          flushSceneShots(currentScene);
          parsedScenes.push(currentScene);
        }
        const sceneNum = parsedScenes.length + 1;
        const matchedLoc =
          locations.find((l) =>
            trimmed.toLowerCase().includes(l.name.toLowerCase())
          ) ||
          locations[0] ||
          null;
        const isNight = /NIGHT|DUSK|EVENING/i.test(trimmed);
        currentScene = {
          id: `scn_${Date.now()}_${sceneNum}`,
          sceneNumber: sceneNum,
          slugline: trimmed.toUpperCase(),
          locationId: matchedLoc?.id || null,
          timeOfDay: isNight ? 'Night' : matchedLoc?.timeOfDay || 'Day',
          weather: matchedLoc?.weather || 'Clear',
          summary: trimmed,
          actionDescription: '',
          characterIds: [],
          wardrobeAssignments: {},
          propIds: propsList[0] ? [propsList[0].id] : [],
          dialogueLines: [],
          shots: [],
        };
        currentSpeaker = null;
        continue;
      }

      if (!currentScene) {
        currentScene = {
          id: `scn_${Date.now()}_1`,
          sceneNumber: 1,
          slugline: 'INT. MAIN PRODUCTION STAGE - NIGHT',
          locationId: locations[0]?.id || null,
          timeOfDay: 'Night',
          weather: 'Clear',
          summary: 'Opening scene',
          actionDescription: '',
          characterIds: [],
          wardrobeAssignments: {},
          propIds: [],
          dialogueLines: [],
          shots: [],
        };
      }

      // Check if uppercase character cue
      if (
        trimmed === trimmed.toUpperCase() &&
        trimmed.length <= 32 &&
        !/[.!?]$/.test(trimmed) &&
        !trimmed.startsWith('(')
      ) {
        currentSpeaker = trimmed;
        const matchedChar = characters.find(
          (c) =>
            c.name.toUpperCase().includes(trimmed) ||
            trimmed.includes(c.name.toUpperCase())
        );
        if (matchedChar && !currentScene.characterIds.includes(matchedChar.id)) {
          currentScene.characterIds.push(matchedChar.id);
          if (matchedChar.defaultWardrobeId) {
            currentScene.wardrobeAssignments[matchedChar.id] =
              matchedChar.defaultWardrobeId;
          }
        }
        continue;
      }

      if (currentSpeaker && trimmed.startsWith('(') && trimmed.endsWith(')')) {
        currentParenthetical = trimmed.slice(1, -1);
        continue;
      }

      if (currentSpeaker) {
        const matchedChar = characters.find(
          (c) =>
            c.name.toUpperCase().includes(currentSpeaker!) ||
            currentSpeaker!.includes(c.name.toUpperCase())
        );
        currentScene.dialogueLines.push({
          id: `dlg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          characterId: matchedChar?.id || null,
          characterName: matchedChar?.name || currentSpeaker,
          language: matchedChar?.primaryLanguage || 'English',
          emotion: matchedChar?.defaultEmotion || 'Confident',
          parenthetical: currentParenthetical,
          text: trimmed,
        });
        currentParenthetical = undefined;
        currentSpeaker = null;
      } else {
        currentScene.actionDescription = currentScene.actionDescription
          ? `${currentScene.actionDescription} ${trimmed}`
          : trimmed;
        // Also auto-detect any saved character names mentioned in action lines
        for (const chr of characters) {
          if (
            trimmed.toLowerCase().includes(chr.name.toLowerCase()) &&
            !currentScene.characterIds.includes(chr.id)
          ) {
            currentScene.characterIds.push(chr.id);
          }
        }
      }
    }

    if (currentScene) {
      flushSceneShots(currentScene);
      parsedScenes.push(currentScene);
    }

    setScenes(parsedScenes);
    const saved = await saveCinemaProject({
      id: selectedProjId || undefined,
      title,
      productionType,
      logline,
      aspectRatio,
      screenplayRaw,
      castCharacterIds: characters.map((c) => c.id),
      wardrobeIds: wardrobes.map((w) => w.id),
      propIds: propsList.map((p) => p.id),
      locationIds: locations.map((l) => l.id),
      scenes: parsedScenes,
    });
    if (saved) setSelectedProjId(saved.id);
    showToast(`Parsed ${parsedScenes.length} scene(s) & shot lists with continuity locks`);
  };

  const handleGenerateShotStoryboard = async (sceneIdx: number, shotIdx: number) => {
    const sc = scenes[sceneIdx];
    const shot = sc?.shots[shotIdx];
    if (!sc || !shot) return;

    setBusyShotId(shot.id);
    try {
      const composed = composeContinuityPrompt(
        `${shot.shotSize} ${shot.cameraAngle} storyboard frame (${shot.lens}, ${sc.slugline}): ${shot.actionPrompt}`,
        {
          characterIds: shot.characterIds,
          wardrobeId: shot.wardrobeId || null,
          propIds: shot.propIds,
          locationId: shot.locationId,
        }
      );

      const res = await submitGeneration({
        surface: 'image',
        modelId: 'nano-banana-2-1',
        mode: 'Create',
        prompt: composed.prompt,
        settings: {
          aspect_ratio: aspectRatio === '21:9' ? '16:9' : aspectRatio,
          quality: '2K',
        },
        media: composed.media,
      });

      const outUrl = res.generation?.outputs?.[0]?.url;
      if (outUrl) {
        const nextScenes = scenes.map((s, si) =>
          si !== sceneIdx
            ? s
            : {
                ...s,
                shots: s.shots.map((sh, shi) =>
                  shi !== shotIdx
                    ? sh
                    : {
                        ...sh,
                        storyboardImageUrl: outUrl,
                        storyboardGenerationId: res.generation?.id,
                      }
                ),
              }
        );
        setScenes(nextScenes);
        await saveCinemaProject({
          id: selectedProjId || undefined,
          title,
          productionType,
          logline,
          aspectRatio,
          screenplayRaw,
          scenes: nextScenes,
        });
      }
    } finally {
      setBusyShotId(null);
    }
  };

  const handleGenerateShotVideo = async (sceneIdx: number, shotIdx: number) => {
    const sc = scenes[sceneIdx];
    const shot = sc?.shots[shotIdx];
    if (!sc || !shot) return;

    setBusyShotId(shot.id);
    try {
      const baseMedia: MediaSlotInput[] = shot.storyboardImageUrl
        ? [
            {
              role: 'start',
              kind: 'image',
              url: shot.storyboardImageUrl,
              label: `Storyboard ${shot.shotNumber}`,
            },
          ]
        : [];
      const composed = composeContinuityPrompt(
        `Cinema Shot ${shot.shotNumber} (${shot.shotSize}, ${shot.cameraAngle}, Camera: ${shot.cameraMovement}, Lens: ${shot.lens}): ${shot.actionPrompt}${shot.dialogueSnippet ? ` — Dialogue (${shot.voiceLanguage || 'English'}): "${shot.dialogueSnippet}"` : ''}`,
        {
          characterIds: shot.characterIds,
          wardrobeId: shot.wardrobeId || null,
          propIds: shot.propIds,
          locationId: shot.locationId,
          motionTemplateId: shot.motionTemplateId || null,
        },
        baseMedia
      );

      const res = await submitGeneration({
        surface: 'video',
        modelId: 'seedance-2-5',
        mode: 'Create Video',
        prompt: composed.prompt,
        settings: {
          duration: shot.durationSec || 5,
          aspect_ratio: aspectRatio === '21:9' ? '16:9' : aspectRatio,
          resolution: '1080p',
        },
        media: composed.media,
      });

      const outUrl = res.generation?.outputs?.[0]?.url;
      if (outUrl) {
        const nextScenes = scenes.map((s, si) =>
          si !== sceneIdx
            ? s
            : {
                ...s,
                shots: s.shots.map((sh, shi) =>
                  shi !== shotIdx
                    ? sh
                    : {
                        ...sh,
                        shotVideoUrl: outUrl,
                        shotVideoGenerationId: res.generation?.id,
                      }
                ),
              }
        );
        setScenes(nextScenes);
        await saveCinemaProject({
          id: selectedProjId || undefined,
          title,
          productionType,
          logline,
          aspectRatio,
          screenplayRaw,
          scenes: nextScenes,
        });
      }
    } finally {
      setBusyShotId(null);
    }
  };

  if (cinemaMode === 'higgsfield-director') {
    return <HiggsfieldCinemaStudio />;
  }

  return (
    <div>
      <ContinuityStudioBar activeStudio="cinema" />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {cinemaMode === 'story-studio' ? (
          <StoryStudioView onSwitchToLegacyCinema={() => setCinemaMode('higgsfield-director')} />
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <div className="text-xs font-mono-tabular text-[#46ecd5] uppercase tracking-wider">
                  06 · CINEMA STUDIO — COMPLETE MULTI-FORMAT PRODUCTION & SCREENPLAY PIPELINE
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white mt-1">
                  Screenplay to Storyboard, Shot Generation & Final Assembly
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl">
                  Supports Movies, Music Videos, UGC, Interviews, Documentaries, Explainer Videos, Montages, Commercials, Trailers, and Short Films with full Character, Wardrobe, Prop, Location, and Voice continuity.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCinemaMode('story-studio')}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-[#46ecd5]/50 text-[#46ecd5] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>4-Stage Story Studio Pipeline</span>
                </button>
                <button
                  onClick={handleParseScreenplayToScenesAndShots}
                  className="px-4 py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105 flex items-center gap-1.5"
                >
                  <Clapperboard className="w-4 h-4" />
                  <span>Parse Screenplay → Scenes & Shot List</span>
                </button>
            <button
              onClick={() => navigate('editing')}
              className="px-4 py-2.5 rounded-xl bg-[#16161D] hover:bg-[#1E1E28] border border-white/15 text-xs font-bold uppercase text-white"
            >
              Assemble in Editing Studio →
            </button>
          </div>
        </div>

        {/* 10 Production Formats Selector */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Select Production Format (10 Supported Formats)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {PRODUCTION_FORMATS.map((fmt) => {
              const active = productionType === fmt.type;
              return (
                <button
                  key={fmt.type}
                  type="button"
                  onClick={() => {
                    setProductionType(fmt.type);
                    setAspectRatio(fmt.recommendedAspect);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? 'bg-[#171B1E] border-[#46ecd5] text-white'
                      : 'bg-[#111115] border-white/10 text-zinc-300 hover:border-white/25'
                  }`}
                >
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>{fmt.type}</span>
                    <span className="font-mono-tabular text-[10px] text-[#46ecd5]">
                      {fmt.recommendedAspect}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                    {fmt.toolsSummary}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Screenplay Editor & Importer */}
          <div className="lg:col-span-5 rounded-xl bg-[#111115] border border-white/10 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Screenplay & Production Script
              </h2>
              <input
                ref={scriptFileInputRef}
                type="file"
                accept=".txt,.fountain,.md"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setScreenplayRaw(String(reader.result || ''));
                    showToast(`Imported screenplay "${file.name}"`);
                  };
                  reader.readAsText(file);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => scriptFileInputRef.current?.click()}
                className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[#46ecd5] font-semibold flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Screenplay (.txt/.fountain)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1">Production Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1">Saved Productions ({cinemaProjects.length})</label>
                <select
                  value={selectedProjId || ''}
                  onChange={(e) => {
                    const found = cinemaProjects.find((p) => p.id === e.target.value);
                    if (found) selectProject(found);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                >
                  <option value="">Current Production Draft</option>
                  {cinemaProjects.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.title} ({cp.productionType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Logline / Creative Brief</label>
              <input
                type="text"
                value={logline}
                onChange={(e) => setLogline(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span>Formatted Screenplay (INT./EXT., Action, CHARACTER, Dialogue)</span>
                <span className="font-mono-tabular text-[11px] text-[#46ecd5]">
                  Fountain Standard
                </span>
              </div>
              <textarea
                rows={14}
                value={screenplayRaw}
                onChange={(e) => setScreenplayRaw(e.target.value)}
                className="w-full p-3.5 rounded-lg bg-[#08080B] border border-white/10 text-zinc-100 font-mono text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleParseScreenplayToScenesAndShots}
                className="px-4 py-2.5 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold flex-1"
              >
                Generate Scene Breakdown & Shot List
              </button>
            </div>
          </div>

          {/* Right: Scene Breakdown, Continuity Assignment & Shot-by-Shot Production */}
          <div className="lg:col-span-7 space-y-5">
            {scenes.length === 0 ? (
              <div className="rounded-xl bg-[#111115] border border-white/10 p-10 text-center space-y-3">
                <Clapperboard className="w-9 h-9 text-[#46ecd5] mx-auto" />
                <div className="text-base font-bold text-white">
                  Ready to Break Down Your Screenplay
                </div>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Click "Generate Scene Breakdown & Shot List" on the left to automatically extract scenes, match saved Characters, Wardrobes, Locations & Props, and generate your shot-by-shot production board.
                </p>
                <button
                  onClick={handleParseScreenplayToScenesAndShots}
                  className="px-5 py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider"
                >
                  Parse Screenplay Now
                </button>
              </div>
            ) : (
              scenes.map((sc, sceneIdx) => {
                const loc = locations.find((l) => l.id === sc.locationId);
                return (
                  <div
                    key={sc.id}
                    className="rounded-xl bg-[#111115] border border-white/10 p-5 space-y-4 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <span className="font-mono-tabular text-[#46ecd5] font-bold">
                          SCENE {sc.sceneNumber}
                        </span>
                        <h3 className="text-base font-bold text-white mt-0.5">
                          {sc.slugline}
                        </h3>
                      </div>

                      {/* Location Continuity Link for Scene */}
                      <div className="flex items-center gap-2">
                        <select
                          value={sc.locationId || ''}
                          onChange={(e) => {
                            const nextLocId = e.target.value || null;
                            setScenes((prev) =>
                              prev.map((item, i) =>
                                i === sceneIdx ? { ...item, locationId: nextLocId } : item
                              )
                            );
                          }}
                          className="px-2.5 py-1.5 rounded bg-[#09090C] border border-white/10 text-zinc-200"
                        >
                          <option value="">Assign Saved Location...</option>
                          {locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.settingType} {l.name} [{l.locationCode}]
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <p className="text-zinc-300 leading-relaxed">{sc.actionDescription}</p>

                    {/* Dialogue Lines */}
                    {sc.dialogueLines.length > 0 && (
                      <div className="space-y-2 bg-[#09090C] p-3.5 rounded-lg border border-white/5">
                        <div className="text-[11px] font-bold uppercase text-zinc-400">
                          Scene Dialogue & Voice Continuity
                        </div>
                        {sc.dialogueLines.map((dlg) => (
                          <div
                            key={dlg.id}
                            className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-white/5 last:border-0"
                          >
                            <div>
                              <span className="font-bold text-[#46ecd5]">
                                {dlg.characterName}
                              </span>{' '}
                              <span className="text-zinc-400">({dlg.language}):</span>{' '}
                              <span className="text-zinc-200">"{dlg.text}"</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate('lipsync')}
                              className="text-[11px] text-[#46ecd5] hover:underline"
                            >
                              Open in Lip Sync →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Shots List for Scene */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase text-zinc-300">
                          Shot List & Storyboard-to-Video Pipeline ({sc.shots.length} shots)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextLetter = String.fromCharCode(65 + sc.shots.length);
                            const newShot: ProductionShot = {
                              id: `shot_${sc.sceneNumber}_${nextLetter}_${Date.now()}`,
                              shotNumber: `${sc.sceneNumber}${nextLetter}`,
                              shotSize: 'Medium',
                              cameraAngle: 'Eye Level',
                              cameraMovement: 'Steadicam Track',
                              lens: '35mm Prime',
                              durationSec: 5,
                              characterIds: sc.characterIds,
                              wardrobeId: wardrobes[0]?.id || null,
                              propIds: sc.propIds,
                              locationId: sc.locationId,
                              actionPrompt: sc.actionDescription || sc.slugline,
                              continuityVerified: true,
                            };
                            setScenes((prev) =>
                              prev.map((item, idx) =>
                                idx === sceneIdx
                                  ? { ...item, shots: [...item.shots, newShot] }
                                  : item
                              )
                            );
                          }}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[#46ecd5] font-semibold"
                        >
                          + Add Shot
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {sc.shots.map((shot, shotIdx) => {
                          const isBusy = busyShotId === shot.id;
                          return (
                            <div
                              key={shot.id}
                              className="p-3.5 rounded-xl bg-[#09090C] border border-white/10 space-y-2.5 flex flex-col justify-between"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono-tabular font-bold text-[#46ecd5]">
                                    SHOT {shot.shotNumber} · {shot.shotSize}
                                  </span>
                                  <span className="text-[11px] text-zinc-400">
                                    {shot.cameraAngle} · {shot.lens}
                                  </span>
                                </div>

                                {(shot.shotVideoUrl || shot.storyboardImageUrl) && (
                                  <div className="aspect-video rounded-lg bg-black overflow-hidden border border-white/10">
                                    {shot.shotVideoUrl ? (
                                      <video
                                        src={shot.shotVideoUrl}
                                        controls
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <img
                                        src={shot.storyboardImageUrl}
                                        alt={`Shot ${shot.shotNumber}`}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                )}

                                <textarea
                                  rows={2}
                                  value={shot.actionPrompt}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setScenes((prev) =>
                                      prev.map((item, si) =>
                                        si !== sceneIdx
                                          ? item
                                          : {
                                              ...item,
                                              shots: item.shots.map((sh, shi) =>
                                                shi !== shotIdx
                                                  ? sh
                                                  : { ...sh, actionPrompt: val }
                                              ),
                                            }
                                      )
                                    );
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded bg-[#121217] border border-white/10 text-zinc-200 text-xs"
                                />

                                {/* Per-Shot Character & Wardrobe Continuity Selector */}
                                <div className="grid grid-cols-2 gap-2">
                                  <select
                                    value={shot.characterIds[0] || ''}
                                    onChange={(e) => {
                                      const cid = e.target.value;
                                      setScenes((prev) =>
                                        prev.map((item, si) =>
                                          si !== sceneIdx
                                            ? item
                                            : {
                                                ...item,
                                                shots: item.shots.map((sh, shi) =>
                                                  shi !== shotIdx
                                                    ? sh
                                                    : {
                                                        ...sh,
                                                        characterIds: cid ? [cid] : [],
                                                      }
                                                ),
                                              }
                                        )
                                      );
                                    }}
                                    className="px-2 py-1 rounded bg-[#121217] border border-white/10 text-zinc-300 text-[11px]"
                                  >
                                    <option value="">Character Lock...</option>
                                    {characters.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name} [{c.identityId}]
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    value={shot.wardrobeId || ''}
                                    onChange={(e) => {
                                      const wid = e.target.value || null;
                                      setScenes((prev) =>
                                        prev.map((item, si) =>
                                          si !== sceneIdx
                                            ? item
                                            : {
                                                ...item,
                                                shots: item.shots.map((sh, shi) =>
                                                  shi !== shotIdx
                                                    ? sh
                                                    : { ...sh, wardrobeId: wid }
                                                ),
                                              }
                                        )
                                      );
                                    }}
                                    className="px-2 py-1 rounded bg-[#121217] border border-white/10 text-zinc-300 text-[11px]"
                                  >
                                    <option value="">Wardrobe Lock...</option>
                                    {wardrobes.map((w) => (
                                      <option key={w.id} value={w.id}>
                                        {w.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleGenerateShotStoryboard(sceneIdx, shotIdx)
                                  }
                                  className="px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-semibold"
                                >
                                  {isBusy ? 'Working...' : '1. Gen Storyboard'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleGenerateShotVideo(sceneIdx, shotIdx)}
                                  className="px-2.5 py-1.5 rounded bg-[#46ecd5] text-zinc-950 font-bold"
                                >
                                  {isBusy ? 'Rendering...' : '2. Gen Shot Video'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 7. STORYBOARD STUDIO
// ============================================================================
export const StoryboardStudioView: React.FC = () => {
  const {
    cinemaProjects,
    characters,
    wardrobes,
    locations,
    submitGeneration,
    composeContinuityPrompt,
    navigate,
  } = useRuns();

  const [quickBoards, setQuickBoards] = useState<
    Array<{
      id: string;
      shotCode: string;
      shotSize: ShotSizeType;
      angle: CameraAngleType;
      lens: string;
      prompt: string;
      characterId: string;
      wardrobeId: string;
      locationId: string;
      imageUrl?: string;
    }>
  >([
    {
      id: 'brd_1',
      shotCode: 'SHOT 01A',
      shotSize: 'Extreme Wide',
      angle: 'High Angle',
      lens: '24mm Anamorphic',
      prompt: 'Establishing view of protagonist arriving at the filming location at dusk.',
      characterId: characters[0]?.id || '',
      wardrobeId: wardrobes[0]?.id || '',
      locationId: locations[0]?.id || '',
    },
    {
      id: 'brd_2',
      shotCode: 'SHOT 01B',
      shotSize: 'Medium Close-Up',
      angle: 'Eye Level',
      lens: '50mm Prime',
      prompt: 'Character pauses and looks toward the camera with a determined expression.',
      characterId: characters[0]?.id || '',
      wardrobeId: wardrobes[0]?.id || '',
      locationId: locations[0]?.id || '',
    },
    {
      id: 'brd_3',
      shotCode: 'SHOT 01C',
      shotSize: 'Close-Up',
      angle: 'Low Angle',
      lens: '85mm Prime',
      prompt: 'Tight close-up capturing character reaction and atmospheric rim lighting.',
      characterId: characters[0]?.id || '',
      wardrobeId: wardrobes[0]?.id || '',
      locationId: locations[0]?.id || '',
    },
  ]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const generateBoard = async (idx: number) => {
    const b = quickBoards[idx];
    if (!b) return;
    setBusyId(b.id);
    try {
      const composed = composeContinuityPrompt(
        `Storyboard panel ${b.shotCode} (${b.shotSize}, ${b.angle}, ${b.lens}): ${b.prompt}`,
        {
          characterIds: b.characterId ? [b.characterId] : [],
          wardrobeId: b.wardrobeId || null,
          locationId: b.locationId || null,
        }
      );
      const res = await submitGeneration({
        surface: 'image',
        modelId: 'nano-banana-2-1',
        mode: 'Create',
        prompt: composed.prompt,
        settings: { aspect_ratio: '16:9', quality: '2K' },
        media: composed.media,
      });
      const url = res.generation?.outputs?.[0]?.url;
      if (url) {
        setQuickBoards((prev) =>
          prev.map((item, i) => (i === idx ? { ...item, imageUrl: url } : item))
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <HiggsfieldCinemaStudio
      studioId="storyboard"
      renderStudioVault={() => (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="text-xs font-mono-tabular text-[#46ecd5] uppercase tracking-wider">
              07 · STORYBOARD STUDIO — VISUAL SHOT PLANNING & SEQUENCING
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white mt-1">
              Continuity-Locked Storyboard Sequence Planner
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Plan camera angles, shot sizes, and lenses while locking Character, Wardrobe, and Location continuity across every board.
            </p>
          </div>
          <button
            onClick={() =>
              setQuickBoards((prev) => [
                ...prev,
                {
                  id: `brd_${Date.now()}`,
                  shotCode: `SHOT 0${prev.length + 1}A`,
                  shotSize: 'Medium',
                  angle: 'Eye Level',
                  lens: '35mm Prime',
                  prompt: 'New storyboard sequence panel.',
                  characterId: characters[0]?.id || '',
                  wardrobeId: wardrobes[0]?.id || '',
                  locationId: locations[0]?.id || '',
                },
              ])
            }
            className="px-4 py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider"
          >
            + Add Storyboard Panel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {quickBoards.map((b, idx) => (
            <div
              key={b.id}
              className="rounded-xl bg-[#111115] border border-white/10 p-4 space-y-3 text-xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tabular font-bold text-[#46ecd5]">
                    {b.shotCode}
                  </span>
                  <span className="text-zinc-400">
                    {b.shotSize} · {b.angle}
                  </span>
                </div>
                <div className="aspect-video rounded-lg bg-[#08080B] border border-white/10 overflow-hidden flex items-center justify-center">
                  {b.imageUrl ? (
                    <img
                      src={b.imageUrl}
                      alt={b.shotCode}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-zinc-500">Unrendered Storyboard Frame</span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={b.prompt}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuickBoards((prev) =>
                      prev.map((it, i) => (i === idx ? { ...it, prompt: val } : it))
                    );
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-[#09090C] border border-white/10 text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={b.characterId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickBoards((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, characterId: val } : it))
                      );
                    }}
                    className="px-2 py-1.5 rounded bg-[#09090C] border border-white/10 text-zinc-200"
                  >
                    <option value="">Character Lock...</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={b.locationId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickBoards((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, locationId: val } : it))
                      );
                    }}
                    className="px-2 py-1.5 rounded bg-[#09090C] border border-white/10 text-zinc-200"
                  >
                    <option value="">Location Lock...</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <button
                  disabled={busyId === b.id}
                  onClick={() => generateBoard(idx)}
                  className="flex-1 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold"
                >
                  {busyId === b.id ? 'Generating...' : 'Generate Board'}
                </button>
                <button
                  onClick={() => navigate('cinema')}
                  className="px-3 py-2 rounded-lg bg-zinc-900 text-zinc-200 border border-white/10"
                >
                  To Cinema
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    />
  );
};

// ============================================================================
// 8. MARKETING & UGC STUDIO
// ============================================================================
export const MarketingStudioView: React.FC = () => {
  const {
    characters,
    wardrobes,
    propsList,
    locations,
    submitGeneration,
    composeContinuityPrompt,
  } = useRuns();

  const [campaignFormat, setCampaignFormat] = useState<
    'UGC Creator Review (9:16)' | 'Hero Product Commercial (16:9)' | 'Social Brand Hook (9:16)'
  >('UGC Creator Review (9:16)');
  const [selectedCharId, setSelectedCharId] = useState(characters[0]?.id || '');
  const [selectedPropId, setSelectedPropId] = useState(propsList[0]?.id || '');
  const [selectedWardrobeId, setSelectedWardrobeId] = useState(wardrobes[0]?.id || '');
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || '');
  const [adScript, setAdScript] = useState(
    'Creator holds the hero product up to natural window light, demonstrating its build quality with authentic enthusiasm.'
  );
  const [isRunning, setIsRunning] = useState(false);

  const handleLaunchCampaignShot = async (surface: 'image' | 'video') => {
    setIsRunning(true);
    try {
      const isVertical = campaignFormat.includes('9:16');
      const composed = composeContinuityPrompt(
        `${campaignFormat} advertisement production: ${adScript}`,
        {
          characterIds: selectedCharId ? [selectedCharId] : [],
          wardrobeId: selectedWardrobeId || null,
          propIds: selectedPropId ? [selectedPropId] : [],
          locationId: selectedLocationId || null,
        }
      );
      await submitGeneration({
        surface,
        modelId: surface === 'video' ? 'seedance-2-5' : 'nano-banana-2-1',
        mode: surface === 'video' ? 'Create Video' : 'Create',
        prompt: composed.prompt,
        settings: {
          aspect_ratio: isVertical ? '9:16' : '16:9',
          ...(surface === 'video' ? { duration: 5, resolution: '1080p' } : { quality: '2K' }),
        },
        media: composed.media,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <HiggsfieldCinemaStudio
      studioId="marketing"
      renderStudioVault={() => (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="border-b border-white/10 pb-6">
          <div className="text-xs font-mono-tabular text-[#46ecd5] uppercase tracking-wider">
            08 · MARKETING & UGC STUDIO — BRAND COMMERCIALS & CREATOR CONTINUITY
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white mt-1">
            Persistent Creator Characters & Product Commercial Production
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl">
            Combine your saved Creator Characters, Product Props, Wardrobes, and Locations to produce consistent UGC reels and commercial campaigns.
          </p>
        </div>

        <div className="rounded-xl bg-[#111115] border border-white/10 p-6 space-y-4 text-xs max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-zinc-400 mb-1">Marketing Format</label>
              <select
                value={campaignFormat}
                onChange={(e) => setCampaignFormat(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                <option value="UGC Creator Review (9:16)">UGC Creator Review (9:16)</option>
                <option value="Hero Product Commercial (16:9)">
                  Hero Product Commercial (16:9)
                </option>
                <option value="Social Brand Hook (9:16)">Social Brand Hook (9:16)</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Creator Character</label>
              <select
                value={selectedCharId}
                onChange={(e) => setSelectedCharId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                <option value="">Select Saved Character...</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} [{c.identityId}]
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Featured Product Prop</label>
              <select
                value={selectedPropId}
                onChange={(e) => setSelectedPropId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                <option value="">Select Saved Product Prop...</option>
                {propsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.propCode}]
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Location Set</label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                <option value="">Select Saved Location...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Commercial Action & Hook Script</label>
            <textarea
              rows={3}
              value={adScript}
              onChange={(e) => setAdScript(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              disabled={isRunning}
              onClick={() => handleLaunchCampaignShot('image')}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white font-bold"
            >
              Generate Product & Creator Still
            </button>
            <button
              disabled={isRunning}
              onClick={() => handleLaunchCampaignShot('video')}
              className="px-5 py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold"
            >
              {isRunning ? 'Synthesizing Campaign...' : 'Generate Commercial / UGC Video'}
            </button>
          </div>
        </div>
      </div>
      )}
    />
  );
};

// ============================================================================
// 9. LIP SYNC STUDIO — MULTILINGUAL DIALOGUE & FACIAL SYNCHRONIZATION
// ============================================================================
export const LipSyncStudioView: React.FC = () => {
  const { characters, submitGeneration, composeContinuityPrompt, showToast } = useRuns();

  const [selectedCharId, setSelectedCharId] = useState(characters[0]?.id || '');
  const selectedChar = characters.find((c) => c.id === selectedCharId);
  const [language, setLanguage] = useState<SupportedCharacterLanguage>(
    selectedChar?.primaryLanguage || 'English'
  );
  const [emotion, setEmotion] = useState<CharacterExpression>('Smiling');
  const [dialogueText, setDialogueText] = useState(
    'Every scene holds together when our face and voice carry the exact same soul.'
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRunLipSync = async () => {
    if (!dialogueText.trim()) {
      showToast('Enter dialogue lines to synchronize');
      return;
    }
    setIsSyncing(true);
    try {
      const composed = composeContinuityPrompt(
        `Lip-Sync Dialogue Performance in ${language} (Expression: ${emotion}, Voice ID: ${selectedChar?.voiceId || 'LOCKED'}, Accent: ${selectedChar?.speechAccent || 'Natural'}): Character speaks directly with accurate viseme mouth articulation: "${dialogueText}"`,
        {
          characterIds: selectedCharId ? [selectedCharId] : [],
        }
      );
      await submitGeneration({
        surface: 'video',
        modelId: 'kling-3-0-pro',
        mode: 'Create Video',
        prompt: composed.prompt,
        settings: { duration: 5, aspect_ratio: '16:9', resolution: '1080p' },
        media: composed.media,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <HiggsfieldCinemaStudio
      studioId="lipsync"
      renderStudioVault={() => (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="border-b border-white/10 pb-6">
          <div className="text-xs font-mono-tabular text-[#46ecd5] uppercase tracking-wider">
            09 · LIP SYNC STUDIO — MULTILINGUAL DIALOGUE & FACIAL PERFORMANCE
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white mt-1">
            Character Voice & Lip Synchronization
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl">
            Synchronize spoken dialogue in English, Nigerian Pidgin, Yoruba, Igbo, Hausa, French, and more with your character's locked face and voice identity.
          </p>
        </div>

        <div className="rounded-xl bg-[#111115] border border-white/10 p-6 space-y-4 text-xs max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-zinc-400 mb-1">Character (Face & Voice Locked)</label>
              <select
                value={selectedCharId}
                onChange={(e) => {
                  setSelectedCharId(e.target.value);
                  const found = characters.find((c) => c.id === e.target.value);
                  if (found) setLanguage(found.primaryLanguage);
                }}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                <option value="">Select Saved Character...</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} [{c.identityId}] · {c.voiceId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Spoken Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedCharacterLanguage)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Facial Expression</label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value as CharacterExpression)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                {EXPRESSIONS.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Dialogue Script to Lip-Sync</label>
            <textarea
              rows={3}
              value={dialogueText}
              onChange={(e) => setDialogueText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
            />
          </div>

          <button
            disabled={isSyncing}
            onClick={handleRunLipSync}
            className="px-5 py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            <span>{isSyncing ? 'Generating Lip-Sync Video...' : 'Generate Lip-Synced Performance'}</span>
          </button>
        </div>
      </div>
      )}
    />
  );
};

// ============================================================================
// 10. CANVAS STUDIO — CONNECTED AI MODEL & ASSET WORKFLOWS
// ============================================================================
export const CanvasStudioView: React.FC = () => {
  const {
    characters,
    wardrobes,
    locations,
    propsList,
    motionTemplates,
    submitGeneration,
    composeContinuityPrompt,
    showToast,
  } = useRuns();

  const [selectedCharId, setSelectedCharId] = useState(characters[0]?.id || '');
  const [selectedWardrobeId, setSelectedWardrobeId] = useState(wardrobes[0]?.id || '');
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || '');
  const [selectedPropId, setSelectedPropId] = useState(propsList[0]?.id || '');
  const [selectedMotionId, setSelectedMotionId] = useState(motionTemplates[0]?.id || '');
  const [sceneAction, setSceneAction] = useState(
    'Character walks through the location carrying the hero prop as camera tracks smoothly.'
  );
  const [pipelineStage, setPipelineStage] = useState<'idle' | 'keyframe' | 'video' | 'done'>(
    'idle'
  );
  const [keyframeUrl, setKeyframeUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const executeConnectedCanvasPipeline = async () => {
    setPipelineStage('keyframe');
    try {
      const composed = composeContinuityPrompt(sceneAction, {
        characterIds: selectedCharId ? [selectedCharId] : [],
        wardrobeId: selectedWardrobeId || null,
        locationId: selectedLocationId || null,
        propIds: selectedPropId ? [selectedPropId] : [],
        motionTemplateId: selectedMotionId || null,
      });

      const imgRes = await submitGeneration({
        surface: 'image',
        modelId: 'nano-banana-2-1',
        mode: 'Create',
        prompt: composed.prompt,
        settings: { aspect_ratio: '16:9', quality: '2K' },
        media: composed.media,
      });
      const kfOut = imgRes.generation?.outputs?.[0]?.url || '';
      if (kfOut) setKeyframeUrl(kfOut);

      setPipelineStage('video');
      const vidRes = await submitGeneration({
        surface: 'video',
        modelId: 'seedance-2-5',
        mode: 'Create Video',
        prompt: composed.prompt,
        settings: { duration: 5, aspect_ratio: '16:9', resolution: '1080p' },
        media: kfOut
          ? [{ role: 'start', kind: 'image', url: kfOut, label: 'Canvas Keyframe' }]
          : composed.media,
      });
      const vidOut = vidRes.generation?.outputs?.[0]?.url || '';
      if (vidOut) setVideoUrl(vidOut);
      setPipelineStage('done');
      showToast('Connected Canvas workflow completed');
    } catch {
      setPipelineStage('idle');
    }
  };

  return (
    <HiggsfieldCinemaStudio
      studioId="canvas"
      renderStudioVault={() => (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="text-xs font-mono-tabular text-[#46ecd5] uppercase tracking-wider">
              10 · CANVAS STUDIO — CONNECTED AI MODEL & CONTINUITY GRAPH
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white mt-1">
              Node-Based Continuity Asset & Multi-Model Pipeline
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Wire Character + Wardrobe + Location + Prop + Motion nodes into a chained Keyframe-to-Video model graph.
            </p>
          </div>
          <button
            disabled={pipelineStage === 'keyframe' || pipelineStage === 'video'}
            onClick={executeConnectedCanvasPipeline}
            className="px-5 py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <Workflow className="w-4 h-4" />
            <span>
              {pipelineStage === 'keyframe'
                ? 'Running Node 1: Continuity Keyframe...'
                : pipelineStage === 'video'
                ? 'Running Node 2: Motion Video Synthesis...'
                : 'Execute Connected Graph'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch text-xs">
          {/* Column 1: Continuity Input Nodes */}
          <div className="rounded-xl bg-[#111115] border border-white/10 p-5 space-y-3">
            <div className="font-mono-tabular text-[#46ecd5] font-bold">
              STAGE 1 · CONTINUITY INPUT NODES
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Character Identity Node</label>
              <select
                value={selectedCharId}
                onChange={(e) => setSelectedCharId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                <option value="">None</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} [{c.identityId}]
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Wardrobe Outfit Node</label>
              <select
                value={selectedWardrobeId}
                onChange={(e) => setSelectedWardrobeId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                <option value="">None</option>
                {wardrobes.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} [{w.wardrobeCode}]
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Location Environment Node</label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              >
                <option value="">None</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.settingType} {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Prop & Motion Rig Nodes</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedPropId}
                  onChange={(e) => setSelectedPropId(e.target.value)}
                  className="px-2 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                >
                  <option value="">No Prop</option>
                  {propsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMotionId}
                  onChange={(e) => setSelectedMotionId(e.target.value)}
                  className="px-2 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
                >
                  <option value="">No Motion</option>
                  {motionTemplates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Column 2: Optical Keyframe Synthesis Node */}
          <div className="rounded-xl bg-[#111115] border border-white/10 p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="font-mono-tabular text-[#46ecd5] font-bold">
                STAGE 2 · KEYFRAME GENERATOR NODE (NANO BANANA 2.1)
              </div>
              <textarea
                rows={3}
                value={sceneAction}
                onChange={(e) => setSceneAction(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#09090C] border border-white/10 text-white"
              />
              <div className="aspect-video rounded-lg bg-[#08080B] border border-white/10 overflow-hidden flex items-center justify-center">
                {keyframeUrl ? (
                  <img
                    src={keyframeUrl}
                    alt="Canvas Keyframe"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-zinc-500">Keyframe Output Slot</span>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Cinema Video & Audio Output Node */}
          <div className="rounded-xl bg-[#111115] border border-white/10 p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="font-mono-tabular text-[#46ecd5] font-bold">
                STAGE 3 · MOTION VIDEO NODE (SEEDANCE 2.5)
              </div>
              <p className="text-zinc-400">
                Automatically receives the continuity-locked keyframe from Stage 2 as its Start Frame and animates the shot.
              </p>
              <div className="aspect-video rounded-lg bg-[#08080B] border border-white/10 overflow-hidden flex items-center justify-center">
                {videoUrl ? (
                  <video src={videoUrl} controls className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-500">Chained Video Output Slot</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    />
  );
};

// ============================================================================
// 11. EDITING STUDIO — VIDEO, DIALOGUE, MUSIC & FINAL ASSEMBLY
// ============================================================================
export const EditingStudioView: React.FC = () => {
  const { generations, cinemaProjects, downloadGeneration, showToast } = useRuns();

  const videoGens = useMemo(
    () =>
      generations.filter(
        (g) => g.status === 'completed' && g.surface === 'video' && g.outputs[0]?.url
      ),
    [generations]
  );
  const audioGens = useMemo(
    () =>
      generations.filter(
        (g) => g.status === 'completed' && g.surface === 'audio' && g.outputs[0]?.url
      ),
    [generations]
  );

  const [timelineVideoIds, setTimelineVideoIds] = useState<string[]>(() =>
    videoGens.slice(0, 3).map((g) => g.id)
  );
  const [activePlayIdx, setActivePlayIdx] = useState(0);

  const timelineClips = timelineVideoIds
    .map((id) => videoGens.find((g) => g.id === id))
    .filter(Boolean);
  const currentPlaying = timelineClips[activePlayIdx] || videoGens[0] || null;

  return (
    <HiggsfieldCinemaStudio
      studioId="editing"
      renderStudioVault={() => (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="text-xs font-mono-tabular text-[#46ecd5] uppercase tracking-wider">
              11 · EDITING STUDIO — MULTI-TRACK VIDEO, VOICE, MUSIC & SFX ASSEMBLY
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase text-white mt-1">
              Timeline Sequencer & Final Scene Assembly
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Arrange generated video shots, character dialogue tracks, music scores, and sound effects into a continuous production cut.
            </p>
          </div>
          {currentPlaying && (
            <button
              onClick={() => downloadGeneration(currentPlaying)}
              className="px-5 py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Active Master Clip</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Program Monitor Player */}
          <div className="lg:col-span-7 rounded-xl bg-[#111115] border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase text-white">
                Program Monitor · Clip {activePlayIdx + 1} of {Math.max(1, timelineClips.length)}
              </span>
              <span className="font-mono-tabular text-[#46ecd5]">24.00 FPS · REC.709</span>
            </div>

            <div className="aspect-video rounded-xl bg-black border border-white/10 overflow-hidden flex items-center justify-center">
              {currentPlaying?.outputs[0]?.url ? (
                <video
                  key={currentPlaying.outputs[0].url}
                  src={currentPlaying.outputs[0].url}
                  controls
                  autoPlay
                  onEnded={() => {
                    if (activePlayIdx + 1 < timelineClips.length) {
                      setActivePlayIdx((p) => p + 1);
                    }
                  }}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-xs text-zinc-500">
                  Add generated video shots from the media bin on the right to preview your assembled sequence.
                </div>
              )}
            </div>
          </div>

          {/* Media Bin */}
          <div className="lg:col-span-5 rounded-xl bg-[#111115] border border-white/10 p-5 space-y-3 text-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Production Media Bin ({videoGens.length} Video · {audioGens.length} Audio)
            </h2>
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {videoGens.map((vg) => (
                <div
                  key={vg.id}
                  className="p-2.5 rounded-lg bg-[#09090C] border border-white/10 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{vg.modelLabel}</div>
                    <div className="text-[11px] text-zinc-400 truncate">{vg.prompt}</div>
                  </div>
                  <button
                    onClick={() => {
                      setTimelineVideoIds((prev) => [...prev, vg.id]);
                      showToast('Added shot to Video Track V1');
                    }}
                    className="px-2.5 py-1 rounded bg-[#46ecd5] text-zinc-950 font-bold shrink-0"
                  >
                    + Track V1
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Multi-Track Timeline */}
        <div className="rounded-xl bg-[#111115] border border-white/10 p-5 space-y-4 text-xs">
          <div className="font-bold uppercase tracking-wider text-white">
            Multi-Track Production Timeline
          </div>

          <div className="space-y-2.5">
            {/* V1 Video Track */}
            <div className="p-3 rounded-lg bg-[#09090C] border border-white/10 space-y-2">
              <div className="font-mono-tabular text-[11px] text-[#46ecd5]">
                TRACK V1 · PICTURE SHOTS ({timelineClips.length} clips)
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {timelineClips.map((clip, idx) =>
                  clip ? (
                    <div
                      key={`${clip.id}_${idx}`}
                      onClick={() => setActivePlayIdx(idx)}
                      className={`p-2.5 rounded-lg border min-w-[180px] cursor-pointer ${
                        activePlayIdx === idx
                          ? 'bg-[#171B1E] border-[#46ecd5]'
                          : 'bg-[#121217] border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono-tabular font-bold text-white">
                          SHOT 0{idx + 1}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTimelineVideoIds((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-zinc-500 hover:text-rose-400"
                        >
                          ×
                        </button>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-1">
                        {clip.prompt}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>

            {/* A1 Audio & Voice Track */}
            <div className="p-3 rounded-lg bg-[#09090C] border border-white/10 space-y-2">
              <div className="font-mono-tabular text-[11px] text-[#46ecd5]">
                TRACK A1/A2 · DIALOGUE, SCORE & FOLEY ({audioGens.length} tracks)
              </div>
              <div className="flex items-center gap-3 overflow-x-auto">
                {audioGens.length === 0 ? (
                  <span className="text-zinc-500">
                    Synthesize character dialogue in Character Studio or score in Audio Studio to populate A1/A2.
                  </span>
                ) : (
                  audioGens.map((ag) => (
                    <div
                      key={ag.id}
                      className="p-2.5 rounded-lg bg-[#121217] border border-white/10 min-w-[260px] space-y-1.5"
                    >
                      <div className="text-[11px] text-white font-semibold truncate">
                        {ag.prompt}
                      </div>
                      <audio controls src={ag.outputs[0]?.url} className="w-full h-7" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    />
  );
};
