import React from 'react';

interface LogoProps {
  className?: string;
  rounded?: string; // tailwind rounding class override
}

/**
 * The Voxnote brand mark — a soundwave inside a gradient square, with a
 * small spark accent for "AI". Inline SVG so it stays crisp at any size and
 * needs no network request. Matches public/favicon.svg (keep both in sync
 * if you tweak the design).
 */
export const Logo: React.FC<LogoProps> = ({ className = 'w-9 h-9', rounded = 'rounded-[22%]' }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      className={`${className} ${rounded} overflow-hidden shrink-0`}
      role="img"
      aria-label="Voxnote"
    >
      <defs>
        <linearGradient id="voxnote-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="55%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <radialGradient id="voxnote-sheen" cx="28%" cy="20%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="512" height="512" fill="url(#voxnote-bg)" />
      <rect width="512" height="512" fill="url(#voxnote-sheen)" />

      <g fill="#FFFFFF">
        <rect x="94" y="196" width="42" height="120" rx="21" fillOpacity="0.85" />
        <rect x="164" y="146" width="42" height="220" rx="21" fillOpacity="0.94" />
        <rect x="234" y="96" width="44" height="320" rx="22" />
        <rect x="306" y="146" width="42" height="220" rx="21" fillOpacity="0.94" />
        <rect x="376" y="196" width="42" height="120" rx="21" fillOpacity="0.85" />
      </g>

      <path
        d="M 397 108 L 405 128 L 425 136 L 405 144 L 397 164 L 389 144 L 369 136 L 389 128 Z"
        fill="#FBBF24"
      />
    </svg>
  );
};
