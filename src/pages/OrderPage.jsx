import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { api } from '../utils/api';
import { checkoutErrorMessage, startCheckout, withPromo } from '../utils/checkout';
import {
  CONTACT_TYPES,
  contactsFromUser,
  emptyContactRow,
  formatContacts,
} from '../utils/contacts';
import {
  ADS_CUSTOM_MAX_DAYS,
  ADS_CUSTOM_MIN_DAYS,
  ADS_DURATION_PRESETS,
  formatAdsRub,
  parseCustomAdsDays,
  quoteAdsPeriod,
} from '../utils/adsPricing';
import {
  getServicePrice,
  normalizeServiceOrderPricing,
} from '../utils/serviceOrderPricing';
import OrderPricePolicy from '../components/OrderPricePolicy';
import {
  Upload,
  Link as LinkIcon,
  FileText,
  Calendar,
  User,
  Mail,
  Plus,
  X,
  Trash2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ClipboardList,
  MessageSquare,
  Megaphone,
} from 'lucide-react';
import { PromoCodeField } from '../v2/DiscountUi';
import { SectionClosed } from '../v2/SectionClosed';

const orderContactFromUser = (user) => {
  if (!user) return '';
  const formatted = formatContacts(contactsFromUser(user));
  if (formatted) return formatted;
  return user.additional_contact || '';
};

const rowsFromUser = (user) => {
  const existing = contactsFromUser(user);
  if (!existing.length) return [];
  return existing.map((c) => ({
    ...c,
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  }));
};

