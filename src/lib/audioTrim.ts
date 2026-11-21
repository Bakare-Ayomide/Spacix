// ============================================================================
// SPACIX MUSIC VIDEO STUDIO — NON-DESTRUCTIVE AUDIO DECODING, WAVEFORM & TRIMMING
// ============================================================================

export interface DecodedAudioTrack {
  id: string;
  title: string;
  sourceType: 'upload' | 'url';
  sourceUrl?: string;
  /** Persistent uploaded URL (data URL or remote URL) of the ORIGINAL unmodified audio */
  originalPublicUrl: string;
  /** Browser object URL for low-latency HTMLAudioElement playback */
  objectUrl: string;
  contentType: string;
  bytes: number;
  durationSec: number;
  peaks: number[];
  audioBuffer: AudioBuffer;
}

export interface TrimmedWavResult {
  blob: Blob;
  objectUrl: string;
  dataUrl: string;
  durationSec: number;
  bytes: number;
  startSec: number;
  endSec: number;
}

export const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.webm'];

export const SUPPORTED_AUDIO_ACCEPT =
  'audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/ogg,audio/flac,audio/aac,audio/webm,.mp3,.wav,.m4a,.ogg,.flac,.aac,.webm';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('Audio decoding is only available in the browser.');
  }
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) {
    throw new Error('Your browser does not support Web Audio decoding.');
  }
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new Ctx();
  }
  return sharedAudioCtx;
}

