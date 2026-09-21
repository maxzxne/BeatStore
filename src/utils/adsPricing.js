export const ADS_DURATION_PRESETS = [
  { days: 3, label: '3 дня', hint: 'короткий слот' },
  { days: 7, label: '7 дней', hint: 'неделя' },
  { days: 14, label: '14 дней', hint: 'две недели' },
  { days: 28, label: '28 дней', hint: 'месяц' },
];

export const DEFAULT_ADS_PRICE_PER_DAY = 1000;

export const ADS_CUSTOM_MIN_DAYS = 1;
export const ADS_CUSTOM_MAX_DAYS = 90;

export const AD_ORDER_STATUSES = {
  NEW: 'новая',
  APPROVED: 'одобрена',
  PUBLISHED: 'опубликована',
  REJECTED: 'отклонена',
  CANCELLED: 'отменена',
};

export function normalizeAdsPricePerDay(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_ADS_PRICE_PER_DAY;
  return Math.round(n * 100) / 100;
}

/** @deprecated package map — kept for old settings payloads */
export function normalizeAdsPrices(raw) {
  const out = { 3: 5000, 7: 10000, 14: 18000, 28: 30000 };
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(out)) {
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

export function quoteAdsPeriod(days, pricePerDay, sale = null) {
  const d = Number(days);
  const rate = normalizeAdsPricePerDay(pricePerDay);
  if (!Number.isFinite(d) || d < ADS_CUSTOM_MIN_DAYS || d > ADS_CUSTOM_MAX_DAYS) {
    return { list: null, pay: null, days: null };
  }
  const list = Math.round(d * rate);
  const pay = applyAdsSale(list, sale);
  return { list, pay, days: d };
}

/** @deprecated use quoteAdsPeriod */
export function resolveAdsPrice(days, prices, sale = null) {
  const d = Number(days);
  if (prices && typeof prices === 'object' && !Array.isArray(prices) && (d in prices || String(d) in prices)) {
    const list = Number(prices[d] ?? prices[String(d)]);
    if (Number.isFinite(list)) {
      return { list, pay: applyAdsSale(list, sale), custom: false };
    }
  }
  return { list: null, pay: null, custom: true };
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
