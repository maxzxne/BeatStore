import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { BarChart3, Music, Upload, ShoppingBag, FileText, GraduationCap, Settings, AlertTriangle, ExternalLink, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SidebarV2 = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const RubleIcon = ({ className }) => (
    <span className={`${className} flex items-center justify-center font-bold`}>₽</span>
  );

  const navItems = [
    { path: '/admin/dashboard', label: 'Панель', icon: BarChart3 },
    { path: '/admin/revenue', label: 'Доходы', icon: RubleIcon },
    { path: '/admin/beats', label: 'Биты', icon: Music },
    { path: '/admin/courses', label: 'Курсы', icon: GraduationCap },
    { path: '/admin/upload', label: 'Загрузка', icon: Upload },
    { path: '/admin/purchases', label: 'Покупки', icon: ShoppingBag },
    { path: '/admin/orders', label: 'Заявки', icon: FileText },
    { path: '/admin/errors', label: 'Ошибки', icon: AlertTriangle },
    { path: '/admin/oauth-settings', label: 'Настройки', icon: Settings },
  ];

  return (
    <aside className="w-64 h-full flex flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="p-6 flex-1">
        <h2 className="font-[Syne] text-lg font-bold mb-6">Админ</h2>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    isActive
                      ? 'bg-[#22c55e] text-[#0f172a] font-semibold'
                      : 'text-white/55 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-white/10">
        <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/55 hover:text-white hover:bg-white/5">
          <ExternalLink className="h-4 w-4" />
          Сайт
        </Link>
        <button
          type="button"
          onClick={() => { logout(); navigate('/'); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/55 hover:text-white hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
};

export default SidebarV2;
