import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  Film,
  Layers,
  Maximize2,
  Mic,
  Music,
  Pause,
  Play,
  Plus,
  Scissors,
  SkipBack,
  Sparkles,
  Trash2,
  Type as TypeIcon,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import { MediaLightboxItem } from './MediaLightbox';

export type TimelineTrackKind = 'video' | 'overlay' | 'audio' | 'text';
export type TimelineAudioSubKind = 'dialogue' | 'narration' | 'music' | 'sfx';
export type TimelineTransitionType = 'cut' | 'cross_dissolve' | 'dip_to_black' | 'whip_pan' | 'slide';
export type TimelineVfxPreset = 'none' | 'halation_glow' | 'anamorphic_flare' | 'letterbox_239' | 'film_grain' | 'vignette_noir';

export interface TimelineTrackConfig {
  id: string;
  label: string;
  kind: TimelineTrackKind;
  audioRole?: TimelineAudioSubKind;
  muted?: boolean;
  solo?: boolean;
  hidden?: boolean;
  volume?: number; // 0..1
}

export interface TimelineClipItem {
  id: string;
  trackId: string;
  title: string;
  mediaUrl?: string;
  mediaKind: 'video' | 'image' | 'audio' | 'text';
  startSec: number;
  durationSec: number;
  trimStartSec?: number;
  volume?: number; // 0..1
  opacity?: number; // 0..1
  transitionIn?: TimelineTransitionType;
  vfx?: TimelineVfxPreset;
  textContent?: string;
  textPosition?: 'top' | 'center' | 'bottom';
  aspectRatio?: string;
  sourceSceneNumber?: number;
  sourceShotId?: string;
}

interface MultiTrackTimelineEditorProps {
  tracks: TimelineTrackConfig[];
  clips: TimelineClipItem[];
  onChangeTracks: (tracks: TimelineTrackConfig[]) => void;
  onChangeClips: (clips: TimelineClipItem[]) => void;
  onOpenLightbox?: (item: MediaLightboxItem) => void;
  aspectRatio?: string;
  title?: string;
}

const DEFAULT_PX_PER_SEC = 44;

const TRANSITION_LABELS: Array<{ id: TimelineTransitionType; label: string }> = [
  { id: 'cut', label: 'Hard Cut' },
  { id: 'cross_dissolve', label: 'Cross Dissolve' },
  { id: 'dip_to_black', label: 'Dip to Black' },
  { id: 'whip_pan', label: 'Whip Pan' },
  { id: 'slide', label: 'Push Slide' },
];

const VFX_LABELS: Array<{ id: TimelineVfxPreset; label: string }> = [
  { id: 'none', label: 'No VFX' },
  { id: 'halation_glow', label: 'Film Halation' },
  { id: 'anamorphic_flare', label: 'Anamorphic Flare' },
  { id: 'letterbox_239', label: '2.39:1 Letterbox' },
  { id: 'film_grain', label: '35mm Grain' },
  { id: 'vignette_noir', label: 'Vignette Noir' },
];

