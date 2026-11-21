/**
 * Browser Web Audio Engine for SPACIX Music Video Production.
 * Handles real audio decoding, high-resolution waveform peak extraction,
 * and non-destructive PCM WAV segment slicing (leaving original audio intact).
 */

export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function formatTimeShort(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(dataUrl);
  return res.arrayBuffer();
}

export async function decodeAudioArrayBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    // Copy buffer because decodeAudioData detaches the passed ArrayBuffer
    const copy = arrayBuffer.slice(0);
    return await ctx.decodeAudioData(copy);
  } finally {
    await ctx.close().catch(() => {});
  }
}

export function extractWaveformPeaks(audioBuffer: AudioBuffer, barCount = 260): number[] {
  const channelCount = Math.min(audioBuffer.numberOfChannels, 2);
  const length = audioBuffer.length;
  if (length === 0) return Array.from({ length: barCount }, () => 0.15);

  const blockSize = Math.max(1, Math.floor(length / barCount));
  const peaks: number[] = [];
  let globalMax = 0.001;

  for (let i = 0; i < barCount; i++) {
    const start = i * blockSize;
    const end = Math.min(length, start + blockSize);
    let sumSq = 0;
    let peak = 0;
    let samples = 0;
    const stride = Math.max(1, Math.floor((end - start) / 160));

    for (let ch = 0; ch < channelCount; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let idx = start; idx < end; idx += stride) {
        const val = Math.abs(data[idx]);
        if (val > peak) peak = val;
        sumSq += val * val;
        samples++;
      }
    }

    const rms = samples > 0 ? Math.sqrt(sumSq / samples) : 0;
    const blended = peak * 0.55 + rms * 0.45;
    if (blended > globalMax) globalMax = blended;
    peaks.push(blended);
  }

  return peaks.map((v) => Math.max(0.06, Math.min(1, v / globalMax)));
}

/**
 * Non-destructively slices an AudioBuffer between [startSec, endSec] and encodes
 * a clean 16-bit mono/stereo PCM WAV Blob for lip-sync models and segment export.
 * The original AudioBuffer and uploaded file are never mutated.
 */
export function sliceAudioBufferToWavBlob(
  audioBuffer: AudioBuffer,
  startSec: number,
  endSec: number
): Blob {
  const sampleRate = audioBuffer.sampleRate;
  const safeStart = Math.max(0, Math.min(startSec, audioBuffer.duration));
  const safeEnd = Math.max(safeStart + 0.1, Math.min(endSec, audioBuffer.duration));

  const startOffset = Math.floor(safeStart * sampleRate);
  const endOffset = Math.min(audioBuffer.length, Math.floor(safeEnd * sampleRate));
  const frameCount = Math.max(1, endOffset - startOffset);
  const numChannels = Math.min(audioBuffer.numberOfChannels, 2);

  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < frameCount; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][startOffset + i] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export async function sliceAudioBufferToWavDataUrl(
  audioBuffer: AudioBuffer,
  startSec: number,
  endSec: number
): Promise<{ blob: Blob; dataUrl: string; durationSec: number }> {
  const blob = sliceAudioBufferToWavBlob(audioBuffer, startSec, endSec);
  const dataUrl = await fileToDataUrl(blob);
  return {
    blob,
    dataUrl,
    durationSec: Math.max(0.1, endSec - startSec),
  };
}
