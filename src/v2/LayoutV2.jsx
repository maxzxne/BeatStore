import React from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import HeaderV2 from './HeaderV2';
import SidebarV2 from './SidebarV2';
import WelcomePopupV2 from './WelcomePopupV2';
import MiniPlayerV2 from './MiniPlayerV2';
import { MessageCircle } from 'lucide-react';
import './admin/admin.css';

const LayoutV2 = ({ admin = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdminAuthenticated } = useAuth();
  const { currentTrack, currentTrackTitle } = useAudioPlayer();
  const playerOpen = Boolean(currentTrack && currentTrackTitle);
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute && location.pathname === '/admin/login') {
    return <Outlet />;
  }

  if (isAdminRoute && !isAdminAuthenticated) {
    navigate('/admin/login');
    return null;
  }

  return (
    <div className="min-h-screen w-full flex flex-col text-white">
      {isAdminRoute ? (
        <div className="v2-admin flex h-screen overflow-hidden">
          <SidebarV2 />
          <div className="flex-1 flex flex-col overflow-hidden">
            <HeaderV2 admin />
            <main className="flex-1 overflow-x-hidden overflow-y-auto">
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
          <main className={`w-full flex-1 ${playerOpen ? 'pb-32' : 'pb-6'}`}>
            <Outlet />
          </main>
          <footer className="mt-auto border-t border-white/10 px-4 sm:px-6 py-6 text-xs text-white/40">
            <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <span>© {new Date().getFullYear()} XWinner.beats.please</span>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/support"
                  className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                  aria-label="Поддержка"
                >
                  <MessageCircle className="h-4 w-4" />
                  Поддержка
                </Link>
                <Link to="/terms" className="hover:text-white transition-colors">Соглашение</Link>
                <Link to="/privacy" className="hover:text-white transition-colors">Приватность</Link>
                <Link to="/consent-personal-data" className="hover:text-white transition-colors">ПДн</Link>
                <Link to="/cookies" className="hover:text-white transition-colors">Cookie</Link>
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
