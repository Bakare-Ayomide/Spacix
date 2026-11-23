import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Clock,
  Compass,
  Download,
  Edit3,
  Eye,
  FileJson,
  FileText,
  Film,
  FolderOpen,
  Gamepad2,
  History,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  Maximize2,
  MoreVertical,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Scissors,
  Sliders,
  Sparkles,
  Shirt,
  Trash2,
  Upload,
  UserCheck,
  Video,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import { useRuns } from '../lib/useRuns';
import {
  autoBreakdownScenesToFrames,
  CameraSetupTaxonomyId,
  CINEMATOGRAPHY_TAXONOMY,
  createDefaultStoryStudioProject,
  deleteProjectFromVault,
  ensureStableSceneIds,
  exportPortableProjectArchive,
  extractEntitiesFromScript,
  GLOBAL_VISUAL_STYLES,
  listProjectsFromVault,
  listSnapshotsFromVault,
  parsePortableProjectArchive,
  parseScreenplayScenes,
  readSyncMirror,
  saveProjectToVault,
  StorageVaultSnapshot,
  StoryAssetCategory,
  StoryboardAngleCoverage,
  StoryStudioAsset,
  StoryStudioFrame,
  StoryStudioProject,
  StoryStudioStage,
  VideoTimelineClip,
  writeSyncMirror,
} from '../lib/storageVault';
import { GearVisual } from './GearVisual';
import {
  getCameraAngleVisual,
  getColorGradeVisual,
  getLensOpticVisual,
} from '../catalog/cinemaGearVisuals';
import { UniversalCreativeControlsBar } from './UniversalCreativeControlsBar';
import { translateCreativeControlsForModel } from '../lib/creativeControlsTranslator';
import { buildCssFilterFromGrading } from '../lib/colorPostProcess';
import {
  buildCharacterTurnaroundPrompt,
  CHARACTER_TURNAROUND_ASPECT_RATIO,
} from '../lib/characterTurnaround';
import {
  MultiTrackTimelineEditor,
  TimelineClipItem,
  TimelineTrackConfig,
} from './MultiTrackTimelineEditor';

interface RollingQueueTask {
  id: string;
  label: string;
  kind: 'asset_image' | 'asset_turnaround' | 'frame_image' | 'frame_video';
  targetId: string;
  angleId?: string;
  isCharacter?: boolean;
  prompt: string;
  surface: 'image' | 'video';
  status: 'queued' | 'running' | 'completed' | 'failed';
}

