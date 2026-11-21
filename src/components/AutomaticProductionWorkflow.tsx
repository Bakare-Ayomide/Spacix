import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  Clapperboard,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Mic,
  Package,
  Play,
  Plus,
  RefreshCw,
  Shirt,
  Sparkles,
  Trash2,
  Users,
  Video,
  Wand2,
} from 'lucide-react';
import { useRuns } from '../lib/useRuns';
import {
  CinemaProductionType,
  SupportedCharacterLanguage,
} from '../types/studio';
import {
  Badge,
  Button,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from './ui/primitives';
import {
  ShimmerButton,
  SpotlightCard,
} from './ui/aceternity-magic';
import { toast } from 'sonner';

import showcaseMonologueImg from '../assets/images/showcase_cinema_monologue_1794663513979.jpg';
import showcaseCorridorImg from '../assets/images/showcase_corridor_tracking_1794663516993.jpg';
import showcaseArchitectureImg from '../assets/images/showcase_sunlit_architecture_1794663516452.jpg';

export type AutoProdStageId = 1 | 2 | 3 | 4;

export interface AutoProdDialogueLine {
  id: string;
  sceneId: string;
  speaker: string;
  parenthetical: string;
  line: string;
  kind: 'dialogue' | 'narration';
}

export interface AutoProdScene {
  sceneId: string;
  sceneNumber: number;
  heading: string;
  settingType: 'INT.' | 'EXT.' | 'INT./EXT.';
  locationName: string;
  timeOfDay: 'Day' | 'Night' | 'Dawn' | 'Golden Hour' | 'Sunset';
  actions: string;
  dialogueLines: AutoProdDialogueLine[];
  charactersInScene: string[];
  propsInScene: string[];
  wardrobesInScene: string[];
  productionNotes: string;
}

export interface AutoProdAsset {
  id: string;
  category: 'Character' | 'Location' | 'Wardrobe' | 'Prop' | 'Voice';
  name: string;
  sceneRefs: string[];
  characterRef?: string;
  description: string;
  generationPrompt: string;
  modelId: string;
  outputUrl: string;
  outputKind: 'image' | 'audio';
  status: 'idle' | 'generating' | 'ready' | 'approved';
  language?: SupportedCharacterLanguage;
  voicePersona?: string;
}

export interface AutoProdStoryboardShot {
  id: string;
  sceneId: string;
  sceneHeading: string;
  shotNumber: string;
  cameraFraming:
    | 'Wide Establishing'
    | 'Medium Wide'
    | 'Medium Two-Shot'
    | 'Close-Up'
    | 'Extreme Close-Up'
    | 'Over-the-Shoulder'
    | 'Reverse Shot'
    | 'Low-Angle Hero'
    | 'POV';
  cameraMovement: string;
  lens: string;
  lighting: string;
  characterNames: string[];
  characterPositioning: string;
  actionDescription: string;
  emotion: string;
  dialogueOrNarration: string;
  speaker: string;
  locationName: string;
  imageModelId: string;
  frameImageUrl: string;
  frameStatus: 'idle' | 'generating' | 'ready' | 'approved';
  videoModelId: string;
  videoClipUrl: string;
  videoDurationSec: number;
  videoStatus: 'idle' | 'generating' | 'ready';
}

export interface AutoProdProjectState {
  title: string;
  ideaDescription: string;
  productionFormat: CinemaProductionType;
  aspectRatio: '16:9' | '21:9' | '9:16' | '1:1';
  creativeInstructions: string;
  referenceNotes: string;
  referenceUrls: Array<{ id: string; label: string; url: string; kind: 'image' | 'video' | 'doc' }>;
  scenes: AutoProdScene[];
  assets: AutoProdAsset[];
  shots: AutoProdStoryboardShot[];
}

const DEFAULT_SCENES: AutoProdScene[] = [
  {
    sceneId: 'sc-1',
    sceneNumber: 1,
    heading: 'EXT. VICTORIA ISLAND SKYBRIDGE - NIGHT',
    settingType: 'EXT.',
    locationName: 'Victoria Island Skybridge',
    timeOfDay: 'Night',
    actions:
      'Rain sheets across the elevated concrete skybridge. Neon holograms reflect in puddles as DETECTIVE KEMI walks briskly with a quantum telemetry scanner.',
    dialogueLines: [
      {
        id: 'dlg-1',
        sceneId: 'sc-1',
        speaker: 'DETECTIVE KEMI',
        parenthetical: 'into collar mic, calm',
        line: 'Signal origin confirmed on Sector 4 skybridge. Locking optical perimeter now.',
        kind: 'dialogue',
      },
    ],
    charactersInScene: ['Detective Kemi'],
    propsInScene: ['Quantum Telemetry Scanner'],
    wardrobesInScene: ['Obsidian Tactical Trench'],
    productionNotes: 'Shot on ARRI Alexa 65, 35mm Anamorphic, Twilight Fable grade.',
  },
  {
    sceneId: 'sc-2',
    sceneNumber: 2,
    heading: 'INT. ARCHIVE COMMAND VAULT - NIGHT',
    settingType: 'INT.',
    locationName: 'Archive Command Vault',
    timeOfDay: 'Night',
    actions:
      'Tall monolith servers hum under cool cyan overhead shafts. Kemi inserts the data core into the central holo-console.',
    dialogueLines: [
      {
        id: 'dlg-2',
        sceneId: 'sc-2',
        speaker: 'DETECTIVE KEMI',
        parenthetical: 'focused',
        line: 'Every frame from the orbital relay is intact. Run the reconstruction.',
        kind: 'dialogue',
      },
    ],
    charactersInScene: ['Detective Kemi'],
    propsInScene: ['Orbital Data Core'],
    wardrobesInScene: ['Obsidian Tactical Trench'],
    productionNotes: 'Cooke 50mm Prime, Window Chiaroscuro lighting.',
  },
];

const DEFAULT_ASSETS: AutoProdAsset[] = [
  {
    id: 'ast-1',
    category: 'Character',
    name: 'Detective Kemi',
    sceneRefs: ['Scene 1', 'Scene 2'],
    description: 'Lead investigator, sharp expressive eyes, determined posture',
    generationPrompt: 'Cinematic portrait of Detective Kemi, 35mm anamorphic lens, tungsten rim light, photorealistic',
    modelId: 'nano-banana-pro',
    outputUrl: showcaseMonologueImg,
    outputKind: 'image',
    status: 'ready',
    language: 'English',
    voicePersona: 'Warm authoritative studio mezzo',
  },
  {
    id: 'ast-2',
    category: 'Location',
    name: 'Victoria Island Skybridge',
    sceneRefs: ['Scene 1'],
    description: 'Futuristic elevated concrete skybridge in rain with neon reflections',
    generationPrompt: 'Wide architectural plate of Victoria Island Skybridge at night in rain, anamorphic 2.39:1',
    modelId: 'flux-pro-1.1',
    outputUrl: showcaseCorridorImg,
    outputKind: 'image',
    status: 'ready',
  },
  {
    id: 'ast-3',
    category: 'Location',
    name: 'Archive Command Vault',
    sceneRefs: ['Scene 2'],
    description: 'Brutalist server hall with volumetric shafts of light',
    generationPrompt: 'Interior brutalist archive command vault with dramatic overhead light beams, 70mm IMAX',
    modelId: 'flux-pro-1.1',
    outputUrl: showcaseArchitectureImg,
    outputKind: 'image',
    status: 'ready',
  },
];

const DEFAULT_SHOTS: AutoProdStoryboardShot[] = [
  {
    id: 'sh-1',
    sceneId: 'sc-1',
    sceneHeading: 'EXT. VICTORIA ISLAND SKYBRIDGE - NIGHT',
    shotNumber: '1A',
    cameraFraming: 'Wide Establishing',
    cameraMovement: 'Crane up',
    lens: '35mm Anamorphic',
    lighting: 'Practicals',
    characterNames: ['Detective Kemi'],
    characterPositioning: 'Center frame walking toward camera',
    actionDescription: 'Wide establishing crane shot of Kemi crossing the rain-slicked skybridge.',
    emotion: 'Suspense & Scale',
    dialogueOrNarration: 'Signal origin confirmed on Sector 4 skybridge.',
    speaker: 'DETECTIVE KEMI',
    locationName: 'Victoria Island Skybridge',
    imageModelId: 'nano-banana-pro',
    frameImageUrl: showcaseCorridorImg,
    frameStatus: 'ready',
    videoModelId: 'seedance-2.0',
    videoClipUrl: '',
    videoDurationSec: 5,
    videoStatus: 'idle',
  },
  {
    id: 'sh-2',
    sceneId: 'sc-2',
    sceneHeading: 'INT. ARCHIVE COMMAND VAULT - NIGHT',
    shotNumber: '2A',
    cameraFraming: 'Close-Up',
    cameraMovement: 'Rack focus',
    lens: 'Cooke 50mm Prime',
    lighting: 'Window',
    characterNames: ['Detective Kemi'],
    characterPositioning: 'Rule-of-thirds profile by console',
    actionDescription: 'Intimate close-up as holographic telemetry illuminates Kemi’s eyes.',
    emotion: 'Discovery & Resolve',
    dialogueOrNarration: 'Every frame from the orbital relay is intact.',
    speaker: 'DETECTIVE KEMI',
    locationName: 'Archive Command Vault',
    imageModelId: 'nano-banana-pro',
    frameImageUrl: showcaseMonologueImg,
    frameStatus: 'ready',
    videoModelId: 'seedance-2.0',
    videoClipUrl: '',
    videoDurationSec: 5,
    videoStatus: 'idle',
  },
];

export const AutomaticProductionWorkflow: React.FC<{
  projectTitle: string;
  productionType: CinemaProductionType;
  onProjectTitleChange?: (newTitle: string) => void;
  onOpenAdvancedStoryStudio?: () => void;
}> = ({
  projectTitle,
  productionType,
  onProjectTitleChange,
  onOpenAdvancedStoryStudio,
}) => {
  const {
    models,
    submitGeneration,
    saveCharacter,
    saveLocation,
    saveCinemaProject,
  } = useRuns();

  const [activeStage, setActiveStage] = useState<AutoProdStageId>(1);
  const [isAutopilotRunning, setIsAutopilotRunning] = useState(false);
  const [selectedSceneIdx, setSelectedSceneIdx] = useState(0);
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>('All');

  const [prodState, setProdState] = useState<AutoProdProjectState>({
    title: projectTitle || 'ECHOES OF LAGOS',
    ideaDescription:
      'In near-future Lagos, Detective Kemi intercepts an encrypted orbital signal on a rain-drenched skybridge that unlocks a hidden archive vault.',
    productionFormat: productionType || 'Short Films',
    aspectRatio: '16:9',
    creativeInstructions:
      'Shot on ARRI Alexa 65 with 35mm Anamorphic lenses, Twilight Fable ACES LUT, grounded tactile sci-fi noir atmosphere.',
    referenceNotes: 'Maintain 100% facial and wardrobe continuity for @Detective Kemi across all shots.',
    referenceUrls: [],
    scenes: DEFAULT_SCENES,
    assets: DEFAULT_ASSETS,
    shots: DEFAULT_SHOTS,
  });

  const videoModel = useMemo(
    () => models.find((m) => m.surface === 'video') || models[0],
    [models]
  );
  const imageModel = useMemo(
    () => models.find((m) => m.surface === 'image') || models[0],
    [models]
  );

  // Generate Script Breakdown from Concept
  const handleSynthesizeScriptFromConcept = () => {
    const titleUpper = prodState.title.toUpperCase();
    const newScene: AutoProdScene = {
      sceneId: `sc-${Date.now()}`,
      sceneNumber: prodState.scenes.length + 1,
      heading: `EXT. ${titleUpper} HORIZON SECTOR - GOLDEN HOUR`,
      settingType: 'EXT.',
      locationName: `${prodState.title} Horizon Sector`,
      timeOfDay: 'Golden Hour',
      actions: `${prodState.ideaDescription} Camera tracks smoothly on 35mm anamorphic glass.`,
      dialogueLines: [
        {
          id: `dlg-${Date.now()}`,
          sceneId: `sc-${Date.now()}`,
          speaker: 'DETECTIVE KEMI',
          parenthetical: 'determined',
          line: 'We have the coordinates. Initiating final sequence.',
          kind: 'dialogue',
        },
      ],
      charactersInScene: ['Detective Kemi'],
      propsInScene: ['Quantum Telemetry Scanner'],
      wardrobesInScene: ['Obsidian Tactical Trench'],
      productionNotes: prodState.creativeInstructions,
    };

    setProdState((prev) => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
    }));
    setActiveStage(2);
    toast.success('Generated screenplay breakdown & advanced to Stage 2');
  };

  // Render Single Asset in Stage 3
  const handleRenderAsset = async (asset: AutoProdAsset) => {
    if (!imageModel) return;
    setProdState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (a.id === asset.id ? { ...a, status: 'generating' } : a)),
    }));
    const res = await submitGeneration({
      surface: 'image',
      modelId: imageModel.id,
      prompt: `${asset.generationPrompt} — ${prodState.creativeInstructions}`,
      settings: {
        aspectRatio: prodState.aspectRatio,
        resolution: '2K',
      },
      media: [],
    });
    if (res.ok && res.generation) {
      const outUrl = res.generation.outputs[0]?.url || '';
      setProdState((prev) => ({
        ...prev,
        assets: prev.assets.map((a) =>
          a.id === asset.id ? { ...a, outputUrl: outUrl, status: 'ready' } : a
        ),
      }));
      if (asset.category === 'Character') {
        await saveCharacter({
          name: asset.name,
          roleTitle: 'Lead Character',
          ageRange: '28-35',
          genderPresentation: 'Adaptive',
          distinctiveFeatures: asset.description,
          hairstyle: 'Styled',
          skinTone: 'Natural',
          bodyType: 'Athletic',
          height: 'Medium',
          primaryLanguage: asset.language || 'English',
          supportedLanguages: ['English'],
          voiceName: asset.voicePersona || 'Studio Voice',
          pitch: 'Medium',
          deliveryStyle: 'Measured',
          faceReferenceUrl: outUrl,
        });
      }
      if (asset.category === 'Location') {
        await saveLocation({
          name: asset.name,
          category: 'Sci-Fi & Fantasy',
          settingType: 'EXT.',
          timeOfDay: 'Night',
          weather: 'Rain',
          description: asset.description,
          lightingAndMood: 'Practical neon & tungsten',
          primaryImageUrl: outUrl,
        });
      }
      toast.success(`Synthesized & locked @${asset.name} into Continuity Vault`);
    }
  };

  // Render Shot Still or Motion Video in Stage 4
  const handleRenderShotFrame = async (shot: AutoProdStoryboardShot) => {
    if (!imageModel) return;
    setProdState((prev) => ({
      ...prev,
      shots: prev.shots.map((s) => (s.id === shot.id ? { ...s, frameStatus: 'generating' } : s)),
    }));
    const res = await submitGeneration({
      surface: 'image',
      modelId: imageModel.id,
      prompt: `[STORYBOARD SHOT ${shot.shotNumber} · ${shot.cameraFraming} · ${shot.lens}] ${shot.actionDescription} at ${shot.locationName}`,
      settings: {
        aspectRatio: prodState.aspectRatio,
        resolution: '2K',
      },
      media: [],
    });
    if (res.ok && res.generation) {
      setProdState((prev) => ({
        ...prev,
        shots: prev.shots.map((s) =>
          s.id === shot.id
            ? { ...s, frameImageUrl: res.generation!.outputs[0]?.url || '', frameStatus: 'ready' }
            : s
        ),
      }));
      toast.success(`Rendered Storyboard Frame ${shot.shotNumber}`);
    }
  };

  const handleRenderShotVideo = async (shot: AutoProdStoryboardShot) => {
    if (!videoModel) return;
    setProdState((prev) => ({
      ...prev,
      shots: prev.shots.map((s) => (s.id === shot.id ? { ...s, videoStatus: 'generating' } : s)),
    }));
    const res = await submitGeneration({
      surface: 'video',
      modelId: videoModel.id,
      prompt: `[CINEMA TAKE ${shot.shotNumber} · ${shot.cameraMovement} · ${shot.lens}] ${shot.actionDescription}`,
      settings: {
        aspectRatio: prodState.aspectRatio,
        resolution: '1080p',
        durationSec: shot.videoDurationSec || 5,
        audioEnabled: true,
      },
      media: shot.frameImageUrl
        ? [
            {
              role: 'start',
              kind: 'image',
              url: shot.frameImageUrl,
              label: `Shot ${shot.shotNumber} Keyframe`,
            },
          ]
        : [],
    });
    if (res.ok && res.generation) {
      setProdState((prev) => ({
        ...prev,
        shots: prev.shots.map((s) =>
          s.id === shot.id
            ? { ...s, videoClipUrl: res.generation!.outputs[0]?.url || '', videoStatus: 'ready' }
            : s
        ),
      }));
      toast.success(`Rendered Cinema Video Clip for Shot ${shot.shotNumber}`);
    }
  };

  // Run Full 4-Stage Autopilot
  const handleRunFullAutopilot = async () => {
    setIsAutopilotRunning(true);
    try {
      toast.info('Autopilot engaged: Executing Stage 1 → Stage 4 pipeline...');
      await saveCinemaProject({
        title: prodState.title,
        productionType: prodState.productionFormat,
        logline: prodState.ideaDescription,
        aspectRatio: prodState.aspectRatio,
        screenplayRaw: prodState.scenes.map((s) => `${s.heading}\n${s.actions}`).join('\n\n'),
        scenes: [],
      });
      if (prodState.shots[0]) {
        await handleRenderShotVideo(prodState.shots[0]);
      }
      setActiveStage(4);
      toast.success('4-Stage Autonomous Pipeline completed!');
    } finally {
      setIsAutopilotRunning(false);
    }
  };

  const activeScene = prodState.scenes[selectedSceneIdx] || prodState.scenes[0];

  return (
    <div className="space-y-6">
      {/* Top 4-Stage Pipeline Header & Stepper */}
      <SpotlightCard className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono-tabular text-cyan-300">
              AUTONOMOUS FILM PRODUCTION PIPELINE
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-0.5">
              {prodState.title} · 4-Stage Guided Studio
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenAdvancedStoryStudio && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onOpenAdvancedStoryStudio}
              >
                Open NLE Timeline →
              </Button>
            )}
            <ShimmerButton
              onClick={handleRunFullAutopilot}
              disabled={isAutopilotRunning}
              className="h-10 px-5 rounded-xl text-xs font-bold"
            >
              {isAutopilotRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Running 4-Stage Autopilot...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Run Full 4-Stage Autopilot</span>
                </>
              )}
            </ShimmerButton>
          </div>
        </div>

        {/* 4-Stage Interactive Stepper Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {(
            [
              {
                id: 1 as AutoProdStageId,
                step: 'STAGE 01',
                title: 'Concept & Mandate',
                sub: `${prodState.productionFormat} · ${prodState.aspectRatio}`,
              },
              {
                id: 2 as AutoProdStageId,
                step: 'STAGE 02',
                title: 'Screenplay & Scenes',
                sub: `${prodState.scenes.length} Scenes Breakdown`,
              },
              {
                id: 3 as AutoProdStageId,
                step: 'STAGE 03',
                title: '@Continuity Assets',
                sub: `${prodState.assets.length} Locked Elements`,
              },
              {
                id: 4 as AutoProdStageId,
                step: 'STAGE 04',
                title: 'Storyboard & Video Cut',
                sub: `${prodState.shots.length} Camera Shots`,
              },
            ] as const
          ).map((st) => {
            const active = activeStage === st.id;
            const completed = activeStage > st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveStage(st.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-magic-gradient text-white border-transparent shadow-lg shadow-indigo-500/20'
                    : completed
                    ? 'bg-indigo-950/30 border-indigo-500/40 text-white'
                    : 'bg-[#070912] border-white/[0.08] text-slate-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono-tabular">
                  <span>{st.step}</span>
                  {completed && <Check className="w-3.5 h-3.5 text-cyan-300" />}
                </div>
                <div className="font-display text-sm font-bold mt-1">{st.title}</div>
                <div className={`text-[11px] mt-0.5 ${active ? 'text-white/85' : 'text-slate-400'}`}>
                  {st.sub}
                </div>
              </button>
            );
          })}
        </div>
      </SpotlightCard>

      {/* STAGE 1: CONCEPT & OPTICAL MANDATE */}
      {activeStage === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <SpotlightCard className="lg:col-span-7 p-6 space-y-4">
            <div className="text-xs font-mono-tabular text-cyan-300">
              STAGE 01 · PRODUCTION BRIEF & CONCEPT
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Production Title</label>
                <Input
                  value={prodState.title}
                  onChange={(e) => {
                    setProdState((p) => ({ ...p, title: e.target.value }));
                    onProjectTitleChange?.(e.target.value);
                  }}
                  className="bg-[#060810]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Aspect Ratio</label>
                <div className="grid grid-cols-4 gap-1 bg-[#060810] p-1 rounded-xl border border-white/[0.08]">
                  {(['16:9', '21:9', '9:16', '1:1'] as const).map((ar) => (
                    <button
                      key={ar}
                      type="button"
                      onClick={() => setProdState((p) => ({ ...p, aspectRatio: ar }))}
                      className={`py-1.5 rounded-lg text-xs font-mono-tabular font-semibold cursor-pointer ${
                        prodState.aspectRatio === ar ? 'bg-indigo-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-medium">
                Story Logline & Narrative Premise
              </label>
              <Textarea
                value={prodState.ideaDescription}
                onChange={(e) => setProdState((p) => ({ ...p, ideaDescription: e.target.value }))}
                rows={4}
                className="bg-[#060810] text-xs leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-medium">
                Director Optical & Color Mandate
              </label>
              <Textarea
                value={prodState.creativeInstructions}
                onChange={(e) =>
                  setProdState((p) => ({ ...p, creativeInstructions: e.target.value }))
                }
                rows={3}
                className="bg-[#060810] text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <ShimmerButton
                onClick={handleSynthesizeScriptFromConcept}
                className="h-11 px-6 rounded-xl text-xs font-bold"
              >
                <span>Synthesize Screenplay & Advance to Stage 2</span>
                <ArrowRight className="w-4 h-4" />
              </ShimmerButton>
            </div>
          </SpotlightCard>

          <SpotlightCard className="lg:col-span-5 p-6 space-y-4">
            <div className="text-xs font-mono-tabular text-cyan-300">
              1-CLICK PRODUCTION ARCHETYPES
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Load a Pre-Configured Film Blueprint
            </h3>
            <div className="space-y-3">
              {[
                {
                  title: 'ECHOES OF LAGOS (Sci-Fi Noir Short)',
                  idea: 'In near-future Lagos, Detective Kemi intercepts an encrypted orbital signal on a rain-drenched skybridge that unlocks a hidden archive vault.',
                  mandate: 'ARRI Alexa 65, 35mm Anamorphic, Twilight Fable ACES LUT, practical rain reflections.',
                },
                {
                  title: 'SOLARIS CHRONOGRAPH (Luxury Commercial)',
                  idea: 'A sculptural 30-second commercial revealing a titanium tourbillon timepiece emerging from volcanic obsidian and liquid gold light.',
                  mandate: 'RED V-Raptor 8K, 24mm Macro Probe lens, Overhead Fall studio rim lighting.',
                },
                {
                  title: 'SAHEL NOMADS (IMAX Documentary)',
                  idea: 'An atmospheric documentary portrait following solar engineers crossing monumental desert dunes at golden hour.',
                  mandate: 'IMAX 15/70mm, Zeiss Master Prime lenses, Highway Standoff Kodachrome grade.',
                },
              ].map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => {
                    setProdState((p) => ({
                      ...p,
                      title: preset.title.split(' (')[0],
                      ideaDescription: preset.idea,
                      creativeInstructions: preset.mandate,
                    }));
                    toast.success(`Loaded blueprint "${preset.title}"`);
                  }}
                  className="w-full p-4 rounded-2xl bg-[#060810] border border-white/[0.08] hover:border-indigo-500/50 text-left space-y-1.5 transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-white">{preset.title}</div>
                  <p className="text-xs text-slate-400 line-clamp-2">{preset.idea}</p>
                </button>
              ))}
            </div>
          </SpotlightCard>
        </div>
      )}

      {/* STAGE 2: SCREENPLAY & SCENE BREAKDOWN */}
      {activeStage === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <SpotlightCard className="lg:col-span-4 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular text-cyan-300">
                SCENES ({prodState.scenes.length})
              </span>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={handleSynthesizeScriptFromConcept}
              >
                + Add AI Scene
              </Button>
            </div>
            <div className="space-y-2">
              {prodState.scenes.map((sc, idx) => (
                <button
                  key={sc.sceneId}
                  type="button"
                  onClick={() => setSelectedSceneIdx(idx)}
                  className={`w-full p-3.5 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                    selectedSceneIdx === idx
                      ? 'bg-indigo-500/20 border-indigo-400 text-white'
                      : 'bg-[#060810] border-white/[0.08] text-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-mono-tabular text-cyan-300">
                    SCENE 0{sc.sceneNumber} · {sc.timeOfDay.toUpperCase()}
                  </div>
                  <div className="text-xs font-bold truncate">{sc.heading}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">{sc.actions}</div>
                </button>
              ))}
            </div>
            <div className="pt-3">
              <ShimmerButton
                onClick={() => setActiveStage(3)}
                className="w-full h-10 rounded-xl text-xs font-bold"
              >
                <span>Approve Script & Advance to Stage 3</span>
                <ArrowRight className="w-4 h-4" />
              </ShimmerButton>
            </div>
          </SpotlightCard>

          <SpotlightCard className="lg:col-span-8 p-6 space-y-4">
            {activeScene && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                  <div>
                    <div className="text-xs font-mono-tabular text-cyan-300">
                      FOUNTAIN SCENE EDITOR · SCENE 0{activeScene.sceneNumber}
                    </div>
                    <h3 className="font-display text-lg font-bold text-white">
                      {activeScene.heading}
                    </h3>
                  </div>
                  <span className="text-xs font-mono-tabular text-slate-400">
                    Set: @{activeScene.locationName}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">
                    Scene Action & Camera Blocking
                  </label>
                  <Textarea
                    value={activeScene.actions}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProdState((prev) => ({
                        ...prev,
                        scenes: prev.scenes.map((s, i) =>
                          i === selectedSceneIdx ? { ...s, actions: val } : s
                        ),
                      }));
                    }}
                    rows={4}
                    className="bg-[#060810] text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-white">Spoken Dialogue Lines</div>
                  {activeScene.dialogueLines.map((dlg) => (
                    <div
                      key={dlg.id}
                      className="p-3.5 rounded-xl bg-[#060810] border border-white/[0.08] space-y-1"
                    >
                      <div className="text-xs font-mono-tabular font-bold text-cyan-300">
                        @{dlg.speaker}{' '}
                        <span className="text-slate-500 font-normal">({dlg.parenthetical})</span>
                      </div>
                      <p className="text-xs text-slate-200">{dlg.line}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SpotlightCard>
        </div>
      )}

      {/* STAGE 3: @CONTINUITY ASSET SYNTHESIS */}
      {activeStage === 3 && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {['All', 'Character', 'Location', 'Wardrobe', 'Prop'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAssetCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                    assetCategoryFilter === cat
                      ? 'bg-magic-gradient text-white'
                      : 'bg-[#0B0F1C] text-slate-400 border border-white/[0.08]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <ShimmerButton
              onClick={() => setActiveStage(4)}
              className="h-10 px-5 rounded-xl text-xs font-bold"
            >
              <span>Lock Continuity Vault & Open Stage 4 Storyboard</span>
              <ArrowRight className="w-4 h-4" />
            </ShimmerButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {prodState.assets
              .filter((a) => assetCategoryFilter === 'All' || a.category === assetCategoryFilter)
              .map((asset) => (
                <SpotlightCard key={asset.id} className="overflow-hidden flex flex-col justify-between">
                  <div className="aspect-video relative bg-black">
                    <img
                      src={asset.outputUrl}
                      alt={asset.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 text-[10px] font-mono-tabular text-cyan-300">
                      @{asset.category.toUpperCase()}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="font-display text-base font-bold text-white">
                        @{asset.name}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{asset.description}</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={asset.status === 'generating'}
                      onClick={() => handleRenderAsset(asset)}
                      className="w-full"
                    >
                      {asset.status === 'generating' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Synthesizing Plate...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Re-Synthesize {asset.category} Plate</span>
                        </>
                      )}
                    </Button>
                  </div>
                </SpotlightCard>
              ))}
          </div>
        </div>
      )}

      {/* STAGE 4: STORYBOARD FRAMES & CINEMA VIDEO CUTS */}
      {activeStage === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {prodState.shots.map((shot) => (
            <SpotlightCard key={shot.id} className="overflow-hidden flex flex-col justify-between">
              <div className="aspect-video relative bg-black">
                {shot.videoClipUrl ? (
                  <video
                    src={shot.videoClipUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={shot.frameImageUrl}
                    alt={shot.actionDescription}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono-tabular text-white bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span>
                    SHOT {shot.shotNumber} · {shot.cameraFraming}
                  </span>
                  <span className="text-cyan-300">
                    {shot.lens} · {shot.cameraMovement}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono-tabular text-indigo-300">
                    {shot.sceneHeading}
                  </div>
                  <p className="text-xs sm:text-sm text-white font-medium">
                    {shot.actionDescription}
                  </p>
                  {shot.dialogueOrNarration && (
                    <p className="text-xs text-cyan-300 italic">
                      @{shot.speaker}: "{shot.dialogueOrNarration}"
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={shot.frameStatus === 'generating'}
                    onClick={() => handleRenderShotFrame(shot)}
                  >
                    {shot.frameStatus === 'generating' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Rendering Frame...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Render Keyframe Still</span>
                      </>
                    )}
                  </Button>

                  <ShimmerButton
                    onClick={() => handleRenderShotVideo(shot)}
                    disabled={shot.videoStatus === 'generating'}
                    className="h-9 px-4 rounded-xl text-xs font-bold"
                  >
                    {shot.videoStatus === 'generating' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Rendering Video...</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-3.5 h-3.5" />
                        <span>Render 5s Cinema Clip</span>
                      </>
                    )}
                  </ShimmerButton>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}
    </div>
  );
};
