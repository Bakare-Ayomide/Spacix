import type { UniversalCreativeControlsState } from '../types/studio';

type ColorGradingState = UniversalCreativeControlsState['colorGrading'];
type FilmLookState = UniversalCreativeControlsState['filmLook'];

interface PresetFilterProfile {
  contrast: number;
  saturate: number;
  sepia: number;
  hueRotate: number;
  brightness: number;
}

const PRESET_FILTER_PROFILES: Record<string, PresetFilterProfile> = {
  Auto: { contrast: 1, saturate: 1, sepia: 0, hueRotate: 0, brightness: 1 },
  'Static Noon': { contrast: 1.24, saturate: 0.14, sepia: 0.16, hueRotate: 8, brightness: 1.02 },
  'Twilight Fable': { contrast: 1.12, saturate: 1.14, sepia: 0.12, hueRotate: -10, brightness: 0.96 },
  'Back Row Kissing Seats': { contrast: 1.16, saturate: 1.32, sepia: 0.04, hueRotate: -14, brightness: 0.98 },
  'On the Other Side of the Port': { contrast: 0.96, saturate: 0.92, sepia: 0.18, hueRotate: 4, brightness: 1.04 },
  'The Emerald Ambush': { contrast: 1.08, saturate: 1.08, sepia: 0.1, hueRotate: 22, brightness: 0.95 },
  'Highway Standoff': { contrast: 1.14, saturate: 1.18, sepia: 0.28, hueRotate: -6, brightness: 1.04 },
  'The Faded Fresco': { contrast: 0.92, saturate: 0.88, sepia: 0.22, hueRotate: 6, brightness: 1.06 },
  'Kodak 2383': { contrast: 1.15, saturate: 1.08, sepia: 0.12, hueRotate: -4, brightness: 1.0 },
  'Noir Silver': { contrast: 1.35, saturate: 0, sepia: 0.06, hueRotate: 0, brightness: 0.96 },
};

export function buildCssFilterFromGrading(
  grading?: ColorGradingState | null,
  filmLook?: FilmLookState | null
): string | undefined {
  if (!grading) return undefined;
  const preset = PRESET_FILTER_PROFILES[grading.presetId] || PRESET_FILTER_PROFILES.Auto;
  const intensity = Math.max(0, Math.min(1, (grading.lutIntensity ?? 80) / 100));

  const mix = (target: number, base = 1) => base + (target - base) * intensity;

  const tempNorm = (grading.temperature ?? 0) / 100;
  const satNorm = 1 + (grading.saturation ?? 0) / 100;
  const contrastNorm = 1 + (grading.contrast ?? 0) / 100;
  const brightNorm =
    1 + ((grading.highlights ?? 0) * 0.15 + (grading.shadows ?? 0) * 0.12) / 100;

  let eraSepia = 0;
  if (filmLook?.era === '1920s') eraSepia = 0.35;
  else if (filmLook?.era === '1960s' || filmLook?.era === '1970s') eraSepia = 0.14;

  const finalContrast = Math.max(0.5, mix(preset.contrast, 1) * contrastNorm);
  const finalSaturate =
    filmLook?.era === '1920s'
      ? Math.max(0, 0.2 * satNorm)
      : Math.max(0, mix(preset.saturate, 1) * satNorm);
  const finalSepia = Math.min(
    0.85,
    Math.max(0, mix(preset.sepia, 0) + (tempNorm > 0 ? tempNorm * 0.25 : 0) + eraSepia)
  );
  const finalHue = mix(preset.hueRotate, 0) + (grading.tint ?? 0) * 0.25 + (tempNorm < 0 ? tempNorm * 14 : 0);
  const finalBrightness = Math.max(0.65, mix(preset.brightness, 1) * brightNorm);

  const isNeutral =
    Math.abs(finalContrast - 1) < 0.02 &&
    Math.abs(finalSaturate - 1) < 0.02 &&
    finalSepia < 0.02 &&
    Math.abs(finalHue) < 1 &&
    Math.abs(finalBrightness - 1) < 0.02;

  if (isNeutral) return undefined;

  return `contrast(${finalContrast.toFixed(2)}) saturate(${finalSaturate.toFixed(
    2
  )}) sepia(${finalSepia.toFixed(2)}) hue-rotate(${finalHue.toFixed(
    1
  )}deg) brightness(${finalBrightness.toFixed(2)})`;
}

export async function applyCreativeLookCanvas(
  imageUrl: string,
  grading?: ColorGradingState | null,
  filmLook?: FilmLookState | null
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || 1280;
        const h = img.naturalHeight || 720;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        const filter = buildCssFilterFromGrading(grading, filmLook);
        if (filter) {
          ctx.filter = filter;
        }
        ctx.drawImage(img, 0, 0, w, h);
        ctx.filter = 'none';

        // Subtle organic film grain overlay if requested
        const grainAmount = grading?.grain ?? 0;
        if (grainAmount > 0) {
          const alpha = Math.min(0.18, (grainAmount / 100) * 0.14);
          ctx.fillStyle = `rgba(255, 250, 240, ${alpha * 0.35})`;
          for (let i = 0; i < Math.min(4500, Math.floor((w * h) / 280)); i++) {
            const gx = Math.random() * w;
            const gy = Math.random() * h;
            ctx.fillRect(gx, gy, 1.4, 1.4);
          }
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to encode graded frame'));
              return;
            }
            resolve(URL.createObjectURL(blob));
          },
          'image/jpeg',
          0.93
        );
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for canvas grading'));
    img.src = imageUrl;
  });
}
