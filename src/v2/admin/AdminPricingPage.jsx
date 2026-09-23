import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  DEFAULT_SERVICE_ORDER_PRICING,
  normalizeServiceOrderPricing,
} from '../../utils/serviceOrderPricing';
import { api } from '../../utils/api';
import AdminServicePricingPanel from '../../components/AdminServicePricingPanel';

/**
 * Dedicated admin page for /order service pricing CMS.
 */
export default function AdminPricingPage() {
  const { isAdminAuthenticated } = useAuth();
  const [pricing, setPricing] = useState(() =>
    normalizeServiceOrderPricing(DEFAULT_SERVICE_ORDER_PRICING),
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/admin/site-settings');
        if (cancelled) return;
        setPricing(normalizeServiceOrderPricing(data?.service_order_pricing));
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.detail || 'Не удалось загрузить прайс');
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdminAuthenticated]);

  if (!isAdminAuthenticated) {
    return (
      <div className="py-12 text-center text-white/50">
        Доступ запрещен. Войдите как администратор.
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-64 items-center justify-center text-white/50">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Загрузка…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[Syne] text-2xl font-bold text-white sm:text-3xl">Прайс услуг</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/45">
          Цены для формы «Я знаю, что хочу» на /order. Сначала задай сроки и суммы, потом подписи.
          Реклама на витрине — отдельно: Баннеры → Заявки.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </div>
      ) : null}

      <AdminServicePricingPanel initialPricing={pricing} onSaved={setPricing} />
    </div>
  );
}
