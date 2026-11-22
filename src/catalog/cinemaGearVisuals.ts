export interface GearVisualSpec {
  src: string;
  alt: string;
  category: 'camera' | 'lens' | 'aperture' | 'angle' | 'movement' | 'color';
}

export const GEAR_IMAGE_PATHS = {
  camModernAlexa: '/assets/gear/cam_modern_alexa.png',
  cam35mmPanavision: '/assets/gear/cam_35mm_panavision.png',
  cam16mmBolex: '/assets/gear/cam_16mm_bolex.png',
  camImax70mm: '/assets/gear/cam_imax_70mm.png',
  camDvCamcorder: '/assets/gear/cam_dv_camcorder.png',
  camCinemaAuto: '/assets/gear/cam_cinema_auto.png',

  lensCleanPrime: '/assets/gear/lens_clean_prime.png',
  lensAnamorphic: '/assets/gear/lens_anamorphic.png',
  lensVintageK35: '/assets/gear/lens_vintage_k35.png',
  lensWide24mm: '/assets/gear/lens_wide_24mm.png',
  lensTelephoto85mm: '/assets/gear/lens_telephoto_85mm.png',
  apertureIris: '/assets/gear/aperture_iris.png',

  angleWide: '/assets/gear/angle_wide.png',
  angleCloseup: '/assets/gear/angle_closeup.png',
  angleLow: '/assets/gear/angle_low.png',
  angleHighOverhead: '/assets/gear/angle_high_overhead.png',
  angleDutch: '/assets/gear/angle_dutch.png',

  moveDollyTrack: '/assets/gear/move_dolly_track.png',
  moveCraneJib: '/assets/gear/move_crane_jib.png',
  moveGimbalOrbit: '/assets/gear/move_gimbal_orbit.png',
  moveSnorricam: '/assets/gear/move_snorricam.png',

  lutCinemaAuto: '/assets/gear/lut_cinema_auto.png',
  lutTealAmber: '/assets/gear/lut_teal_amber.png',
  lutMonochrome: '/assets/gear/lut_monochrome.png',
  lutNeonCrimson: '/assets/gear/lut_neon_crimson.png',
  lutKodakPortra: '/assets/gear/lut_kodak_portra.png',
  lutEmerald: '/assets/gear/lut_emerald.png',
  lutDesertGold: '/assets/gear/lut_desert_gold.png',
} as const;

export function getCameraBodyVisual(labelOrId?: string): GearVisualSpec {
  const k = String(labelOrId || '').toLowerCase();
  if (k.includes('dv') || k.includes('camcorder') || k.includes('vhs') || k.includes('handycam')) {
    return { src: GEAR_IMAGE_PATHS.camDvCamcorder, alt: labelOrId || 'DV Camcorder', category: 'camera' };
  }
  if (k.includes('16mm') || k.includes('bolex') || k.includes('super 16')) {
    return { src: GEAR_IMAGE_PATHS.cam16mmBolex, alt: labelOrId || '16mm Bolex Film Camera', category: 'camera' };
  }
  if (k.includes('imax') || k.includes('70mm') || k.includes('15-perf')) {
    return { src: GEAR_IMAGE_PATHS.camImax70mm, alt: labelOrId || 'IMAX 70mm Film Camera', category: 'camera' };
  }
  if (k.includes('35mm') || k.includes('panavision') || k.includes('film') || k.includes('celluloid')) {
    return { src: GEAR_IMAGE_PATHS.cam35mmPanavision, alt: labelOrId || '35mm Cinema Camera', category: 'camera' };
  }
  if (k.includes('modern') || k.includes('alexa') || k.includes('digital') || k.includes('arri') || k.includes('venice') || k.includes('red')) {
    return { src: GEAR_IMAGE_PATHS.camModernAlexa, alt: labelOrId || 'Modern Cinema Camera', category: 'camera' };
  }
  return { src: GEAR_IMAGE_PATHS.camCinemaAuto, alt: labelOrId || 'Cinema Camera System', category: 'camera' };
}

