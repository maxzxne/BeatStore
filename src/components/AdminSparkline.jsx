import React from 'react';
import { sparklinePath } from '../utils/adminDashboardMetrics';

/** Compact inline sparkline for admin KPI cards. */
export default function AdminSparkline({
  values = [],
  width = 72,
  height = 28,
  className = 'text-[#22c55e]',
}) {
  const d = sparklinePath(values, width, height);
  if (!d) return null;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
