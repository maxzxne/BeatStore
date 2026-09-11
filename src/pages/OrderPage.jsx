import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../utils/api';
import { checkoutErrorMessage, startCheckout } from '../utils/checkout';
import { Upload, Link as LinkIcon, FileText, Calendar, User, Mail, Phone, Plus, X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

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
  // Wizard steps for detailed form only: 1=contact, 2=services+deadline, 3=refs+review+submit
  const [wizardStep, setWizardStep] = useState(1);
  // Сворачиваемые блоки: пользователь свернут, если авторизован и поля предзаполнены
  const [userBlockOpen, setUserBlockOpen] = useState(true);
  const [orderInfoBlockOpen, setOrderInfoBlockOpen] = useState(true);

  const fieldClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';
  const cardClass = 'rounded-3xl border border-white/10 bg-white/[0.03]';
  const primaryBtnClass =
    'inline-flex h-12 w-full items-center justify-center rounded-full bg-[#22c55e] text-base font-semibold text-[#052e16] transition hover:brightness-110 disabled:opacity-60';
  const labelClass = 'mb-2 block text-sm font-medium text-white';
  const hintClass = 'mt-1 text-xs text-white/40';
  const accordionBtnClass =
    'flex w-full items-center justify-between rounded-2xl p-4 text-left transition-colors hover:bg-white/5';
  const secondaryBtnClass =
    'inline-flex h-12 flex-1 items-center justify-center rounded-full border border-white/15 bg-transparent text-base font-semibold text-white transition hover:bg-white/5 disabled:opacity-60';
  const [filesBlockOpen, setFilesBlockOpen] = useState(true);

  // Категории услуг с описаниями
  const serviceCategories = [
    { value: 'бит', label: 'Бит', description: null },
    { value: 'бит в стиле трэп', label: 'Бит (Type)', description: 'Простая трэпчага в стиле Travis Scott, Yeat, Lil Baby, Pop Smoke и др.' },
    { value: 'сведение', label: 'Сведение', description: null },
    { value: 'саунддизайн', label: 'Саунд-дизайн', description: null },
    { value: 'топлайны', label: 'Топ-лайны', description: null },
    { value: 'трек под ключ', label: 'Трек под ключ', description: 'Полное написание песни с мелодиями и текстом (можно без текста). Права переходят к заказчику, никаких указаний авторства!' },
    { value: 'запись индивидуального курса с объяснениями по проделанной работе', label: 'Запись индивидуального курса с объяснениями по проделанной работе', description: null }
  ];

  const servicePresets = [
    { label: 'Трэп бит', value: 'бит в стиле трэп' },
    { label: 'Песня под ключ', value: 'трек под ключ' },
    { label: 'Бит', value: 'бит' },
  ];

  const WIZARD_STEPS = [
    { n: 1, label: 'Контакты' },
    { n: 2, label: 'Услуги' },
    { n: 3, label: 'Итог' },
  ];

  const DEADLINE_OPTIONS = [
    { days: 21, label: '2–3 недели', hint: '14–21 день' },
    { days: 10, label: '1–2 недели', hint: '8–13 дней' },
    { days: 7, label: '7 дней', hint: 'неделя' },
    { days: 3, label: '2–3 дня', hint: 'быстрее' },
    { days: 1, label: '24 часа', hint: 'срочно' },
  ];

  const rub = (n) => `${Number(n).toLocaleString('ru-RU')} ₽`;

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
    if (days === 7) return priceMap['7'];
    if (days > 7 && days < 14) return priceMap['7-14'];
    if (days >= 2 && days <= 3) return priceMap['2-3'];
    if (days === 1) return priceMap['1'];
    
    // Если не попадает в диапазоны, возвращаем базовую цену
    return priceMap['14-21'];
  };

  const quoteTotal = (deadlineDays = formData.deadline_days, prepaymentPercent = formData.prepayment_percent) => {
    if (formData.service_categories.length === 0) return 0;
    let total = 0;
    formData.service_categories.forEach((category) => {
      if (category === 'бит в стиле трэп') {
        total += 15000;
        return;
      }
      if (!deadlineDays) return;
      const pricePerService = getPrice(deadlineDays, prepaymentPercent);
      if (pricePerService) total += pricePerService;
    });
    return total;
  };

  const calculateTotalPrice = () => quoteTotal();

  const needsDeadlineForPrice = formData.service_categories.some((category) => category !== 'бит в стиле трэп');

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

  // Автозаполнение данных из профиля для авторизованного пользователя (можно менять)
  React.useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        customer_name: prev.customer_name || user.username || '',
        customer_email: prev.customer_email || user.email || '',
        contact_info: prev.contact_info || user.additional_contact || ''
      }));
    }
  }, [isAuthenticated, user]);

  // Keep accordion open state synced with wizard step
  React.useEffect(() => {
    if (orderType !== 'know') return;
    setUserBlockOpen(wizardStep === 1);
    setOrderInfoBlockOpen(wizardStep === 2);
    setFilesBlockOpen(wizardStep === 3);
  }, [wizardStep, orderType]);

  const selectOrderType = (type) => {
    setOrderType(type);
    setWizardStep(1);
  };

  const goWizardNext = () => {
    if (wizardStep === 1) {
      if (!formData.customer_name || !formData.customer_email) {
        showError('Укажите ваше имя и email');
        return;
      }
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      if (formData.service_categories.length === 0) {
        showError('Выберите хотя бы одну категорию услуги');
        return;
      }
      if (!formData.deadline_days) {
        showError('Укажите срок выполнения заказа');
        return;
      }
      setWizardStep(3);
    }
  };

  const goWizardBack = () => {
    setWizardStep((s) => Math.max(1, s - 1));
  };

  const goToWizardStep = (n) => {
    if (n < 1 || n > 3 || n === wizardStep) return;
    if (n > wizardStep) {
      if (wizardStep === 1 && n >= 2) {
        if (!formData.customer_name || !formData.customer_email) {
          showError('Укажите ваше имя и email');
          return;
        }
      }
      if (n === 3) {
        if (formData.service_categories.length === 0) {
          showError('Выберите хотя бы одну категорию услуги');
          return;
        }
        if (!formData.deadline_days) {
          showError('Укажите срок выполнения заказа');
          return;
        }
      }
    }
    setWizardStep(n);
  };

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
      
      // Сбрасываем форму (для авторизованных сохраняем данные из профиля)
      setFormData({
        customer_name: isAuthenticated && user ? user.username || '' : '',
        customer_email: isAuthenticated && user ? user.email || '' : '',
        contact_info: isAuthenticated && user ? user.additional_contact || '' : '',
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
        try {
          await startCheckout({
            kind: 'order',
            order_id: orderId,
          });
        } catch (error) {
          showError(checkoutErrorMessage(error));
        }
      } else {
        showSuccess('Заказ успешно создан!');
        
        // Сбрасываем форму (для авторизованных сохраняем данные из профиля)
        setFormData({
          customer_name: isAuthenticated && user ? user.username || '' : '',
          customer_email: isAuthenticated && user ? user.email || '' : '',
          contact_info: isAuthenticated && user ? user.additional_contact || '' : '',
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
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Services</p>
          <h1 className="mt-2 font-[Syne] text-4xl font-extrabold text-white">Форма заказа услуг</h1>
          <p className="mt-2 text-sm text-white/50">Выберите тип заказа</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => selectOrderType("know")}
            className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-[#22c55e]/40"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="mb-2 font-[Syne] text-xl font-bold text-white">Я знаю, что я хочу!</h3>
                <p className="text-sm text-white/50">Заполните подробную форму с выбором услуг и расчетом стоимости</p>
              </div>
              <div className="text-2xl text-[#22c55e]">→</div>
            </div>
          </button>

          <button
            onClick={() => setOrderType("dont_know")}
            className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-[#22c55e]/40"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="mb-2 font-[Syne] text-xl font-bold text-white">Я не знаю, что я хочу!</h3>
                <p className="text-sm text-white/50">Отправьте простую заявку, мы свяжемся с вами для обсуждения</p>
              </div>
              <div className="text-2xl text-[#22c55e]">→</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Простая форма для "не знаю"
  if (orderType === "dont_know") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <button
            onClick={() => setOrderType(null)}
            className="mb-4 flex items-center border-none bg-transparent p-0 text-sm text-white/50 hover:text-white"
          >
            ← Назад к выбору типа заказа
          </button>
          <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Services</p>
          <h1 className="mt-2 font-[Syne] text-4xl font-extrabold text-white">Простая заявка</h1>
          <p className="mt-2 text-sm text-white/50">Заполните форму, и мы свяжемся с вами для обсуждения заказа</p>
        </div>

        <form onSubmit={handleSimpleSubmit} className="space-y-6">
          <div>
            <label htmlFor="customer_name" className={labelClass}>
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
              autoComplete="name"
              className={fieldClass}
              placeholder="Введите ваше имя"
            />
          </div>

          <div>
            <label htmlFor="customer_email" className={labelClass}>
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
              autoComplete="email"
              className={fieldClass}
              placeholder="Введите ваш email"
            />
          </div>

          <div>
            <label htmlFor="description" className={labelClass}>
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
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="contact_info" className={labelClass}>
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
              className={fieldClass}
            />
            <p className={hintClass}>
              Укажите удобный способ связи (Telegram, WhatsApp, другой email и т.д.)
            </p>
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2 text-xs text-white/50">
              <input
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-[#22c55e] focus:ring-[#22c55e]/40"
              />
              <span>
                Я подтверждаю, что ознакомился(ась) и принимаю условия{' '}
                <a
                  href="/terms"
                  className="text-[#22c55e] underline hover:opacity-80"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Пользовательского соглашения
                </a>{' '}
                и{' '}
                <a
                  href="/privacy"
                  className="text-[#22c55e] underline hover:opacity-80"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Политики конфиденциальности
                </a>
                , а также даю согласие на обработку моих персональных данных.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className={primaryBtnClass}
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
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <button
          onClick={() => setOrderType(null)}
          className="mb-4 flex items-center text-sm text-white/50 hover:text-white"
        >
          ← Назад к выбору типа заказа
        </button>
        <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Services</p>
        <h1 className="mt-2 font-[Syne] text-4xl font-extrabold text-white">Подробная форма заказа</h1>
        <p className="mt-2 text-sm text-white/50">Заполните форму для расчета стоимости и оформления заказа</p>
        <div className="mt-5 flex gap-2" role="tablist" aria-label="Шаги заказа">
          {WIZARD_STEPS.map((s) => {
            const current = wizardStep === s.n;
            const done = wizardStep > s.n;
            return (
              <button
                key={s.n}
                type="button"
                role="tab"
                aria-current={current ? 'step' : undefined}
                onClick={() => goToWizardStep(s.n)}
                className={`flex-1 rounded-full py-2 text-center text-xs font-semibold uppercase tracking-wide transition ${
                  current
                    ? 'bg-[#22c55e] text-[#052e16]'
                    : done
                      ? 'cursor-pointer border border-[#22c55e]/40 text-[#22c55e] hover:bg-[#22c55e]/10'
                      : 'cursor-pointer border border-white/10 text-white/35 hover:border-white/25 hover:text-white/60'
                }`}
              >
                {s.n}. {s.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-white/35">Можно вернуться на любой шаг — данные не сбросятся.</p>
      </div>

      <form onSubmit={handleDetailedSubmit} className="space-y-6">
        {/* Блок 1: Пользователь */}
        {wizardStep === 1 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03]">
          <button
            type="button"
            onClick={() => setUserBlockOpen(!userBlockOpen)}
            className={accordionBtnClass}
          >
            <h2 className="flex items-center gap-2 font-[Syne] text-lg font-semibold text-white">
              <User className="h-5 w-5" />
              Пользователь
            </h2>
            {userBlockOpen ? <ChevronUp className="h-5 w-5 text-white/50" /> : <ChevronDown className="h-5 w-5 text-white/50" />}
          </button>
          {userBlockOpen && (
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label htmlFor="customer_name" className={labelClass}>Ваше имя *</label>
                <input
                  type="text"
                  id="customer_name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  required
                  autoComplete="name"
                  className={fieldClass}
                  placeholder="Введите ваше имя"
                />
              </div>
              <div>
                <label htmlFor="customer_email" className={labelClass}>Email *</label>
                <input
                  type="email"
                  id="customer_email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleInputChange}
                  required
                  autoComplete="email"
                  className={fieldClass}
                  placeholder="Введите ваш email"
                />
              </div>
              <div>
                <label htmlFor="contact_info_detailed" className={labelClass}>Дополнительная связь (Telegram, WhatsApp и т.д.)</label>
                <input
                  type="text"
                  id="contact_info_detailed"
                  name="contact_info"
                  value={formData.contact_info}
                  onChange={handleInputChange}
                  placeholder="Например: @mytelegram, +79991234567"
                  className={fieldClass}
                />
                <p className={hintClass}>Укажите удобный способ связи</p>
              </div>
            </div>
          )}
        </div>
        )}

        {wizardStep === 1 && (
          <button type="button" onClick={goWizardNext} className={primaryBtnClass}>
            Далее — услуги
          </button>
        )}

        {/* Блок 2: Информация о заказе */}
        {wizardStep === 2 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03]">
          <button
            type="button"
            onClick={() => setOrderInfoBlockOpen(!orderInfoBlockOpen)}
            className={accordionBtnClass}
          >
            <h2 className="flex items-center gap-2 font-[Syne] text-lg font-semibold text-white">
              <FileText className="h-5 w-5" />
              Информация о заказе
            </h2>
            {orderInfoBlockOpen ? <ChevronUp className="h-5 w-5 text-white/50" /> : <ChevronDown className="h-5 w-5 text-white/50" />}
          </button>
          {orderInfoBlockOpen && (
            <div className="px-4 pb-4 space-y-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/40">Пресеты</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {servicePresets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    service_categories: prev.service_categories.includes(preset.value)
                      ? prev.service_categories
                      : [...prev.service_categories, preset.value],
                  }))
                }
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:border-[#22c55e]/40 hover:text-white"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        {/* Категории услуг с множественным выбором */}
        <div>
          <label className={labelClass}>
            Категории услуг *
          </label>
          
          {/* Выбранные категории */}
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.service_categories.map((category, index) => {
              const description = getCategoryDescription(category);
              return (
                <div
                  key={`${category}-${index}`}
                  className="group relative flex items-center gap-2 rounded-full bg-[#22c55e] px-4 py-2 text-[#052e16]"
                  title={description || undefined}
                >
                  <span>{getCategoryLabel(category)}</span>
                  {category === 'бит в стиле трэп' ? (
                    <span className="text-xs font-semibold opacity-70">15 000 ₽</span>
                  ) : formData.deadline_days && getPrice(formData.deadline_days, formData.prepayment_percent) ? (
                    <span className="text-xs font-semibold opacity-70">
                      {rub(getPrice(formData.deadline_days, formData.prepayment_percent))}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeCategory(index)}
                    className="hover:bg-white/10 rounded p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {description && (
                    <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-64 rounded-xl border border-white/10 bg-[#0a0a0a] p-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
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
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 px-4 py-2 text-white/70 transition-colors hover:border-[#22c55e]/40 hover:text-white"
            >
              <Plus className="h-5 w-5" />
              <span>Добавить категорию услуги</span>
            </button>
          )}

          {/* Список категорий для выбора */}
          {showCategorySelector && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              {serviceCategories.map(category => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => addCategory(category)}
                  className="w-full rounded-xl border border-transparent bg-white/5 px-4 py-3 text-left transition-colors hover:border-white/10 hover:bg-white/5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-medium text-white">{category.label}</div>
                    <div className="shrink-0 text-sm text-[#22c55e]">
                      {category.value === 'бит в стиле трэп'
                        ? '15 000 ₽'
                        : formData.deadline_days
                          ? rub(getPrice(formData.deadline_days, formData.prepayment_percent))
                          : 'от 20 000 ₽'}
                    </div>
                  </div>
                  {category.description && (
                    <div className="text-xs text-white/50 mt-1">{category.description}</div>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCategorySelector(false)}
                className="w-full mt-2 px-4 py-2 text-white/50 hover:text-white"
              >
                Отмена
              </button>
            </div>
          )}
        </div>

        {/* Срок выполнения — под категориями */}
        <div>
          <p className={labelClass}>
            <Calendar className="h-4 w-4 inline mr-2" />
            Срок выполнения *
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {DEADLINE_OPTIONS.map((option) => {
              const selected = Number(formData.deadline_days) === option.days;
              const preview = quoteTotal(option.days);
              const showMoney = formData.service_categories.length > 0 && (!needsDeadlineForPrice || preview > 0);
              return (
                <button
                  key={option.days}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, deadline_days: String(option.days) }))}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    selected
                      ? 'border-[#22c55e] bg-[#22c55e]/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-white">{option.label}</span>
                    {showMoney && (
                      <span className="text-sm font-semibold text-[#22c55e]">{rub(preview)}</span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/40">{option.hint}</span>
                </button>
              );
            })}
          </div>
          {formData.service_categories.length > 0 && needsDeadlineForPrice && !formData.deadline_days && (
            <p className="mt-2 text-xs text-[#22c55e]">Выбери срок — цена появится сразу на кнопках.</p>
          )}
          {formData.service_categories.length > 0 && !needsDeadlineForPrice && (
            <p className="mt-2 text-xs text-white/40">Трэп-бит всегда 15 000 ₽, срок на цену не влияет.</p>
          )}
        </div>

        <div>
          <p className={labelClass}>Предоплата</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 50, label: '50%', hint: 'остальное после' },
              { value: 100, label: '100%', hint: 'дешевле' },
            ].map((opt) => {
              const selected = formData.prepayment_percent === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, prepayment_percent: opt.value }))}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    selected
                      ? 'border-[#22c55e] bg-[#22c55e]/10'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                  }`}
                >
                  <span className="block text-sm font-semibold text-white">{opt.label}</span>
                  <span className="text-xs text-white/40">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Описание — после срока выполнения */}
        <div>
          <label htmlFor="description" className={labelClass}>
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
            className={fieldClass}
          />
        </div>
            </div>
          )}
        </div>
        )}

        {wizardStep === 2 && (
          <div className="space-y-3">
            <div
              className="rounded-3xl border border-[#22c55e]/25 bg-[#22c55e]/[0.07] p-4"
              role="status"
              aria-live="polite"
            >
              {formData.service_categories.length === 0 ? (
                <p className="text-sm text-white/50">Добавь услугу — сразу покажем цену.</p>
              ) : !formData.deadline_days && needsDeadlineForPrice ? (
                <p className="text-sm text-white/50">Выбери срок выше, чтобы увидеть сумму.</p>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#22c55e]">Сейчас выйдет</p>
                  <p className="mt-1 font-[Syne] text-3xl font-extrabold text-white">{rub(totalPrice)}</p>
                  <p className="mt-1 text-sm text-white/55">
                    Предоплата {formData.prepayment_percent}% · к оплате сейчас {rub(prepaymentAmount)}
                  </p>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={goWizardBack} className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-white/15 text-sm text-white hover:bg-white/5">
                К контактам
              </button>
              <button type="button" onClick={goWizardNext} className="inline-flex h-12 flex-[2] items-center justify-center rounded-full bg-[#22c55e] text-sm font-semibold text-[#052e16] hover:brightness-110">
                {totalPrice > 0 ? `Далее · ${rub(prepaymentAmount)}` : 'Далее — файлы'}
              </button>
            </div>
          </div>
        )}

        {/* Блок 3: Файлы и референсы */}
        {wizardStep === 3 && (
        <>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">Заказ</p>
              <p className="mt-1 text-sm text-white">
                {formData.service_categories.map(getCategoryLabel).join(', ')}
                {formData.deadline_days ? ` · ${formData.deadline_days} дн.` : ''}
              </p>
              {totalPrice > 0 && (
                <p className="mt-1 font-[Syne] text-xl font-bold text-[#22c55e]">{rub(totalPrice)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => goToWizardStep(2)}
              className="shrink-0 text-sm text-[#22c55e] hover:underline"
            >
              Изменить
            </button>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03]">
          <button
            type="button"
            onClick={() => setFilesBlockOpen(!filesBlockOpen)}
            className={accordionBtnClass}
          >
            <h2 className="flex items-center gap-2 font-[Syne] text-lg font-semibold text-white">
              <Upload className="h-5 w-5" />
              Файлы и референсы
            </h2>
            {filesBlockOpen ? <ChevronUp className="h-5 w-5 text-white/50" /> : <ChevronDown className="h-5 w-5 text-white/50" />}
          </button>
          {filesBlockOpen && (
            <div className="px-4 pb-4 space-y-4">
        {/* Загрузка материалов */}
        <div>
          <label className={labelClass}>
            <Upload className="h-4 w-4 inline mr-2" />
            Загрузка материалов
          </label>
          
          {/* Список загруженных файлов */}
          {formData.materials.length > 0 && (
            <div className="mb-3 space-y-2">
              {formData.materials.map((file, index) => (
                <div key={index} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                  <span className="text-sm text-white/70 truncate flex-1">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(formData.materials, index, 'materials')}
                    className="ml-2 text-red-400 hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Красивая кнопка загрузки с drag and drop */}
          <label 
            className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.03] transition-colors hover:border-[#22c55e]/40 hover:bg-white/5"
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
              <Upload className="h-8 w-8 text-white/40 mb-2" />
              <p className="mb-2 text-sm text-white/40">
                <span className="font-semibold">Нажмите для загрузки</span> или перетащите файлы
              </p>
              <p className="text-xs text-white/40">Можно выбрать несколько файлов</p>
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
          <label htmlFor="reference_links" className={labelClass}>
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
            className={fieldClass}
          />
        </div>

        {/* Загрузка референсов файлами */}
        <div>
          <label className={labelClass}>
            <Upload className="h-4 w-4 inline mr-2" />
            Загрузка референсов файлами
          </label>
          
          {/* Список загруженных файлов */}
          {formData.reference_files.length > 0 && (
            <div className="mb-3 space-y-2">
              {formData.reference_files.map((file, index) => (
                <div key={index} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                  <span className="text-sm text-white/70 truncate flex-1">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(formData.reference_files, index, 'reference_files')}
                    className="ml-2 text-red-400 hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Красивая кнопка загрузки с drag and drop */}
          <label 
            className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.03] transition-colors hover:border-[#22c55e]/40 hover:bg-white/5"
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
              <Upload className="h-8 w-8 text-white/40 mb-2" />
              <p className="mb-2 text-sm text-white/40">
                <span className="font-semibold">Нажмите для загрузки</span> или перетащите файлы
              </p>
              <p className="text-xs text-white/40">Можно выбрать несколько файлов</p>
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
            </div>
          )}
        </div>

        {/* Процент предоплаты и расчёт — вне блоков */}
        <div>
          <label className={labelClass}>
            Процент предоплаты *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center text-white/70">
              <input
                type="radio"
                name="prepayment_percent"
                value="50"
                checked={formData.prepayment_percent === 50}
                onChange={(e) => setFormData({ ...formData, prepayment_percent: parseInt(e.target.value) })}
                className="mr-2 accent-[#22c55e]"
              />
              <span>50% предоплата</span>
            </label>
            <label className="flex items-center text-white/70">
              <input
                type="radio"
                name="prepayment_percent"
                value="100"
                checked={formData.prepayment_percent === 100}
                onChange={(e) => setFormData({ ...formData, prepayment_percent: parseInt(e.target.value) })}
                className="mr-2 accent-[#22c55e]"
              />
              <span>100% предоплата</span>
            </label>
          </div>
        </div>

        {/* Калькулятор стоимости - всегда отображается */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="mb-4 font-[Syne] text-lg font-bold text-white">Расчет стоимости</h3>
          <div className="space-y-2">
            {formData.service_categories.length === 0 ? (
              <p className="text-white/40 text-sm">Выберите услуги для расчета стоимости</p>
            ) : (
              <>
                {Object.entries(serviceCounts).map(([category, count]) => {
                  const isTrap = category === 'бит в стиле трэп';
                  const servicePrice = isTrap ? 15000 : getPrice(formData.deadline_days, formData.prepayment_percent);
                  const totalForService = servicePrice ? servicePrice * count : 0;
                  
                  if (!servicePrice && !isTrap) {
                    return (
                      <div key={category} className="flex justify-between text-white/40">
                        <span>{category} × {count}:</span>
                        <span className="text-sm">Укажите срок выполнения</span>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={category} className="flex justify-between text-white">
                      <span>{category} × {count}:</span>
                      <span className="font-medium">
                        {servicePrice?.toLocaleString('ru-RU')} ₽ × {count} = {totalForService.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  );
                })}
                {totalPrice > 0 && (
                  <>
                    <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-lg font-bold text-white">
                      <span>Итого:</span>
                      <span>{totalPrice.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-sm text-white/50">
                      <span>Предоплата ({formData.prepayment_percent}%):</span>
                      <span className="font-medium">{prepaymentAmount.toLocaleString('ru-RU')} ₽</span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          
          {/* Информация о стоимости */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-sm text-white/50">
            <span>*Стоимость услуг исходит от вида и количества услуг, срочности заказа и полноты оплаты</span>
            <div className="relative group">
              <HelpCircle className="h-4 w-4 text-white/40 cursor-help flex-shrink-0" />
              <div className="invisible absolute bottom-full right-0 z-10 mb-2 w-80 rounded-xl border border-white/10 bg-[#0a0a0a] p-4 text-xs text-white opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="space-y-3">
                  <div>
                    <div className="font-semibold mb-2">🟢 При 50% предоплате:</div>
                    <ul className="space-y-1 text-white/70">
                      <li>• 2-3 недели: 25K</li>
                      <li>• 1-2 недели: 30K</li>
                      <li>• 1 неделя: 35K</li>
                      <li>• 2-3 дня: 40K</li>
                      <li>• 24 часа: 50K</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-2">🔴 При 100% предоплате:</div>
                    <ul className="space-y-1 text-white/70">
                      <li>• 2-3 недели: 20K</li>
                      <li>• 1-2 недели: 25K</li>
                      <li>• 1 неделя: 30K</li>
                      <li>• 2-3 дня: 35K</li>
                      <li>• 24 часа: 45K</li>
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <div className="font-semibold mb-1">✨ «Песня под ключ»:</div>
                    <div className="text-white/70">Полное написание песни с мелодиями и текстом (можно без текста). Права переходят к заказчику, никаких указаний авторства!</div>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <div className="font-semibold mb-1">🎶 Бит в стиле трэп:</div>
                    <div className="text-white/70">Простая трэпчага в стиле Travis Scott, Yeat, Lil Baby, Pop Smoke и др. — 15K</div>
                  </div>
                </div>
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#0a0a0a]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Чекбокс — перед кнопкой оформления */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => goToWizardStep(2)}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-white/15 text-sm text-white hover:bg-white/5"
          >
            Изменить услуги и срок
          </button>
        </div>

        <div className="pt-2">
          <label className="flex items-start gap-2 text-xs text-white/50">
            <input
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-[#22c55e] focus:ring-[#22c55e]/40"
            />
            <span>
              Я подтверждаю, что ознакомился(ась) и принимаю условия{' '}
              <a
                href="/terms"
                className="text-[#22c55e] underline hover:opacity-80"
                target="_blank"
                rel="noopener noreferrer"
              >
                Пользовательского соглашения
              </a>{' '}
              и{' '}
              <a
                href="/privacy"
                className="text-[#22c55e] underline hover:opacity-80"
                target="_blank"
                rel="noopener noreferrer"
              >
                Политики конфиденциальности
              </a>
              , а также даю согласие на обработку моих персональных данных.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={uploading || totalPrice === 0}
          className={primaryBtnClass}
        >
          {uploading ? 'Отправка...' : totalPrice > 0 ? `Оформить заказ (предоплата ${prepaymentAmount.toLocaleString('ru-RU')} ₽)` : 'Оформить заказ'}
        </button>
        </>
        )}
      </form>
    </div>
  );
};

export default OrderPage;


