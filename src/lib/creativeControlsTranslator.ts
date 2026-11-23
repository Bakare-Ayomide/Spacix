import type {
  ModelEntry,
  Surface,
  UniversalCreativeControlsState,
} from '../types/studio';

export const DEFAULT_CREATIVE_CONTROLS: UniversalCreativeControlsState = {
  cameraSetup: {
    cameraBody: 'Auto',
    lens: 'Auto',
    aperture: 'Auto',
  },
  cameraMovement: {
    movements: [],
    intensity: 60,
    speed: 'Medium',
    shotAngle: 'Auto',
  },
  lighting: {
    scheme: 'Auto',
    intensity: 75,
    warmth: 0,
  },
  colorGrading: {
    presetId: 'Auto',
    temperature: 0,
    tint: 0,
    saturation: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    grain: 0,
    lutIntensity: 80,
  },
  filmLook: {
    genre: 'General',
    era: 'Auto',
    tempo: 'Auto',
    aspectRatio: '16:9',
  },
  audioDirection: {
    voiceTone: 'Natural Studio',
    pacing: 'Measured',
    musicMood: 'Atmospheric',
    acousticSpace: 'Studio Dry',
  },
};

const CAMERA_BODY_PROMPT_MAP: Record<string, string> = {
  'Modern Digital': 'shot on ARRI Alexa 65 large-format digital cinema camera',
  Modern: 'shot on ARRI Alexa 65 large-format digital cinema camera',
  'RED V-Raptor': 'shot on RED V-Raptor 8K VV digital cinema camera, crisp latitude',
  'Sony VENICE': 'shot on Sony VENICE 2 full-frame cinema camera, organic skin tones',
  '35mm Film': 'shot on 35mm Kodak Vision3 500T film camera, rich celluloid grain',
  '16mm Film': 'shot on Super 16mm Arriflex 416 film camera, tactile grain',
  '16mm Bolex': 'shot on Super 16mm Bolex film camera, textured celluloid grain',
  'IMAX 70mm': 'shot on IMAX 15/70mm large-format film camera, monumental clarity',
  'Vintage Film': 'shot on vintage 1970s 35mm celluloid camera, organic halation',
  'DV Camcorder': 'shot on vintage MiniDV camcorder CCD sensor',
};

const LENS_PROMPT_MAP: Record<string, string> = {
  'Standard Prime': '50mm cinema prime lens, balanced natural perspective',
  'Clean Sharp': 'ARRI Signature Prime 50mm lens, edge-to-edge optical clarity',
  'Wide Angle': '24mm wide-angle cinema prime lens, expansive depth',
  'Ultra Wide': '14mm ultra-wide cinema lens, dramatic spatial sweep',
  Anamorphic: 'Panavision C-Series 2x anamorphic lens, oval bokeh, subtle blue horizontal flare',
  Telephoto: '85mm telephoto cinema prime lens, creamy compressed background',
  '85mm Portrait': '85mm portrait cinema lens, intimate subject isolation',
  Macro: '100mm cinema macro probe lens, intricate micro-surface detail',
  'Portrait Lens': '105mm f/1.4 cinema portrait lens, flattering facial geometry',
  'Vintage Lens': 'Cooke Panchro classic vintage cinema lens, soft highlight rolloff',
  'Warm Vintage': 'warm vintage spherical cinema lens, amber highlight bloom',
  'Halation Vintage': 'Canon K35 vintage prime lens with warm highlight halation',
  '24mm Wide': '24mm wide cinema prime lens, deep environmental framing',
};

const APERTURE_PROMPT_MAP: Record<string, string> = {
  'f/1.4 Wide Open': 'f/1.4 wide-open aperture, shallow focal plane, creamy optical bokeh',
  'f/1.8': 'f/1.8 fast aperture, soft background separation',
  'f/2': 'f/2.0 shallow depth of field, cinematic subject pop',
  'f/2.0 Shallow': 'f/2.0 shallow depth of field, soft background falloff',
  'f/2.8': 'T2.8 narrative cinema aperture, natural focus rolloff',
  'f/2.8 Cinematic': 'T2.8 narrative cinema stop, natural subject separation',
  'f/4 Moderate': 'f/4.0 balanced cinema aperture',
  'f/5.6': 'f/5.6 medium-deep depth of field, clear background context',
  'f/5.6 Balanced': 'f/5.6 balanced environmental focus',
  'f/8': 'f/8.0 crisp architectural focus',
  'f/11 Deep Focus': 'f/11 deep focus cinematography, foreground and background sharp',
};

const COLOR_PRESET_PROMPTS: Record<string, string> = {
  'Static Noon': 'Static Noon monochrome silver gelatin grade with olive midtones',
  'Twilight Fable': 'Twilight Fable LUT, deep teal shadows with golden tungsten highlights',
  'Back Row Kissing Seats': 'saturated neon crimson and electric cobalt cinema palette',
  'On the Other Side of the Port': 'Kodak Portra 400 coastal daylight film grade',
  'The Emerald Ambush': 'The Emerald Ambush forest canopy green cinema LUT',
  'Highway Standoff': 'Highway Standoff sun-baked desert ochre and cobalt sky palette',
  'The Faded Fresco': 'The Faded Fresco soft Mediterranean pastel daylight grade',
  'Kodak 2383': 'Kodak 2383 print film color science, rich blacks and warm highlights',
  'Noir Silver': 'high-contrast chiaroscuro silver monochrome noir grade',
};

