import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { ShoppingBag, User, Calendar, Banknote } from 'lucide-react';

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Доступ запрещен. Войдите как администратор.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Загрузка покупок...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">История покупок</h1>
        <p className="text-gray-600">{purchases.length} всего покупок</p>
      </div>

      {purchases.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="h-16 w-16 text-dark-400 mx-auto mb-4" />
          <div className="text-gray-600 text-lg">Покупок пока нет</div>
          <p className="text-gray-500 mt-2">
            Покупки появятся здесь, когда клиенты начнут покупать биты
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map(purchase => (
            <div key={purchase.id} className="card">
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-black">{purchase.beat_title}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{purchase.user_username} ({purchase.user_email})</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Banknote className="h-4 w-4" />
                        <span>
                          {purchase.price_paid === 0 ? 'Бесплатно' : `${purchase.price_paid.toFixed(0)} ₽`}
                          {purchase.beat_price > 0 && (
                        <span className="text-gray-500"> / {purchase.beat_price === 0 ? 'Бесплатно' : `${purchase.beat_price.toFixed(0)} ₽`}</span>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(purchase.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPurchases;
