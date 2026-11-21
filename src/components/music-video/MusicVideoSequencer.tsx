import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  Copy,
  Download,
  Edit3,
  Film,
  Loader2,
  Mic,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  CharacterProfile,
  ModelEntry,
  MusicVideoAudioTrack,
  MusicVideoGenerationMode,
  MusicVideoScene,
} from '../../types/studio';
import { formatTimecode } from '../../lib/audioEngine';
import { Button } from '../ui/primitives';

export interface MusicVideoSequencerProps {
  scenes: MusicVideoScene[];
  activeSceneId: string | null;
  audioTrack: MusicVideoAudioTrack | null;
  decodedBuffer: AudioBuffer | null;
  characters: CharacterProfile[];
  models: ModelEntry[];
  projectTitle: string;
  onSelectScene: (sceneId: string, jumpToDirector?: boolean) => void;
  onAddScene: (mode: MusicVideoGenerationMode) => void;
  onDuplicateScene: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onMoveScene: (sceneId: string, direction: 'up' | 'down') => void;
  onRegenerateScene: (scene: MusicVideoScene) => Promise<void>;
  onNotify: (msg: string) => void;
}

export const MusicVideoSequencer: React.FC<MusicVideoSequencerProps> = ({
  scenes,
  activeSceneId,
  audioTrack,
  decodedBuffer,
  characters,
  models,
  projectTitle,
  onSelectScene,
  onAddScene,
  onDuplicateScene,
  onDeleteScene,
  onMoveScene,
  onRegenerateScene,
  onNotify,
}) => {
  const masterAudioRef = useRef<HTMLAudioElement | null>(null);
  const stageVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlayingMaster, setIsPlayingMaster] = useState(false);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);

  const orderedScenes = useMemo(
    () => [...scenes].sort((a, b) => a.order - b.order),
    [scenes]
  );

  // Compute total sequence duration (max scene end or audio track duration)
  const totalDurationSec = useMemo(() => {
    const maxSceneEnd = orderedScenes.reduce(
      (max, s) => Math.max(max, s.audioEndSec || 0),
      0
    );
    if (audioTrack?.durationSec) {
      return Math.max(audioTrack.durationSec, maxSceneEnd);
    }
    return Math.max(15, maxSceneEnd);
  }, [orderedScenes, audioTrack?.durationSec]);

  // Determine which scene corresponds to current playhead
  const currentMasterScene = useMemo(() => {
    const matched = orderedScenes.find(
      (s) => playheadSec >= s.audioStartSec && playheadSec < s.audioEndSec
    );
    return matched || orderedScenes[0] || null;
  }, [orderedScenes, playheadSec]);

  // Keep master video element synced to playhead when playing
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const aud = masterAudioRef.current;
      if (aud && !aud.paused) {
        setPlayheadSec(aud.currentTime);
      }
      rafId = requestAnimationFrame(tick);
    };
    if (isPlayingMaster) {
      rafId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafId);
  }, [isPlayingMaster]);

  // Sync stage <video> playback when active scene switches during master playback
  useEffect(() => {
    const vid = stageVideoRef.current;
    if (!vid || !currentMasterScene?.finalVideoUrl) return;

    const offset = Math.max(0, playheadSec - currentMasterScene.audioStartSec);
    if (isPlayingMaster) {
      if (Math.abs(vid.currentTime - offset) > 0.65 && Number.isFinite(vid.duration) && vid.duration > 0) {
        vid.currentTime = offset % vid.duration;
      }
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [currentMasterScene?.id, currentMasterScene?.finalVideoUrl, isPlayingMaster]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (exportedVideoUrl) URL.revokeObjectURL(exportedVideoUrl);
    };
  }, [exportedVideoUrl]);

  const handleToggleMasterPlay = async () => {
    const aud = masterAudioRef.current;
    if (!aud || !audioTrack?.sourceUrl) {
      onNotify('Import a music track first to preview the synced master assembly.');
      return;
    }

    if (isPlayingMaster) {
      aud.pause();
      if (stageVideoRef.current) stageVideoRef.current.pause();
      setIsPlayingMaster(false);
      return;
    }

    try {
      if (aud.currentTime >= totalDurationSec - 0.1) {
        aud.currentTime = 0;
        setPlayheadSec(0);
      }
      await aud.play();
      setIsPlayingMaster(true);
    } catch {
      setIsPlayingMaster(false);
    }
  };

  const handleSeekMaster = (sec: number) => {
    const clamped = Math.max(0, Math.min(totalDurationSec, sec));
    setPlayheadSec(clamped);
    if (masterAudioRef.current) {
      masterAudioRef.current.currentTime = clamped;
    }
  };

  // Assemble & Export Final Music Video (.webm) via Canvas + Web Audio + MediaRecorder
  const handleAssembleExport = async () => {
    if (isExporting) return;
    if (orderedScenes.length === 0) {
      onNotify('Add at least one scene before assembling the final music video.');
      return;
    }
    const visualScenes = orderedScenes.filter((s) => s.finalVideoUrl || s.sceneImageUrl);
    if (visualScenes.length === 0) {
      onNotify('Generate or upload at least one scene frame or video clip before exporting.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      onNotify('Video assembly export is not supported in this browser.');
      return;
    }

    setIsExporting(true);
    setExportProgress(2);

    try {
      const firstRatio = orderedScenes[0]?.aspectRatio || '16:9';
      const canvasW = firstRatio === '9:16' ? 720 : firstRatio === '1:1' ? 960 : 1280;
      const canvasH = firstRatio === '9:16' ? 1280 : firstRatio === '1:1' ? 960 : 720;

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to initialize video assembly canvas');

      // Preload scene visual assets (video or image)
      type LoadedAsset = {
        scene: MusicVideoScene;
        img?: HTMLImageElement;
        vid?: HTMLVideoElement;
      };

      const assets: LoadedAsset[] = [];
      for (const sc of orderedScenes) {
        if (sc.finalVideoUrl) {
          const vid = document.createElement('video');
          vid.crossOrigin = 'anonymous';
          vid.src = sc.finalVideoUrl;
          vid.muted = true;
          vid.playsInline = true;
          vid.loop = true;
          await new Promise<void>((resolve) => {
            const done = () => resolve();
            vid.addEventListener('loadeddata', done, { once: true });
            vid.addEventListener('error', done, { once: true });
            setTimeout(done, 4500);
          });
          assets.push({ scene: sc, vid });
        } else if (sc.sceneImageUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = sc.sceneImageUrl;
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
          assets.push({ scene: sc, img });
        }
      }

      // Compute export span from earliest scene start to latest scene end
      const exportStart = Math.min(...orderedScenes.map((s) => s.audioStartSec));
      const exportEnd = Math.max(...orderedScenes.map((s) => s.audioEndSec));
      const exportDurationSec = Math.max(2, Math.min(exportEnd - exportStart, 90));

      const videoStream = canvas.captureStream(30);
      const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];

      let audioCtx: AudioContext | null = null;
      let audioSource: AudioBufferSourceNode | null = null;

      if (decodedBuffer) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AudioCtx();
        const dest = audioCtx.createMediaStreamDestination();
        audioSource = audioCtx.createBufferSource();
        audioSource.buffer = decodedBuffer;
        audioSource.connect(dest);
        tracks.push(...dest.stream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);
      const preferredMime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: preferredMime,
        videoBitsPerSecond: 4_500_000,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      });

      // Start recording & audio
      recorder.start(250);
      if (audioSource && audioCtx) {
        audioSource.start(0, exportStart, exportDurationSec);
      }

      const startedAt = performance.now();
      let lastPlayingVid: HTMLVideoElement | null = null;

      await new Promise<void>((resolve) => {
        const renderFrame = () => {
          const elapsedSec = (performance.now() - startedAt) / 1000;
          const currentTimelineSec = exportStart + elapsedSec;

          setExportProgress(Math.min(99, Math.round((elapsedSec / exportDurationSec) * 100)));

          // Find scene matching current timeline timestamp
          const activeAsset =
            assets.find(
              (a) =>
                currentTimelineSec >= a.scene.audioStartSec &&
                currentTimelineSec < a.scene.audioEndSec
            ) || assets[assets.length - 1];

          ctx.fillStyle = '#09090B';
          ctx.fillRect(0, 0, canvasW, canvasH);

          if (activeAsset?.vid && activeAsset.vid.readyState >= 2) {
            if (lastPlayingVid !== activeAsset.vid) {
              if (lastPlayingVid) lastPlayingVid.pause();
              activeAsset.vid.currentTime = Math.max(
                0,
                currentTimelineSec - activeAsset.scene.audioStartSec
              );
              activeAsset.vid.play().catch(() => {});
              lastPlayingVid = activeAsset.vid;
            }
            const vw = activeAsset.vid.videoWidth || canvasW;
            const vh = activeAsset.vid.videoHeight || canvasH;
            const scale = Math.max(canvasW / vw, canvasH / vh);
            const dw = vw * scale;
            const dh = vh * scale;
            ctx.drawImage(activeAsset.vid, (canvasW - dw) / 2, (canvasH - dh) / 2, dw, dh);
          } else if (activeAsset?.img && activeAsset.img.naturalWidth > 0) {
            if (lastPlayingVid) {
              lastPlayingVid.pause();
              lastPlayingVid = null;
            }
            // Subtle slow Ken Burns zoom on still storyboard frames
            const sceneSpan = Math.max(
              0.5,
              activeAsset.scene.audioEndSec - activeAsset.scene.audioStartSec
            );
            const t = Math.max(
              0,
              Math.min(1, (currentTimelineSec - activeAsset.scene.audioStartSec) / sceneSpan)
            );
            const zoom = 1 + t * 0.04;
            const iw = activeAsset.img.naturalWidth;
            const ih = activeAsset.img.naturalHeight;
            const scale = Math.max(canvasW / iw, canvasH / ih) * zoom;
            const dw = iw * scale;
            const dh = ih * scale;
            ctx.drawImage(activeAsset.img, (canvasW - dw) / 2, (canvasH - dh) / 2, dw, dh);
          }

          if (elapsedSec >= exportDurationSec) {
            if (lastPlayingVid) lastPlayingVid.pause();
            resolve();
            return;
          }
          requestAnimationFrame(renderFrame);
        };
        requestAnimationFrame(renderFrame);
      });

      if (audioSource) {
        try {
          audioSource.stop();
        } catch {
          // ignore
        }
      }
      if (audioCtx) {
        await audioCtx.close().catch(() => {});
      }
      recorder.stop();

      const finalBlob = await recordingDone;
      if (exportedVideoUrl) URL.revokeObjectURL(exportedVideoUrl);
      const url = URL.createObjectURL(finalBlob);
      setExportedVideoUrl(url);
      setExportProgress(100);
      onNotify('Final music video assembled and ready to download.');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Unable to assemble final music video.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const readyClipsCount = orderedScenes.filter((s) => Boolean(s.finalVideoUrl)).length;

  return (
    <div className="space-y-5">
      {/* Hidden Master Audio Element */}
      {audioTrack?.sourceUrl && (
        <audio
          ref={masterAudioRef}
          src={audioTrack.sourceUrl}
          preload="metadata"
          onEnded={() => setIsPlayingMaster(false)}
        />
      )}

      {/* Master Synced Preview & Assembly Stage */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-7 rounded-2xl bg-[#101218] border border-white/[0.08] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Clapperboard className="w-4 h-4 text-[#46ecd5]" />
              <span className="font-semibold text-white">Master Sequence Monitor</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">
                {currentMasterScene
                  ? `Scene ${String(currentMasterScene.order + 1).padStart(2, '0')} — ${currentMasterScene.title}`
                  : 'No scenes in sequence'}
              </span>
            </div>
            <span className="text-xs font-mono-tabular text-[#46ecd5]">
              {formatTimecode(playheadSec)} / {formatTimecode(totalDurationSec)}
            </span>
          </div>

          <div className="p-4 bg-[#08090C] space-y-3">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-[#0F1219] border border-white/[0.06] flex items-center justify-center">
              {currentMasterScene?.finalVideoUrl ? (
                <video
                  key={currentMasterScene.finalVideoUrl}
                  ref={stageVideoRef}
                  src={currentMasterScene.finalVideoUrl}
                  muted
                  playsInline
                  loop
                  className="w-full h-full object-contain bg-black"
                />
              ) : currentMasterScene?.sceneImageUrl ? (
                <img
                  src={currentMasterScene.sceneImageUrl}
                  alt={currentMasterScene.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center px-6 space-y-1">
                  <p className="text-sm font-medium text-zinc-300">
                    No visual frames rendered yet
                  </p>
                  <p className="text-xs text-zinc-500">
                    Generate Lip-Sync or B-Roll scenes in the Scene Director to watch them cut to the beat here.
                  </p>
                </div>
              )}

              {currentMasterScene && (
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-sm text-[11px] font-mono-tabular text-zinc-200 flex items-center gap-2">
                  <span className="text-[#46ecd5]">
                    {currentMasterScene.mode === 'lip_sync' ? 'LIP SYNC' : 'B-ROLL'}
                  </span>
                  <span className="text-zinc-500">·</span>
                  <span>
                    {formatTimecode(currentMasterScene.audioStartSec)} –{' '}
                    {formatTimecode(currentMasterScene.audioEndSec)}
                  </span>
                </div>
              )}
            </div>

            {/* Master Scrubber & Transport */}
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={totalDurationSec}
                step={0.1}
                value={Math.min(playheadSec, totalDurationSec)}
                onChange={(e) => handleSeekMaster(Number(e.target.value))}
                className="w-full accent-[#46ecd5] cursor-pointer"
                aria-label="Master timeline position"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    onClick={handleToggleMasterPlay}
                  >
                    {isPlayingMaster ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>{isPlayingMaster ? 'Pause Master' : 'Play Synced Cut'}</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSeekMaster(0)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Start</span>
                  </Button>
                </div>

                <div className="text-xs text-zinc-400 font-mono-tabular">
                  {orderedScenes.length} scenes · {readyClipsCount} animated clips ready
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assembly & Export Control Card */}
        <div className="xl:col-span-5 rounded-2xl bg-[#101218] border border-white/[0.08] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Assemble Final Music Video</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Combines your sequenced Lip-Sync performances and B-Roll cuts with the master music track aligned to each scene's non-destructive audio timing.
            </p>
          </div>

          <div className="rounded-xl bg-[#0B0D12] border border-white/[0.06] divide-y divide-white/[0.05] text-xs">
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-zinc-400">Production</span>
              <span className="text-white font-medium truncate max-w-[200px]">
                {projectTitle}
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-zinc-400">Master Audio Track</span>
              <span className="text-zinc-200 truncate max-w-[200px]">
                {audioTrack ? `${audioTrack.name} (${formatTimecode(audioTrack.durationSec)})` : 'Not imported'}
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-zinc-400">Sequence Coverage</span>
              <span className="font-mono-tabular text-[#46ecd5]">
                {orderedScenes.filter((s) => s.mode === 'lip_sync').length} Lip Sync ·{' '}
                {orderedScenes.filter((s) => s.mode === 'b_roll').length} B-Roll
              </span>
            </div>
          </div>

          {isExporting && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">Rendering master music video...</span>
                <span className="font-mono-tabular text-[#46ecd5]">{exportProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#46ecd5] transition-all duration-200"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <Button
              type="button"
              variant="default"
              disabled={isExporting || orderedScenes.length === 0}
              onClick={handleAssembleExport}
              className="w-full h-10 justify-center"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Assembling Master Video...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>Assemble & Render Final Music Video</span>
                </>
              )}
            </Button>

            {exportedVideoUrl && (
              <a
                href={exportedVideoUrl}
                download={`${projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'music-video'}-master.webm`}
                className="w-full h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 hover:bg-emerald-500/25 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Assembled Music Video (.webm)</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Organised Visual Scene Sequence List */}
      <div className="rounded-2xl bg-[#101218] border border-white/[0.08] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Scene Sequence</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Mix Lip-Sync performances and B-Roll cutaways, reorder scenes, regenerate individual clips, or inspect any beat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onAddScene('lip_sync')}
            >
              <Plus className="w-3.5 h-3.5 text-[#46ecd5]" />
              <span>Add Lip-Sync Scene</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onAddScene('b_roll')}
            >
              <Plus className="w-3.5 h-3.5 text-amber-300" />
              <span>Add B-Roll Scene</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2.5">
          {orderedScenes.map((scene, idx) => {
            const isSelected = scene.id === activeSceneId;
            const performerNames = characters
              .filter((c) => scene.characterIds.includes(c.id))
              .map((c) => c.name)
              .join(', ');
            const animModelLabel =
              models.find((m) => m.id === scene.animationModelId)?.label || scene.animationModelId;
            const lipModelLabel =
              scene.mode === 'lip_sync' && scene.lipSyncPipelineType === 'two_stage'
                ? models.find((m) => m.id === scene.lipSyncModelId)?.label
                : null;
            const spanSec = Math.max(0.5, scene.audioEndSec - scene.audioStartSec);

            return (
              <div
                key={scene.id}
                className={`rounded-xl border p-3 flex flex-col md:flex-row md:items-center gap-4 transition-colors ${
                  isSelected
                    ? 'bg-[#151923] border-[#46ecd5]/45'
                    : 'bg-[#0C0E14] border-white/[0.06] hover:border-white/15'
                }`}
              >
                {/* Order + Thumbnail */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveScene(scene.id, 'up')}
                      className="p-1 text-zinc-500 hover:text-white disabled:opacity-25 transition-colors"
                      title="Move scene earlier"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono-tabular text-zinc-400">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      disabled={idx === orderedScenes.length - 1}
                      onClick={() => onMoveScene(scene.id, 'down')}
                      className="p-1 text-zinc-500 hover:text-white disabled:opacity-25 transition-colors"
                      title="Move scene later"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectScene(scene.id, true)}
                    className="relative w-32 h-20 rounded-lg overflow-hidden bg-[#131722] border border-white/[0.08] shrink-0 flex items-center justify-center group"
                  >
                    {scene.finalVideoUrl ? (
                      <video
                        src={scene.finalVideoUrl}
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : scene.sceneImageUrl ? (
                      <img
                        src={scene.sceneImageUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Clapperboard className="w-5 h-5 text-zinc-600" />
                    )}
                  </button>
                </div>

                {/* Scene Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="text-sm font-semibold text-white truncate">
                      {scene.title}
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span
                      className={`text-xs font-medium inline-flex items-center gap-1 ${
                        scene.mode === 'lip_sync' ? 'text-[#46ecd5]' : 'text-amber-300'
                      }`}
                    >
                      {scene.mode === 'lip_sync' ? (
                        <Mic className="w-3 h-3" />
                      ) : (
                        <Film className="w-3 h-3" />
                      )}
                      {scene.mode === 'lip_sync' ? 'Lip Sync Performance' : `B-Roll · ${scene.bRollCategory}`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-400">
                    <span className="font-mono-tabular text-zinc-200">
                      {formatTimecode(scene.audioStartSec)} – {formatTimecode(scene.audioEndSec)} ({spanSec.toFixed(1)}s)
                    </span>
                    <span>·</span>
                    <span>{performerNames || 'No performer assigned'}</span>
                    <span>·</span>
                    <span>
                      {animModelLabel}
                      {lipModelLabel ? ` → ${lipModelLabel}` : ''}
                    </span>
                    <span>·</span>
                    <span className="font-mono-tabular">
                      {scene.aspectRatio} {scene.resolution}
                    </span>
                  </div>

                  <div className="text-[11px]">
                    {scene.status === 'ready' && scene.finalVideoUrl ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Clip rendered & aligned</span>
                      </span>
                    ) : scene.status === 'animating' ||
                      scene.status === 'syncing_lips' ||
                      scene.status === 'generating_image' ? (
                      <span className="inline-flex items-center gap-1 text-[#46ecd5]">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{scene.statusMessage || 'Rendering...'}</span>
                      </span>
                    ) : scene.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1 text-rose-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>{scene.statusMessage || 'Failed — click regenerate to retry'}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-500">
                        {scene.sceneImageUrl
                          ? 'Reference frame ready — awaiting animation'
                          : 'Draft scene — open in Director to design or upload frame'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row Actions */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onSelectScene(scene.id, true)}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Direct</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={
                      scene.status === 'animating' ||
                      scene.status === 'syncing_lips' ||
                      scene.status === 'generating_image'
                    }
                    onClick={() => onRegenerateScene(scene)}
                    title="Generate or regenerate this scene clip"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Regenerate</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => onDuplicateScene(scene.id)}
                    className="h-8 w-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                    title="Duplicate scene"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {orderedScenes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteScene(scene.id)}
                      className="h-8 w-8 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 flex items-center justify-center transition-colors"
                      title="Remove scene from sequence"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
