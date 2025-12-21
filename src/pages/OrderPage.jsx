import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../utils/api';
import { Upload, Link as LinkIcon, FileText, Calendar, User, Mail } from 'lucide-react';

const OrderPage = () => {
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    service_category: '',
    materials: null,
    reference_links: '',
    reference_files: null,
    description: '',
    deadline_min: '',
    deadline_max: ''
  });
  const [uploading, setUploading] = useState(false);

  const serviceCategories = [
    'бит',
    'сведение',
    'саунддизайн',
    'топлайны',
    'трек под ключ',
    'запись индивидуального курса с объяснениями по проделанной работе'
  ];

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Заполняем данные пользователя, если авторизован
  React.useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        customer_name: user.username || '',
        customer_email: user.email || ''
      }));
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.service_category) {
      showError('Выберите категорию услуги');
      return;
    }

    // Для неавторизованных пользователей проверяем наличие имени и email
    if (!isAuthenticated) {
      if (!formData.customer_name || !formData.customer_email) {
        showError('Укажите ваше имя и email');
        return;
      }
    }

    try {
      setUploading(true);
      
      // Сначала загружаем файлы, если они есть
      let materialsUrl = null;
      let referenceFilesUrl = null;

      if (formData.materials) {
        const materialsFormData = new FormData();
        materialsFormData.append('file', formData.materials);
        const materialsResponse = await api.post('/upload-materials', materialsFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        materialsUrl = materialsResponse.data.url;
      }

      if (formData.reference_files) {
        const refFormData = new FormData();
        refFormData.append('file', formData.reference_files);
        const refResponse = await api.post('/upload-reference-files', refFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        referenceFilesUrl = refResponse.data.url;
      }

      // Создаем заказ
      const orderData = {
        service_category: formData.service_category,
        materials_url: materialsUrl,
        reference_links: formData.reference_links,
        reference_files_url: referenceFilesUrl,
        description: formData.description,
        deadline_min: formData.deadline_min ? parseInt(formData.deadline_min) : null,
        deadline_max: formData.deadline_max ? parseInt(formData.deadline_max) : null,
        customer_name: !isAuthenticated ? formData.customer_name : null,
        customer_email: !isAuthenticated ? formData.customer_email : null
      };

      await api.post('/service-orders', orderData);
      showSuccess('Заказ успешно создан!');
      
      // Сбрасываем форму
      setFormData({
        customer_name: isAuthenticated && user ? user.username || '' : '',
        customer_email: isAuthenticated && user ? user.email || '' : '',
        service_category: '',
        materials: null,
        reference_links: '',
        reference_files: null,
        description: '',
        deadline_min: '',
        deadline_max: ''
      });
    } catch (error) {
      console.error('Error creating order:', error);
      showError(error.response?.data?.detail || 'Ошибка при создании заказа');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Форма заказа услуг</h1>
        <p className="text-gray-600">Заполните форму для заказа услуги</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Контактная информация (только для неавторизованных) */}
        {!isAuthenticated && (
          <>
            <div>
              <label htmlFor="customer_name" className="block text-sm font-medium text-black mb-2">
                <User className="h-4 w-4 inline mr-2" />
                Ваше имя *
              </label>
              <input
                type="text"
                id="customer_name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Введите ваше имя"
              />
            </div>

            <div>
              <label htmlFor="customer_email" className="block text-sm font-medium text-black mb-2">
                <Mail className="h-4 w-4 inline mr-2" />
                Email *
              </label>
              <input
                type="email"
                id="customer_email"
                name="customer_email"
                value={formData.customer_email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Введите ваш email"
              />
            </div>
          </>
        )}

        {/* Категория услуги */}
        <div>
          <label htmlFor="service_category" className="block text-sm font-medium text-black mb-2">
            Категория услуги *
          </label>
          <select
            id="service_category"
            name="service_category"
            value={formData.service_category}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="">Выберите категорию</option>
            {serviceCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Загрузка материалов */}
        <div>
          <label htmlFor="materials" className="block text-sm font-medium text-black mb-2">
            <Upload className="h-4 w-4 inline mr-2" />
            Загрузка материалов
          </label>
          <input
            type="file"
            id="materials"
            name="materials"
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Ссылки на референсы */}
        <div>
          <label htmlFor="reference_links" className="block text-sm font-medium text-black mb-2">
            <LinkIcon className="h-4 w-4 inline mr-2" />
            Ссылки на референсы
          </label>
          <textarea
            id="reference_links"
            name="reference_links"
            value={formData.reference_links}
            onChange={handleInputChange}
            placeholder="Введите ссылки на референсы (каждая ссылка с новой строки)"
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Загрузка референсов файлами */}
        <div>
          <label htmlFor="reference_files" className="block text-sm font-medium text-black mb-2">
            <Upload className="h-4 w-4 inline mr-2" />
            Загрузка референсов файлами
          </label>
          <input
            type="file"
            id="reference_files"
            name="reference_files"
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Описание (ТЗ) */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-black mb-2">
            <FileText className="h-4 w-4 inline mr-2" />
            Описание (ТЗ)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Опишите ваши требования..."
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Диапазон дедлайна */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            <Calendar className="h-4 w-4 inline mr-2" />
            Диапазон дедлайна (в днях)
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="deadline_min" className="block text-xs text-gray-600 mb-1">От</label>
              <input
                type="number"
                id="deadline_min"
                name="deadline_min"
                value={formData.deadline_min}
                onChange={handleInputChange}
                placeholder="Мин. дней"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label htmlFor="deadline_max" className="block text-xs text-gray-600 mb-1">До</label>
              <input
                type="number"
                id="deadline_max"
                name="deadline_max"
                value={formData.deadline_max}
                onChange={handleInputChange}
                placeholder="Макс. дней"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={uploading}
          className="w-full btn btn-primary h-12 text-base"
        >
          {uploading ? 'Отправка...' : 'Создать заказ'}
        </button>
      </form>
    </div>
  );
};

export default OrderPage;

