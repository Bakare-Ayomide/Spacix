import { PresetEffect } from '../types/studio';

function makePresetSvg(
  title: string,
  subtitle: string,
  primaryHex: string,
  secondaryHex: string,
  pattern: 'orbit' | 'grid' | 'wave' | 'aperture'
): string {
  const innerGraphic =
    pattern === 'orbit'
      ? `<circle cx="320" cy="200" r="110" fill="none" stroke="${primaryHex}" stroke-width="1.5" stroke-dasharray="6 6" opacity="0.65"/>
         <circle cx="320" cy="200" r="65" fill="none" stroke="${primaryHex}" stroke-width="2" opacity="0.9"/>
         <path d="M180 200 C240 110, 400 110, 460 200" fill="none" stroke="${secondaryHex}" stroke-width="2.5" opacity="0.75"/>`
      : pattern === 'grid'
      ? `<g stroke="${primaryHex}" stroke-width="1" opacity="0.35">
           <line x1="0" y1="100" x2="640" y2="100"/><line x1="0" y1="200" x2="640" y2="200"/><line x1="0" y1="300" x2="640" y2="300"/>
           <line x1="160" y1="0" x2="160" y2="400"/><line x1="320" y1="0" x2="320" y2="400"/><line x1="480" y1="0" x2="480" y2="400"/>
         </g>
         <rect x="210" y="110" width="220" height="180" rx="12" fill="none" stroke="${primaryHex}" stroke-width="2" opacity="0.85"/>`
      : pattern === 'wave'
      ? `<path d="M 40 220 Q 140 110 240 220 T 440 220 T 600 220" fill="none" stroke="${primaryHex}" stroke-width="3" opacity="0.85"/>
         <path d="M 40 245 Q 140 150 240 245 T 440 245 T 600 245" fill="none" stroke="${secondaryHex}" stroke-width="1.5" opacity="0.55"/>`
      : `<polygon points="320,85 430,275 210,275" fill="none" stroke="${primaryHex}" stroke-width="2" opacity="0.85"/>
         <circle cx="320" cy="210" r="44" fill="${primaryHex}" fill-opacity="0.18" stroke="${primaryHex}" stroke-width="1.5"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
    <defs>
      <radialGradient id="g" cx="50%" cy="42%" r="65%">
        <stop offset="0%" stop-color="${primaryHex}" stop-opacity="0.28"/>
        <stop offset="55%" stop-color="${secondaryHex}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#09090B" stop-opacity="1"/>
      </radialGradient>
    </defs>
    <rect width="640" height="400" fill="#09090B"/>
    <rect width="640" height="400" fill="url(#g)"/>
    ${innerGraphic}
    <rect x="28" y="28" width="96" height="24" rx="4" fill="#121216" stroke="${primaryHex}" stroke-opacity="0.45"/>
    <text x="76" y="44" fill="${primaryHex}" font-family="monospace" font-size="11" font-weight="700" text-anchor="middle">${subtitle}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_PRESETS: PresetEffect[] = [
  {
    id: 'preset-snorricam-sprint',
    slug: 'snorricam-sprint',
    title: 'SnorriCam Adrenaline Lock',
    category: 'Camera Motion',
    surface: 'video',
    modelId: 'higgsfield-dop-lite',
    description: 'Chest-mounted rigid camera rig that locks onto the protagonist while the background rushes past in kinetic blur.',
    promptTemplate:
      'SnorriCam body-mounted camera locked on retro-futuristic vehicle racing through a misty alpine pass at dawn, 24mm wide lens, intense motion blur, anamorphic tungsten flare.',
    settings: {
      aspect_ratio: '16:9',
      camera_rig: 'snorricam_lock',
      lens_mm: '24mm',
    },
    previewSvgDataUrl: '/src/assets/images/hero_cinema_rig_1793997850142.jpg',
    order: 1,
    active: true,
  },
  {
    id: 'preset-vertigo-zolly',
    slug: 'vertigo-dolly-zoom',
    title: 'Vertigo Contrazoom (Zolly)',
    category: 'Camera Motion',
    surface: 'video',
    modelId: 'seedance-2-5',
    description: 'Simultaneous camera dolly-out and telephoto zoom-in that warps spatial perspective around a stationary subject.',
    promptTemplate:
      'Cinematic motion picture still of an astronaut exploring a brutalist concrete conservatory overgrown with glowing flora, golden sunbeams slicing through mist, Panavision aesthetic.',
    settings: {
      aspect_ratio: '16:9',
      duration: '5',
      resolution: '1080p',
      camera_motion: 'dolly_in',
      enhance_prompt: true,
    },
    previewSvgDataUrl: '/src/assets/images/seedance_cinema_still_1793997850112.jpg',
    order: 2,
    active: true,
  },
  {
    id: 'preset-nano-banana-art',
    slug: 'nano-banana-concept',
    title: 'Nano Banana Architectural Twilight',
    category: 'Cinematic Look',
    surface: 'image',
    modelId: 'nano-banana-2-1',
    description: 'Ultra-crisp 4K architectural rendering of minimalist glass basalt cliffside residence over stormy ocean waves at twilight.',
    promptTemplate:
      'Ultra-modern minimalist glass and black basalt cliffside architecture overlooking stormy Scandinavian ocean waves at twilight, warm ambient interior architectural lighting, 8k photography.',
    settings: {
      aspect_ratio: '16:9',
      resolution: '4K',
      render_mode: 'ultra_cinematic',
      enhance_prompt: true,
    },
    previewSvgDataUrl: '/src/assets/images/flux_architecture_still_1793997851000.jpg',
    order: 3,
    active: true,
  },
  {
    id: 'preset-probe-macro-dive',
    slug: 'probe-lens-macro-dive',
    title: 'Laowa 24mm Probe Macro Mechanical',
    category: 'Camera Motion',
    surface: 'video',
    modelId: 'kling-3-0-pro',
    description: 'Extreme bug-eye tubular macro lens gliding effortlessly through floating golden watch escapement gears and kinetic brass clockwork.',
    promptTemplate:
      'Extreme macro probe lens shot gliding through intricate floating golden watch escapement gears, brass wheels and kinetic mechanical clockwork, studio rim lighting.',
    settings: {
      aspect_ratio: '16:9',
      duration: '5',
      resolution: '1080p',
      cfg_scale: 0.7,
    },
    previewSvgDataUrl: '/src/assets/images/kling_macro_probe_1793997850942.jpg',
    order: 4,
    active: true,
  },
  {
    id: 'preset-soul-editorial-vogue',
    slug: 'soul-editorial-noir',
    title: 'Medium Format Chiaroscuro Editorial',
    category: 'Cinematic Look',
    surface: 'image',
    modelId: 'soul-2-standard',
    description: 'Medium format fashion portrait with subtle iridescent jewelry, natural skin pores, dramatic chiaroscuro window lighting, Kodak Vision3 500T grain.',
    promptTemplate:
      'Medium format editorial fashion portrait of a model with subtle high-fashion iridescent jewelry, natural skin pores, dramatic chiaroscuro window lighting, Vogue cover quality, 35mm film grain.',
    settings: {
      aspect_ratio: '16:9',
      resolution: '4K',
      enhance_prompt: true,
      raw_optical_grain: true,
    },
    previewSvgDataUrl: '/src/assets/images/soul_portrait_editorial_1793997852918.jpg',
    order: 5,
    active: true,
  },
  {
    id: 'preset-modular-braaam-score',
    slug: 'modular-trailer-pulse',
    title: 'Buchla & Brass Trailer Pulse',
    category: 'Sonic Atmosphere',
    surface: 'audio',
    modelId: 'sonilo-music-v2',
    description: 'Sub-bass analog synthesizer pulse layered with low brass swells and taut polyrhythmic percussion.',
    promptTemplate:
      'Dark propulsive sci-fi thriller score at 118 BPM, analog Buchla arpeggio, low contrabass brass swells, crisp metallic ticking percussion building to a clean climax.',
    settings: {
      duration: '30',
      genre_hint: 'cinematic_hybrid',
      instrumental_only: true,
    },
    previewSvgDataUrl: makePresetSvg('TRAILER SCORE', '118 BPM', '#46ecd5', '#0D9488', 'wave'),
    order: 6,
    active: true,
  },
];
