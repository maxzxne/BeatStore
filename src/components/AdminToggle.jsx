import React from 'react';

const ACCENT = {
  green: {
    track: 'peer-checked:bg-[#22c55e] peer-focus-visible:ring-[#22c55e]/40',
  },
  amber: {
    track: 'peer-checked:bg-amber-500 peer-focus-visible:ring-amber-400/40',
  },
};

/**
 * Admin switch — knob is positioned on the track, not the tall hit-area label.
 */
export default function AdminToggle({
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
  accent = 'green',
  className = '',
}) {
  const tones = ACCENT[accent] || ACCENT.green;

  return (
    <label
      className={`inline-flex shrink-0 cursor-pointer items-center self-center p-2 -m-2 ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${className}`.trim()}
    >
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked, e)}
        className="peer sr-only"
        aria-label={ariaLabel}
      />
      <span
        aria-hidden
        className={`relative block h-6 w-11 rounded-full bg-white/15 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full peer-focus-visible:ring-2 ${tones.track}`}
      />
    </label>
  );
}
