import React from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import WelcomePopup from './WelcomePopup';
import MiniPlayer from './MiniPlayer';

const Layout = ({ admin = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdminAuthenticated } = useAuth();
  
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  if (isAdminRoute && location.pathname === '/admin/login') {
    return <Outlet />;
  }

  // Если админ не авторизован, перенаправляем на логин
  if (isAdminRoute && !isAdminAuthenticated) {
    navigate('/admin/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black w-full transition-colors">
      {isAdminRoute ? (
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header admin />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white dark:bg-black transition-colors">
              <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      ) : (
        <>
          <WelcomePopup />
          <Header />
          <main className="w-full min-h-[calc(100vh-64px)] pb-20 sm:pb-24">
            <Outlet />
          </main>
          <footer className="border-t border-gray-300 dark:border-neutral-800 px-4 sm:px-6 py-4 text-xs text-gray-500 dark:text-neutral-500">
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-center sm:text-left">
                © {new Date().getFullYear()} BeatStore. Все права защищены.
              </span>
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4">
                <Link
                  to="/terms"
                  className="hover:text-black dark:hover:text-white transition-colors"
                >
                  Пользовательское соглашение
                </Link>
                <Link
                  to="/privacy"
                  className="hover:text-black dark:hover:text-white transition-colors"
                >
                  Политика конфиденциальности
                </Link>
                <Link
                  to="/consent-personal-data"
                  className="hover:text-black dark:hover:text-white transition-colors"
                >
                  Согласие на обработку ПДн
                </Link>
                <Link
                  to="/cookies"
                  className="hover:text-black dark:hover:text-white transition-colors"
                >
                  Политика cookie
                </Link>
              </div>
            </div>
          </footer>
        </>
      )}
      {/* Мини-плеер отображается на всех страницах, когда трек играет */}
      <MiniPlayer />
    </div>
  );
};

export default Layout;