export function getLensOpticVisual(labelOrId?: string): GearVisualSpec {
  const k = String(labelOrId || '').toLowerCase();
  if (k.includes('anamorphic') || k.includes('c-series') || k.includes('40mm')) {
    return { src: GEAR_IMAGE_PATHS.lensAnamorphic, alt: labelOrId || 'Anamorphic Cinema Lens', category: 'lens' };
  }
  if (k.includes('vintage') || k.includes('halation') || k.includes('k35') || k.includes('cooke')) {
    return { src: GEAR_IMAGE_PATHS.lensVintageK35, alt: labelOrId || 'Vintage K35 Cinema Lens', category: 'lens' };
  }
  if (k.includes('14mm') || k.includes('18mm') || k.includes('24mm') || k.includes('28mm') || k.includes('wide') || k.includes('probe') || k.includes('macro')) {
    return { src: GEAR_IMAGE_PATHS.lensWide24mm, alt: labelOrId || 'Wide Cinema Prime Lens', category: 'lens' };
  }
  if (k.includes('85mm') || k.includes('100mm') || k.includes('135mm') || k.includes('portrait') || k.includes('tele')) {
    return { src: GEAR_IMAGE_PATHS.lensTelephoto85mm, alt: labelOrId || '85mm Telephoto Cinema Lens', category: 'lens' };
  }
  return { src: GEAR_IMAGE_PATHS.lensCleanPrime, alt: labelOrId || '50mm Cinema Prime Lens', category: 'lens' };
}

export function getApertureVisual(labelOrId?: string): GearVisualSpec {
  return {
    src: GEAR_IMAGE_PATHS.apertureIris,
    alt: labelOrId || 'Cinema Lens Aperture Iris',
    category: 'aperture',
  };
}

export function getCameraAngleVisual(labelOrId?: string): GearVisualSpec {
  const k = String(labelOrId || '').toLowerCase();
  if (k.includes('dutch') || k.includes('cant') || k.includes('tilt')) {
    return { src: GEAR_IMAGE_PATHS.angleDutch, alt: labelOrId || 'Dutch Tilt Angle', category: 'angle' };
  }
  if (k.includes('low') || k.includes('hero') || k.includes('worm')) {
    return { src: GEAR_IMAGE_PATHS.angleLow, alt: labelOrId || 'Low-Angle Hero Camera', category: 'angle' };
  }
  if (k.includes('high') || k.includes('overhead') || k.includes('top') || k.includes('bird') || k.includes('crane') || k.includes('aerial')) {
    return { src: GEAR_IMAGE_PATHS.angleHighOverhead, alt: labelOrId || 'High / Overhead Camera Angle', category: 'angle' };
  }
  if (k.includes('extreme wide') || k.includes('ews') || k.includes('wide') || k.includes('establishing') || k.includes('master') || k.includes('full-body')) {
    return { src: GEAR_IMAGE_PATHS.angleWide, alt: labelOrId || 'Wide Framing Camera', category: 'angle' };
  }
  if (k.includes('close') || k.includes('ecu') || k.includes('mcu') || k.includes('cu') || k.includes('ots') || k.includes('over-the-shoulder') || k.includes('reverse')) {
    return { src: GEAR_IMAGE_PATHS.angleCloseup, alt: labelOrId || 'Close-Up Framing Camera', category: 'angle' };
  }
  if (k.includes('pov') || k.includes('track') || k.includes('steadicam')) {
    return { src: GEAR_IMAGE_PATHS.moveDollyTrack, alt: labelOrId || 'Tracking POV Camera', category: 'angle' };
  }
  return { src: GEAR_IMAGE_PATHS.angleCloseup, alt: labelOrId || 'Cinema Framing Angle', category: 'angle' };
}

