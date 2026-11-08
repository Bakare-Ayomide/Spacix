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
  }
): number {
  const model = getModelById(modelId);
  if (!model) return 10;

  const markup = options?.creditMarkup ?? DEFAULT_CREDIT_MARKUP;
  const creditUsd = options?.creditUsdValue ?? DEFAULT_CREDIT_USD_VALUE;

  const providerSpec = options?.apiProvider
    ? model.supportedProviders?.find((p) => p.providerId === options.apiProvider)
    : undefined;

  const baseUsd = options?.overrideBaseUsd ?? providerSpec?.baseUsd ?? model.baseHfUsd;

  let hfUsdCost = baseUsd;

  if (model.billingUnit === 'per_second') {
    const durationSec = Math.max(1, Number(settings.duration ?? 5));
    hfUsdCost = baseUsd * durationSec;
  } else if (model.billingUnit === 'per_image') {
    hfUsdCost = baseUsd;
  } else {
    // per_generation (audio or specialized rig)
    const durationSec = Number(settings.duration ?? 0);
    if (model.surface === 'audio' && durationSec >= 60) {
      hfUsdCost = baseUsd * 1.6;
    }
  }

  // Resolution multipliers matching console tiers
  const resolution = String(settings.resolution ?? '');
  if (resolution === '4K') {
    hfUsdCost *= 1.5;
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
