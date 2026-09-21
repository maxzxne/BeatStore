/** Inclusive date presets for admin revenue / errors filters. */

function toIsoDateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * @param {'7'|'30'|'90'|'month'|string} preset
 * @param {Date} [now]
 * @returns {{ startDate: string, endDate: string }}
 */
export function datePresetRange(preset, now = new Date()) {
  const end = startOfLocalDay(now);
  const endDate = toIsoDateLocal(end);

  if (preset === 'month') {
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { startDate: toIsoDateLocal(start), endDate };
  }

  const days = Number(preset);
  if (!Number.isFinite(days) || days <= 0) {
    return { startDate: '', endDate: '' };
  }

  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  return { startDate: toIsoDateLocal(start), endDate };
}

/**
 * @returns {'7'|'30'|'90'|'month'|''}
 */
export function matchDatePreset(startDate, endDate, now = new Date()) {
  if (!startDate || !endDate) return '';
  for (const preset of ['7', '30', '90', 'month']) {
    const range = datePresetRange(preset, now);
    if (range.startDate === startDate && range.endDate === endDate) return preset;
  }
  return '';
}

export const DATE_PRESET_OPTIONS = [
  { id: '7', label: '7 дней' },
  { id: '30', label: '30 дней' },
  { id: '90', label: '90 дней' },
  { id: 'month', label: 'Этот месяц' },
];