export function getCameraMovementVisual(labelOrId?: string): GearVisualSpec {
  const k = String(labelOrId || '').toLowerCase();
  if (k.includes('snorri') || k.includes('chest')) {
    return { src: GEAR_IMAGE_PATHS.moveSnorricam, alt: labelOrId || 'SnorriCam Body Rig', category: 'movement' };
  }
  if (k.includes('crane') || k.includes('jib') || k.includes('tilt up') || k.includes('tilt down') || k.includes('ascent') || k.includes('rise')) {
    return { src: GEAR_IMAGE_PATHS.moveCraneJib, alt: labelOrId || 'Studio Crane / Jib Movement', category: 'movement' };
  }
  if (k.includes('orbit') || k.includes('360') || k.includes('180') || k.includes('robot') || k.includes('gimbal') || k.includes('whip') || k.includes('handheld') || k.includes('pan')) {
    return { src: GEAR_IMAGE_PATHS.moveGimbalOrbit, alt: labelOrId || 'Motorized Gimbal Orbit Rig', category: 'movement' };
  }
  if (k.includes('rack') || k.includes('focus')) {
    return { src: GEAR_IMAGE_PATHS.lensCleanPrime, alt: labelOrId || 'Optical Rack Focus Pull', category: 'movement' };
  }
  if (k.includes('pov')) {
    return { src: GEAR_IMAGE_PATHS.angleWide, alt: labelOrId || 'First-Person POV Rig', category: 'movement' };
  }
  if (k.includes('static') || k.includes('tripod') || k.includes('locked')) {
    return { src: GEAR_IMAGE_PATHS.angleDutch, alt: labelOrId || 'Locked Fluid Head Tripod', category: 'movement' };
  }
  return { src: GEAR_IMAGE_PATHS.moveDollyTrack, alt: labelOrId || 'Cinema Dolly Track Rig', category: 'movement' };
}

export function getColorGradeVisual(labelOrId?: string): GearVisualSpec {
  const k = String(labelOrId || '').toLowerCase();
  if (k.includes('static noon') || k.includes('monochrome') || k.includes('noir') || k.includes('b&w') || k.includes('silver')) {
    return { src: GEAR_IMAGE_PATHS.lutMonochrome, alt: labelOrId || 'Monochrome Noir LUT', category: 'color' };
  }
  if (k.includes('twilight') || k.includes('teal') || k.includes('cyan') || k.includes('anamorphic') || k.includes('matrix') || k.includes('neon rim') || k.includes('practicals')) {
    return { src: GEAR_IMAGE_PATHS.lutTealAmber, alt: labelOrId || 'Teal & Amber Cinema LUT', category: 'color' };
  }
  if (k.includes('kissing') || k.includes('neon') || k.includes('cyber') || k.includes('crimson') || k.includes('strobe') || k.includes('back row')) {
    return { src: GEAR_IMAGE_PATHS.lutNeonCrimson, alt: labelOrId || 'Neon Crimson Chromatic LUT', category: 'color' };
  }
  if (k.includes('emerald') || k.includes('green') || k.includes('ambush') || k.includes('overhead')) {
    return { src: GEAR_IMAGE_PATHS.lutEmerald, alt: labelOrId || 'Emerald Canopy LUT', category: 'color' };
  }
  if (k.includes('standoff') || k.includes('golden') || k.includes('sunset') || k.includes('ochre') || k.includes('silhouette') || k.includes('vhs')) {
    return { src: GEAR_IMAGE_PATHS.lutDesertGold, alt: labelOrId || 'Golden Desert LUT', category: 'color' };
  }
  if (k.includes('portra') || k.includes('faded') || k.includes('fresco') || k.includes('port') || k.includes('beauty') || k.includes('35mm') || k.includes('window')) {
    return { src: GEAR_IMAGE_PATHS.lutKodakPortra, alt: labelOrId || 'Kodak Portra Daylight LUT', category: 'color' };
  }
  return { src: GEAR_IMAGE_PATHS.lutCinemaAuto, alt: labelOrId || 'Cinema Color Science LUT', category: 'color' };
}

export function getSettingOptionVisual(
  settingKey: string,
  optionLabelOrValue?: string
): GearVisualSpec | null {
  const key = settingKey.toLowerCase();
  const val = String(optionLabelOrValue || '');
  if (key.includes('camera_rig') || key === 'camera') {
    return getCameraMovementVisual(val);
  }
  if (key.includes('camera_motion') || key.includes('movement')) {
    return getCameraMovementVisual(val);
  }
  if (key.includes('lens') || key.includes('focal')) {
    return getLensOpticVisual(val);
  }
  if (key.includes('color') || key.includes('lut') || key.includes('palette') || key.includes('render_mode')) {
    return getColorGradeVisual(val);
  }
  if (key.includes('angle') || key.includes('framing') || key.includes('shot')) {
    return getCameraAngleVisual(val);
  }
  return null;
}
