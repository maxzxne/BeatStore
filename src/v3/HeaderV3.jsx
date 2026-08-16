import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, ShoppingCart, User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { api } from '../utils/api';

const NavItem = ({ to, label, active }) => (
  <Link to={to} className={`v3-nav-link ${active ? 'is-active' : ''}`}>
    {label}
  </Link>
);

export default function HeaderV3() {
  const { user, isAuthenticated, isAdminAuthenticated } = useAuth();
  const { canSeeCourses } = useSiteSettings();
  const location = useLocation();
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoritesCount(0);
      setCartCount(0);
      return undefined;
    }
    const load = async () => {
      try {
        const [fb, fc, cb, cc] = await Promise.all([
          api.get('/favorites'),
          api.get('/course-favorites'),
          api.get('/cart'),
          api.get('/course-cart'),
        ]);
        setFavoritesCount((fb.data?.length || 0) + (fc.data?.length || 0));
        setCartCount((cb.data?.length || 0) + (cc.data?.length || 0));
      } catch {
        /* ignore */
      }
    };
    load();
    window.addEventListener('favoritesUpdated', load);
    window.addEventListener('cartUpdated', load);
    return () => {
      window.removeEventListener('favoritesUpdated', load);
      window.removeEventListener('cartUpdated', load);
    };
  }, [isAuthenticated, location.pathname]);

  return (
    <header className="v3-header">
      <div className="v3-shell">
        <div className="flex h-[52px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link to="/" className="v3-wordmark shrink-0">XW</Link>
            <nav className="hidden items-center sm:flex" aria-label="Основное меню">
              <NavItem to="/" label="Beats" active={location.pathname === '/'} />
              {canSeeCourses && (
                <NavItem to="/courses" label="Learn" active={location.pathname.startsWith('/course')} />
              )}
              <NavItem to="/order" label="Order" active={location.pathname === '/order'} />
            </nav>
          </div>
          <div className="flex items-center">
            {isAuthenticated ? (
              <>
                <Link to="/favorites" className="v3-icon-btn relative" aria-label="Избранное">
                  <Heart size={16} fill={favoritesCount ? 'currentColor' : 'none'} />
                  {favoritesCount > 0 && <span className="v3-badge absolute right-0.5 top-0.5">{favoritesCount}</span>}
                </Link>
                <Link to="/cart" className="v3-icon-btn relative" aria-label="Корзина">
                  <ShoppingCart size={16} />
                  {cartCount > 0 && <span className="v3-badge absolute right-0.5 top-0.5">{cartCount}</span>}
                </Link>
                <Link to="/profile" className="v3-icon-btn" aria-label="Профиль">
                  <User size={16} />
                </Link>
                {(user?.is_admin || isAdminAuthenticated) && (
                  <Link to="/admin" className="v3-icon-btn" aria-label="Админка">
                    <Settings size={16} />
                  </Link>
                )}
              </>
            ) : (
              <Link to="/login" className="v3-btn v3-btn-ghost text-sm">Log in</Link>
            )}
          </div>
        </div>
        <nav className="flex gap-2 border-t border-[var(--border)] sm:hidden" aria-label="Мобильное меню">
          <NavItem to="/" label="Beats" active={location.pathname === '/'} />
          {canSeeCourses && (
            <NavItem to="/courses" label="Learn" active={location.pathname.startsWith('/course')} />
          )}
          <NavItem to="/order" label="Order" active={location.pathname === '/order'} />
        </nav>
      </div>
    </header>
  );
}
