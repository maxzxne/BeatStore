/** Client helpers for profile contact channels (mirrors backend/contacts.py). */

export const CONTACT_TYPES = [
  { value: 'telegram', label: 'Telegram', placeholder: '@username' },
  { value: 'whatsapp', label: 'WhatsApp', placeholder: '+79991234567' },
  { value: 'phone', label: 'Телефон', placeholder: '+79991234567' },
  { value: 'vk', label: 'VK', placeholder: 'vk.com/id…' },
  { value: 'instagram', label: 'Instagram', placeholder: '@username' },
  { value: 'other', label: 'Другое', placeholder: 'Как связаться' },
];

const LABELS = Object.fromEntries(CONTACT_TYPES.map((t) => [t.value, t.label]));

export function parseContacts(raw) {
  if (raw == null) return [];
  const text = String(raw).trim();
  if (!text) return [];

  if (text.startsWith('[')) {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) return [{ type: 'other', value: text }];
      return data
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const value = String(item.value || '').trim();
          if (!value) return null;
          const type = CONTACT_TYPES.some((t) => t.value === item.type) ? item.type : 'other';
          return { type, value };
        })
        .filter(Boolean);
    } catch {
      return [{ type: 'other', value: text }];
    }
  }

  return [{ type: 'other', value: text }];
}

export function contactsFromUser(user) {
  if (!user) return [];
  if (Array.isArray(user.contacts) && user.contacts.length) {
    return user.contacts.map((c) => ({
      type: CONTACT_TYPES.some((t) => t.value === c.type) ? c.type : 'other',
      value: String(c.value || '').trim(),
    })).filter((c) => c.value);
  }
  return parseContacts(user.additional_contact);
}

export function formatContacts(contacts) {
  if (!Array.isArray(contacts) || !contacts.length) return '';
  return contacts
    .map((c) => {
      const value = String(c?.value || '').trim();
      if (!value) return null;
      const type = CONTACT_TYPES.some((t) => t.value === c.type) ? c.type : 'other';
      return `${LABELS[type]}: ${value}`;
    })
    .filter(Boolean)
    .join(' · ');
}

export function emptyContactRow() {
  return { type: 'telegram', value: '', key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
}
