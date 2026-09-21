/** Dashboard analytics helpers — day series, sparklines, 7d trends. */

function toIsoDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * @param {Record<string, number>|null|undefined} byDay
 * @param {number} days
 * @param {Date} [endDate]
 * @returns {{ day: string, count: number }[]}
 */
export function fillDaySeries(byDay, days = 30, endDate = new Date()) {
  const map = byDay || {};
  const end = new Date(Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
  ));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(end);
    day.setUTCDate(end.getUTCDate() - i);
    const key = toIsoDate(day);
    out.push({ day: key, count: Number(map[key]) || 0 });
  }
  return out;
}

export function sumDayMap(byDay) {
  if (!byDay) return 0;
  return Object.values(byDay).reduce((a, b) => a + (Number(b) || 0), 0);
}

/**
 * Last `window` days vs previous `window` within a filled series (oldest → newest).
 * @returns {{ current: number, previous: number, pct: number|null, direction: 'up'|'down'|'flat' }}
 */
export function periodTrend(series, window = 7) {
  const rows = Array.isArray(series) ? series : [];
  const currentRows = rows.slice(-window);
  const previousRows = rows.slice(-window * 2, -window);
  const current = currentRows.reduce((a, r) => a + (Number(r.count) || 0), 0);
  const previous = previousRows.reduce((a, r) => a + (Number(r.count) || 0), 0);

  if (previous === 0 && current === 0) {
    return { current, previous, pct: null, direction: 'flat' };
  }
  if (previous === 0) {
    return { current, previous, pct: null, direction: current > 0 ? 'up' : 'flat' };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  return { current, previous, pct: Math.abs(pct), direction };
}

export function formatDeltaPct(trend) {
  if (!trend || trend.pct == null || trend.direction === 'flat') return '—';
  if (trend.direction === 'up') return `+${trend.pct}%`;
  return `−${trend.pct}%`;
}

/**
 * SVG path for a sparkline (M/L).
 * @param {number[]} values
 */
export function sparklinePath(values, width = 64, height = 24, pad = 2) {
  if (!values?.length) return '';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = values.length === 1 ? 0 : innerW / (values.length - 1);

  return values
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + innerH - ((v - min) / span) * innerH;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}