const ADS_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const OrderPage = ({ initialType = null }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const {
    adsOrdersEnabled,
    adsPricePerDay,
    adsSale,
    serviceOrderPricing,
    loading: settingsLoading,
  } = useSiteSettings();
  const wantsAds = initialType === 'ads' || searchParams.get('type') === 'ads';
  const [orderType, setOrderType] = useState(wantsAds ? 'ads' : null); // null, "know", "dont_know", "ads"
  const [adsCustomMode, setAdsCustomMode] = useState(false);
  const [adsCustomDays, setAdsCustomDays] = useState('');
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    contact_info: '', // Дополнительная информация для обратной связи (телеграм, почта и т.д.)
    service_categories: [], // Массив выбранных категорий (можно дублировать)
    materials: [], // Массив файлов материалов
    reference_links: '',
    reference_files: [], // Массив файлов референсов
    description: '',
    deadline_days: '21',
    prepayment_percent: 50 // 50 или 100
  });
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  // Wizard steps for detailed form only: 1=contact, 2=services+deadline, 3=refs+review+submit
  const [wizardStep, setWizardStep] = useState(1);
  // Сворачиваемые блоки: пользователь свернут, если авторизован и поля предзаполнены
  const [userBlockOpen, setUserBlockOpen] = useState(true);
  const [orderInfoBlockOpen, setOrderInfoBlockOpen] = useState(true);
  const [contactRows, setContactRows] = useState([]);
  const [contactsSeeded, setContactsSeeded] = useState(false);

  const fieldClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';
  const cardClass = 'rounded-3xl border border-white/10 bg-white/[0.03]';
  const sectionClass =
    'rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6';
  const primaryBtnClass =
    'inline-flex h-12 w-full items-center justify-center rounded-full bg-[#22c55e] text-base font-semibold text-[#052e16] transition hover:brightness-110 disabled:opacity-60';
  const labelClass = 'mb-2 block text-sm font-medium text-white';
  const hintClass = 'mt-1 text-xs text-white/40';
  const accordionBtnClass =
    'flex w-full items-center justify-between rounded-2xl p-4 text-left transition-colors hover:bg-white/5';
  const secondaryBtnClass =
    'inline-flex h-12 flex-1 items-center justify-center rounded-full border border-white/15 bg-transparent text-base font-semibold text-white transition hover:bg-white/5 disabled:opacity-60';
  const [filesBlockOpen, setFilesBlockOpen] = useState(true);
  const [adsImage, setAdsImage] = useState(null);
  const [adsPreviewUrl, setAdsPreviewUrl] = useState('');

  React.useEffect(() => {
    if (!adsImage) {
      setAdsPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(adsImage);
    setAdsPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [adsImage]);

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

  const servicePricing = normalizeServiceOrderPricing(serviceOrderPricing);

  const WIZARD_STEPS = [
    { n: 1, label: 'Контакты' },
    { n: 2, label: 'Услуги' },
    { n: 3, label: 'Итог' },
  ];

  const DEADLINE_OPTIONS = servicePricing.deadlines.map((row) => ({
    days: row.days,
    label: row.label,
    hint: row.hint,
  }));

  const rub = (n) => `${Number(n).toLocaleString('ru-RU')} ₽`;

  const getPrice = (deadlineDays, prepaymentPercent) => {
    if (!deadlineDays) return null;
    return getServicePrice(servicePricing, deadlineDays, prepaymentPercent);
  };

  const quoteTotal = (deadlineDays = formData.deadline_days, prepaymentPercent = formData.prepayment_percent) => {
    if (formData.service_categories.length === 0) return 0;
    let total = 0;
    formData.service_categories.forEach((category) => {
      if (category === 'бит в стиле трэп') {
        total += servicePricing.trap_price;
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
        contact_info: prev.contact_info || orderContactFromUser(user)
      }));
      if (!contactsSeeded) {
        setContactRows(rowsFromUser(user));
        setContactsSeeded(true);
      }
    }
  }, [isAuthenticated, user, contactsSeeded]);

  const addContactRow = () => {
    setContactRows((prev) => [...prev, emptyContactRow()]);
  };

  const updateContactRow = (key, patch) => {
    setContactRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  };

  const removeContactRow = (key) => {
    setContactRows((prev) => prev.filter((row) => row.key !== key));
  };

  const resetSimpleForm = () => {
    setFormData({
      customer_name: isAuthenticated && user ? user.username || '' : '',
      customer_email: isAuthenticated && user ? user.email || '' : '',
      contact_info: isAuthenticated && user ? orderContactFromUser(user) : '',
      service_categories: [],
      materials: [],
      reference_links: '',
      reference_files: [],
      description: '',
      deadline_days: '21',
      prepayment_percent: 50
    });
    setContactRows(isAuthenticated && user ? rowsFromUser(user) : []);
    setContactsSeeded(true);
    setAdsCustomMode(false);
    setAdsCustomDays('');
  };

  // Keep accordion open state synced with wizard step
  React.useEffect(() => {
    if (orderType !== 'know') return;
    setUserBlockOpen(wizardStep === 1);
    setOrderInfoBlockOpen(wizardStep === 2);
    setFilesBlockOpen(wizardStep === 3);
  }, [wizardStep, orderType]);

  const selectOrderType = (type) => {
    if (type === 'ads') {
      navigate('/order/ads');
      setOrderType('ads');
      return;
    }
    setOrderType(type);
    setWizardStep(1);
  };

  const backToChoice = () => {
    setOrderType(null);
    setAdsImage(null);
    if (initialType === 'ads' || window.location.pathname === '/order/ads' || searchParams.get('type') === 'ads') {
      navigate('/order');
    }
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
      if (!(formData.description || '').trim()) {
        showError('Заполните техническое задание');
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
        if (!(formData.description || '').trim()) {
          showError('Заполните техническое задание');
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

      const contact_info = formatContacts(contactRows) || null;
      
      const orderData = {
        order_type: "dont_know",
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        description: formData.description || "Пользователь не знает, что хочет. Требуется обсуждение.",
        contact_info
      };

      await api.post('/service-orders', orderData);
      showSuccess('Заявка успешно отправлена! Мы свяжемся с вами для обсуждения заказа.');
      
      resetSimpleForm();
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

    if (!(formData.description || '').trim()) {
      showError('Заполните техническое задание');
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
          await startCheckout(withPromo({
            kind: 'order',
            order_id: orderId,
          }, promoCode));
        } catch (error) {
          showError(checkoutErrorMessage(error));
        }
      } else {
        showSuccess('Заказ успешно создан!');
        
        // Сбрасываем форму (для авторизованных сохраняем данные из профиля)
        setFormData({
          customer_name: isAuthenticated && user ? user.username || '' : '',
          customer_email: isAuthenticated && user ? user.email || '' : '',
          contact_info: isAuthenticated && user ? orderContactFromUser(user) : '',
          service_categories: [],
          materials: [],
          reference_links: '',
          reference_files: [],
          description: '',
          deadline_days: '21',
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

  const handleAdsImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ADS_IMAGE_TYPES.includes(file.type)) {
      showError('Нужен JPEG, PNG или WebP');
      event.target.value = '';
      return;
    }
    setAdsImage(file);
  };

  const handleAdsSubmit = async (e) => {
    e.preventDefault();

    if (!adsOrdersEnabled) {
      showError('Заказ рекламы сейчас выключен');
      return;
    }

    if (!isAuthenticated) {
      showError('Войдите, чтобы отправить заявку на рекламу');
      navigate('/login', { state: { from: '/order/ads' } });
      return;
    }

    if (!formData.customer_name || !formData.customer_email) {
      showError('Укажите ваше имя и email');
      return;
    }

    const destination = (formData.reference_links || '').trim();
    if (!destination) {
      showError('Укажите ссылку, куда ведёт баннер');
      return;
    }

    if (!adsImage) {
      showError('Загрузите картинку баннера 16:9');
      return;
    }

    let deadlineDays = null;
    if (adsCustomMode) {
      deadlineDays = parseCustomAdsDays(adsCustomDays);
      if (!deadlineDays) {
        showError(`Укажите срок от ${ADS_CUSTOM_MIN_DAYS} до ${ADS_CUSTOM_MAX_DAYS} дней`);
        return;
      }
    } else {
      deadlineDays = parseInt(formData.deadline_days, 10);
      if (!Number.isFinite(deadlineDays) || deadlineDays <= 0) {
        showError('Выберите срок размещения');
        return;
      }
    }

    try {
      setUploading(true);
      const materialsFormData = new FormData();
      materialsFormData.append('file', adsImage);
      const materialsResponse = await api.post('/upload-materials', materialsFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const caption = (formData.description || '').trim();
      const contact_info = formatContacts(contactRows) || null;
      const normalizedLink = /^https?:\/\//i.test(destination) ? destination : `https://${destination}`;
      const priced = quoteAdsPeriod(deadlineDays, adsPricePerDay, adsSale);

      await api.post('/ad-orders', {
        image_url: materialsResponse.data.url,
        link_url: normalizedLink,
        caption: caption || null,
        days: deadlineDays,
        contact_info,
      });

      showSuccess(
        priced.pay != null
          ? `Заявка отправлена. Ориентир ${formatAdsRub(priced.pay)} — после модерации можно оплатить.`
          : 'Заявка на рекламу отправлена. После модерации можно будет оплатить.'
      );
      resetSimpleForm();
      setAdsImage(null);
      navigate('/purchases');
    } catch (error) {
      console.error('Error creating ads order:', error);
      showError(error.response?.data?.detail || 'Ошибка при создании заявки');
    } finally {
      setUploading(false);
    }
  };

  if (settingsLoading && wantsAds) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-white/40">
        Загрузка…
      </div>
    );
  }

  if (!settingsLoading && wantsAds && !adsOrdersEnabled) {
    return (
      <SectionClosed
        title="Реклама недоступна"
        message="Заказ рекламы на витрине сейчас выключен. Даже по прямой ссылке форма не открывается."
      />
    );
  }

  // Если тип заказа не выбран
  if (orderType === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Services</p>
          <h1 className="mt-2 font-[Syne] text-4xl font-extrabold text-white">Заказать услугу</h1>
          <p className="mt-2 text-sm text-white/50">Подробный расчёт, короткая заявка или реклама на витрине</p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => selectOrderType("know")}
            className="group w-full rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-[#22c55e]/50 hover:bg-[#22c55e]/[0.04]"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e]">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-[Syne] text-xl font-bold text-white">Знаю, что нужно</h3>
                  <span className="rounded-full border border-[#22c55e]/35 bg-[#22c55e]/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[#22c55e]">
                    Подробно
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-white/50">
                  Услуги, срок и предоплата — сразу видна стоимость
                </p>
              </div>
              <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-[#22c55e] transition group-hover:translate-x-0.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setOrderType("dont_know")}
            className="group w-full rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-white/25 hover:bg-white/[0.05]"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white/70">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-[Syne] text-xl font-bold text-white">Пока не уверен</h3>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white/55">
                    Быстро
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-white/50">
                  Короткая заявка — обсудим детали в переписке
                </p>
              </div>
              <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
            </div>
          </button>

          {adsOrdersEnabled && (
            <button
              type="button"
              onClick={() => selectOrderType('ads')}
              className="group w-full rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-white/25 hover:bg-white/[0.05]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white/70">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-[Syne] text-xl font-bold text-white">Заказать рекламу</h3>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white/55">
                      Витрина
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/50">
                    Баннер 16:9 на главной — заявка, стоимость пришлём отдельно
                  </p>
                </div>
                <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (orderType === 'ads') {
    const contactPreview = formatContacts(contactRows);
    const previewCaption = (formData.description || '').trim();
    const previewLink = (formData.reference_links || '').trim();

    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <button
            type="button"
            onClick={backToChoice}
            className="mb-4 inline-flex min-h-11 items-center border-none bg-transparent p-0 text-sm text-white/50 hover:text-white"
          >
            ← Назад к выбору
          </button>
          <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Ads</p>
          <h1 className="mt-2 font-[Syne] text-4xl font-extrabold text-white">Реклама на витрине</h1>
          <p className="mt-2 text-sm text-white/50">
            Картинка 16:9, ссылка и срок. Цена = дни × {formatAdsRub(adsPricePerDay)}/день
            {adsSale ? ' с учётом акции' : ''}. После модерации — оплата и публикация.
            {adsSale ? (
              <span className="mt-1 block text-[#22c55e]">
                Акция
                {adsSale.title ? `: ${adsSale.title}` : ''}
                {' — '}
                {adsSale.kind === 'amount'
                  ? `−${Number(adsSale.value).toLocaleString('ru-RU')} ₽`
                  : `−${adsSale.value}%`}
              </span>
            ) : null}
          </p>
          {!isAuthenticated ? (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Нужен вход.{' '}
              <button
                type="button"
                className="font-semibold text-[#22c55e] underline"
                onClick={() => navigate('/login', { state: { from: '/order/ads' } })}
              >
                Войти
              </button>
              , затем отправить заявку.
            </div>
          ) : null}
        </div>

        <form onSubmit={handleAdsSubmit} className="space-y-5">
          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-2">
              <User className="h-4 w-4 text-[#22c55e]" />
              <h2 className="font-[Syne] text-lg font-bold text-white">Контакты</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="ads_customer_name" className={labelClass}>Имя *</label>
                <input
                  type="text"
                  id="ads_customer_name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  required
                  autoComplete="name"
                  className={fieldClass}
                  placeholder="Как к тебе обращаться"
                />
              </div>
              <div>
                <label htmlFor="ads_customer_email" className={labelClass}>
                  <Mail className="mr-2 inline h-4 w-4" />
                  Email *
                </label>
                <input
                  type="email"
                  id="ads_customer_email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleInputChange}
                  required
                  autoComplete="email"
                  className={fieldClass}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-2 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#22c55e]" />
              <h2 className="font-[Syne] text-lg font-bold text-white">Связь</h2>
            </div>
            <p className="mb-5 text-xs text-white/40">Telegram, WhatsApp — необязательно, но так быстрее ответим.</p>
            <div className="space-y-3">
              {contactRows.length === 0 && (
                <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/40">
                  Пока пусто. Добавь удобный канал.
                </p>
              )}
              {contactRows.map((row) => {
                const meta = CONTACT_TYPES.find((t) => t.value === row.type) || CONTACT_TYPES[5];
                return (
                  <div
                    key={row.key}
                    className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[140px_1fr_auto] sm:items-center"
                  >
                    <label className="sr-only" htmlFor={`ads-contact-type-${row.key}`}>Тип связи</label>
                    <select
                      id={`ads-contact-type-${row.key}`}
                      value={row.type}
                      onChange={(e) => updateContactRow(row.key, { type: e.target.value })}
                      className={`${fieldClass} cursor-pointer`}
                    >
                      {CONTACT_TYPES.map((t) => (
                        <option key={t.value} value={t.value} className="bg-[#0a0a0a]">
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateContactRow(row.key, { value: e.target.value })}
                      placeholder={meta.placeholder}
                      className={fieldClass}
                      aria-label={`Значение ${meta.label}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeContactRow(row.key)}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/10 text-white/50 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 sm:w-11"
                      aria-label="Удалить контакт"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addContactRow}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-medium text-white transition hover:bg-white/5"
            >
              <Plus className="h-4 w-4" />
              Добавить связь
            </button>
            {contactPreview ? (
              <p className="mt-3 text-xs text-white/35">В заявке: {contactPreview}</p>
            ) : null}
          </section>

          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#22c55e]" />
              <h2 className="font-[Syne] text-lg font-bold text-white">Баннер</h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              {adsPreviewUrl ? (
                <div className="relative">
                  <img src={adsPreviewUrl} alt="Предпросмотр баннера" className="v2-promo-img" />
                  {previewCaption ? <div className="v2-promo-caption">{previewCaption}</div> : null}
                </div>
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 px-6 text-center">
                  <Upload className="h-6 w-6 text-white/35" aria-hidden="true" />
                  <p className="text-sm text-white/45">Предпросмотр 16:9 появится после загрузки</p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label htmlFor="ads_banner" className={labelClass}>Картинка 16:9 *</label>
              <input
                type="file"
                id="ads_banner"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAdsImageChange}
                className="block w-full text-sm text-white/60 file:mr-4 file:inline-flex file:h-11 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#22c55e] file:px-4 file:text-sm file:font-semibold file:text-[#052e16]"
              />
              <p className={hintClass}>JPEG, PNG или WebP. Лучше сразу кадр 16:9 — так баннер не обрежется.</p>
              {adsImage ? (
                <p className="mt-2 text-xs text-white/45">{adsImage.name}</p>
              ) : null}
            </div>

            <div className="mt-4">
              <label htmlFor="ads_link" className={labelClass}>
                <LinkIcon className="mr-2 inline h-4 w-4" />
                Ссылка по клику *
              </label>
              <input
                type="text"
                id="ads_link"
                name="reference_links"
                value={formData.reference_links}
                onChange={handleInputChange}
                required
                inputMode="url"
                autoComplete="url"
                className={fieldClass}
                placeholder="https://example.com"
              />
              {previewLink ? (
                <p className={hintClass}>Ведёт на: {previewLink}</p>
              ) : (
                <p className={hintClass}>Куда откроется баннер на главной.</p>
              )}
            </div>

            <div className="mt-4">
              <label htmlFor="ads_caption" className={labelClass}>Подпись на баннере</label>
              <input
                type="text"
                id="ads_caption"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                maxLength={80}
                className={fieldClass}
                placeholder="Короткий текст поверх картинки"
              />
              <p className={hintClass}>Необязательно. До 80 символов.</p>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#22c55e]" />
              <h2 className="font-[Syne] text-lg font-bold text-white">Срок размещения</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {ADS_DURATION_PRESETS.map((option) => {
                const selected =
                  !adsCustomMode && String(formData.deadline_days) === String(option.days);
                const priced = quoteAdsPeriod(option.days, adsPricePerDay, adsSale);
                const onSale = priced.pay != null && priced.list != null && priced.pay < priced.list;
                return (
                  <button
                    key={option.days}
                    type="button"
                    onClick={() => {
                      setAdsCustomMode(false);
                      setAdsCustomDays('');
                      setFormData((prev) => ({ ...prev, deadline_days: String(option.days) }));
                    }}
                    className={`inline-flex min-h-11 min-w-[7.5rem] flex-col items-start justify-center rounded-2xl border px-4 py-2 text-left transition ${
                      selected
                        ? 'border-[#22c55e]/50 bg-[#22c55e]/10 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25'
                    }`}
                    aria-pressed={selected}
                  >
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="text-[11px] text-white/40">{option.hint}</span>
                    {priced.pay != null ? (
                      <span className="mt-1 text-xs font-medium text-white/80">
                        {onSale ? (
                          <>
                            <span className="mr-1.5 text-white/35 line-through">
                              {formatAdsRub(priced.list)}
                            </span>
                            <span className="text-[#22c55e]">{formatAdsRub(priced.pay)}</span>
                          </>
                        ) : (
                          formatAdsRub(priced.pay)
                        )}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setAdsCustomMode(true);
                  setFormData((prev) => ({ ...prev, deadline_days: '' }));
                }}
                className={`inline-flex min-h-11 min-w-[7.5rem] flex-col items-start justify-center rounded-2xl border px-4 py-2 text-left transition ${
                  adsCustomMode
                    ? 'border-[#22c55e]/50 bg-[#22c55e]/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25'
                }`}
                aria-pressed={adsCustomMode}
              >
                <span className="text-sm font-semibold">Свой срок</span>
                <span className="text-[11px] text-white/40">до {ADS_CUSTOM_MAX_DAYS} дней</span>
                {(() => {
                  const d = parseCustomAdsDays(adsCustomDays);
                  const priced = d ? quoteAdsPeriod(d, adsPricePerDay, adsSale) : null;
                  if (!priced?.pay) {
                    return <span className="mt-1 text-xs font-medium text-white/50">укажите дни</span>;
                  }
                  return (
                    <span className="mt-1 text-xs font-medium text-white/80">
                      ≈ {formatAdsRub(priced.pay)}
                    </span>
                  );
                })()}
              </button>
            </div>
            {adsCustomMode ? (
              <div className="mt-4 max-w-xs">
                <label htmlFor="ads_custom_days" className={labelClass}>
                  Сколько дней *
                </label>
                <input
                  id="ads_custom_days"
                  type="number"
                  min={ADS_CUSTOM_MIN_DAYS}
                  max={ADS_CUSTOM_MAX_DAYS}
                  value={adsCustomDays}
                  onChange={(e) => setAdsCustomDays(e.target.value)}
                  className={fieldClass}
                  placeholder="например 60"
                  required
                />
                <p className={hintClass}>
                  От {ADS_CUSTOM_MIN_DAYS} до {ADS_CUSTOM_MAX_DAYS}. Примерная сумма = дни × ставка за день.
                </p>
              </div>
            ) : null}
          </section>

          <div className="pt-1">
            <label className="flex items-start gap-2 text-xs text-white/50">
              <input
                type="checkbox"
                required
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-[#22c55e] focus:ring-[#22c55e]/40"
              />
              <span>
                Я подтверждаю, что ознакомился(ась) и принимаю условия{' '}
                <a href="/terms" className="text-[#22c55e] underline hover:opacity-80" target="_blank" rel="noopener noreferrer">
                  Пользовательского соглашения
                </a>
                {' '}и{' '}
                <a href="/privacy" className="text-[#22c55e] underline hover:opacity-80" target="_blank" rel="noopener noreferrer">
                  Политики конфиденциальности
                </a>
                , а также даю согласие на обработку моих персональных данных.
              </span>
            </label>
          </div>

          <button type="submit" disabled={uploading} className={primaryBtnClass}>
            {uploading ? 'Отправляем…' : 'Отправить заявку'}
          </button>
        </form>
      </div>
    );
  }

  // Простая форма для "не знаю"
  if (orderType === "dont_know") {
    const contactPreview = formatContacts(contactRows);

    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => setOrderType(null)}
            className="mb-4 flex items-center border-none bg-transparent p-0 text-sm text-white/50 hover:text-white"
          >
            ← Назад к выбору
          </button>
          <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Services</p>
          <h1 className="mt-2 font-[Syne] text-4xl font-extrabold text-white">Простая заявка</h1>
          <p className="mt-2 text-sm text-white/50">Контакты и коротко — что нужно. Остальное обсудим.</p>
        </div>

        <form onSubmit={handleSimpleSubmit} className="space-y-5">
          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-2">
              <User className="h-4 w-4 text-[#22c55e]" />
              <h2 className="font-[Syne] text-lg font-bold text-white">Контакты</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="customer_name" className={labelClass}>
                  Имя *
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
                  placeholder="Как к тебе обращаться"
                />
              </div>

              <div>
                <label htmlFor="customer_email" className={labelClass}>
                  <Mail className="mr-2 inline h-4 w-4" />
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
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-2 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#22c55e]" />
              <h2 className="font-[Syne] text-lg font-bold text-white">Связь</h2>
            </div>
            <p className="mb-5 text-xs text-white/40">
              Telegram, WhatsApp и т.д. — необязательно, но так быстрее ответим.
            </p>

            <div className="space-y-3">
              {contactRows.length === 0 && (
                <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/40">
                  Пока пусто. Добавь удобный канал.
                </p>
              )}

              {contactRows.map((row) => {
                const meta = CONTACT_TYPES.find((t) => t.value === row.type) || CONTACT_TYPES[5];
                return (
                  <div
                    key={row.key}
                    className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 sm:grid-cols-[140px_1fr_auto] sm:items-center"
                  >
                    <label className="sr-only" htmlFor={`order-contact-type-${row.key}`}>
                      Тип связи
                    </label>
                    <select
                      id={`order-contact-type-${row.key}`}
                      value={row.type}
                      onChange={(e) => updateContactRow(row.key, { type: e.target.value })}
                      className={`${fieldClass} cursor-pointer`}
                    >
                      {CONTACT_TYPES.map((t) => (
                        <option key={t.value} value={t.value} className="bg-[#0a0a0a]">
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateContactRow(row.key, { value: e.target.value })}
                      placeholder={meta.placeholder}
                      className={fieldClass}
                      aria-label={`Значение ${meta.label}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeContactRow(row.key)}
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/10 text-white/50 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 sm:w-11"
                      aria-label="Удалить контакт"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addContactRow}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-medium text-white transition hover:bg-white/5"
            >
              <Plus className="h-4 w-4" />
              Добавить связь
            </button>

            {contactPreview ? (
              <p className="mt-3 text-xs text-white/35">В заявке: {contactPreview}</p>
            ) : null}
          </section>

          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#22c55e]" />
              <h2 className="font-[Syne] text-lg font-bold text-white">О заказе</h2>
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                Что нужно
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Бит, сведение, трек под ключ — или просто «хочу обсудить»"
                rows={4}
                className={fieldClass}
              />
              <p className={hintClass}>Можно оставить пустым — напишем сами.</p>
            </div>
          </section>

          <div className="pt-1">
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
        <OrderPricePolicy
          pricing={servicePricing}
          selectedDays={formData.deadline_days}
          prepaymentPercent={formData.prepayment_percent}
          onSelectDays={(days) => setFormData((prev) => ({ ...prev, deadline_days: days }))}
        />
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
                    <span className="text-xs font-semibold opacity-70">
                      {rub(servicePricing.trap_price)}
                    </span>
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
                        ? rub(servicePricing.trap_price)
                        : formData.deadline_days
                          ? rub(getPrice(formData.deadline_days, formData.prepayment_percent))
                          : `от ${rub(Math.min(servicePricing.trap_price, ...servicePricing.deadlines.flatMap((r) => [r.price_50, r.price_100])))}`}
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
            <p className="mt-2 text-xs text-white/40">
              Трэп-бит всегда {rub(servicePricing.trap_price)}, срок на цену не влияет.
            </p>
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
            Техническое задание *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Опишите ваши требования..."
            rows={6}
            required
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
                  const servicePrice = isTrap ? servicePricing.trap_price : getPrice(formData.deadline_days, formData.prepayment_percent);
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

        {totalPrice > 0 && (
          <PromoCodeField value={promoCode} onChange={setPromoCode} className="mt-6" />
        )}

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


