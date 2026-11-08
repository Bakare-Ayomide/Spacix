import {
  ApiProviderEndpointSpec,
  ApiProviderId,
  MediaSlotInput,
  ModelEntry,
  SettingDefinition,
} from '../types/studio';

const IMAGE_ASPECT_RATIOS: SettingDefinition = {
  type: 'enum',
  key: 'aspect_ratio',
  label: 'Aspect Ratio',
  headline: true,
  defaultValue: '16:9',
  options: [
    { value: '16:9', label: '16:9 Widescreen' },
    { value: '9:16', label: '9:16 Vertical' },
    { value: '1:1', label: '1:1 Square' },
    { value: '4:3', label: '4:3 Classic' },
    { value: '3:4', label: '3:4 Portrait' },
    { value: '21:9', label: '21:9 Anamorphic' },
  ],
};

const IMAGE_RESOLUTIONS: SettingDefinition = {
  type: 'enum',
  key: 'resolution',
  label: 'Resolution',
  headline: true,
  defaultValue: '2K',
  options: [
    { value: '1K', label: '1K Standard' },
    { value: '2K', label: '2K Crisp' },
    { value: '4K', label: '4K Ultra HD' },
  ],
};

const VIDEO_ASPECT_RATIOS: SettingDefinition = {
  type: 'enum',
  key: 'aspect_ratio',
  label: 'Aspect Ratio',
  headline: true,
  defaultValue: '16:9',
  options: [
    { value: '16:9', label: '16:9 Cinema' },
    { value: '9:16', label: '9:16 Social' },
    { value: '1:1', label: '1:1 Square' },
    { value: '21:9', label: '21:9 Scope' },
  ],
};

const VIDEO_DURATIONS: SettingDefinition = {
  type: 'enum',
  key: 'duration',
  label: 'Duration',
  headline: true,
  defaultValue: '5',
  options: [
    { value: '5', label: '5s' },
    { value: '10', label: '10s' },
  ],
};

const VIDEO_RESOLUTIONS: SettingDefinition = {
  type: 'enum',
  key: 'resolution',
  label: 'Resolution',
  headline: true,
  defaultValue: '1080p',
  options: [
    { value: '720p', label: '720p HD' },
    { value: '1080p', label: '1080p Full HD' },
    { value: '4K', label: '4K Mastering' },
  ],
};

/**
 * Multi-Provider Model Catalog across Higgsfield, fal.ai, Muapi.ai, and Runware.ai
 * Sources:
 * - https://fal.ai/docs/llms.txt & https://fal.ai/models
 * - https://docs.higgsfield.ai/docs/models.md
 * - https://muapi.ai/docs
 * - https://runware.ai/docs
 */