export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds - Math.floor(seconds)) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function formatTimecodeShort(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function clampTrimRange(
  startSec: number,
  endSec: number,
  durationSec: number,
  minSegmentSec = 0.5
): { startSec: number; endSec: number } {
  const safeDur = Math.max(0.5, Number.isFinite(durationSec) ? durationSec : 0.5);
  const minLen = Math.min(minSegmentSec, safeDur);
  let start = Math.max(0, Math.min(startSec, safeDur - minLen));
  let end = Math.max(start + minLen, Math.min(endSec, safeDur));
  if (end - start < minLen) {
    end = Math.min(safeDur, start + minLen);
    start = Math.max(0, end - minLen);
  }
  return {
    startSec: Math.round(start * 100) / 100,
    endSec: Math.round(end * 100) / 100,
  };
}

export function extractWaveformPeaks(buffer: AudioBuffer, barCount = 180): number[] {
  const channels = buffer.numberOfChannels;
  const totalSamples = buffer.length;
  if (totalSamples === 0 || barCount <= 0) {
    return Array.from({ length: Math.max(1, barCount) }, () => 0.12);
  }

  const samplesPerBar = Math.max(1, Math.floor(totalSamples / barCount));
  const rawPeaks: number[] = new Array(barCount).fill(0);
  const chData: Float32Array[] = [];
  for (let c = 0; c < Math.min(channels, 2); c++) {
    chData.push(buffer.getChannelData(c));
  }

  let maxVal = 0.001;
  for (let i = 0; i < barCount; i++) {
    const start = i * samplesPerBar;
    const end = Math.min(totalSamples, start + samplesPerBar);
    const step = Math.max(1, Math.floor((end - start) / 64));
    let sumSq = 0;
    let peak = 0;
    let count = 0;

    for (let s = start; s < end; s += step) {
      let sample = 0;
      for (let c = 0; c < chData.length; c++) {
        sample += Math.abs(chData[c][s] || 0);
      }
      sample /= chData.length;
      if (sample > peak) peak = sample;
      sumSq += sample * sample;
      count++;
    }

    const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
    const blended = peak * 0.65 + rms * 0.35;
    rawPeaks[i] = blended;
    if (blended > maxVal) maxVal = blended;
  }

  return rawPeaks.map((v) => {
    const norm = v / maxVal;
    return Math.max(0.08, Math.min(1, Math.pow(norm, 0.85)));
  });
}

export async function decodeAudioArrayBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  // Clone buffer because decodeAudioData detaches the passed ArrayBuffer
  const copy = arrayBuffer.slice(0);
  return await new Promise<AudioBuffer>((resolve, reject) => {
    const maybePromise = ctx.decodeAudioData(
      copy,
      (decoded) => resolve(decoded),
      (err) =>
        reject(
          err instanceof Error
            ? err
            : new Error('Unable to decode this audio file. Please try MP3, WAV, M4A, or OGG.')
        )
    );
    if (maybePromise && typeof (maybePromise as Promise<AudioBuffer>).then === 'function') {
      (maybePromise as Promise<AudioBuffer>).then(resolve, reject);
    }
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read audio binary data.'));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToArrayBuffer(dataUrl: string): { buffer: ArrayBuffer; contentType: string } {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/i);
  if (!match) {
    throw new Error('Invalid audio data payload.');
  }
  const contentType = (match[1] || 'audio/mpeg').toLowerCase();
  const base64 = match[2];
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return { buffer: bytes.buffer, contentType };
}

export async function decodeAudioFromFile(file: File): Promise<{
  audioBuffer: AudioBuffer;
  peaks: number[];
  durationSec: number;
  dataUrl: string;
  objectUrl: string;
  contentType: string;
  bytes: number;
  title: string;
}> {
  if (!file || file.size === 0) {
    throw new Error('Selected audio file is empty.');
  }
  if (file.size > 40 * 1024 * 1024) {
    throw new Error('Audio file exceeds the 40 MB upload limit. Please use a compressed MP3 or M4A.');
  }
  const lower = file.name.toLowerCase();
  const hasSupportedExt = SUPPORTED_AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
  const isAudioMime = file.type.startsWith('audio/') || file.type === 'application/ogg';
  if (!hasSupportedExt && !isAudioMime) {
    throw new Error(
      'Unsupported file format. Upload MP3, WAV, M4A, OGG, FLAC, AAC, or WebM audio.'
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await decodeAudioArrayBuffer(arrayBuffer);
  const peaks = extractWaveformPeaks(audioBuffer, 200);
  const dataUrl = await blobToDataUrl(file);
  const objectUrl = URL.createObjectURL(file);
  const cleanTitle = file.name.replace(/\.[^.]+$/, '').trim() || 'Uploaded Track';
  const contentType = file.type || (lower.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg');

  return {
    audioBuffer,
    peaks,
    durationSec: audioBuffer.duration,
    dataUrl,
    objectUrl,
    contentType,
    bytes: file.size,
    title: cleanTitle,
  };
}

export async function importAudioFromDirectUrl(
  rawUrl: string,
  sessionToken: string,
  label?: string
): Promise<DecodedAudioTrack> {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Enter a direct audio URL (MP3, WAV, M4A, OGG, FLAC, AAC, or WebM).');
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Please enter a valid https:// direct audio URL.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only http:// and https:// direct audio URLs are supported.');
  }

  // First try SPACIX backend /api/audio/import-url (handles CORS + magic-byte audio verification + SSRF guard)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  const res = await fetch('/api/audio/import-url', {
    method: 'POST',
    headers,
    body: JSON.stringify({ url: trimmed, label: label || '' }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      payload?.error ||
        `Unable to import audio from URL (HTTP ${res.status}). Ensure it is a direct, publicly accessible audio file.`
    );
  }

  const publicUrl = String(payload?.public_url || payload?.upload?.publicUrl || '');
  if (!publicUrl) {
    throw new Error('Server did not return imported audio data.');
  }

  let arrayBuffer: ArrayBuffer;
  let contentType = String(payload?.contentType || 'audio/mpeg');

  if (publicUrl.startsWith('data:')) {
    const decoded = dataUrlToArrayBuffer(publicUrl);
    arrayBuffer = decoded.buffer;
    contentType = decoded.contentType || contentType;
  } else {
    const audioRes = await fetch(publicUrl);
    if (!audioRes.ok) {
      throw new Error('Imported audio could not be retrieved for playback.');
    }
    arrayBuffer = await audioRes.arrayBuffer();
  }

  const audioBuffer = await decodeAudioArrayBuffer(arrayBuffer);
  const peaks = extractWaveformPeaks(audioBuffer, 200);
  const blob = new Blob([arrayBuffer], { type: contentType });
  const objectUrl = URL.createObjectURL(blob);

  return {
    id: String(payload?.upload?.id || `trk_${Date.now()}`),
    title: String(payload?.title || payload?.upload?.label || 'Imported Music Track'),
    sourceType: 'url',
    sourceUrl: trimmed,
    originalPublicUrl: publicUrl,
    objectUrl,
    contentType,
    bytes: Number(payload?.bytes || arrayBuffer.byteLength),
    durationSec: audioBuffer.duration,
    peaks,
    audioBuffer,
  };
}

/**
 * Non-destructively slices an AudioBuffer from [startSec, endSec] into a clean 16-bit PCM WAV Blob.
 * Downsamples smoothly to 22050 Hz mono if longer than 10s (or 24000 Hz mono for <=10s) so
 * vocal lip-sync timing stays crisp while keeping upload payloads fast and reliable.
 */
export async function sliceAudioBufferToWav(
  sourceBuffer: AudioBuffer,
  startSec: number,
  endSec: number
): Promise<TrimmedWavResult> {
  const { startSec: safeStart, endSec: safeEnd } = clampTrimRange(
    startSec,
    endSec,
    sourceBuffer.duration,
    0.5
  );
  const clipDuration = Math.max(0.5, safeEnd - safeStart);
  const targetSampleRate = clipDuration > 18 ? 16000 : 24000;
  const targetLength = Math.max(1, Math.floor(clipDuration * targetSampleRate));

  // Render exact slice via OfflineAudioContext for clean anti-aliased resampling & mono vocal sum
  const offline = new OfflineAudioContext(1, targetLength, targetSampleRate);
  const srcNode = offline.createBufferSource();
  srcNode.buffer = sourceBuffer;
  srcNode.connect(offline.destination);
  srcNode.start(0, safeStart, clipDuration);

  const rendered = await offline.startRendering();
  const channelData = rendered.getChannelData(0);

  // Encode standard RIFF WAVE (16-bit PCM, mono)
  const numSamples = channelData.length;
  const dataByteLength = numSamples * 2;
  const wavBuffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  const objectUrl = URL.createObjectURL(blob);
  const dataUrl = await blobToDataUrl(blob);

  return {
    blob,
    objectUrl,
    dataUrl,
    durationSec: Math.round(clipDuration * 100) / 100,
    bytes: blob.size,
    startSec: safeStart,
    endSec: safeEnd,
  };
}
