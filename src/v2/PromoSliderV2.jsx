import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api, buildMediaUrl } from '../utils/api';

const AUTO_MS = 5500;

function isInternalHref(href) {
  if (!href) return false;
  return href.startsWith('/') && !href.startsWith('//');
}

const PromoSliderV2 = () => {
  const [banners, setBanners] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get('/promo-banners');
        if (!cancelled && Array.isArray(response.data)) {
          setBanners(response.data.filter((b) => b?.image_url));
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

  const count = banners.length;
  const go = useCallback((dir) => {
    if (count < 2) return;
    setIndex((i) => (i + dir + count) % count);
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return undefined;
    const id = window.setInterval(() => go(1), AUTO_MS);
    return () => window.clearInterval(id);
  }, [count, paused, reduceMotion, go]);

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [count, index]);

  if (count === 0) return null;

  const current = banners[index] || banners[0];
  const src = buildMediaUrl(current.image_url);
  const href = current.link_url || null;
  const title = current.title || '';

  const media = (
    <img
      src={src}
      alt={title || 'Промо'}
      className="v2-promo-img"
      draggable={false}
    />
  );

  const slideContent = href
    ? (isInternalHref(href)
      ? <Link to={href} className="v2-promo-link">{media}{title ? <span className="v2-promo-caption">{title}</span> : null}</Link>
      : (
        <a href={href} className="v2-promo-link" target="_blank" rel="noopener noreferrer">
          {media}
          {title ? <span className="v2-promo-caption">{title}</span> : null}
        </a>
      ))
    : (
      <div className="v2-promo-link">
        {media}
        {title ? <span className="v2-promo-caption">{title}</span> : null}
      </div>
    );

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
      <div className="v2-promo-frame" aria-live="polite">
        {slideContent}
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
                aria-selected={i === index}
                aria-label={`Слайд ${i + 1}`}
                className={`v2-promo-dot${i === index ? ' is-active' : ''}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PromoSliderV2;
