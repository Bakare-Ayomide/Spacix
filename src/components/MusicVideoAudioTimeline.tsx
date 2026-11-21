import React, { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  Download,
  Globe,
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
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Slider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/primitives';
import {
  buildFallbackWaveform,
  decodeAudioFromArrayBuffer,
  decodeAudioFromUrl,
  formatDurationCompact,
  formatTimecode,
} from '../lib/audioTrim';
import { MusicVideoAudioTrack, MusicVideoScene, UploadRecord } from '../types/studio';

export interface MusicVideoAudioTimelineProps {
  audioTrack: MusicVideoAudioTrack | null;
  audioBufferRef: React.MutableRefObject<AudioBuffer | null>;
  startSec: number;
  endSec: number;
  scenes: MusicVideoScene[];
  activeSceneId: string;
  existingAudioUploads: UploadRecord[];
  sessionToken?: string | null;
  onTrackLoaded: (track: MusicVideoAudioTrack, buffer: AudioBuffer | null) => void;
  onClearTrack: () => void;
  onChangeRange: (startSec: number, endSec: number) => void;
  onSelectScene?: (sceneId: string) => void;
  uploadReferenceFile: (file: {
    label: string;
    contentType: string;
    bytes: number;
    dataUrl: string;
  }) => Promise<UploadRecord | null>;
}

const MIN_TRIM_DURATION = 1.0;

export const MusicVideoAudioTimeline: React.FC<MusicVideoAudioTimelineProps> = ({
  audioTrack,
  audioBufferRef,
  startSec,
  endSec,
  scenes,
  activeSceneId,
  existingAudioUploads,
  sessionToken,
  onTrackLoaded,
  onClearTrack,
  onChangeRange,
  onSelectScene,
  uploadReferenceFile,
}) => {
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<'full' | 'segment'>('segment');
  const [loopSegment, setLoopSegment] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);

  const [urlInput, setUrlInput] = useState('');
  const [importMode, setImportMode] = useState<'upload' | 'url'>('upload');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | 'scrub' | 'region' | null>(null);
  const dragRegionOffsetRef = useRef<number>(0);

  const totalDuration = audioTrack?.durationSec || 0;
  const clampedStart = Math.max(0, Math.min(startSec, Math.max(0, totalDuration - MIN_TRIM_DURATION)));
  const clampedEnd =
    totalDuration > 0
      ? Math.max(clampedStart + MIN_TRIM_DURATION, Math.min(endSec, totalDuration))
      : endSec;
  const selectedDuration = Math.max(0, clampedEnd - clampedStart);

  // Keep audio element volume synced
  useEffect(() => {
    if (audioElRef.current) {
      audioElRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  // Decode audioBuffer lazily when a saved track is restored without an in-memory buffer
  useEffect(() => {
    if (!audioTrack?.sourceUrl || audioBufferRef.current) return;
    let cancelled = false;
    decodeAudioFromUrl(audioTrack.sourceUrl, 160)
      .then((decoded) => {
        if (!cancelled) {
          audioBufferRef.current = decoded.audioBuffer;
        }
      })
      .catch(() => {
        // Waveform already present on track; HTMLAudioElement still plays directly
      });
    return () => {
      cancelled = true;
    };
  }, [audioTrack?.sourceUrl, audioBufferRef]);

  // Playback loop monitor for segment preview
  useEffect(() => {
    const audio = audioElRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const t = audio.currentTime;
      setCurrentTime(t);
      if (playMode === 'segment' && isPlaying && t >= clampedEnd - 0.04) {
        if (loopSegment) {
          audio.currentTime = clampedStart;
          audio.play().catch(() => {});
        } else {
          audio.pause();
          audio.currentTime = clampedStart;
          setIsPlaying(false);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleLoadedMetadata = () => {
      if (audioTrack && (!audioTrack.durationSec || audioTrack.durationSec <= 0) && audio.duration > 0) {
        onTrackLoaded({ ...audioTrack, durationSec: audio.duration }, audioBufferRef.current);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [playMode, isPlaying, clampedStart, clampedEnd, loopSegment, audioTrack, onTrackLoaded, audioBufferRef]);

  // High-precision animation frame sync while playing so playhead glides smoothly
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    const tick = () => {
      if (audioElRef.current) {
        const t = audioElRef.current.currentTime;
        setCurrentTime(t);
        if (playMode === 'segment' && t >= clampedEnd - 0.03) {
          if (loopSegment) {
            audioElRef.current.currentTime = clampedStart;
          } else {
            audioElRef.current.pause();
            audioElRef.current.currentTime = clampedStart;
            setIsPlaying(false);
            return;
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playMode, clampedStart, clampedEnd, loopSegment]);

  // Pointer drag handling for non-destructive trim handles & scrubber
  useEffect(() => {
    if (!draggingHandle || totalDuration <= 0) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const sec = Number((ratio * totalDuration).toFixed(2));

      if (draggingHandle === 'start') {
        const nextStart = Math.max(0, Math.min(sec, clampedEnd - MIN_TRIM_DURATION));
        onChangeRange(nextStart, clampedEnd);
        if (audioElRef.current && !isPlaying) {
          audioElRef.current.currentTime = nextStart;
          setCurrentTime(nextStart);
        }
      } else if (draggingHandle === 'end') {
        const nextEnd = Math.min(totalDuration, Math.max(sec, clampedStart + MIN_TRIM_DURATION));
        onChangeRange(clampedStart, nextEnd);
      } else if (draggingHandle === 'region') {
        const segLen = clampedEnd - clampedStart;
        const desiredStart = sec - dragRegionOffsetRef.current;
        const nextStart = Math.max(0, Math.min(desiredStart, totalDuration - segLen));
        const nextEnd = Number((nextStart + segLen).toFixed(2));
        onChangeRange(Number(nextStart.toFixed(2)), nextEnd);
      } else if (draggingHandle === 'scrub') {
        if (audioElRef.current) {
          audioElRef.current.currentTime = sec;
        }
        setCurrentTime(sec);
      }
    };

    const handlePointerUp = () => {
      setDraggingHandle(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [draggingHandle, totalDuration, clampedStart, clampedEnd, isPlaying, onChangeRange]);

  const togglePlayback = (mode: 'full' | 'segment') => {
    const audio = audioElRef.current;
    if (!audio || !audioTrack) return;

    if (isPlaying && playMode === mode) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    setPlayMode(mode);
    if (mode === 'segment') {
      if (audio.currentTime < clampedStart || audio.currentTime >= clampedEnd - 0.1) {
        audio.currentTime = clampedStart;
      }
    }
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {
        toast.error('Audio playback could not start. Check browser audio permissions.');
      });
  };

  const processLocalAudioFile = async (file: File) => {
    setImportError(null);
    const isAudio =
      file.type.startsWith('audio/') ||
      /\.(mp3|wav|m4a|ogg|flac|aac|webm)$/i.test(file.name);
    if (!isAudio) {
      setImportError('Unsupported file format. Upload MP3, WAV, M4A, OGG, AAC, FLAC, or WebM audio.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setImportError('Audio file exceeds the 30 MB workspace limit.');
      return;
    }

    setIsImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      let decodedBuffer: AudioBuffer | null = null;
      let durationSec = 0;
      let waveform: number[] = [];

      try {
        const decoded = await decodeAudioFromArrayBuffer(arrayBuffer, 160);
        decodedBuffer = decoded.audioBuffer;
        durationSec = decoded.durationSec;
        waveform = decoded.waveform;
      } catch {
        waveform = buildFallbackWaveform(file.name, 160);
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read audio file.'));
        reader.readAsDataURL(file);
      });

      const uploaded = await uploadReferenceFile({
        label: file.name,
        contentType: file.type || 'audio/mpeg',
        bytes: file.size,
        dataUrl,
      });
      const sourceUrl = uploaded?.publicUrl || dataUrl;

      const track: MusicVideoAudioTrack = {
        id: `mv_aud_${Date.now()}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        sourceType: 'upload',
        sourceUrl,
        contentType: file.type || 'audio/mpeg',
        durationSec: durationSec || 30,
        waveform,
        bytes: file.size,
      };

      audioBufferRef.current = decodedBuffer;
      onTrackLoaded(track, decodedBuffer);
      setCurrentTime(0);
      setIsPlaying(false);
      toast.success(`Imported "${track.title}" (${formatTimecode(track.durationSec)})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process audio file.';
      setImportError(msg);
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportAudioUrl = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleaned = urlInput.trim();
    if (!cleaned) {
      setImportError('Enter a direct audio URL ending in .mp3, .wav, .m4a, .ogg, or .flac.');
      return;
    }
    setImportError(null);
    setIsImporting(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }
      const res = await fetch('/api/audio/import-url', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: cleaned }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not import audio from that URL.');
      }

      const dataUrl = String(data.public_url || '');
      let decodedBuffer: AudioBuffer | null = null;
      let durationSec = 30;
      let waveform = buildFallbackWaveform(data.title || cleaned, 160);

      try {
        const decoded = await decodeAudioFromUrl(dataUrl, 160);
        decodedBuffer = decoded.audioBuffer;
        durationSec = decoded.durationSec;
        waveform = decoded.waveform;
      } catch {
        // Fallback waveform if browser cannot decode exotic codec
      }

      const track: MusicVideoAudioTrack = {
        id: data.upload?.id || `mv_url_${Date.now()}`,
        title: String(data.title || 'Imported Music Track'),
        sourceType: 'url',
        sourceUrl: dataUrl,
        originalUrl: cleaned,
        contentType: String(data.contentType || 'audio/mpeg'),
        durationSec,
        waveform,
        bytes: Number(data.bytes || 0),
      };

      audioBufferRef.current = decodedBuffer;
      onTrackLoaded(track, decodedBuffer);
      setUrlInput('');
      setCurrentTime(0);
      setIsPlaying(false);
      toast.success(`Imported audio track "${track.title}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to retrieve audio from URL.';
      setImportError(msg);
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleLoadExistingAudio = async (upload: UploadRecord) => {
    setIsImporting(true);
    setImportError(null);
    try {
      let decodedBuffer: AudioBuffer | null = null;
      let durationSec = 30;
      let waveform = buildFallbackWaveform(upload.label, 160);
      try {
        const decoded = await decodeAudioFromUrl(upload.publicUrl, 160);
        decodedBuffer = decoded.audioBuffer;
        durationSec = decoded.durationSec;
        waveform = decoded.waveform;
      } catch {
        // Keep fallback
      }
      const track: MusicVideoAudioTrack = {
        id: upload.id,
        title: upload.label,
        sourceType: 'upload',
        sourceUrl: upload.publicUrl,
        contentType: upload.contentType,
        durationSec,
        waveform,
        bytes: upload.bytes,
      };
      audioBufferRef.current = decodedBuffer;
      onTrackLoaded(track, decodedBuffer);
      setCurrentTime(0);
      setIsPlaying(false);
      toast.success(`Loaded "${upload.label}" onto timeline`);
    } finally {
      setIsImporting(false);
    }
  };

  const applyQuickDuration = (secLen: number) => {
    if (totalDuration <= 0) return;
    const nextEnd = Math.min(totalDuration, Number((clampedStart + secLen).toFixed(2)));
    const nextStart =
      nextEnd - clampedStart < MIN_TRIM_DURATION
        ? Math.max(0, Number((nextEnd - secLen).toFixed(2)))
        : clampedStart;
    onChangeRange(nextStart, nextEnd);
  };

  const nudgeRange = (edge: 'start' | 'end', delta: number) => {
    if (totalDuration <= 0) return;
    if (edge === 'start') {
      const next = Math.max(0, Math.min(clampedStart + delta, clampedEnd - MIN_TRIM_DURATION));
      onChangeRange(Number(next.toFixed(2)), clampedEnd);
    } else {
      const next = Math.min(totalDuration, Math.max(clampedEnd + delta, clampedStart + MIN_TRIM_DURATION));
      onChangeRange(clampedStart, Number(next.toFixed(2)));
    }
  };

  const startPct = totalDuration > 0 ? (clampedStart / totalDuration) * 100 : 0;
  const endPct = totalDuration > 0 ? (clampedEnd / totalDuration) * 100 : 100;
  const playheadPct = totalDuration > 0 ? Math.min(100, Math.max(0, (currentTime / totalDuration) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101218] overflow-hidden">
      {/* Hidden native audio element */}
      {audioTrack && <audio ref={audioElRef} src={audioTrack.sourceUrl} preload="auto" />}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processLocalAudioFile(file);
          e.target.value = '';
        }}
      />

      {!audioTrack ? (
        /* EMPTY AUDIO IMPORT DECK */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file) processLocalAudioFile(file);
          }}
          className={`p-5 sm:p-6 transition-colors ${
            dragActive ? 'bg-[#46ecd5]/[0.07]' : 'bg-[#101218]'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#46ecd5]/12 border border-[#46ecd5]/30 flex items-center justify-center shrink-0 text-[#46ecd5]">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Master Music Track & Trim Timeline
                  </h3>
                  <span className="text-[11px] font-mono text-zinc-400">
                    MP3 · WAV · M4A · OGG · FLAC
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
                  Import your song to preview playback, scrub the waveform, and non-destructively trim exact segments for lip-sync performances and B-roll cuts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant={importMode === 'upload' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => {
                  setImportMode('upload');
                  setImportError(null);
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Audio</span>
              </Button>
              <Button
                type="button"
                variant={importMode === 'url' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => {
                  setImportMode('url');
                  setImportError(null);
                }}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Direct Audio URL</span>
              </Button>
              {existingAudioUploads.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <AudioLines className="w-3.5 h-3.5 text-[#46ecd5]" />
                      <span>Library ({existingAudioUploads.length})</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-2.5 space-y-1.5">
                    <div className="text-[11px] font-semibold text-zinc-400 px-2 py-1">
                      Saved Audio Files
                    </div>
                    {existingAudioUploads.slice(0, 8).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleLoadExistingAudio(u)}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/[0.06] flex items-center justify-between gap-2 text-xs text-zinc-200 transition-colors"
                      >
                        <span className="truncate font-medium">{u.label}</span>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">Load</span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {importMode === 'upload' ? (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-dashed border-white/15 bg-black/25 px-4 py-4">
              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <AudioLines className="w-4 h-4 text-[#46ecd5] shrink-0" />
                <span>
                  Drag and drop your master music file here, or choose a file from your device.
                </span>
              </div>
              <Button
                type="button"
                variant="cyanGhost"
                size="sm"
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Decoding Waveform...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Audio File</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleImportAudioUrl} className="mt-4 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Globe className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/tracks/song-master.mp3"
                  className="pl-9 h-9 font-mono text-xs"
                  disabled={isImporting}
                />
              </div>
              <Button type="submit" variant="default" size="sm" disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>Import Audio URL</span>
                )}
              </Button>
            </form>
          )}

          {importError && (
            <div className="mt-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2">
              {importError}
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE AUDIO PLAYER & NON-DESTRUCTIVE WAVEFORM TRIM TIMELINE */
        <div className="divide-y divide-white/[0.07]">
          {/* Row 1: Transport Controls, Track Info & Volume */}
          <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#13161E]">
            <div className="flex items-center gap-2.5 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isPlaying && playMode === 'segment' ? 'default' : 'cyanGhost'}
                    size="sm"
                    onClick={() => togglePlayback('segment')}
                  >
                    {isPlaying && playMode === 'segment' ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isPlaying && playMode === 'segment' ? 'Pause Clip' : 'Preview Segment'}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Audition only the selected trim range ({formatTimecode(clampedStart)} – {formatTimecode(clampedEnd)})
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isPlaying && playMode === 'full' ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => togglePlayback('full')}
                  >
                    {isPlaying && playMode === 'full' ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Full Song</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Play entire imported track from playhead</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={loopSegment ? 'secondary' : 'ghost'}
                    size="icon"
                    className={`h-8 w-8 ${loopSegment ? 'text-[#46ecd5] border-[#46ecd5]/35' : ''}`}
                    onClick={() => setLoopSegment((v) => !v)}
                  >
                    <Repeat className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{loopSegment ? 'Loop segment enabled' : 'Loop segment disabled'}</TooltipContent>
              </Tooltip>

              <div className="min-w-0 pl-1">
                <div className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[300px]">
                  {audioTrack.title}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-zinc-400">
                  {formatTimecode(currentTime)} / {formatTimecode(totalDuration)} ·{' '}
                  {audioTrack.sourceType === 'url' ? 'Direct URL' : 'Uploaded Master'}
                </div>
              </div>
            </div>

            {/* Right controls: Volume + Replace / Clear */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-28 sm:w-32">
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  className="text-zinc-400 hover:text-white transition-colors"
                  aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-[#46ecd5]" />
                  )}
                </button>
                <Slider
                  value={[muted ? 0 : Math.round(volume * 100)]}
                  max={100}
                  step={1}
                  onValueChange={([v]) => {
                    setMuted(false);
                    setVolume(v / 100);
                  }}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => fileInputRef.current?.click()}
              >
                Replace
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-rose-300"
                    onClick={() => {
                      audioElRef.current?.pause();
                      setIsPlaying(false);
                      audioBufferRef.current = null;
                      onClearTrack();
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove audio track</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Row 2: Interactive Non-Destructive Waveform & Trim Handles */}
          <div className="px-4 py-3.5 bg-[#0C0E13] space-y-2.5">
            {/* Scene allocation map bar */}
            {scenes.length > 0 && totalDuration > 0 && (
              <div className="relative h-5 rounded-md bg-white/[0.03] border border-white/[0.05] overflow-hidden">
                {scenes.map((sc, idx) => {
                  const left = Math.max(0, Math.min(100, (sc.audioStartSec / totalDuration) * 100));
                  const width = Math.max(
                    1.5,
                    Math.min(100 - left, ((sc.audioEndSec - sc.audioStartSec) / totalDuration) * 100)
                  );
                  const isCurrent = sc.id === activeSceneId;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => onSelectScene?.(sc.id)}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      className={`absolute top-0 bottom-0 text-[9px] font-mono font-bold truncate px-1.5 border-r border-black/50 transition-colors text-left cursor-pointer ${
                        isCurrent
                          ? 'bg-[#46ecd5]/30 text-[#46ecd5] ring-1 ring-inset ring-[#46ecd5]/70'
                          : sc.mode === 'lip_sync'
                          ? 'bg-sky-500/20 text-sky-200 hover:bg-sky-500/30'
                          : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                      }`}
                      title={`Scene ${idx + 1}: ${sc.title} (${formatTimecode(sc.audioStartSec)}–${formatTimecode(sc.audioEndSec)})`}
                    >
                      S{idx + 1} · {sc.mode === 'lip_sync' ? 'Sync' : 'B-Roll'}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main Waveform Track with Draggable Start/End Handles */}
            <div
              ref={timelineRef}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).dataset.trimControl) return;
                if (!timelineRef.current || totalDuration <= 0) return;
                const rect = timelineRef.current.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const sec = ratio * totalDuration;
                if (audioElRef.current) {
                  audioElRef.current.currentTime = sec;
                }
                setCurrentTime(sec);
                setDraggingHandle('scrub');
              }}
              className="relative h-20 rounded-xl bg-[#090B10] border border-white/[0.08] select-none touch-none cursor-crosshair overflow-hidden"
            >
              {/* Waveform bars */}
              <div className="absolute inset-0 flex items-center gap-[2px] px-1 pointer-events-none">
                {(audioTrack.waveform.length ? audioTrack.waveform : buildFallbackWaveform(audioTrack.title, 160)).map(
                  (amp, i, arr) => {
                    const barPct = ((i + 0.5) / arr.length) * 100;
                    const inSelection = barPct >= startPct && barPct <= endPct;
                    const isPassed = barPct <= playheadPct;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-full transition-colors duration-75"
                        style={{
                          height: `${Math.max(10, Math.round(amp * 86))}%`,
                          backgroundColor: inSelection
                            ? isPassed
                              ? '#46ecd5'
                              : 'rgba(70, 236, 213, 0.55)'
                            : 'rgba(148, 163, 184, 0.22)',
                        }}
                      />
                    );
                  }
                )}
              </div>

              {/* Left dim mask */}
              <div
                className="absolute inset-y-0 left-0 bg-black/55 pointer-events-none"
                style={{ width: `${startPct}%` }}
              />
              {/* Right dim mask */}
              <div
                className="absolute inset-y-0 right-0 bg-black/55 pointer-events-none"
                style={{ width: `${Math.max(0, 100 - endPct)}%` }}
              />

              {/* Selected trim window highlight + draggable move handle at top */}
              <div
                style={{
                  left: `${startPct}%`,
                  width: `${Math.max(0.5, endPct - startPct)}%`,
                }}
                className="absolute inset-y-0 border-y-2 border-[#46ecd5]/80 bg-[#46ecd5]/[0.07] pointer-events-none"
              >
                <div
                  data-trim-control="region"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (!timelineRef.current || totalDuration <= 0) return;
                    const rect = timelineRef.current.getBoundingClientRect();
                    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    const sec = ratio * totalDuration;
                    dragRegionOffsetRef.current = sec - clampedStart;
                    setDraggingHandle('region');
                  }}
                  className="pointer-events-auto absolute top-0 left-3 right-3 h-4 cursor-grab active:cursor-grabbing flex items-center justify-center"
                  title="Drag to slide selected audio window"
                >
                  <span className="px-1.5 py-0.5 rounded-b bg-[#46ecd5] text-zinc-950 font-mono text-[9px] font-extrabold leading-none tabular-nums">
                    {formatDurationCompact(selectedDuration)}
                  </span>
                </div>
              </div>

              {/* Start (IN) Trim Handle */}
              <div
                data-trim-control="start"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingHandle('start');
                }}
                style={{ left: `calc(${startPct}% - 7px)` }}
                className="absolute inset-y-0 w-3.5 z-20 cursor-ew-resize group flex items-center justify-center"
                title={`Drag start handle (${formatTimecode(clampedStart)})`}
              >
                <div className="w-1.5 h-full bg-[#46ecd5] shadow-[0_0_12px_rgba(70,236,213,0.8)] rounded-l-sm group-hover:w-2 transition-all" />
                <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-7 rounded bg-[#46ecd5] text-zinc-950 flex items-center justify-center font-mono text-[9px] font-black shadow">
                  ‹
                </div>
              </div>

              {/* End (OUT) Trim Handle */}
              <div
                data-trim-control="end"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingHandle('end');
                }}
                style={{ left: `calc(${endPct}% - 7px)` }}
                className="absolute inset-y-0 w-3.5 z-20 cursor-ew-resize group flex items-center justify-center"
                title={`Drag end handle (${formatTimecode(clampedEnd)})`}
              >
                <div className="w-1.5 h-full bg-[#46ecd5] shadow-[0_0_12px_rgba(70,236,213,0.8)] rounded-r-sm group-hover:w-2 transition-all" />
                <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-7 rounded bg-[#46ecd5] text-zinc-950 flex items-center justify-center font-mono text-[9px] font-black shadow">
                  ›
                </div>
              </div>

              {/* Playhead Needle */}
              <div
                style={{ left: `${playheadPct}%` }}
                className="absolute inset-y-0 w-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] z-30 pointer-events-none"
              >
                <div className="w-2.5 h-2.5 -ml-[4px] -mt-0.5 rounded-full bg-white" />
              </div>
            </div>

            {/* Row 3: Non-Destructive Trim Precision Readout & Quick Snaps */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-zinc-300">
                <span className="inline-flex items-center gap-1.5 text-zinc-400">
                  <Scissors className="w-3.5 h-3.5 text-[#46ecd5]" />
                  <span>Non-destructive trim</span>
                </span>
                <div className="inline-flex items-center gap-1">
                  <span className="text-zinc-500">IN</span>
                  <button
                    type="button"
                    onClick={() => nudgeRange('start', -0.5)}
                    className="px-1.5 py-0.5 rounded bg-white/[0.05] hover:bg-white/10 text-zinc-300"
                  >
                    -0.5s
                  </button>
                  <span className="text-white font-bold px-1">{formatTimecode(clampedStart)}</span>
                  <button
                    type="button"
                    onClick={() => nudgeRange('start', 0.5)}
                    className="px-1.5 py-0.5 rounded bg-white/[0.05] hover:bg-white/10 text-zinc-300"
                  >
                    +0.5s
                  </button>
                </div>
                <span className="text-zinc-600">·</span>
                <div className="inline-flex items-center gap-1">
                  <span className="text-zinc-500">OUT</span>
                  <button
                    type="button"
                    onClick={() => nudgeRange('end', -0.5)}
                    className="px-1.5 py-0.5 rounded bg-white/[0.05] hover:bg-white/10 text-zinc-300"
                  >
                    -0.5s
                  </button>
                  <span className="text-white font-bold px-1">{formatTimecode(clampedEnd)}</span>
                  <button
                    type="button"
                    onClick={() => nudgeRange('end', 0.5)}
                    className="px-1.5 py-0.5 rounded bg-white/[0.05] hover:bg-white/10 text-zinc-300"
                  >
                    +0.5s
                  </button>
                </div>
                <span className="text-zinc-600">·</span>
                <span className="text-[#46ecd5] font-bold">
                  CLIP {formatDurationCompact(selectedDuration)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-500 mr-1">Snap length:</span>
                {[5, 10, 15].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => applyQuickDuration(sec)}
                    className="px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-[#46ecd5]/15 hover:text-[#46ecd5] text-[10px] font-mono font-bold text-zinc-300 transition-colors cursor-pointer"
                  >
                    {sec}s
                  </button>
                ))}
                <a
                  href={audioTrack.sourceUrl}
                  download={`${audioTrack.title}.wav`}
                  className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-white/10 text-[10px] font-medium text-zinc-300"
                  title="Download master audio track"
                >
                  <Download className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
