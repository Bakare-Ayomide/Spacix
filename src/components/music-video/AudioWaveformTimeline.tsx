import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Link2,
  Loader2,
  Music,
  Pause,
  Play,
  Repeat,
  Scissors,
  Upload,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { MusicVideoAudioTrack, MusicVideoScene } from '../../types/studio';
import {
  decodeAudioArrayBuffer,
  extractWaveformPeaks,
  fileToDataUrl,
  formatTimecode,
} from '../../lib/audioEngine';
import { Button, Input } from '../ui/primitives';

export interface AudioWaveformTimelineProps {
  audioTrack: MusicVideoAudioTrack | null;
  decodedBuffer: AudioBuffer | null;
  trimStartSec: number;
  trimEndSec: number;
  scenes: MusicVideoScene[];
  activeSceneId: string | null;
  sessionToken: string;
  onImportAudioComplete: (track: MusicVideoAudioTrack, buffer: AudioBuffer) => void;
  onTrimChange: (startSec: number, endSec: number) => void;
  onSelectScene?: (sceneId: string) => void;
  onNotify: (msg: string) => void;
}

type DragTarget = 'start' | 'end' | 'window' | 'scrub' | null;

export const AudioWaveformTimeline: React.FC<AudioWaveformTimelineProps> = ({
  audioTrack,
  decodedBuffer,
  trimStartSec,
  trimEndSec,
  scenes,
  activeSceneId,
  sessionToken,
  onImportAudioComplete,
  onTrimChange,
  onSelectScene,
  onNotify,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineWrapRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [importMode, setImportMode] = useState<'upload' | 'url'>('upload');
  const [audioUrlInput, setAudioUrlInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewSegmentOnly, setPreviewSegmentOnly] = useState(false);
  const [loopSegment, setLoopSegment] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.88);
  const [muted, setMuted] = useState(false);
  const [zoom, setZoom] = useState<1 | 2 | 4>(1);

  // Drag interaction state
  const dragStateRef = useRef<{
    target: DragTarget;
    startClientX: number;
    origStart: number;
    origEnd: number;
  }>({ target: null, startClientX: 0, origStart: 0, origEnd: 0 });

  const duration = audioTrack?.durationSec || decodedBuffer?.duration || 0;
  const selectedDuration = Math.max(0, trimEndSec - trimStartSec);

  // Sync audio element volume & mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  // Reset playback state when track changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  }, [audioTrack?.id]);

  // High-frequency playback monitor for smooth playhead & segment preview loop/stop
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const el = audioRef.current;
      if (el && !el.paused) {
        const now = el.currentTime;
        if (previewSegmentOnly && now >= trimEndSec) {
          if (loopSegment) {
            el.currentTime = trimStartSec;
            setCurrentTime(trimStartSec);
          } else {
            el.pause();
            el.currentTime = trimEndSec;
            setCurrentTime(trimEndSec);
            setIsPlaying(false);
            setPreviewSegmentOnly(false);
            return;
          }
        } else {
          setCurrentTime(now);
        }
        rafId = requestAnimationFrame(tick);
      }
    };
    if (isPlaying) {
      rafId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, previewSegmentOnly, loopSegment, trimStartSec, trimEndSec]);

  // Draw crisp high-DPI waveform canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioTrack || audioTrack.waveformPeaks.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    const midY = h / 2;
    ctx.clearRect(0, 0, w, h);

    // Subtle horizontal center line
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    const peaks = audioTrack.waveformPeaks;
    const barGap = 1.5;
    const totalBarWidth = w / peaks.length;
    const barWidth = Math.max(1.5, totalBarWidth - barGap);

    const startRatio = duration > 0 ? trimStartSec / duration : 0;
    const endRatio = duration > 0 ? trimEndSec / duration : 1;
    const playRatio = duration > 0 ? currentTime / duration : 0;

    for (let i = 0; i < peaks.length; i++) {
      const ratio = i / peaks.length;
      const x = i * totalBarWidth;
      const amp = Math.max(0.06, peaks[i]);
      const barH = amp * (h * 0.84);
      const y = midY - barH / 2;

      const inSelection = ratio >= startRatio && ratio <= endRatio;
      const isPlayed = ratio <= playRatio;

      if (inSelection) {
        ctx.fillStyle = isPlayed ? '#46ecd5' : 'rgba(70, 236, 213, 0.72)';
      } else {
        ctx.fillStyle = isPlayed ? 'rgba(161, 161, 170, 0.55)' : 'rgba(113, 113, 122, 0.34)';
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 1.5);
      ctx.fill();
    }
  }, [audioTrack, duration, trimStartSec, trimEndSec, currentTime, zoom]);

  const handleFileImport = async (file: File) => {
    setImportError(null);
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(file.name)) {
      setImportError('Please select a supported audio file (MP3, WAV, M4A, OGG, FLAC, or AAC).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setImportError('Audio file exceeds the 25 MB browser workspace limit.');
      return;
    }

    setIsImporting(true);
    try {
      const [arrayBuf, dataUrl] = await Promise.all([file.arrayBuffer(), fileToDataUrl(file)]);
      const buffer = await decodeAudioArrayBuffer(arrayBuf);
      const peaks = extractWaveformPeaks(buffer, 260);
      const track: MusicVideoAudioTrack = {
        id: `trk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        sourceType: 'upload',
        sourceUrl: dataUrl,
        originalUrl: dataUrl,
        contentType: file.type || 'audio/mpeg',
        durationSec: Number(buffer.duration.toFixed(2)),
        bytes: file.size,
        waveformPeaks: peaks,
        createdAt: new Date().toISOString(),
      };
      onImportAudioComplete(track, buffer);
      onNotify(`Imported "${file.name}" (${formatTimecode(buffer.duration)})`);
    } catch {
      setImportError('Could not decode this audio file. Try a standard MP3, WAV, M4A, or OGG file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleUrlImport = async () => {
    const cleanUrl = audioUrlInput.trim();
    if (!cleanUrl) {
      setImportError('Paste a direct audio URL (.mp3, .wav, .m4a, .ogg, .flac).');
      return;
    }
    setImportError(null);
    setIsImporting(true);
    try {
      const res = await fetch('/api/music-video/import-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ url: cleanUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.dataUrl) {
        setImportError(data.error || 'Could not retrieve audio from that URL.');
        return;
      }

      const arrRes = await fetch(data.dataUrl);
      const arrayBuf = await arrRes.arrayBuffer();
      const buffer = await decodeAudioArrayBuffer(arrayBuf);
      const peaks = extractWaveformPeaks(buffer, 260);

      const track: MusicVideoAudioTrack = {
        id: `trk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: data.name || 'Imported Audio URL',
        sourceType: 'url',
        sourceUrl: data.dataUrl,
        originalUrl: data.originalUrl || cleanUrl,
        contentType: data.contentType || 'audio/mpeg',
        durationSec: Number(buffer.duration.toFixed(2)),
        bytes: data.bytes,
        waveformPeaks: peaks,
        createdAt: new Date().toISOString(),
      };
      onImportAudioComplete(track, buffer);
      setAudioUrlInput('');
      onNotify(`Imported audio from URL (${formatTimecode(buffer.duration)})`);
    } catch {
      setImportError('Failed to retrieve and decode audio from URL. Ensure it is an accessible direct audio file.');
    } finally {
      setIsImporting(false);
    }
  };

  const togglePlayFull = async () => {
    const el = audioRef.current;
    if (!el || !audioTrack) return;
    if (isPlaying && !previewSegmentOnly) {
      el.pause();
      setIsPlaying(false);
    } else {
      setPreviewSegmentOnly(false);
      if (el.currentTime >= duration - 0.05) {
        el.currentTime = 0;
      }
      await el.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const togglePreviewSegment = async () => {
    const el = audioRef.current;
    if (!el || !audioTrack) return;
    if (isPlaying && previewSegmentOnly) {
      el.pause();
      setIsPlaying(false);
      setPreviewSegmentOnly(false);
    } else {
      el.currentTime = trimStartSec;
      setCurrentTime(trimStartSec);
      setPreviewSegmentOnly(true);
      await el.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const seekTo = useCallback(
    (sec: number) => {
      if (!audioRef.current || duration <= 0) return;
      const clamped = Math.max(0, Math.min(duration, sec));
      audioRef.current.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [duration]
  );

  const clientXToSec = useCallback(
    (clientX: number): number => {
      const wrap = timelineWrapRef.current;
      if (!wrap || duration <= 0) return 0;
      const rect = wrap.getBoundingClientRect();
      const rel = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Number((rel * duration).toFixed(2));
    },
    [duration]
  );

  const startDrag = (target: DragTarget, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      target,
      startClientX: e.clientX,
      origStart: trimStartSec,
      origEnd: trimEndSec,
    };
    if (target === 'scrub') {
      seekTo(clientXToSec(e.clientX));
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag.target || duration <= 0) return;
    const minSeg = Math.min(0.5, duration);

    if (drag.target === 'scrub') {
      seekTo(clientXToSec(e.clientX));
      return;
    }

    if (drag.target === 'start') {
      const next = Math.max(0, Math.min(drag.origEnd - minSeg, clientXToSec(e.clientX)));
      onTrimChange(Number(next.toFixed(2)), trimEndSec);
      return;
    }

    if (drag.target === 'end') {
      const next = Math.min(duration, Math.max(drag.origStart + minSeg, clientXToSec(e.clientX)));
      onTrimChange(trimStartSec, Number(next.toFixed(2)));
      return;
    }

    if (drag.target === 'window') {
      const wrap = timelineWrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const deltaSec = ((e.clientX - drag.startClientX) / rect.width) * duration;
      const span = drag.origEnd - drag.origStart;
      let nextStart = drag.origStart + deltaSec;
      nextStart = Math.max(0, Math.min(duration - span, nextStart));
      onTrimChange(Number(nextStart.toFixed(2)), Number((nextStart + span).toFixed(2)));
    }
  };

  const endDrag = () => {
    dragStateRef.current.target = null;
  };

  const startPct = duration > 0 ? (trimStartSec / duration) * 100 : 0;
  const endPct = duration > 0 ? (trimEndSec / duration) * 100 : 100;
  const playPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate ruler ticks
  const tickStep = duration > 180 ? 30 : duration > 60 ? 15 : duration > 20 ? 5 : 2;
  const rulerTicks: number[] = [];
  if (duration > 0) {
    for (let t = 0; t <= duration; t += tickStep) {
      rulerTicks.push(t);
    }
  }

  return (
    <section className="rounded-2xl bg-[#101218] border border-white/[0.08] overflow-hidden">
      {/* Hidden native audio element driving real playback */}
      {audioTrack?.sourceUrl && (
        <audio
          ref={audioRef}
          src={audioTrack.sourceUrl}
          preload="auto"
          onEnded={() => {
            setIsPlaying(false);
            setPreviewSegmentOnly(false);
          }}
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileImport(f);
          e.target.value = '';
        }}
      />

      {/* Top Transport & Source Bar */}
      <div className="px-5 py-3.5 border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-4 bg-[#13161E]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#46ecd5]/12 border border-[#46ecd5]/30 flex items-center justify-center shrink-0">
            <Music className="w-4 h-4 text-[#46ecd5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-semibold text-white truncate max-w-[260px]">
                {audioTrack ? audioTrack.name : 'Master Music Track'}
              </span>
              {audioTrack && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-zinc-400">
                    {formatTimecode(duration)} total
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#46ecd5]/90">Original preserved</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {audioTrack
                ? 'Drag start and end handles on the waveform to set non-destructive lip-sync and scene timing.'
                : 'Import an audio file or direct audio URL to inspect the waveform and trim performance segments.'}
            </p>
          </div>
        </div>

        {/* Audio Source Switcher / Replace Track Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center rounded-xl bg-[#0B0D12] p-1 border border-white/[0.07]">
            <button
              type="button"
              onClick={() => setImportMode('upload')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                importMode === 'upload'
                  ? 'bg-[#1D212B] text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setImportMode('url')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                importMode === 'url'
                  ? 'bg-[#1D212B] text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Direct Audio URL
            </button>
          </div>

          {importMode === 'upload' && (
            <Button
              type="button"
              variant={audioTrack ? 'secondary' : 'default'}
              size="sm"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="whitespace-nowrap"
            >
              {isImporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{audioTrack ? 'Replace Audio' : 'Upload Music'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Direct Audio URL Drawer (visible when URL tab selected) */}
      {importMode === 'url' && (
        <div className="px-5 py-3 bg-[#0C0E14] border-b border-white/[0.06] flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[260px]">
            <Link2 className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="url"
              value={audioUrlInput}
              onChange={(e) => setAudioUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUrlImport();
              }}
              placeholder="https://example.com/tracks/song-master.mp3 (direct MP3, WAV, M4A, OGG, or FLAC URL)"
              className="pl-9 h-9 text-xs bg-[#13161E] border-white/10"
            />
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={isImporting}
            onClick={handleUrlImport}
            className="whitespace-nowrap"
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Music className="w-3.5 h-3.5" />
            )}
            <span>Import Audio URL</span>
          </Button>
        </div>
      )}

      {importError && (
        <div className="px-5 py-2.5 bg-rose-950/40 border-b border-rose-500/30 text-xs text-rose-200 flex items-center justify-between gap-3">
          <span>{importError}</span>
          <button
            type="button"
            onClick={() => setImportError(null)}
            className="text-rose-300 hover:text-white text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Empty Dropzone OR Full Interactive Waveform Timeline */}
      {!audioTrack ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFileImport(f);
          }}
          className="p-8 flex flex-col items-center justify-center text-center gap-3 bg-[#0C0E13]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#161922] border border-white/10 flex items-center justify-center">
            <Music className="w-5 h-5 text-[#46ecd5]" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-sm font-semibold text-white">
              Import your music track to unlock waveform trimming & lip sync
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Drop an MP3, WAV, M4A, OGG, or FLAC file here, or paste a direct accessible audio URL above. Listen, scrub, and select exact vocal or instrumental segments before generating any scene.
            </p>
          </div>
          <div className="flex items-center gap-2.5 pt-1">
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Choose Audio File</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setImportMode('url')}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Use Direct URL</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          {/* Audio Player Transport & Segment Readout Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Transport Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={isPlaying && !previewSegmentOnly ? 'default' : 'secondary'}
                size="sm"
                onClick={togglePlayFull}
                className="whitespace-nowrap"
              >
                {isPlaying && !previewSegmentOnly ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{isPlaying && !previewSegmentOnly ? 'Pause' : 'Play Track'}</span>
              </Button>

              <Button
                type="button"
                variant={isPlaying && previewSegmentOnly ? 'default' : 'accent'}
                size="sm"
                onClick={togglePreviewSegment}
                className="whitespace-nowrap"
              >
                {isPlaying && previewSegmentOnly ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Scissors className="w-3.5 h-3.5" />
                )}
                <span>
                  {isPlaying && previewSegmentOnly ? 'Stop Segment' : 'Preview Selected Segment'}
                </span>
              </Button>

              <button
                type="button"
                onClick={() => setLoopSegment((v) => !v)}
                title="Loop selected segment during preview"
                className={`h-8 px-2.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  loopSegment
                    ? 'bg-[#46ecd5]/12 border-[#46ecd5]/35 text-[#46ecd5]'
                    : 'bg-[#141720] border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Loop</span>
              </button>

              {/* Current / Total Timecode */}
              <div className="pl-2 flex items-center gap-1.5 text-xs font-mono-tabular">
                <span className="text-white font-semibold">{formatTimecode(currentTime)}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-400">{formatTimecode(duration)}</span>
              </div>
            </div>

            {/* Volume + Zoom Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
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
                    const v = Number(e.target.value);
                    setVolume(v);
                    if (v > 0 && muted) setMuted(false);
                  }}
                  aria-label="Audio volume"
                  className="w-20 accent-[#46ecd5] cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1 border-l border-white/10 pl-3">
                <button
                  type="button"
                  onClick={() => setZoom((z) => (z === 4 ? 2 : 1))}
                  disabled={zoom === 1}
                  title="Zoom out waveform"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono-tabular text-zinc-400 w-7 text-center">
                  {zoom}x
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => (z === 1 ? 2 : 4))}
                  disabled={zoom === 4}
                  title="Zoom in waveform"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Scrollable Waveform Canvas with Draggable Handles */}
          <div className="overflow-x-auto pb-1">
            <div
              style={{ width: `${zoom * 100}%` }}
              className="min-w-full select-none"
            >
              {/* Time Ruler */}
              <div className="relative h-5 border-b border-white/[0.06] mb-1">
                {rulerTicks.map((t) => {
                  const pct = duration > 0 ? (t / duration) * 100 : 0;
                  return (
                    <div
                      key={t}
                      style={{ left: `${pct}%` }}
                      className="absolute top-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                    >
                      <span className="text-[10px] font-mono-tabular text-zinc-500">
                        {formatTimecode(t).slice(0, 5)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Waveform Surface */}
              <div
                ref={timelineWrapRef}
                onPointerDown={(e) => startDrag('scrub', e)}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="relative h-28 rounded-xl bg-[#0A0C10] border border-white/[0.08] overflow-hidden cursor-crosshair touch-none"
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full block pointer-events-none"
                />

                {/* Dimmed Unselected Regions (Left & Right) */}
                <div
                  style={{ width: `${startPct}%` }}
                  className="absolute inset-y-0 left-0 bg-black/55 pointer-events-none"
                />
                <div
                  style={{ left: `${endPct}%`, right: 0 }}
                  className="absolute inset-y-0 bg-black/55 pointer-events-none"
                />

                {/* Selected Segment Overlay (Draggable Window) */}
                <div
                  style={{
                    left: `${startPct}%`,
                    width: `${Math.max(0.5, endPct - startPct)}%`,
                  }}
                  onPointerDown={(e) => startDrag('window', e)}
                  title="Drag to shift selected segment across the track"
                  className="absolute inset-y-0 bg-[#46ecd5]/[0.08] border-y-2 border-[#46ecd5]/70 cursor-grab active:cursor-grabbing"
                />

                {/* Draggable Start Trim Handle */}
                <div
                  style={{ left: `${startPct}%` }}
                  onPointerDown={(e) => startDrag('start', e)}
                  role="slider"
                  aria-label="Segment start time handle"
                  aria-valuemin={0}
                  aria-valuemax={duration}
                  aria-valuenow={trimStartSec}
                  tabIndex={0}
                  className="absolute inset-y-0 -translate-x-1/2 w-5 flex items-center justify-center cursor-ew-resize z-20 group"
                >
                  <div className="w-1 h-full bg-[#46ecd5] shadow-[0_0_12px_rgba(70,236,213,0.7)]" />
                  <div className="absolute top-1.5 w-3.5 h-6 rounded-sm bg-[#46ecd5] text-zinc-950 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <span className="w-0.5 h-3 bg-zinc-950/70 rounded-full" />
                  </div>
                </div>

                {/* Draggable End Trim Handle */}
                <div
                  style={{ left: `${endPct}%` }}
                  onPointerDown={(e) => startDrag('end', e)}
                  role="slider"
                  aria-label="Segment end time handle"
                  aria-valuemin={0}
                  aria-valuemax={duration}
                  aria-valuenow={trimEndSec}
                  tabIndex={0}
                  className="absolute inset-y-0 -translate-x-1/2 w-5 flex items-center justify-center cursor-ew-resize z-20 group"
                >
                  <div className="w-1 h-full bg-[#46ecd5] shadow-[0_0_12px_rgba(70,236,213,0.7)]" />
                  <div className="absolute bottom-1.5 w-3.5 h-6 rounded-sm bg-[#46ecd5] text-zinc-950 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                    <span className="w-0.5 h-3 bg-zinc-950/70 rounded-full" />
                  </div>
                </div>

                {/* Playhead Cursor */}
                <div
                  style={{ left: `${playPct}%` }}
                  className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none z-30"
                >
                  <div className="w-2.5 h-2.5 -ml-[4px] rounded-full bg-white" />
                </div>
              </div>

              {/* Mapped Scene Coverage Strip beneath Waveform */}
              {scenes.length > 0 && duration > 0 && (
                <div className="relative h-7 mt-1.5 rounded-lg bg-[#0D0F15] border border-white/[0.06] overflow-hidden">
                  {scenes.map((sc, idx) => {
                    const left = (sc.audioStartSec / duration) * 100;
                    const width = Math.max(1.5, ((sc.audioEndSec - sc.audioStartSec) / duration) * 100);
                    const isActive = sc.id === activeSceneId;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => onSelectScene?.(sc.id)}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`Scene ${idx + 1}: ${sc.title} (${formatTimecode(sc.audioStartSec)} – ${formatTimecode(sc.audioEndSec)})`}
                        className={`absolute top-1 bottom-1 rounded-md px-1.5 text-[10px] font-mono-tabular truncate text-left transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-[#46ecd5]/25 border-[#46ecd5] text-white font-semibold z-10'
                            : sc.mode === 'lip_sync'
                            ? 'bg-sky-500/15 border-sky-400/35 text-sky-200 hover:bg-sky-500/25'
                            : 'bg-amber-500/15 border-amber-400/35 text-amber-200 hover:bg-amber-500/25'
                        }`}
                      >
                        S{idx + 1} · {sc.mode === 'lip_sync' ? 'Lip Sync' : 'B-Roll'}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Precision Numeric Trim Readout & Fine-Tune Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/[0.06] text-xs">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Start</span>
                <button
                  type="button"
                  onClick={() => onTrimChange(Math.max(0, Number((trimStartSec - 0.5).toFixed(2))), trimEndSec)}
                  className="px-1.5 py-0.5 rounded bg-[#181B24] border border-white/10 text-zinc-300 hover:text-white font-mono-tabular cursor-pointer"
                >
                  -0.5s
                </button>
                <span className="font-mono-tabular font-semibold text-white min-w-[58px] text-center">
                  {formatTimecode(trimStartSec)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onTrimChange(
                      Math.min(trimEndSec - 0.5, Number((trimStartSec + 0.5).toFixed(2))),
                      trimEndSec
                    )
                  }
                  className="px-1.5 py-0.5 rounded bg-[#181B24] border border-white/10 text-zinc-300 hover:text-white font-mono-tabular cursor-pointer"
                >
                  +0.5s
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400">End</span>
                <button
                  type="button"
                  onClick={() =>
                    onTrimChange(
                      trimStartSec,
                      Math.max(trimStartSec + 0.5, Number((trimEndSec - 0.5).toFixed(2)))
                    )
                  }
                  className="px-1.5 py-0.5 rounded bg-[#181B24] border border-white/10 text-zinc-300 hover:text-white font-mono-tabular cursor-pointer"
                >
                  -0.5s
                </button>
                <span className="font-mono-tabular font-semibold text-white min-w-[58px] text-center">
                  {formatTimecode(trimEndSec)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onTrimChange(
                      trimStartSec,
                      Math.min(duration, Number((trimEndSec + 0.5).toFixed(2)))
                    )
                  }
                  className="px-1.5 py-0.5 rounded bg-[#181B24] border border-white/10 text-zinc-300 hover:text-white font-mono-tabular cursor-pointer"
                >
                  +0.5s
                </button>
              </div>

              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <span className="text-zinc-400">Selected Duration</span>
                <span className="font-mono-tabular font-bold text-[#46ecd5]">
                  {selectedDuration.toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Quick Duration Snap Presets */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-zinc-500 mr-1">Snap Length:</span>
              {[5, 8, 10, 15].map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => {
                    const nextEnd = Math.min(duration, Number((trimStartSec + len).toFixed(2)));
                    onTrimChange(trimStartSec, nextEnd);
                  }}
                  className="px-2 py-1 rounded-lg bg-[#161922] border border-white/[0.08] text-zinc-300 hover:text-white hover:border-[#46ecd5]/40 font-mono-tabular cursor-pointer transition-colors"
                >
                  {len}s
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
