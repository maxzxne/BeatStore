import React, { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { extractPeaks, fallbackPeaks } from '../hooks/useWaveformPeaks';

export default function Waveform({
  url,
  progress = 0,
  onSeek,
  compact = false,
  className,
}) {
  const clipId = useId().replace(/:/g, '');
  const svgRef = useRef(null);
  const bars = compact ? 160 : 280;
  const width = compact ? 640 : 1400;
  const height = compact ? 28 : 56;
  const [peaks, setPeaks] = useState([]);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setPeaks(fallbackPeaks(bars));
      return undefined;
    }
    extractPeaks(url, bars)
      .then((next) => {
        if (!cancelled) setPeaks(next);
      })
      .catch(() => {
        if (!cancelled) setPeaks(fallbackPeaks(bars));
      });
    return () => {
      cancelled = true;
    };
  }, [url, bars]);

  const ratio = Math.min(1, Math.max(0, progress || 0));
  const gap = compact ? 0.4 : 0.7;
  const slot = width / Math.max(peaks.length, 1);
  const barW = Math.max(1, slot - gap);

  const ratioFromEvent = (event) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect?.width) return 0;
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  };

  if (!peaks.length) {
    return <div className={clsx('v3-skeleton w-full', compact ? 'h-9' : 'h-24')} />;
  }

  const columns = peaks.map((peak, index) => {
    const h = Math.max(2, peak * (height - 4));
    return {
      x: index * slot,
      y: (height - h) / 2,
      w: barW,
      h,
    };
  });

  return (
    <svg
      ref={svgRef}
      className={clsx('v3-wave', compact && 'is-mini', className)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="slider"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      aria-label="Прогресс воспроизведения"
      onClick={(event) => onSeek?.(ratioFromEvent(event))}
      onMouseMove={(event) => setHover(ratioFromEvent(event))}
      onMouseLeave={() => setHover(null)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          onSeek?.(Math.min(1, ratio + 0.05));
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onSeek?.(Math.max(0, ratio - 0.05));
        }
      }}
    >
      <g fill="var(--text-faint)" opacity="0.55">
        {columns.map((col, index) => (
          <rect key={`b-${index}`} x={col.x} y={col.y} width={col.w} height={col.h} />
        ))}
      </g>
      <clipPath id={clipId}>
        <rect x="0" y="0" width={width * ratio} height={height} />
      </clipPath>
      <g fill="var(--accent)" clipPath={`url(#${clipId})`}>
        {columns.map((col, index) => (
          <rect key={`a-${index}`} x={col.x} y={col.y} width={col.w} height={col.h} />
        ))}
      </g>
      {hover != null && (
        <line
          x1={width * hover}
          x2={width * hover}
          y1="0"
          y2={height}
          stroke="var(--text)"
          strokeWidth="1"
          opacity="0.35"
        />
      )}
      <rect
        x={Math.max(0, width * ratio - 0.75)}
        y="2"
        width="1.5"
        height={height - 4}
        fill="var(--text)"
      />
    </svg>
  );
}
