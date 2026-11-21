import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Film,
  Layers,
  Mic,
  Music,
  Plus,
  Save,
  Users,
} from 'lucide-react';
import { useRuns } from '../lib/useRuns';
import {
  MediaSlotInput,
  MusicVideoAudioTrack,
  MusicVideoGenerationMode,
  MusicVideoProjectData,
  MusicVideoScene,
} from '../types/studio';
import {
  getDefaultModelForMusicVideoMode,
  getDynamicControlsForModel,
  getMusicVideoImageModels,
} from '../catalog/musicVideoCapabilities';
import {
  dataUrlToArrayBuffer,
  decodeAudioArrayBuffer,
  fileToDataUrl,
  formatTimecode,
  sliceAudioBufferToWavDataUrl,
} from '../lib/audioEngine';
import { AudioWaveformTimeline } from './music-video/AudioWaveformTimeline';
import { PerformerCastPanel } from './music-video/PerformerCastPanel';
import { SceneDirectorWorkspace } from './music-video/SceneDirectorWorkspace';
import { MusicVideoSequencer } from './music-video/MusicVideoSequencer';
import { Button, Input } from './ui/primitives';

export interface MusicVideoProductionStudioProps {
  projectId: string | null;
  projectTitle: string;
  onProjectTitleChange: (title: string) => void;
  onBackToStudio: () => void;
}

type StudioStageTab = 'cast' | 'director' | 'sequence';

