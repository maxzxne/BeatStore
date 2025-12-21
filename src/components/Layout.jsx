import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen bg-white w-full">
      {isAdminRoute ? (
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header admin />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white">
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
          <main className="w-full min-h-[calc(100vh-64px)]">
            <Outlet />
          </main>
        </>
      )}
      {/* Мини-плеер отображается на всех страницах, когда трек играет */}
      <MiniPlayer />
    </div>
  );
};

export default Layout;
