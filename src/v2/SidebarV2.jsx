import React, { useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronDown,
  Music,
  Upload,
  ShoppingBag,
  FileText,
  GraduationCap,
  Settings,
  AlertTriangle,
  ExternalLink,
  LogOut,
  LayoutTemplate,
  Image,
  MessageCircle,
  Users,
  UserCircle,
  Inbox,
  Link2,
  Percent,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  findActiveGroupLabel,
  isNavGroupOpen,
  toggleCollapsedLabel,
} from '../utils/adminNavCollapse';

const RubleIcon = ({ className }) => (
  <span className={`${className} flex items-center justify-center font-bold`}>₽</span>
);

const navGroups = [
  {
    label: 'Обзор',
    items: [
      { path: '/admin/dashboard', label: 'Панель', icon: BarChart3 },
      { path: '/admin/revenue', label: 'Доходы', icon: RubleIcon },
    ],
  },
  {
    label: 'Каталог',
    items: [
      { path: '/admin/beats', label: 'Биты', icon: Music },
      { path: '/admin/courses', label: 'Курсы', icon: GraduationCap },
      { path: '/admin/upload', label: 'Загрузка', icon: Upload },
      { path: '/admin/contributors', label: 'Люди', icon: Users },
      { path: '/admin/submissions', label: 'На проверке', icon: Inbox },
    ],
  },
  {
    label: 'Продажи',
    items: [
      { path: '/admin/purchases', label: 'Покупки', icon: ShoppingBag },
      { path: '/admin/users', label: 'Пользователи', icon: UserCircle },
      { path: '/admin/orders', label: 'Заявки', icon: FileText },
      { path: '/admin/support', label: 'Поддержка', icon: MessageCircle },
    ],
  },
  {
    label: 'Сайт',
    items: [
      { path: '/admin/hero', label: 'Главный экран', icon: LayoutTemplate },
      { path: '/admin/banners', label: 'Баннеры', icon: Image },
      { path: '/admin/sales', label: 'Скидки', icon: Percent },
      { path: '/admin/promo-codes', label: 'Промокоды', icon: Ticket },
      { path: '/admin/footer', label: 'Футер', icon: Link2 },
      { path: '/admin/oauth-settings', label: 'Настройки сайта', icon: Settings },
    ],
  },
  {
    label: 'Система',
    items: [
      { path: '/admin/errors', label: 'Ошибки', icon: AlertTriangle },
    ],
  },
];

const SidebarV2 = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsedLabels, setCollapsedLabels] = useState([]);
  const activeGroupLabel = findActiveGroupLabel(navGroups, pathname);

  return (
    <aside className="w-64 h-full flex flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="p-6 flex-1 overflow-y-auto">
        <h2 className="font-[Syne] text-lg font-bold mb-6">Админ</h2>
        <nav className="space-y-5">
          {navGroups.map((group) => {
            const open = isNavGroupOpen(group.label, collapsedLabels, activeGroupLabel);
            return (
              <div key={group.label}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setCollapsedLabels((prev) => toggleCollapsedLabel(prev, group.label))}
                  className="mb-1.5 flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-1 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35 transition-colors hover:text-white/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
                    aria-hidden
                  />
                </button>
                {open ? (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) =>
                            `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                              isActive
                                ? 'bg-[#22c55e] text-[#052e16] font-semibold'
                                : 'text-white/55 hover:text-white hover:bg-white/5'
                            }`
                          }
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                ) : null}
              </div>
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