export const MODEL_CATALOG: ModelEntry[] = [
  // ===========================================================================
  // IMAGE SURFACE MODELS
  // ===========================================================================
  {
    id: 'nano-banana-2-1',
    surface: 'image',
    family: 'Nano Banana',
    provider: 'Google Nano Banana',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/nano-banana-2',
        editEndpoint: 'fal-ai/nano-banana-2/edit',
        callingPattern: 'subscribe',
        baseUsd: 0.035,
        latencyBadge: 'Fal Subscribe CDN',
        docsUrl: 'https://fal.ai/models/fal-ai/nano-banana-2',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'google/nano-banana-2.1/text-to-image',
        editEndpoint: 'google/nano-banana-2.1/image-to-image',
        callingPattern: 'queue',
        baseUsd: 0.04,
        latencyBadge: 'HF Queue + Webhook',
        docsUrl: 'https://docs.higgsfield.ai/docs/models/nano-banana-2-1',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/google/nano-banana-2.1',
        callingPattern: 'queue',
        baseUsd: 0.032,
        latencyBadge: 'Muapi Router',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'runware:google-nano-banana@2.1',
        callingPattern: 'task_stream',
        baseUsd: 0.028,
        latencyBadge: 'Sonic Task Engine',
      },
    ],
    label: 'Nano Banana 2.1 Ultra',
    category: 'CINEMATIC',
    description:
      "Google's fast image generation and intelligent editing model with ultra-crisp prompt adherence, 4K multi-composition rendering, and organic film texture.",
    bestFor: 'Complex photorealism, intelligent image editing, editorial keyframes',
    badges: ['TOP', 'NEW', '4K'],
    docsUrl: 'https://fal.ai/models/fal-ai/nano-banana-2',
    modes: ['Create', 'Edit'],
    roles: [
      { role: 'reference', kind: 'image', label: 'Artistic Reference Frames', maxCount: 4 },
      { role: 'start', kind: 'image', label: 'Base Image (Edit Mode)', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.035,
    billingUnit: 'per_image',
    previewGradient: 'from-amber-400/25 via-yellow-950/70 to-zinc-950',
    previewAccent: '#FACC15',
    restPaths: {
      default: 'fal-ai/nano-banana-2',
      imageToMedia: 'fal-ai/nano-banana-2/edit',
    },
    settings: [
      IMAGE_ASPECT_RATIOS,
      IMAGE_RESOLUTIONS,
      {
        type: 'enum',
        key: 'render_mode',
        label: 'Render Mode',
        headline: true,
        defaultValue: 'ultra_cinematic',
        options: [
          { value: 'ultra_cinematic', label: 'Ultra Cinematic Panavision' },
          { value: 'editorial_medium_format', label: 'Medium Format Hasselblad' },
          { value: 'fine_art_concept', label: 'Fine Art Concept Art' },
        ],
      },
      {
        type: 'range',
        key: 'guidance_scale',
        label: 'Prompt Fidelity (CFG)',
        min: 1.5,
        max: 9.0,
        step: 0.5,
        defaultValue: 5.0,
      },
      {
        type: 'boolean',
        key: 'enhance_prompt',
        label: 'Enhance Prompt (Nano Banana)',
        description: 'Auto-expand lighting, atmosphere, and lens mechanics',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings, media, mode, apiProvider }) => {
      const startFrame = media.find((m) => m.role === 'start');
      const isEdit = mode === 'Edit' && startFrame;
      const p = apiProvider || 'fal';
      const defaultPath =
        p === 'higgsfield'
          ? isEdit
            ? 'google/nano-banana-2.1/image-to-image'
            : 'google/nano-banana-2.1/text-to-image'
          : p === 'muapi'
          ? 'muapi/google/nano-banana-2.1'
          : p === 'runware'
          ? 'runware:google-nano-banana@2.1'
          : isEdit
          ? 'fal-ai/nano-banana-2/edit'
          : 'fal-ai/nano-banana-2';

      return {
        path: defaultPath,
        body: {
          prompt,
          aspect_ratio: settings.aspect_ratio ?? '16:9',
          resolution: settings.resolution ?? '2K',
          render_mode: settings.render_mode ?? 'ultra_cinematic',
          guidance_scale: Number(settings.guidance_scale ?? 5.0),
          enhance_prompt: Boolean(settings.enhance_prompt ?? true),
          image_url: startFrame?.url,
          references: media.filter((m) => m.role === 'reference').map((m) => m.url),
        },
      };
    },
  },
  {
    // Source: https://fal.ai/models/fal-ai/nano-banana-pro
    id: 'fal-nano-banana-pro',
    surface: 'image',
    family: 'Nano Banana',
    provider: 'Google Nano Banana',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/nano-banana-pro',
        callingPattern: 'subscribe',
        baseUsd: 0.05,
        latencyBadge: 'Fal Subscribe CDN',
        docsUrl: 'https://fal.ai/models/fal-ai/nano-banana-pro',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/google/nano-banana-pro',
        callingPattern: 'queue',
        baseUsd: 0.045,
        latencyBadge: 'Muapi Router',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'runware:google-nano-banana-pro@1',
        callingPattern: 'task_stream',
        baseUsd: 0.04,
        latencyBadge: 'Sonic Task Engine',
      },
    ],
    label: 'Nano Banana Pro',
    category: 'CINEMATIC',
    description:
      'State-of-the-art image generation with hyper-realism, precision typography, and commercial studio lighting.',
    bestFor: 'Typography + realism, commercial key visuals, high-detail textures',
    badges: ['TOP', 'NEW', '4K'],
    docsUrl: 'https://fal.ai/models/fal-ai/nano-banana-pro',
    modes: ['Create', 'Edit'],
    roles: [
      { role: 'reference', kind: 'image', label: 'Reference Images', maxCount: 4 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.05,
    billingUnit: 'per_image',
    previewGradient: 'from-[#46ecd5]/25 via-amber-950/60 to-zinc-950',
    previewAccent: '#46ecd5',
    restPaths: {
      default: 'fal-ai/nano-banana-pro',
    },
    settings: [
      IMAGE_ASPECT_RATIOS,
      IMAGE_RESOLUTIONS,
      {
        type: 'boolean',
        key: 'enhance_prompt',
        label: 'Enhance Prompt',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'fal-ai/nano-banana-pro',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        resolution: settings.resolution ?? '2K',
        enhance_prompt: Boolean(settings.enhance_prompt ?? true),
        image_urls: media.map((m) => m.url),
      },
    }),
  },
  {
    // Source: https://docs.higgsfield.ai/docs/models/soul-v2
    id: 'soul-2-standard',
    surface: 'image',
    family: 'Soul',
    provider: 'SPACIX Soul',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'higgsfield-ai/soul/v2/standard',
        callingPattern: 'queue',
        baseUsd: 0.04,
        latencyBadge: 'HF Native Optical',
        docsUrl: 'https://docs.higgsfield.ai/docs/models/soul-v2',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/higgsfield/soul-v2',
        callingPattern: 'queue',
        baseUsd: 0.038,
        latencyBadge: 'Muapi Proxy',
      },
    ],
    label: 'Soul 2.0 Standard',
    category: 'CINEMATIC',
    description:
      'Photorealistic character & editorial portraits with natural skin micro-texture and optical depth.',
    bestFor: 'Editorial portraits, fashion lookbooks, realistic human subjects',
    badges: ['TOP', '4K'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/soul-v2',
    modes: ['Create', 'Edit'],
    roles: [
      { role: 'reference', kind: 'image', label: 'Style / Character Refs', maxCount: 4 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.04,
    billingUnit: 'per_image',
    previewGradient: 'from-[#46ecd5]/25 via-teal-950/60 to-zinc-950',
    previewAccent: '#46ecd5',
    restPaths: {
      default: 'higgsfield-ai/soul/v2/standard',
      reference: 'higgsfield-ai/soul/v2/standard',
    },
    settings: [
      IMAGE_ASPECT_RATIOS,
      IMAGE_RESOLUTIONS,
      {
        type: 'range',
        key: 'guidance_scale',
        label: 'Prompt Adherence (CFG)',
        min: 1.5,
        max: 10,
        step: 0.5,
        defaultValue: 4.5,
      },
      {
        type: 'boolean',
        key: 'enhance_prompt',
        label: 'Enhance Prompt',
        description: 'Automatically enrich lighting and lens descriptors',
        defaultValue: true,
      },
      {
        type: 'boolean',
        key: 'raw_optical_grain',
        label: '35mm Film Grain',
        description: 'Preserve organic halide texture without smoothing',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'higgsfield-ai/soul/v2/standard',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        resolution: settings.resolution ?? '2K',
        guidance_scale: Number(settings.guidance_scale ?? 4.5),
        enhance_prompt: Boolean(settings.enhance_prompt ?? true),
        raw_optical_grain: Boolean(settings.raw_optical_grain ?? true),
        reference_image_urls: media.filter((m) => m.role === 'reference').map((m) => m.url),
      },
    }),
  },
  {
    // Source: https://docs.higgsfield.ai/docs/models/soul-cinema
    id: 'soul-cinema',
    surface: 'image',
    family: 'Soul',
    provider: 'SPACIX Soul',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'higgsfield-ai/soul/cinema',
        callingPattern: 'queue',
        baseUsd: 0.06,
        latencyBadge: 'HF Anamorphic',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/higgsfield/soul-cinema',
        callingPattern: 'queue',
        baseUsd: 0.055,
        latencyBadge: 'Muapi Proxy',
      },
    ],
    label: 'Soul Cinema Anamorphic',
    category: 'CINEMATIC',
    description:
      'Large-format cinema stills graded for narrative storyboarding and keyframe look-dev.',
    bestFor: 'Film keyframes, anamorphic stills, dramatic narrative lighting',
    badges: ['NEW', '4K'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/soul-cinema',
    modes: ['Create', 'Edit'],
    roles: [
      { role: 'reference', kind: 'image', label: 'Look / Frame Reference', maxCount: 4 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.06,
    billingUnit: 'per_image',
    previewGradient: 'from-amber-500/20 via-stone-900/70 to-zinc-950',
    previewAccent: '#F59E0B',
    restPaths: {
      default: 'higgsfield-ai/soul/cinema',
    },
    settings: [
      IMAGE_ASPECT_RATIOS,
      IMAGE_RESOLUTIONS,
      {
        type: 'enum',
        key: 'cinema_lut',
        label: 'Color Science LUT',
        defaultValue: 'kodak_2383',
        options: [
          { value: 'kodak_2383', label: 'Kodak 2383 Print' },
          { value: 'arri_logc4', label: 'ARRI Reveal Neutral' },
          { value: 'bleach_bypass', label: 'Silver Retention Contrast' },
          { value: 'tungsten_night', label: 'Sodium Vapor Night' },
        ],
      },
      {
        type: 'boolean',
        key: 'enhance_prompt',
        label: 'Enhance Prompt',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'higgsfield-ai/soul/cinema',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        resolution: settings.resolution ?? '2K',
        cinema_lut: settings.cinema_lut ?? 'kodak_2383',
        enhance_prompt: Boolean(settings.enhance_prompt ?? true),
        reference_image_urls: media.filter((m) => m.role === 'reference').map((m) => m.url),
      },
    }),
  },
  {
    // Source: https://fal.ai/models/fal-ai/flux-pro/kontext
    id: 'flux-kontext-pro',
    surface: 'image',
    family: 'Flux',
    provider: 'Black Forest Labs',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/flux-pro/kontext',
        callingPattern: 'subscribe',
        baseUsd: 0.05,
        latencyBadge: 'Fal Subscribe CDN',
        docsUrl: 'https://fal.ai/models/fal-ai/flux-pro/kontext',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'bfl:flux-kontext-pro@1',
        callingPattern: 'task_stream',
        baseUsd: 0.04,
        latencyBadge: 'Sonic Sub-2s',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/bfl/flux-kontext-pro',
        callingPattern: 'queue',
        baseUsd: 0.045,
        latencyBadge: 'Muapi Router',
      },
    ],
    label: 'FLUX Kontext Pro',
    category: 'CINEMATIC',
    description:
      'Targeted edits and complex scene transformations while preserving character identity and lighting geometry.',
    bestFor: 'In-context image editing, scene relighting, object replacement',
    badges: ['TOP', 'NEW'],
    docsUrl: 'https://fal.ai/models/fal-ai/flux-pro/kontext',
    modes: ['Edit', 'Create'],
    roles: [
      { role: 'start', kind: 'image', label: 'Context Source Image', maxCount: 1 },
      { role: 'reference', kind: 'image', label: 'Style Reference', maxCount: 2 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.05,
    billingUnit: 'per_image',
    previewGradient: 'from-[#46ecd5]/25 via-sky-950/70 to-zinc-950',
    previewAccent: '#46ecd5',
    restPaths: {
      default: 'fal-ai/flux-pro/kontext',
    },
    settings: [
      IMAGE_ASPECT_RATIOS,
      IMAGE_RESOLUTIONS,
      {
        type: 'range',
        key: 'guidance_scale',
        label: 'Edit Guidance',
        min: 1.5,
        max: 8.0,
        step: 0.5,
        defaultValue: 3.5,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'fal-ai/flux-pro/kontext',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        guidance_scale: Number(settings.guidance_scale ?? 3.5),
        image_url: media.find((m) => m.role === 'start')?.url,
      },
    }),
  },
  {
    // Source: https://fal.ai/models/fal-ai/flux-2-flex & https://docs.higgsfield.ai/docs/models/flux-2-pro
    id: 'flux-2-pro',
    surface: 'image',
    family: 'Flux',
    provider: 'Black Forest Labs',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/flux-2-flex',
        callingPattern: 'subscribe',
        baseUsd: 0.045,
        latencyBadge: 'Fal Flex Typography',
        docsUrl: 'https://fal.ai/models/fal-ai/flux-2-flex',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'flux-2-pro',
        callingPattern: 'queue',
        baseUsd: 0.05,
        latencyBadge: 'HF Queue',
        docsUrl: 'https://docs.higgsfield.ai/docs/models/flux-2-pro',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'bfl:flux-2-pro@1',
        callingPattern: 'task_stream',
        baseUsd: 0.035,
        latencyBadge: 'Sonic Task Engine',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/bfl/flux-2-pro',
        callingPattern: 'queue',
        baseUsd: 0.042,
        latencyBadge: 'Muapi Router',
      },
    ],
    label: 'Flux 2 Pro / Flex',
    category: 'GENERAL',
    description:
      'Enhanced typography, architectural precision, product rendering, and complex multi-subject composition from Black Forest Labs.',
    bestFor: 'Commercial product renders, typography, architecture, spatial prompts',
    badges: ['TOP'],
    docsUrl: 'https://fal.ai/models/fal-ai/flux-2-flex',
    modes: ['Create', 'Edit'],
    roles: [
      { role: 'start', kind: 'image', label: 'Source Image (Optional)', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.045,
    billingUnit: 'per_image',
    previewGradient: 'from-sky-400/20 via-slate-900/70 to-zinc-950',
    previewAccent: '#38BDF8',
    restPaths: {
      default: 'fal-ai/flux-2-flex',
    },
    settings: [
      IMAGE_ASPECT_RATIOS,
      IMAGE_RESOLUTIONS,
      {
        type: 'range',
        key: 'safety_tolerance',
        label: 'Filter Tolerance',
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 3,
      },
      {
        type: 'boolean',
        key: 'enhance_prompt',
        label: 'Prompt Upsampling',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'fal-ai/flux-2-flex',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        resolution: settings.resolution ?? '2K',
        safety_tolerance: Number(settings.safety_tolerance ?? 3),
        prompt_upsampling: Boolean(settings.enhance_prompt ?? true),
        image_url: media.find((m) => m.role === 'start')?.url,
      },
    }),
  },
  {
    // Source: https://docs.higgsfield.ai/docs/models/grok-imagine-image-2
    id: 'grok-imagine-image-2',
    surface: 'image',
    family: 'Grok Imagine',
    provider: 'xAI',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'xai/grok-imagine-image-2.0',
        callingPattern: 'queue',
        baseUsd: 0.05,
        latencyBadge: 'HF Queue',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/xai/grok-imagine-2.0',
        callingPattern: 'queue',
        baseUsd: 0.045,
        latencyBadge: 'Muapi Router',
      },
    ],
    label: 'Grok Imagine 2.0',
    category: 'GENERAL',
    description:
      'Nuanced conceptual adherence with hyper-sharp typography and editorial realism.',
    bestFor: 'Conceptual scenes, stylized posters, high-contrast lighting',
    badges: ['NEW'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/grok-imagine-image-2',
    modes: ['Create'],
    roles: [
      { role: 'reference', kind: 'image', label: 'Reference Images', maxCount: 2 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.05,
    billingUnit: 'per_image',
    previewGradient: 'from-emerald-400/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#34D399',
    restPaths: {
      default: 'xai/grok-imagine-image-2.0',
    },
    settings: [
      IMAGE_ASPECT_RATIOS,
      {
        type: 'enum',
        key: 'style_preset',
        label: 'Aesthetic Mode',
        defaultValue: 'photographic',
        options: [
          { value: 'photographic', label: 'Photographic' },
          { value: 'cinematic', label: 'Cinematic Still' },
          { value: 'editorial_illustration', label: 'Editorial Graphic' },
        ],
      },
      {
        type: 'boolean',
        key: 'enhance_prompt',
        label: 'Enhance Prompt',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'xai/grok-imagine-image-2.0',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        style_preset: settings.style_preset ?? 'photographic',
        enhance_prompt: Boolean(settings.enhance_prompt ?? true),
        references: media.filter((m) => m.role === 'reference').map((m) => m.url),
      },
    }),
  },
  {
    // Source: https://docs.higgsfield.ai/docs/models/ideogram-v4
    id: 'ideogram-v4',
    surface: 'image',
    family: 'Ideogram',
    provider: 'Ideogram',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/ideogram/v3',
        callingPattern: 'subscribe',
        baseUsd: 0.055,
        latencyBadge: 'Fal Subscribe CDN',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'ideogram/v4.0',
        callingPattern: 'queue',
        baseUsd: 0.06,
        latencyBadge: 'HF Queue',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'ideogram:v4@1',
        callingPattern: 'task_stream',
        baseUsd: 0.05,
        latencyBadge: 'Sonic Task Engine',
      },
    ],
    label: 'Ideogram 4.0',
    category: 'GENERAL',
    description:
      'Industry-leading graphic design, posters, packaging typography, and brand layouts.',
    bestFor: 'Typography in images, posters, emblems, editorial covers',
    badges: ['TOP'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/ideogram-v4',
    modes: ['Create'],
    roles: [
      { role: 'reference', kind: 'image', label: 'Style Reference', maxCount: 3 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.055,
    billingUnit: 'per_image',
    previewGradient: 'from-rose-500/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#FB7185',
    restPaths: {
      default: 'ideogram/v4.0',
    },
    settings: [
      IMAGE_ASPECT_RATIOS,
      {
        type: 'enum',
        key: 'style_type',
        label: 'Style Discipline',
        defaultValue: 'DESIGN',
        options: [
          { value: 'DESIGN', label: 'Graphic Design' },
          { value: 'REALISTIC', label: 'Photorealistic' },
          { value: 'RENDER_3D', label: '3D Tactile Render' },
        ],
      },
      {
        type: 'boolean',
        key: 'enhance_prompt',
        label: 'Magic Prompt',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'ideogram/v4.0',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        style_type: settings.style_type ?? 'DESIGN',
        magic_prompt_option: settings.enhance_prompt ? 'ON' : 'OFF',
        style_reference_images: media.filter((m) => m.role === 'reference').map((m) => m.url),
      },
    }),
  },
  {
    // Source: https://fal.ai/models/fal-ai/recraft/v4/pro/text-to-image
    id: 'recraft-v4-1',
    surface: 'image',
    family: 'Recraft',
    provider: 'Recraft',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/recraft/v4/pro/text-to-image',
        callingPattern: 'subscribe',
        baseUsd: 0.04,
        latencyBadge: 'Fal Recraft V4 Pro',
        docsUrl: 'https://fal.ai/models/fal-ai/recraft/v4/pro/text-to-image',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'recraft/v4.1/text-to-image',
        callingPattern: 'queue',
        baseUsd: 0.04,
        latencyBadge: 'HF Queue',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'recraft:v4-pro@1',
        callingPattern: 'task_stream',
        baseUsd: 0.035,
        latencyBadge: 'Sonic Task Engine',
      },
    ],
    label: 'Recraft V4 Pro Studio',
    category: 'GENERAL',
    description:
      'Professional design, marketing visuals, studio photography, and clean brand iconography on fal.ai & Higgsfield.',
    bestFor: 'Brand systems, marketing visuals, studio product shots',
    badges: ['NEW', 'TOP'],
    docsUrl: 'https://fal.ai/models/fal-ai/recraft/v4/pro/text-to-image',
    modes: ['Create'],
    roles: [],
    requirePrompt: true,
    supportsEnhancePrompt: false,
    baseHfUsd: 0.04,
    billingUnit: 'per_image',
    previewGradient: 'from-teal-400/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#2DD4BF',
    restPaths: {
      default: 'fal-ai/recraft/v4/pro/text-to-image',
    },
    settings: [
      IMAGE_ASPECT_RATIOS,
      {
        type: 'enum',
        key: 'substyle',
        label: 'Art Direction',
        defaultValue: 'studio_photo',
        options: [
          { value: 'studio_photo', label: 'Studio Photography' },
          { value: 'natural_light', label: 'Natural Daylight' },
          { value: 'grain_editorial', label: 'Editorial Analog' },
          { value: 'vector_illustration', label: 'Vector Brand Art' },
        ],
      },
    ],
    toPlatform: ({ prompt, settings }) => ({
      path: 'fal-ai/recraft/v4/pro/text-to-image',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        substyle: settings.substyle ?? 'studio_photo',
      },
    }),
  },
  {
    // Source: https://docs.higgsfield.ai/docs/models/qwen-image-3
    id: 'qwen-image-3',
    surface: 'image',
    family: 'Qwen',
    provider: 'Alibaba Qwen',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'alibaba:qwen-image@3.0',
        callingPattern: 'task_stream',
        baseUsd: 0.02,
        latencyBadge: 'Sonic Sub-Second',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'alibaba/qwen-image-3/text-to-image',
        callingPattern: 'queue',
        baseUsd: 0.03,
        latencyBadge: 'HF Queue',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/alibaba/qwen-image-3',
        callingPattern: 'queue',
        baseUsd: 0.025,
        latencyBadge: 'Muapi Router',
      },
    ],
    label: 'Qwen Image 3',
    category: 'FAST',
    description:
      'High-efficiency bilingual prompt understanding and balanced commercial photography.',
    bestFor: 'Rapid ideation, e-commerce backdrops, clean composition',
    badges: ['FAST'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/qwen-image-3',
    modes: ['Create'],
    roles: [],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.02,
    billingUnit: 'per_image',
    previewGradient: 'from-cyan-400/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#22D3EE',
    restPaths: {
      default: 'alibaba:qwen-image@3.0',
    },
    settings: [IMAGE_ASPECT_RATIOS, IMAGE_RESOLUTIONS],
    toPlatform: ({ prompt, settings }) => ({
      path: 'alibaba:qwen-image@3.0',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        resolution: settings.resolution ?? '2K',
      },
    }),
  },
  {
    // Source: Runware Sonic Engine & Z-Image Turbo
    id: 'z-image-turbo',
    surface: 'image',
    family: 'Sonic Turbo',
    provider: 'Runware.ai',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'runware:100@1',
        callingPattern: 'task_stream',
        baseUsd: 0.01,
        latencyBadge: 'Sub-500ms Sonic',
      },
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/fast-lightning-sdxl',
        callingPattern: 'sync',
        baseUsd: 0.015,
        latencyBadge: 'Fal Direct Run',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'z-image/turbo',
        callingPattern: 'queue',
        baseUsd: 0.02,
        latencyBadge: 'HF Turbo',
      },
    ],
    label: 'Runware Sonic / Z-Turbo',
    category: 'FAST',
    description:
      'Sub-second distilled diffusion on Runware Sonic Engine & fal.run for instant storyboard sketching and layout exploration.',
    bestFor: 'Fast storyboard drafts, low-cost rapid iteration',
    badges: ['FAST'],
    docsUrl: 'https://runware.ai/docs',
    modes: ['Create'],
    roles: [],
    requirePrompt: true,
    supportsEnhancePrompt: false,
    baseHfUsd: 0.01,
    billingUnit: 'per_image',
    previewGradient: 'from-[#46ecd5]/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#46ecd5',
    restPaths: {
      default: 'runware:100@1',
    },
    settings: [
      IMAGE_ASPECT_RATIOS,
      {
        type: 'range',
        key: 'num_inference_steps',
        label: 'Turbo Steps',
        min: 4,
        max: 12,
        step: 2,
        defaultValue: 8,
      },
    ],
    toPlatform: ({ prompt, settings }) => ({
      path: 'runware:100@1',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        num_inference_steps: Number(settings.num_inference_steps ?? 8),
      },
    }),
  },

  // ===========================================================================
  // VIDEO SURFACE MODELS
  // ===========================================================================
  {
    // Source: https://docs.higgsfield.ai/docs/models/seedance-2-5
    id: 'seedance-2-5',
    surface: 'video',
    family: 'Seedance',
    provider: 'ByteDance',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'bytedance/seedance-2.5',
        editEndpoint: 'bytedance/seedance-2.5/video-edit',
        callingPattern: 'queue',
        baseUsd: 0.06,
        latencyBadge: 'HF Queue + Webhook',
      },
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/bytedance/seedance/v2.5/text-to-video',
        callingPattern: 'subscribe',
        baseUsd: 0.058,
        latencyBadge: 'Fal Queue CDN',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/bytedance/seedance-2.5',
        callingPattern: 'queue',
        baseUsd: 0.052,
        latencyBadge: 'Muapi High-Throughput',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'bytedance:seedance@2.5',
        callingPattern: 'task_stream',
        baseUsd: 0.05,
        latencyBadge: 'Sonic Video Task',
      },
    ],
    label: 'Seedance 2.5 Cinema',
    category: 'CINEMATIC',
    description:
      'Flagship multi-modal cinema generator supporting text, start/end frames, video editing, and extension.',
    bestFor: 'Narrative cinema, complex camera choreography, temporal consistency',
    badges: ['TOP', 'NEW', '4K'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/seedance-2-5',
    modes: ['Create Video', 'Edit Video'],
    roles: [
      { role: 'start', kind: 'image', label: 'Start Frame', maxCount: 1 },
      { role: 'end', kind: 'image', label: 'End Frame', maxCount: 1 },
      { role: 'reference', kind: 'image', label: 'Character / Scene Refs', maxCount: 3 },
      { role: 'video', kind: 'video', label: 'Source Video (Edit/Extend)', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.06,
    billingUnit: 'per_second',
    previewGradient: 'from-[#46ecd5]/30 via-teal-950/70 to-zinc-950',
    previewAccent: '#46ecd5',
    restPaths: {
      default: 'bytedance/seedance-2.5',
      edit: 'bytedance/seedance-2.5/video-edit',
      extend: 'bytedance/seedance-2.5/video-extend',
    },
    settings: [
      VIDEO_ASPECT_RATIOS,
      VIDEO_DURATIONS,
      VIDEO_RESOLUTIONS,
      {
        type: 'enum',
        key: 'camera_motion',
        label: 'Camera Choreography',
        defaultValue: 'dynamic_cinema',
        options: [
          { value: 'dynamic_cinema', label: 'Dynamic Steadicam' },
          { value: 'dolly_in', label: 'Slow Push-In (Dolly)' },
          { value: 'crane_up', label: 'Jib / Crane Ascend' },
          { value: 'fpv_chase', label: 'FPV Tracking Chase' },
          { value: 'locked_tripod', label: 'Locked Cinema Tripod' },
        ],
      },
      {
        type: 'boolean',
        key: 'enhance_prompt',
        label: 'Director Prompt Expansion',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings, media, mode }) => {
      const sourceVideo = media.find((m) => m.role === 'video');
      const startFrame = media.find((m) => m.role === 'start');
      const endFrame = media.find((m) => m.role === 'end');
      const path =
        mode === 'Edit Video' && sourceVideo
          ? 'bytedance/seedance-2.5/video-edit'
          : 'bytedance/seedance-2.5';
      return {
        path,
        body: {
          prompt,
          aspect_ratio: settings.aspect_ratio ?? '16:9',
          duration: Number(settings.duration ?? 5),
          resolution: settings.resolution ?? '1080p',
          camera_motion: settings.camera_motion ?? 'dynamic_cinema',
          enhance_prompt: Boolean(settings.enhance_prompt ?? true),
          start_image_url: startFrame?.url,
          end_image_url: endFrame?.url,
          video_url: sourceVideo?.url,
          reference_image_urls: media.filter((m) => m.role === 'reference').map((m) => m.url),
        },
      };
    },
  },
  {
    // Source: https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/pro/image-to-video & Kling 3.0 Pro
    id: 'kling-3-0-pro',
    surface: 'video',
    family: 'Kling',
    provider: 'Kuaishou Kling',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
        callingPattern: 'subscribe',
        baseUsd: 0.075,
        latencyBadge: 'Fal Queue CDN',
        docsUrl: 'https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'kling-video/v3.0/pro',
        callingPattern: 'queue',
        baseUsd: 0.08,
        latencyBadge: 'HF 4K Mastering',
        docsUrl: 'https://docs.higgsfield.ai/docs/models/kling-v3',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/kling/v3.0-pro',
        callingPattern: 'queue',
        baseUsd: 0.068,
        latencyBadge: 'Muapi Direct Cluster',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'klingai:kling-video@3-4k',
        callingPattern: 'task_stream',
        baseUsd: 0.07,
        latencyBadge: 'Sonic Video Task',
        docsUrl: 'https://runware.ai/docs/models-api/introduction',
      },
    ],
    label: 'Kling 3.0 Pro 4K',
    category: 'CINEMATIC',
    description:
      'Cinematic image-to-video and text-to-video with fluid motion, physically accurate dynamics, and expressive acting.',
    bestFor: 'Realistic physics, expressive character acting, 4K commercials',
    badges: ['TOP', '4K'],
    docsUrl: 'https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    modes: ['Create Video'],
    roles: [
      { role: 'start', kind: 'image', label: 'Start Frame', maxCount: 1 },
      { role: 'end', kind: 'image', label: 'End Frame', maxCount: 1 },
      { role: 'reference', kind: 'image', label: 'Subject References', maxCount: 4 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.075,
    billingUnit: 'per_second',
    previewGradient: 'from-amber-400/25 via-zinc-900/80 to-zinc-950',
    previewAccent: '#FBBF24',
    restPaths: {
      default: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
    },
    settings: [
      VIDEO_ASPECT_RATIOS,
      VIDEO_DURATIONS,
      VIDEO_RESOLUTIONS,
      {
        type: 'range',
        key: 'cfg_scale',
        label: 'Motion Prompt Fidelity',
        min: 0.1,
        max: 1.0,
        step: 0.1,
        defaultValue: 0.6,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        duration: Number(settings.duration ?? 5),
        resolution: settings.resolution ?? '1080p',
        cfg_scale: Number(settings.cfg_scale ?? 0.6),
        image_url: media.find((m) => m.role === 'start')?.url,
        tail_image_url: media.find((m) => m.role === 'end')?.url,
        reference_images: media.filter((m) => m.role === 'reference').map((m) => m.url),
      },
    }),
  },
  {
    // Source: https://fal.ai/models/blackforestlabs/flux-3-max/text-to-video
    id: 'flux-3-max-video',
    surface: 'video',
    family: 'Flux Video',
    provider: 'Black Forest Labs',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'blackforestlabs/flux-3-max/text-to-video',
        callingPattern: 'subscribe',
        baseUsd: 0.07,
        latencyBadge: 'Fal Post-Trained BFL',
        docsUrl: 'https://fal.ai/models/blackforestlabs/flux-3-max/text-to-video',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'bfl:flux-3-max-video@1',
        callingPattern: 'task_stream',
        baseUsd: 0.065,
        latencyBadge: 'Sonic Video Task',
      },
    ],
    label: 'FLUX 3 Max Video',
    category: 'CINEMATIC',
    description:
      'Text-to-video with optional synchronized audio, post-trained by fal.ai in partnership with Black Forest Labs.',
    bestFor: 'Photorealistic BFL lighting in motion, synchronized spatial audio',
    badges: ['NEW', 'TOP', 'AUDIO'],
    docsUrl: 'https://fal.ai/models/blackforestlabs/flux-3-max/text-to-video',
    modes: ['Create Video'],
    roles: [
      { role: 'start', kind: 'image', label: 'Start Frame (Optional)', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.07,
    billingUnit: 'per_second',
    previewGradient: 'from-[#46ecd5]/25 via-sky-950/75 to-zinc-950',
    previewAccent: '#46ecd5',
    restPaths: {
      default: 'blackforestlabs/flux-3-max/text-to-video',
    },
    settings: [
      VIDEO_ASPECT_RATIOS,
      VIDEO_DURATIONS,
      VIDEO_RESOLUTIONS,
      {
        type: 'boolean',
        key: 'with_audio',
        label: 'Generate Synchronized Audio',
        description: 'Post-trained fal + BFL audio track synthesis',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'blackforestlabs/flux-3-max/text-to-video',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        duration: Number(settings.duration ?? 5),
        resolution: settings.resolution ?? '1080p',
        with_audio: Boolean(settings.with_audio ?? true),
        image_url: media.find((m) => m.role === 'start')?.url,
      },
    }),
  },
  {
    // Source: https://fal.ai/models/fal-ai/kling-video/o3/standard/image-to-video
    id: 'kling-o3-frames',
    surface: 'video',
    family: 'Kling',
    provider: 'Kuaishou Kling',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/kling-video/o3/standard/image-to-video',
        callingPattern: 'subscribe',
        baseUsd: 0.065,
        latencyBadge: 'Fal O3 Start-End',
        docsUrl: 'https://fal.ai/models/fal-ai/kling-video/o3/standard/image-to-video',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'kling-video/o3/first-last-frame',
        callingPattern: 'queue',
        baseUsd: 0.07,
        latencyBadge: 'HF Queue',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/kling/o3-frames',
        callingPattern: 'queue',
        baseUsd: 0.06,
        latencyBadge: 'Muapi Router',
      },
    ],
    label: 'Kling O3 First-Last Frame',
    category: 'CINEMATIC',
    description:
      'Start and end frame animation with scene guidance that bridges two distinct keyframes with natural physical morphing.',
    bestFor: 'Match cuts, start-to-end keyframe interpolation, time-lapses',
    badges: ['TOP'],
    docsUrl: 'https://fal.ai/models/fal-ai/kling-video/o3/standard/image-to-video',
    modes: ['Create Video'],
    roles: [
      { role: 'start', kind: 'image', label: 'First Frame', maxCount: 1, required: true },
      { role: 'end', kind: 'image', label: 'Last Frame', maxCount: 1, required: true },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.065,
    billingUnit: 'per_second',
    previewGradient: 'from-yellow-400/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#FACC15',
    restPaths: {
      default: 'fal-ai/kling-video/o3/standard/image-to-video',
    },
    settings: [VIDEO_ASPECT_RATIOS, VIDEO_DURATIONS, VIDEO_RESOLUTIONS],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'fal-ai/kling-video/o3/standard/image-to-video',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        duration: Number(settings.duration ?? 5),
        resolution: settings.resolution ?? '1080p',
        first_frame_url: media.find((m) => m.role === 'start')?.url,
        last_frame_url: media.find((m) => m.role === 'end')?.url,
      },
    }),
  },
  {
    // Source: https://fal.ai/models/minimax/h3-max/text-to-video
    id: 'minimax-h3',
    surface: 'video',
    family: 'MiniMax',
    provider: 'MiniMax Hailuo',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'minimax/h3-max/text-to-video',
        callingPattern: 'subscribe',
        baseUsd: 0.05,
        latencyBadge: 'Fal Post-Trained Audio',
        docsUrl: 'https://fal.ai/models/minimax/h3-max/text-to-video',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'minimax/h3/text-to-video',
        callingPattern: 'queue',
        baseUsd: 0.05,
        latencyBadge: 'HF Queue',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/minimax/h3-max',
        callingPattern: 'queue',
        baseUsd: 0.045,
        latencyBadge: 'Muapi Router',
      },
    ],
    label: 'MiniMax H3 Max (Audio)',
    category: 'CINEMATIC',
    description:
      'Video with synchronized audio, post-trained by fal from MiniMax H3 with theatrical lighting and lens rack-focus.',
    bestFor: 'Dramatic close-ups, synchronized audio-video, theatrical storytelling',
    badges: ['TOP', 'AUDIO'],
    docsUrl: 'https://fal.ai/models/minimax/h3-max/text-to-video',
    modes: ['Create Video'],
    roles: [
      { role: 'start', kind: 'image', label: 'Start Frame', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.05,
    billingUnit: 'per_second',
    previewGradient: 'from-rose-400/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#F43F5E',
    restPaths: {
      default: 'minimax/h3-max/text-to-video',
    },
    settings: [VIDEO_ASPECT_RATIOS, VIDEO_DURATIONS, VIDEO_RESOLUTIONS],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'minimax/h3-max/text-to-video',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        duration: Number(settings.duration ?? 5),
        resolution: settings.resolution ?? '1080p',
        first_frame_image: media.find((m) => m.role === 'start')?.url,
      },
    }),
  },
  {
    // Source: https://fal.ai/models/fal-ai/ltx-2-19b/image-to-video
    id: 'ltx-2-5-pro',
    surface: 'video',
    family: 'LTX',
    provider: 'Lightricks',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/ltx-2-19b/image-to-video',
        callingPattern: 'subscribe',
        baseUsd: 0.035,
        latencyBadge: 'Fal LTX-2 19B Audio',
        docsUrl: 'https://fal.ai/models/fal-ai/ltx-2-19b/image-to-video',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'lightricks/ltx-2.5/text-to-video/pro',
        callingPattern: 'queue',
        baseUsd: 0.04,
        latencyBadge: 'HF Queue',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'lightricks:ltx-2-19b@1',
        callingPattern: 'task_stream',
        baseUsd: 0.03,
        latencyBadge: 'Sonic Fast Video',
      },
    ],
    label: 'LTX-2 19B / 2.5 Pro',
    category: 'FAST',
    description:
      'Video with synchronized audio from images or text using Lightricks LTX-2 19B architecture.',
    bestFor: 'High-FPS camera sweeps, audio-synced image-to-video, pre-vis',
    badges: ['FAST', 'AUDIO'],
    docsUrl: 'https://fal.ai/models/fal-ai/ltx-2-19b/image-to-video',
    modes: ['Create Video'],
    roles: [
      { role: 'start', kind: 'image', label: 'Start Frame', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.035,
    billingUnit: 'per_second',
    previewGradient: 'from-teal-400/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#14B8A6',
    restPaths: {
      default: 'fal-ai/ltx-2-19b/image-to-video',
    },
    settings: [
      VIDEO_ASPECT_RATIOS,
      VIDEO_DURATIONS,
      {
        type: 'enum',
        key: 'fps',
        label: 'Frame Rate',
        defaultValue: '24',
        options: [
          { value: '24', label: '24 fps Cinema' },
          { value: '50', label: '50 fps Smooth' },
        ],
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'fal-ai/ltx-2-19b/image-to-video',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        duration: Number(settings.duration ?? 5),
        fps: Number(settings.fps ?? 24),
        image_url: media.find((m) => m.role === 'start')?.url,
      },
    }),
  },
  {
    // Source: https://docs.higgsfield.ai/docs/models/seedance-2-0
    id: 'seedance-2-0-fast',
    surface: 'video',
    family: 'Seedance',
    provider: 'ByteDance',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'bytedance:seedance-fast@2.0',
        callingPattern: 'task_stream',
        baseUsd: 0.025,
        latencyBadge: 'Sonic Fast Video',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'bytedance/seedance-2.0/fast',
        callingPattern: 'queue',
        baseUsd: 0.03,
        latencyBadge: 'HF Queue',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/bytedance/seedance-2.0-fast',
        callingPattern: 'queue',
        baseUsd: 0.026,
        latencyBadge: 'Muapi Router',
      },
    ],
    label: 'Seedance 2.0 Fast',
    category: 'FAST',
    description:
      'High-speed motion synthesis for rapid pre-visualization, social clips, and UGC hooks.',
    bestFor: 'Rapid video iteration, UGC sequences, fast motion',
    badges: ['FAST'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/seedance-2-0',
    modes: ['Create Video'],
    roles: [
      { role: 'start', kind: 'image', label: 'Start Frame', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.025,
    billingUnit: 'per_second',
    previewGradient: 'from-emerald-400/25 via-zinc-900/75 to-zinc-950',
    previewAccent: '#10B981',
    restPaths: {
      default: 'bytedance/seedance-2.0/fast',
    },
    settings: [VIDEO_ASPECT_RATIOS, VIDEO_DURATIONS, VIDEO_RESOLUTIONS],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'bytedance/seedance-2.0/fast',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        duration: Number(settings.duration ?? 5),
        resolution: settings.resolution ?? '1080p',
        image_url: media.find((m) => m.role === 'start')?.url,
      },
    }),
  },
  {
    // Source: https://docs.higgsfield.ai/docs/models/kling-v3-turbo
    id: 'kling-3-0-turbo',
    surface: 'video',
    family: 'Kling',
    provider: 'Kuaishou Kling',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/kling/v3.0-turbo',
        callingPattern: 'queue',
        baseUsd: 0.035,
        latencyBadge: 'Muapi Turbo',
      },
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/kling-video/v2.5-turbo/standard/text-to-video',
        callingPattern: 'subscribe',
        baseUsd: 0.038,
        latencyBadge: 'Fal Queue CDN',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'kling-video/v3.0-turbo/text-to-video',
        callingPattern: 'queue',
        baseUsd: 0.04,
        latencyBadge: 'HF Queue',
      },
    ],
    label: 'Kling 3.0 Turbo',
    category: 'FAST',
    description:
      'Low-latency Kling 3.0 pipeline tuned for snappy camera transitions and high-frame coherence.',
    bestFor: 'Fast storyboards, action beats, social reels',
    badges: ['FAST'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/kling-v3-turbo',
    modes: ['Create Video'],
    roles: [
      { role: 'start', kind: 'image', label: 'Start Frame', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.035,
    billingUnit: 'per_second',
    previewGradient: 'from-orange-400/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#FB923C',
    restPaths: {
      default: 'kling-video/v3.0-turbo/text-to-video',
    },
    settings: [VIDEO_ASPECT_RATIOS, VIDEO_DURATIONS, VIDEO_RESOLUTIONS],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'kling-video/v3.0-turbo/text-to-video',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        duration: Number(settings.duration ?? 5),
        resolution: settings.resolution ?? '1080p',
        image_url: media.find((m) => m.role === 'start')?.url,
      },
    }),
  },
  {
    // Source: https://docs.higgsfield.ai/docs/models/kling-v3-motion-control
    id: 'kling-3-0-motion',
    surface: 'video',
    family: 'Kling',
    provider: 'Kuaishou Kling',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'kling-video/v3/motion-control/pro',
        callingPattern: 'queue',
        baseUsd: 0.09,
        latencyBadge: 'HF Motion Rig',
      },
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/kling-video/motion-control',
        callingPattern: 'subscribe',
        baseUsd: 0.085,
        latencyBadge: 'Fal Queue CDN',
      },
    ],
    label: 'Kling 3.0 Motion Control',
    category: 'MOTION',
    description:
      'Transfer exact body choreography, camera trajectory, or facial performance from a driver video.',
    bestFor: 'Dance & stunt transfer, precise camera path replication',
    badges: ['NEW'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/kling-v3-motion-control',
    modes: ['Motion Control'],
    roles: [
      { role: 'source', kind: 'image', label: 'Target Character Image', maxCount: 1, required: true },
      { role: 'video', kind: 'video', label: 'Driving Motion Video', maxCount: 1, required: true },
    ],
    requirePrompt: false,
    supportsEnhancePrompt: false,
    baseHfUsd: 0.09,
    billingUnit: 'per_second',
    previewGradient: 'from-[#46ecd5]/25 via-teal-950/70 to-zinc-950',
    previewAccent: '#46ecd5',
    restPaths: {
      default: 'kling-video/v3/motion-control/pro',
    },
    settings: [
      VIDEO_ASPECT_RATIOS,
      VIDEO_DURATIONS,
      {
        type: 'range',
        key: 'motion_strength',
        label: 'Motion Transfer Intensity',
        min: 0.2,
        max: 1.0,
        step: 0.05,
        defaultValue: 0.85,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'kling-video/v3/motion-control/pro',
      body: {
        prompt: prompt || 'Preserve subject identity and follow driving motion smoothly',
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        duration: Number(settings.duration ?? 5),
        motion_strength: Number(settings.motion_strength ?? 0.85),
        source_image_url: media.find((m) => m.role === 'source')?.url,
        driving_video_url: media.find((m) => m.role === 'video')?.url,
      },
    }),
  },
  {
    // Source: https://docs.higgsfield.ai/docs/models/wan-3-0-prime
    id: 'wan-3-0-prime',
    surface: 'video',
    family: 'Wan',
    provider: 'Alibaba Wan',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/wan-pro/text-to-video',
        callingPattern: 'subscribe',
        baseUsd: 0.055,
        latencyBadge: 'Fal Queue CDN',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'alibaba/wan-3.0-prime/text-to-video',
        callingPattern: 'queue',
        baseUsd: 0.06,
        latencyBadge: 'HF Queue',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'alibaba:wan-prime@3.0',
        callingPattern: 'task_stream',
        baseUsd: 0.048,
        latencyBadge: 'Sonic Task Engine',
      },
    ],
    label: 'Wan 3.0 Prime',
    category: 'CINEMATIC',
    description:
      'Synchronized audiovisual world model generating sweeping cinematography with spatial ambience.',
    bestFor: 'Atmospheric world building, synchronized motion + audio',
    badges: ['NEW', 'AUDIO'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/wan-3-0-prime',
    modes: ['Create Video'],
    roles: [
      { role: 'start', kind: 'image', label: 'Start Frame', maxCount: 1 },
      { role: 'reference', kind: 'image', label: 'Reference Images', maxCount: 2 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.055,
    billingUnit: 'per_second',
    previewGradient: 'from-sky-400/25 via-zinc-900/80 to-zinc-950',
    previewAccent: '#38BDF8',
    restPaths: {
      default: 'alibaba/wan-3.0-prime/text-to-video',
    },
    settings: [
      VIDEO_ASPECT_RATIOS,
      VIDEO_DURATIONS,
      VIDEO_RESOLUTIONS,
      {
        type: 'boolean',
        key: 'enable_audio',
        label: 'Foley & Ambience Track',
        description: 'Synthesize synchronized environmental soundscape',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'alibaba/wan-3.0-prime/text-to-video',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        duration: Number(settings.duration ?? 5),
        resolution: settings.resolution ?? '1080p',
        enable_audio: Boolean(settings.enable_audio ?? true),
        image_url: media.find((m) => m.role === 'start')?.url,
      },
    }),
  },
  {
    // Source: https://docs.higgsfield.ai/docs/models/dop-lite
    id: 'higgsfield-dop-lite',
    surface: 'video',
    family: 'DoP',
    provider: 'SPACIX DoP',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'higgsfield-ai/dop/lite',
        callingPattern: 'queue',
        baseUsd: 0.25,
        latencyBadge: 'HF Native Camera Rig',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/higgsfield/dop-v2',
        callingPattern: 'queue',
        baseUsd: 0.22,
        latencyBadge: 'Muapi Proxy',
      },
    ],
    label: 'DoP Camera Rig v2',
    category: 'MOTION',
    description:
      'Dedicated Director of Photography camera rig simulator: crane, SnorriCam, whip-pan, and bullet-time.',
    bestFor: 'Turning a single still into a signature Hollywood camera move',
    badges: ['TOP'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/dop-lite',
    modes: ['Create Video', 'Motion Control'],
    roles: [
      { role: 'start', kind: 'image', label: 'Keyframe Image', maxCount: 1, required: true },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.25,
    billingUnit: 'per_generation',
    previewGradient: 'from-[#46ecd5]/30 via-zinc-900/80 to-zinc-950',
    previewAccent: '#46ecd5',
    restPaths: {
      default: 'higgsfield-ai/dop/lite',
    },
    settings: [
      VIDEO_ASPECT_RATIOS,
      {
        type: 'enum',
        key: 'camera_rig',
        label: 'Camera Rig Preset',
        headline: true,
        defaultValue: 'snorricam_lock',
        options: [
          { value: 'snorricam_lock', label: 'SnorriCam Body Mount' },
          { value: 'fpv_orbit_360', label: '360° Hero Orbit' },
          { value: 'vertigo_zolly', label: 'Hitchcock Dolly Zoom' },
          { value: 'macro_probe_pass', label: 'Laowa Probe Fly-Through' },
        ],
      },
      {
        type: 'enum',
        key: 'lens_mm',
        label: 'Prime Focal Length',
        defaultValue: '24mm',
        options: [
          { value: '14mm', label: '14mm Ultra-Wide Rectilinear' },
          { value: '24mm', label: '24mm Anamorphic Prime' },
          { value: '50mm', label: '50mm Master Prime' },
          { value: '85mm', label: '85mm Portrait Telephoto' },
        ],
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'higgsfield-ai/dop/lite',
      body: {
        prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        camera_rig: settings.camera_rig ?? 'snorricam_lock',
        lens_mm: settings.lens_mm ?? '24mm',
        image_url: media.find((m) => m.role === 'start')?.url,
      },
    }),
  },

  // ===========================================================================
  // AUDIO & SPEECH SURFACE MODELS
  // ===========================================================================
  {
    // Source: https://docs.higgsfield.ai/docs/models/sonilo-music-v2
    id: 'sonilo-music-v2',
    surface: 'audio',
    family: 'Sonilo',
    provider: 'Sonilo Audio',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'sonilo/v2/music-generation',
        callingPattern: 'queue',
        baseUsd: 0.05,
        latencyBadge: 'HF Audio Master',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/sonilo/v2-music',
        callingPattern: 'queue',
        baseUsd: 0.045,
        latencyBadge: 'Muapi Router',
      },
    ],
    label: 'Sonilo Score & Music v2',
    category: 'SONIC',
    description:
      'Studio-mastered cinematic scores, analog synthwave, and vocal stems synced to visual pacing.',
    bestFor: 'Film trailers, commercial soundtracks, atmospheric beds',
    badges: ['TOP', 'AUDIO'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/sonilo-music-v2',
    modes: ['Music & Score'],
    roles: [
      { role: 'audio', kind: 'audio', label: 'Reference Melody / Tempo (Optional)', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.05,
    billingUnit: 'per_generation',
    previewGradient: 'from-[#46ecd5]/25 via-teal-950/70 to-zinc-950',
    previewAccent: '#46ecd5',
    restPaths: {
      default: 'sonilo/v2/music-generation',
    },
    settings: [
      {
        type: 'enum',
        key: 'duration',
        label: 'Track Length',
        headline: true,
        defaultValue: '30',
        options: [
          { value: '15', label: '15s Cue' },
          { value: '30', label: '30s Spot' },
          { value: '60', label: '60s Full Theme' },
        ],
      },
      {
        type: 'enum',
        key: 'genre_hint',
        label: 'Sonic Palette',
        headline: true,
        defaultValue: 'cinematic_hybrid',
        options: [
          { value: 'cinematic_hybrid', label: 'Cinematic Brass & Modular' },
          { value: 'analog_techno', label: 'Industrial Warehouse Pulse' },
          { value: 'ambient_noir', label: 'Neo-Noir Tape Drone' },
          { value: 'orchestral_epic', label: 'Modern Chamber Strings' },
        ],
      },
      {
        type: 'boolean',
        key: 'instrumental_only',
        label: 'Instrumental Master Only',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'sonilo/v2/music-generation',
      body: {
        prompt,
        duration_seconds: Number(settings.duration ?? 30),
        genre_hint: settings.genre_hint ?? 'cinematic_hybrid',
        instrumental_only: Boolean(settings.instrumental_only ?? true),
        reference_audio_url: media.find((m) => m.role === 'audio')?.url,
      },
    }),
  },
  {
    // Source: https://fal.ai/models/fal-ai/elevenlabs/music
    id: 'elevenlabs-music',
    surface: 'audio',
    family: 'ElevenLabs',
    provider: 'ElevenLabs',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/elevenlabs/music',
        callingPattern: 'subscribe',
        baseUsd: 0.06,
        latencyBadge: 'Fal ElevenLabs CDN',
        docsUrl: 'https://fal.ai/models/fal-ai/elevenlabs/music',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/elevenlabs/music-v1',
        callingPattern: 'queue',
        baseUsd: 0.055,
        latencyBadge: 'Muapi Router',
      },
    ],
    label: 'ElevenLabs Studio Music',
    category: 'SONIC',
    description:
      'High-quality, realistic studio music generation with rich instrumentation and dynamic mastering via fal.ai.',
    bestFor: 'Realistic songs, trailer themes, broadcast music beds',
    badges: ['NEW', 'TOP', 'AUDIO'],
    docsUrl: 'https://fal.ai/models/fal-ai/elevenlabs/music',
    modes: ['Music & Score'],
    roles: [],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.06,
    billingUnit: 'per_generation',
    previewGradient: 'from-[#46ecd5]/25 via-zinc-900/80 to-zinc-950',
    previewAccent: '#46ecd5',
    restPaths: {
      default: 'fal-ai/elevenlabs/music',
    },
    settings: [
      {
        type: 'enum',
        key: 'duration',
        label: 'Track Length',
        headline: true,
        defaultValue: '30',
        options: [
          { value: '15', label: '15s Cue' },
          { value: '30', label: '30s Commercial' },
          { value: '60', label: '60s Full Composition' },
        ],
      },
      {
        type: 'boolean',
        key: 'instrumental_only',
        label: 'Instrumental Only',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings }) => ({
      path: 'fal-ai/elevenlabs/music',
      body: {
        prompt,
        duration_seconds: Number(settings.duration ?? 30),
        instrumental: Boolean(settings.instrumental_only ?? true),
      },
    }),
  },
  {
    // Source: https://fal.ai/models/fal-ai/beatoven/music-generation & sound-effect-generation
    id: 'beatoven-music-sfx',
    surface: 'audio',
    family: 'Beatoven',
    provider: 'Beatoven AI',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/beatoven/music-generation',
        editEndpoint: 'fal-ai/beatoven/sound-effect-generation',
        callingPattern: 'subscribe',
        baseUsd: 0.035,
        latencyBadge: 'Fal Beatoven CDN',
        docsUrl: 'https://fal.ai/models/fal-ai/beatoven/music-generation',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'beatoven:music-sfx@1',
        callingPattern: 'task_stream',
        baseUsd: 0.03,
        latencyBadge: 'Sonic Audio Task',
      },
    ],
    label: 'Beatoven Music & SFX',
    category: 'SONIC',
    description:
      'Royalty-free instrumental music generation and professional foley sound effect synthesis on fal.ai.',
    bestFor: 'Royalty-free background scores, foley impacts, game & film SFX',
    badges: ['NEW', 'AUDIO'],
    docsUrl: 'https://fal.ai/models/fal-ai/beatoven/music-generation',
    modes: ['Music & Score', 'Sound Effects'],
    roles: [],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.035,
    billingUnit: 'per_generation',
    previewGradient: 'from-cyan-400/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#22D3EE',
    restPaths: {
      default: 'fal-ai/beatoven/music-generation',
      edit: 'fal-ai/beatoven/sound-effect-generation',
    },
    settings: [
      {
        type: 'enum',
        key: 'duration',
        label: 'Duration',
        headline: true,
        defaultValue: '15',
        options: [
          { value: '5', label: '5s SFX One-Shot' },
          { value: '15', label: '15s Cue' },
          { value: '30', label: '30s Bed' },
        ],
      },
    ],
    toPlatform: ({ prompt, settings, mode }) => ({
      path:
        mode === 'Sound Effects'
          ? 'fal-ai/beatoven/sound-effect-generation'
          : 'fal-ai/beatoven/music-generation',
      body: {
        prompt,
        duration: Number(settings.duration ?? 15),
      },
    }),
  },
  {
    // Source: https://fal.ai/models/fal-ai/chatterbox/text-to-speech & https://fal.ai/models/fal-ai/dia-tts/voice-clone
    id: 'chatterbox-dia-tts',
    surface: 'audio',
    family: 'Chatterbox & Dia',
    provider: 'Resemble / Dia TTS',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/chatterbox/text-to-speech',
        editEndpoint: 'fal-ai/dia-tts/voice-clone',
        callingPattern: 'subscribe',
        baseUsd: 0.02,
        latencyBadge: 'Fal Chatterbox / Dia',
        docsUrl: 'https://fal.ai/models/fal-ai/chatterbox/text-to-speech',
      },
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'resemble:chatterbox-tts@1',
        callingPattern: 'task_stream',
        baseUsd: 0.015,
        latencyBadge: 'Sonic Speech Task',
      },
    ],
    label: 'Chatterbox & Dia Voice Clone',
    category: 'SONIC',
    description:
      'Natural text-to-speech from Resemble AI and multi-speaker dialogue with zero-shot voice cloning via Dia TTS on fal.ai.',
    bestFor: 'Expressive narration, multi-speaker dialogue, instant voice cloning',
    badges: ['NEW', 'AUDIO', 'FAST'],
    docsUrl: 'https://fal.ai/models/fal-ai/chatterbox/text-to-speech',
    modes: ['Text to Speech', 'Voice Clone (Dia)'],
    roles: [
      { role: 'audio', kind: 'audio', label: 'Reference Voice Audio (WAV)', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: false,
    baseHfUsd: 0.02,
    billingUnit: 'per_generation',
    previewGradient: 'from-emerald-400/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#34D399',
    restPaths: {
      default: 'fal-ai/chatterbox/text-to-speech',
      edit: 'fal-ai/dia-tts/voice-clone',
    },
    settings: [
      {
        type: 'range',
        key: 'exaggeration',
        label: 'Emotion & Delivery Intensity',
        min: 0.2,
        max: 1.0,
        step: 0.05,
        defaultValue: 0.5,
      },
    ],
    toPlatform: ({ prompt, settings, media, mode }) => ({
      path:
        mode === 'Voice Clone (Dia)'
          ? 'fal-ai/dia-tts/voice-clone'
          : 'fal-ai/chatterbox/text-to-speech',
      body: {
        text: prompt,
        exaggeration: Number(settings.exaggeration ?? 0.5),
        audio_url: media.find((m) => m.role === 'audio')?.url,
      },
    }),
  },
  {
    // Source: https://fal.ai/models/fal-ai/minimax/speech-02-hd & https://docs.higgsfield.ai/docs/models/inworld-tts
    id: 'inworld-tts-studio',
    surface: 'audio',
    family: 'Speech HD',
    provider: 'MiniMax / Inworld',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/minimax/speech-02-hd',
        callingPattern: 'subscribe',
        baseUsd: 0.015,
        latencyBadge: 'Fal Speech-02 HD',
        docsUrl: 'https://fal.ai/models/fal-ai/minimax/speech-02-hd',
      },
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'inworld/tts/v1/synthesize',
        callingPattern: 'queue',
        baseUsd: 0.015,
        latencyBadge: 'HF Inworld TTS',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/minimax/speech-02-hd',
        callingPattern: 'queue',
        baseUsd: 0.012,
        latencyBadge: 'Muapi Router',
      },
    ],
    label: 'MiniMax Speech-02 HD / Inworld',
    category: 'SONIC',
    description:
      'High-quality multi-voice text-to-speech, trailer narration, and subtle breath/emotion micro-inflections.',
    bestFor: 'Voiceovers, character dialogue, documentary narration',
    badges: ['AUDIO', 'FAST'],
    docsUrl: 'https://fal.ai/models/fal-ai/minimax/speech-02-hd',
    modes: ['Voice & SFX'],
    roles: [
      { role: 'audio', kind: 'audio', label: 'Voice Clone Sample (WAV)', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: false,
    baseHfUsd: 0.015,
    billingUnit: 'per_generation',
    previewGradient: 'from-amber-400/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#F59E0B',
    restPaths: {
      default: 'fal-ai/minimax/speech-02-hd',
    },
    settings: [
      {
        type: 'enum',
        key: 'voice_persona',
        label: 'Voice Persona',
        headline: true,
        defaultValue: 'noir_narrator',
        options: [
          { value: 'noir_narrator', label: 'Baritone Cinema Narrator' },
          { value: 'editorial_alto', label: 'Warm Documentary Alto' },
          { value: 'kinetic_host', label: 'Crisp Commercial Lead' },
          { value: 'whisper_intimate', label: 'Close-Mic Intimate' },
        ],
      },
      {
        type: 'range',
        key: 'speaking_rate',
        label: 'Pacing Speed',
        min: 0.75,
        max: 1.35,
        step: 0.05,
        defaultValue: 1.0,
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'fal-ai/minimax/speech-02-hd',
      body: {
        text: prompt,
        voice_persona: settings.voice_persona ?? 'noir_narrator',
        speaking_rate: Number(settings.speaking_rate ?? 1.0),
        voice_sample_url: media.find((m) => m.role === 'audio')?.url,
      },
    }),
  },
  {
    // Source: https://docs.higgsfield.ai/docs/models/seed-audio-v1
    id: 'seed-audio-v1',
    surface: 'audio',
    family: 'Seed Audio',
    provider: 'ByteDance',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'higgsfield',
        label: 'Higgsfield',
        endpoint: 'bytedance/seed-audio/v1/text-to-audio',
        callingPattern: 'queue',
        baseUsd: 0.02,
        latencyBadge: 'HF Binaural SFX',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/bytedance/seed-audio-v1',
        callingPattern: 'queue',
        baseUsd: 0.018,
        latencyBadge: 'Muapi Router',
      },
    ],
    label: 'Seed Audio 1.0 Foley',
    category: 'SONIC',
    description:
      'Binaural sound effects, cloth movement, mechanical impacts, and acoustic space synthesis.',
    bestFor: 'Foley design, UI/UX sound effects, spatial impacts',
    badges: ['NEW', 'AUDIO'],
    docsUrl: 'https://docs.higgsfield.ai/docs/models/seed-audio-v1',
    modes: ['Voice & SFX'],
    roles: [
      { role: 'audio', kind: 'audio', label: 'Reference Audio Timbre', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.02,
    billingUnit: 'per_generation',
    previewGradient: 'from-cyan-400/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#22D3EE',
    restPaths: {
      default: 'bytedance/seed-audio/v1/text-to-audio',
    },
    settings: [
      {
        type: 'enum',
        key: 'duration',
        label: 'Clip Duration',
        headline: true,
        defaultValue: '10',
        options: [
          { value: '5', label: '5s One-Shot' },
          { value: '10', label: '10s Sequence' },
          { value: '20', label: '20s Ambience Loop' },
        ],
      },
      {
        type: 'enum',
        key: 'sample_rate',
        label: 'Sample Rate',
        headline: true,
        defaultValue: '48000',
        options: [
          { value: '44100', label: '44.1 kHz Stereo' },
          { value: '48000', label: '48 kHz Broadcast WAV' },
        ],
      },
    ],
    toPlatform: ({ prompt, settings, media }) => ({
      path: 'bytedance/seed-audio/v1/text-to-audio',
      body: {
        prompt,
        duration: Number(settings.duration ?? 10),
        sample_rate: Number(settings.sample_rate ?? 48000),
        reference_audio_url: media.find((m) => m.role === 'audio')?.url,
      },
    }),
  },
  {
    // Source: https://runware.ai/docs/models-api/introduction (xai:grok-imagine@image-2.0)
    id: 'grok-imagine-2-0',
    surface: 'image',
    family: 'Grok Imagine',
    provider: 'xAI',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'xai:grok-imagine@image-2.0',
        callingPattern: 'task_stream',
        baseUsd: 0.03,
        latencyBadge: 'Runware Task Stream',
        docsUrl: 'https://runware.ai/docs/models-api/introduction',
      },
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/grok-imagine-2.0',
        callingPattern: 'subscribe',
        baseUsd: 0.035,
        latencyBadge: 'Fal Subscribe CDN',
      },
      {
        providerId: 'muapi',
        label: 'Muapi.ai',
        endpoint: 'muapi/xai/grok-imagine-2.0',
        callingPattern: 'queue',
        baseUsd: 0.032,
        latencyBadge: 'Muapi Router',
      },
    ],
    label: 'Grok Imagine 2.0',
    category: 'CINEMATIC',
    description:
      'xAI photorealistic image synthesis with rich cinematic lighting, natural composition, and high prompt fidelity.',
    bestFor: 'Cinematic lighting, editorial scenes, concept photography',
    badges: ['NEW', 'TOP', '4K'],
    docsUrl: 'https://runware.ai/docs/models-api/introduction',
    modes: ['Create'],
    roles: [
      { role: 'reference', kind: 'image', label: 'Reference Composition', maxCount: 2 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: true,
    baseHfUsd: 0.03,
    billingUnit: 'per_image',
    previewGradient: 'from-teal-400/25 via-slate-900/80 to-zinc-950',
    previewAccent: '#46ecd5',
    restPaths: {
      default: 'xai:grok-imagine@image-2.0',
    },
    settings: [
      IMAGE_ASPECT_RATIOS,
      IMAGE_RESOLUTIONS,
      {
        type: 'boolean',
        key: 'enhance_prompt',
        label: 'Enhance Prompt',
        defaultValue: true,
      },
    ],
    toPlatform: ({ prompt, settings }) => ({
      path: 'xai:grok-imagine@image-2.0',
      body: {
        prompt,
        positivePrompt: prompt,
        aspect_ratio: settings.aspect_ratio ?? '16:9',
        resolution: settings.resolution ?? '2K',
      },
    }),
  },
  {
    // Source: https://runware.ai/docs/models-api/introduction (fishaudio:s2.1@pro)
    id: 'fishaudio-s2-1-pro',
    surface: 'audio',
    family: 'Fish Audio',
    provider: 'Fish Audio',
    defaultApiProvider: 'runware',
    supportedProviders: [
      {
        providerId: 'runware',
        label: 'Runware.ai',
        endpoint: 'fishaudio:s2.1@pro',
        callingPattern: 'task_stream',
        baseUsd: 0.015,
        latencyBadge: 'Runware Speech Task',
        docsUrl: 'https://runware.ai/docs/models-api/introduction',
      },
      {
        providerId: 'fal',
        label: 'fal.ai',
        endpoint: 'fal-ai/fish-audio/s2.1-pro',
        callingPattern: 'subscribe',
        baseUsd: 0.018,
        latencyBadge: 'Fal Audio CDN',
      },
    ],
    label: 'Fish Audio S2.1 Pro',
    category: 'SONIC',
    description:
      'Ultra-natural expressive studio narration, character voice acting, and multilingual broadcast speech synthesis.',
    bestFor: 'Studio voiceovers, film narration, character dialogue',
    badges: ['NEW', 'AUDIO', 'FAST'],
    docsUrl: 'https://runware.ai/docs/models-api/introduction',
    modes: ['Voice & SFX'],
    roles: [
      { role: 'audio', kind: 'audio', label: 'Voice Clone Sample', maxCount: 1 },
    ],
    requirePrompt: true,
    supportsEnhancePrompt: false,
    baseHfUsd: 0.015,
    billingUnit: 'per_generation',
    previewGradient: 'from-[#46ecd5]/20 via-zinc-900/80 to-zinc-950',
    previewAccent: '#46ecd5',
    restPaths: {
      default: 'fishaudio:s2.1@pro',
    },
    settings: [
      {
        type: 'enum',
        key: 'duration',
        label: 'Target Clip Length',
        headline: true,
        defaultValue: '10',
        options: [
          { value: '5', label: '5s Line' },
          { value: '10', label: '10s Narration' },
          { value: '30', label: '30s Voiceover' },
        ],
      },
    ],
    toPlatform: ({ prompt, settings }) => ({
      path: 'fishaudio:s2.1@pro',
      body: {
        prompt,
        speech: { text: prompt },
        duration: Number(settings.duration ?? 10),
      },
    }),
  },
];

