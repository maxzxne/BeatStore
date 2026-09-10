import { api } from './api';

export function checkoutErrorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg || JSON.stringify(item)).join(', ');
  return err?.message || 'Не удалось начать оплату';
}

export async function startCheckout(payload) {
  const { data } = await api.post('/payments/create', payload);
  if (!data?.checkout_url) {
    throw new Error('Платёжный шлюз не вернул ссылку');
  }
  window.location.assign(data.checkout_url);
  return data;
}

export async function retryCheckout(invId) {
  const { data } = await api.post(`/payments/intents/${invId}/retry`);
  if (!data?.checkout_url) {
    throw new Error('Не удалось создать повторный платёж');
  }
  window.location.assign(data.checkout_url);
  return data;
}

export function formatRub(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return `${value.toLocaleString('ru-RU')} ₽`;
}
