import { CharacterProfile } from '../types/studio';

export interface CharacterTurnaroundInput {
  name?: string;
  role?: string;
  appearance?: string;
  wardrobe?: string;
  styleNotes?: string;
  description?: string;
  ethnicity?: string;
  skinTone?: string;
  gender?: string;
  age?: string;
  facialStructure?: string;
  bodyType?: string;
  hairStyle?: string;
  clothes?: string;
  outfitDescription?: string;
  personalityMood?: string;
  visualStyle?: string;
  extraNotes?: string;
}

/**
 * Builds a standardized 1:1 4-Panel Character Turnaround Sheet prompt:
 * Top-Left: FULL BODY (head-to-toe standing front view)
 * Top-Right: HALF BODY (chest-up portrait capturing clear facial details)
 * Bottom-Left: SIDE PROFILE (clean 90-degree profile view)
 * Bottom-Right: BACK VIEW (head-to-toe rear view showing back of hair & outfit)
 * Matching the exact 2x2 grid turnaround convention.
 */
export function buildCharacterTurnaroundPrompt(
  input: CharacterTurnaroundInput | Partial<CharacterProfile>
): string {
  const name = input.name?.trim() || 'Character';
  const parts: string[] = [];

  if ('role' in input && input.role) parts.push(`role: ${input.role}`);
  else if ('roleTitle' in input && input.roleTitle) parts.push(`role: ${input.roleTitle}`);
  if ('gender' in input && input.gender) parts.push(`gender: ${input.gender}`);
  else if ('genderPresentation' in input && input.genderPresentation) parts.push(`gender: ${input.genderPresentation}`);
  if ('age' in input && input.age) parts.push(`age: ${input.age}`);
  else if ('ageRange' in input && input.ageRange) parts.push(`age: ${input.ageRange}`);
  if ('ethnicity' in input && input.ethnicity) parts.push(`ethnicity: ${input.ethnicity}`);
  if ('skinTone' in input && input.skinTone) parts.push(`skin tone: ${input.skinTone}`);
  if ('facialStructure' in input && input.facialStructure) parts.push(`facial features: ${input.facialStructure}`);
  if ('bodyType' in input && input.bodyType) parts.push(`body type/build: ${input.bodyType}`);
  if ('hairStyle' in input && input.hairStyle) parts.push(`hair: ${input.hairStyle}`);
  else if ('hairstyle' in input && input.hairstyle) parts.push(`hair: ${input.hairstyle}`);
  if ('appearance' in input && input.appearance) parts.push(`appearance: ${input.appearance}`);
  const outfit =
    ('wardrobe' in input && input.wardrobe) ||
    ('clothes' in input && input.clothes) ||
    ('outfitDescription' in input && input.outfitDescription) ||
    '';
  if (outfit) parts.push(`wardrobe/clothing: ${outfit}`);
  if ('personalityMood' in input && input.personalityMood) {
    parts.push(`expression/presence: ${input.personalityMood}`);
  }
  if ('visualStyle' in input && input.visualStyle) parts.push(`visual aesthetic: ${input.visualStyle}`);
  if ('description' in input && input.description) parts.push(`character brief: ${input.description}`);
  if ('styleNotes' in input && input.styleNotes) parts.push(input.styleNotes);
  if ('extraNotes' in input && input.extraNotes) parts.push(input.extraNotes);

  const traitSummary = parts.length > 0 ? parts.join(', ') : 'distinctive photorealistic performer';

  return [
    `1:1 square 2x2 four-panel professional character turnaround sheet for "${name}" (${traitSummary}).`,
    `Exact 4-panel grid layout separated by clean thin white borders on a neutral soft gray-studio backdrop:`,
    `[TOP-LEFT PANEL] "FULL BODY" full-length head-to-toe front standing pose showing complete outfit and shoes.`,
    `[TOP-RIGHT PANEL] "HALF BODY" close-up chest-up front portrait showing crisp facial geometry, skin pores, eyes, and hair texture.`,
    `[BOTTOM-LEFT PANEL] "SIDE PROFILE" 90-degree full/upper side profile showing nose bridge, jawline, ear, hair silhouette, and posture.`,
    `[BOTTOM-RIGHT PANEL] "BACK VIEW" clean rear view from behind showing back of hairstyle and rear wardrobe tailoring.`,
    `Even softbox studio lighting, 100% consistent facial identity, clothing, proportions, and hair across all four panels, clean white sans-serif panel labels ("FULL BODY", "HALF BODY", "SIDE PROFILE", "BACK VIEW").`,
  ].join(' ');
}

export const CHARACTER_TURNAROUND_ASPECT_RATIO = '1:1' as const;
