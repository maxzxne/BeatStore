import React, { useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Percent, Ticket } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AdminSalesPage from './AdminSalesPage';
import AdminPromoCodesPage from './AdminPromoCodesPage';

const TABS = [
  { id: 'sales', label: 'Акции', icon: Percent, hint: 'Скидки на витрине и рекламу' },
  { id: 'codes', label: 'Промокоды', icon: Ticket, hint: 'Одноразовые коды для пользователя' },
];

/**
 * Unified marketing promo CMS: sales campaigns + personal promo codes.
 */
export default function AdminPromoPage() {
  const { isAdminAuthenticated } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'codes' ? 'codes' : 'sales';

  const active = useMemo(() => TABS.find((item) => item.id === tab) || TABS[0], [tab]);

  const setTab = (next) => {
    const nextParams = new URLSearchParams(params);
    if (next === 'sales') nextParams.delete('tab');
    else nextParams.set('tab', next);
    setParams(nextParams, { replace: true });
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="py-12 text-center text-white/50">
        Доступ запрещен. Войдите как администратор.
      </div>
    );
  }

  if (params.get('tab') && params.get('tab') !== 'codes' && params.get('tab') !== 'sales') {
    return <Navigate to="/admin/promo" replace />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[#22c55e]">Маркетинг</p>
        <h1 className="mt-1 font-[Syne] text-3xl font-extrabold text-white">Промо</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Акции на каталог и персональные промокоды — в одном месте. На чекауте сумма всегда
          считается на сервере.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Разделы промо">
        {TABS.map((item) => {
          const Icon = item.icon;
          const selected = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(item.id)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
                selected
                  ? 'bg-[#22c55e] text-[#052e16]'
                  : 'border border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-white/40">{active.hint}</p>

      {tab === 'sales' ? <AdminSalesPage embedded /> : <AdminPromoCodesPage embedded />}
    </div>
  );
}
