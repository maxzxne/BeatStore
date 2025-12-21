import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../utils/api';
import { Upload, Link as LinkIcon, FileText, Calendar, User, Mail, Plus, X } from 'lucide-react';

const OrderPage = () => {
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [orderType, setOrderType] = useState(null); // null, "know", "dont_know"
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    service_categories: [], // Массив выбранных категорий
    materials: null,
    reference_links: '',
    reference_files: null,
    description: '',
    deadline_days: '',
    prepayment_percent: 50 // 50 или 100
  });
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Категории услуг
  const serviceCategories = [
    'бит',
    'сведение',
    'саунддизайн',
    'топлайны',
    'трек под ключ',
    'запись индивидуального курса с объяснениями по проделанной работе'
  ];

  // Цены согласно сообщению
  const getPrice = (deadlineDays, prepaymentPercent) => {
    if (!deadlineDays) return null;
    
    const days = parseInt(deadlineDays);
    const prices = {
      50: { // 50% предоплата
        '14-21': 25000, // 2-3 недели
        '7-14': 30000,  // 1-2 недели
        '7': 35000,      // 1 неделя
        '2-3': 40000,    // 2-3 дня
        '1': 50000       // 24 часа
      },
      100: { // 100% предоплата
        '14-21': 20000,
        '7-14': 25000,
        '7': 30000,
        '2-3': 35000,
        '1': 45000
      }
    };
    
    const priceMap = prices[prepaymentPercent];
    
    if (days >= 14 && days <= 21) return priceMap['14-21'];
    if (days >= 7 && days < 14) return priceMap['7-14'];
    if (days === 7) return priceMap['7'];
    if (days >= 2 && days <= 3) return priceMap['2-3'];
    if (days === 1) return priceMap['1'];
    
    // Если не попадает в диапазоны, возвращаем базовую цену
    return priceMap['14-21'];
  };

  const calculateTotalPrice = () => {
    if (formData.service_categories.length === 0 || !formData.deadline_days) return 0;
    
    const pricePerService = getPrice(formData.deadline_days, formData.prepayment_percent);
    if (!pricePerService) return 0;
    
    return pricePerService * formData.service_categories.length;
  };

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
    if (isAuthenticated && user && orderType === "know") {
      setFormData(prev => ({
        ...prev,
        customer_name: user.username || '',
        customer_email: user.email || ''
      }));
    }
  }, [isAuthenticated, user, orderType]);

  const toggleCategory = (category) => {
    setFormData(prev => {
      const categories = [...prev.service_categories];
      const index = categories.indexOf(category);
      if (index > -1) {
        categories.splice(index, 1);
      } else {
        categories.push(category);
      }
      return { ...prev, service_categories: categories };
    });
  };

  const handleSimpleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer_name || !formData.customer_email) {
      showError('Укажите ваше имя и email');
      return;
    }

    try {
      setUploading(true);
      
      const orderData = {
        order_type: "dont_know",
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        description: formData.description || "Пользователь не знает, что хочет. Требуется обсуждение."
      };

      await api.post('/service-orders', orderData);
      showSuccess('Заявка успешно отправлена! Мы свяжемся с вами для обсуждения заказа.');
      
      // Сбрасываем форму
      setFormData({
        customer_name: '',
        customer_email: '',
        service_categories: [],
        materials: null,
        reference_links: '',
        reference_files: null,
        description: '',
        deadline_days: '',
        prepayment_percent: 50
      });
      setOrderType(null);
    } catch (error) {
      console.error('Error creating order:', error);
      showError(error.response?.data?.detail || 'Ошибка при создании заявки');
    } finally {
      setUploading(false);
    }
  };

  const handleDetailedSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.service_categories.length === 0) {
      showError('Выберите хотя бы одну категорию услуги');
      return;
    }

    if (!formData.deadline_days) {
      showError('Укажите срок выполнения заказа');
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
        order_type: "know",
        service_categories: formData.service_categories,
        materials_url: materialsUrl,
        reference_links: formData.reference_links,
        reference_files_url: referenceFilesUrl,
        description: formData.description,
        deadline_days: parseInt(formData.deadline_days),
        prepayment_percent: formData.prepayment_percent,
        customer_name: !isAuthenticated ? formData.customer_name : null,
        customer_email: !isAuthenticated ? formData.customer_email : null
      };

      await api.post('/service-orders', orderData);
      showSuccess('Заказ успешно создан!');
      
      // Сбрасываем форму
      setFormData({
        customer_name: isAuthenticated && user ? user.username || '' : '',
        customer_email: isAuthenticated && user ? user.email || '' : '',
        service_categories: [],
        materials: null,
        reference_links: '',
        reference_files: null,
        description: '',
        deadline_days: '',
        prepayment_percent: 50
      });
      setOrderType(null);
    } catch (error) {
      console.error('Error creating order:', error);
      showError(error.response?.data?.detail || 'Ошибка при создании заказа');
    } finally {
      setUploading(false);
    }
  };

  // Если тип заказа не выбран
  if (orderType === null) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Форма заказа услуг</h1>
          <p className="text-gray-600">Выберите тип заказа</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setOrderType("know")}
            className="w-full p-6 border-2 border-gray-300 rounded-lg hover:border-black transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-black mb-2">Я знаю, что я хочу!</h3>
                <p className="text-gray-600">Заполните подробную форму с выбором услуг и расчетом стоимости</p>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </button>

          <button
            onClick={() => setOrderType("dont_know")}
            className="w-full p-6 border-2 border-gray-300 rounded-lg hover:border-black transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-black mb-2">Я не знаю, что я хочу!</h3>
                <p className="text-gray-600">Отправьте простую заявку, мы свяжемся с вами для обсуждения</p>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Простая форма для "не знаю"
  if (orderType === "dont_know") {
    return (
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-8">
          <button
            onClick={() => setOrderType(null)}
            className="text-gray-600 hover:text-black mb-4 flex items-center"
          >
            ← Назад к выбору типа заказа
          </button>
          <h1 className="text-3xl font-bold text-black mb-2">Простая заявка</h1>
          <p className="text-gray-600">Заполните форму, и мы свяжемся с вами для обсуждения заказа</p>
        </div>

        <form onSubmit={handleSimpleSubmit} className="space-y-6">
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

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-black mb-2">
              <FileText className="h-4 w-4 inline mr-2" />
              Дополнительная информация (необязательно)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Расскажите, что вас интересует..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full btn btn-primary h-12 text-base"
          >
            {uploading ? 'Отправка...' : 'Отправить заявку'}
          </button>
        </form>
      </div>
    );
  }

  // Подробная форма для "знаю"
  const totalPrice = calculateTotalPrice();
  const prepaymentAmount = totalPrice * (formData.prepayment_percent / 100);

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <div className="mb-8">
        <button
          onClick={() => setOrderType(null)}
          className="text-gray-600 hover:text-black mb-4 flex items-center"
        >
          ← Назад к выбору типа заказа
        </button>
        <h1 className="text-3xl font-bold text-black mb-2">Подробная форма заказа</h1>
        <p className="text-gray-600">Заполните форму для расчета стоимости и оформления заказа</p>
      </div>

      <form onSubmit={handleDetailedSubmit} className="space-y-6">
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

        {/* Категории услуг с множественным выбором */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Категории услуг *
          </label>
          
          {/* Выбранные категории */}
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.service_categories.map(category => (
              <div
                key={category}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg"
              >
                <span>{category}</span>
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="hover:bg-gray-700 rounded p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Кнопка добавления категории */}
          {!showCategorySelector && (
            <button
              type="button"
              onClick={() => setShowCategorySelector(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-black transition-colors w-full"
            >
              <Plus className="h-5 w-5" />
              <span>Добавить категорию услуги</span>
            </button>
          )}

          {/* Список категорий для выбора */}
          {showCategorySelector && (
            <div className="border border-gray-300 rounded-lg p-4 space-y-2">
              {serviceCategories.map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    toggleCategory(category);
                    setShowCategorySelector(false);
                  }}
                  disabled={formData.service_categories.includes(category)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    formData.service_categories.includes(category)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {category}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCategorySelector(false)}
                className="w-full mt-2 px-4 py-2 text-gray-600 hover:text-black"
              >
                Отмена
              </button>
            </div>
          )}
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

        {/* Дедлайн */}
        <div>
          <label htmlFor="deadline_days" className="block text-sm font-medium text-black mb-2">
            <Calendar className="h-4 w-4 inline mr-2" />
            Срок выполнения (в днях) *
          </label>
          <input
            type="number"
            id="deadline_days"
            name="deadline_days"
            value={formData.deadline_days}
            onChange={handleInputChange}
            required
            min="1"
            placeholder="Укажите количество дней"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="text-xs text-gray-500 mt-1">
            Примеры: 1 день (24 часа), 2-3 дня, 7 дней (1 неделя), 14-21 день (2-3 недели)
          </p>
        </div>

        {/* Процент предоплаты */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">
            Процент предоплаты *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="prepayment_percent"
                value="50"
                checked={formData.prepayment_percent === 50}
                onChange={(e) => setFormData({ ...formData, prepayment_percent: parseInt(e.target.value) })}
                className="mr-2"
              />
              <span>50% предоплата</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="prepayment_percent"
                value="100"
                checked={formData.prepayment_percent === 100}
                onChange={(e) => setFormData({ ...formData, prepayment_percent: parseInt(e.target.value) })}
                className="mr-2"
              />
              <span>100% предоплата</span>
            </label>
          </div>
        </div>

        {/* Калькулятор стоимости */}
        {totalPrice > 0 && (
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-bold text-black mb-4">Расчет стоимости</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Количество услуг:</span>
                <span className="font-medium">{formData.service_categories.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Стоимость одной услуги:</span>
                <span className="font-medium">{getPrice(formData.deadline_days, formData.prepayment_percent)?.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                <span>Итого:</span>
                <span>{totalPrice.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 border-t pt-2 mt-2">
                <span>Предоплата ({formData.prepayment_percent}%):</span>
                <span className="font-medium">{prepaymentAmount.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || totalPrice === 0}
          className="w-full btn btn-primary h-12 text-base"
        >
          {uploading ? 'Отправка...' : totalPrice > 0 ? `Оформить заказ (предоплата ${prepaymentAmount.toLocaleString('ru-RU')} ₽)` : 'Оформить заказ'}
        </button>
      </form>
    </div>
  );
};

export default OrderPage;
