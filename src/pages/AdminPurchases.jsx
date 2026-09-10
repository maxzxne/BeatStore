import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { formatMoscowDate } from '../utils/dateUtils';
import { ShoppingBag, Loader2 } from 'lucide-react';

const AdminPurchases = () => {
  const { isAdminAuthenticated } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchPurchases();
    }
  }, [isAdminAuthenticated]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/purchases');
      setPurchases(response.data);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="py-12 text-center text-white/50">
        Доступ запрещен. Войдите как администратор.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <Loader2 className="h-5 w-5 animate-spin" />
        Загрузка покупок…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Покупки</h1>
        <p className="admin-page-sub">{purchases.length} записей в истории</p>
      </div>

      <div className="admin-panel">
        {purchases.length === 0 ? (
          <div className="admin-empty">
            <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-white/25" />
            Покупок пока нет
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Бит</th>
                  <th>Покупатель</th>
                  <th>Сумма</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td>
                      <div className="font-medium text-white">{purchase.beat_title}</div>
                    </td>
                    <td>
                      <div className="text-white/80">{purchase.user_username}</div>
                      <div className="text-xs text-white/40">{purchase.user_email}</div>
                    </td>
                    <td className="whitespace-nowrap text-white/80">
                      {purchase.price_paid === 0 ? (
                        <span className="admin-badge admin-badge-off">Бесплатно</span>
                      ) : (
                        `${purchase.price_paid.toFixed(0)} ₽`
                      )}
                    </td>
                    <td className="whitespace-nowrap text-xs text-white/45">
                      {formatMoscowDate(purchase.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPurchases;
