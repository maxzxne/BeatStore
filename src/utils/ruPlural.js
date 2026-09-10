/**
 * Russian number agreement: 1 товар, 2 товара, 5 товаров.
 * one / few / many cover 1, 21… / 2–4, 22… / 0, 5–20, 11–14…
 */
export function ruPlural(count, one, few, many) {
  const n = Math.abs(Math.trunc(Number(count) || 0));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function ruCount(count, one, few, many) {
  const n = Math.trunc(Number(count) || 0);
  return `${n} ${ruPlural(n, one, few, many)}`;
}
