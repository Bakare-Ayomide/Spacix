import React from 'react';
import type { GearVisualSpec } from '../catalog/cinemaGearVisuals';

export interface GearVisualProps {
  spec: GearVisualSpec;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<GearVisualProps['size']>, string> = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

export const GearVisual: React.FC<GearVisualProps> = ({
  spec,
  size = 'md',
  className = '',
}) => {
  return (
    <img
      src={spec.src}
      alt={spec.alt}
      loading="lazy"
      draggable={false}
      className={`${SIZE_CLASSES[size]} object-contain shrink-0 select-none pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)] ${className}`}
    />
  );
};
