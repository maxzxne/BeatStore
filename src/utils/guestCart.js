/**
 * Guest cart in localStorage. Merged into server cart after login.
 * Shape: { beats: [{ id, format }], courses: [{ id }] }
 */

import { api } from './api';

const KEY = 'beatstore_guest_cart_v1';

const empty = () => ({ beats: [], courses: [] });

export function readGuestCart() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw);
    return {
      beats: Array.isArray(data.beats) ? data.beats.filter((b) => b?.id) : [],
      courses: Array.isArray(data.courses) ? data.courses.filter((c) => c?.id) : [],
    };
  } catch {
    return empty();
  }
}

function writeGuestCart(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cartUpdated'));
}

export function guestCartCount() {
  const c = readGuestCart();
  return c.beats.length + c.courses.length;
}

export function isInGuestCart(type, id) {
  const c = readGuestCart();
  if (type === 'beat') return c.beats.some((b) => Number(b.id) === Number(id));
  return c.courses.some((x) => Number(x.id) === Number(id));
}

export function addGuestBeat(id, format = 'mp3') {
  const c = readGuestCart();
  const idx = c.beats.findIndex((b) => Number(b.id) === Number(id));
  if (idx >= 0) c.beats[idx] = { id: Number(id), format };
  else c.beats.push({ id: Number(id), format });
  writeGuestCart(c);
  return c;
}

export function removeGuestBeat(id) {
  const c = readGuestCart();
  c.beats = c.beats.filter((b) => Number(b.id) !== Number(id));
  writeGuestCart(c);
  return c;
}

export function addGuestCourse(id) {
  const c = readGuestCart();
  if (!c.courses.some((x) => Number(x.id) === Number(id))) {
    c.courses.push({ id: Number(id) });
  }
  writeGuestCart(c);
  return c;
}

export function removeGuestCourse(id) {
  const c = readGuestCart();
  c.courses = c.courses.filter((x) => Number(x.id) !== Number(id));
  writeGuestCart(c);
  return c;
}

export function clearGuestCart() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('cartUpdated'));
}

/** Push guest lines to authenticated cart APIs, then clear. */
export async function mergeGuestCartToServer() {
  const c = readGuestCart();
  if (!c.beats.length && !c.courses.length) return { merged: 0 };

  let merged = 0;
  await Promise.allSettled([
    ...c.beats.map(async (b) => {
      await api.post(`/beats/${b.id}/cart`);
      merged += 1;
    }),
    ...c.courses.map(async (x) => {
      await api.post(`/courses/${x.id}/cart`);
      merged += 1;
    }),
  ]);

  // Persist preferred formats for checkout
  if (c.beats.length) {
    try {
      const formats = {};
      c.beats.forEach((b) => {
        formats[b.id] = b.format || 'mp3';
      });
      const prev = JSON.parse(localStorage.getItem('beatstore_cart_formats') || '{}');
      localStorage.setItem('beatstore_cart_formats', JSON.stringify({ ...prev, ...formats }));
    } catch {
      /* ignore */
    }
  }

  clearGuestCart();
  window.dispatchEvent(new Event('cartUpdated'));
  return { merged };
}