export function getModelById(modelId: string): ModelEntry | undefined {
  return MODEL_CATALOG.find((m) => m.id === modelId);
}

export function getModelsBySurface(surface: 'image' | 'video' | 'audio'): ModelEntry[] {
  return MODEL_CATALOG.filter((m) => m.surface === surface);
}

export function getEffectiveProvidersForModel(model: ModelEntry): ApiProviderEndpointSpec[] {
  const baseList: ApiProviderEndpointSpec[] =
    model.supportedProviders && model.supportedProviders.length > 0
      ? [...model.supportedProviders]
      : [
          {
            providerId: 'runware',
            label: 'Runware.ai',
            endpoint: model.restPaths.default,
            callingPattern: 'task_stream',
            baseUsd: model.baseHfUsd,
            latencyBadge: 'Runware Sonic v1',
          },
        ];

  const hasRunware = baseList.some((p) => p.providerId === 'runware');
  if (!hasRunware) {
    baseList.unshift({
      providerId: 'runware',
      label: 'Runware.ai',
      endpoint:
        model.surface === 'video'
          ? 'klingai:kling-video@3-4k'
          : model.surface === 'audio'
          ? 'fishaudio:s2.1@pro'
          : 'runware:100@1',
      callingPattern: 'task_stream',
      baseUsd: model.baseHfUsd,
      latencyBadge: 'Runware Sonic v1',
    });
  } else {
    // Move runware to the front so it is the primary default spec
    baseList.sort((a, b) => (a.providerId === 'runware' ? -1 : b.providerId === 'runware' ? 1 : 0));
  }

  return baseList;
}

