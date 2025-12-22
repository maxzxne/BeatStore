import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Music, Upload, ShoppingBag, FileText, GraduationCap, Settings } from 'lucide-react';

const Sidebar = () => {
  // Кастомная иконка рубля
  const RubleIcon = ({ className }) => (
    <span className={className} style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₽</span>
  );

  const navItems = [
    { path: '/admin/dashboard', label: 'Панель', icon: BarChart3 },
    { path: '/admin/revenue', label: 'Доходы', icon: RubleIcon },
    { path: '/admin/beats', label: 'Биты', icon: Music },
    { path: '/admin/courses', label: 'Курсы', icon: GraduationCap },
    { path: '/admin/upload', label: 'Загрузка', icon: Upload },
    { path: '/admin/purchases', label: 'Покупки', icon: ShoppingBag },
    { path: '/admin/orders', label: 'Заявки', icon: FileText },
    { path: '/admin/oauth-settings', label: 'OAuth', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-gray-100 border-r border-gray-300 h-full">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-black mb-6">Админ панель</h2>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:text-black hover:bg-gray-200'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
