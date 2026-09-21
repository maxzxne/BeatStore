import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api, buildMediaUrl } from '../utils/api';

const AUTO_MS = 5500;

function isInternalHref(href) {
  if (!href) return false;
  return href.startsWith('/') && !href.startsWith('//');
}

function SlideMedia({ banner }) {
  const src = buildMediaUrl(banner.image_url);
  const href = banner.link_url || null;
  const title = banner.title || '';

  const media = (
    <img
      src={src}
      alt={title || 'Промо'}
      className="v2-promo-img"
      draggable={false}
    />
  );

  const caption = title ? <span className="v2-promo-caption">{title}</span> : null;

  if (!href) {
    return (
      <div className="v2-promo-link">
        {media}
        {caption}
      </div>
    );
  }

  if (isInternalHref(href)) {
    return (
      <Link to={href} className="v2-promo-link" tabIndex={-1}>
        {media}
        {caption}
      </Link>
    );
  }

  return (
    <a href={href} className="v2-promo-link" target="_blank" rel="noopener noreferrer" tabIndex={-1}>
      {media}
      {caption}
    </a>
  );
}

const PromoSliderV2 = () => {
  const [banners, setBanners] = useState([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef(null);
  const jumpingRef = useRef(false);
  const animatingRef = useRef(false);
  const trackIndexRef = useRef(0);

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
    if (count < 2 || jumpingRef.current || animatingRef.current) return;
    if (reduceMotion) {
      const nextReal = (realIndex + dir + count) % count;
      jumpTo(nextReal + 1, false);
      return;
    }
    animatingRef.current = true;
    jumpTo(trackIndexRef.current + dir, true);
  }, [count, reduceMotion, realIndex, jumpTo]);

  const goToReal = useCallback((i) => {
    if (count < 2 || jumpingRef.current || animatingRef.current) return;
    if (i === realIndex) return;
    if (!reduceMotion) animatingRef.current = true;
    jumpTo(i + 1, !reduceMotion);
  }, [count, reduceMotion, jumpTo, realIndex]);

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

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const id = window.setInterval(() => go(1), AUTO_MS);
    return () => window.clearInterval(id);
  }, [count, paused, go]);

  if (count === 0) return null;

  const shouldAnimate = animate && !reduceMotion;

  return (
    <div
      className="v2-promo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        const end = e.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start == null || end == null) return;
        const delta = end - start;
        if (Math.abs(delta) < 40) return;
        go(delta < 0 ? 1 : -1);
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Промо"
    >
      <div className="v2-promo-viewport" aria-live="polite">
        <div
          className={`v2-promo-track${shouldAnimate ? '' : ' is-instant'}`}
          style={{ transform: `translate3d(-${trackIndex * 100}%, 0, 0)` }}
          onTransitionEnd={handleTransitionEnd}
        >
          {trackSlides.map((banner, i) => (
            <div
              className="v2-promo-slide"
              key={`${banner.id ?? 'b'}-${i}`}
              aria-hidden={loop ? i !== trackIndex : i !== 0}
            >
              <SlideMedia banner={banner} />
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
