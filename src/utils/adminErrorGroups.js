/**
 * Group admin error log rows by message (newest group first).
 * @param {Array<{ id: number, error_message?: string, created_at?: string, error_type?: string }>} errors
 */
export function groupErrorsByMessage(errors) {
  const list = Array.isArray(errors) ? errors : [];
  const map = new Map();

  for (const row of list) {
    const message = row.error_message || '(без сообщения)';
    const existing = map.get(message);
    if (!existing) {
      map.set(message, {
        key: message,
        message,
        count: 1,
        latest: row,
        items: [row],
        error_type: row.error_type,
      });
      continue;
    }
    existing.count += 1;
    existing.items.push(row);
    if (String(row.created_at || '') > String(existing.latest.created_at || '')) {
      existing.latest = row;
      existing.error_type = row.error_type;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return String(b.latest.created_at || '').localeCompare(String(a.latest.created_at || ''));
  });
}
