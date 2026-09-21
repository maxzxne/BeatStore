import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api, buildMediaUrl } from '../utils/api';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import {
  isInternalPromoHref,
  promoDragExceededThreshold,
  shouldBlockPromoNav,
} from '../utils/promoNav';
import {
  PROMO_PEEK_GAP_PX,
  promoSlideStepPx,
  promoSlideWidthPx,
  promoTrackOffsetPx,
} from '../utils/promoLayout';

const AUTO_MS = 5500;
const DRAG_COMMIT_RATIO = 0.18;

function SlideMedia({ banner, blockNav, dragMoved }) {
  const src = buildMediaUrl(banner.image_url);
  const href = banner.link_url || null;
  const title = banner.title || '';
  const linked = Boolean(href);

  const media = (
    <img
      src={src}
      alt={title || 'Промо'}
      className="v2-promo-img"
      draggable={false}
    />
  );

  const caption = title ? <span className="v2-promo-caption">{title}</span> : null;

  const onNavClick = (event) => {
    if (shouldBlockPromoNav({ dragMoved: dragMoved?.current, blockNav: blockNav?.current })) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  if (!linked) {
    return (
      <div className="v2-promo-link">
        {media}
        {caption}
      </div>
    );
  }

  if (isInternalPromoHref(href)) {
    return (
      <Link
        to={href}
        className="v2-promo-link is-linked"
        onClick={onNavClick}
        aria-label={title ? `Открыть: ${title}` : 'Открыть промо'}
      >
        {media}
        {caption}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className="v2-promo-link is-linked"
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavClick}
      aria-label={title ? `Открыть: ${title}` : 'Открыть промо'}
    >
      {media}
      {caption}
    </a>
  );
}

const PromoSliderV2 = () => {
  const { promoBannersFullscreen } = useSiteSettings();
  const fullscreen = promoBannersFullscreen !== false;
  const [banners, setBanners] = useState([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  const viewportRef = useRef(null);
  const jumpingRef = useRef(false);
  const animatingRef = useRef(false);
  const trackIndexRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const pointerIdRef = useRef(null);
  const dragStartXRef = useRef(0);
  const dragMovedRef = useRef(false);
  const blockNavRef = useRef(false);
  const capturingRef = useRef(false);
  const fullscreenRef = useRef(fullscreen);

  useEffect(() => {
    fullscreenRef.current = fullscreen;
  }, [fullscreen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get('/promo-banners');
        if (!cancelled && Array.isArray(response.data)) {
          const next = response.data.filter((b) => b?.image_url);
          setBanners(next);
          const start = next.length > 1 ? 1 : 0;
          setAnimate(false);
          setTrackIndex(start);
          trackIndexRef.current = start;
        }
      } catch (error) {
        console.error('Error fetching promo banners:', error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    trackIndexRef.current = trackIndex;
  }, [trackIndex]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      setViewportWidth(node?.clientWidth || 0);
      return undefined;
    }
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const w = entry?.contentRect?.width ?? node.clientWidth;
      setViewportWidth(Math.round(w));
    });
    ro.observe(node);
    setViewportWidth(node.clientWidth);
    return () => ro.disconnect();
  }, [banners.length]);

  const count = banners.length;
  const loop = count > 1;
  const trackSlides = loop
    ? [banners[count - 1], ...banners, banners[0]]
    : banners;

  const realIndex = (() => {
    if (!loop) return 0;
    if (trackIndex === 0) return count - 1;
    if (trackIndex === count + 1) return 0;
    return trackIndex - 1;
  })();

  const jumpTo = useCallback((next, withAnim) => {
    if (jumpingRef.current) return;
    setAnimate(Boolean(withAnim));
    setTrackIndex(next);
    trackIndexRef.current = next;
  }, []);

  const go = useCallback((dir) => {
    if (count < 2 || jumpingRef.current || animatingRef.current || dragging) return;
    if (reduceMotion) {
      const nextReal = (realIndex + dir + count) % count;
      jumpTo(nextReal + 1, false);
      return;
    }
    animatingRef.current = true;
    jumpTo(trackIndexRef.current + dir, true);
  }, [count, reduceMotion, realIndex, jumpTo, dragging]);

  const goToReal = useCallback((i) => {
    if (count < 2 || jumpingRef.current || animatingRef.current || dragging) return;
    if (i === realIndex) return;
    if (!reduceMotion) animatingRef.current = true;
    jumpTo(i + 1, !reduceMotion);
  }, [count, reduceMotion, jumpTo, realIndex, dragging]);

  const handleTransitionEnd = useCallback((event) => {
    if (event.target !== event.currentTarget) return;
    if (!loop || reduceMotion) {
      animatingRef.current = false;
      return;
    }
    const ti = trackIndexRef.current;
    if (ti === count + 1) {
      jumpingRef.current = true;
      setAnimate(false);
      setTrackIndex(1);
      trackIndexRef.current = 1;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          jumpingRef.current = false;
          animatingRef.current = false;
        });
      });
    } else if (ti === 0) {
      jumpingRef.current = true;
      setAnimate(false);
      setTrackIndex(count);
      trackIndexRef.current = count;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          jumpingRef.current = false;
          animatingRef.current = false;
        });
      });
    } else {
      animatingRef.current = false;
    }
  }, [loop, reduceMotion, count]);

  const endDrag = useCallback((clientX) => {
    if (pointerIdRef.current == null) return;
    pointerIdRef.current = null;
    capturingRef.current = false;
    setDragging(false);

    const width = viewportRef.current?.clientWidth || 1;
    const step = promoSlideStepPx(width, fullscreenRef.current) || width;
    const offset = dragOffsetRef.current;
    const abs = Math.abs(offset);
    const commit = dragMovedRef.current && abs > step * DRAG_COMMIT_RATIO;

    dragOffsetRef.current = 0;
    setDragOffset(0);

    const root = viewportRef.current?.closest('.v2-promo');
    if (root?.matches(':hover') || root?.contains(document.activeElement)) {
      setPaused(true);
    } else {
      setPaused(false);
    }

    if (!commit || count < 2) {
      if (abs > 0 && dragMovedRef.current && !reduceMotion) {
        setAnimate(true);
        animatingRef.current = true;
      }
      window.setTimeout(() => {
        blockNavRef.current = false;
        dragMovedRef.current = false;
      }, 0);
      return;
    }

    const dir = offset < 0 ? 1 : -1;
    blockNavRef.current = true;
    if (reduceMotion) {
      const nextReal = (realIndex + dir + count) % count;
      jumpTo(nextReal + 1, false);
    } else {
      animatingRef.current = true;
      jumpTo(trackIndexRef.current + dir, true);
    }
    window.setTimeout(() => {
      blockNavRef.current = false;
      dragMovedRef.current = false;
    }, 300);
  }, [count, reduceMotion, realIndex, jumpTo]);

  const onPointerDown = (event) => {
    if (count < 2 || jumpingRef.current || animatingRef.current) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.target.closest?.('.v2-promo-nav, .v2-promo-dot')) return;

    pointerIdRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    dragMovedRef.current = false;
    blockNavRef.current = false;
    capturingRef.current = false;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setAnimate(false);
  };

  const onPointerMove = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    const delta = event.clientX - dragStartXRef.current;
    if (!promoDragExceededThreshold(delta)) return;

    if (!capturingRef.current) {
      capturingRef.current = true;
      dragMovedRef.current = true;
      blockNavRef.current = true;
      setDragging(true);
      setPaused(true);
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        /* ignore */
      }
    }

    dragOffsetRef.current = delta;
    setDragOffset(delta);
  };

  const onPointerUp = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    try {
      if (capturingRef.current) {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      }
    } catch {
      /* ignore */
    }
    endDrag(event.clientX);
  };

  const onPointerCancel = (event) => {
    if (pointerIdRef.current !== event.pointerId) return;
    pointerIdRef.current = null;
    capturingRef.current = false;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setDragging(false);
    setAnimate(true);
    blockNavRef.current = false;
    dragMovedRef.current = false;
  };

  useEffect(() => {
    if (count < 2 || paused || dragging) return undefined;
    const id = window.setInterval(() => go(1), AUTO_MS);
    return () => window.clearInterval(id);
  }, [count, paused, dragging, go]);

  if (count === 0) return null;

  const shouldAnimate = animate && !reduceMotion && !dragging;
  const vw = viewportWidth || viewportRef.current?.clientWidth || 0;
  const slideW = promoSlideWidthPx(vw, fullscreen) || undefined;
  const transform = `translate3d(${promoTrackOffsetPx(trackIndex, vw, fullscreen, dragOffset)}px, 0, 0)`;
  const activeHasLink = Boolean(banners[realIndex]?.link_url);

  return (
    <div
      className={`v2-promo${fullscreen ? ' is-fullscreen' : ' is-peek'}${dragging ? ' is-dragging' : ''}${activeHasLink ? ' has-link' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        if (!dragging) setPaused(false);
      }}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Промо"
    >
      <div
        ref={viewportRef}
        className="v2-promo-viewport"
        aria-live="polite"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          className={`v2-promo-track${shouldAnimate ? '' : ' is-instant'}`}
          style={{ transform }}
          onTransitionEnd={handleTransitionEnd}
        >
          {trackSlides.map((banner, i) => (
            <div
              className="v2-promo-slide"
              key={`${banner.id ?? 'b'}-${i}`}
              aria-hidden={loop ? i !== trackIndex : i !== 0}
              style={
                slideW
                  ? {
                      flex: `0 0 ${slideW}px`,
                      width: `${slideW}px`,
                      minWidth: `${slideW}px`,
                      marginRight: fullscreen ? 0 : PROMO_PEEK_GAP_PX,
                    }
                  : undefined
              }
            >
              <SlideMedia banner={banner} blockNav={blockNavRef} dragMoved={dragMovedRef} />
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className="v2-promo-nav v2-promo-prev"
            onClick={() => go(-1)}
            aria-label="Предыдущий баннер"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="v2-promo-nav v2-promo-next"
            onClick={() => go(1)}
            aria-label="Следующий баннер"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="v2-promo-dots" role="tablist" aria-label="Слайды">
            {banners.map((b, i) => (
              <button
                key={b.id ?? i}
                type="button"
                role="tab"
                aria-selected={i === realIndex}
                aria-label={`Слайд ${i + 1}`}
                className={`v2-promo-dot${i === realIndex ? ' is-active' : ''}`}
                onClick={() => goToReal(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PromoSliderV2;
