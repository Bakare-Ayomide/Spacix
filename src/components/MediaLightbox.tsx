import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Film,
  Maximize2,
  Music,
  Pause,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { MediaKind } from '../types/studio';

export interface MediaLightboxItem {
  url: string;
  kind: MediaKind;
  title?: string;
  subtitle?: string;
  aspectRatio?: string;
  prompt?: string;
  onDownload?: () => void;
  onReuse?: () => void;
  onAnimate?: () => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const MediaLightbox: React.FC<{
  item: MediaLightboxItem | null;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.9);
  const [audioMuted, setAudioMuted] = useState(false);

  useEffect(() => {
    setAudioPlaying(false);
    setAudioTime(0);
    setAudioDuration(0);
    if (!item) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [item, onClose]);

  if (!item) return null;

  const isActualVideo =
    item.kind === 'video' ||
    /\.(mp4|webm|mov)(\?|$)/i.test(item.url) ||
    item.url.includes('vm.runware.ai') ||
    item.url.startsWith('data:video/');

  const isActualAudio =
    item.kind === 'audio' ||
    /\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(item.url) ||
    item.url.startsWith('data:audio/');

  const triggerDownload = () => {
    if (item.onDownload) {
      item.onDownload();
      return;
    }
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.title
      ? `spacix-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      : 'spacix-media';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/92 backdrop-blur-md flex flex-col p-3 sm:p-6 overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.title || 'Media Preview'}
    >
      {/* Top Header Bar */}
      <div
        className="w-full max-w-6xl mx-auto flex items-center justify-between gap-3 pb-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#46ecd5]/15 border border-[#46ecd5]/30 flex items-center justify-center shrink-0">
            {isActualAudio ? (
              <Music className="w-4 h-4 text-[#46ecd5]" />
            ) : isActualVideo ? (
              <Film className="w-4 h-4 text-[#46ecd5]" />
            ) : (
              <Maximize2 className="w-4 h-4 text-[#46ecd5]" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">
              {item.title || 'Studio Output Preview'}
            </h3>
            {item.subtitle && (
              <p className="text-[11px] font-mono text-zinc-400 truncate">
                {item.subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.onAnimate && !isActualVideo && !isActualAudio && (
            <button
              type="button"
              onClick={item.onAnimate}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#46ecd5] text-zinc-950 text-xs font-bold hover:brightness-105 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Animate</span>
            </button>
          )}
          {item.onReuse && (
            <button
              type="button"
              onClick={item.onReuse}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/15 text-xs font-semibold text-white hover:bg-zinc-800 transition"
            >
              <span>Reuse Setup</span>
            </button>
          )}
          <button
            type="button"
            onClick={triggerDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/15 text-xs font-semibold text-white hover:bg-zinc-800 transition"
            aria-label="Download media"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/15 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition"
            aria-label="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Media Stage — preserves true natural aspect ratio */}
      <div
        className="flex-1 min-h-0 w-full max-w-6xl mx-auto flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {isActualAudio ? (
          <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-zinc-950/95 p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#46ecd5]/15 border border-[#46ecd5]/30 flex items-center justify-center shrink-0">
                <Music className="w-6 h-6 text-[#46ecd5]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {item.title || 'Audio Master'}
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  {formatTime(audioTime)} / {formatTime(audioDuration)}
                </div>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={item.url}
              onTimeUpdate={() => {
                if (audioRef.current) setAudioTime(audioRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (audioRef.current) {
                  setAudioDuration(audioRef.current.duration || 0);
                  audioRef.current.volume = audioVolume;
                  audioRef.current.muted = audioMuted;
                }
              }}
              onEnded={() => setAudioPlaying(false)}
              className="hidden"
            />

            {/* Animated waveform bars */}
            <div className="h-20 rounded-xl bg-zinc-900/90 border border-white/10 px-4 flex items-center justify-between gap-1">
              {Array.from({ length: 40 }).map((_, idx) => {
                const progress = audioDuration > 0 ? audioTime / audioDuration : 0;
                const active = idx / 40 <= progress;
                const hPct = 24 + Math.abs(Math.sin(idx * 0.72)) * 68;
                return (
                  <div
                    key={idx}
                    style={{ height: `${hPct}%` }}
                    className={`flex-1 rounded-full transition-colors ${
                      active ? 'bg-[#46ecd5]' : 'bg-zinc-700/70'
                    }`}
                  />
                );
              })}
            </div>

            {/* Scrubbing Slider */}
            <input
              type="range"
              min={0}
              max={audioDuration || 100}
              step={0.05}
              value={audioTime}
              onChange={(e) => {
                const t = Number(e.target.value);
                setAudioTime(t);
                if (audioRef.current) audioRef.current.currentTime = t;
              }}
              className="w-full accent-[#46ecd5] cursor-pointer"
              aria-label="Audio playback progress"
            />

            {/* Playback & Volume Controls */}
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  const el = audioRef.current;
                  if (!el) return;
                  if (audioPlaying) {
                    el.pause();
                    setAudioPlaying(false);
                  } else {
                    el.play().then(() => setAudioPlaying(true)).catch(() => {});
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#46ecd5] text-zinc-950 font-bold text-xs inline-flex items-center gap-2 hover:brightness-105"
              >
                {audioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{audioPlaying ? 'Pause' : 'Play Audio'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextMuted = !audioMuted;
                    setAudioMuted(nextMuted);
                    if (audioRef.current) audioRef.current.muted = nextMuted;
                  }}
                  className="p-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white"
                  aria-label="Toggle mute"
                >
                  {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={audioMuted ? 0 : audioVolume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setAudioVolume(v);
                    setAudioMuted(v === 0);
                    if (audioRef.current) {
                      audioRef.current.volume = v;
                      audioRef.current.muted = v === 0;
                    }
                  }}
                  className="w-24 accent-[#46ecd5] cursor-pointer"
                  aria-label="Audio volume"
                />
              </div>
            </div>
          </div>
        ) : isActualVideo ? (
          <div className="relative flex items-center justify-center max-w-full max-h-full rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl">
            <video
              src={item.url}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-[78vh] w-auto h-auto object-contain"
            />
          </div>
        ) : (
          <div className="relative flex items-center justify-center max-w-full max-h-full rounded-2xl overflow-hidden border border-white/15 bg-zinc-950/60 shadow-2xl">
            <img
              src={item.url}
              alt={item.title || 'Studio visual'}
              className="max-w-full max-h-[78vh] w-auto h-auto object-contain select-none"
            />
          </div>
        )}
      </div>

      {/* Bottom Prompt Caption */}
      {item.prompt && (
        <div
          className="w-full max-w-4xl mx-auto pt-3 shrink-0 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-zinc-300 line-clamp-2 bg-zinc-950/85 border border-white/10 rounded-xl px-4 py-2 inline-block max-w-full">
            {item.prompt}
          </p>
        </div>
      )}
    </div>
  );
};
