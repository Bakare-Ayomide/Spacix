/**
 * Client-side Web Audio API waveform analysis and non-destructive audio trimming utilities
 * for SPACIX Cinema Studio — Music Video Production mode.
 */

export interface DecodedAudioResult {
  audioBuffer: AudioBuffer;
  durationSec: number;
  waveform: number[];
}

export function formatTimecode(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const tenths = Math.floor((safe % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function formatDurationCompact(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  if (safe < 60) {
    return `${safe.toFixed(1)}s`;
  }
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${mins}m ${rem.toFixed(1)}s`;
}

export function extractWaveformPeaks(audioBuffer: AudioBuffer, barCount = 160): number[] {
  const channelData = audioBuffer.getChannelData(0);
  const secondChannel = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;
  const totalSamples = channelData.length;
  if (totalSamples === 0) {
    return Array.from({ length: barCount }, () => 0.18);
  }

  const blockSize = Math.max(1, Math.floor(totalSamples / barCount));
  const rawPeaks: number[] = [];
  let maxPeak = 0.001;

  for (let i = 0; i < barCount; i++) {
    const start = i * blockSize;
    const end = Math.min(totalSamples, start + blockSize);
    const step = Math.max(1, Math.floor((end - start) / 64));
    let sumSq = 0;
    let peak = 0;
    let count = 0;
    for (let j = start; j < end; j += step) {
      const s0 = Math.abs(channelData[j] || 0);
      const s1 = secondChannel ? Math.abs(secondChannel[j] || 0) : s0;
      const v = (s0 + s1) * 0.5;
      if (v > peak) peak = v;
      sumSq += v * v;
      count++;
    }
    const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
    const blended = peak * 0.55 + rms * 0.45;
    if (blended > maxPeak) maxPeak = blended;
    rawPeaks.push(blended);
  }

  return rawPeaks.map((p) => {
    const normalized = Math.pow(p / maxPeak, 0.85);
    return Number(Math.max(0.08, Math.min(1, normalized)).toFixed(3));
  });
}

function createAudioContext(): AudioContext {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctx();
}

export async function decodeAudioFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  barCount = 160
): Promise<DecodedAudioResult> {
  const ctx = createAudioContext();
  try {
    // Copy buffer since decodeAudioData detaches the underlying ArrayBuffer
    const copy = arrayBuffer.slice(0);
    const audioBuffer = await ctx.decodeAudioData(copy);
    const waveform = extractWaveformPeaks(audioBuffer, barCount);
    return {
      audioBuffer,
      durationSec: audioBuffer.duration,
      waveform,
    };
  } finally {
    await ctx.close().catch(() => {});
  }
}

export async function decodeAudioFromUrl(
  url: string,
  barCount = 160
): Promise<DecodedAudioResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load audio stream (HTTP ${response.status}).`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return decodeAudioFromArrayBuffer(arrayBuffer, barCount);
}

/**
 * Non-destructively slices [startSec, endSec] from an AudioBuffer and encodes it
 * as a clean 16-bit PCM WAV data URL (mono, 24kHz max) suitable for audio-driven lip-sync models.
 */
export function sliceAudioBufferToWavDataUrl(
  audioBuffer: AudioBuffer,
  startSec: number,
  endSec: number
): { dataUrl: string; bytes: number; durationSec: number } {
  const totalDuration = audioBuffer.duration;
  const clampedStart = Math.max(0, Math.min(startSec, Math.max(0, totalDuration - 0.25)));
  const clampedEnd = Math.max(clampedStart + 0.25, Math.min(endSec, totalDuration));
  const segmentDuration = clampedEnd - clampedStart;

  const srcRate = audioBuffer.sampleRate;
  const targetRate = Math.min(srcRate, 24000);
  const ratio = srcRate / targetRate;

  const startSample = Math.floor(clampedStart * srcRate);
  const endSample = Math.min(audioBuffer.length, Math.ceil(clampedEnd * srcRate));
  const srcLength = Math.max(1, endSample - startSample);
  const outLength = Math.max(1, Math.floor(srcLength / ratio));

  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;

  const dataByteLength = outLength * 2;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  let writeOffset = 44;
  for (let i = 0; i < outLength; i++) {
    const srcIdx = Math.min(audioBuffer.length - 1, startSample + Math.floor(i * ratio));
    const s = ch1 ? (ch0[srcIdx] + ch1[srcIdx]) * 0.5 : ch0[srcIdx];
    const clamped = Math.max(-1, Math.min(1, s));
    view.setInt16(writeOffset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    writeOffset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);

  return {
    dataUrl: `data:audio/wav;base64,${base64}`,
    bytes: bytes.byteLength,
    durationSec: Number(segmentDuration.toFixed(2)),
  };
}

export function buildFallbackWaveform(seedText: string, barCount = 160): number[] {
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Array.from({ length: barCount }, (_, i) => {
    const t = i / barCount;
    const wave =
      0.42 +
      0.26 * Math.sin(t * Math.PI * 14 + (hash % 7)) +
      0.18 * Math.cos(t * Math.PI * 33 + (hash % 13)) +
      0.12 * Math.sin(t * Math.PI * 5);
    return Number(Math.max(0.12, Math.min(0.98, Math.abs(wave))).toFixed(3));
  });
}
