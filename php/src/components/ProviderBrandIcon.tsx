import React from 'react';
import { ApiProviderId } from '../types/studio';

export const SPACIX_LOGO_URL = '/brand/logo.png';
export const SPACIX_FAVICON_URL = '/brand/favicon.jpg';

export const SpacixLogo: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClass =
    size === 'sm'
      ? 'h-5 sm:h-6 max-w-[96px] sm:max-w-[116px]'
      : size === 'lg'
      ? 'h-8 sm:h-10 md:h-11 max-w-[144px] sm:max-w-[180px] md:max-w-[204px]'
      : size === 'xl'
      ? 'h-10 sm:h-12 md:h-14 max-w-[180px] sm:max-w-[224px] md:max-w-[260px]'
      : 'h-6 sm:h-7 md:h-8 max-w-[112px] sm:max-w-[136px] md:max-w-[156px]';

  return (
    <span className={`inline-flex items-center select-none shrink-0 ${className}`}>
      <img
        src={SPACIX_LOGO_URL}
        alt="SPACIX"
        width={894}
        height={279}
        decoding="async"
        className={`${sizeClass} w-auto aspect-[894/279] object-contain drop-shadow-[0_0_12px_rgba(70,236,213,0.28)]`}
      />
    </span>
  );
};

export const API_PROVIDER_META: Record<
  ApiProviderId,
  {
    id: ApiProviderId;
    label: string;
    shortLabel: string;
    baseUrl: string;
    accent: string;
    tagline: string;
  }
> = {
  fal: {
    id: 'fal',
    label: 'fal.ai',
    shortLabel: 'fal.ai',
    baseUrl: 'https://queue.fal.run',
    accent: '#46ecd5',
    tagline: '1,000+ Hosted Models · Queue & Subscribe CDN',
  },
  higgsfield: {
    id: 'higgsfield',
    label: 'Higgsfield',
    shortLabel: 'Higgsfield',
    baseUrl: 'https://api.higgsfield.ai',
    accent: '#38BDF8',
    tagline: 'Cinema DoP Rigs · Soul & Anamorphic Video',
  },
  muapi: {
    id: 'muapi',
    label: 'Muapi.ai',
    shortLabel: 'Muapi.ai',
    baseUrl: 'https://api.muapi.ai/v1',
    accent: '#A855F7',
    tagline: 'Unified Multimodal Router · High Concurrency',
  },
  runware: {
    id: 'runware',
    label: 'Runware.ai',
    shortLabel: 'Runware.ai',
    baseUrl: 'https://api.runware.ai/v1',
    accent: '#F59E0B',
    tagline: 'Sonic Inference Engine · Sub-Second Tasks',
  },
};

export interface ProviderIconProps {
  provider: string;
  className?: string;
  size?: number;
}

/**
 * Authentic vector logos for all API gateways & model families in SPACIX Studio:
 * - fal.ai / Higgsfield / Muapi.ai / Runware.ai
 * - Google / Nano Banana
 * - ByteDance / Seedance
 * - Kling / Kuaishou
 * - Black Forest Labs / Flux
 * - xAI / Grok Imagine
 * - Ideogram / Alibaba / Recraft / MiniMax / Lightricks
 * - ElevenLabs / Beatoven / Resemble Chatterbox / Dia TTS
 * - SPACIX Soul / DoP / Sonilo
 */
