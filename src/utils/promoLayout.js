/** Compact promo slider: active slide narrower so the next one peeks. */
export const PROMO_PEEK_RATIO = 0.86;
export const PROMO_PEEK_GAP_PX = 12;

export function promoSlideWidthPx(viewportWidth, fullscreen = true) {
  const w = Math.max(0, Number(viewportWidth) || 0);
  if (fullscreen || w <= 0) return w;
  return Math.round(w * PROMO_PEEK_RATIO);
}

export function promoSlideStepPx(viewportWidth, fullscreen = true) {
  const w = Math.max(0, Number(viewportWidth) || 0);
  if (fullscreen || w <= 0) return w;
  return promoSlideWidthPx(w, false) + PROMO_PEEK_GAP_PX;
}

export function promoTrackOffsetPx(trackIndex, viewportWidth, fullscreen = true, dragOffset = 0) {
  const step = promoSlideStepPx(viewportWidth, fullscreen);
  return -(Number(trackIndex) || 0) * step + (Number(dragOffset) || 0);
}
