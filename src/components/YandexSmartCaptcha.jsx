import React, { useEffect, useId, useRef } from 'react';

const SCRIPT_ID = 'yandex-smartcaptcha-script';
const SCRIPT_SRC = 'https://smartcaptcha.yandexcloud.net/captcha.js?render=onload&onload=beatstoreSmartCaptchaOnload';

let scriptLoadPromise = null;

function loadSmartCaptchaScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('no window'));
  }
  if (window.smartCaptcha) {
    return Promise.resolve(window.smartCaptcha);
  }
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }
  scriptLoadPromise = new Promise((resolve, reject) => {
    const prev = window.beatstoreSmartCaptchaOnload;
    window.beatstoreSmartCaptchaOnload = () => {
      if (typeof prev === 'function') prev();
      if (window.smartCaptcha) resolve(window.smartCaptcha);
      else reject(new Error('SmartCaptcha failed to load'));
    };
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('SmartCaptcha script error'));
      document.head.appendChild(script);
    }
    // Already loading / cached
    const started = Date.now();
    const poll = setInterval(() => {
      if (window.smartCaptcha) {
        clearInterval(poll);
        resolve(window.smartCaptcha);
      } else if (Date.now() - started > 12000) {
        clearInterval(poll);
        reject(new Error('SmartCaptcha timeout'));
      }
    }, 100);
  });
  return scriptLoadPromise;
}

/**
 * Yandex SmartCaptcha (РФ). Invisible checkbox style, dark-friendly container.
 */
const YandexSmartCaptcha = ({ sitekey, onToken, className = '' }) => {
  const containerId = useId().replace(/:/g, '');
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!sitekey) return undefined;
    let cancelled = false;

    loadSmartCaptchaScript()
      .then((smartCaptcha) => {
        if (cancelled) return;
        const el = document.getElementById(`sc-${containerId}`);
        if (!el) return;
        widgetIdRef.current = smartCaptcha.render(el, {
          sitekey,
          hl: 'ru',
          theme: 'dark',
          callback: (token) => {
            if (onTokenRef.current) onTokenRef.current(token || '');
          },
          'error-callback': () => {
            if (onTokenRef.current) onTokenRef.current('');
          },
          'network-error-callback': () => {
            if (onTokenRef.current) onTokenRef.current('');
          },
        });
      })
      .catch((err) => {
        console.error('SmartCaptcha load error', err);
      });

    return () => {
      cancelled = true;
      try {
        if (window.smartCaptcha && widgetIdRef.current != null) {
          window.smartCaptcha.destroy(widgetIdRef.current);
        }
      } catch (_) {
        /* ignore */
      }
      widgetIdRef.current = null;
    };
  }, [sitekey, containerId]);

  if (!sitekey) return null;

  return (
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-black/40 p-2 ${className}`}>
      <div id={`sc-${containerId}`} className="smart-captcha min-h-[100px]" />
    </div>
  );
};

export default YandexSmartCaptcha;