function createSceneTemplate(
  order: number,
  mode: MusicVideoGenerationMode,
  startSec: number,
  endSec: number,
  defaultCharIds: string[],
  defaultWardrobeId: string | null,
  defaultAspectRatio: string,
  defaultImageModelId: string,
  animModelId: string,
  lipSyncModelId: string
): MusicVideoScene {
  const isLip = mode === 'lip_sync';
  return {
    id: `mv_scene_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    order,
    title: isLip
      ? `Scene ${String(order + 1).padStart(2, '0')} — Vocal Performance`
      : `Scene ${String(order + 1).padStart(2, '0')} — Cinematic B-Roll`,
    mode,
    audioStartSec: Number(startSec.toFixed(2)),
    audioEndSec: Number(endSec.toFixed(2)),
    characterIds: [...defaultCharIds],
    wardrobeId: defaultWardrobeId,
    sceneSourceMode: 'generate',
    scenePrompt: isLip
      ? 'Lead performer bathed in neon rim lighting on a rain-slicked rooftop stage, delivering an impassioned vocal performance into a vintage chrome studio microphone, shallow depth of field'
      : 'Atmospheric wide-angle cinematic cutaway of city skyline lights shimmering across wet asphalt as silhouetted dancer moves through drifting volumetric mist',
    environmentNotes: isLip
      ? 'Midnight urban rooftop, drifting concert haze, distant bokeh skyline'
      : 'Rain-soaked neon avenue, warm sodium reflections, cinematic mist',
    cameraFraming: isLip ? 'Medium Close-Up' : 'Wide Establishing Shot',
    cameraMovement: isLip ? 'Slow Cinematic Push-In' : 'Smooth 180° Steadicam Orbit',
    lightingStyle: 'Neon Rim & Volumetric Haze',
    visualStyle: '35mm Anamorphic Music Video',
    performanceDirection: isLip
      ? 'Singing with authentic emotion, rhythmic head movement synced to the cadence, locked eye contact on key lyrics'
      : 'Fluid slow-motion kinetic movement, atmospheric light flares catching camera lens',
    facialExpression: 'Passionate & Soulful Delivery',
    bodyMovement: 'Natural shoulder sway & subtle hand emphasis on beat',
    bRollCategory: 'Cinematic Environmental Scene',
    sceneImageUrl: '',
    sceneImageModelId: defaultImageModelId,
    lipSyncPipelineType: 'native',
    animationModelId: animModelId,
    lipSyncModelId,
    aspectRatio: defaultAspectRatio,
    resolution: '1080p',
    durationSec: 5,
    modelSettings: {},
    status: 'draft',
    updatedAt: new Date().toISOString(),
  };
}

export const MusicVideoProductionStudio: React.FC<MusicVideoProductionStudioProps> = ({
  projectId,
  projectTitle,
  onProjectTitleChange,
  onBackToStudio,
}) => {
  const {
    sessionToken,
    models,
    characters,
    wardrobes,
    generations,
    cinemaProjects,
    calculateTokenCost,
    composeContinuityPrompt,
    uploadReferenceFile,
    submitGeneration,
    saveCinemaProject,
    showToast,
  } = useRuns();

  const storageKey = `spacix_mv_workspace_v1_${projectId || 'default'}`;

  const imageModels = useMemo(() => getMusicVideoImageModels(models), [models]);
  const defaultImageModelId = imageModels[0]?.id || 'soul-2-standard';

  const buildInitialProjectData = useCallback((): MusicVideoProjectData => {
    // 1. Check persisted cinemaProject record first
    const matchedProj = projectId
      ? cinemaProjects.find((p) => p.id === projectId)
      : cinemaProjects.find((p) => p.musicVideo);
    if (matchedProj?.musicVideo && matchedProj.musicVideo.scenes.length > 0) {
      return matchedProj.musicVideo;
    }

    // 2. Check localStorage mirror
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as MusicVideoProjectData;
        if (parsed && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }

    // 3. Create clean 2-scene starter sequence (Lip Sync + B-Roll)
    const lipDefaults = getDefaultModelForMusicVideoMode('lip_sync', 'native', models);
    const bRollDefaults = getDefaultModelForMusicVideoMode('b_roll', 'native', models);
    const defaultChars = characters[0] ? [characters[0].id] : [];
    const defaultWardrobe = wardrobes[0]?.id || null;

    const scene1 = createSceneTemplate(
      0,
      'lip_sync',
      0,
      8,
      defaultChars,
      defaultWardrobe,
      '16:9',
      defaultImageModelId,
      lipDefaults.animationModelId,
      lipDefaults.lipSyncModelId
    );
    const scene2 = createSceneTemplate(
      1,
      'b_roll',
      8,
      14,
      defaultChars,
      defaultWardrobe,
      '16:9',
      defaultImageModelId,
      bRollDefaults.animationModelId,
      ''
    );

    return {
      audioTrack: null,
      activeSceneId: scene1.id,
      scenes: [scene1, scene2],
      defaultAspectRatio: '16:9',
      updatedAt: new Date().toISOString(),
    };
  }, [projectId, cinemaProjects, storageKey, models, characters, wardrobes, defaultImageModelId]);

  const [mvData, setMvData] = useState<MusicVideoProjectData>(() => buildInitialProjectData());
  const [activeTab, setActiveTab] = useState<StudioStageTab>('director');
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  const [decodedBuffer, setDecodedBuffer] = useState<AudioBuffer | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Track two-stage lip-sync handoffs so Stage 2 triggers strictly once per Stage 1 completion
  const stage2DispatchedRef = useRef<Set<string>>(new Set());

  const activeScene = useMemo(() => {
    return (
      mvData.scenes.find((s) => s.id === mvData.activeSceneId) ||
      mvData.scenes[0] ||
      null
    );
  }, [mvData.scenes, mvData.activeSceneId]);

  // Persist locally on every change (debounced lightly)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(mvData));
      } catch {
        // Ignore quota errors (e.g., if user imported a large inline audio dataUrl)
        try {
          const compact: MusicVideoProjectData = {
            ...mvData,
            audioTrack: mvData.audioTrack
              ? {
                  ...mvData.audioTrack,
                  sourceUrl: mvData.audioTrack.sourceUrl.startsWith('data:')
                    ? mvData.audioTrack.originalUrl.startsWith('http') ||
                      mvData.audioTrack.originalUrl.startsWith('/api/')
                      ? mvData.audioTrack.originalUrl
                      : ''
                    : mvData.audioTrack.sourceUrl,
                }
              : null,
          };
          localStorage.setItem(storageKey, JSON.stringify(compact));
        } catch {
          // ignore
        }
      }
    }, 350);
    return () => clearTimeout(t);
  }, [mvData, storageKey]);

  // Auto-decode persisted audioTrack on mount if buffer is not yet in memory
  useEffect(() => {
    let cancelled = false;
    if (!mvData.audioTrack?.sourceUrl || decodedBuffer) return;

    (async () => {
      try {
        const arr = await dataUrlToArrayBuffer(mvData.audioTrack!.sourceUrl);
        const buf = await decodeAudioArrayBuffer(arr);
        if (!cancelled) setDecodedBuffer(buf);
      } catch {
        // User can still play via <audio> or re-import if needed
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mvData.audioTrack?.sourceUrl, decodedBuffer]);

  const updateSceneById = useCallback(
    (sceneId: string, patch: Partial<MusicVideoScene>) => {
      setMvData((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        scenes: prev.scenes.map((s) =>
          s.id === sceneId
            ? { ...s, ...patch, updatedAt: new Date().toISOString() }
            : s
        ),
      }));
    },
    []
  );

  // Build sanitized model-supported settings payload before submitting to backend
  const buildModelSettingsPayload = useCallback(
    (modelId: string, scene: MusicVideoScene): Record<string, string | number | boolean> => {
      const model = models.find((m) => m.id === modelId);
      if (!model) return {};
      const out: Record<string, string | number | boolean> = {};

      for (const setting of model.settings) {
        if (setting.key === 'aspect_ratio') {
          if (
            setting.type === 'enum' &&
            setting.options.some((o) => o.value === scene.aspectRatio)
          ) {
            out.aspect_ratio = scene.aspectRatio;
          } else {
            out.aspect_ratio = setting.defaultValue;
          }
        } else if (setting.key === 'resolution') {
          if (
            setting.type === 'enum' &&
            setting.options.some((o) => o.value === scene.resolution)
          ) {
            out.resolution = scene.resolution;
          } else {
            out.resolution = setting.defaultValue;
          }
        } else if (setting.key === 'duration') {
          const strDur = String(scene.durationSec);
          if (
            setting.type === 'enum' &&
            setting.options.some((o) => o.value === strDur)
          ) {
            out.duration = strDur;
          } else {
            out.duration = setting.defaultValue;
          }
        } else if (scene.modelSettings[setting.key] !== undefined) {
          out[setting.key] = scene.modelSettings[setting.key];
        } else {
          out[setting.key] = setting.defaultValue;
        }
      }
      return out;
    },
    [models]
  );

  // Non-destructively slice [scene.audioStartSec, scene.audioEndSec] from original decoded AudioBuffer
  const prepareTrimmedAudioUrl = useCallback(
    async (scene: MusicVideoScene): Promise<string | null> => {
      if (!mvData.audioTrack) return null;

      if (decodedBuffer) {
        try {
          const { blob, dataUrl, durationSec } = await sliceAudioBufferToWavDataUrl(
            decodedBuffer,
            scene.audioStartSec,
            scene.audioEndSec
          );
          const uploaded = await uploadReferenceFile({
            label: `${scene.title.slice(0, 32)} (${formatTimecode(scene.audioStartSec)}-${formatTimecode(scene.audioEndSec)}).wav`,
            contentType: 'audio/wav',
            bytes: blob.size,
            dataUrl,
          });
          const resolvedUrl = uploaded?.publicUrl || dataUrl;
          updateSceneById(scene.id, {
            trimmedAudioUrl: resolvedUrl,
            statusMessage: `Trimmed ${durationSec.toFixed(1)}s vocal segment ready`,
          });
          return resolvedUrl;
        } catch {
          // Fall back gracefully to source track URL
        }
      }

      return mvData.audioTrack.sourceUrl || mvData.audioTrack.originalUrl || null;
    },
    [mvData.audioTrack, decodedBuffer, uploadReferenceFile, updateSceneById]
  );

  // Trigger Stage 2 dedicated lip-sync pass automatically after Stage 1 animation completes
  const dispatchTwoStageLipSync = useCallback(
    async (scene: MusicVideoScene, stage1VideoUrl: string) => {
      const trimmedUrl = scene.trimmedAudioUrl || (await prepareTrimmedAudioUrl(scene));
      if (!trimmedUrl) {
        updateSceneById(scene.id, {
          status: 'failed',
          statusMessage: 'Trimmed audio segment unavailable for Stage 2 lip sync.',
        });
        return;
      }

      const lipModelId = scene.lipSyncModelId || 'sync-lipsync-2-pro';
      const lipSettings = buildModelSettingsPayload(lipModelId, scene);
      const media: MediaSlotInput[] = [
        { role: 'video', kind: 'video', url: stage1VideoUrl },
        { role: 'audio', kind: 'audio', url: trimmedUrl },
      ];

      updateSceneById(scene.id, {
        stage1VideoUrl,
        status: 'syncing_lips',
        statusMessage: `Stage 2: Aligning mouth movements via ${
          models.find((m) => m.id === lipModelId)?.label || lipModelId
        }...`,
      });

      const res = await submitGeneration({
        surface: 'video',
        modelId: lipModelId,
        mode: 'video-to-video',
        prompt: `Audio-driven lip synchronization preserving performer identity and camera motion. ${scene.facialExpression}. ${scene.performanceDirection}`,
        settings: lipSettings,
        media,
      });

      if (!res.ok || !res.generation) {
        updateSceneById(scene.id, {
          status: 'failed',
          statusMessage: res.error || 'Stage 2 lip-sync submission failed.',
        });
        showToast(res.error || 'Stage 2 lip-sync pass failed.');
        return;
      }

      updateSceneById(scene.id, {
        finalGenerationId: res.generation.id,
        status: 'syncing_lips',
        statusMessage: 'Stage 2 lip-sync pass processing...',
      });
    },
    [prepareTrimmedAudioUrl, buildModelSettingsPayload, models, submitGeneration, updateSceneById, showToast]
  );

  // Watch Studio generations polling state to automatically resolve scene images, Stage 1 -> Stage 2 handoff, and final clips
  useEffect(() => {
    if (generations.length === 0) return;

    for (const scene of mvData.scenes) {
      // 1. Scene Reference Image completion
      if (scene.status === 'generating_image' && scene.sceneImageGenerationId) {
        const gen = generations.find((g) => g.id === scene.sceneImageGenerationId);
        if (gen) {
          if (gen.status === 'completed' && gen.outputs[0]?.url) {
            updateSceneById(scene.id, {
              sceneImageUrl: gen.outputs[0].url,
              status: 'draft',
              statusMessage: 'Scene reference frame generated',
            });
            showToast(`${scene.title}: Scene reference frame ready.`);
          } else if (gen.status === 'failed' || gen.status === 'nsfw' || gen.status === 'canceled') {
            updateSceneById(scene.id, {
              status: 'failed',
              statusMessage: gen.error || 'Scene frame generation failed.',
            });
          }
        }
      }

      // 2. Two-Stage Lip Sync — Stage 1 Animation completion -> Auto-launch Stage 2 Lip Sync
      if (
        scene.mode === 'lip_sync' &&
        scene.lipSyncPipelineType === 'two_stage' &&
        scene.status === 'animating' &&
        scene.stage1GenerationId
      ) {
        const gen1 = generations.find((g) => g.id === scene.stage1GenerationId);
        if (gen1) {
          if (gen1.status === 'completed' && gen1.outputs[0]?.url) {
            if (!stage2DispatchedRef.current.has(gen1.id)) {
              stage2DispatchedRef.current.add(gen1.id);
              void dispatchTwoStageLipSync(scene, gen1.outputs[0].url);
            }
          } else if (gen1.status === 'failed' || gen1.status === 'nsfw' || gen1.status === 'canceled') {
            updateSceneById(scene.id, {
              status: 'failed',
              statusMessage: gen1.error || 'Stage 1 animation failed.',
            });
          }
        }
      }

      // 3. Final Video completion (Native Lip Sync, Two-Stage Step 2, or B-Roll)
      if (
        (scene.status === 'animating' || scene.status === 'syncing_lips') &&
        scene.finalGenerationId
      ) {
        const genFinal = generations.find((g) => g.id === scene.finalGenerationId);
        if (genFinal) {
          if (genFinal.status === 'completed' && genFinal.outputs[0]?.url) {
            updateSceneById(scene.id, {
              finalVideoUrl: genFinal.outputs[0].url,
              status: 'ready',
              statusMessage:
                scene.mode === 'lip_sync'
                  ? 'Lip-sync performance clip ready'
                  : 'B-roll scene clip ready',
            });
            showToast(`${scene.title}: Final video clip ready.`);
          } else if (
            genFinal.status === 'failed' ||
            genFinal.status === 'nsfw' ||
            genFinal.status === 'canceled'
          ) {
            updateSceneById(scene.id, {
              status: 'failed',
              statusMessage: genFinal.error || 'Video generation failed.',
            });
          }
        }
      }
    }
  }, [generations, mvData.scenes, updateSceneById, dispatchTwoStageLipSync, showToast]);

  // Handlers
  const handleImportAudioComplete = (track: MusicVideoAudioTrack, buffer: AudioBuffer) => {
    setDecodedBuffer(buffer);
    setMvData((prev) => {
      // Clamp existing scene trims to new track duration smoothly
      const updatedScenes = prev.scenes.map((sc, idx) => {
        const defaultStart = Math.min(idx * 8, Math.max(0, track.durationSec - 2));
        const defaultEnd = Math.min(track.durationSec, defaultStart + 8);
        const validExisting =
          sc.audioEndSec <= track.durationSec && sc.audioEndSec - sc.audioStartSec >= 0.5;
        return {
          ...sc,
          audioStartSec: validExisting ? sc.audioStartSec : Number(defaultStart.toFixed(2)),
          audioEndSec: validExisting ? sc.audioEndSec : Number(defaultEnd.toFixed(2)),
          trimmedAudioUrl: undefined,
        };
      });
      return {
        ...prev,
        audioTrack: track,
        scenes: updatedScenes,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleTrimChange = (startSec: number, endSec: number) => {
    if (!activeScene) return;
    updateSceneById(activeScene.id, {
      audioStartSec: Number(startSec.toFixed(2)),
      audioEndSec: Number(endSec.toFixed(2)),
      trimmedAudioUrl: undefined,
    });
  };

  const handleTogglePerformer = (charId: string) => {
    if (!activeScene) return;
    const exists = activeScene.characterIds.includes(charId);
    const nextIds = exists
      ? activeScene.characterIds.filter((id) => id !== charId)
      : [...activeScene.characterIds, charId];
    updateSceneById(activeScene.id, { characterIds: nextIds });
  };

  const handleSelectWardrobe = (wardrobeId: string | null) => {
    if (!activeScene) return;
    updateSceneById(activeScene.id, { wardrobeId });
  };

  const handleGenerateSceneImage = async (scene: MusicVideoScene) => {
    const imgModelId = scene.sceneImageModelId || defaultImageModelId;
    const rawPrompt = [
      scene.scenePrompt.trim(),
      scene.environmentNotes.trim() ? `Environment: ${scene.environmentNotes.trim()}` : '',
      `Framing: ${scene.cameraFraming}`,
      `Lighting: ${scene.lightingStyle}`,
      `Visual Style: ${scene.visualStyle}`,
      'Music video cinematic production still, consistent performer facial identity and wardrobe',
    ]
      .filter(Boolean)
      .join('. ');

    const composed = composeContinuityPrompt(
      rawPrompt,
      {
        characterIds: scene.characterIds,
        wardrobeId: scene.wardrobeId || null,
      },
      []
    );

    const imgSettings = buildModelSettingsPayload(imgModelId, scene);

    updateSceneById(scene.id, {
      status: 'generating_image',
      statusMessage: `Rendering scene reference with ${
        models.find((m) => m.id === imgModelId)?.label || imgModelId
      }...`,
    });

    const res = await submitGeneration({
      surface: 'image',
      modelId: imgModelId,
      mode: composed.media.length > 0 ? 'image-to-image' : 'text-to-image',
      prompt: composed.prompt,
      settings: imgSettings,
      media: composed.media,
    });

    if (!res.ok || !res.generation) {
      updateSceneById(scene.id, {
        status: 'failed',
        statusMessage: res.error || 'Unable to generate scene reference frame.',
      });
      showToast(res.error || 'Scene reference generation failed.');
      return;
    }

    updateSceneById(scene.id, {
      sceneImageGenerationId: res.generation.id,
      status: 'generating_image',
      statusMessage: 'Generating scene frame...',
    });
  };

  const handleUploadSceneImage = async (file: File) => {
    if (!activeScene) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const uploaded = await uploadReferenceFile({
        label: file.name,
        contentType: file.type || 'image/png',
        bytes: file.size,
        dataUrl,
      });
      updateSceneById(activeScene.id, {
        sceneSourceMode: 'upload',
        sceneImageUrl: uploaded?.publicUrl || dataUrl,
        status: activeScene.finalVideoUrl ? 'ready' : 'draft',
        statusMessage: `Uploaded reference frame: ${file.name}`,
      });
      showToast(`Scene reference "${file.name}" attached.`);
    } catch {
      showToast('Failed to upload scene reference image.');
    }
  };

  const handleGenerateSceneVideo = async (scene: MusicVideoScene) => {
    // MODE A: LIP SYNC PERFORMANCE
    if (scene.mode === 'lip_sync') {
      if (!mvData.audioTrack) {
        showToast('Import a music track first to generate a lip-sync performance.');
        return;
      }
      if (!scene.sceneImageUrl) {
        showToast('Generate or upload a scene reference frame before running lip sync.');
        return;
      }

      updateSceneById(scene.id, {
        status: 'animating',
        statusMessage: 'Preparing non-destructive trimmed audio segment...',
      });

      const trimmedAudioUrl = await prepareTrimmedAudioUrl(scene);
      if (!trimmedAudioUrl) {
        updateSceneById(scene.id, {
          status: 'failed',
          statusMessage: 'Could not prepare selected audio segment.',
        });
        return;
      }

      const directionPrompt = [
        scene.scenePrompt.trim(),
        `Performance direction: ${scene.performanceDirection}`,
        `Facial expression: ${scene.facialExpression}`,
        `Gestures & movement: ${scene.bodyMovement}`,
        `Camera: ${scene.cameraFraming}, ${scene.cameraMovement}`,
        `Lighting: ${scene.lightingStyle}`,
      ]
        .filter(Boolean)
        .join('. ');

      const composed = composeContinuityPrompt(
        directionPrompt,
        {
          characterIds: scene.characterIds,
          wardrobeId: scene.wardrobeId || null,
        },
        []
      );

      if (scene.lipSyncPipelineType === 'native') {
        const nativeModelId = scene.animationModelId || 'omnihuman-1-5-lipsync';
        const nativeSettings = buildModelSettingsPayload(nativeModelId, scene);
        const media: MediaSlotInput[] = [
          { role: 'start', kind: 'image', url: scene.sceneImageUrl },
          { role: 'audio', kind: 'audio', url: trimmedAudioUrl },
        ];

        const res = await submitGeneration({
          surface: 'video',
          modelId: nativeModelId,
          mode: 'audio-to-video',
          prompt: composed.prompt,
          settings: nativeSettings,
          media,
        });

        if (!res.ok || !res.generation) {
          updateSceneById(scene.id, {
            status: 'failed',
            statusMessage: res.error || 'Lip-sync performance submission failed.',
          });
          showToast(res.error || 'Lip-sync generation failed.');
          return;
        }

        updateSceneById(scene.id, {
          trimmedAudioUrl,
          finalGenerationId: res.generation.id,
          status: 'animating',
          statusMessage: `Rendering native audio-driven lip sync via ${
            models.find((m) => m.id === nativeModelId)?.label || nativeModelId
          }...`,
        });
        return;
      }

      // Two-Stage Pipeline: Stage 1 Video Animation -> Auto Stage 2 Dedicated Lip-Sync Pass
      const stage1ModelId = scene.animationModelId || 'seedance-2-5';
      const stage1Settings = buildModelSettingsPayload(stage1ModelId, scene);
      const stage1Media: MediaSlotInput[] = [
        { role: 'start', kind: 'image', url: scene.sceneImageUrl },
        ...composed.media.filter((m) => m.role !== 'start').slice(0, 3),
      ];

      const res1 = await submitGeneration({
        surface: 'video',
        modelId: stage1ModelId,
        mode: 'image-to-video',
        prompt: composed.prompt,
        settings: stage1Settings,
        media: stage1Media,
      });

      if (!res1.ok || !res1.generation) {
        updateSceneById(scene.id, {
          status: 'failed',
          statusMessage: res1.error || 'Stage 1 scene animation failed.',
        });
        showToast(res1.error || 'Stage 1 animation failed.');
        return;
      }

      updateSceneById(scene.id, {
        trimmedAudioUrl,
        stage1GenerationId: res1.generation.id,
        finalGenerationId: undefined,
        status: 'animating',
        statusMessage: `Stage 1: Animating scene via ${
          models.find((m) => m.id === stage1ModelId)?.label || stage1ModelId
        } (Stage 2 lip sync will run automatically)...`,
      });
      return;
    }

    // MODE B: B-ROLL GENERATION (No lip-sync model required)
    const bRollModelId = scene.animationModelId || 'seedance-2-5';
    const bRollSettings = buildModelSettingsPayload(bRollModelId, scene);

    const bRollPrompt = [
      scene.bRollCategory,
      scene.scenePrompt.trim(),
      scene.performanceDirection.trim() ? `Motion: ${scene.performanceDirection.trim()}` : '',
      scene.environmentNotes.trim() ? `Environment: ${scene.environmentNotes.trim()}` : '',
      `Camera: ${scene.cameraFraming}, ${scene.cameraMovement}`,
      `Lighting: ${scene.lightingStyle}`,
      `Style: ${scene.visualStyle}`,
    ]
      .filter(Boolean)
      .join('. ');

    const composedBRoll = composeContinuityPrompt(
      bRollPrompt,
      {
        characterIds: scene.characterIds,
        wardrobeId: scene.wardrobeId || null,
      },
      []
    );

    const bRollMedia: MediaSlotInput[] = [];
    if (scene.sceneImageUrl) {
      bRollMedia.push({ role: 'start', kind: 'image', url: scene.sceneImageUrl });
    }
    for (const ref of composedBRoll.media) {
      if (ref.role !== 'start' && bRollMedia.length < 4) {
        bRollMedia.push(ref);
      }
    }

    updateSceneById(scene.id, {
      status: 'animating',
      statusMessage: `Rendering B-Roll via ${
        models.find((m) => m.id === bRollModelId)?.label || bRollModelId
      }...`,
    });

    const resBRoll = await submitGeneration({
      surface: 'video',
      modelId: bRollModelId,
      mode: scene.sceneImageUrl ? 'image-to-video' : 'text-to-video',
      prompt: composedBRoll.prompt,
      settings: bRollSettings,
      media: bRollMedia,
    });

    if (!resBRoll.ok || !resBRoll.generation) {
      updateSceneById(scene.id, {
        status: 'failed',
        statusMessage: resBRoll.error || 'B-roll generation failed.',
      });
      showToast(resBRoll.error || 'B-roll generation failed.');
      return;
    }

    updateSceneById(scene.id, {
      finalGenerationId: resBRoll.generation.id,
      status: 'animating',
      statusMessage: 'Rendering B-roll scene...',
    });
  };

  // Sequence management handlers
  const handleAddScene = (mode: MusicVideoGenerationMode) => {
    const ordered = [...mvData.scenes].sort((a, b) => a.order - b.order);
    const lastScene = ordered[ordered.length - 1];
    const trackDuration = mvData.audioTrack?.durationSec || 60;
    const nextStart = lastScene
      ? Math.min(lastScene.audioEndSec, Math.max(0, trackDuration - 2))
      : 0;
    const nextEnd = Math.min(trackDuration, nextStart + 6);

    const defaults = getDefaultModelForMusicVideoMode(mode, 'native', models);
    const animModel = models.find((m) => m.id === defaults.animationModelId);
    const controls = getDynamicControlsForModel(animModel);
    const aspect = controls.aspectRatios.some((r) => r.value === mvData.defaultAspectRatio)
      ? mvData.defaultAspectRatio
      : controls.aspectRatios[0]?.value || '16:9';

    const newScene = createSceneTemplate(
      ordered.length,
      mode,
      nextStart,
      Math.max(nextStart + 1, nextEnd),
      activeScene?.characterIds || [],
      activeScene?.wardrobeId || null,
      aspect,
      defaultImageModelId,
      defaults.animationModelId,
      defaults.lipSyncModelId
    );

    setMvData((prev) => ({
      ...prev,
      activeSceneId: newScene.id,
      scenes: [...prev.scenes, newScene],
      updatedAt: new Date().toISOString(),
    }));
    setActiveTab('director');
    showToast(`Added ${mode === 'lip_sync' ? 'Lip-Sync' : 'B-Roll'} scene to sequence.`);
  };

  const handleDuplicateScene = (sceneId: string) => {
    const target = mvData.scenes.find((s) => s.id === sceneId);
    if (!target) return;
    const copy: MusicVideoScene = {
      ...target,
      id: `mv_scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      order: mvData.scenes.length,
      title: `${target.title} (Copy)`,
      stage1VideoUrl: undefined,
      stage1GenerationId: undefined,
      finalVideoUrl: undefined,
      finalGenerationId: undefined,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
    setMvData((prev) => ({
      ...prev,
      activeSceneId: copy.id,
      scenes: [...prev.scenes, copy],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDeleteScene = (sceneId: string) => {
    setMvData((prev) => {
      if (prev.scenes.length <= 1) return prev;
      const remaining = prev.scenes
        .filter((s) => s.id !== sceneId)
        .sort((a, b) => a.order - b.order)
        .map((s, idx) => ({ ...s, order: idx }));
      return {
        ...prev,
        activeSceneId:
          prev.activeSceneId === sceneId ? remaining[0]?.id || null : prev.activeSceneId,
        scenes: remaining,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleMoveScene = (sceneId: string, direction: 'up' | 'down') => {
    setMvData((prev) => {
      const ordered = [...prev.scenes].sort((a, b) => a.order - b.order);
      const idx = ordered.findIndex((s) => s.id === sceneId);
      if (idx === -1) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= ordered.length) return prev;
      const temp = ordered[idx];
      ordered[idx] = ordered[swapIdx];
      ordered[swapIdx] = temp;
      const reindexed = ordered.map((s, i) => ({ ...s, order: i }));
      return {
        ...prev,
        scenes: reindexed,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Save full Music Video project into shared Cinema Studio Vault
  const handleSaveToCinemaVault = async () => {
    setIsSavingProject(true);
    try {
      const allCharIds = Array.from(
        new Set(mvData.scenes.flatMap((s) => s.characterIds))
      );
      const allWardrobeIds = Array.from(
        new Set(
          mvData.scenes
            .map((s) => s.wardrobeId)
            .filter((id): id is string => Boolean(id))
        )
      );

      // Avoid sending huge raw base64 audio payloads in project metadata if an uploaded URL exists
      const safeMusicVideo: MusicVideoProjectData = {
        ...mvData,
        audioTrack: mvData.audioTrack
          ? {
              ...mvData.audioTrack,
              sourceUrl:
                mvData.audioTrack.sourceUrl.startsWith('data:') &&
                mvData.audioTrack.originalUrl.startsWith('/api/')
                  ? mvData.audioTrack.originalUrl
                  : mvData.audioTrack.sourceUrl.startsWith('data:')
                  ? ''
                  : mvData.audioTrack.sourceUrl,
            }
          : null,
      };

      const saved = await saveCinemaProject({
        id: projectId || undefined,
        title: projectTitle.trim() || 'Untitled Music Video',
        productionType: 'Music Videos',
        aspectRatio: mvData.defaultAspectRatio,
        castCharacterIds: allCharIds,
        wardrobeIds: allWardrobeIds,
        musicTrackUrl: mvData.audioTrack?.originalUrl,
        musicVideo: safeMusicVideo,
      });

      if (saved) {
        showToast(`Saved "${saved.title}" to Cinema Studio Projects.`);
      } else {
        showToast('Saved locally in Music Video workspace (sign in to sync to Cinema Vault).');
      }
    } finally {
      setIsSavingProject(false);
    }
  };

  const orderedScenes = useMemo(
    () => [...mvData.scenes].sort((a, b) => a.order - b.order),
    [mvData.scenes]
  );

  return (
    <div className="space-y-5 pb-12">
      {/* Top Studio Header Bar */}
      <div className="rounded-2xl bg-[#101218] border border-white/[0.08] px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBackToStudio}
            className="h-8 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white text-xs inline-flex items-center gap-1.5 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cinema Studio</span>
          </button>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-[#46ecd5] shrink-0" />
              <span className="font-display text-lg sm:text-xl uppercase tracking-wide text-white truncate">
                Music Video Production
              </span>
            </div>
          </div>

          <Input
            value={projectTitle}
            onChange={(e) => onProjectTitleChange(e.target.value)}
            placeholder="Music Video Title"
            className="hidden md:block max-w-[230px] h-8 text-xs bg-[#0A0C10]"
          />
        </div>

        {/* Workspace Stage Tabs */}
        <div className="flex items-center gap-1 bg-[#09090B] p-1 rounded-xl border border-white/[0.07]">
          <button
            type="button"
            onClick={() => setActiveTab('cast')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
              activeTab === 'cast'
                ? 'bg-[#46ecd5]/15 text-[#46ecd5]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1. Performers & Looks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('director')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
              activeTab === 'director'
                ? 'bg-[#46ecd5]/15 text-[#46ecd5]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span>2. Scene Director</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sequence')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
              activeTab === 'sequence'
                ? 'bg-[#46ecd5]/15 text-[#46ecd5]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. Sequence & Assemble ({orderedScenes.length})</span>
          </button>
        </div>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isSavingProject}
          onClick={handleSaveToCinemaVault}
          className="shrink-0"
        >
          <Save className="w-3.5 h-3.5 text-[#46ecd5]" />
          <span>{isSavingProject ? 'Saving...' : 'Save Project'}</span>
        </Button>
      </div>

      {/* Persistent Interactive Audio Timeline & Non-Destructive Trimmer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="font-mono-tabular uppercase tracking-wider text-[#46ecd5]">
              Master Audio Track & Segment Trimmer
            </span>
            {mvData.audioTrack && activeScene && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-300">
                  Trimming applies to <strong className="text-white">{activeScene.title}</strong> ({formatTimecode(activeScene.audioStartSec)} – {formatTimecode(activeScene.audioEndSec)})
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setTimelineExpanded((v) => !v)}
            className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1 transition-colors"
          >
            <span>{timelineExpanded ? 'Collapse Waveform' : 'Expand Waveform'}</span>
            {timelineExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {timelineExpanded && (
          <AudioWaveformTimeline
            audioTrack={mvData.audioTrack}
            decodedBuffer={decodedBuffer}
            trimStartSec={activeScene?.audioStartSec ?? 0}
            trimEndSec={activeScene?.audioEndSec ?? 8}
            scenes={orderedScenes}
            activeSceneId={activeScene?.id || null}
            sessionToken={sessionToken}
            onImportAudioComplete={handleImportAudioComplete}
            onTrimChange={handleTrimChange}
            onSelectScene={(id) => {
              setMvData((prev) => ({ ...prev, activeSceneId: id }));
              setActiveTab('director');
            }}
            onNotify={showToast}
          />
        )}
      </div>

      {/* Quick Scene Strip (visible in Director tab so users can jump between scenes effortlessly) */}
      {activeTab === 'director' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {orderedScenes.map((sc, idx) => {
            const isCurrent = sc.id === activeScene?.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => setMvData((prev) => ({ ...prev, activeSceneId: sc.id }))}
                className={`px-3 py-2 rounded-xl border text-left shrink-0 transition-colors flex items-center gap-2.5 ${
                  isCurrent
                    ? 'bg-[#151923] border-[#46ecd5]/55 text-white'
                    : 'bg-[#101218] border-white/[0.07] text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                }`}
              >
                {sc.mode === 'lip_sync' ? (
                  <Mic
                    className={`w-3.5 h-3.5 ${isCurrent ? 'text-[#46ecd5]' : 'text-zinc-500'}`}
                  />
                ) : (
                  <Film
                    className={`w-3.5 h-3.5 ${isCurrent ? 'text-amber-300' : 'text-zinc-500'}`}
                  />
                )}
                <div className="leading-tight">
                  <div className="text-xs font-medium max-w-[160px] truncate">
                    {String(idx + 1).padStart(2, '0')} · {sc.title}
                  </div>
                  <div className="text-[10px] font-mono-tabular text-zinc-500">
                    {formatTimecode(sc.audioStartSec)}–{formatTimecode(sc.audioEndSec)}
                    {sc.finalVideoUrl ? ' · Ready' : sc.sceneImageUrl ? ' · Frame' : ''}
                  </div>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => handleAddScene('lip_sync')}
            className="px-3 py-2 rounded-xl border border-dashed border-white/15 hover:border-[#46ecd5]/50 bg-[#0D0F15] text-xs text-zinc-300 hover:text-[#46ecd5] inline-flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lip-Sync Scene</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddScene('b_roll')}
            className="px-3 py-2 rounded-xl border border-dashed border-white/15 hover:border-amber-300/50 bg-[#0D0F15] text-xs text-zinc-300 hover:text-amber-300 inline-flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>B-Roll Scene</span>
          </button>
        </div>
      )}

      {/* Active Workspace Stage Content */}
      {activeTab === 'cast' && activeScene && (
        <PerformerCastPanel
          selectedCharacterIds={activeScene.characterIds}
          selectedWardrobeId={activeScene.wardrobeId || null}
          onToggleCharacter={handleTogglePerformer}
          onSelectWardrobe={handleSelectWardrobe}
        />
      )}

      {activeTab === 'director' && activeScene && (
        <SceneDirectorWorkspace
          scene={activeScene}
          audioTrack={mvData.audioTrack}
          models={models}
          characters={characters}
          wardrobes={wardrobes}
          calculateTokenCost={calculateTokenCost}
          onUpdateScene={(patch) => updateSceneById(activeScene.id, patch)}
          onGenerateSceneImage={handleGenerateSceneImage}
          onUploadSceneImage={handleUploadSceneImage}
          onGenerateSceneVideo={handleGenerateSceneVideo}
          onOpenCastTab={() => setActiveTab('cast')}
        />
      )}

      {activeTab === 'sequence' && (
        <MusicVideoSequencer
          scenes={orderedScenes}
          activeSceneId={activeScene?.id || null}
          audioTrack={mvData.audioTrack}
          decodedBuffer={decodedBuffer}
          characters={characters}
          models={models}
          projectTitle={projectTitle}
          onSelectScene={(sceneId, jumpToDirector) => {
            setMvData((prev) => ({ ...prev, activeSceneId: sceneId }));
            if (jumpToDirector) setActiveTab('director');
          }}
          onAddScene={handleAddScene}
          onDuplicateScene={handleDuplicateScene}
          onDeleteScene={handleDeleteScene}
          onMoveScene={handleMoveScene}
          onRegenerateScene={handleGenerateSceneVideo}
          onNotify={showToast}
        />
      )}
    </div>
  );
};
