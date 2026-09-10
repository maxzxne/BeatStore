import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { useNotification } from '../contexts/NotificationContext';
import BeatCardV2 from '../v2/BeatCardV2';
import { api, buildMediaUrl } from '../utils/api';
import { checkoutErrorMessage, startCheckout } from '../utils/checkout';
import { loginPath } from '../utils/authRedirect';
import { formatMoscowDate } from '../utils/dateUtils';
import { ruCount } from '../utils/ruPlural';
import { Play, Pause, Download, CheckCircle, Video, Clock, DollarSign, FileText, Music, FileAudio, HelpCircle } from 'lucide-react';

const PurchasesPage = () => {
  const { isAuthenticated } = useAuth();
  const { playTrack, isCurrentTrackPlaying, pauseTrack, resumeTrack, isCurrentTrack } = useAudioPlayer();
  const { showError } = useNotification();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchases, setPurchases] = useState([]);
  const [coursePurchases, setCoursePurchases] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === 'orders' || tabFromUrl === 'courses' || tabFromUrl === 'beats' ? tabFromUrl : 'beats'
  );

  useEffect(() => {
    if (tabFromUrl === 'orders' || tabFromUrl === 'courses' || tabFromUrl === 'beats') {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'beats' ? {} : { tab });
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPurchases();
      fetchCoursePurchases();
      fetchServiceOrders();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchPurchases = async () => {
    try {
      const response = await api.get('/purchases');
      setPurchases(response.data);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  const fetchCoursePurchases = async () => {
    try {
      const response = await api.get('/course-purchases');
      setCoursePurchases(response.data);
    } catch (error) {
      console.error('Error fetching course purchases:', error);
    }
  };

  const fetchServiceOrders = async () => {
    try {
      const response = await api.get('/service-orders');
      setServiceOrders(response.data);
    } catch (error) {
      console.error('Error fetching service orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (beatId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // Получаем файл через API с авторизацией
      const response = await api.get(`/beats/${beatId}/download`, {
        responseType: 'blob'
      });
      
      // Создаем blob URL
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      
      // Создаем временную ссылку для скачивания
      const link = document.createElement('a');
      link.href = url;
      link.download = `beat_${beatId}_full.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Освобождаем память
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading beat:', error);
      alert('Ошибка скачивания');
    }
  };

  const handleDownloadCourse = async (courseId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await api.get(`/courses/${courseId}/download`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `course_${courseId}_full.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading course:', error);
      alert('Ошибка скачивания');
    }
  };

  const handlePlay = async (beat, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // Получаем URL полного файла
      const fullUrl = buildMediaUrl(beat.full_audio_url);
      
      // Проверяем, играет ли уже этот трек
      const isPlaying = isCurrentTrackPlaying(beat.id);
      if (isPlaying) {
        pauseTrack();
      } else {
        const coverUrl = beat.cover_url ? buildMediaUrl(beat.cover_url) : null;
        playTrack(beat.id, fullUrl, beat.title, coverUrl);
      }
    } catch (error) {
      console.error('Error playing beat:', error);
      alert('Ошибка воспроизведения');
    }
  };

  const handlePlayCourse = async (course, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // Для курсов используем полное видео для воспроизведения
      const fullUrl = buildMediaUrl(course.full_video_url);
      
      const isPlaying = isCurrentTrackPlaying(`course_${course.id}`);
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(`course_${course.id}`, fullUrl, course.title);
      }
    } catch (error) {
      console.error('Error playing course:', error);
      alert('Ошибка воспроизведения');
    }
  };

  const tabClass = (active) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
      active ? 'bg-[#22c55e] text-[#0f172a]' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
    }`;

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-white/30" />
          <h1 className="font-[Syne] text-2xl font-extrabold text-white">Войдите для просмотра покупок</h1>
          <p className="mt-2 text-sm text-white/50">Вам нужно войти в систему, чтобы увидеть купленные биты.</p>
          <Link
            to={loginPath('/purchases')}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#22c55e] px-6 text-sm font-semibold text-[#0f172a] transition hover:brightness-110"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex h-64 items-center justify-center">
          <div className="text-sm text-white/50">Загрузка покупок...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Library</p>
        <h1 className="mt-2 font-[Syne] text-4xl font-extrabold text-white">Ваши покупки</h1>
        
        {/* Табы для переключения между битами, курсами и заказами */}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => selectTab('beats')}
            className={tabClass(activeTab === 'beats')}
          >
            Биты ({purchases.length})
          </button>
          <button
            onClick={() => selectTab('courses')}
            className={tabClass(activeTab === 'courses')}
          >
            Курсы ({coursePurchases.length})
          </button>
          <button
            onClick={() => selectTab('orders')}
            className={tabClass(activeTab === 'orders')}
          >
            Заказы ({serviceOrders.length})
          </button>
        </div>
      </div>

      {activeTab === 'beats' ? (
        purchases.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-white/30" />
            <div className="font-[Syne] text-xl font-bold text-white">Покупок битов пока нет</div>
            <p className="mt-2 text-sm text-white/50">
              Начните покупать биты, чтобы увидеть их здесь
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#22c55e] px-6 text-sm font-semibold text-[#0f172a] transition hover:brightness-110"
            >
              Смотреть биты
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {purchases.map((beat, i) => (
              <div key={beat.id} className="relative">
                <BeatCardV2 beat={beat} isPurchased delay={i * 40} />
                <button
                  type="button"
                  onClick={(e) => handleDownload(beat.id, e)}
                  className="absolute bottom-4 right-4 z-20 rounded-full border border-white/15 bg-black/60 p-2 text-white/80 backdrop-blur hover:bg-white/10 hover:text-white"
                  title="Скачать"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'courses' ? (
        coursePurchases.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-white/30" />
            <div className="font-[Syne] text-xl font-bold text-white">Покупок курсов пока нет</div>
            <p className="mt-2 text-sm text-white/50">
              Начните покупать курсы, чтобы увидеть их здесь
            </p>
            <Link
              to="/courses"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#22c55e] px-6 text-sm font-semibold text-[#0f172a] transition hover:brightness-110"
            >
              Смотреть курсы
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {coursePurchases.map(course => (
              <Link key={course.id} to={`/course/${course.id}`} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:border-[#22c55e]/40">
                <div className="relative">
                  {course.preview_video_url ? (
                    <div className="relative flex h-48 w-full items-center justify-center overflow-hidden bg-black">
                      <video
                        src={buildMediaUrl(course.preview_video_url)}
                        className="h-full w-full object-cover"
                        muted
                        loop
                      />
                      {/* Play button overlay - показывается при наведении вместо кнопки скачать */}
                      <button
                        onClick={(e) => handlePlayCourse(course, e)}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <div className="rounded-full bg-[#22c55e] p-3 text-[#0f172a]">
                          {isCurrentTrackPlaying(`course_${course.id}`) ? (
                            <Pause className="h-6 w-6" />
                          ) : (
                            <Play className="h-6 w-6" />
                          )}
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="relative flex h-48 w-full items-center justify-center overflow-hidden bg-white/5">
                      <div className="relative z-10 text-center">
                        <Video className="mx-auto mb-2 h-8 w-8 text-white/40" />
                        <span className="text-sm font-medium text-white/40">Курс</span>
                      </div>
                      {/* Play button overlay */}
                      <button
                        onClick={(e) => handlePlayCourse(course, e)}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <div className="rounded-full bg-[#22c55e] p-3 text-[#0f172a]">
                          {isCurrentTrackPlaying(`course_${course.id}`) ? (
                            <Pause className="h-6 w-6" />
                          ) : (
                            <Play className="h-6 w-6" />
                          )}
                        </div>
                      </button>
                    </div>
                  )}
                  
                  {/* Purchased badge */}
                  <div className="absolute right-3 top-3 z-40 rounded-full bg-[#22c55e] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0f172a]">
                    Куплено
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="mb-1 truncate font-[Syne] font-bold text-white">{course.title}</h3>
                  {course.purpose && (
                    <p className="mb-2 text-sm text-white/50">{course.purpose}</p>
                  )}
                  
                  <div className="mb-3 flex items-center justify-between text-sm text-white/40">
                    {course.tags && (
                      <span className="truncate">{course.tags.split(',')[0]}</span>
                    )}
                    <span className="font-semibold text-white">
                      {course.price === 0 ? 'Бесплатно' : `${course.price.toFixed(0)} ₽`}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#22c55e]">
                      Куплено
                    </span>
                    
                    <button
                      onClick={(e) => handleDownloadCourse(course.id, e)}
                      className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                      title="Скачать"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        serviceOrders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-white/30" />
            <div className="font-[Syne] text-xl font-bold text-white">Заказов пока нет</div>
            <p className="mt-2 text-sm text-white/50">
              Оформите заказ услуг, чтобы увидеть его здесь
            </p>
            <Link
              to="/order"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#22c55e] px-6 text-sm font-semibold text-[#0f172a] transition hover:brightness-110"
            >
              Оформить заказ
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {serviceOrders.map(order => {
              const statusColors = {
                pending: 'bg-amber-500/20 text-amber-300',
                confirmed: 'bg-blue-500/20 text-blue-300',
                paid: 'bg-[#22c55e]/20 text-[#22c55e]',
                in_progress: 'bg-violet-500/20 text-violet-300',
                completed: 'bg-emerald-500/20 text-emerald-300',
                cancelled: 'bg-red-500/20 text-red-300'
              };
              
              const statusLabels = {
                pending: 'Ожидает',
                confirmed: 'Подтвержден',
                paid: 'Оплачен',
                in_progress: 'В работе',
                completed: 'Завершен',
                cancelled: 'Отменен'
              };
              
              const categories = order.service_categories || (order.service_category ? [order.service_category] : []);
              
              return (
                <div key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="mb-2 font-[Syne] text-lg font-bold text-white">
                        Заказ #{order.id}
                      </h3>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[order.status] || statusColors.pending}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                        {order.order_type === 'dont_know' && (
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70">
                            Требует обсуждения
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {order.price ? (
                        <>
                          <div className="text-lg font-bold text-[#22c55e]">
                            {order.price.toLocaleString('ru-RU')} ₽
                          </div>
                          {order.prepayment_percent && (
                            <div className="text-sm text-white/50">
                              Предоплата {order.prepayment_percent}%: {(order.price * order.prepayment_percent / 100).toLocaleString('ru-RU')} ₽
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-white/40">
                          Цена не указана
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {categories.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-1 text-sm font-medium text-white/70">Категории услуг:</div>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat, idx) => (
                          <span key={idx} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {order.deadline_days && (
                    <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
                      <Clock className="h-4 w-4" />
                      <span>Срок: {ruCount(order.deadline_days, 'день', 'дня', 'дней')}</span>
                    </div>
                  )}
                  
                  {order.description && (
                    <div className="mb-3">
                      <div className="mb-1 text-sm font-medium text-white/70">Описание:</div>
                      <p className="text-sm text-white/50">{order.description}</p>
                    </div>
                  )}
                  
                  <div className="mt-4 text-xs text-white/40">
                    Создан: {formatMoscowDate(order.created_at)}
                  </div>
                  
                  {/* Информация о стоимости для заказов типа "знаю" */}
                  {order.order_type === 'know' && (
                    <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-sm text-white/50">
                      <span>*Стоимость услуг исходит от вида и количества услуг, срочности заказа и полноты оплаты</span>
                      <div className="relative group">
                        <HelpCircle className="h-4 w-4 flex-shrink-0 cursor-help text-white/40" />
                        <div className="invisible absolute bottom-full right-0 z-10 mb-2 w-80 rounded-2xl border border-white/10 bg-[#0b0f14] p-4 text-xs text-white opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                          <div className="space-y-3">
                            <div>
                              <div className="mb-2 font-semibold text-[#22c55e]">При 50% предоплате:</div>
                              <ul className="space-y-1 text-white/60">
                                <li>• 2-3 недели: 25K</li>
                                <li>• 1-2 недели: 30K</li>
                                <li>• 1 неделя: 35K</li>
                                <li>• 2-3 дня: 40K</li>
                                <li>• 24 часа: 50K</li>
                              </ul>
                            </div>
                            <div>
                              <div className="mb-2 font-semibold text-[#22c55e]">При 100% предоплате:</div>
                              <ul className="space-y-1 text-white/60">
                                <li>• 2-3 недели: 20K</li>
                                <li>• 1-2 недели: 25K</li>
                                <li>• 1 неделя: 30K</li>
                                <li>• 2-3 дня: 35K</li>
                                <li>• 24 часа: 45K</li>
                              </ul>
                            </div>
                            <div className="border-t border-white/10 pt-2">
                              <div className="mb-1 font-semibold">«Песня под ключ»:</div>
                              <div className="text-white/60">Полное написание песни с мелодиями и текстом (можно без текста). Права переходят к заказчику, никаких указаний авторства!</div>
                            </div>
                            <div className="border-t border-white/10 pt-2">
                              <div className="mb-1 font-semibold">Бит в стиле трэп:</div>
                              <div className="text-white/60">Простая трэпчага в стиле Travis Scott, Yeat, Lil Baby, Pop Smoke и др. — 10-15K</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {order.status === 'confirmed' && order.price && (
                    <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <div className="mb-2 flex items-center gap-2 font-medium text-amber-300">
                        <DollarSign className="h-5 w-5" />
                        <span>Требуется оплата</span>
                      </div>
                      <p className="text-sm text-amber-200/80">
                        Заказ подтвержден. Необходимо оплатить {order.prepayment_percent || 50}% предоплату: {(order.price * (order.prepayment_percent || 50) / 100).toLocaleString('ru-RU')} ₽
                      </p>
                      <button 
                        onClick={async () => {
                          try {
                            await startCheckout({ kind: 'order', order_id: order.id });
                          } catch (error) {
                            showError(checkoutErrorMessage(error));
                          }
                        }}
                        className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-[#22c55e] px-5 text-sm font-semibold text-[#0f172a] transition hover:brightness-110"
                      >
                        Оплатить
                      </button>
                    </div>
                  )}
                  
                  {/* Файлы результата (для заказов типа "не знаю" после оплаты) */}
                  {(order.result_wav_url || order.result_mp3_url || order.result_zip_url) && (
                    <div className="mt-4 rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/10 p-4">
                      <div className="mb-3 flex items-center gap-2 font-medium text-[#22c55e]">
                        <CheckCircle className="h-5 w-5" />
                        <span>Готовые файлы</span>
                      </div>
                      
                      <div className="space-y-3">
                        {/* MP3 файл с возможностью прослушивания */}
                        {order.result_mp3_url && (
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Music className="h-4 w-4 text-[#22c55e]" />
                                <span className="text-sm font-medium text-white/80">MP3 файл</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const audioUrl = buildMediaUrl(order.result_mp3_url);
                                    const trackId = `order_${order.id}_mp3`;
                                    if (isCurrentTrack(trackId) && isCurrentTrackPlaying(trackId)) {
                                      pauseTrack();
                                    } else {
                                      playTrack(trackId, audioUrl, `Заказ #${order.id} - MP3`);
                                    }
                                  }}
                                  className="inline-flex h-8 items-center rounded-full border border-white/15 px-3 text-xs text-white transition hover:bg-white/5"
                                >
                                  {isCurrentTrack(`order_${order.id}_mp3`) && isCurrentTrackPlaying(`order_${order.id}_mp3`) ? (
                                    <>
                                      <Pause className="mr-1 h-3 w-3" />
                                      Пауза
                                    </>
                                  ) : (
                                    <>
                                      <Play className="mr-1 h-3 w-3" />
                                      Плей
                                    </>
                                  )}
                                </button>
                                <a
                                  href={buildMediaUrl(order.result_mp3_url)}
                                  download
                                  className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                                  title="Скачать"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* WAV файл с возможностью прослушивания */}
                        {order.result_wav_url && (
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileAudio className="h-4 w-4 text-[#22c55e]" />
                                <span className="text-sm font-medium text-white/80">WAV файл</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const audioUrl = buildMediaUrl(order.result_wav_url);
                                    const trackId = `order_${order.id}_wav`;
                                    if (isCurrentTrack(trackId) && isCurrentTrackPlaying(trackId)) {
                                      pauseTrack();
                                    } else {
                                      playTrack(trackId, audioUrl, `Заказ #${order.id} - WAV`);
                                    }
                                  }}
                                  className="inline-flex h-8 items-center rounded-full border border-white/15 px-3 text-xs text-white transition hover:bg-white/5"
                                >
                                  {isCurrentTrack(`order_${order.id}_wav`) && isCurrentTrackPlaying(`order_${order.id}_wav`) ? (
                                    <>
                                      <Pause className="mr-1 h-3 w-3" />
                                      Пауза
                                    </>
                                  ) : (
                                    <>
                                      <Play className="mr-1 h-3 w-3" />
                                      Плей
                                    </>
                                  )}
                                </button>
                                <a
                                  href={buildMediaUrl(order.result_wav_url)}
                                  download
                                  className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                                  title="Скачать"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* ZIP архив */}
                        {order.result_zip_url && (
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[#22c55e]" />
                                <span className="text-sm font-medium text-white/80">ZIP архив</span>
                              </div>
                              <a
                                href={buildMediaUrl(order.result_zip_url)}
                                download
                                className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                                title="Скачать"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default PurchasesPage;


