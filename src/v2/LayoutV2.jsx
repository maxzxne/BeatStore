import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import HeaderV2 from './HeaderV2';
import SidebarV2 from './SidebarV2';
import WelcomePopupV2 from './WelcomePopupV2';
import MiniPlayerV2 from './MiniPlayerV2';
import { MessageCircle } from 'lucide-react';
import { stickyPlayerOffsetClass } from '../utils/stickyPlayerOffset';
import { api } from '../utils/api';
import './admin/admin.css';

const LayoutV2 = ({ admin = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdminAuthenticated } = useAuth();
  const { currentTrack, currentTrackTitle } = useAudioPlayer();
  const playerOpen = Boolean(currentTrack && currentTrackTitle);
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [footerLinks, setFooterLinks] = useState(null);

  useEffect(() => {
    if (isAdminRoute) return undefined;
    let cancelled = false;
    api
      .get('/footer-pages')
      .then((res) => {
        if (!cancelled) setFooterLinks(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setFooterLinks([
            { slug: 'support', label: 'Поддержка', path: '/support', show_icon: true, kind: 'support' },
            { slug: 'terms', label: 'Соглашение', path: '/terms', show_icon: false },
            { slug: 'privacy', label: 'Приватность', path: '/privacy', show_icon: false },
            { slug: 'consent-personal-data', label: 'ПДн', path: '/consent-personal-data', show_icon: false },
            { slug: 'cookies', label: 'Cookie', path: '/cookies', show_icon: false },
          ]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAdminRoute]);

  if (isAdminRoute && location.pathname === '/admin/login') {
    return <Outlet />;
  }

  if (isAdminRoute && !isAdminAuthenticated) {
    navigate('/admin/login');
    return null;
  }

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen w-full flex flex-col text-white">
      {isAdminRoute ? (
        <div className="v2-admin flex h-screen overflow-hidden">
          <SidebarV2 />
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <HeaderV2 admin />
            <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
              <div className="container mx-auto px-4 sm:px-6 py-6">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      ) : (
        <>
          <WelcomePopupV2 />
          <HeaderV2 />
          <main className="w-full flex-1 pb-6">
            <Outlet />
          </main>
          <footer className={`mt-auto border-t border-white/10 px-4 sm:px-6 pt-6 text-xs text-white/40 ${stickyPlayerOffsetClass(playerOpen)}`}>
            <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <span>© {year} XWinner.beats.please</span>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {(footerLinks || []).map((item) => (
                  <Link
                    key={item.slug}
                    to={item.path}
                    className={`hover:text-white transition-colors ${
                      item.show_icon || item.kind === 'support'
                        ? 'inline-flex items-center gap-1.5'
                        : ''
                    }`}
                    aria-label={item.label}
                  >
                    {(item.show_icon || item.kind === 'support') && (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </footer>
        </>
      )}
      <MiniPlayerV2 />
    </div>
  );
};

export default LayoutV2;
