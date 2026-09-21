export const DEFAULT_SEARCH_PLACEHOLDER = 'Поиск по названию, артисту, жанру';

export function normalizeSearchPlaceholder(value) {
  const text = String(value || '').trim();
  return text || DEFAULT_SEARCH_PLACEHOLDER;
}
