import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { FileText, User, Calendar, Link as LinkIcon, Upload, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const AdminOrders = () => {
  const { isAdminAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchOrders();
    }
  }, [isAdminAuthenticated]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/service-orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus, price = null, prepaymentPercent = null) => {
    try {
      const formData = new FormData();
      if (newStatus) formData.append('status', newStatus);
      if (price !== null) formData.append('price', price.toString());
      if (prepaymentPercent !== null) formData.append('prepayment_percent', prepaymentPercent.toString());
      
      await api.put(`/api/admin/service-orders/${orderId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        const updated = { ...selectedOrder };
        if (newStatus) updated.status = newStatus;
        if (price !== null) updated.price = price;
        if (prepaymentPercent !== null) updated.prepayment_percent = prepaymentPercent;
        setSelectedOrder(updated);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Ошибка обновления заявки');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Ожидает', color: 'bg-yellow-500/20 text-yellow-600', icon: Clock },
      in_progress: { label: 'В работе', color: 'bg-blue-500/20 text-blue-600', icon: AlertCircle },
      completed: { label: 'Завершено', color: 'bg-green-500/20 text-green-600', icon: CheckCircle },
      cancelled: { label: 'Отменено', color: 'bg-red-500/20 text-red-600', icon: XCircle }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
        <div className="text-gray-600">Загрузка заявок...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Заявки на услуги</h1>
        <p className="text-gray-600">{orders.length} всего заявок</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-600 text-lg">Заявок пока нет</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Список заявок */}
          <div className="lg:col-span-2 space-y-4">
            {orders.map(order => (
              <div
                key={order.id}
                className={`card cursor-pointer transition-all ${
                  selectedOrder?.id === order.id ? 'ring-2 ring-black' : ''
                }`}
                onClick={() => setSelectedOrder(order)}
              >
                <div className="card-content">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-black mb-1">
                        {order.service_categories && order.service_categories.length > 0
                          ? order.service_categories.join(', ')
                          : order.service_category || 'Заказ'}
                      </h3>
                      {order.order_type === 'dont_know' && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mb-2 inline-block">
                          Требует обсуждения
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>
                          {order.user_username || order.customer_name} 
                          {order.user_email || order.customer_email ? ` (${order.user_email || order.customer_email})` : ''}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                    {order.deadline_days && (
                      <span>Дедлайн: {order.deadline_days} {order.deadline_days === 1 ? 'день' : order.deadline_days < 5 ? 'дня' : 'дней'}</span>
                    )}
                    {order.price && (
                      <span className="font-semibold text-black">{order.price.toLocaleString('ru-RU')} ₽</span>
                    )}
                  </div>
                  
                  {order.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {order.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Детали заявки */}
          <div className="lg:col-span-1">
            {selectedOrder ? (
              <div className="card sticky top-4">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-black">Детали заявки</h2>
                </div>
                
                <div className="card-content space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Категории услуг</label>
                    {selectedOrder.service_categories && selectedOrder.service_categories.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedOrder.service_categories.map((cat, idx) => (
                          <span key={idx} className="px-3 py-1 bg-gray-100 rounded-lg text-sm">
                            {cat}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-black font-semibold">{selectedOrder.service_category || 'Не указано'}</p>
                    )}
                  </div>
                  
                  {selectedOrder.order_type && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Тип заказа</label>
                      <p className="text-black">
                        {selectedOrder.order_type === 'know' ? 'Я знаю, что хочу' : 'Требует обсуждения'}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Пользователь</label>
                    <p className="text-black">{selectedOrder.user_username || selectedOrder.customer_name || 'Не указано'}</p>
                    <p className="text-sm text-gray-600">{selectedOrder.user_email || selectedOrder.customer_email || 'Не указано'}</p>
                    {!selectedOrder.user_id && (
                      <p className="text-xs text-gray-500 mt-1">Неавторизованный пользователь</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Статус</label>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  
                  {selectedOrder.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Описание (ТЗ)</label>
                      <p className="text-black whitespace-pre-wrap">{selectedOrder.description}</p>
                    </div>
                  )}
                  
                  {selectedOrder.deadline_days && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Дедлайн</label>
                      <p className="text-black">
                        {selectedOrder.deadline_days} {selectedOrder.deadline_days === 1 ? 'день' : selectedOrder.deadline_days < 5 ? 'дня' : 'дней'}
                      </p>
                    </div>
                  )}
                  
                  {selectedOrder.prepayment_percent && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Процент предоплаты</label>
                      <p className="text-black">{selectedOrder.prepayment_percent}%</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Стоимость</label>
                    {selectedOrder.price ? (
                      <p className="text-black font-semibold text-lg">
                        {selectedOrder.price.toLocaleString('ru-RU')} ₽
                        {selectedOrder.prepayment_percent && (
                          <span className="text-sm text-gray-600 block mt-1">
                            Предоплата ({selectedOrder.prepayment_percent}%): {(selectedOrder.price * selectedOrder.prepayment_percent / 100).toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                      </p>
                    ) : (
                      <div className="mt-2">
                        <input
                          type="number"
                          placeholder="Укажите стоимость"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          onBlur={(e) => {
                            const price = parseFloat(e.target.value);
                            if (price > 0) {
                              updateOrderStatus(selectedOrder.id, null, price, null);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  {selectedOrder.reference_links && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <LinkIcon className="h-4 w-4" />
                        Ссылки на референсы
                      </label>
                      <div className="mt-1 space-y-1">
                        {selectedOrder.reference_links.split('\n').filter(link => link.trim()).map((link, idx) => (
                          <a
                            key={idx}
                            href={link.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm block truncate"
                          >
                            {link.trim()}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedOrder.materials_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Upload className="h-4 w-4" />
                        Материалы
                      </label>
                      <a
                        href={`${API_URL}${selectedOrder.materials_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Скачать материалы
                      </a>
                    </div>
                  )}
                  
                  {selectedOrder.reference_files_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Upload className="h-4 w-4" />
                        Референсы (файлы)
                      </label>
                      <a
                        href={`${API_URL}${selectedOrder.reference_files_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Скачать референсы
                      </a>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Дата создания</label>
                    <p className="text-black text-sm">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <label className="text-sm font-medium text-gray-600 mb-2 block">Изменить статус</label>
                    <div className="space-y-2">
                      {selectedOrder.status !== 'pending' && (
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, 'pending')}
                          className="btn btn-outline btn-sm w-full"
                        >
                          Вернуть в ожидание
                        </button>
                      )}
                      {selectedOrder.status !== 'confirmed' && selectedOrder.price && (
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                          className="btn btn-primary btn-sm w-full"
                        >
                          Подтвердить заказ
                        </button>
                      )}
                      {selectedOrder.status !== 'paid' && (
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, 'paid')}
                          className="btn btn-primary btn-sm w-full bg-green-600 hover:bg-green-700"
                        >
                          Отметить как оплачен
                        </button>
                      )}
                      {selectedOrder.status !== 'in_progress' && (
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, 'in_progress')}
                          className="btn btn-primary btn-sm w-full"
                        >
                          Взять в работу
                        </button>
                      )}
                      {selectedOrder.status !== 'completed' && (
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                          className="btn btn-primary btn-sm w-full bg-green-600 hover:bg-green-700"
                        >
                          Завершить
                        </button>
                      )}
                      {selectedOrder.status !== 'cancelled' && (
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                          className="btn btn-outline btn-sm w-full text-red-600 hover:text-red-700 hover:border-red-600"
                        >
                          Отменить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-content text-center text-gray-500">
                  Выберите заявку для просмотра деталей
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;

