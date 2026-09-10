import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, ShoppingCart, User, Music, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { api } from '../utils/api';
import { loginPath } from '../utils/authRedirect';
import { guestCartCount } from '../utils/guestCart';
import { resolveCartBadge } from '../utils/cartBadge';

const NavItem = ({ to, label, active }) => (
  <Link
    to={to}
    className={`relative px-3 py-2 text-sm font-medium transition-colors ${
      active ? 'text-white' : 'text-white/55 hover:text-white'
    }`}
  >
    {label}
    {active && (
      <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-[#22c55e]" />
    )}
  </Link>
);

const HeaderV2 = ({ admin = false }) => {
  const { user, adminUser, isAuthenticated, isAdminAuthenticated, loading: authLoading } = useAuth();
  const { canSeeCourses } = useSiteSettings();
  const location = useLocation();
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const headerRef = useRef(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    };
    syncHeaderHeight();
    const observer = new ResizeObserver(syncHeaderHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [admin]);

  useEffect(() => {
    const load = async () => {
      if (authLoading) {
        return;
      }
      if (!isAuthenticated) {
        setFavoritesCount(0);
        setCartCount(resolveCartBadge({
          authLoading: false,
          isAuthenticated: false,
          guestCount: guestCartCount(),
        }));
        return;
      }
      try {
        const [fb, fc] = await Promise.all([
          api.get('/favorites').catch(() => ({ data: [] })),
          api.get('/course-favorites').catch(() => ({ data: [] })),
        ]);
        const favBeats = Array.isArray(fb.data) ? fb.data.length : 0;
        const favCourses = Array.isArray(fc.data) ? fc.data.length : 0;
        setFavoritesCount(favBeats + favCourses);
      } catch {
        setFavoritesCount(0);
      }
      try {
        const [cb, cc] = await Promise.all([
          api.get('/cart'),
          api.get('/course-cart'),
        ]);
        setCartCount(resolveCartBadge({
          authLoading: false,
          isAuthenticated: true,
          guestCount: guestCartCount(),
          serverBeats: cb.data,
          serverCourses: cc.data,
        }));
      } catch {
        setCartCount(resolveCartBadge({
          authLoading: false,
          isAuthenticated: true,
          guestCount: guestCartCount(),
          serverError: true,
        }));
      }
    };
    load();
    const onFav = () => load();
    const onCart = () => load();
    window.addEventListener('favoritesUpdated', onFav);
    window.addEventListener('cartUpdated', onCart);
    return () => {
      window.removeEventListener('favoritesUpdated', onFav);
      window.removeEventListener('cartUpdated', onCart);
    };
  }, [authLoading, isAuthenticated, location.pathname]);

  if (admin) {
    return (
      <header ref={headerRef} className="px-6 py-4 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="font-[Syne] text-lg font-bold tracking-tight">XWinner Admin</div>
          <span className="text-sm text-white/50">{adminUser?.username}</span>
        </div>
      </header>
    );
  }

  const iconBtn = 'relative inline-flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors';

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-white/10 bg-[#050505]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between gap-4 min-h-[44px]">
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/" className="font-[Syne] text-base sm:text-xl font-extrabold tracking-tight truncate">
              XWinner<span className="text-[#22c55e]">.</span>beats
            </Link>
            <nav className="hidden lg:flex items-center">
              <NavItem to="/" label="Биты" active={location.pathname === '/'} />
              {canSeeCourses && (
                <NavItem to="/courses" label="Обучение" active={location.pathname.startsWith('/course')} />
              )}
              <NavItem to="/order" label="Услуги" active={location.pathname === '/order'} />
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <Link to="/cart" className={iconBtn} aria-label="Корзина">
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-[#22c55e] text-[#0f172a] text-[10px] font-bold">
                  {cartCount}
                </span>
              )}
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/favorites" className={iconBtn} aria-label="Избранное">
                  <Heart className="h-4 w-4" fill={favoritesCount ? 'currentColor' : 'none'} />
                  {favoritesCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-[#22c55e] text-[#0f172a] text-[10px] font-bold">
                      {favoritesCount}
                    </span>
                  )}
                </Link>
                <Link to="/purchases" className={iconBtn} aria-label="Покупки">
                  <Music className="h-4 w-4" />
                </Link>
                <Link to="/profile" className={iconBtn} aria-label="Профиль">
                  <User className="h-4 w-4" />
                </Link>
                {(user?.is_admin || isAdminAuthenticated) && (
                  <Link to="/admin" className={iconBtn} aria-label="Админка">
                    <Settings className="h-4 w-4" />
                  </Link>
                )}
              </>
            ) : (
              <Link
                to={loginPath(`${location.pathname}${location.search}`)}
                className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-[#22c55e] transition-colors"
              >
                Войти
              </Link>
            )}
          </div>
        </div>

        <nav className="lg:hidden mt-2 pt-2 border-t border-white/10 flex justify-around">
          <NavItem to="/" label="Биты" active={location.pathname === '/'} />
          {canSeeCourses && (
            <NavItem to="/courses" label="Обучение" active={location.pathname.startsWith('/course')} />
          )}
          <NavItem to="/order" label="Услуги" active={location.pathname === '/order'} />
        </nav>
      </div>
    </header>
  );
};

export default HeaderV2;
