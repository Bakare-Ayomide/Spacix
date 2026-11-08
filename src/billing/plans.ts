import { PlanTierId } from '../types/studio';

export interface PlanDefinition {
  id: PlanTierId;
  name: string;
  audience: string;
  monthlyUsd: number;
  annualMonthlyUsd: number;
  annualTotalUsd: number;
  monthlyCredits: number;
  badge?: string;
  parallelLimits: {
    video: number;
    image: number;
    audio: number;
  };
  topupRatePerDollar: number;
  features: string[];
}

export type StudioPlan = PlanDefinition;

export interface TopupPack {
  id: 'topup_small' | 'topup_medium' | 'topup_large';
  name: string;
  credits: number;
  priceUsd: number;
  tag?: string;
}

export const STUDIO_PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Explorer',
    audience: 'For testing the workflow & camera rigs',
    monthlyUsd: 0,
    annualMonthlyUsd: 0,
    annualTotalUsd: 0,
    monthlyCredits: 250,
    parallelLimits: { video: 1, image: 2, audio: 2 },
    topupRatePerDollar: 80,
    features: [
      '250 starter credits on magic-link signup',
      '1 video / 2 image parallel runs',
      'Access to Soul 2.0, Seedance 2.0 Fast & Z-Image',
      'Standard 1080p & 2K exports stored in R2',
    ],
  },
  {
    id: 'starter',
    name: 'Creator',
    audience: 'For independent directors & storytellers',
    monthlyUsd: 19,
    annualMonthlyUsd: 15,
    annualTotalUsd: 180,
    monthlyCredits: 1800,
    parallelLimits: { video: 2, image: 4, audio: 4 },
    topupRatePerDollar: 100,
    features: [
      '1,800 monthly credits (resets each cycle)',
      '2 video / 4 image parallel generations',
      'Full access to Seedance 2.5, Kling 3.0 & DoP Rigs',
      'Commercial license + private R2 asset vault',
    ],
  },
  {
    id: 'plus',
    name: 'Studio Plus',
    audience: 'For high-volume production & creative leads',
    monthlyUsd: 49,
    annualMonthlyUsd: 39,
    annualTotalUsd: 468,
    monthlyCredits: 5200,
    badge: 'Most Popular',
    parallelLimits: { video: 6, image: 8, audio: 6 },
    topupRatePerDollar: 115,
    features: [
      '5,200 monthly credits (resets each cycle)',
      '6 video / 8 image parallel generations',
      '4K mastering on Kling 3.0 Pro & Soul Cinema',
      'Priority queue routing + Kling Motion Control',
    ],
  },
  {
    id: 'ultra',
    name: 'Production Ultra',
    audience: 'For agencies & full-scale post houses',
    monthlyUsd: 129,
    annualMonthlyUsd: 99,
    annualTotalUsd: 1188,
    monthlyCredits: 15000,
    badge: 'Best Value',
    parallelLimits: { video: 12, image: 16, audio: 12 },
    topupRatePerDollar: 130,
    features: [
      '15,000 monthly credits (resets each cycle)',
      '12 video / 16 image parallel generations',
      'Highest priority GPU cluster dispatch',
      'Dedicated R2 archival retention & multi-project workspaces',
    ],
  },
];

export const TOPUP_PACKS: TopupPack[] = [
  {
    id: 'topup_small',
    name: 'Boost Pack',
    credits: 1000,
    priceUsd: 10,
  },
  {
    id: 'topup_medium',
    name: 'Director Pack',
    credits: 3000,
    priceUsd: 25,
    tag: '+20% Bonus Credits',
  },
  {
    id: 'topup_large',
    name: 'Feature Film Pack',
    credits: 8000,
    priceUsd: 60,
    tag: '+33% Bonus Credits',
  },
];

export function getPlanById(planId: PlanTierId): PlanDefinition {
  return STUDIO_PLANS.find((p) => p.id === planId) ?? STUDIO_PLANS[0];
}
