import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Scissors,
  SkipBack,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  DecodedAudioTrack,
  clampTrimRange,
  formatTimecode,
  formatTimecodeShort,
} from '../lib/audioTrim';

export interface TimelineSceneMarker {
  id: string;
  index: number;
  title: string;
  mode: 'lipsync' | 'broll';
  startSec: number;
  endSec: number;
  hasRenderedVideo: boolean;
  isActive: boolean;
}

interface MusicVideoAudioTimelineProps {
  track: DecodedAudioTrack;
  trimStartSec: number;
  trimEndSec: number;
  onChangeTrim: (startSec: number, endSec: number) => void;
  sceneMarkers?: TimelineSceneMarker[];
  onSelectSceneMarker?: (sceneId: string) => void;
  /** Optional external audio ref so parent can pause master track when previewing rendered clips */
  externalPauseSignal?: number;
}

type DragTarget = 'start' | 'end' | 'window' | 'scrub' | null;

export const MusicVideoAudioTimeline: React.FC<MusicVideoAudioTimelineProps> = ({
  track,
  trimStartSec,
  trimEndSec,
  onChangeTrim,
  sceneMarkers = [],
  onSelectSceneMarker,
  externalPauseSignal = 0,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<'full' | 'segment'>('segment');
  const [loopSegment, setLoopSegment] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);

  const dragOriginRef = useRef<{
    pointerSec: number;
    origStart: number;
    origEnd: number;
  }>({ pointerSec: 0, origStart: trimStartSec, origEnd: trimEndSec });

  const duration = Math.max(0.5, track.durationSec || 0.5);
  const selectedDuration = Math.max(0, trimEndSec - trimStartSec);

  // Sync audio element volume & mute
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
    audio.muted = muted;
  }, [volume, muted]);

  // External pause signal (e.g. when Assembly Player starts)
  useEffect(() => {
    if (externalPauseSignal > 0 && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [externalPauseSignal]);

  // Reset playhead when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  }, [track.id, track.objectUrl]);

  // Smooth RAF playhead & segment boundary enforcement
  useEffect(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        const now = audio.currentTime;
        setCurrentTime(now);
        if (playMode === 'segment' && now >= trimEndSec - 0.03) {
          if (loopSegment) {
            audio.currentTime = trimStartSec;
            setCurrentTime(trimStartSec);
          } else {
            audio.pause();
            audio.currentTime = trimStartSec;
            setCurrentTime(trimStartSec);
            setIsPlaying(false);
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, playMode, loopSegment, trimStartSec, trimEndSec]);

  // Draw crisp HiDPI waveform on Canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(rect.width * dpr);
    const height = Math.floor(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    const peaks = track.peaks.length > 0 ? track.peaks : [0.2];
    const barCount = peaks.length;
    const gap = Math.max(1, Math.floor(dpr * 1.5));
    const barWidth = Math.max(1.5 * dpr, (width - gap * (barCount - 1)) / barCount);
    const midY = height * 0.5;
    const maxBarHeight = height * 0.84;

    const startRatio = trimStartSec / duration;
    const endRatio = trimEndSec / duration;
    const playRatio = currentTime / duration;

    // Subtle center baseline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(0, midY - 0.5 * dpr, width, 1 * dpr);

    for (let i = 0; i < barCount; i++) {
      const ratio = (i + 0.5) / barCount;
      const inSelection = ratio >= startRatio && ratio <= endRatio;
      const isPlayed = ratio <= playRatio;

      const amp = Math.max(0.08, peaks[i]);
      const h = Math.max(3 * dpr, amp * maxBarHeight);
      const x = i * (barWidth + gap);
      const y = midY - h / 2;

      if (inSelection) {
        ctx.fillStyle = isPlayed ? '#72f7e4' : '#46ecd5';
      } else {
        ctx.fillStyle = isPlayed ? 'rgba(161, 161, 170, 0.45)' : 'rgba(113, 113, 122, 0.30)';
      }

      const radius = Math.min(barWidth * 0.45, 2 * dpr);
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, h, radius);
      } else {
        ctx.rect(x, y, barWidth, h);
      }
      ctx.fill();
    }
  }, [track.peaks, trimStartSec, trimEndSec, duration, currentTime]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => drawWaveform());
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawWaveform]);

  // Playback handlers
  const handleTogglePlay = async (mode: 'full' | 'segment') => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && playMode === mode) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    setPlayMode(mode);
    if (mode === 'segment') {
      if (audio.currentTime < trimStartSec || audio.currentTime >= trimEndSec - 0.08) {
        audio.currentTime = trimStartSec;
        setCurrentTime(trimStartSec);
      }
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const handleJumpToTrimStart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = trimStartSec;
    setCurrentTime(trimStartSec);
  };

  const clientXToSeconds = (clientX: number): number => {
    const el = timelineRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    return Math.round(ratio * duration * 100) / 100;
  };

  const startDrag = (target: DragTarget, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const pointerSec = clientXToSeconds(e.clientX);
    dragOriginRef.current = {
      pointerSec,
      origStart: trimStartSec,
      origEnd: trimEndSec,
    };
    setDragTarget(target);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    if (target === 'scrub' && audioRef.current) {
      audioRef.current.currentTime = pointerSec;
      setCurrentTime(pointerSec);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragTarget) return;
    const sec = clientXToSeconds(e.clientX);
    const { pointerSec, origStart, origEnd } = dragOriginRef.current;

    if (dragTarget === 'scrub') {
      if (audioRef.current) {
        audioRef.current.currentTime = sec;
      }
      setCurrentTime(sec);
      return;
    }

    if (dragTarget === 'start') {
      const next = clampTrimRange(Math.min(sec, origEnd - 0.5), origEnd, duration, 0.5);
      onChangeTrim(next.startSec, next.endSec);
      if (audioRef.current && !isPlaying) {
        audioRef.current.currentTime = next.startSec;
        setCurrentTime(next.startSec);
      }
      return;
    }

    if (dragTarget === 'end') {
      const next = clampTrimRange(origStart, Math.max(sec, origStart + 0.5), duration, 0.5);
      onChangeTrim(next.startSec, next.endSec);
      return;
    }

    if (dragTarget === 'window') {
      const delta = sec - pointerSec;
      const span = origEnd - origStart;
      let nextStart = origStart + delta;
      if (nextStart < 0) nextStart = 0;
      if (nextStart + span > duration) nextStart = Math.max(0, duration - span);
      const next = clampTrimRange(nextStart, nextStart + span, duration, 0.5);
      onChangeTrim(next.startSec, next.endSec);
    }
  };

  const handlePointerUp = () => {
    if (dragTarget) {
      setDragTarget(null);
    }
  };

  const applyPresetLength = (lenSec: number) => {
    const start = Math.min(trimStartSec, Math.max(0, duration - Math.min(lenSec, duration)));
    const next = clampTrimRange(start, start + lenSec, duration, 0.5);
    onChangeTrim(next.startSec, next.endSec);
    if (audioRef.current) {
      audioRef.current.currentTime = next.startSec;
      setCurrentTime(next.startSec);
    }
  };

  const nudgeTrim = (edge: 'start' | 'end', deltaSec: number) => {
    if (edge === 'start') {
      const next = clampTrimRange(trimStartSec + deltaSec, trimEndSec, duration, 0.5);
      onChangeTrim(next.startSec, next.endSec);
    } else {
      const next = clampTrimRange(trimStartSec, trimEndSec + deltaSec, duration, 0.5);
      onChangeTrim(next.startSec, next.endSec);
    }
  };

  const startPct = (trimStartSec / duration) * 100;
  const endPct = (trimEndSec / duration) * 100;
  const playPct = Math.max(0, Math.min(100, (currentTime / duration) * 100));

  // Generate 5–6 evenly spaced ruler ticks
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (duration / tickCount) * i);

  return (
    <div
      className="bg-[#111216] border border-white/10 rounded-xl p-3.5 sm:p-4 space-y-3 select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <audio
        ref={audioRef}
        src={track.objectUrl}
        preload="auto"
        onEnded={() => setIsPlaying(false)}
      />

      {/* Top Transport & Timecode Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTogglePlay('segment')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              isPlaying && playMode === 'segment'
                ? 'bg-[#46ecd5] text-zinc-950'
                : 'bg-[#46ecd5]/15 hover:bg-[#46ecd5]/25 text-[#46ecd5] border border-[#46ecd5]/35'
            }`}
          >
            {isPlaying && playMode === 'segment' ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Preview Selection</span>
          </button>

          <button
            type="button"
            onClick={() => handleTogglePlay('full')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              isPlaying && playMode === 'full'
                ? 'bg-white/15 border-white/25 text-white'
                : 'bg-[#18191F] border-white/10 text-zinc-300 hover:text-white'
            }`}
          >
            {isPlaying && playMode === 'full' ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>Full Track</span>
          </button>

          <button
            type="button"
            onClick={handleJumpToTrimStart}
            title="Jump to trim start"
            className="p-1.5 rounded-lg bg-[#18191F] border border-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setLoopSegment((v) => !v)}
            title={loopSegment ? 'Looping selection enabled' : 'Looping selection disabled'}
            className={`p-1.5 rounded-lg border transition-colors ${
              loopSegment
                ? 'bg-[#46ecd5]/15 border-[#46ecd5]/40 text-[#46ecd5]'
                : 'bg-[#18191F] border-white/10 text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center Readout: Current / Total & Selected Segment */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <div className="font-mono-tabular text-zinc-200">
            <span className="text-[#46ecd5] font-semibold">{formatTimecode(currentTime)}</span>
            <span className="text-zinc-600 mx-1">/</span>
            <span className="text-zinc-400">{formatTimecode(duration)}</span>
          </div>
          <div className="h-3.5 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Scissors className="w-3.5 h-3.5 text-[#46ecd5]" />
            <span className="font-mono-tabular text-zinc-200">
              {formatTimecode(trimStartSec)} – {formatTimecode(trimEndSec)}
            </span>
            <span className="text-zinc-500">·</span>
            <span className="font-mono-tabular font-semibold text-[#46ecd5]">
              {selectedDuration.toFixed(1)}s selected
            </span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((v) => !v)}
            className="p-1 text-zinc-400 hover:text-white transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const next = parseFloat(e.target.value);
              setVolume(next);
              if (next > 0 && muted) setMuted(false);
            }}
            aria-label="Audio volume"
            className="w-20 accent-[#46ecd5] cursor-pointer h-1 bg-zinc-700 rounded-lg"
          />
        </div>
      </div>

      {/* Time Ruler */}
      <div className="flex items-center justify-between text-[10px] font-mono-tabular text-zinc-500 px-0.5">
        {ticks.map((t, i) => (
          <span key={i}>{formatTimecodeShort(t)}</span>
        ))}
      </div>

      {/* Interactive Waveform Stage */}
      <div
        ref={timelineRef}
        onPointerDown={(e) => startDrag('scrub', e)}
        className="relative h-24 sm:h-28 rounded-lg bg-[#0A0B0E] border border-white/10 overflow-hidden cursor-crosshair touch-none"
      >
        {/* Canvas Waveform */}
        <canvas ref={canvasRef} className="w-full h-full block pointer-events-none" />

        {/* Shaded Non-Selected Left Region */}
        <div
          className="absolute inset-y-0 left-0 bg-black/55 pointer-events-none"
          style={{ width: `${startPct}%` }}
        />

        {/* Shaded Non-Selected Right Region */}
        <div
          className="absolute inset-y-0 right-0 bg-black/55 pointer-events-none"
          style={{ width: `${Math.max(0, 100 - endPct)}%` }}
        />

        {/* Active Trim Window (Draggable horizontally to reposition selection) */}
        <div
          onPointerDown={(e) => startDrag('window', e)}
          title="Drag to move selected audio window"
          className="absolute inset-y-0 border-y-2 border-[#46ecd5]/80 bg-[#46ecd5]/[0.07] cursor-grab active:cursor-grabbing"
          style={{
            left: `${startPct}%`,
            width: `${Math.max(0.5, endPct - startPct)}%`,
          }}
        />

        {/* Draggable Start Trim Handle */}
        <div
          onPointerDown={(e) => startDrag('start', e)}
          role="slider"
          aria-label="Trim start time"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={trimStartSec}
          title={`Start: ${formatTimecode(trimStartSec)} (drag to trim)`}
          className="absolute inset-y-0 z-20 w-4 -ml-2 cursor-ew-resize flex items-center justify-center group"
          style={{ left: `${startPct}%` }}
        >
          <div className="w-1 h-full bg-[#46ecd5] group-hover:w-1.5 transition-all" />
          <div className="absolute top-1.5 w-3.5 h-6 rounded-sm bg-[#46ecd5] text-zinc-950 flex items-center justify-center shadow-md font-bold text-[9px]">
            ‹
          </div>
        </div>

        {/* Draggable End Trim Handle */}
        <div
          onPointerDown={(e) => startDrag('end', e)}
          role="slider"
          aria-label="Trim end time"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={trimEndSec}
          title={`End: ${formatTimecode(trimEndSec)} (drag to trim)`}
          className="absolute inset-y-0 z-20 w-4 -ml-2 cursor-ew-resize flex items-center justify-center group"
          style={{ left: `${endPct}%` }}
        >
          <div className="w-1 h-full bg-[#46ecd5] group-hover:w-1.5 transition-all" />
          <div className="absolute top-1.5 w-3.5 h-6 rounded-sm bg-[#46ecd5] text-zinc-950 flex items-center justify-center shadow-md font-bold text-[9px]">
            ›
          </div>
        </div>

        {/* Live Playhead */}
        <div
          className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-30 pointer-events-none"
          style={{ left: `${playPct}%` }}
        >
          <div className="w-2.5 h-2.5 -ml-1 -mt-0.5 rotate-45 bg-white" />
        </div>
      </div>

      {/* Scene Coverage Track (shows every scene's assigned segment on the master song) */}
      {sceneMarkers.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span>Scene Audio Coverage ({sceneMarkers.length} scenes mapped)</span>
            <span>Click any scene bar to load its audio segment</span>
          </div>
          <div className="relative h-6 rounded bg-[#0A0B0E] border border-white/10 overflow-hidden">
            {sceneMarkers.map((marker) => {
              const left = Math.max(0, Math.min(100, (marker.startSec / duration) * 100));
              const width = Math.max(
                2.5,
                Math.min(100 - left, ((marker.endSec - marker.startSec) / duration) * 100)
              );
              const isLip = marker.mode === 'lipsync';
              return (
                <button
                  key={marker.id}
                  type="button"
                  onClick={() => onSelectSceneMarker?.(marker.id)}
                  title={`Scene ${marker.index + 1}: ${marker.title} (${formatTimecode(marker.startSec)} – ${formatTimecode(marker.endSec)})`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  className={`absolute top-0.5 bottom-0.5 rounded-sm px-1.5 text-[10px] font-mono-tabular truncate text-left transition-all ${
                    marker.isActive
                      ? 'bg-[#46ecd5] text-zinc-950 font-bold z-10'
                      : isLip
                      ? 'bg-emerald-500/30 hover:bg-emerald-500/45 text-emerald-100 border border-emerald-400/40'
                      : 'bg-sky-500/25 hover:bg-sky-500/40 text-sky-100 border border-sky-400/40'
                  }`}
                >
                  S{marker.index + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fine Trim Controls & Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-[11px]">
        <div className="flex flex-wrap items-center gap-2 text-zinc-400">
          <span className="text-zinc-500">In:</span>
          <div className="inline-flex items-center rounded-md bg-[#18191F] border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => nudgeTrim('start', -0.5)}
              className="px-1.5 py-0.5 hover:bg-white/10 text-zinc-300"
            >
              -0.5s
            </button>
            <span className="px-2 py-0.5 font-mono-tabular text-white border-x border-white/10">
              {formatTimecode(trimStartSec)}
            </span>
            <button
              type="button"
              onClick={() => nudgeTrim('start', 0.5)}
              className="px-1.5 py-0.5 hover:bg-white/10 text-zinc-300"
            >
              +0.5s
            </button>
          </div>

          <span className="text-zinc-500 ml-1">Out:</span>
          <div className="inline-flex items-center rounded-md bg-[#18191F] border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => nudgeTrim('end', -0.5)}
              className="px-1.5 py-0.5 hover:bg-white/10 text-zinc-300"
            >
              -0.5s
            </button>
            <span className="px-2 py-0.5 font-mono-tabular text-white border-x border-white/10">
              {formatTimecode(trimEndSec)}
            </span>
            <button
              type="button"
              onClick={() => nudgeTrim('end', 0.5)}
              className="px-1.5 py-0.5 hover:bg-white/10 text-zinc-300"
            >
              +0.5s
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-zinc-500 mr-0.5">Clip length:</span>
          {[5, 8, 10, 15].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => applyPresetLength(sec)}
              className="px-2 py-0.5 rounded bg-[#18191F] hover:bg-[#23252E] border border-white/10 text-zinc-300 font-mono-tabular transition-colors"
            >
              {sec}s
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChangeTrim(0, Math.min(duration, Math.max(duration, 0.5)))}
            className="px-2 py-0.5 rounded bg-[#18191F] hover:bg-[#23252E] border border-white/10 text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            title="Reset trim handles to full track (original file is never modified)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Full</span>
          </button>
        </div>
      </div>
    </div>
  );
};
