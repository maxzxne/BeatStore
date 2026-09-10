/**
 * Safe post-auth redirects (?next= / state.from).
 * Only same-origin relative paths are allowed.
 */

export function sanitizeNextPath(raw, fallback = '/') {
  if (!raw || typeof raw !== 'string') return fallback;
  let path = raw.trim();
  try {
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
      const url = new URL(path, window.location.origin);
      if (url.origin !== window.location.origin) return fallback;
      path = `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return fallback;
  }
  if (!path.startsWith('/') || path.startsWith('//')) return fallback;
  if (path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/admin')) {
    return fallback;
  }
  return path;
}

export function readNextParam(search, fallback = '/') {
  const params = new URLSearchParams(typeof search === 'string' ? search : search?.toString?.() || '');
  return sanitizeNextPath(params.get('next'), fallback);
}

export function loginPath(next) {
  const safe = sanitizeNextPath(next, '');
  if (!safe || safe === '/') return '/login';
  return `/login?next=${encodeURIComponent(safe)}`;
}

export function registerPath(next) {
  const safe = sanitizeNextPath(next, '');
  if (!safe || safe === '/') return '/register';
  return `/register?next=${encodeURIComponent(safe)}`;
}

export function withNext(path, next) {
  const safe = sanitizeNextPath(next, '');
  if (!safe || safe === '/') return path;
  const join = path.includes('?') ? '&' : '?';
  return `${path}${join}next=${encodeURIComponent(safe)}`;
}
