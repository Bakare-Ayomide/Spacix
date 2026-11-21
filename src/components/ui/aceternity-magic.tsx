import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

// ============================================================================
// 1. ACETERNITY UI — INTERACTIVE RADIAL SPOTLIGHT CARD
// ============================================================================
export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className,
  spotlightColor = 'rgba(70, 236, 213, 0.14)',
  ...props
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-[#12141A]/95 transition-colors duration-300 hover:border-[#46ecd5]/40',
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(480px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 45%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
};

// ============================================================================
// 2. MAGIC UI — ANIMATED PERIMETER BORDER BEAM
// ============================================================================
export interface BorderBeamProps {
  className?: string;
  colorFrom?: string;
  colorTo?: string;
}

export const BorderBeam: React.FC<BorderBeamProps> = ({
  className,
  colorFrom = '#46ecd5',
  colorTo = '#0ea5e9',
}) => {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden',
        className
      )}
    >
      <div
        className="absolute -inset-[150%] animate-border-beam opacity-35"
        style={{
          background: `conic-gradient(from 0deg, transparent 0 310deg, ${colorFrom} 340deg, ${colorTo} 360deg)`,
        }}
      />
      <div className="absolute inset-[1px] rounded-[inherit] bg-[#14161C]" />
    </div>
  );
};

// ============================================================================
// 3. ACETERNITY / MOTION PRIMITIVES — SPRING SLIDING PILL TABS
// ============================================================================
export interface AnimatedPillTabItem<T extends string = string> {
  id: T;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  count?: number;
}

export interface AnimatedPillTabsProps<T extends string = string> {
  items: AnimatedPillTabItem<T>[];
  activeId: T | string;
  onChange: (id: T) => void;
  layoutGroupId?: string;
  layoutId?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function AnimatedPillTabs<T extends string = string>({
  items,
  activeId,
  onChange,
  layoutGroupId,
  layoutId,
  className,
  size = 'sm',
}: AnimatedPillTabsProps<T>) {
  const effectiveLayoutId = layoutId || layoutGroupId || 'animated-pill-tab';
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-xl bg-[#111319] p-1 border border-white/[0.07]',
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        const badgeValue = item.badge !== undefined ? item.badge : item.count;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-lg font-bold transition-colors whitespace-nowrap select-none cursor-pointer z-10',
              size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs',
              isActive ? 'text-zinc-950' : 'text-zinc-400 hover:text-white'
            )}
          >
            {isActive && (
              <motion.span
                layoutId={effectiveLayoutId}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="absolute inset-0 -z-10 rounded-lg bg-[#46ecd5] shadow-[0_0_20px_rgba(70,236,213,0.35)]"
              />
            )}
            {item.icon}
            <span>{item.label}</span>
            {badgeValue !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded text-[10px] font-mono-tabular',
                  isActive
                    ? 'bg-zinc-950/20 text-zinc-950'
                    : 'bg-white/5 text-zinc-400'
                )}
              >
                {badgeValue}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// 4. MAGIC UI — SHIMMER GENERATE CTA BUTTON
// ============================================================================
export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const ShimmerButton: React.FC<ShimmerButtonProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#46ecd5] px-5 py-2 text-xs font-extrabold uppercase tracking-wider text-zinc-950 shadow-[0_0_28px_rgba(70,236,213,0.38)] transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer',
        className
      )}
      {...(props as any)}
    >
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </motion.button>
  );
};
