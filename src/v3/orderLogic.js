export const SERVICE_CATEGORIES = [
  { value: 'бит', label: 'Бит', description: null },
  { value: 'бит в стиле трэп', label: 'Бит (Type)', description: 'Простая трэпчага в стиле Travis Scott, Yeat, Lil Baby, Pop Smoke и др.' },
  { value: 'сведение', label: 'Сведение', description: null },
  { value: 'саунддизайн', label: 'Саунд-дизайн', description: null },
  { value: 'топлайны', label: 'Топ-лайны', description: null },
  { value: 'трек под ключ', label: 'Трек под ключ', description: 'Полное написание песни с мелодиями и текстом (можно без текста). Права переходят к заказчику, никаких указаний авторства!' },
  { value: 'запись индивидуального курса с объяснениями по проделанной работе', label: 'Запись индивидуального курса с объяснениями по проделанной работе', description: null },
];

export const emptyOrderForm = (user) => ({
  customer_name: user?.username || '',
  customer_email: user?.email || '',
  contact_info: user?.additional_contact || '',
  service_categories: [],
  materials: [],
  reference_links: '',
  reference_files: [],
  description: '',
  deadline_days: '',
  prepayment_percent: 50,
});

export function getPrice(deadlineDays, prepaymentPercent) {
  if (!deadlineDays) return null;
  const days = parseInt(deadlineDays, 10);
  const prices = {
    50: { '14-21': 25000, '7-14': 30000, 7: 35000, '2-3': 40000, 1: 50000 },
    100: { '14-21': 20000, '7-14': 25000, 7: 30000, '2-3': 35000, 1: 45000 },
  };
  const priceMap = prices[prepaymentPercent];
  if (days >= 14 && days <= 21) return priceMap['14-21'];
  if (days >= 7 && days < 14) return priceMap['7-14'];
  if (days === 7) return priceMap[7];
  if (days >= 2 && days <= 3) return priceMap['2-3'];
  if (days === 1) return priceMap[1];
  return priceMap['14-21'];
}

export function calculateTotalPrice(formData) {
  if (!formData.service_categories.length) return 0;
  let total = 0;
  formData.service_categories.forEach((category) => {
    if (category === 'бит в стиле трэп') {
      total += 15000;
      return;
    }
    if (!formData.deadline_days) return;
    const pricePerService = getPrice(formData.deadline_days, formData.prepayment_percent);
    if (pricePerService) total += pricePerService;
  });
  return total;
}

export function getServiceCounts(categories) {
  const counts = {};
  categories.forEach((category) => {
    counts[category] = (counts[category] || 0) + 1;
  });
  return counts;
}

export function categoryLabel(value) {
  return SERVICE_CATEGORIES.find((item) => item.value === value)?.label || value;
}

export function categoryDescription(value) {
  return SERVICE_CATEGORIES.find((item) => item.value === value)?.description || null;
}
