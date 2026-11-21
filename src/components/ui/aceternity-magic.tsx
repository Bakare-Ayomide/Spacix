import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

// ============================================================================
// 1. ACETERNITY UI — INTERACTIVE RADIAL SPOTLIGHT CARD (MagicAI Cosmic Edition)
// ============================================================================
export interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className,
  spotlightColor = 'rgba(99, 102, 241, 0.16)',
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
        'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0F19]/95 transition-all duration-200 hover:border-indigo-500/45 shadow-[0_12px_40px_rgba(0,0,0,0.55)]',
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(520px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 45%)`,
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
  colorFrom = '#6366F1',
  colorTo = '#22D3EE',
}) => {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden',
        className
      )}
    >
      <div
        className="absolute -inset-[150%] animate-border-beam opacity-45"
        style={{
          background: `conic-gradient(from 0deg, transparent 0 305deg, ${colorFrom} 338deg, ${colorTo} 360deg)`,
        }}
      />
      <div className="absolute inset-[1px] rounded-[inherit] bg-[#0B0F19]" />
    </div>
  );
};

// ============================================================================
// 3. ACETERNITY / MOTION PRIMITIVES — SPRING SLIDING SEGMENTED TABS
// ============================================================================
export interface AnimatedPillTabItem<T extends string = string> {
  id?: T;
  value?: T;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  count?: number;
}

export interface AnimatedPillTabsProps<T extends string = string> {
  items: AnimatedPillTabItem<T>[];
  activeId?: T | string;
  value?: T | string;
  onChange: (id: T) => void;
  layoutGroupId?: string;
  layoutId?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function AnimatedPillTabs<T extends string = string>({
  items,
  activeId,
  value,
  onChange,
  layoutGroupId,
  layoutId,
  className,
  size = 'sm',
}: AnimatedPillTabsProps<T>) {
  const effectiveLayoutId = layoutId || layoutGroupId || 'animated-pill-tab';
  const currentActive = activeId !== undefined ? activeId : value;
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-xl bg-[#0D121F] p-1 border border-white/[0.08]',
        className
      )}
    >
      {items.map((item) => {
        const itemId = (item.id !== undefined ? item.id : item.value) as T;
        const isActive = itemId === currentActive;
        const badgeValue = item.badge !== undefined ? item.badge : item.count;
        return (
          <button
            key={itemId}
            type="button"
            onClick={() => onChange(itemId)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap select-none cursor-pointer z-10',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs',
              isActive ? 'text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            {isActive && (
              <motion.span
                layoutId={effectiveLayoutId}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 shadow-[0_0_24px_rgba(99,102,241,0.4)]"
              />
            )}
            {item.icon}
            <span>{item.label}</span>
            {badgeValue !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded text-[10px] font-mono-tabular',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-slate-400'
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
// 4. MAGIC UI — SHIMMER GENERATE CTA BUTTON (Cosmic Indigo -> Cyan Gradient)
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
        'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 px-5 py-2.5 text-xs font-semibold tracking-wide text-white shadow-[0_8px_30px_rgba(99,102,241,0.42)] transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer whitespace-nowrap',
        className
      )}
      {...(props as any)}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
};