export const MultiTrackTimelineEditor: React.FC<MultiTrackTimelineEditorProps> = ({
  tracks,
  clips,
  onChangeTracks,
  onChangeClips,
  onOpenLightbox,
  aspectRatio = '16:9',
  title = 'Multitrack Sequence Compositor',
}) => {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pxPerSec, setPxPerSec] = useState(DEFAULT_PX_PER_SEC);
  const [masterMuted, setMasterMuted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imageElementsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const tracksRef = useRef(tracks);
  const clipsRef = useRef(clips);
  tracksRef.current = tracks;
  clipsRef.current = clips;

  // Pointer drag state supporting mouse, touchpad, and touchscreen seamlessly
  const dragStateRef = useRef<{
    clipId: string;
    mode: 'move' | 'trim_left' | 'trim_right';
    startX: number;
    startY: number;
    initialStartSec: number;
    initialDurationSec: number;
    initialTrackId: string;
    initialTrimStartSec: number;
  } | null>(null);

  const totalDurationSec = useMemo(() => {
    const maxEnd = clips.reduce((acc, c) => Math.max(acc, c.startSec + c.durationSec), 12);
    return Math.max(12, Math.ceil(maxEnd + 2));
  }, [clips]);

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) || null,
    [clips, selectedClipId]
  );

  const hasSoloAudioTrack = useMemo(
    () => tracks.some((t) => t.kind === 'audio' && t.solo),
    [tracks]
  );

  // Preload media elements whenever clips change
  useEffect(() => {
    const activeClipIds = new Set(clips.map((c) => c.id));
    clips.forEach((clip) => {
      if (!clip.mediaUrl) return;
      if (clip.mediaKind === 'video' && !videoElementsRef.current.has(clip.mediaUrl)) {
        const vid = document.createElement('video');
        vid.crossOrigin = 'anonymous';
        vid.preload = 'auto';
        vid.muted = true; // Canvas compositor manages audio via track volumes & Audio elements
        vid.playsInline = true;
        vid.src = clip.mediaUrl;
        videoElementsRef.current.set(clip.mediaUrl, vid);
      } else if (clip.mediaKind === 'image' && !imageElementsRef.current.has(clip.mediaUrl)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = clip.mediaUrl;
        imageElementsRef.current.set(clip.mediaUrl, img);
      } else if (clip.mediaKind === 'audio' && !audioElementsRef.current.has(clip.id)) {
        const aud = new Audio(clip.mediaUrl);
        aud.preload = 'auto';
        audioElementsRef.current.set(clip.id, aud);
      }
    });

    // Cleanup removed audio instances
    audioElementsRef.current.forEach((aud, id) => {
      if (!activeClipIds.has(id)) {
        aud.pause();
        audioElementsRef.current.delete(id);
      }
    });
  }, [clips]);

  // Synchronize audio elements with playhead & play state
  const syncAudioAtTime = useCallback(
    (timeSec: number, playing: boolean) => {
      const currentClips = clipsRef.current;
      const currentTracks = tracksRef.current;
      const anySolo = currentTracks.some((t) => t.kind === 'audio' && t.solo);

      currentClips.forEach((clip) => {
        if (clip.mediaKind !== 'audio' || !clip.mediaUrl) return;
        const aud = audioElementsRef.current.get(clip.id);
        if (!aud) return;
        const track = currentTracks.find((t) => t.id === clip.trackId);
        const isTrackAudible =
          !masterMuted &&
          track &&
          !track.muted &&
          !track.hidden &&
          (!anySolo || track.solo);

        const withinRange =
          timeSec >= clip.startSec && timeSec < clip.startSec + clip.durationSec;

        const effectiveVolume = isTrackAudible
          ? Math.max(0, Math.min(1, (track?.volume ?? 1) * (clip.volume ?? 1)))
          : 0;
        aud.volume = effectiveVolume;

        if (playing && withinRange && isTrackAudible) {
          const targetOffset = Math.max(0, timeSec - clip.startSec + (clip.trimStartSec || 0));
          if (Math.abs(aud.currentTime - targetOffset) > 0.35) {
            try {
              aud.currentTime = targetOffset;
            } catch {
              // ignore unbuffered seek
            }
          }
          if (aud.paused) {
            aud.play().catch(() => {});
          }
        } else if (!aud.paused) {
          aud.pause();
        }
      });
    },
    [masterMuted]
  );

  // Canvas double-buffered frame render at playheadSec
  const drawCompositorFrame = useCallback(
    (timeSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, w, h);

      const orderedVisualTracks = [...tracksRef.current]
        .filter((t) => (t.kind === 'video' || t.kind === 'overlay') && !t.hidden)
        .reverse(); // Draw bottom-most track first, top tracks overlay above

      let activeVfx: TimelineVfxPreset = 'none';

      for (const track of orderedVisualTracks) {
        const activeClip = clipsRef.current.find(
          (c) =>
            c.trackId === track.id &&
            timeSec >= c.startSec &&
            timeSec < c.startSec + c.durationSec
        );
        if (!activeClip || !activeClip.mediaUrl) continue;

        if (activeClip.vfx && activeClip.vfx !== 'none') {
          activeVfx = activeClip.vfx;
        }

        const localT = timeSec - activeClip.startSec;
        const transitionLen = Math.min(0.6, activeClip.durationSec * 0.25);
        let alpha = activeClip.opacity ?? (track.kind === 'overlay' ? 0.85 : 1);
        let offsetX = 0;

        if (activeClip.transitionIn === 'cross_dissolve' && localT < transitionLen) {
          alpha *= Math.max(0, localT / transitionLen);
        } else if (activeClip.transitionIn === 'dip_to_black' && localT < transitionLen) {
          alpha *= Math.max(0, localT / transitionLen);
        } else if (activeClip.transitionIn === 'slide' && localT < transitionLen) {
          offsetX = (1 - localT / transitionLen) * w * 0.35;
        } else if (activeClip.transitionIn === 'whip_pan' && localT < transitionLen) {
          offsetX = (1 - localT / transitionLen) * w * 0.6;
        }

        const sourceEl =
          activeClip.mediaKind === 'video'
            ? videoElementsRef.current.get(activeClip.mediaUrl)
            : imageElementsRef.current.get(activeClip.mediaUrl);

        if (!sourceEl) continue;

        let srcW = 0;
        let srcH = 0;
        if (sourceEl instanceof HTMLVideoElement) {
          srcW = sourceEl.videoWidth || 1280;
          srcH = sourceEl.videoHeight || 720;
          const desiredVideoTime = (activeClip.trimStartSec || 0) + localT;
          if (Math.abs(sourceEl.currentTime - desiredVideoTime) > 0.18 && sourceEl.readyState >= 2) {
            try {
              sourceEl.currentTime = desiredVideoTime;
            } catch {
              // ignore
            }
          }
          if (sourceEl.readyState < 2) continue;
        } else {
          srcW = sourceEl.naturalWidth || 1280;
          srcH = sourceEl.naturalHeight || 720;
          if (!sourceEl.complete || srcW === 0) continue;
        }

        // Preserve natural aspect ratio inside compositor (contain, never distort)
        const scale = Math.min(w / srcW, h / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        const drawX = (w - drawW) / 2 + offsetX;
        const drawY = (h - drawH) / 2;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.drawImage(sourceEl, drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      // VFX overlays
      if (activeVfx === 'halation_glow') {
        const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.1, w * 0.5, h * 0.5, w * 0.65);
        grad.addColorStop(0, 'rgba(255, 160, 90, 0.14)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else if (activeVfx === 'anamorphic_flare') {
        const grad = ctx.createLinearGradient(0, h * 0.48, w, h * 0.52);
        grad.addColorStop(0, 'rgba(70,236,213,0)');
        grad.addColorStop(0.5, 'rgba(70,236,213,0.22)');
        grad.addColorStop(1, 'rgba(70,236,213,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, h * 0.47, w, h * 0.06);
      } else if (activeVfx === 'vignette_noir') {
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.72);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.68)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      } else if (activeVfx === 'letterbox_239') {
        const barH = Math.round(h * 0.11);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, barH);
        ctx.fillRect(0, h - barH, w, barH);
      }

      // Draw active Text/Caption tracks
      const textTracks = tracksRef.current.filter((t) => t.kind === 'text' && !t.hidden);
      textTracks.forEach((track) => {
        const textClip = clipsRef.current.find(
          (c) =>
            c.trackId === track.id &&
            timeSec >= c.startSec &&
            timeSec < c.startSec + c.durationSec
        );
        if (!textClip || !(textClip.textContent || textClip.title)) return;

        const caption = textClip.textContent || textClip.title;
        ctx.save();
        ctx.font = `600 ${Math.max(16, Math.round(w * 0.03))}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        const textY =
          textClip.textPosition === 'top'
            ? h * 0.14
            : textClip.textPosition === 'center'
            ? h * 0.52
            : h * 0.88;
        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        const metrics = ctx.measureText(caption);
        const padX = 18;
        const boxW = Math.min(w - 40, metrics.width + padX * 2);
        ctx.fillRect((w - boxW) / 2, textY - 26, boxW, 38);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(caption, w / 2, textY);
        ctx.restore();
      });
    },
    []
  );

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying) {
      syncAudioAtTime(playheadSec, false);
      drawCompositorFrame(playheadSec);
      return;
    }

    let rafId = 0;
    let lastTs = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      setPlayheadSec((prev) => {
        const next = prev + dt;
        if (next >= totalDurationSec) {
          setIsPlaying(false);
          syncAudioAtTime(0, false);
          drawCompositorFrame(0);
          return 0;
        }
        syncAudioAtTime(next, true);
        drawCompositorFrame(next);
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      syncAudioAtTime(playheadSec, false);
    };
  }, [isPlaying, totalDurationSec, drawCompositorFrame, syncAudioAtTime]);

  useEffect(() => {
    drawCompositorFrame(playheadSec);
  }, [playheadSec, clips, tracks, drawCompositorFrame]);

  // Global PointerMove / PointerUp handlers for smooth dragging across tracks and timeline
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const deltaSec = dx / pxPerSec;

      const nextClips = clipsRef.current.map((clip) => {
        if (clip.id !== drag.clipId) return clip;

        if (drag.mode === 'move') {
          const nextStart = Math.max(0, Math.round((drag.initialStartSec + deltaSec) * 10) / 10);
          // Determine vertical track change (row height ~54px)
          const currentIdx = tracksRef.current.findIndex((t) => t.id === drag.initialTrackId);
          const rowShift = Math.round(dy / 54);
          let nextTrackId = drag.initialTrackId;
          if (currentIdx !== -1 && rowShift !== 0) {
            const targetIdx = Math.max(0, Math.min(tracksRef.current.length - 1, currentIdx + rowShift));
            const candidateTrack = tracksRef.current[targetIdx];
            // Keep compatible track types (video/overlay share visual tracks; audio stays in audio; text stays in text)
            const sourceTrack = tracksRef.current[currentIdx];
            const bothVisual =
              (candidateTrack.kind === 'video' || candidateTrack.kind === 'overlay') &&
              (sourceTrack.kind === 'video' || sourceTrack.kind === 'overlay');
            if (candidateTrack && (bothVisual || candidateTrack.kind === sourceTrack.kind)) {
              nextTrackId = candidateTrack.id;
            }
          }
          return { ...clip, startSec: nextStart, trackId: nextTrackId };
        }

        if (drag.mode === 'trim_right') {
          const nextDur = Math.max(0.5, Math.round((drag.initialDurationSec + deltaSec) * 10) / 10);
          return { ...clip, durationSec: nextDur };
        }

        if (drag.mode === 'trim_left') {
          const maxShift = drag.initialDurationSec - 0.5;
          const clampedDelta = Math.max(-drag.initialStartSec, Math.min(maxShift, deltaSec));
          const nextStart = Math.round((drag.initialStartSec + clampedDelta) * 10) / 10;
          const nextDur = Math.round((drag.initialDurationSec - clampedDelta) * 10) / 10;
          const nextTrim = Math.max(0, Math.round((drag.initialTrimStartSec + clampedDelta) * 10) / 10);
          return {
            ...clip,
            startSec: nextStart,
            durationSec: nextDur,
            trimStartSec: nextTrim,
          };
        }
        return clip;
      });

      onChangeClips(nextClips);
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [onChangeClips, pxPerSec]);

  // Actions
  const handleAddTrack = (kind: TimelineTrackKind) => {
    const count = tracks.filter((t) => t.kind === kind).length + 1;
    const prefix = kind === 'video' ? 'V' : kind === 'overlay' ? 'V-Overlay ' : kind === 'text' ? 'T' : 'A';
    const newTrack: TimelineTrackConfig = {
      id: `track_${kind}_${Date.now()}`,
      label: `${prefix}${count} ${kind === 'overlay' ? 'Cutaway' : kind === 'text' ? 'Titles' : kind === 'audio' ? 'Audio Layer' : 'Video Layer'}`,
      kind,
      volume: 1,
    };
    onChangeTracks([...tracks, newTrack]);
  };

  const handleAddTextClip = () => {
    let textTrack = tracks.find((t) => t.kind === 'text');
    let nextTracks = tracks;
    if (!textTrack) {
      textTrack = { id: `track_text_${Date.now()}`, label: 'T1 Titles & Captions', kind: 'text' };
      nextTracks = [textTrack, ...tracks];
      onChangeTracks(nextTracks);
    }
    const newClip: TimelineClipItem = {
      id: `clip_text_${Date.now()}`,
      trackId: textTrack.id,
      title: 'Title Card',
      mediaKind: 'text',
      textContent: 'SCENE TITLE / SUBTITLE',
      textPosition: 'bottom',
      startSec: Math.round(playheadSec * 10) / 10,
      durationSec: 4,
    };
    onChangeClips([...clips, newClip]);
    setSelectedClipId(newClip.id);
  };

  const handleSplitAtPlayhead = () => {
    if (!selectedClip) return;
    const within =
      playheadSec > selectedClip.startSec + 0.3 &&
      playheadSec < selectedClip.startSec + selectedClip.durationSec - 0.3;
    if (!within) return;

    const firstDur = Math.round((playheadSec - selectedClip.startSec) * 10) / 10;
    const secondDur = Math.round((selectedClip.durationSec - firstDur) * 10) / 10;

    const firstHalf: TimelineClipItem = { ...selectedClip, durationSec: firstDur };
    const secondHalf: TimelineClipItem = {
      ...selectedClip,
      id: `${selectedClip.id}_split_${Date.now()}`,
      title: `${selectedClip.title} (B)`,
      startSec: Math.round(playheadSec * 10) / 10,
      durationSec: secondDur,
      trimStartSec: (selectedClip.trimStartSec || 0) + firstDur,
    };

    onChangeClips(
      clips.flatMap((c) => (c.id === selectedClip.id ? [firstHalf, secondHalf] : [c]))
    );
    setSelectedClipId(secondHalf.id);
  };

  const handleDuplicateSelected = () => {
    if (!selectedClip) return;
    const copy: TimelineClipItem = {
      ...selectedClip,
      id: `${selectedClip.id}_dup_${Date.now()}`,
      title: `${selectedClip.title} Copy`,
      startSec: Math.round((selectedClip.startSec + selectedClip.durationSec) * 10) / 10,
    };
    onChangeClips([...clips, copy]);
    setSelectedClipId(copy.id);
  };

  const handleDeleteSelected = () => {
    if (!selectedClip) return;
    onChangeClips(clips.filter((c) => c.id !== selectedClip.id));
    setSelectedClipId(null);
  };

  const handleTrackUpdate = (trackId: string, patch: Partial<TimelineTrackConfig>) => {
    onChangeTracks(tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)));
  };

  const handleClipUpdate = (clipId: string, patch: Partial<TimelineClipItem>) => {
    onChangeClips(clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)));
  };

  const compositorAspectClass = useMemo(() => {
    if (aspectRatio === '9:16') return 'aspect-[9/16] max-h-[340px]';
    if (aspectRatio === '1:1') return 'aspect-square max-h-[340px]';
    if (aspectRatio === '4:3') return 'aspect-[4/3] max-h-[340px]';
    if (aspectRatio === '3:4') return 'aspect-[3/4] max-h-[340px]';
    if (aspectRatio === '21:9') return 'aspect-[21/9] max-h-[300px]';
    return 'aspect-video max-h-[340px]';
  }, [aspectRatio]);

  const canvasDims = useMemo(() => {
    if (aspectRatio === '9:16') return { w: 540, h: 960 };
    if (aspectRatio === '1:1') return { w: 720, h: 720 };
    if (aspectRatio === '4:3') return { w: 960, h: 720 };
    if (aspectRatio === '3:4') return { w: 720, h: 960 };
    if (aspectRatio === '21:9') return { w: 1260, h: 540 };
    return { w: 960, h: 540 };
  }, [aspectRatio]);

  const activeLightboxMedia = useMemo<MediaLightboxItem | null>(() => {
    if (selectedClip?.mediaUrl) {
      return {
        url: selectedClip.mediaUrl,
        kind:
          selectedClip.mediaKind === 'audio'
            ? 'audio'
            : selectedClip.mediaKind === 'video'
            ? 'video'
            : 'image',
        title: selectedClip.title,
        aspectRatio: selectedClip.aspectRatio || aspectRatio,
      };
    }
    const visualTrack = tracks.find((t) => (t.kind === 'video' || t.kind === 'overlay') && !t.hidden);
    const activeVisual = clips.find(
      (c) =>
        (!visualTrack || c.trackId === visualTrack.id) &&
        c.mediaUrl &&
        playheadSec >= c.startSec &&
        playheadSec < c.startSec + c.durationSec
    ) || clips.find((c) => c.mediaUrl);
    if (!activeVisual?.mediaUrl) return null;
    return {
      url: activeVisual.mediaUrl,
      kind:
        activeVisual.mediaKind === 'audio'
          ? 'audio'
          : activeVisual.mediaKind === 'video'
          ? 'video'
          : 'image',
      title: activeVisual.title,
      aspectRatio: activeVisual.aspectRatio || aspectRatio,
    };
  }, [selectedClip, tracks, clips, playheadSec, aspectRatio]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0d10] overflow-hidden flex flex-col max-w-full">
      {/* Top Toolbar */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-white/10 bg-[#0e1116] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-[#46ecd5] shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-white truncate">{title}</span>
          <span className="text-[11px] font-mono text-zinc-400">
            {playheadSec.toFixed(1)}s / {totalDurationSec}s
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setPlayheadSec(0);
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300"
            title="Skip to start"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="px-3 py-1.5 rounded-lg bg-[#46ecd5] hover:bg-[#38d6c0] text-zinc-950 font-semibold text-xs flex items-center gap-1.5"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => setMasterMuted((m) => !m)}
            className={`p-1.5 rounded-lg border text-xs ${
              masterMuted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
            }`}
            title={masterMuted ? 'Unmute Master' : 'Mute Master'}
          >
            {masterMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={handleAddTextClip}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs flex items-center gap-1"
          >
            <TypeIcon className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">+ Text</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddTrack('overlay')}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 text-[#46ecd5]" />
            <span className="hidden sm:inline">+ Layer</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddTrack('audio')}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs flex items-center gap-1"
          >
            <Music className="w-3.5 h-3.5 text-indigo-300" />
            <span className="hidden sm:inline">+ Audio</span>
          </button>

          {selectedClip && (
            <>
              <button
                type="button"
                onClick={handleSplitAtPlayhead}
                className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs flex items-center gap-1"
                title="Split clip at playhead"
              >
                <Scissors className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDuplicateSelected}
                className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs flex items-center gap-1"
                title="Duplicate clip"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-2 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1"
                title="Delete clip"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Compositor Stage + Selected Clip Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-white/10 bg-[#060709]">
        <div className="lg:col-span-8 p-3 flex flex-col items-center justify-center relative bg-black/80">
          <div className={`relative w-full mx-auto flex items-center justify-center ${compositorAspectClass}`}>
            <canvas
              ref={canvasRef}
              width={canvasDims.w}
              height={canvasDims.h}
              className="w-full h-full object-contain rounded-xl border border-white/10 bg-black shadow-2xl"
            />
            {activeLightboxMedia && onOpenLightbox && (
              <button
                type="button"
                onClick={() => onOpenLightbox(activeLightboxMedia)}
                className="absolute top-2.5 right-2.5 p-2 rounded-lg bg-black/70 hover:bg-black text-white border border-white/15 backdrop-blur-sm"
                title="Open in Full Lightbox"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Playhead scrubber slider */}
          <div className="w-full mt-2.5 flex items-center gap-3 px-1">
            <span className="text-[11px] font-mono text-zinc-400 w-10">{playheadSec.toFixed(1)}s</span>
            <input
              type="range"
              min={0}
              max={totalDurationSec}
              step={0.1}
              value={playheadSec}
              onChange={(e) => {
                setIsPlaying(false);
                setPlayheadSec(Number(e.target.value));
              }}
              className="flex-1 accent-[#46ecd5] cursor-pointer"
            />
            <div className="flex items-center gap-1 text-[11px] text-zinc-400">
              <span>Zoom</span>
              <input
                type="range"
                min={24}
                max={96}
                value={pxPerSec}
                onChange={(e) => setPxPerSec(Number(e.target.value))}
                className="w-16 accent-[#46ecd5]"
              />
            </div>
          </div>
        </div>

        {/* Clip Properties Inspector */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-white/10 p-3 space-y-3 bg-[#0c0e13]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Clip & Layer Inspector
            </span>
            {selectedClip && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#46ecd5]/15 text-[#46ecd5]">
                {selectedClip.mediaKind.toUpperCase()}
              </span>
            )}
          </div>

          {!selectedClip ? (
            <p className="text-xs text-zinc-500 leading-relaxed">
              Select any clip on the timeline to adjust volume, transitions, VFX, opacity, trim, or text captions. Drag clips horizontally in time or vertically across compatible tracks.
            </p>
          ) : (
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Clip Title</label>
                <input
                  value={selectedClip.title}
                  onChange={(e) => handleClipUpdate(selectedClip.id, { title: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Start (s)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={selectedClip.startSec}
                    onChange={(e) =>
                      handleClipUpdate(selectedClip.id, { startSec: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Duration (s)</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.1}
                    value={selectedClip.durationSec}
                    onChange={(e) =>
                      handleClipUpdate(selectedClip.id, { durationSec: Math.max(0.5, Number(e.target.value)) })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white"
                  />
                </div>
              </div>

              {selectedClip.mediaKind === 'text' ? (
                <>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Title / Caption Text</label>
                    <input
                      value={selectedClip.textContent || ''}
                      onChange={(e) => handleClipUpdate(selectedClip.id, { textContent: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Position</label>
                    <select
                      value={selectedClip.textPosition || 'bottom'}
                      onChange={(e) =>
                        handleClipUpdate(selectedClip.id, {
                          textPosition: e.target.value as 'top' | 'center' | 'bottom',
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white"
                    >
                      <option value="top">Top</option>
                      <option value="center">Center</option>
                      <option value="bottom">Bottom Subtitles</option>
                    </select>
                  </div>
                </>
              ) : selectedClip.mediaKind === 'audio' ? (
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Clip Volume ({Math.round((selectedClip.volume ?? 1) * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedClip.volume ?? 1}
                    onChange={(e) => handleClipUpdate(selectedClip.id, { volume: Number(e.target.value) })}
                    className="w-full accent-[#46ecd5]"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Transition In</label>
                      <select
                        value={selectedClip.transitionIn || 'cut'}
                        onChange={(e) =>
                          handleClipUpdate(selectedClip.id, {
                            transitionIn: e.target.value as TimelineTransitionType,
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white"
                      >
                        {TRANSITION_LABELS.map((tr) => (
                          <option key={tr.id} value={tr.id}>
                            {tr.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Visual FX</label>
                      <select
                        value={selectedClip.vfx || 'none'}
                        onChange={(e) =>
                          handleClipUpdate(selectedClip.id, { vfx: e.target.value as TimelineVfxPreset })
                        }
                        className="w-full px-2 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white"
                      >
                        {VFX_LABELS.map((fx) => (
                          <option key={fx.id} value={fx.id}>
                            {fx.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      Layer Opacity ({Math.round((selectedClip.opacity ?? 1) * 100)}%)
                    </label>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={selectedClip.opacity ?? 1}
                      onChange={(e) => handleClipUpdate(selectedClip.id, { opacity: Number(e.target.value) })}
                      className="w-full accent-[#46ecd5]"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Multi-track Scrollable Lanes */}
      <div className="flex w-full overflow-hidden">
        {/* Track Headers */}
        <div className="w-40 sm:w-52 shrink-0 border-r border-white/10 bg-[#0d1015]">
          <div className="h-7 border-b border-white/10 px-2.5 flex items-center text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Tracks
          </div>
          {tracks.map((track) => (
            <div
              key={track.id}
              className="h-[54px] border-b border-white/5 px-2.5 flex items-center justify-between gap-1.5"
            >
              <div className="min-w-0 flex items-center gap-1.5">
                {track.kind === 'video' || track.kind === 'overlay' ? (
                  <Film className="w-3.5 h-3.5 text-[#46ecd5] shrink-0" />
                ) : track.kind === 'text' ? (
                  <TypeIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                ) : track.audioRole === 'dialogue' || track.audioRole === 'narration' ? (
                  <Mic className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                ) : track.audioRole === 'sfx' ? (
                  <Wand2 className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
                ) : (
                  <Music className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                )}
                <span className="text-[11px] font-medium text-zinc-200 truncate">{track.label}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {track.kind === 'audio' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleTrackUpdate(track.id, { muted: !track.muted })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        track.muted ? 'bg-rose-500/30 text-rose-200' : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                      title="Mute Track"
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTrackUpdate(track.id, { solo: !track.solo })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        track.solo ? 'bg-amber-400 text-zinc-950' : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                      title="Solo Track"
                    >
                      S
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTrackUpdate(track.id, { hidden: !track.hidden })}
                    className="p-1 rounded bg-white/5 text-zinc-400 hover:text-white"
                    title={track.hidden ? 'Show Layer' : 'Hide Layer'}
                  >
                    {track.hidden ? <EyeOff className="w-3 h-3 text-rose-300" /> : <Eye className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Clip Lanes */}
        <div
          ref={timelineScrollRef}
          className="flex-1 overflow-x-auto no-scrollbar relative bg-[#080a0e]"
        >
          <div
            style={{ width: `${Math.max(700, totalDurationSec * pxPerSec)}px` }}
            className="relative select-none"
          >
            {/* Time Ruler */}
            <div
              className="h-7 border-b border-white/10 relative cursor-pointer bg-[#0e1116]"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setIsPlaying(false);
                setPlayheadSec(Math.max(0, Math.min(totalDurationSec, x / pxPerSec)));
              }}
            >
              {Array.from({ length: totalDurationSec + 1 }).map((_, sec) => (
                <div
                  key={sec}
                  style={{ left: `${sec * pxPerSec}px` }}
                  className="absolute top-0 bottom-0 border-l border-white/10 pl-1 text-[9px] font-mono text-zinc-500 pt-1"
                >
                  {sec % 2 === 0 ? `${sec}s` : ''}
                </div>
              ))}
            </div>

            {/* Track Rows */}
            {tracks.map((track) => {
              const trackClips = clips.filter((c) => c.trackId === track.id);
              const isAudible =
                track.kind !== 'audio' ||
                (!track.muted && (!hasSoloAudioTrack || track.solo));
              return (
                <div
                  key={track.id}
                  className={`h-[54px] border-b border-white/5 relative ${
                    track.hidden || !isAudible ? 'opacity-45' : ''
                  }`}
                >
                  {trackClips.map((clip) => {
                    const isSelected = clip.id === selectedClipId;
                    const leftPx = clip.startSec * pxPerSec;
                    const widthPx = Math.max(26, clip.durationSec * pxPerSec);
                    const badgeColor =
                      clip.mediaKind === 'audio'
                        ? 'bg-indigo-500/25 border-indigo-400/50 text-indigo-100'
                        : clip.mediaKind === 'text'
                        ? 'bg-amber-500/25 border-amber-400/50 text-amber-100'
                        : track.kind === 'overlay'
                        ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-100'
                        : 'bg-[#46ecd5]/20 border-[#46ecd5]/60 text-white';

                    return (
                      <div
                        key={clip.id}
                        style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                          dragStateRef.current = {
                            clipId: clip.id,
                            mode: 'move',
                            startX: e.clientX,
                            startY: e.clientY,
                            initialStartSec: clip.startSec,
                            initialDurationSec: clip.durationSec,
                            initialTrackId: clip.trackId,
                            initialTrimStartSec: clip.trimStartSec || 0,
                          };
                        }}
                        className={`absolute top-1.5 bottom-1.5 rounded-lg border px-2 flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing touch-none overflow-hidden ${badgeColor} ${
                          isSelected ? 'ring-2 ring-white shadow-lg z-10' : ''
                        }`}
                      >
                        {/* Left trim handle */}
                        <div
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            dragStateRef.current = {
                              clipId: clip.id,
                              mode: 'trim_left',
                              startX: e.clientX,
                              startY: e.clientY,
                              initialStartSec: clip.startSec,
                              initialDurationSec: clip.durationSec,
                              initialTrackId: clip.trackId,
                              initialTrimStartSec: clip.trimStartSec || 0,
                            };
                          }}
                          className="w-1.5 h-full -ml-1.5 cursor-ew-resize hover:bg-white/60 rounded-l shrink-0"
                        />

                        <div className="min-w-0 flex-1 flex items-center gap-1.5">
                          <span className="text-[11px] font-medium truncate">{clip.title}</span>
                          {clip.vfx && clip.vfx !== 'none' && (
                            <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                          )}
                        </div>

                        {/* Right trim handle */}
                        <div
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            dragStateRef.current = {
                              clipId: clip.id,
                              mode: 'trim_right',
                              startX: e.clientX,
                              startY: e.clientY,
                              initialStartSec: clip.startSec,
                              initialDurationSec: clip.durationSec,
                              initialTrackId: clip.trackId,
                              initialTrimStartSec: clip.trimStartSec || 0,
                            };
                          }}
                          className="w-1.5 h-full -mr-1.5 cursor-ew-resize hover:bg-white/60 rounded-r shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Playhead vertical needle */}
            <div
              style={{ left: `${playheadSec * pxPerSec}px` }}
              className="absolute top-0 bottom-0 w-0.5 bg-[#46ecd5] pointer-events-none z-20"
            >
              <div className="w-2.5 h-2.5 -ml-1 bg-[#46ecd5] rotate-45 -mt-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
