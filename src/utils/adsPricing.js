export const ADS_DURATION_PRESETS = [
  { days: 3, label: '3 дня', hint: 'короткий слот' },
  { days: 7, label: '7 дней', hint: 'неделя' },
  { days: 14, label: '14 дней', hint: 'две недели' },
  { days: 28, label: '28 дней', hint: 'месяц' },
];

export const DEFAULT_ADS_PRICES = {
  3: 5000,
  7: 10000,
  14: 18000,
  28: 30000,
};

export const ADS_CUSTOM_MIN_DAYS = 1;
export const ADS_CUSTOM_MAX_DAYS = 90;

export function normalizeAdsPrices(raw) {
  const out = { ...DEFAULT_ADS_PRICES };
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(DEFAULT_ADS_PRICES)) {
    const n = Number(raw[key] ?? raw[String(key)]);
    if (Number.isFinite(n) && n >= 0) out[Number(key)] = Math.round(n);
  }
  return out;
}

export function applyAdsSale(listAmount, sale) {
  const listed = Number(listAmount) || 0;
  if (listed <= 0 || !sale) return listed;
  const off = Number(sale.value) || 0;
  if (off <= 0) return listed;
  if (sale.kind === 'percent') {
    const ratio = Math.min(off, 100) / 100;
    return Math.round(Math.max(0, listed * (1 - ratio)));
  }
  if (sale.kind === 'amount') {
    return Math.round(Math.max(0, listed - off));
  }
  return listed;
}

export function resolveAdsPrice(days, prices, sale = null) {
  const d = Number(days);
  const map = normalizeAdsPrices(prices);
  if (!Number.isFinite(d) || !(d in map)) {
    return { list: null, pay: null, custom: true };
  }
  const list = map[d];
  const pay = applyAdsSale(list, sale);
  return { list, pay, custom: false };
}

export function parseCustomAdsDays(value) {
  const n = parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(n) || n < ADS_CUSTOM_MIN_DAYS || n > ADS_CUSTOM_MAX_DAYS) {
    return null;
  }
  return n;
}

export function formatAdsRub(amount) {
  if (amount == null || !Number.isFinite(Number(amount))) return '';
  return `${Number(amount).toLocaleString('ru-RU')} ₽`;
}