function findMatchingOptionValue(
  options: { value: string; label: string }[],
  desiredRatio: string
): string | undefined {
  const exact = options.find((o) => o.value === desiredRatio);
  if (exact) return exact.value;
  // Normalize synonyms
  if (desiredRatio === '21:9') {
    return options.find((o) => o.value === '16:9')?.value;
  }
  if (desiredRatio === '4:3') {
    return options.find((o) => o.value === '16:9' || o.value === '1:1')?.value;
  }
  if (desiredRatio === '3:4') {
    return options.find((o) => o.value === '9:16' || o.value === '1:1')?.value;
  }
  return undefined;
}

export function translateCreativeControlsForModel(
  controls: UniversalCreativeControlsState,
  model: ModelEntry | undefined,
  surface: Surface
): {
  promptDirective: string;
  nativeSettingsPatch: Record<string, string | number | boolean>;
} {
  const nativeSettingsPatch: Record<string, string | number | boolean> = {};
  const tokens: string[] = [];

  if (surface === 'audio') {
    if (controls.audioDirection.voiceTone && controls.audioDirection.voiceTone !== 'Auto') {
      tokens.push(`Vocal tone: ${controls.audioDirection.voiceTone}`);
    }
    if (controls.audioDirection.pacing && controls.audioDirection.pacing !== 'Auto') {
      tokens.push(`Delivery pacing: ${controls.audioDirection.pacing}`);
    }
    if (controls.audioDirection.musicMood && controls.audioDirection.musicMood !== 'Auto') {
      tokens.push(`Sonic mood: ${controls.audioDirection.musicMood}`);
    }
    if (controls.audioDirection.acousticSpace && controls.audioDirection.acousticSpace !== 'Auto') {
      tokens.push(`Acoustic space: ${controls.audioDirection.acousticSpace}`);
    }
    return {
      promptDirective: tokens.join(', '),
      nativeSettingsPatch,
    };
  }

  // Camera setup
  const cam = controls.cameraSetup.cameraBody;
  if (cam && cam !== 'Auto') {
    tokens.push(CAMERA_BODY_PROMPT_MAP[cam] || `shot on ${cam} cinema camera`);
  }
  const lens = controls.cameraSetup.lens;
  if (lens && lens !== 'Auto') {
    tokens.push(LENS_PROMPT_MAP[lens] || `${lens} cinema lens`);
  }
  const aperture = controls.cameraSetup.aperture;
  if (aperture && aperture !== 'Auto') {
    tokens.push(APERTURE_PROMPT_MAP[aperture] || `${aperture} depth of field`);
  }

  // Camera movement & shot angle
  if (controls.cameraMovement.shotAngle && controls.cameraMovement.shotAngle !== 'Auto') {
    tokens.push(`${controls.cameraMovement.shotAngle} framing`);
  }
  if (surface === 'video' && controls.cameraMovement.movements.length > 0) {
    tokens.push(
      `${controls.cameraMovement.speed.toLowerCase()} ${controls.cameraMovement.movements.join(
        ' + '
      )} camera movement`
    );
  }

  // Lighting
  if (controls.lighting.scheme && controls.lighting.scheme !== 'Auto') {
    tokens.push(`${controls.lighting.scheme} cinema lighting`);
  }

  // Color grade
  if (controls.colorGrading.presetId && controls.colorGrading.presetId !== 'Auto') {
    tokens.push(
      COLOR_PRESET_PROMPTS[controls.colorGrading.presetId] ||
        `${controls.colorGrading.presetId} color grade`
    );
  }
  if (controls.colorGrading.grain >= 35) {
    tokens.push('organic 35mm film grain');
  }

  // Film setup
  if (controls.filmLook.genre && controls.filmLook.genre !== 'General' && controls.filmLook.genre !== 'Auto') {
    tokens.push(`${controls.filmLook.genre} visual storytelling`);
  }
  if (controls.filmLook.era && controls.filmLook.era !== 'Auto') {
    tokens.push(`${controls.filmLook.era} cinema aesthetic`);
  }
  if (surface === 'video' && controls.filmLook.tempo && controls.filmLook.tempo !== 'Auto') {
    tokens.push(`${controls.filmLook.tempo} editorial pacing`);
  }

  // Aspect ratio patching aligned strictly with model.settings
  const desiredRatio = controls.filmLook.aspectRatio;
  if (desiredRatio && desiredRatio !== 'Auto') {
    const arSetting = model?.settings?.find((s) => s.key === 'aspect_ratio');
    if (arSetting && arSetting.type === 'enum') {
      const matched = findMatchingOptionValue(arSetting.options, desiredRatio);
      if (matched) nativeSettingsPatch.aspect_ratio = matched;
    } else if (!model) {
      nativeSettingsPatch.aspect_ratio = desiredRatio;
    }
  }

  // Camera movement / LUT native settings if supported by model
  if (surface === 'video' && controls.cameraMovement.movements.length > 0) {
    const motionSetting = model?.settings?.find(
      (s) => s.key === 'camera_motion' || s.key === 'camera_rig'
    );
    if (motionSetting && motionSetting.type === 'enum') {
      const firstMove = controls.cameraMovement.movements[0].toLowerCase();
      const match = motionSetting.options.find(
        (o) =>
          o.label.toLowerCase().includes(firstMove) ||
          o.value.toLowerCase().includes(firstMove)
      );
      if (match) nativeSettingsPatch[motionSetting.key] = match.value;
    }
  }

  return {
    promptDirective: tokens.join(', '),
    nativeSettingsPatch,
  };
}
