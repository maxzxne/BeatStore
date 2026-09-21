/**
 * Promo carousel pointer helpers — decide when a gesture is a click vs drag.
 */

export const PROMO_DRAG_CLICK_PX = 8;

export function shouldBlockPromoNav({ dragMoved, blockNav }) {
  return Boolean(dragMoved || blockNav);
}

export function promoDragExceededThreshold(deltaX, threshold = PROMO_DRAG_CLICK_PX) {
  return Math.abs(Number(deltaX) || 0) > threshold;
}

export function isInternalPromoHref(href) {
  if (!href) return false;
  return href.startsWith('/') && !href.startsWith('//');
}

export function promoHasLink(banner) {
  return Boolean(banner?.link_url);
}
