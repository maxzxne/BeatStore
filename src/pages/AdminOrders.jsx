import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, buildMediaUrl } from '../utils/api';
import { formatMoscowDate } from '../utils/dateUtils';
import { FileText, User, Calendar, Link as LinkIcon, Upload, CheckCircle, XCircle, Clock, AlertCircle, Music, FileAudio, X } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

const AdminOrders = () => {
  const { isAdminAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'confirmed', 'paid', 'in_progress', 'completed', 'cancelled'
  const [sortBy, setSortBy] = useState('created_at'); // 'created_at', 'deadline_days', 'price'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [resultFiles, setResultFiles] = useState({
    wav: null,
    mp3: null,
    zip: null
  });
  const [uploadingResult, setUploadingResult] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchOrders();
    }
  }, [isAdminAuthenticated]);
  
  useEffect(() => {
    if (selectedOrder) {
      setResultFiles({
        wav: null,
        mp3: null,
        zip: null
      });
    }
  }, [selectedOrder]);

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

  // Фильтрация заявок по статусу
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === statusFilter));
    }
  }, [orders, statusFilter]);

  // Сортировка заявок (по умолчанию — новые первые)
  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    const mult = sortOrder === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'created_at') {
        valA = new Date(a.created_at || 0).getTime();
        valB = new Date(b.created_at || 0).getTime();
      } else if (sortBy === 'deadline_days') {
        valA = a.deadline_days ?? 9999;
        valB = b.deadline_days ?? 9999;
      } else {
        valA = a.price ?? 0;
        valB = b.price ?? 0;
      }
      return mult * (valA - valB);
    });
    return sorted;
  }, [filteredOrders, sortBy, sortOrder]);

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

  const handleResultFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      setResultFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
    }
  };
  
  const handleUploadResultFiles = async () => {
    if (!selectedOrder) return;
    
    if (!resultFiles.wav && !resultFiles.mp3 && !resultFiles.zip) {
      alert('Выберите хотя бы один файл для загрузки');
      return;
    }
    
    try {
      setUploadingResult(true);
      const formData = new FormData();
      
      if (resultFiles.wav) formData.append('wav_file', resultFiles.wav);
      if (resultFiles.mp3) formData.append('mp3_file', resultFiles.mp3);
      if (resultFiles.zip) formData.append('zip_file', resultFiles.zip);
      
      await api.post(`/api/admin/service-orders/${selectedOrder.id}/upload-result`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert('Файлы результата успешно загружены!');
      await fetchOrders();
      if (selectedOrder) {
        const updated = orders.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
      setResultFiles({ wav: null, mp3: null, zip: null });
    } catch (error) {
      console.error('Error uploading result files:', error);
      alert('Ошибка загрузки файлов результата');
    } finally {
      setUploadingResult(false);
    }
  };
  
  const formatDate = formatMoscowDate;

  const statusConfig = {
    pending: { label: 'Ожидает', color: 'bg-amber-500 text-white', icon: Clock },
    confirmed: { label: 'Подтверждено', color: 'bg-blue-600 text-white', icon: CheckCircle },
    paid: { label: 'Оплачено', color: 'bg-green-600 text-white', icon: CheckCircle },
    in_progress: { label: 'В работе', color: 'bg-violet-600 text-white', icon: AlertCircle },
    completed: { label: 'Завершено', color: 'bg-emerald-600 text-white', icon: CheckCircle },
    cancelled: { label: 'Отменено', color: 'bg-red-600 text-white', icon: XCircle }
  };

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${config.color}`}>
        <Icon className="h-3 w-3 shrink-0" />
        {config.label}
      </span>
    );
  };


  if (!isAdminAuthenticated) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 dark:text-neutral-400">Доступ запрещен. Войдите как администратор.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-neutral-400">Загрузка заявок...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Заявки на услуги</h1>
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <p className="text-gray-600 dark:text-neutral-400">{filteredOrders.length} заявок {statusFilter !== 'all' ? `(${statusConfig[statusFilter]?.label || statusFilter})` : 'всего'}</p>
          <div className="flex flex-wrap items-center gap-2">
            <CustomSelect
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'created_at', label: 'По дате создания' },
                { value: 'deadline_days', label: 'По дедлайну' },
                { value: 'price', label: 'По стоимости' }
              ]}
              className="w-auto min-w-[180px]"
            />
            <CustomSelect
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { value: 'desc', label: 'По убыванию' },
                { value: 'asc', label: 'По возрастанию' }
              ]}
              className="w-auto min-w-[160px]"
            />
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Все статусы' },
                { value: 'pending', label: 'Ожидает' },
                { value: 'confirmed', label: 'Подтверждено' },
                { value: 'paid', label: 'Оплачено' },
                { value: 'in_progress', label: 'В работе' },
                { value: 'completed', label: 'Завершено' },
                { value: 'cancelled', label: 'Отменено' }
              ]}
              className="w-auto min-w-[180px]"
            />
          </div>
        </div>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-600 dark:text-neutral-400 text-lg">Заявок пока нет</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Список заявок */}
          <div className="lg:col-span-2 space-y-4">
            {sortedOrders.map(order => (
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
                      <h3 className="font-semibold text-black dark:text-white mb-1">
                        {order.service_categories && order.service_categories.length > 0
                          ? order.service_categories.join(', ')
                          : order.service_category || 'Заказ'}
                      </h3>
                      {order.order_type === 'dont_know' && (
                        <span className="text-xs bg-slate-500 text-white px-2 py-1 rounded mb-2 inline-block">
                          Требует обсуждения
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-neutral-400">
                        <User className="h-4 w-4" />
                        <span>
                          {order.user_username || order.customer_name} 
                          {order.user_email || order.customer_email ? ` (${order.user_email || order.customer_email})` : ''}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-neutral-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                    {order.deadline_days && (
                      <span>Дедлайн: {order.deadline_days} {order.deadline_days === 1 ? 'день' : order.deadline_days < 5 ? 'дня' : 'дней'}</span>
                    )}
                    {order.price && (
                      <span className="font-semibold text-black dark:text-white">{order.price.toLocaleString('ru-RU')} ₽</span>
                    )}
                  </div>
                  
                  {order.description && (
                    <p className="text-sm text-gray-600 dark:text-neutral-400 mt-2 line-clamp-2">
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
                  <h2 className="text-lg font-semibold text-black dark:text-white">Детали заявки</h2>
                </div>
                
                <div className="card-content space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-neutral-400">Категории услуг</label>
                    {selectedOrder.service_categories && selectedOrder.service_categories.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedOrder.service_categories.map((cat, idx) => (
                          <span key={idx} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-200 text-gray-900 dark:bg-neutral-500 dark:text-white border border-gray-300 dark:border-neutral-600">
                            {cat}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-black dark:text-white font-semibold">{selectedOrder.service_category || 'Не указано'}</p>
                    )}
                  </div>
                  
                  {selectedOrder.order_type && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-neutral-400">Тип заказа</label>
                      <p className="text-black dark:text-white">
                        {selectedOrder.order_type === 'know' ? 'Я знаю, что хочу' : 'Требует обсуждения'}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-neutral-400">Пользователь</label>
                    <p className="text-black dark:text-white">{selectedOrder.user_username || selectedOrder.customer_name || 'Не указано'}</p>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">{selectedOrder.user_email || selectedOrder.customer_email || 'Не указано'}</p>
                    {!selectedOrder.user_id && (
                      <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">Неавторизованный пользователь</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-neutral-400">Статус</label>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  
                  {selectedOrder.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-neutral-400">Описание (ТЗ)</label>
                      <p className="text-black dark:text-white whitespace-pre-wrap">{selectedOrder.description}</p>
                    </div>
                  )}
                  
                  {selectedOrder.deadline_days && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-neutral-400">Дедлайн</label>
                      <p className="text-black dark:text-white">
                        {selectedOrder.deadline_days} {selectedOrder.deadline_days === 1 ? 'день' : selectedOrder.deadline_days < 5 ? 'дня' : 'дней'}
                      </p>
                    </div>
                  )}
                  
                  {selectedOrder.prepayment_percent && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-neutral-400">Процент предоплаты</label>
                      <p className="text-black dark:text-white">{selectedOrder.prepayment_percent}%</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-neutral-400">Стоимость</label>
                    {selectedOrder.price ? (
                      <div>
                        <p className="text-black dark:text-white font-semibold text-lg mb-2">
                          {selectedOrder.price.toLocaleString('ru-RU')} ₽
                          {selectedOrder.prepayment_percent && (
                            <span className="text-sm text-gray-600 dark:text-neutral-400 block mt-1">
                              Предоплата ({selectedOrder.prepayment_percent}%): {(selectedOrder.price * selectedOrder.prepayment_percent / 100).toLocaleString('ru-RU')} ₽
                            </span>
                          )}
                        </p>
                        {/* Показываем возможность изменения цены для заявок "не знаю" в статусе pending */}
                        {selectedOrder.order_type === 'dont_know' && selectedOrder.status === 'pending' && (
                          <div className="mt-2">
                            <input
                              type="number"
                              placeholder="Изменить стоимость"
                              defaultValue={selectedOrder.price}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white rounded-lg"
                              onBlur={(e) => {
                                const price = parseFloat(e.target.value);
                                if (price > 0 && price !== selectedOrder.price) {
                                  updateOrderStatus(selectedOrder.id, null, price, null);
                                }
                              }}
                            />
                            <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">Можно изменить стоимость до подтверждения заказа</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <input
                          type="number"
                          placeholder="Укажите стоимость"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white rounded-lg"
                          onBlur={(e) => {
                            const price = parseFloat(e.target.value);
                            if (price > 0) {
                              updateOrderStatus(selectedOrder.id, null, price, null);
                            }
                          }}
                        />
                        {selectedOrder.order_type === 'dont_know' && (
                          <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">Укажите стоимость для заявки</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {selectedOrder.reference_links && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-neutral-400 flex items-center gap-1">
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
                      <label className="text-sm font-medium text-gray-600 dark:text-neutral-400 flex items-center gap-1">
                        <Upload className="h-4 w-4" />
                        Материалы
                      </label>
                      <a
                        href={buildMediaUrl(selectedOrder.materials_url)}
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
                      <label className="text-sm font-medium text-gray-600 dark:text-neutral-400 flex items-center gap-1">
                        <Upload className="h-4 w-4" />
                        Референсы (файлы)
                      </label>
                      <a
                        href={buildMediaUrl(selectedOrder.reference_files_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Скачать референсы
                      </a>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-neutral-400">Дата создания</label>
                    <p className="text-black dark:text-white text-sm">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                  
                  {/* Загрузка файлов результата (только для заказов типа "не знаю" после оплаты) */}
                  {selectedOrder.order_type === 'dont_know' && (selectedOrder.status === 'paid' || selectedOrder.status === 'in_progress' || selectedOrder.status === 'completed') && (
                    <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
                      <h3 className="text-md font-semibold text-black dark:text-white mb-3">Файлы результата</h3>
                      
                      {/* Текущие файлы */}
                      {(selectedOrder.result_wav_url || selectedOrder.result_mp3_url || selectedOrder.result_zip_url) && (
                        <div className="mb-4 space-y-2">
                          {selectedOrder.result_wav_url && (
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 p-2 rounded">
                              <div className="flex items-center gap-2">
                                <FileAudio className="h-4 w-4 text-gray-600 dark:text-neutral-400" />
                                <span className="text-sm text-gray-700 dark:text-neutral-300">WAV файл</span>
                              </div>
                              <a
                                href={buildMediaUrl(selectedOrder.result_wav_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs"
                              >
                                Скачать
                              </a>
                            </div>
                          )}
                          {selectedOrder.result_mp3_url && (
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 p-2 rounded">
                              <div className="flex items-center gap-2">
                                <Music className="h-4 w-4 text-gray-600 dark:text-neutral-400" />
                                <span className="text-sm text-gray-700 dark:text-neutral-300">MP3 файл</span>
                              </div>
                              <a
                                href={buildMediaUrl(selectedOrder.result_mp3_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs"
                              >
                                Скачать
                              </a>
                            </div>
                          )}
                          {selectedOrder.result_zip_url && (
                            <div className="flex items-center justify-between bg-gray-50 dark:bg-neutral-800 p-2 rounded">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-600 dark:text-neutral-400" />
                                <span className="text-sm text-gray-700 dark:text-neutral-300">ZIP архив</span>
                              </div>
                              <a
                                href={buildMediaUrl(selectedOrder.result_zip_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs"
                              >
                                Скачать
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Форма загрузки файлов */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-neutral-400 mb-1">WAV файл</label>
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor="result-file-wav"
                              className="btn btn-outline btn-sm cursor-pointer shrink-0"
                            >
                              Выберите файл
                            </label>
                            <input
                              id="result-file-wav"
                              type="file"
                              accept="audio/wav,audio/*"
                              onChange={(e) => handleResultFileChange(e, 'wav')}
                              className="hidden"
                            />
                            {resultFiles.wav ? (
                              <>
                                <span className="text-sm text-gray-600 dark:text-neutral-400 truncate flex-1">{resultFiles.wav.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setResultFiles(prev => ({ ...prev, wav: null }))}
                                  className="text-red-600 hover:text-red-800 shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-neutral-500">Файл не выбран</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-neutral-400 mb-1">MP3 файл</label>
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor="result-file-mp3"
                              className="btn btn-outline btn-sm cursor-pointer shrink-0"
                            >
                              Выберите файл
                            </label>
                            <input
                              id="result-file-mp3"
                              type="file"
                              accept="audio/mpeg,audio/mp3,audio/*"
                              onChange={(e) => handleResultFileChange(e, 'mp3')}
                              className="hidden"
                            />
                            {resultFiles.mp3 ? (
                              <>
                                <span className="text-sm text-gray-600 dark:text-neutral-400 truncate flex-1">{resultFiles.mp3.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setResultFiles(prev => ({ ...prev, mp3: null }))}
                                  className="text-red-600 hover:text-red-800 shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-neutral-500">Файл не выбран</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-neutral-400 mb-1">ZIP архив</label>
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor="result-file-zip"
                              className="btn btn-outline btn-sm cursor-pointer shrink-0"
                            >
                              Выберите файл
                            </label>
                            <input
                              id="result-file-zip"
                              type="file"
                              accept=".zip,application/zip"
                              onChange={(e) => handleResultFileChange(e, 'zip')}
                              className="hidden"
                            />
                            {resultFiles.zip ? (
                              <>
                                <span className="text-sm text-gray-600 dark:text-neutral-400 truncate flex-1">{resultFiles.zip.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setResultFiles(prev => ({ ...prev, zip: null }))}
                                  className="text-red-600 hover:text-red-800 shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-neutral-500">Файл не выбран</span>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={handleUploadResultFiles}
                          disabled={uploadingResult || (!resultFiles.wav && !resultFiles.mp3 && !resultFiles.zip)}
                          className="btn btn-primary btn-sm w-full"
                        >
                          {uploadingResult ? 'Загрузка...' : selectedOrder.result_wav_url || selectedOrder.result_mp3_url || selectedOrder.result_zip_url ? 'Заменить файлы' : 'Загрузить файлы'}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-neutral-500">
                          Можно загрузить от 1 до 3 файлов. При повторной загрузке файлы будут заменены.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
                    <label className="text-sm font-medium text-gray-600 dark:text-neutral-400 mb-2 block">Изменить статус</label>
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
                <div className="card-content text-center text-gray-500 dark:text-neutral-500">
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