export function resolveProviderSpec(
  model: ModelEntry,
  requestedProvider?: ApiProviderId
): ApiProviderEndpointSpec {
  const list = getEffectiveProvidersForModel(model);
  const target = requestedProvider || model.defaultApiProvider || 'runware';
  const match = list.find((p) => p.providerId === target);
  if (match) return match;
  const rw = list.find((p) => p.providerId === 'runware');
  return rw || list[0];
}

export function getDefaultSettingsForModel(
  model: ModelEntry
): Record<string, string | number | boolean> {
  const defaults: Record<string, string | number | boolean> = {};
  for (const setting of model.settings) {
    defaults[setting.key] = setting.defaultValue;
  }
  return defaults;
}

export function validateGenerationInput(
  model: ModelEntry,
  prompt: string,
  settings: Record<string, string | number | boolean>,
  media: MediaSlotInput[]
): { valid: boolean; error?: string; sanitizedSettings: Record<string, string | number | boolean> } {
  if (model.requirePrompt && !prompt.trim()) {
    return { valid: false, error: 'Enter a prompt to describe your generation.', sanitizedSettings: {} };
  }

  for (const roleSpec of model.roles) {
    const attached = media.filter((m) => m.role === roleSpec.role);
    if (roleSpec.required && attached.length === 0) {
      return {
        valid: false,
        error: `${model.label} requires ${roleSpec.label}.`,
        sanitizedSettings: {},
      };
    }
    if (attached.length > roleSpec.maxCount) {
      return {
        valid: false,
        error: `Maximum ${roleSpec.maxCount} item(s) allowed for ${roleSpec.label}.`,
        sanitizedSettings: {},
      };
    }
  }

  const sanitized: Record<string, string | number | boolean> = {};
  for (const def of model.settings) {
    const raw = settings[def.key] ?? def.defaultValue;
    if (def.type === 'enum') {
      const strVal = String(raw);
      const allowed = def.options.some((o) => o.value === strVal);
      sanitized[def.key] = allowed ? strVal : def.defaultValue;
    } else if (def.type === 'range') {
      const numVal = Number(raw);
      if (Number.isNaN(numVal)) {
        sanitized[def.key] = def.defaultValue;
      } else {
        sanitized[def.key] = Math.min(def.max, Math.max(def.min, numVal));
      }
    } else if (def.type === 'boolean') {
      sanitized[def.key] = Boolean(raw);
    }
  }

  return { valid: true, sanitizedSettings: sanitized };
}
