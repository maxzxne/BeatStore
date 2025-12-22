import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../utils/api';
import { Upload, Link as LinkIcon, FileText, Calendar, User, Mail, Plus, X, HelpCircle } from 'lucide-react';

const OrderPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [orderType, setOrderType] = useState(null); // null, "know", "dont_know"
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    contact_info: '', // Дополнительная информация для обратной связи (телеграм, почта и т.д.)
    service_categories: [], // Массив выбранных категорий (можно дублировать)
    materials: [], // Массив файлов материалов
    reference_links: '',
    reference_files: [], // Массив файлов референсов
    description: '',
    deadline_days: '',
    prepayment_percent: 50 // 50 или 100
  });
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Категории услуг с описаниями
  const serviceCategories = [
    { value: 'бит', label: 'бит', description: null },
    { value: 'бит в стиле трэп', label: 'бит в стиле трэп (15K)', description: 'Простая трэпчага в стиле Travis Scott, Yeat, Lil Baby, Pop Smoke и др.' },
    { value: 'сведение', label: 'сведение', description: null },
    { value: 'саунддизайн', label: 'саунддизайн', description: null },
    { value: 'топлайны', label: 'топлайны', description: null },
    { value: 'трек под ключ', label: 'трек под ключ', description: 'Полное написание песни с мелодиями и текстом (можно без текста). Права переходят к заказчику, никаких указаний авторства!' },
    { value: 'запись индивидуального курса с объяснениями по проделанной работе', label: 'запись индивидуального курса с объяснениями по проделанной работе', description: null }
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
    if (formData.service_categories.length === 0) return 0;
    
    let total = 0;
    
    formData.service_categories.forEach(category => {
      // Бит в стиле трэп всегда стоит 15К
      if (category === 'бит в стиле трэп') {
        total += 15000;
      } else {
        // Для остальных услуг нужен срок и предоплата
        if (!formData.deadline_days) {
          // Если нет срока, не добавляем к общей сумме
          return;
        }
        const pricePerService = getPrice(formData.deadline_days, formData.prepayment_percent);
        if (pricePerService) {
          total += pricePerService;
        }
      }
    });
    
    return total;
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      // Для множественных файлов
      if (name === 'materials' || name === 'reference_files') {
        const fileArray = Array.from(files);
        setFormData(prev => ({
          ...prev,
          [name]: [...(prev[name] || []), ...fileArray]
        }));
      } else {
        setFormData({ ...formData, [name]: files[0] });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const removeFile = (fileList, index, name) => {
    setFormData(prev => ({
      ...prev,
      [name]: prev[name].filter((_, i) => i !== index)
    }));
  };

  // Заполняем данные пользователя, если авторизован
  React.useEffect(() => {
    if (isAuthenticated && user && orderType === "know") {
      setFormData(prev => ({
        ...prev,
        customer_name: user.username || '',
        customer_email: user.email || '',
        contact_info: user.additional_contact || prev.contact_info || ''
      }));
    }
  }, [isAuthenticated, user, orderType]);

  const addCategory = (category) => {
    const categoryValue = typeof category === 'string' ? category : category.value;
    setFormData(prev => ({
      ...prev,
      service_categories: [...prev.service_categories, categoryValue]
    }));
    setShowCategorySelector(false);
  };
  
  const getCategoryLabel = (categoryValue) => {
    const category = serviceCategories.find(c => c.value === categoryValue);
    return category ? category.label : categoryValue;
  };
  
  const getCategoryDescription = (categoryValue) => {
    const category = serviceCategories.find(c => c.value === categoryValue);
    return category ? category.description : null;
  };

  const removeCategory = (index) => {
    setFormData(prev => ({
      ...prev,
      service_categories: prev.service_categories.filter((_, i) => i !== index)
    }));
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
        description: formData.description || "Пользователь не знает, что хочет. Требуется обсуждение.",
        contact_info: formData.contact_info || null
      };

      await api.post('/service-orders', orderData);
      showSuccess('Заявка успешно отправлена! Мы свяжемся с вами для обсуждения заказа.');
      
      // Сбрасываем форму
      setFormData({
        customer_name: '',
        customer_email: '',
        contact_info: '',
        service_categories: [],
        materials: [],
        reference_links: '',
        reference_files: [],
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
      
      // Загружаем все файлы материалов
      const materialsUrls = [];
      for (const file of formData.materials) {
        const materialsFormData = new FormData();
        materialsFormData.append('file', file);
        const materialsResponse = await api.post('/upload-materials', materialsFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        materialsUrls.push(materialsResponse.data.url);
      }

      // Загружаем все файлы референсов
      const referenceFilesUrls = [];
      for (const file of formData.reference_files) {
        const refFormData = new FormData();
        refFormData.append('file', file);
        const refResponse = await api.post('/upload-reference-files', refFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        referenceFilesUrls.push(refResponse.data.url);
      }

      // Создаем заказ
      const orderData = {
        order_type: "know",
        service_categories: formData.service_categories,
        materials_url: materialsUrls.length > 0 ? JSON.stringify(materialsUrls) : null,
        reference_links: formData.reference_links,
        reference_files_url: referenceFilesUrls.length > 0 ? JSON.stringify(referenceFilesUrls) : null,
        description: formData.description,
        deadline_days: parseInt(formData.deadline_days),
        prepayment_percent: formData.prepayment_percent,
        contact_info: formData.contact_info || null,
        customer_name: !isAuthenticated ? formData.customer_name : null,
        customer_email: !isAuthenticated ? formData.customer_email : null
      };

      const response = await api.post('/service-orders', orderData);
      const orderId = response.data.id;
      
      // Вычисляем цену и предоплату
      const calculatedTotalPrice = calculateTotalPrice();
      const calculatedPrepaymentAmount = calculatedTotalPrice * (formData.prepayment_percent / 100);
      
      // Если есть цена, переходим на тестовую страницу оплаты
      if (calculatedTotalPrice > 0) {
        const params = new URLSearchParams();
        params.append('type', 'order');
        params.append('order_id', orderId.toString());
        params.append('total_price', calculatedPrepaymentAmount.toString());
        navigate(`/test-payment?${params.toString()}`);
      } else {
        showSuccess('Заказ успешно создан!');
        
        // Сбрасываем форму
        setFormData({
          customer_name: isAuthenticated && user ? user.username || '' : '',
          customer_email: isAuthenticated && user ? user.email || '' : '',
          contact_info: '',
          service_categories: [],
          materials: [],
          reference_links: '',
          reference_files: [],
          description: '',
          deadline_days: '',
          prepayment_percent: 50
        });
        setOrderType(null);
      }
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
                <h3 className="text-xl font-bold text-black mb-4">Я знаю, что я хочу!</h3>
                <p className="text-gray-600 mb-4">Заполните подробную форму с выбором услуг и расчетом стоимости</p>
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

          <div>
            <label htmlFor="contact_info" className="block text-sm font-medium text-black mb-2">
              <Mail className="h-4 w-4 inline mr-2" />
              Дополнительная информация для обратной связи
            </label>
            <input
              type="text"
              id="contact_info"
              name="contact_info"
              value={formData.contact_info}
              onChange={handleInputChange}
              placeholder="Например: Telegram @username, WhatsApp +7..., или другой способ связи"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-gray-500 mt-1">
              Укажите удобный способ связи (Telegram, WhatsApp, другой email и т.д.)
            </p>
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
  
  // Подсчет количества каждой услуги
  const getServiceCounts = () => {
    const counts = {};
    formData.service_categories.forEach(category => {
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  };
  
  const serviceCounts = getServiceCounts();

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
            {formData.service_categories.map((category, index) => {
              const description = getCategoryDescription(category);
              return (
                <div
                  key={`${category}-${index}`}
                  className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg group relative"
                  title={description || undefined}
                >
                  <span>{getCategoryLabel(category)}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(index)}
                    className="hover:bg-gray-700 rounded p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {description && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {description}
                    </div>
                  )}
                </div>
              );
            })}
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
                  key={category.value}
                  type="button"
                  onClick={() => addCategory(category)}
                  className="w-full text-left px-4 py-3 rounded-lg transition-colors hover:bg-gray-100 border border-transparent hover:border-gray-300"
                >
                  <div className="font-medium text-black">{category.label}</div>
                  {category.description && (
                    <div className="text-xs text-gray-600 mt-1">{category.description}</div>
                  )}
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
          <label className="block text-sm font-medium text-black mb-2">
            <Upload className="h-4 w-4 inline mr-2" />
            Загрузка материалов
          </label>
          
          {/* Список загруженных файлов */}
          {formData.materials.length > 0 && (
            <div className="mb-3 space-y-2">
              {formData.materials.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                  <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(formData.materials, index, 'materials')}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Красивая кнопка загрузки с drag and drop */}
          <label 
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-black hover:bg-gray-50 transition-colors"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const files = Array.from(e.dataTransfer.files);
              setFormData(prev => ({
                ...prev,
                materials: [...prev.materials, ...files]
              }));
            }}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Нажмите для загрузки</span> или перетащите файлы
              </p>
              <p className="text-xs text-gray-500">Можно выбрать несколько файлов</p>
            </div>
            <input
              type="file"
              id="materials"
              name="materials"
              onChange={handleInputChange}
              multiple
              className="hidden"
            />
          </label>
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
          <label className="block text-sm font-medium text-black mb-2">
            <Upload className="h-4 w-4 inline mr-2" />
            Загрузка референсов файлами
          </label>
          
          {/* Список загруженных файлов */}
          {formData.reference_files.length > 0 && (
            <div className="mb-3 space-y-2">
              {formData.reference_files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                  <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(formData.reference_files, index, 'reference_files')}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Красивая кнопка загрузки с drag and drop */}
          <label 
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-black hover:bg-gray-50 transition-colors"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const files = Array.from(e.dataTransfer.files);
              setFormData(prev => ({
                ...prev,
                reference_files: [...prev.reference_files, ...files]
              }));
            }}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Нажмите для загрузки</span> или перетащите файлы
              </p>
              <p className="text-xs text-gray-500">Можно выбрать несколько файлов</p>
            </div>
            <input
              type="file"
              id="reference_files"
              name="reference_files"
              onChange={handleInputChange}
              multiple
              className="hidden"
            />
          </label>
        </div>

        {/* Описание (Техническое задание) */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-black mb-2">
            <FileText className="h-4 w-4 inline mr-2" />
            Описание (Техническое задание)
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

        {/* Дополнительная информация для обратной связи */}
        <div>
          <label htmlFor="contact_info" className="block text-sm font-medium text-black mb-2">
            <Mail className="h-4 w-4 inline mr-2" />
            Дополнительная информация для обратной связи
          </label>
          <input
            type="text"
            id="contact_info"
            name="contact_info"
            value={formData.contact_info}
            onChange={handleInputChange}
            placeholder="Например: Telegram @username, WhatsApp +7..., или другой способ связи"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
          <p className="text-xs text-gray-500 mt-1">
            Укажите удобный способ связи (Telegram, WhatsApp, другой email и т.д.)
          </p>
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

        {/* Калькулятор стоимости - всегда отображается */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
          <h3 className="text-lg font-bold text-black mb-4">Расчет стоимости</h3>
          <div className="space-y-2">
            {formData.service_categories.length === 0 ? (
              <p className="text-gray-500 text-sm">Выберите услуги для расчета стоимости</p>
            ) : (
              <>
                {Object.entries(serviceCounts).map(([category, count]) => {
                  const isTrap = category === 'бит в стиле трэп';
                  const servicePrice = isTrap ? 15000 : getPrice(formData.deadline_days, formData.prepayment_percent);
                  const totalForService = servicePrice ? servicePrice * count : 0;
                  
                  if (!servicePrice && !isTrap) {
                    return (
                      <div key={category} className="flex justify-between text-gray-500">
                        <span>{category} × {count}:</span>
                        <span className="text-sm">Укажите срок выполнения</span>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={category} className="flex justify-between">
                      <span>{category} × {count}:</span>
                      <span className="font-medium">
                        {servicePrice?.toLocaleString('ru-RU')} ₽ × {count} = {totalForService.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  );
                })}
                {totalPrice > 0 && (
                  <>
                    <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                      <span>Итого:</span>
                      <span>{totalPrice.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 border-t pt-2 mt-2">
                      <span>Предоплата ({formData.prepayment_percent}%):</span>
                      <span className="font-medium">{prepaymentAmount.toLocaleString('ru-RU')} ₽</span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          
          {/* Информация о стоимости */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-sm text-gray-600">
            <span>*Стоимость услуг исходит от вида и количества услуг, срочности заказа и полноты оплаты</span>
            <div className="relative group">
              <HelpCircle className="h-4 w-4 text-gray-400 cursor-help flex-shrink-0" />
              <div className="absolute bottom-full right-0 mb-2 w-80 p-4 bg-black text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="space-y-3">
                  <div>
                    <div className="font-semibold mb-2">🟢 При 50% предоплате:</div>
                    <ul className="space-y-1 text-gray-300">
                      <li>• 2-3 недели: 25K</li>
                      <li>• 1-2 недели: 30K</li>
                      <li>• 1 неделя: 35K</li>
                      <li>• 2-3 дня: 40K</li>
                      <li>• 24 часа: 50K</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-2">🔴 При 100% предоплате:</div>
                    <ul className="space-y-1 text-gray-300">
                      <li>• 2-3 недели: 20K</li>
                      <li>• 1-2 недели: 25K</li>
                      <li>• 1 неделя: 30K</li>
                      <li>• 2-3 дня: 35K</li>
                      <li>• 24 часа: 45K</li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-gray-600">
                    <div className="font-semibold mb-1">✨ «Песня под ключ»:</div>
                    <div className="text-gray-300">Полное написание песни с мелодиями и текстом (можно без текста). Права переходят к заказчику, никаких указаний авторства!</div>
                  </div>
                  <div className="pt-2 border-t border-gray-600">
                    <div className="font-semibold mb-1">🎶 Бит в стиле трэп:</div>
                    <div className="text-gray-300">Простая трэпчага в стиле Travis Scott, Yeat, Lil Baby, Pop Smoke и др. — 15K</div>
                  </div>
                </div>
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
              </div>
            </div>
          </div>
        </div>

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