export const StoryStudioView: React.FC<{
  onSwitchToLegacyCinema?: () => void;
}> = ({ onSwitchToLegacyCinema }) => {
  const {
    generations,
    uploads,
    characters,
    wardrobes,
    propsList,
    locations,
    saveCharacter,
    saveWardrobe,
    saveProp,
    saveLocation,
    saveCinemaProject,
    submitGeneration,
    pollGenerationUntilDone,
    setLightboxItem,
    setDockDraft,
    models,
    creativeControls,
    showToast,
  } = useRuns();

  // ==========================================================================
  // 1. UNIFIED REACTIVE PROJECT STATE + SYNCHRONOUS LOCAL MIRROR REHYDRATION
  // ==========================================================================
  const [project, setProject] = useState<StoryStudioProject>(() => {
    const mirrored = readSyncMirror();
    if (mirrored) return mirrored;
    return createDefaultStoryStudioProject();
  });

  const [activeStage, setActiveStage] = useState<StoryStudioStage>('script');
  const [vaultProjects, setVaultProjects] = useState<StoryStudioProject[]>([]);
  const [snapshots, setSnapshots] = useState<StorageVaultSnapshot[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string>(project.updatedAt);

  // Modals & Drawers
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [projectLibraryOpen, setProjectLibraryOpen] = useState(false);
  const [taxonomyDrawerOpen, setTaxonomyDrawerOpen] = useState(false);

  // Stage 1: Script Workshop state
  const [scriptViewMode, setScriptViewMode] = useState<'split' | 'formatted' | 'markdown'>('split');
  const [activeSceneId, setActiveSceneId] = useState<string>('');
  const [coWriterMode, setCoWriterMode] = useState<
    'continue' | 'scratch' | 'outline' | 'rewrite_dialogue'
  >('continue');
  const [coWriterPrompt, setCoWriterPrompt] = useState('');
  const [coWriterBusy, setCoWriterBusy] = useState(false);
  const scriptTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Stage 2: Assets & B-Roll state
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<'All' | StoryAssetCategory>('All');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [newAssetModalOpen, setNewAssetModalOpen] = useState(false);
  const [newAssetDraft, setNewAssetDraft] = useState<{
    name: string;
    category: StoryAssetCategory;
    description: string;
    visualPrompt: string;
  }>({
    name: '',
    category: 'Character',
    description: '',
    visualPrompt: '',
  });

  // Stage 3: Storyboard & Animation state
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(
    project.frames[0]?.id || null
  );
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
  const [animateModalFrame, setAnimateModalFrame] = useState<{
    frameId: string;
    angleId: string;
  } | null>(null);
  const [joystickVisible, setJoystickVisible] = useState(true);
  const [joystickOffset, setJoystickOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const frameRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Stage 4: Multi-Track Video Timeline Editor state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isExportingMaster, setIsExportingMaster] = useState(false);
  const compositorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Global Rolling Queue (Concurrency = 2)
  const [rollingQueue, setRollingQueue] = useState<RollingQueueTask[]>([]);
  const queueProcessingRef = useRef(false);

  // ==========================================================================
  // 2. DURABLE STORAGE VAULT LIFECYCLE (SYNC MIRROR + INDEXEDDB + BEFOREUNLOAD)
  // ==========================================================================

  // Synchronous mirror write on every project state change
  useEffect(() => {
    writeSyncMirror(project);
    setLastSavedAt(new Date().toISOString());
    const t = setTimeout(() => {
      void saveProjectToVault(project);
    }, 350);
    return () => clearTimeout(t);
  }, [project]);

  // Flush to localStorage on beforeunload / pagehide
  useEffect(() => {
    const handleUnload = () => {
      writeSyncMirror(project);
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [project]);

  // Initial load of project list & snapshots from IndexedDB
  const refreshVaultLists = useCallback(async () => {
    const projs = await listProjectsFromVault();
    setVaultProjects(projs);
    const snaps = await listSnapshotsFromVault(project.id);
    setSnapshots(snaps);
  }, [project.id]);

  useEffect(() => {
    void refreshVaultLists();
  }, [refreshVaultLists]);

  // Create initial snapshot if none exist
  useEffect(() => {
    let mounted = true;
    listSnapshotsFromVault(project.id).then((list) => {
      if (mounted && list.length === 0) {
        void saveProjectToVault(project, 'Initial Story Studio Checkpoint').then(() =>
          refreshVaultLists()
        );
      }
    });
    return () => {
      mounted = false;
    };
  }, [project.id]);

  // ==========================================================================
  // 3. PARSED SCENES & AUTOMATIC ENTITY DISCOVERY
  // ==========================================================================
  const parsedScenes = useMemo(
    () => parseScreenplayScenes(project.fullMarkdown),
    [project.fullMarkdown]
  );

  useEffect(() => {
    if (!activeSceneId && parsedScenes[0]) {
      setActiveSceneId(parsedScenes[0].sceneId);
    }
  }, [parsedScenes, activeSceneId]);

  const handleMarkdownChange = (rawText: string) => {
    const { markdown } = ensureStableSceneIds(rawText);
    setProject((prev) => {
      const updatedAssets = extractEntitiesFromScript(
        markdown,
        prev.assets,
        prev.globalStyle
      );
      return {
        ...prev,
        fullMarkdown: markdown,
        assets: updatedAssets,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const createCheckpointSnapshot = async (reason: string) => {
    await saveProjectToVault(project, reason);
    await refreshVaultLists();
    showToast(`Saved Vault Snapshot: ${reason}`);
  };

  // Sync Story Studio project & discovered assets with the global SPACI6X Continuity Database
  const syncWithContinuityDatabase = async () => {
    for (const ast of project.assets) {
      if (ast.category === 'Character') {
        await saveCharacter({
          name: ast.name,
          faceReferenceUrl: ast.generatedImageUrl || ast.referenceImageUrl || '',
          facialIdentityLock: true,
          distinctiveFeatures:
            ast.attributes.physicalFeatures || ast.description,
          continuityNotes: ast.attributes.backstory || ast.description,
          consistencyLock: true,
        });
      } else if (ast.category === 'Location') {
        await saveLocation({
          name: ast.name,
          category: 'Cities',
          settingType: 'EXT.',
          timeOfDay: (ast.attributes.timeOfDay as 'Day' | 'Night') || 'Night',
          weather: 'Clear',
          description: ast.description,
          lightingAndMood: project.globalStyle,
          primaryImageUrl: ast.generatedImageUrl || ast.referenceImageUrl || '',
          continuityLock: true,
        });
      } else if (ast.category === 'Wardrobe') {
        await saveWardrobe({
          name: ast.name,
          category: 'Traditional',
          description: ast.description,
          referenceImageUrl: ast.generatedImageUrl || ast.referenceImageUrl || '',
          sceneContinuityLock: true,
        });
      } else if (ast.category === 'Prop') {
        await saveProp({
          name: ast.name,
          category: 'Hero Artifacts',
          description: ast.description,
          materialAndFinish: ast.attributes.materialFinish || 'Studio Hero Finish',
          referenceImageUrl: ast.generatedImageUrl || ast.referenceImageUrl || '',
          appearanceLock: true,
        });
      }
    }

    await saveCinemaProject({
      id: project.id,
      title: project.title,
      productionType: project.productionType,
      logline: project.logline,
      screenplayRaw: project.fullMarkdown,
    });

    await createCheckpointSnapshot('Synced with Global Continuity MySQL Vault');
  };

  // ==========================================================================
  // 4. GLOBAL ROLLING QUEUE ENGINE (CONCURRENCY = 2)
  // ==========================================================================
  const enqueueGenerationTasks = (tasks: Omit<RollingQueueTask, 'status'>[]) => {
    setRollingQueue((prev) => [
      ...prev,
      ...tasks.map((t) => ({ ...t, status: 'queued' as const })),
    ]);
  };

  useEffect(() => {
    const runningCount = rollingQueue.filter((t) => t.status === 'running').length;
    const nextQueued = rollingQueue
      .filter((t) => t.status === 'queued')
      .slice(0, Math.max(0, 2 - runningCount));

    if (nextQueued.length === 0 || queueProcessingRef.current) return;
    queueProcessingRef.current = true;

    const launchTask = async (task: RollingQueueTask) => {
      setRollingQueue((prev) =>
        prev.map((q) => (q.id === task.id ? { ...q, status: 'running' } : q))
      );

      try {
        const targetModelId =
          task.surface === 'video'
            ? project.defaultVideoModel || 'seedance-2-5'
            : project.defaultImageModel || 'nano-banana-2-1';
        const targetModel = models.find((m) => m.id === targetModelId);
        const requestedAr = task.isCharacter
          ? CHARACTER_TURNAROUND_ASPECT_RATIO
          : project.aspectRatio === '2.39:1'
          ? '21:9'
          : project.aspectRatio || '16:9';
        const baseSettings: Record<string, string | number | boolean> =
          task.surface === 'video'
            ? { aspect_ratio: requestedAr, duration: 5, resolution: '1080p' }
            : { aspect_ratio: requestedAr, quality: '2K' };
        const translated = translateCreativeControlsForModel(
          creativeControls,
          targetModel,
          task.surface
        );
        const finalPrompt = translated.promptDirective
          ? `${task.prompt}\n\n[CREATIVE DIRECTION: ${translated.promptDirective}]`
          : task.prompt;
        const finalSettings: Record<string, string | number | boolean> = {
          ...baseSettings,
          ...translated.nativeSettingsPatch,
          ...(task.isCharacter ? { aspect_ratio: CHARACTER_TURNAROUND_ASPECT_RATIO } : {}),
        };

        // Dispatch through authenticated SPACIX Generation API & poll until ready
        const res = await submitGeneration({
          modelId: targetModelId,
          surface: task.surface,
          mode: task.surface === 'video' ? 'Text to Video' : 'Text to Image',
          prompt: finalPrompt,
          settings: finalSettings,
          media: [],
          skipContinuityMerge: true,
        });
        if (!res.ok || !res.generation) {
          throw new Error(res.error || 'Failed to enqueue generation');
        }
        const done =
          res.generation.status === 'completed'
            ? res.generation
            : await pollGenerationUntilDone(res.generation.id);
        const outUrl = done?.outputs?.[0]?.url || '';

        if (outUrl) {
          setProject((prev) => {
            if (task.kind === 'asset_image' || task.kind === 'asset_turnaround') {
              return {
                ...prev,
                assets: prev.assets.map((a) =>
                  a.id === task.targetId
                    ? {
                        ...a,
                        generatedImageUrl: outUrl,
                        turnaroundUrls:
                          task.kind === 'asset_turnaround'
                            ? [...a.turnaroundUrls, outUrl].slice(-4)
                            : a.turnaroundUrls,
                        status: 'ready',
                        updatedAt: new Date().toISOString(),
                      }
                    : a
                ),
              };
            }

            if (task.kind === 'frame_image' || task.kind === 'frame_video') {
              return {
                ...prev,
                frames: prev.frames.map((f) => {
                  if (f.id !== task.targetId) return f;
                  const targetAngId = task.angleId || f.activeAngleId;
                  return {
                    ...f,
                    angles: f.angles.map((ang) =>
                      ang.id === targetAngId
                        ? {
                            ...ang,
                            imageUrl:
                              task.kind === 'frame_image' ? outUrl : ang.imageUrl,
                            videoUrl:
                              task.kind === 'frame_video' ? outUrl : ang.videoUrl,
                            status: 'ready',
                          }
                        : ang
                    ),
                  };
                }),
              };
            }
            return prev;
          });
        }

        setRollingQueue((prev) =>
          prev.map((q) => (q.id === task.id ? { ...q, status: 'completed' } : q))
        );
      } catch {
        setRollingQueue((prev) =>
          prev.map((q) => (q.id === task.id ? { ...q, status: 'failed' } : q))
        );
      }
    };

    Promise.all(nextQueued.map((t) => launchTask(t))).finally(() => {
      queueProcessingRef.current = false;
    });
  }, [rollingQueue, project.defaultImageModel, project.defaultVideoModel, generations, models, creativeControls]);

  const activeQueueCount = rollingQueue.filter(
    (t) => t.status === 'running' || t.status === 'queued'
  ).length;

  // ==========================================================================
  // 5. STAGE 1 HANDLERS: SCRIPT WORKSHOP & AI CO-WRITER
  // ==========================================================================
  const insertScreenplaySnippet = (snippet: string) => {
    const el = scriptTextareaRef.current;
    if (!el) {
      handleMarkdownChange(`${project.fullMarkdown.trimEnd()}\n\n${snippet}\n`);
      return;
    }
    const start = el.selectionStart ?? project.fullMarkdown.length;
    const end = el.selectionEnd ?? project.fullMarkdown.length;
    const before = project.fullMarkdown.slice(0, start);
    const after = project.fullMarkdown.slice(end);
    const nextText = `${before}${before.endsWith('\n') ? '' : '\n'}${snippet}\n${after}`;
    handleMarkdownChange(nextText);
  };

  const handleRunAiCoWriter = async () => {
    if (coWriterBusy) return;
    setCoWriterBusy(true);
    try {
      const combinedLibrary = [
        ...project.assets.map((a) => ({
          category: a.category,
          name: a.name,
          description: a.description,
        })),
        ...characters.map((c) => ({
          category: 'Character',
          name: c.name,
          description: `${c.ageRange}, ${c.skinTone}, ${c.distinctiveFeatures}`,
        })),
        ...locations.map((l) => ({
          category: 'Location',
          name: l.name,
          description: `${l.settingType} ${l.name} (${l.timeOfDay})`,
        })),
        ...propsList.map((p) => ({
          category: 'Prop',
          name: p.name,
          description: p.description,
        })),
      ];

      const res = await fetch('/api/story-studio/ai-cowriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: coWriterMode,
          instruction: coWriterPrompt,
          currentMarkdown: project.fullMarkdown,
          title: project.title,
          globalStyle: project.globalStyle,
          libraryAssets: combinedLibrary,
        }),
      });
      const data = await res.json();
      if (data?.markdown) {
        const { markdown } = ensureStableSceneIds(String(data.markdown));
        const extracted = extractEntitiesFromScript(
          markdown,
          project.assets,
          project.globalStyle
        );
        const updatedFrames = autoBreakdownScenesToFrames(
          markdown,
          extracted,
          project.frames,
          project.globalStyle
        );
        const nextProj: StoryStudioProject = {
          ...project,
          fullMarkdown: markdown,
          assets: extracted,
          frames: updatedFrames,
          updatedAt: new Date().toISOString(),
        };
        setProject(nextProj);
        await saveProjectToVault(
          nextProj,
          `AI Co-Writer (${coWriterMode}): ${coWriterPrompt || 'Scene expansion'}`
        );
        await refreshVaultLists();
        setCoWriterPrompt('');
        showToast('AI Screenplay Co-Writer updated script & synced entities');
      }
    } catch {
      showToast('AI Co-Writer encountered a temporary error');
    } finally {
      setCoWriterBusy(false);
    }
  };

  // ==========================================================================
  // 6. STAGE 3 HANDLERS: STORYBOARD, MULTI-ANGLE & VIRTUAL JOYSTICK
  // ==========================================================================
  const handleAutoBreakdownStoryboard = async () => {
    const nextFrames = autoBreakdownScenesToFrames(
      project.fullMarkdown,
      project.assets,
      project.frames,
      project.globalStyle
    );
    const nextProj = {
      ...project,
      frames: nextFrames,
      updatedAt: new Date().toISOString(),
    };
    setProject(nextProj);
    if (nextFrames[0] && !selectedFrameId) {
      setSelectedFrameId(nextFrames[0].id);
    }
    await saveProjectToVault(nextProj, 'Auto-Breakdown Screenplay to Storyboard');
    await refreshVaultLists();
    showToast(`Generated ${nextFrames.length} multi-angle storyboard shots`);
  };

  const navigateStoryboardByDelta = (shotDelta: number, sceneDelta: number) => {
    if (project.frames.length === 0) return;
    const currentIndex = Math.max(
      0,
      project.frames.findIndex((f) => f.id === selectedFrameId)
    );
    let targetIndex = currentIndex;

    if (shotDelta !== 0) {
      targetIndex = Math.max(
        0,
        Math.min(project.frames.length - 1, currentIndex + shotDelta)
      );
    } else if (sceneDelta !== 0) {
      const currentSceneNum = project.frames[currentIndex]?.sceneNumber || 1;
      const targetSceneNum = currentSceneNum + sceneDelta;
      const matchIdx = project.frames.findIndex(
        (f) => f.sceneNumber === targetSceneNum
      );
      if (matchIdx >= 0) targetIndex = matchIdx;
    }

    const targetFrame = project.frames[targetIndex];
    if (targetFrame) {
      setSelectedFrameId(targetFrame.id);
      const domNode = frameRefs.current[targetFrame.id];
      if (domNode) {
        domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // ==========================================================================
  // 7. STAGE 4 HANDLERS: MULTI-TRACK VIDEO SEQUENCER & DOUBLE-BUFFERED CANVAS
  // ==========================================================================
  const handleAutoAssembleTimeline = async () => {
    const clips: VideoTimelineClip[] = [];
    let cursorSec = 0;

    // 1. Primary Video Track (V1) + Dialogue Track (A1) from Storyboard Frames
    project.frames.forEach((frame, idx) => {
      const activeAng =
        frame.angles.find((a) => a.id === frame.activeAngleId) || frame.angles[0];
      const fallbackImg =
        activeAng?.imageUrl ||
        project.assets.find((a) => frame.linkedAssetIds.includes(a.id))
          ?.generatedImageUrl ||
        generations.find((g) => g.surface === 'image')?.outputs?.[0]?.url ||
        '';
      const mediaUrl = activeAng?.videoUrl || fallbackImg;
      const dur = frame.durationSec || 5;

      clips.push({
        id: `clip-v1-${frame.id}`,
        track: 'V1',
        label: `Shot ${frame.shotNumber}: ${frame.shotTitle} (${
          activeAng?.angleLabel || frame.taxonomyId
        })`,
        sourceType: 'frame',
        sourceId: frame.id,
        mediaUrl,
        thumbnailUrl: fallbackImg,
        startTimeSec: cursorSec,
        durationSec: dur,
        trimInSec: 0,
        trimOutSec: dur,
        opacity: 1,
        volume: 1,
        muted: false,
        dialogueSubtitle: frame.dialogueText
          ? `${frame.dialogueSpeaker}: "${frame.dialogueText}"`
          : undefined,
      });

      if (frame.dialogueText) {
        clips.push({
          id: `clip-a1-${frame.id}`,
          track: 'A1',
          label: `${frame.dialogueSpeaker}: "${frame.dialogueText.slice(0, 28)}..."`,
          sourceType: 'frame',
          sourceId: frame.id,
          mediaUrl:
            generations.find((g) => g.surface === 'audio')?.outputs?.[0]?.url || '',
          thumbnailUrl: '',
          startTimeSec: cursorSec + 0.4,
          durationSec: Math.max(2, dur - 0.8),
          trimInSec: 0,
          trimOutSec: Math.max(2, dur - 0.8),
          opacity: 1,
          volume: 1,
          muted: false,
          dialogueSubtitle: `${frame.dialogueSpeaker}: "${frame.dialogueText}"`,
        });
      }

      // 2. Cutaway / Overlay Track (V2) from B-Roll assets or secondary camera angles
      const brollAsset = project.assets.find(
        (a) =>
          a.category === 'B-Roll' &&
          (a.sceneIds.includes(frame.sceneId) || idx % 2 === 1)
      );
      const secondaryAng = frame.angles[1];
      if (brollAsset || secondaryAng) {
        const v2Img =
          brollAsset?.generatedImageUrl ||
          secondaryAng?.imageUrl ||
          fallbackImg;
        clips.push({
          id: `clip-v2-${frame.id}`,
          track: 'V2',
          label: brollAsset
            ? `B-Roll Insert: ${brollAsset.name}`
            : `Angle Cutaway: ${secondaryAng?.angleLabel}`,
          sourceType: brollAsset ? 'asset' : 'frame',
          sourceId: brollAsset ? brollAsset.id : frame.id,
          mediaUrl: secondaryAng?.videoUrl || v2Img,
          thumbnailUrl: v2Img,
          startTimeSec: cursorSec + Math.round(dur * 0.45),
          durationSec: Math.max(2, Math.round(dur * 0.45)),
          trimInSec: 0,
          trimOutSec: Math.max(2, Math.round(dur * 0.45)),
          opacity: 0.92,
          volume: 0.5,
          muted: false,
        });
      }

      cursorSec += dur;
    });

    // 3. Score & Ambience Track (A2)
    if (cursorSec > 0) {
      clips.push({
        id: `clip-a2-score`,
        track: 'A2',
        label: `${project.title} — Master Atmospheric Score & Foley`,
        sourceType: 'audio',
        sourceId: 'score-main',
        mediaUrl:
          generations.find((g) => g.surface === 'audio')?.outputs?.[0]?.url || '',
        thumbnailUrl: '',
        startTimeSec: 0,
        durationSec: cursorSec,
        trimInSec: 0,
        trimOutSec: cursorSec,
        opacity: 1,
        volume: 0.65,
        muted: false,
      });
    }

    const nextProj = {
      ...project,
      timelineClips: clips,
      updatedAt: new Date().toISOString(),
    };
    setProject(nextProj);
    setPlayheadSec(0);
    await saveProjectToVault(nextProj, 'Assembled Multi-Track Timeline');
    await refreshVaultLists();
    showToast(`Assembled ${clips.length} clips across V1, V2, A1 & A2 tracks`);
  };

  const totalTimelineDuration = useMemo(() => {
    if (project.timelineClips.length === 0) return 20;
    return Math.max(
      10,
      ...project.timelineClips.map((c) => c.startTimeSec + c.durationSec)
    );
  }, [project.timelineClips]);

  // Playback loop for Stage 4 Multi-Track Sequencer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlayheadSec((prev) => {
        if (prev + 0.1 >= totalTimelineDuration) {
          setIsPlaying(false);
          return 0;
        }
        return Number((prev + 0.1).toFixed(2));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, totalTimelineDuration]);

  // Live Double-Buffered Canvas Blit Compositor
  useEffect(() => {
    if (activeStage !== 'editor') return;
    const canvas = compositorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Offscreen double-buffer canvas to prevent black flashes
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    // Base dark cinema slate
    offCtx.fillStyle = '#09090B';
    offCtx.fillRect(0, 0, width, height);

    const activeV1 = project.timelineClips.find(
      (c) =>
        c.track === 'V1' &&
        !c.muted &&
        playheadSec >= c.startTimeSec &&
        playheadSec <= c.startTimeSec + c.durationSec
    );
    const activeV2 = project.timelineClips.find(
      (c) =>
        c.track === 'V2' &&
        !c.muted &&
        playheadSec >= c.startTimeSec &&
        playheadSec <= c.startTimeSec + c.durationSec
    );
    const activeA1 = project.timelineClips.find(
      (c) =>
        c.track === 'A1' &&
        !c.muted &&
        playheadSec >= c.startTimeSec &&
        playheadSec <= c.startTimeSec + c.durationSec
    );

    const drawClipImage = (
      clip: VideoTimelineClip,
      isOverlay: boolean
    ): Promise<void> => {
      return new Promise((resolve) => {
        const imgUrl = clip.thumbnailUrl || clip.mediaUrl;
        if (!imgUrl || imgUrl.endsWith('.mp4') || imgUrl.endsWith('.wav')) {
          // Render stylized cinema slate frame if no raster URL cached yet
          offCtx.save();
          offCtx.globalAlpha = clip.opacity ?? 1;
          const grad = offCtx.createLinearGradient(0, 0, width, height);
          grad.addColorStop(0, isOverlay ? '#132A2E' : '#111622');
          grad.addColorStop(1, '#09090B');
          if (isOverlay) {
            offCtx.fillStyle = grad;
            offCtx.fillRect(width * 0.56, height * 0.08, width * 0.38, height * 0.38);
            offCtx.strokeStyle = '#46ecd5';
            offCtx.lineWidth = 2;
            offCtx.strokeRect(width * 0.56, height * 0.08, width * 0.38, height * 0.38);
            offCtx.fillStyle = '#46ecd5';
            offCtx.font = 'bold 13px monospace';
            offCtx.fillText(clip.label.slice(0, 32), width * 0.58, height * 0.26);
          } else {
            offCtx.fillStyle = grad;
            offCtx.fillRect(0, 0, width, height);
            offCtx.fillStyle = '#46ecd5';
            offCtx.font = 'bold 16px monospace';
            offCtx.fillText(clip.label, 42, height / 2 - 10);
          }
          offCtx.restore();
          resolve();
          return;
        }

        const cached = imageCacheRef.current.get(imgUrl);
        const canvasGradingFilter = buildCssFilterFromGrading(
          creativeControls.colorGrading,
          creativeControls.filmLook
        );
        if (cached && cached.complete) {
          offCtx.save();
          offCtx.globalAlpha = clip.opacity ?? 1;
          if (canvasGradingFilter) {
            offCtx.filter = canvasGradingFilter;
          }
          if (isOverlay) {
            // V2 Cutaway / B-Roll blend
            offCtx.drawImage(cached, 0, 0, width, height);
          } else {
            offCtx.drawImage(cached, 0, 0, width, height);
          }
          offCtx.restore();
          resolve();
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imageCacheRef.current.set(imgUrl, img);
          offCtx.save();
          offCtx.globalAlpha = clip.opacity ?? 1;
          if (canvasGradingFilter) {
            offCtx.filter = canvasGradingFilter;
          }
          offCtx.drawImage(img, 0, 0, width, height);
          offCtx.restore();
          resolve();
        };
        img.onerror = () => resolve();
        img.src = imgUrl;
      });
    };

    (async () => {
      if (activeV1) {
        await drawClipImage(activeV1, false);
      }
      if (activeV2) {
        await drawClipImage(activeV2, true);
      }

      // Burn-in timecode HUD & active track badges
      offCtx.fillStyle = 'rgba(9, 9, 11, 0.72)';
      offCtx.fillRect(18, 16, 290, 32);
      offCtx.fillStyle = '#46ecd5';
      offCtx.font = 'bold 12px monospace';
      offCtx.fillText(
        `TC 00:00:${String(Math.floor(playheadSec)).padStart(2, '0')}:${String(
          Math.floor((playheadSec % 1) * 24)
        ).padStart(2, '0')} · ${project.aspectRatio}`,
        28,
        36
      );

      // Subtitle overlay from A1 or V1 dialogue
      const subtitle = activeA1?.dialogueSubtitle || activeV1?.dialogueSubtitle;
      if (subtitle) {
        offCtx.fillStyle = 'rgba(9, 9, 11, 0.82)';
        const boxW = Math.min(width - 80, Math.max(320, subtitle.length * 8.5));
        const boxX = (width - boxW) / 2;
        const boxY = height - 68;
        offCtx.fillRect(boxX, boxY, boxW, 42);
        offCtx.fillStyle = '#FFFFFF';
        offCtx.font = '600 14px sans-serif';
        offCtx.textAlign = 'center';
        offCtx.fillText(subtitle.slice(0, 85), width / 2, boxY + 26);
        offCtx.textAlign = 'left';
      }

      // Atomic blit from offscreen buffer to visible canvas
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(offscreen, 0, 0);
    })();
  }, [activeStage, playheadSec, project.timelineClips, project.aspectRatio, creativeControls.colorGrading, creativeControls.filmLook]);

  // Hardware-Accelerated Master Video Export using Canvas MediaRecorder stream
  const handleExportMasterVideo = async () => {
    const canvas = compositorCanvasRef.current;
    if (!canvas || isExportingMaster) return;
    setIsExportingMaster(true);
    showToast('Encoding Multi-Track Master Video...');

    try {
      const stream = canvas.captureStream(24);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const donePromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType }));
        };
      });

      recorder.start();
      setIsPlaying(true);
      await new Promise((r) => setTimeout(r, 2600));
      recorder.stop();
      setIsPlaying(false);

      const blob = await donePromise;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = project.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      a.href = url;
      a.download = `${safeName || 'story-studio-master'}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      showToast('Master Video exported & downloaded');
    } catch {
      // Fallback portable project export if MediaRecorder is restricted
      exportPortableProjectArchive(project);
      showToast('Exported Story Studio Master Archive');
    } finally {
      setIsExportingMaster(false);
    }
  };

  // ==========================================================================
  // 8. RENDER HELPERS FOR EACH OF THE 4 SEQUENTIAL STAGES
  // ==========================================================================
  const editingAsset = project.assets.find((a) => a.id === editingAssetId) || null;
  const editingFrame = project.frames.find((f) => f.id === editingFrameId) || null;
  const selectedClip =
    project.timelineClips.find((c) => c.id === selectedClipId) || null;

  return (
    <div className="space-y-4">
      {/* =================================================================== */}
      {/* TOP ARCHITECTURAL HEADER & 4-STAGE SEQUENTIAL PIPELINE STEPPER      */}
      {/* =================================================================== */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#111114] border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#46ecd5]/15 border border-[#46ecd5]/40 flex items-center justify-center text-[#46ecd5] shrink-0">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={project.title}
                  onChange={(e) =>
                    setProject((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="font-display text-xl sm:text-2xl font-black uppercase tracking-wide text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#46ecd5] focus:outline-none"
                />
                <span className="px-2 py-0.5 rounded bg-[#46ecd5]/15 border border-[#46ecd5]/30 text-[10px] font-mono-tabular text-[#46ecd5] uppercase">
                  {project.productionType}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono-tabular text-emerald-300 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>VAULT AUTOSAVED · {new Date(lastSavedAt).toLocaleTimeString()}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                4-Stage Sequential Virtual Film Studio · Synchronous Local Mirror + IndexedDB ACID + MySQL Continuity
              </p>
            </div>
          </div>

          {/* Right Action Controls: Rolling Queue, Project Library, Storage Vault, Options Menu (⋮) */}
          <div className="flex flex-wrap items-center gap-2">
            {activeQueueCount > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-[#46ecd5]/15 border border-[#46ecd5]/40 text-xs font-mono-tabular text-[#46ecd5] flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Rolling Queue: {activeQueueCount} active (Max 2 parallel)</span>
              </div>
            )}

            <button
              onClick={() => setProjectLibraryOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#46ecd5]" />
              <span>Projects ({vaultProjects.length || 1})</span>
            </button>

            <button
              onClick={() => {
                void refreshVaultLists();
                setVaultModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-[#46ecd5]" />
              <span>Storage Vault ({snapshots.length})</span>
            </button>

            <button
              onClick={syncWithContinuityDatabase}
              className="px-3 py-1.5 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Sync to Continuity DB</span>
            </button>

            {/* Project Options Menu (⋮) */}
            <div className="relative">
              <button
                onClick={() => setOptionsMenuOpen((prev) => !prev)}
                aria-label="Project options menu"
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {optionsMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#141418] border border-white/15 shadow-2xl py-2 z-50 text-xs"
                  onMouseLeave={() => setOptionsMenuOpen(false)}
                >
                  <div className="px-3.5 py-1.5 text-[10px] font-mono-tabular uppercase text-zinc-400 border-b border-white/10">
                    Portable Project Archive & Tools
                  </div>
                  <button
                    onClick={() => {
                      setOptionsMenuOpen(false);
                      exportPortableProjectArchive(project);
                      showToast('Exported Portable .json Project Archive');
                    }}
                    className="w-full px-3.5 py-2 text-left text-zinc-200 hover:bg-white/5 flex items-center gap-2 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5 text-[#46ecd5]" />
                    <span>Export Project Archive (.json)</span>
                  </button>

                  <label className="w-full px-3.5 py-2 text-left text-zinc-200 hover:bg-white/5 flex items-center gap-2 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#46ecd5]" />
                    <span>Import Project Archive (.json)</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async () => {
                          try {
                            const restored = parsePortableProjectArchive(
                              String(reader.result || '')
                            );
                            setProject(restored);
                            await saveProjectToVault(
                              restored,
                              `Imported Archive: ${file.name}`
                            );
                            await refreshVaultLists();
                            showToast(`Restored project "${restored.title}"`);
                          } catch (err: unknown) {
                            showToast(
                              err instanceof Error
                                ? err.message
                                : 'Invalid archive file'
                            );
                          }
                        };
                        reader.readAsText(file);
                        setOptionsMenuOpen(false);
                      }}
                    />
                  </label>

                  <button
                    onClick={() => {
                      setOptionsMenuOpen(false);
                      void createCheckpointSnapshot('Manual User Checkpoint');
                    }}
                    className="w-full px-3.5 py-2 text-left text-zinc-200 hover:bg-white/5 flex items-center gap-2"
                  >
                    <Archive className="w-3.5 h-3.5 text-[#46ecd5]" />
                    <span>Create Version Snapshot</span>
                  </button>

                  {onSwitchToLegacyCinema && (
                    <>
                      <div className="my-1 border-t border-white/10" />
                      <button
                        onClick={() => {
                          setOptionsMenuOpen(false);
                          onSwitchToLegacyCinema();
                        }}
                        className="w-full px-3.5 py-2 text-left text-zinc-400 hover:text-white hover:bg-white/5 flex items-center gap-2"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Switch to Classic Shot Table View</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4-STAGE SEQUENTIAL PIPELINE BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {(
            [
              {
                id: 'script',
                step: 'STAGE 01',
                title: '1. SCRIPT WORKSHOP',
                sub: `${parsedScenes.length} Scenes · Stable UUIDs · AI Co-Writer`,
                icon: FileText,
              },
              {
                id: 'assets',
                step: 'STAGE 02',
                title: '2. ASSETS & B-ROLL',
                sub: `${project.assets.length} Entities · Cast, Locations, Wardrobe, B-Roll`,
                icon: Layers,
              },
              {
                id: 'storyboard',
                step: 'STAGE 03',
                title: '3. STORYBOARD & ANIMATION',
                sub: `${project.frames.length} Shots · 10-Setup Taxonomy · Multi-Angle`,
                icon: Camera,
              },
              {
                id: 'editor',
                step: 'STAGE 04',
                title: '4. VIDEO EDITOR & SEQUENCER',
                sub: `${project.timelineClips.length} Clips · V1/V2 Blit Compositor · Export`,
                icon: Film,
              },
            ] as const
          ).map((st) => {
            const Icon = st.icon;
            const active = activeStage === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setActiveStage(st.id)}
                className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                  active
                    ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white shadow-lg shadow-[#46ecd5]/10'
                    : 'bg-[#16161B] hover:bg-[#1B1B22] border-white/10 text-zinc-300'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#46ecd5] flex items-center gap-1.5">
                    <span>{st.step}</span>
                  </div>
                  <div className="font-display text-sm font-bold uppercase tracking-wide text-white truncate">
                    {st.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">{st.sub}</div>
                </div>
                <Icon
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    active ? 'text-[#46ecd5]' : 'text-zinc-500'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* STAGE 1: SCRIPT WORKSHOP (`ScriptView`, `Editor`, `Toolbar`)        */}
      {/* =================================================================== */}
      {activeStage === 'script' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Stable Scene UUID Outline & Global Visual Style */}
          <aside className="lg:col-span-3 bg-[#111114] border border-white/10 rounded-xl p-4 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#46ecd5] block">
                  Global Visual Style Anchor
                </label>
                <GearVisual spec={getColorGradeVisual(project.globalStyle)} size="sm" />
              </div>
              <select
                value={project.globalStyle}
                onChange={(e) =>
                  setProject((prev) => ({ ...prev, globalStyle: e.target.value }))
                }
                className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-[#46ecd5]"
              >
                {GLOBAL_VISUAL_STYLES.map((st) => (
                  <option key={st.id} value={st.directive}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Scene Navigator ({parsedScenes.length})
                </span>
                <button
                  onClick={() => {
                    const id = `scene-${Date.now().toString(36).slice(-5)}`;
                    insertScreenplaySnippet(
                      `### INT. NEW LOCATION - NIGHT <!-- scene-id: ${id} -->\n\nDescribe the action and [B-ROLL: atmospheric detail] here.\n\n@CHARACTER\n(calmly)\nEnter dialogue line here.`
                    );
                  }}
                  className="px-2 py-1 rounded bg-[#46ecd5]/15 hover:bg-[#46ecd5]/25 border border-[#46ecd5]/40 text-[11px] font-bold text-[#46ecd5] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Scene</span>
                </button>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {parsedScenes.map((sc) => {
                  const isSelected = activeSceneId === sc.sceneId;
                  return (
                    <button
                      key={sc.sceneId}
                      onClick={() => setActiveSceneId(sc.sceneId)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all space-y-1 ${
                        isSelected
                          ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-white'
                          : 'bg-zinc-900/80 border-white/10 text-zinc-300 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono-tabular">
                        <span className="text-[#46ecd5] font-bold">
                          SCENE {String(sc.sceneNumber).padStart(2, '0')}
                        </span>
                        <span
                          title="Persistent Stable Scene UUID"
                          className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-zinc-400"
                        >
                          {sc.sceneId}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white truncate">
                        {sc.slugline}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {sc.characters.map((ch) => (
                          <span
                            key={ch}
                            className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-zinc-300 font-mono-tabular"
                          >
                            @{ch}
                          </span>
                        ))}
                        <span className="text-[10px] text-zinc-500 ml-auto">
                          {sc.dialogueBlocks.length} lines
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2">
              <button
                onClick={() => {
                  const extracted = extractEntitiesFromScript(
                    project.fullMarkdown,
                    project.assets,
                    project.globalStyle
                  );
                  const frames = autoBreakdownScenesToFrames(
                    project.fullMarkdown,
                    extracted,
                    project.frames,
                    project.globalStyle
                  );
                  setProject((prev) => ({
                    ...prev,
                    assets: extracted,
                    frames,
                  }));
                  setActiveStage('assets');
                  showToast(
                    `Extracted ${extracted.length} Assets & ${frames.length} Storyboard Shots`
                  );
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105 flex items-center justify-center gap-1.5"
              >
                <span>Proceed to Stage 2: Assets & B-Roll</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </aside>

          {/* Right 9 Columns: Formatting Toolbar + Screenplay Editor + Floating AI Co-Writer */}
          <div className="lg:col-span-9 space-y-4">
            {/* Screenplay Formatting Toolbar */}
            <div className="p-3 rounded-xl bg-[#111114] border border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    insertScreenplaySnippet(
                      `### INT. LOCATION NAME - NIGHT <!-- scene-id: scene-${Date.now()
                        .toString(36)
                        .slice(-5)} -->`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono-tabular text-[#46ecd5] font-semibold"
                >
                  + Scene Slugline (H3)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertScreenplaySnippet(
                      `@CHARACTER NAME\n(focused, hushed)\nEnter character dialogue here.`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-200"
                >
                  + @Character Cue
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertScreenplaySnippet(
                      `[B-ROLL: Extreme close-up macro insert of atmospheric detail]`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-200"
                >
                  + [B-ROLL Insert]
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertScreenplaySnippet(`[PROP: Hero Production Object]`)
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-200"
                >
                  + [PROP Cue]
                </button>
                <button
                  type="button"
                  onClick={() => insertScreenplaySnippet(`##### CUT TO:`)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-200"
                >
                  + Transition
                </button>
                <button
                  type="button"
                  onClick={() =>
                    insertScreenplaySnippet(
                      `> Director Brainstorming Note: Pacing and lighting notes`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-200"
                >
                  + &gt; Note
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {(['split', 'formatted', 'markdown'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setScriptViewMode(m)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase ${
                      scriptViewMode === m
                        ? 'bg-[#46ecd5] text-zinc-950 font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor & Formatted Industry Screenplay Preview */}
            <div
              className={`grid grid-cols-1 ${
                scriptViewMode === 'split' ? 'xl:grid-cols-2' : ''
              } gap-4`}
            >
              {(scriptViewMode === 'split' || scriptViewMode === 'markdown') && (
                <div className="rounded-xl bg-[#111114] border border-white/10 overflow-hidden flex flex-col">
                  <div className="px-4 py-2.5 bg-[#16161B] border-b border-white/10 flex items-center justify-between text-xs">
                    <span className="font-mono-tabular text-zinc-300 font-semibold">
                      SCREENPLAY MARKDOWN SOURCE (STABLE UUID HOOK ACTIVE)
                    </span>
                    <span className="text-[11px] font-mono-tabular text-[#46ecd5]">
                      {project.fullMarkdown.length} chars
                    </span>
                  </div>
                  <textarea
                    ref={scriptTextareaRef}
                    rows={22}
                    value={project.fullMarkdown}
                    onChange={(e) => handleMarkdownChange(e.target.value)}
                    placeholder="# TITLE&#10;&#10;### INT. LOCATION - NIGHT&#10;&#10;@CHARACTER&#10;Dialogue..."
                    className="w-full p-4 bg-[#0D0D11] text-zinc-100 font-mono text-xs leading-relaxed focus:outline-none resize-y"
                  />
                </div>
              )}

              {(scriptViewMode === 'split' || scriptViewMode === 'formatted') && (
                <div className="rounded-xl bg-[#111114] border border-white/10 overflow-hidden flex flex-col">
                  <div className="px-4 py-2.5 bg-[#16161B] border-b border-white/10 flex items-center justify-between text-xs">
                    <span className="font-mono-tabular text-zinc-300 font-semibold">
                      LIVE INDUSTRY SCREENPLAY PAGE RENDER
                    </span>
                    <span className="text-[11px] font-mono-tabular text-zinc-400">
                      {parsedScenes.length} Scenes Bound
                    </span>
                  </div>
                  <div className="p-6 bg-[#131318] space-y-6 max-h-[540px] overflow-y-auto font-mono text-xs">
                    <div className="text-center border-b border-white/10 pb-4">
                      <h2 className="text-lg font-bold uppercase tracking-widest text-white">
                        {project.title}
                      </h2>
                      <p className="text-[11px] text-zinc-400 mt-1">{project.logline}</p>
                    </div>

                    {parsedScenes.map((sc) => (
                      <div
                        key={sc.sceneId}
                        className="space-y-3 pb-5 border-b border-white/10 last:border-b-0"
                      >
                        <div className="flex items-center justify-between bg-zinc-900/90 px-3 py-1.5 rounded border-l-2 border-[#46ecd5]">
                          <span className="font-bold text-white uppercase tracking-wider">
                            {sc.sceneNumber}. {sc.slugline}
                          </span>
                          <span className="text-[10px] text-[#46ecd5]">
                            UUID: {sc.sceneId}
                          </span>
                        </div>

                        {sc.brainstormNotes.map((note, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded bg-amber-500/10 border-l-2 border-amber-400 text-amber-200 text-[11px] italic"
                          >
                            Director Note: {note}
                          </div>
                        ))}

                        {sc.actionBlocks.map((act, idx) => (
                          <p key={idx} className="text-zinc-200 leading-relaxed">
                            {act}
                          </p>
                        ))}

                        {sc.dialogueBlocks.map((dlg, idx) => (
                          <div
                            key={idx}
                            className="max-w-md mx-auto text-center space-y-0.5 py-1"
                          >
                            <div className="font-bold text-[#46ecd5] uppercase tracking-wider">
                              {dlg.speaker}
                            </div>
                            {dlg.parenthetical && (
                              <div className="text-[11px] text-zinc-400 italic">
                                {dlg.parenthetical}
                              </div>
                            )}
                            <div className="text-zinc-100 leading-relaxed">
                              {dlg.text}
                            </div>
                          </div>
                        ))}

                        {sc.transitions.map((tr, idx) => (
                          <div
                            key={idx}
                            className="text-right font-bold uppercase tracking-wider text-zinc-400 pt-1"
                          >
                            {tr}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Floating AI Screenplay Co-Writer Bar */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#131D20] via-[#121318] to-[#131D20] border border-[#46ecd5]/40 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#46ecd5]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    AI Screenplay Co-Writer (Gemini 3.8 Flash · Continuity-Aware)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'continue', label: 'Continue Next Scene' },
                      { id: 'outline', label: 'Brainstorm Scene Outline' },
                      { id: 'rewrite_dialogue', label: 'Polish Dialogue' },
                      { id: 'scratch', label: 'Write Story from Scratch' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setCoWriterMode(mode.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        coWriterMode === mode.id
                          ? 'bg-[#46ecd5] text-zinc-950 font-bold'
                          : 'bg-zinc-900/90 text-zinc-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={coWriterPrompt}
                  onChange={(e) => setCoWriterPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleRunAiCoWriter();
                  }}
                  placeholder="Instruct AI Co-Writer (e.g., 'Write a tense rooftop exchange where Amara confronts Kemi during a thunderstorm')..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-950/90 border border-white/15 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#46ecd5]"
                />
                <button
                  type="button"
                  onClick={handleRunAiCoWriter}
                  disabled={coWriterBusy}
                  className="px-5 py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                >
                  {coWriterBusy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Generate Script</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* STAGE 2: ASSETS, CAST, WARDROBE & B-ROLL (`AssetsView`)             */}
      {/* =================================================================== */}
      {activeStage === 'assets' && (
        <div className="space-y-5">
          {/* Discovery & Batch Generation Control Bar */}
          <div className="p-4 rounded-xl bg-[#111114] border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                ['All', 'Character', 'Location', 'Wardrobe', 'B-Roll', 'Prop'] as const
              ).map((cat) => {
                const count =
                  cat === 'All'
                    ? project.assets.length
                    : project.assets.filter((a) => a.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setAssetCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      assetCategoryFilter === cat
                        ? 'bg-[#46ecd5] text-zinc-950 font-bold'
                        : 'bg-zinc-900 text-zinc-300 hover:text-white border border-white/10'
                    }`}
                  >
                    {cat === 'B-Roll' ? 'B-Roll & Cutaways' : `${cat}s`} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const extracted = extractEntitiesFromScript(
                    project.fullMarkdown,
                    project.assets,
                    project.globalStyle
                  );
                  setProject((prev) => ({ ...prev, assets: extracted }));
                  showToast(`Re-scanned script: ${extracted.length} entities active`);
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#46ecd5]" />
                <span>Re-Scan Script Entities</span>
              </button>

              <button
                onClick={() => setNewAssetModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#46ecd5]" />
                <span>New Custom Asset</span>
              </button>

              <button
                onClick={() => {
                  const tasks = project.assets.map((ast) => ({
                    id: `q-ast-${ast.id}-${Date.now()}`,
                    label: `${ast.category}: ${ast.name}`,
                    kind: 'asset_image' as const,
                    targetId: ast.id,
                    isCharacter: ast.category === 'Character',
                    prompt:
                      ast.category === 'Character'
                        ? buildCharacterTurnaroundPrompt({
                            name: ast.name,
                            appearance: `${ast.description}. ${ast.attributes?.physicalFeatures || ''} ${ast.visualPrompt}`,
                            styleNotes: project.globalStyle,
                          })
                        : `${ast.visualPrompt}. ${project.globalStyle}`,
                    surface: 'image' as const,
                  }));
                  setProject((prev) => ({
                    ...prev,
                    assets: prev.assets.map((a) => ({ ...a, status: 'queued' })),
                  }));
                  enqueueGenerationTasks(tasks);
                  showToast(
                    `Queued ${tasks.length} assets in Global Rolling Queue (Concurrency = 2)`
                  );
                }}
                className="px-4 py-1.5 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Batch Generate All Assets (🍌 Nano Banana)</span>
              </button>
            </div>
          </div>

          <UniversalCreativeControlsBar
            surface="image"
            activeModel={models.find((m) => m.id === (project.defaultImageModel || 'nano-banana-2-1'))}
            compact
            contextLabel="STORY STUDIO · STAGE 2 ASSET CINEMATOGRAPHY"
          />

          {/* Asset Cards Grid + Slide-Over AssetEditPanel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div
              className={`${
                editingAsset ? 'lg:col-span-8' : 'lg:col-span-12'
              } grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4`}
            >
              {project.assets
                .filter((a) =>
                  assetCategoryFilter === 'All'
                    ? true
                    : a.category === assetCategoryFilter
                )
                .map((asset) => {
                  const imgUrl = asset.generatedImageUrl || asset.referenceImageUrl;
                  const sheetLabel =
                    asset.category === 'Character'
                      ? 'CASTING TURNAROUND SHEET'
                      : asset.category === 'Location'
                      ? '4-ANGLE LOCATION CONTINUITY'
                      : asset.category === 'Wardrobe'
                      ? 'MANNEQUIN FASHION EDITORIAL'
                      : asset.category === 'B-Roll'
                      ? 'MACRO CUTAWAY INSERT'
                      : 'STUDIO HERO PROP SHEET';

                  return (
                    <div
                      key={asset.id}
                      className={`rounded-xl bg-[#111114] border transition-all overflow-hidden flex flex-col justify-between ${
                        editingAssetId === asset.id
                          ? 'border-[#46ecd5] shadow-lg shadow-[#46ecd5]/10'
                          : 'border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div
                        onClick={() => {
                          if (imgUrl) {
                            setLightboxItem({
                              kind: 'image',
                              url: imgUrl,
                              title: `${asset.name} · ${sheetLabel}`,
                              aspectRatio: asset.category === 'Character' ? '1:1' : project.aspectRatio,
                            });
                          }
                        }}
                        className={`bg-black relative overflow-hidden flex items-center justify-center min-h-[190px] ${
                          imgUrl ? 'cursor-pointer group' : ''
                        }`}
                      >
                        {imgUrl ? (
                          <>
                            <img
                              src={imgUrl}
                              alt={asset.name}
                              className="w-full max-h-[280px] object-contain"
                            />
                            <span className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/80 text-white group-hover:bg-[#46ecd5] group-hover:text-black border border-white/15">
                              <Maximize2 className="w-3.5 h-3.5" />
                            </span>
                          </>
                        ) : (
                          <div className="p-4 text-center space-y-1.5">
                            <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#46ecd5]">
                              {sheetLabel}
                            </div>
                            <p className="text-xs text-zinc-500 line-clamp-2">
                              {asset.visualPrompt}
                            </p>
                          </div>
                        )}

                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/80 border border-white/15 text-[10px] font-mono-tabular uppercase text-[#46ecd5]">
                          {asset.category} · {sheetLabel}
                        </div>

                        {asset.status === 'queued' || asset.status === 'generating' ? (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 text-xs font-mono-tabular text-[#46ecd5]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>ROLLING QUEUE...</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-display text-lg font-bold uppercase text-white truncate">
                              {asset.name}
                            </h3>
                            <span className="text-[10px] font-mono-tabular text-zinc-400 shrink-0">
                              {asset.sceneIds.length} scene(s)
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2">
                            {asset.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                          <button
                            onClick={() => {
                              setProject((prev) => ({
                                ...prev,
                                assets: prev.assets.map((a) =>
                                  a.id === asset.id ? { ...a, status: 'queued' } : a
                                ),
                              }));
                              enqueueGenerationTasks([
                                {
                                  id: `q-ast-${asset.id}-${Date.now()}`,
                                  label: `${asset.category}: ${asset.name}`,
                                  kind: 'asset_image',
                                  targetId: asset.id,
                                  isCharacter: asset.category === 'Character',
                                  prompt:
                                    asset.category === 'Character'
                                      ? buildCharacterTurnaroundPrompt({
                                          name: asset.name,
                                          appearance: `${asset.description}. ${asset.attributes?.physicalFeatures || ''} ${asset.visualPrompt}`,
                                          styleNotes: project.globalStyle,
                                        })
                                      : `${asset.visualPrompt}. ${project.globalStyle}`,
                                  surface: 'image',
                                },
                              ]);
                              showToast(`Queued ${asset.name} in Rolling Queue`);
                            }}
                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold hover:brightness-105 flex items-center justify-center gap-1"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{imgUrl ? 'Regenerate Sheet' : 'Generate Sheet'}</span>
                          </button>
                          <button
                            onClick={() => setEditingAssetId(asset.id)}
                            className="py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* AssetEditPanel Slide-Over Inspector */}
            {editingAsset && (
              <aside className="lg:col-span-4 bg-[#111114] border border-[#46ecd5]/50 rounded-xl p-4 space-y-4 lg:sticky lg:top-20">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="text-[10px] font-mono-tabular uppercase text-[#46ecd5]">
                      ASSET INSPECTOR · {editingAsset.category.toUpperCase()}
                    </div>
                    <h3 className="font-display text-xl font-bold uppercase text-white">
                      {editingAsset.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setEditingAssetId(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      Asset Name
                    </label>
                    <input
                      type="text"
                      value={editingAsset.name}
                      onChange={(e) =>
                        setProject((prev) => ({
                          ...prev,
                          assets: prev.assets.map((a) =>
                            a.id === editingAsset.id
                              ? { ...a, name: e.target.value }
                              : a
                          ),
                        }))
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      Narrative Description & Continuity Notes
                    </label>
                    <textarea
                      rows={3}
                      value={editingAsset.description}
                      onChange={(e) =>
                        setProject((prev) => ({
                          ...prev,
                          assets: prev.assets.map((a) =>
                            a.id === editingAsset.id
                              ? { ...a, description: e.target.value }
                              : a
                          ),
                        }))
                      }
                      className="w-full p-2.5 rounded-lg bg-zinc-900 border border-white/10 text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      🍌 Nano Banana Pro Visual Prompt
                    </label>
                    <textarea
                      rows={4}
                      value={editingAsset.visualPrompt}
                      onChange={(e) =>
                        setProject((prev) => ({
                          ...prev,
                          assets: prev.assets.map((a) =>
                            a.id === editingAsset.id
                              ? { ...a, visualPrompt: e.target.value }
                              : a
                          ),
                        }))
                      }
                      className="w-full p-2.5 rounded-lg bg-zinc-900 border border-white/10 text-white font-mono text-[11px] resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      Anchor Reference Image (Gallery or URL)
                    </label>
                    <input
                      type="text"
                      value={editingAsset.referenceImageUrl}
                      onChange={(e) =>
                        setProject((prev) => ({
                          ...prev,
                          assets: prev.assets.map((a) =>
                            a.id === editingAsset.id
                              ? { ...a, referenceImageUrl: e.target.value }
                              : a
                          ),
                        }))
                      }
                      placeholder="https://... or select from SPACIX gallery below"
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white font-mono text-[11px]"
                    />
                    {uploads.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1.5">
                        {uploads.slice(0, 5).map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() =>
                              setProject((prev) => ({
                                ...prev,
                                assets: prev.assets.map((a) =>
                                  a.id === editingAsset.id
                                    ? { ...a, referenceImageUrl: u.publicUrl }
                                    : a
                                ),
                              }))
                            }
                            className="w-12 h-12 rounded-lg overflow-hidden border border-white/15 hover:border-[#46ecd5] shrink-0"
                          >
                            <img
                              src={u.publicUrl}
                              alt={u.label}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProject((prev) => ({
                          ...prev,
                          assets: prev.assets.filter((a) => a.id !== editingAsset.id),
                        }));
                        setEditingAssetId(null);
                      }}
                      className="px-3 py-2 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold"
                    >
                      Delete Asset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAssetId(null);
                        showToast('Saved asset changes to Vault');
                      }}
                      className="px-4 py-2 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* STAGE 3: STORYBOARD, CAMERA COVERAGE & ANIMATION (`StoryboardView`) */}
      {/* =================================================================== */}
      {activeStage === 'storyboard' && (
        <div className="space-y-5 relative pb-20">
          {/* Top Storyboard Controls + Cinematography Reference Taxonomy Trigger */}
          <div className="p-4 rounded-xl bg-[#111114] border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#46ecd5]">
                AUTOMATED SCENE BREAKDOWN · MULTI-ANGLE COVERAGE · OMNI 1.1 FLASH ANIMATION
              </div>
              <h2 className="font-display text-2xl font-bold uppercase text-white">
                Storyboard & Camera Coverage ({project.frames.length} Shots)
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setTaxonomyDrawerOpen((prev) => !prev)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-[#46ecd5]" />
                <span>10-Setup Camera Taxonomy</span>
              </button>

              <button
                onClick={() => setJoystickVisible((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${
                  joystickVisible
                    ? 'bg-[#46ecd5]/15 border-[#46ecd5] text-[#46ecd5]'
                    : 'bg-zinc-900 border-white/10 text-zinc-300'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Virtual Joystick</span>
              </button>

              <button
                onClick={handleAutoBreakdownStoryboard}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#46ecd5]" />
                <span>Sync Breakdown from Script</span>
              </button>

              <button
                onClick={() => {
                  const tasks: Omit<RollingQueueTask, 'status'>[] = [];
                  project.frames.forEach((f) => {
                    const ang =
                      f.angles.find((a) => a.id === f.activeAngleId) || f.angles[0];
                    if (ang) {
                      tasks.push({
                        id: `q-frm-${f.id}-${ang.id}-${Date.now()}`,
                        label: `Shot ${f.shotNumber} (${ang.angleLabel})`,
                        kind: 'frame_image',
                        targetId: f.id,
                        angleId: ang.id,
                        prompt: ang.cameraPrompt,
                        surface: 'image',
                      });
                    }
                  });
                  enqueueGenerationTasks(tasks);
                  showToast(
                    `Queued ${tasks.length} Storyboard Frames in Rolling Queue`
                  );
                }}
                className="px-4 py-1.5 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Render All Shot Frames</span>
              </button>
            </div>
          </div>

          <UniversalCreativeControlsBar
            surface="video"
            activeModel={models.find((m) => m.id === (project.defaultVideoModel || 'seedance-2-5'))}
            compact
            contextLabel="STORY STUDIO · STAGE 3 SHOT CINEMATOGRAPHY & MOVEMENT"
          />

          {/* 10-Category Cinematography Reference Taxonomy Drawer */}
          {taxonomyDrawerOpen && (
            <div className="p-4 rounded-xl bg-[#14141A] border border-[#46ecd5]/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-[#46ecd5]">
                  Cinematography Reference Taxonomy (10 Camera Setups)
                </div>
                <button
                  onClick={() => setTaxonomyDrawerOpen(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Close Reference
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {CINEMATOGRAPHY_TAXONOMY.map((tax) => (
                  <div
                    key={tax.id}
                    className="p-3 rounded-lg bg-zinc-900/90 border border-white/10 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <GearVisual spec={getCameraAngleVisual(tax.label)} size="md" />
                        <GearVisual spec={getLensOpticVisual(tax.focalLength)} size="sm" />
                      </div>
                      <div className="text-right text-[10px] font-mono-tabular text-[#46ecd5]">
                        <div className="font-bold">{tax.shortCode}</div>
                        <div>{tax.focalLength}</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-white">{tax.label}</div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {tax.framingDescription}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Storyboard Shots Grouped by Scene */}
          <div className="space-y-8">
            {parsedScenes.map((scene) => {
              const sceneFrames = project.frames.filter(
                (f) => f.sceneId === scene.sceneId
              );
              return (
                <div
                  key={scene.sceneId}
                  className="p-4 sm:p-5 rounded-xl bg-[#111114] border border-white/10 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#46ecd5] text-zinc-950 font-mono-tabular font-bold text-[10px]">
                          SCENE {String(scene.sceneNumber).padStart(2, '0')}
                        </span>
                        <h3 className="font-display text-lg font-bold uppercase text-white">
                          {scene.slugline}
                        </h3>
                        <span className="text-[10px] font-mono-tabular text-zinc-500">
                          ({scene.sceneId})
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        // Animate all camera angles in this scene sequentially via rolling queue
                        const tasks: Omit<RollingQueueTask, 'status'>[] = [];
                        sceneFrames.forEach((f) => {
                          f.angles.forEach((ang) => {
                            tasks.push({
                              id: `q-vid-${f.id}-${ang.id}-${Date.now()}`,
                              label: `Scene ${scene.sceneNumber} Shot ${f.shotNumber} (${ang.angleLabel})`,
                              kind: 'frame_video',
                              targetId: f.id,
                              angleId: ang.id,
                              prompt: `${ang.cameraPrompt}. Motion Intensity: ${ang.motionIntensity}. ${f.cameraRigDirective}`,
                              surface: 'video',
                            });
                          });
                        });
                        enqueueGenerationTasks(tasks);
                        showToast(
                          `Queued ${tasks.length} multi-angle animations for Scene ${scene.sceneNumber}`
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#46ecd5]/15 hover:bg-[#46ecd5]/25 border border-[#46ecd5]/40 text-xs font-bold text-[#46ecd5] flex items-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Animate All Camera Angles in Scene</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sceneFrames.map((frame) => {
                      const activeAng =
                        frame.angles.find((a) => a.id === frame.activeAngleId) ||
                        frame.angles[0];
                      const isSelected = selectedFrameId === frame.id;
                      const taxSpec =
                        CINEMATOGRAPHY_TAXONOMY.find(
                          (t) => t.id === (activeAng?.taxonomyId || frame.taxonomyId)
                        ) || CINEMATOGRAPHY_TAXONOMY[0];

                      return (
                        <div
                          key={frame.id}
                          ref={(el) => {
                            frameRefs.current[frame.id] = el;
                          }}
                          onClick={() => setSelectedFrameId(frame.id)}
                          className={`rounded-xl bg-[#16161C] border transition-all overflow-hidden flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#46ecd5] ring-1 ring-[#46ecd5]/40 shadow-xl'
                              : 'border-white/10 hover:border-white/25'
                          }`}
                        >
                          {/* Multi-Angle Viewport (True Aspect Ratio + Lightbox) */}
                          <div className="bg-black relative overflow-hidden flex items-center justify-center min-h-[190px]">
                            {activeAng?.videoUrl ? (
                              <div className="relative w-full flex items-center justify-center">
                                <video
                                  src={activeAng.videoUrl}
                                  muted
                                  autoPlay
                                  loop
                                  playsInline
                                  controls
                                  className="w-full max-h-[280px] object-contain"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxItem({
                                      kind: 'video',
                                      url: activeAng.videoUrl!,
                                      title: `Shot #${frame.shotNumber} · ${frame.shotTitle}`,
                                      aspectRatio: project.aspectRatio,
                                    });
                                  }}
                                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/80 hover:bg-[#46ecd5] hover:text-black text-white border border-white/15"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : activeAng?.imageUrl ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxItem({
                                    kind: 'image',
                                    url: activeAng.imageUrl!,
                                    title: `Shot #${frame.shotNumber} · ${frame.shotTitle}`,
                                    aspectRatio: project.aspectRatio,
                                  });
                                }}
                                className="relative group w-full flex items-center justify-center"
                              >
                                <img
                                  src={activeAng.imageUrl}
                                  alt={frame.shotTitle}
                                  className="w-full max-h-[280px] object-contain"
                                />
                                <span className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/80 group-hover:bg-[#46ecd5] group-hover:text-black text-white border border-white/15">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </span>
                              </button>
                            ) : (
                              <div className="p-4 text-center space-y-2 flex flex-col items-center">
                                <div className="flex items-center gap-2">
                                  <GearVisual spec={getCameraAngleVisual(taxSpec.label)} size="lg" />
                                  <GearVisual spec={getLensOpticVisual(taxSpec.focalLength)} size="md" />
                                </div>
                                <div className="text-[10px] font-mono-tabular text-[#46ecd5] uppercase">
                                  {taxSpec.shortCode} · {taxSpec.focalLength}
                                </div>
                                <p className="text-xs text-zinc-400 line-clamp-3">
                                  {activeAng?.cameraPrompt || frame.actionDescription}
                                </p>
                              </div>
                            )}

                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-black/85 border border-white/15 text-[10px] font-mono-tabular font-bold text-[#46ecd5] flex items-center gap-1">
                                <GearVisual spec={getCameraAngleVisual(taxSpec.label)} size="xs" />
                                <span>
                                  SHOT #{frame.shotNumber} · {taxSpec.shortCode}
                                </span>
                              </span>
                              <span className="px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono-tabular text-zinc-300">
                                {frame.durationSec}s
                              </span>
                            </div>
                          </div>

                          {/* Camera Angle Switcher Strip */}
                          <div className="px-3 py-2 bg-[#111116] border-y border-white/10 flex items-center gap-1 overflow-x-auto no-scrollbar">
                            {frame.angles.map((ang) => (
                              <button
                                key={ang.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProject((prev) => ({
                                    ...prev,
                                    frames: prev.frames.map((f) =>
                                      f.id === frame.id
                                        ? { ...f, activeAngleId: ang.id }
                                        : f
                                    ),
                                  }));
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-mono-tabular uppercase whitespace-nowrap shrink-0 transition-colors ${
                                  frame.activeAngleId === ang.id
                                    ? 'bg-[#46ecd5] text-zinc-950 font-bold'
                                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {ang.angleLabel} ({ang.taxonomyId})
                                {ang.videoUrl ? ' 🎬' : ang.imageUrl ? ' ✓' : ''}
                              </button>
                            ))}
                            <button
                              type="button"
                              title="Add alternate camera setup angle"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextTax =
                                  CINEMATOGRAPHY_TAXONOMY[
                                    frame.angles.length %
                                      CINEMATOGRAPHY_TAXONOMY.length
                                  ];
                                const newAng: StoryboardAngleCoverage = {
                                  id: `${frame.id}-ang-${Date.now().toString(36).slice(-4)}`,
                                  angleLabel: nextTax.label.split('/')[0].trim(),
                                  taxonomyId: nextTax.id,
                                  cameraPrompt: `${nextTax.promptDirective}. ${frame.actionDescription}. ${project.globalStyle}`,
                                  imageUrl: '',
                                  videoUrl: '',
                                  motionIntensity: 'Moderate',
                                  status: 'idle',
                                };
                                setProject((prev) => ({
                                  ...prev,
                                  frames: prev.frames.map((f) =>
                                    f.id === frame.id
                                      ? {
                                          ...f,
                                          activeAngleId: newAng.id,
                                          angles: [...f.angles, newAng],
                                        }
                                      : f
                                  ),
                                }));
                              }}
                              className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] font-mono-tabular text-[#46ecd5] shrink-0"
                            >
                              + Angle
                            </button>
                          </div>

                          {/* Shot Body: Action, Verbatim Dialogue, Linked Continuity Assets */}
                          <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                            <div className="space-y-1.5">
                              <div className="text-xs font-bold text-white">
                                {frame.shotTitle}
                              </div>
                              <p className="text-xs text-zinc-400 line-clamp-2">
                                {frame.actionDescription}
                              </p>

                              {frame.dialogueText && (
                                <div className="p-2 rounded-lg bg-zinc-900/90 border-l-2 border-[#46ecd5] text-[11px]">
                                  <span className="font-bold text-[#46ecd5] uppercase">
                                    {frame.dialogueSpeaker}:{' '}
                                  </span>
                                  <span className="text-zinc-200 italic">
                                    "{frame.dialogueText}"
                                  </span>
                                </div>
                              )}

                              {frame.linkedAssetIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {frame.linkedAssetIds.map((aid) => {
                                    const ast = project.assets.find(
                                      (a) => a.id === aid
                                    );
                                    if (!ast) return null;
                                    return (
                                      <span
                                        key={aid}
                                        className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-zinc-300"
                                      >
                                        {ast.name}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!activeAng) return;
                                  enqueueGenerationTasks([
                                    {
                                      id: `q-frm-img-${frame.id}-${Date.now()}`,
                                      label: `Shot ${frame.shotNumber} Still`,
                                      kind: 'frame_image',
                                      targetId: frame.id,
                                      angleId: activeAng.id,
                                      prompt: activeAng.cameraPrompt,
                                      surface: 'image',
                                    },
                                  ]);
                                  showToast(
                                    `Queued Shot #${frame.shotNumber} (${activeAng.angleLabel}) still`
                                  );
                                }}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[11px] font-semibold text-zinc-200 flex items-center justify-center gap-1"
                              >
                                <ImageIcon className="w-3 h-3 text-[#46ecd5]" />
                                <span>Gen Frame</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!activeAng) return;
                                  setAnimateModalFrame({
                                    frameId: frame.id,
                                    angleId: activeAng.id,
                                  });
                                }}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-[#46ecd5] text-zinc-950 text-[11px] font-bold hover:brightness-105 flex items-center justify-center gap-1"
                              >
                                <Film className="w-3 h-3" />
                                <span>Animate (Omni)</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ON-SCREEN VIRTUAL NAVIGATION JOYSTICK (ANALOG THUMBSTICK + D-PAD) */}
          {joystickVisible && (
            <div className="fixed bottom-6 right-6 z-40 p-3.5 rounded-2xl bg-[#121217]/95 backdrop-blur-md border border-[#46ecd5]/50 shadow-2xl space-y-2 w-48">
              <div className="flex items-center justify-between text-[10px] font-mono-tabular uppercase text-[#46ecd5]">
                <span className="flex items-center gap-1 font-bold">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Shot Navigator</span>
                </span>
                <button
                  onClick={() => setJoystickVisible(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="relative w-28 h-28 mx-auto rounded-full bg-zinc-950 border border-white/15 flex items-center justify-center select-none">
                {/* Up: Prev Scene */}
                <button
                  type="button"
                  onClick={() => navigateStoryboardByDelta(0, -1)}
                  title="Previous Scene"
                  className="absolute top-1.5 left-1/2 -translate-x-1/2 p-1 text-zinc-400 hover:text-[#46ecd5]"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                {/* Down: Next Scene */}
                <button
                  type="button"
                  onClick={() => navigateStoryboardByDelta(0, 1)}
                  title="Next Scene"
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 p-1 text-zinc-400 hover:text-[#46ecd5]"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                {/* Left: Prev Shot */}
                <button
                  type="button"
                  onClick={() => navigateStoryboardByDelta(-1, 0)}
                  title="Previous Shot"
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-[#46ecd5]"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {/* Right: Next Shot */}
                <button
                  type="button"
                  onClick={() => navigateStoryboardByDelta(1, 0)}
                  title="Next Shot"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-[#46ecd5]"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Center Draggable Analog Thumbstick */}
                <div
                  onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const handleMove = (mv: MouseEvent) => {
                      const dx = Math.max(-24, Math.min(24, mv.clientX - startX));
                      const dy = Math.max(-24, Math.min(24, mv.clientY - startY));
                      setJoystickOffset({ x: dx, y: dy });
                    };
                    const handleUp = (up: MouseEvent) => {
                      const dx = up.clientX - startX;
                      const dy = up.clientY - startY;
                      setJoystickOffset({ x: 0, y: 0 });
                      if (Math.abs(dx) > Math.abs(dy)) {
                        if (dx > 12) navigateStoryboardByDelta(1, 0);
                        else if (dx < -12) navigateStoryboardByDelta(-1, 0);
                      } else {
                        if (dy > 12) navigateStoryboardByDelta(0, 1);
                        else if (dy < -12) navigateStoryboardByDelta(0, -1);
                      }
                      window.removeEventListener('mousemove', handleMove);
                      window.removeEventListener('mouseup', handleUp);
                    };
                    window.addEventListener('mousemove', handleMove);
                    window.addEventListener('mouseup', handleUp);
                  }}
                  style={{
                    transform: `translate(${joystickOffset.x}px, ${joystickOffset.y}px)`,
                  }}
                  className="w-11 h-11 rounded-full bg-gradient-to-br from-[#46ecd5] to-teal-600 text-zinc-950 font-mono-tabular font-black text-[10px] flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg shadow-[#46ecd5]/30 transition-transform duration-75"
                >
                  GLIDE
                </div>
              </div>

              <div className="text-[10px] text-center text-zinc-400 font-mono-tabular">
                ◄► Shots · ▲▼ Scenes
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* STAGE 4: MULTI-TRACK VIDEO TIMELINE EDITOR (`VideoEditorView`)      */}
      {/* =================================================================== */}
      {activeStage === 'editor' && (
        <div className="space-y-5">
          <UniversalCreativeControlsBar
            surface="video"
            activeModel={models.find((m) => m.id === (project.defaultVideoModel || 'seedance-2-5'))}
            compact
            contextLabel="STORY STUDIO · STAGE 4 LIVE LUT COMPOSITOR & GRADE"
          />
          {/* Top Monitor + Clip Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Double-Buffered Canvas Blit Compositor Program Monitor */}
            <div className="lg:col-span-8 bg-[#111114] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Live Canvas Blit Compositor (Double-Buffered)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#46ecd5]/15 text-[#46ecd5] font-mono-tabular text-[10px]">
                    24 FPS REALTIME
                  </span>
                </div>

                {/* Aspect Ratio Preview Switcher */}
                <div className="flex items-center gap-1">
                  {(['16:9', '9:16', '1:1', '2.39:1'] as const).map((ar) => (
                    <button
                      key={ar}
                      onClick={() =>
                        setProject((prev) => ({ ...prev, aspectRatio: ar }))
                      }
                      className={`px-2.5 py-1 rounded text-[11px] font-mono-tabular font-semibold ${
                        project.aspectRatio === ar
                          ? 'bg-[#46ecd5] text-zinc-950 font-bold'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#070709] rounded-xl border border-white/10 p-3 flex items-center justify-center overflow-hidden">
                <canvas
                  ref={compositorCanvasRef}
                  width={
                    project.aspectRatio === '9:16'
                      ? 405
                      : project.aspectRatio === '1:1'
                      ? 540
                      : 860
                  }
                  height={
                    project.aspectRatio === '9:16'
                      ? 720
                      : project.aspectRatio === '1:1'
                      ? 540
                      : project.aspectRatio === '2.39:1'
                      ? 360
                      : 484
                  }
                  className="max-w-full h-auto rounded-lg border border-white/10 shadow-2xl"
                />
              </div>

              {/* Transport Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying((prev) => !prev)}
                    className="px-4 py-2 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase flex items-center gap-1.5"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Play Master</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setPlayheadSec(0);
                    }}
                    className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs text-zinc-300"
                  >
                    Reset 00:00
                  </button>
                  <span className="font-mono-tabular text-xs text-[#46ecd5]">
                    {playheadSec.toFixed(1)}s / {totalTimelineDuration.toFixed(1)}s
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleAutoAssembleTimeline}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-[#46ecd5]" />
                    <span>Auto-Assemble from Storyboard & B-Roll</span>
                  </button>

                  <button
                    onClick={handleExportMasterVideo}
                    disabled={isExportingMaster}
                    className="px-4 py-2 rounded-xl bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase tracking-wider hover:brightness-105 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      {isExportingMaster
                        ? 'Encoding Master...'
                        : 'Export Master Video'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Clip Opacity, Volume, Trim & Layer Inspector */}
            <aside className="lg:col-span-4 bg-[#111114] border border-white/10 rounded-xl p-4 space-y-4">
              <div className="border-b border-white/10 pb-3">
                <div className="text-[10px] font-mono-tabular uppercase text-[#46ecd5]">
                  SEQUENCER CLIP INSPECTOR
                </div>
                <h3 className="font-display text-xl font-bold uppercase text-white">
                  {selectedClip ? selectedClip.label : 'Select Any Timeline Clip'}
                </h3>
              </div>

              {selectedClip ? (
                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Start Time (sec)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={selectedClip.startTimeSec}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value));
                          setProject((prev) => ({
                            ...prev,
                            timelineClips: prev.timelineClips.map((c) =>
                              c.id === selectedClip.id
                                ? { ...c, startTimeSec: val }
                                : c
                            ),
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Duration (sec)
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={0.5}
                        value={selectedClip.durationSec}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value));
                          setProject((prev) => ({
                            ...prev,
                            timelineClips: prev.timelineClips.map((c) =>
                              c.id === selectedClip.id
                                ? { ...c, durationSec: val, trimOutSec: val }
                                : c
                            ),
                          }));
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white font-mono-tabular"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">Layer Opacity</span>
                      <span className="font-mono-tabular text-[#46ecd5]">
                        {Math.round(selectedClip.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={selectedClip.opacity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setProject((prev) => ({
                          ...prev,
                          timelineClips: prev.timelineClips.map((c) =>
                            c.id === selectedClip.id ? { ...c, opacity: val } : c
                          ),
                        }));
                      }}
                      className="w-full accent-[#46ecd5]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">Audio Gain / Volume</span>
                      <span className="font-mono-tabular text-[#46ecd5]">
                        {Math.round(selectedClip.volume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={selectedClip.volume}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setProject((prev) => ({
                          ...prev,
                          timelineClips: prev.timelineClips.map((c) =>
                            c.id === selectedClip.id ? { ...c, volume: val } : c
                          ),
                        }));
                      }}
                      className="w-full accent-[#46ecd5]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <button
                      onClick={() =>
                        setProject((prev) => ({
                          ...prev,
                          timelineClips: prev.timelineClips.map((c) =>
                            c.id === selectedClip.id
                              ? { ...c, muted: !c.muted }
                              : c
                          ),
                        }))
                      }
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-200 flex items-center gap-1.5"
                    >
                      {selectedClip.muted ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                          <span>Unmute Clip</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-[#46ecd5]" />
                          <span>Mute Clip</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setProject((prev) => ({
                          ...prev,
                          timelineClips: prev.timelineClips.filter(
                            (c) => c.id !== selectedClip.id
                          ),
                        }));
                        setSelectedClipId(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    >
                      Remove Clip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-400 space-y-2">
                  <p>
                    Click any clip on tracks <strong>V1</strong> (Primary Coverage),{' '}
                    <strong>V2</strong> (Cutaways & B-Roll Overlays),{' '}
                    <strong>A1</strong> (Dialogue), or <strong>A2</strong> (Score &
                    Foley) to trim duration, adjust opacity, or balance audio gain.
                  </p>
                  {project.timelineClips.length === 0 && (
                    <button
                      onClick={handleAutoAssembleTimeline}
                      className="w-full py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider"
                    >
                      Populate Multi-Track Sequencer Now
                    </button>
                  )}
                </div>
              )}
            </aside>
          </div>

          {/* Full Interactive Multitrack & Multilayer NLE Timeline Editor */}
          <MultiTrackTimelineEditor
            title={`${project.title} — Stage 4 Multitrack Sequence`}
            aspectRatio={project.aspectRatio === '2.39:1' ? '21:9' : project.aspectRatio}
            tracks={
              [
                { id: 'v2', label: 'V2 · B-Roll & Cutaways', kind: 'overlay', volume: 0.7 },
                { id: 'v1', label: 'V1 · Primary Coverage', kind: 'video', volume: 1 },
                { id: 't1', label: 'T1 · Titles & Captions', kind: 'text' },
                { id: 'a1', label: 'A1 · Verbatim Dialogue', kind: 'audio', audioRole: 'dialogue', volume: 1 },
                { id: 'a2', label: 'A2 · Score & Foley', kind: 'audio', audioRole: 'music', volume: 0.7 },
              ] satisfies TimelineTrackConfig[]
            }
            clips={project.timelineClips.map((c): TimelineClipItem => ({
              id: c.id,
              trackId: c.track === 'V1' ? 'v1' : c.track === 'V2' ? 'v2' : c.track === 'A1' ? 'a1' : 'a2',
              title: c.label,
              mediaUrl: c.mediaUrl || c.thumbnailUrl,
              mediaKind:
                c.track === 'A1' || c.track === 'A2'
                  ? 'audio'
                  : (c.mediaUrl || '').match(/\.(mp4|webm)(\?|$)/i)
                  ? 'video'
                  : 'image',
              startSec: c.startTimeSec,
              durationSec: c.durationSec,
              trimStartSec: c.trimInSec,
              volume: c.volume,
              opacity: c.opacity,
              textContent: c.dialogueSubtitle,
              aspectRatio: project.aspectRatio === '2.39:1' ? '21:9' : project.aspectRatio,
            }))}
            onChangeTracks={() => {
              // StoryStudio maintains canonical V1/V2/A1/A2 lanes while editor manages interactive layers cleanly
            }}
            onChangeClips={(nextClips) => {
              setProject((prev) => ({
                ...prev,
                timelineClips: nextClips.map((nc) => ({
                  id: nc.id,
                  track:
                    nc.trackId === 'v2'
                      ? 'V2'
                      : nc.trackId === 'a1'
                      ? 'A1'
                      : nc.trackId === 'a2'
                      ? 'A2'
                      : 'V1',
                  label: nc.title,
                  sourceType: nc.mediaKind === 'audio' ? 'audio' : 'frame',
                  sourceId: nc.sourceShotId || nc.id,
                  mediaUrl: nc.mediaUrl || '',
                  thumbnailUrl: nc.mediaUrl || '',
                  startTimeSec: nc.startSec,
                  durationSec: nc.durationSec,
                  trimInSec: nc.trimStartSec || 0,
                  trimOutSec: nc.durationSec,
                  opacity: nc.opacity ?? 1,
                  volume: nc.volume ?? 1,
                  muted: false,
                  dialogueSubtitle: nc.textContent,
                })),
                updatedAt: new Date().toISOString(),
              }));
            }}
            onOpenLightbox={(item) => setLightboxItem(item)}
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: ANIMATE FRAME MODAL (`AnimateFrameModal` · OMNI 1.1 FLASH) */}
      {/* =================================================================== */}
      {animateModalFrame && (() => {
        const frame = project.frames.find(
          (f) => f.id === animateModalFrame.frameId
        );
        const angle = frame?.angles.find(
          (a) => a.id === animateModalFrame.angleId
        );
        if (!frame || !angle) return null;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-xl w-full rounded-2xl bg-[#141419] border border-white/15 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <div className="text-[10px] font-mono-tabular uppercase text-[#46ecd5]">
                    IMAGE-TO-VIDEO ANIMATION · OMNI 1.1 FLASH / SEEDANCE 2.5
                  </div>
                  <h3 className="font-display text-2xl font-bold uppercase text-white">
                    Shot #{frame.shotNumber} — {angle.angleLabel} ({angle.taxonomyId})
                  </h3>
                </div>
                <button
                  onClick={() => setAnimateModalFrame(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Motion Intensity Control
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Subtle', 'Moderate', 'Dynamic'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() =>
                          setProject((prev) => ({
                            ...prev,
                            frames: prev.frames.map((f) =>
                              f.id === frame.id
                                ? {
                                    ...f,
                                    motionIntensity: lvl,
                                    angles: f.angles.map((a) =>
                                      a.id === angle.id
                                        ? { ...a, motionIntensity: lvl }
                                        : a
                                    ),
                                  }
                                : f
                            ),
                          }))
                        }
                        className={`py-2 rounded-lg font-bold uppercase ${
                          angle.motionIntensity === lvl
                            ? 'bg-[#46ecd5] text-zinc-950'
                            : 'bg-zinc-900 text-zinc-300 border border-white/10'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Camera Rig & Performance Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={angle.cameraPrompt}
                    onChange={(e) =>
                      setProject((prev) => ({
                        ...prev,
                        frames: prev.frames.map((f) =>
                          f.id === frame.id
                            ? {
                                ...f,
                                angles: f.angles.map((a) =>
                                  a.id === angle.id
                                    ? { ...a, cameraPrompt: e.target.value }
                                    : a
                                ),
                              }
                            : f
                        ),
                      }))
                    }
                    className="w-full p-2.5 rounded-lg bg-zinc-900 border border-white/10 text-white"
                  />
                </div>

                {frame.dialogueText && (
                  <div className="p-3 rounded-lg bg-zinc-900 border border-[#46ecd5]/30">
                    <div className="text-[10px] font-mono-tabular text-[#46ecd5] uppercase">
                      Synchronized Dialogue Track
                    </div>
                    <div className="text-zinc-200 mt-0.5">
                      <strong>{frame.dialogueSpeaker}:</strong> "{frame.dialogueText}"
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      enqueueGenerationTasks([
                        {
                          id: `q-vid-${frame.id}-${angle.id}-${Date.now()}`,
                          label: `Shot ${frame.shotNumber} (${angle.angleLabel}) Video`,
                          kind: 'frame_video',
                          targetId: frame.id,
                          angleId: angle.id,
                          prompt: `${angle.cameraPrompt}. Motion Intensity: ${angle.motionIntensity}. ${
                            frame.dialogueText
                              ? `${frame.dialogueSpeaker} speaking: "${frame.dialogueText}"`
                              : ''
                          }`,
                          surface: 'video',
                        },
                      ]);
                      setAnimateModalFrame(null);
                      showToast(
                        `Queued 10s video animation for ${angle.angleLabel}`
                      );
                    }}
                    className="flex-1 w-full py-2.5 px-4 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold uppercase tracking-wider"
                  >
                    Animate Active Angle (10s Clip)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const multiTasks = frame.angles.map((ang) => ({
                        id: `q-vid-multi-${frame.id}-${ang.id}-${Date.now()}`,
                        label: `Shot ${frame.shotNumber} (${ang.angleLabel})`,
                        kind: 'frame_video' as const,
                        targetId: frame.id,
                        angleId: ang.id,
                        prompt: `${ang.cameraPrompt}. Motion Intensity: ${ang.motionIntensity}`,
                        surface: 'video' as const,
                      }));
                      enqueueGenerationTasks(multiTasks);
                      setAnimateModalFrame(null);
                      showToast(
                        `Animating all ${multiTasks.length} camera angles sequentially`
                      );
                    }}
                    className="flex-1 w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 font-bold uppercase tracking-wider"
                  >
                    Animate All {frame.angles.length} Angles Together
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =================================================================== */}
      {/* MODAL 2: DURABLE STORAGE VAULT & SNAPSHOT ROLLBACK MODAL            */}
      {/* =================================================================== */}
      {vaultModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-2xl bg-[#141419] border border-white/15 p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-[10px] font-mono-tabular uppercase text-[#46ecd5]">
                  SYNCHRONOUS LOCAL MIRROR + INDEXEDDB ACID TABLES
                </div>
                <h3 className="font-display text-2xl font-bold uppercase text-white">
                  Storage Vault & Version Snapshots ({snapshots.length} / 40)
                </h3>
              </div>
              <button
                onClick={() => setVaultModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 bg-zinc-900/90 p-3 rounded-xl border border-white/10 text-xs">
              <span className="text-zinc-300">
                Create an instant point-in-time recovery snapshot or export a portable JSON archive.
              </span>
              <button
                onClick={() =>
                  void createCheckpointSnapshot('Manual Vault Checkpoint')
                }
                className="px-3 py-1.5 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold shrink-0"
              >
                + Snapshot Now
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">{snap.reason}</div>
                    <div className="text-[11px] font-mono-tabular text-zinc-400">
                      {new Date(snap.timestamp).toLocaleString()} · {snap.sceneCount}{' '}
                      scenes · {snap.assetCount} assets · {snap.frameCount} shots
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setProject(snap.projectData);
                      await saveProjectToVault(
                        snap.projectData,
                        `Rolled back to snapshot ${new Date(
                          snap.timestamp
                        ).toLocaleTimeString()}`
                      );
                      await refreshVaultLists();
                      setVaultModalOpen(false);
                      showToast('Rolled back project state from Storage Vault');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#46ecd5]/15 hover:bg-[#46ecd5] text-[#46ecd5] hover:text-zinc-950 border border-[#46ecd5]/40 font-bold shrink-0"
                  >
                    Rollback to State
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: PROJECT LIBRARY MODAL (`ProjectLibraryModal`)              */}
      {/* =================================================================== */}
      {projectLibraryOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-2xl bg-[#141419] border border-white/15 p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-[10px] font-mono-tabular uppercase text-[#46ecd5]">
                  MULTI-FILM PRODUCTION VAULT
                </div>
                <h3 className="font-display text-2xl font-bold uppercase text-white">
                  Story Studio Project Library
                </h3>
              </div>
              <button
                onClick={() => setProjectLibraryOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Switch between independent screenplays or create a new film project.
              </span>
              <button
                onClick={async () => {
                  const fresh = createDefaultStoryStudioProject(
                    `New Production #${vaultProjects.length + 1}`
                  );
                  setProject(fresh);
                  await saveProjectToVault(fresh, 'Created New Story Project');
                  await refreshVaultLists();
                  setProjectLibraryOpen(false);
                  showToast(`Created "${fresh.title}"`);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold uppercase"
              >
                + New Story Project
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {vaultProjects.map((vp) => (
                <div
                  key={vp.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                    vp.id === project.id
                      ? 'bg-[#46ecd5]/15 border-[#46ecd5]'
                      : 'bg-zinc-900/80 border-white/10'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white text-sm">{vp.title}</div>
                    <div className="text-[11px] font-mono-tabular text-zinc-400">
                      Updated {new Date(vp.updatedAt).toLocaleString()} ·{' '}
                      {vp.assets.length} assets · {vp.frames.length} shots
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setProject(vp);
                        setProjectLibraryOpen(false);
                        showToast(`Opened "${vp.title}"`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#46ecd5] text-zinc-950 font-bold"
                    >
                      {vp.id === project.id ? 'Active' : 'Open'}
                    </button>
                    {vaultProjects.length > 1 && (
                      <button
                        onClick={async () => {
                          await deleteProjectFromVault(vp.id);
                          await refreshVaultLists();
                        }}
                        className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: NEW CUSTOM ASSET MODAL                                     */}
      {/* =================================================================== */}
      {newAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#141419] border border-white/15 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display text-xl font-bold uppercase text-white">
                Add Continuity or B-Roll Asset
              </h3>
              <button
                onClick={() => setNewAssetModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Category</label>
                <select
                  value={newAssetDraft.category}
                  onChange={(e) =>
                    setNewAssetDraft((prev) => ({
                      ...prev,
                      category: e.target.value as StoryAssetCategory,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white"
                >
                  <option value="Character">Character (Casting Turnaround)</option>
                  <option value="Location">Location (4-Angle Continuity)</option>
                  <option value="Wardrobe">Wardrobe (Mannequin Editorial)</option>
                  <option value="B-Roll">B-Roll & Cutaways (Macro Insert)</option>
                  <option value="Prop">Prop (Hero Studio Object)</option>
                </select>
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">Name</label>
                <input
                  type="text"
                  value={newAssetDraft.name}
                  onChange={(e) =>
                    setNewAssetDraft((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Detective Kemi / Wet Neon Cobblestone Insert"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newAssetDraft.description}
                  onChange={(e) =>
                    setNewAssetDraft((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full p-2.5 rounded-lg bg-zinc-900 border border-white/10 text-white"
                />
              </div>
              <button
                onClick={() => {
                  if (!newAssetDraft.name.trim()) return;
                  const created: StoryStudioAsset = {
                    id: `ast-${Date.now().toString(36)}`,
                    name: newAssetDraft.name.trim(),
                    category: newAssetDraft.category,
                    description:
                      newAssetDraft.description ||
                      `${newAssetDraft.name} (${newAssetDraft.category})`,
                    visualPrompt:
                      newAssetDraft.visualPrompt ||
                      `${newAssetDraft.name}, ${newAssetDraft.category} continuity reference sheet, ${project.globalStyle}`,
                    attributes: {},
                    referenceImageUrl: '',
                    generatedImageUrl: '',
                    turnaroundUrls: [],
                    sceneIds: parsedScenes[0] ? [parsedScenes[0].sceneId] : [],
                    status: 'idle',
                    updatedAt: new Date().toISOString(),
                  };
                  setProject((prev) => ({
                    ...prev,
                    assets: [created, ...prev.assets],
                  }));
                  setNewAssetDraft({
                    name: '',
                    category: 'Character',
                    description: '',
                    visualPrompt: '',
                  });
                  setNewAssetModalOpen(false);
                  showToast(`Added ${created.name} to Stage 2 Assets`);
                }}
                className="w-full py-2.5 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold uppercase"
              >
                Save Asset to Story Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
