import { getModelById } from '../catalog/models';
import { ApiProviderId, MediaSlotInput } from '../types/studio';

export const DEFAULT_CREDIT_USD_VALUE = 0.01;
export const DEFAULT_CREDIT_MARKUP = 2.0;

/**
 * Pure pricing function shared by client UI ("Generate ✦ 60") and server submitGeneration.
 * Formula: credits = ceil(providerUsdCost * CREDIT_MARKUP / CREDIT_USD_VALUE)
 */
export function priceFor(
  modelId: string,
  settings: Record<string, string | number | boolean>,
  media: MediaSlotInput[] = [],
  options?: {
    creditMarkup?: number;
    creditUsdValue?: number;
    overrideBaseUsd?: number;
    apiProvider?: ApiProviderId;
    billingUnitOverride?: 'per_second' | 'per_image' | 'per_generation';
    surfaceOverride?: 'image' | 'video' | 'audio';
  }
): number {
  const model = getModelById(modelId);
  if (!model && options?.overrideBaseUsd === undefined) return 10;

  const markup = options?.creditMarkup ?? DEFAULT_CREDIT_MARKUP;
  const creditUsd = Math.max(0.0001, options?.creditUsdValue ?? DEFAULT_CREDIT_USD_VALUE);

  const providerSpec =
    model && options?.apiProvider
      ? model.supportedProviders?.find((p) => p.providerId === options.apiProvider)
      : undefined;

  const baseUsd =
    options?.overrideBaseUsd ?? providerSpec?.baseUsd ?? model?.baseHfUsd ?? 0.05;
  const billingUnit = options?.billingUnitOverride ?? model?.billingUnit ?? 'per_image';
  const surface = options?.surfaceOverride ?? model?.surface ?? 'image';

  let hfUsdCost = baseUsd;

  if (billingUnit === 'per_second') {
    const durationSec = Math.max(1, Number(settings.duration ?? 5));
    hfUsdCost = baseUsd * durationSec;
  } else if (billingUnit === 'per_image') {
    hfUsdCost = baseUsd;
  } else {
    // per_generation (audio or specialized rig)
    const durationSec = Number(settings.duration ?? 0);
    if (surface === 'audio' && durationSec >= 60) {
      hfUsdCost = baseUsd * 1.6;
    }
  }

  // Resolution multipliers matching studio composer tiers
  const resolution = String(settings.resolution ?? '');
  if (resolution === '4K') {
    hfUsdCost *= 1.5;
  } else if (resolution === '2K') {
    hfUsdCost *= 1.2;
  } else if (resolution === '720p' || resolution === '1K') {
    hfUsdCost *= 0.85;
  }

  // Multi-reference compute overhead
  if (media.length > 2) {
    hfUsdCost *= 1.1;
  }

  const rawCredits = (hfUsdCost * markup) / creditUsd;
  return Math.max(1, Math.ceil(rawCredits));
}
