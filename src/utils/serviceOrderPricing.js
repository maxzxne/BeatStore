/**
 * Service-order pricing CMS (mirrors backend/service_order_pricing.py).
 * Tokens for copy: {{trap}}, {{from}}, {{p50_21}}, {{p100_7}}, …
 */

export const DEFAULT_SERVICE_ORDER_PRICING = {
  deadlines: [
    { days: 21, label: '2–3 недели', hint: '14–21 день', price_50: 25000, price_100: 20000 },
    { days: 10, label: '1–2 недели', hint: '8–13 дней', price_50: 30000, price_100: 25000 },
    { days: 7, label: 'Неделя', hint: '7 дней', price_50: 35000, price_100: 30000 },
    { days: 3, label: '2–3 дня', hint: 'быстрее', price_50: 40000, price_100: 35000 },
    { days: 1, label: '24 часа', hint: 'срочно', price_50: 50000, price_100: 45000 },
  ],
  trap_price: 15000,
  copy: {
    guide_title: 'Прайс услуг',
    guide_subtitle: 'от {{from}} · срок и предоплата меняют цену',
    song_title: 'Песня под ключ',
    song_body:
      'Песня с мелодиями и текстом (текст опционально). Права — заказчику, без указания авторства.',
    trap_title: 'Бит в стиле трэп',
    trap_body: 'Фикс. цена {{trap}}, срок на стоимость не влияет.',
    col_50_title: 'Предоплата 50%',
    col_100_title: 'Оплата 100%',
  },
};

export function formatServiceRub(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0 ₽';
  // Regular spaces — easier for templates / copy-paste than locale NBSP
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;
}

function asInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

export function normalizeServiceOrderPricing(raw) {
  const base = structuredClone
    ? structuredClone(DEFAULT_SERVICE_ORDER_PRICING)
    : JSON.parse(JSON.stringify(DEFAULT_SERVICE_ORDER_PRICING));

  if (!raw || typeof raw !== 'object') return base;

  base.trap_price = asInt(raw.trap_price, base.trap_price);

  if (Array.isArray(raw.deadlines) && raw.deadlines.length) {
    const rows = [];
    for (let i = 0; i < raw.deadlines.length; i += 1) {
      const item = raw.deadlines[i];
      if (!item || typeof item !== 'object') continue;
      const fallback = base.deadlines[Math.min(i, base.deadlines.length - 1)];
      let days = asInt(item.days, fallback.days);
      if (days <= 0) days = fallback.days;
      rows.push({
        days,
        label: String(item.label || fallback.label).trim().slice(0, 80) || fallback.label,
        hint: String(item.hint ?? fallback.hint).trim().slice(0, 80),
        price_50: asInt(item.price_50, fallback.price_50),
        price_100: asInt(item.price_100, fallback.price_100),
      });
    }
    if (rows.length) base.deadlines = rows.slice(0, 12);
  }

  if (raw.copy && typeof raw.copy === 'object') {
    Object.keys(base.copy).forEach((key) => {
      if (raw.copy[key] != null) base.copy[key] = String(raw.copy[key]).slice(0, 2000);
    });
  }

  return base;
}

/** Chips for non-dev admins: label → token, grouped for CMS UI */
export function listPriceVariableChips(pricing) {
  const data = normalizeServiceOrderPricing(pricing);
  const chips = [
    { token: '{{trap}}', label: 'Трэп-бит', group: 'base', groupLabel: 'Базовые' },
    { token: '{{from}}', label: 'Минимум (от …)', group: 'base', groupLabel: 'Базовые' },
  ];
  data.deadlines.forEach((row) => {
    chips.push({
      token: `{{p50_${row.days}}}`,
      label: row.label,
      group: 'p50',
      groupLabel: 'Предоплата 50%',
    });
    chips.push({
      token: `{{p100_${row.days}}}`,
      label: row.label,
      group: 'p100',
      groupLabel: 'Оплата 100%',
    });
  });
  return chips;
}

/** Group chips preserving order of first appearance. */
export function groupPriceVariableChips(chips) {
  const list = Array.isArray(chips) ? chips : [];
  const order = [];
  const map = new Map();
  for (const chip of list) {
    const key = chip.group || 'other';
    if (!map.has(key)) {
      map.set(key, { group: key, groupLabel: chip.groupLabel || key, chips: [] });
      order.push(key);
    }
    map.get(key).chips.push(chip);
  }
  return order.map((key) => map.get(key));
}

export function buildPriceVars(pricing) {
  const data = normalizeServiceOrderPricing(pricing);
  const vars = { trap: formatServiceRub(data.trap_price) };
  const amounts = [data.trap_price];
  data.deadlines.forEach((row) => {
    vars[`p50_${row.days}`] = formatServiceRub(row.price_50);
    vars[`p100_${row.days}`] = formatServiceRub(row.price_100);
    amounts.push(row.price_50, row.price_100);
  });
  vars.from = formatServiceRub(Math.min(...amounts));
  return vars;
}

export function substitutePriceVars(text, pricing) {
  if (!text) return '';
  const vars = buildPriceVars(pricing);
  return String(text).replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (full, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : full
  );
}

export function getServicePrice(pricing, deadlineDays, prepaymentPercent) {
  const data = normalizeServiceOrderPricing(pricing);
  const days = parseInt(deadlineDays, 10);
  if (!Number.isFinite(days)) return null;
  const pct = Number(prepaymentPercent) >= 100 ? 100 : 50;
  const key = pct === 100 ? 'price_100' : 'price_50';

  const exact = data.deadlines.find((r) => r.days === days);
  if (exact) return exact[key];

  const rows = [...data.deadlines].sort((a, b) => a.days - b.days);
  if (!rows.length) return null;
  if (days >= 14) {
    const hit = rows.find((r) => r.days >= 14) || rows[rows.length - 1];
    return hit[key];
  }
  if (days === 1) {
    const hit = rows.find((r) => r.days === 1) || rows[0];
    return hit[key];
  }
  return rows.reduce((best, row) =>
    Math.abs(row.days - days) < Math.abs(best.days - days) ? row : best
  )[key];
}

export function resolvedServiceCopy(pricing) {
  const data = normalizeServiceOrderPricing(pricing);
  const out = {};
  Object.entries(data.copy).forEach(([k, v]) => {
    out[k] = substitutePriceVars(v, data);
  });
  return out;
}