export const ProviderBrandIcon: React.FC<ProviderIconProps> = ({
  provider,
  className = 'w-4 h-4',
  size = 16,
}) => {
  const norm = provider.toLowerCase();

  // A. fal.ai
  if (norm === 'fal' || norm.includes('fal.ai') || norm.includes('fal-ai')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="fal.ai"
      >
        <rect width="24" height="24" rx="5" fill="#101418" stroke="#46ecd5" strokeWidth="1.4" />
        <path
          d="M7.5 17V7H16.5V9.4H10.3V11.2H15.2V13.5H10.3V17H7.5Z"
          fill="#46ecd5"
        />
        <circle cx="16.8" cy="15.8" r="1.6" fill="#FFFFFF" />
      </svg>
    );
  }

  // B. Higgsfield
  if (norm.includes('higgsfield')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Higgsfield AI"
      >
        <rect width="24" height="24" rx="5" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.4" />
        <path
          d="M6.5 6.5V17.5M17.5 6.5V17.5M6.5 12H17.5"
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // C. Muapi.ai
  if (norm.includes('muapi')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Muapi.ai"
      >
        <rect width="24" height="24" rx="5" fill="#1E1028" stroke="#A855F7" strokeWidth="1.4" />
        <path
          d="M6 17V7L12 13L18 7V17"
          stroke="#C084FC"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // D. Runware.ai
  if (norm.includes('runware')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Runware.ai"
      >
        <rect width="24" height="24" rx="5" fill="#1F1608" stroke="#F59E0B" strokeWidth="1.4" />
        <path
          d="M13 4L6.5 13H12L10.5 20L17.5 11H12L13 4Z"
          fill="#F59E0B"
        />
      </svg>
    );
  }

  // 1. Google / Nano Banana / Gemini
  if (norm.includes('google') || norm.includes('banana') || norm.includes('gemini')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Google AI / Nano Banana"
      >
        <path
          d="M22.5 12.25c0-.82-.07-1.61-.2-2.38H12v4.51h5.9c-.25 1.36-1.02 2.52-2.18 3.29v2.73h3.53c2.06-1.9 3.25-4.7 3.25-8.15z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.99 7.28-2.67l-3.53-2.73c-.99.66-2.25 1.05-3.75 1.05-2.88 0-5.32-1.95-6.19-4.57H2.16v2.82C3.96 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.81 14.08A6.87 6.87 0 0 1 5.45 12c0-.72.12-1.43.36-2.08V7.1H2.16A10.97 10.97 0 0 0 1 12c0 1.77.42 3.45 1.16 4.9l3.65-2.82z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.35c1.62 0 3.07.56 4.21 1.64l3.16-3.16C17.45 2.07 14.97 1 12 1 7.7 1 3.96 3.47 2.16 7.1l3.65 2.82c.87-2.62 3.31-4.57 6.19-4.57z"
          fill="#EA4335"
        />
      </svg>
    );
  }

  // 2. ByteDance / Seedance
  if (norm.includes('bytedance') || norm.includes('seedance') || norm.includes('seed audio')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="ByteDance Seedance"
      >
        <rect width="24" height="24" rx="5" fill="#1C1C22" />
        <path d="M5 8.5L9.5 6L14 8.5L9.5 11L5 8.5Z" fill="#00D7D2" />
        <path d="M10 13L14.5 10.5L19 13L14.5 15.5L10 13Z" fill="#3A82F6" />
        <path d="M5 15.5L9.5 13L14 15.5L9.5 18L5 15.5Z" fill="#46ecd5" />
      </svg>
    );
  }

  // 3. Kuaishou Kling
  if (norm.includes('kling') || norm.includes('kuaishou')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Kuaishou Kling"
      >
        <rect width="24" height="24" rx="5" fill="#FF5E2C" />
        <circle cx="12" cy="12" r="5" stroke="#FFFFFF" strokeWidth="2.5" />
        <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
        <path
          d="M12 4V7M12 17V20M4 12H7M17 12H20"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // 4. Black Forest Labs / Flux
  if (norm.includes('flux') || norm.includes('black forest')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Black Forest Labs Flux"
      >
        <rect width="24" height="24" rx="5" fill="#18181B" />
        <path d="M6 6H18V10H10V14H16V18H6V6Z" fill="#46ecd5" />
      </svg>
    );
  }

  // 5. xAI / Grok
  if (norm.includes('xai') || norm.includes('grok')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="xAI Grok"
      >
        <rect width="24" height="24" rx="5" fill="#000000" />
        <path
          d="M18.244 4H15.65L12 9.544 8.35 4H5.756l5.12 7.632L5.5 19.5h2.594L12 13.674l3.906 5.826h2.594l-5.37-8.006L18.244 4z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 6. Ideogram
  if (norm.includes('ideogram')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Ideogram"
      >
        <rect width="24" height="24" rx="5" fill="#E11D48" />
        <circle cx="12" cy="12" r="6" fill="#FFFFFF" />
        <circle cx="12" cy="12" r="3" fill="#E11D48" />
      </svg>
    );
  }

  // 7. Alibaba / Qwen / Wan
  if (norm.includes('alibaba') || norm.includes('qwen') || norm.includes('wan')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Alibaba Wan & Qwen"
      >
        <rect width="24" height="24" rx="5" fill="#FF6A00" />
        <path
          d="M6 13C6 9.686 8.686 7 12 7C14.8 7 17.15 8.9 17.8 11.5C19.6 11.8 21 13.3 21 15.2C21 17.3 19.3 19 17.2 19H7C4.8 19 3 17.2 3 15C3 13.1 4.3 11.5 6.1 11.1C6 11.7 6 12.3 6 13Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // 8. Recraft
  if (norm.includes('recraft')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Recraft"
      >
        <rect width="24" height="24" rx="5" fill="#0D9488" />
        <path
          d="M7 17L17 7M17 7H10M17 7V14"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // 9. MiniMax Hailuo
  if (norm.includes('minimax') || norm.includes('hailuo')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="MiniMax"
      >
        <rect width="24" height="24" rx="5" fill="#6366F1" />
        <rect x="5" y="9" width="2.5" height="6" rx="1" fill="#FFFFFF" />
        <rect x="9.5" y="6" width="2.5" height="12" rx="1" fill="#FFFFFF" />
        <rect x="14" y="8" width="2.5" height="8" rx="1" fill="#FFFFFF" />
        <rect x="18.5" y="10" width="2.5" height="4" rx="1" fill="#FFFFFF" />
      </svg>
    );
  }

  // 10. Lightricks LTX
  if (norm.includes('lightricks') || norm.includes('ltx')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Lightricks LTX"
      >
        <rect width="24" height="24" rx="5" fill="#14B8A6" />
        <polygon points="12,5 19,18 5,18" fill="#FFFFFF" />
      </svg>
    );
  }

  // 11. ElevenLabs
  if (norm.includes('elevenlabs')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="ElevenLabs"
      >
        <rect width="24" height="24" rx="5" fill="#18181B" stroke="#FFFFFF" strokeOpacity="0.25" />
        <rect x="8" y="5" width="3" height="14" rx="1" fill="#FFFFFF" />
        <rect x="13" y="5" width="3" height="14" rx="1" fill="#46ecd5" />
      </svg>
    );
  }

  // 12. Beatoven / Chatterbox / Resemble / Dia
  if (
    norm.includes('beatoven') ||
    norm.includes('chatterbox') ||
    norm.includes('resemble') ||
    norm.includes('dia')
  ) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-label="Audio Speech Synthesis"
      >
        <rect width="24" height="24" rx="5" fill="#0F172A" stroke="#46ecd5" strokeWidth="1.2" />
        <path
          d="M5 12H7M9 8V16M12 5V19M15 9V15M18 11V13"
          stroke="#46ecd5"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // 13. SPACIX / Sonilo / Inworld
  return (
    <img
      src={SPACIX_FAVICON_URL}
      alt="SPACIX Studio Rig"
      width={size}
      height={size}
      decoding="async"
      style={{ width: size, height: size }}
      className={`rounded-[4px] object-cover border border-white/15 shrink-0 ${className}`}
    />
  );
};

export const ApiProviderBadge: React.FC<{
  providerId: ApiProviderId;
  active?: boolean;
  className?: string;
}> = ({ providerId, active = false, className = '' }) => {
  const meta = API_PROVIDER_META[providerId] || API_PROVIDER_META.higgsfield;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-mono-tabular font-medium ${
        active ? 'text-[#46ecd5]' : 'text-zinc-300'
      } ${className}`}
    >
      <ProviderBrandIcon provider={meta.id} size={13} />
      <span>{meta.shortLabel}</span>
    </span>
  );
};
