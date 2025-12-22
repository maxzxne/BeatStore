import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import BeatCard from '../components/BeatCard';
import { api } from '../utils/api';
import { formatMoscowDate } from '../utils/dateUtils';
import { Play, Pause, Download, CheckCircle, Video, Clock, DollarSign, FileText, Music, FileAudio, HelpCircle } from 'lucide-react';

// Получаем API URL для построения полных URL файлов
const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');

const PurchasesPage = () => {
  const { isAuthenticated } = useAuth();
  const { playTrack, isCurrentTrackPlaying, pauseTrack, resumeTrack, isCurrentTrack } = useAudioPlayer();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [coursePurchases, setCoursePurchases] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('beats'); // 'beats', 'courses' или 'orders'

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
      const fullUrl = `${API_URL}${beat.full_audio_url}`;
      
      // Проверяем, играет ли уже этот трек
      const isPlaying = isCurrentTrackPlaying(beat.id);
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(beat.id, fullUrl, beat.title);
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
      const fullUrl = `${API_URL}${course.full_video_url}`;
      
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

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-black mb-2">Войдите для просмотра покупок</h1>
          <p className="text-gray-600">Вам нужно войти в систему, чтобы увидеть купленные биты.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Загрузка покупок...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Ваши покупки</h1>
        
        {/* Табы для переключения между битами, курсами и заказами */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setActiveTab('beats')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'beats'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Биты ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'courses'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Курсы ({coursePurchases.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Заказы ({serviceOrders.length})
          </button>
        </div>
      </div>

      {activeTab === 'beats' ? (
        purchases.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-600 text-lg">Покупок битов пока нет</div>
            <p className="text-gray-500 mt-2">
              Начните покупать биты, чтобы увидеть их здесь
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {purchases.map(beat => (
              <Link key={beat.id} to={`/beat/${beat.id}`} className="card group relative ring-2 ring-green-500 ring-opacity-50">
                <div className="relative">
                  {beat.cover_url ? (
                    <img
                      src={`${API_URL}${beat.cover_url}`}
                      alt={beat.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-300 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-black bg-opacity-5"></div>
                      <div className="relative z-10 text-center">
                        <span className="text-gray-600 text-sm font-medium">BeatStore</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Purchased badge */}
                  <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full z-40">
                    Куплено
                  </div>
                  
                  {/* Play button overlay - показывается при наведении */}
                  <button
                    onClick={(e) => handlePlay(beat, e)}
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                  >
                    <div className="bg-black rounded-full p-3">
                      {isCurrentTrackPlaying(beat.id) ? (
                        <Pause className="h-6 w-6 text-white" />
                      ) : (
                        <Play className="h-6 w-6 text-white" />
                      )}
                    </div>
                  </button>
                </div>
                
                <div className="card-content">
                  <h3 className="font-semibold text-black mb-1 truncate">{beat.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{beat.artist}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>{beat.genre}</span>
                    <span>{beat.bpm} BPM</span>
                    {beat.key && <span>{beat.key}</span>}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600 font-medium">
                      Куплено
                    </span>
                    
                    <button
                      onClick={(e) => handleDownload(beat.id, e)}
                      className="btn btn-outline btn-sm"
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
      ) : activeTab === 'courses' ? (
        coursePurchases.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-600 text-lg">Покупок курсов пока нет</div>
            <p className="text-gray-500 mt-2">
              Начните покупать курсы, чтобы увидеть их здесь
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {coursePurchases.map(course => (
              <Link key={course.id} to={`/course/${course.id}`} className="card group relative ring-2 ring-green-500 ring-opacity-50">
                <div className="relative">
                  {course.preview_video_url ? (
                    <div className="w-full h-48 bg-black rounded-t-lg flex items-center justify-center relative overflow-hidden">
                      <video
                        src={`${API_URL}${course.preview_video_url}`}
                        className="w-full h-full object-cover"
                        muted
                        loop
                      />
                      {/* Play button overlay - показывается при наведении вместо кнопки скачать */}
                      <button
                        onClick={(e) => handlePlayCourse(course, e)}
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                      >
                        <div className="bg-black rounded-full p-3">
                          {isCurrentTrackPlaying(`course_${course.id}`) ? (
                            <Pause className="h-6 w-6 text-white" />
                          ) : (
                            <Play className="h-6 w-6 text-white" />
                          )}
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-300 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-black bg-opacity-5"></div>
                      <div className="relative z-10 text-center">
                        <Video className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                        <span className="text-gray-600 text-sm font-medium">Курс</span>
                      </div>
                      {/* Play button overlay */}
                      <button
                        onClick={(e) => handlePlayCourse(course, e)}
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                      >
                        <div className="bg-black rounded-full p-3">
                          {isCurrentTrackPlaying(`course_${course.id}`) ? (
                            <Pause className="h-6 w-6 text-white" />
                          ) : (
                            <Play className="h-6 w-6 text-white" />
                          )}
                        </div>
                      </button>
                    </div>
                  )}
                  
                  {/* Purchased badge */}
                  <div className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full z-40">
                    Куплено
                  </div>
                </div>
                
                <div className="card-content">
                  <h3 className="font-semibold text-black mb-1 truncate">{course.title}</h3>
                  {course.purpose && (
                    <p className="text-gray-600 text-sm mb-2">{course.purpose}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    {course.tags && (
                      <span className="truncate">{course.tags.split(',')[0]}</span>
                    )}
                    <span className="text-black font-semibold">
                      {course.price === 0 ? 'Бесплатно' : `${course.price.toFixed(0)} ₽`}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600 font-medium">
                      Куплено
                    </span>
                    
                    <button
                      onClick={(e) => handleDownloadCourse(course.id, e)}
                      className="btn btn-outline btn-sm"
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
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-600 text-lg">Заказов пока нет</div>
            <p className="text-gray-500 mt-2">
              Оформите заказ услуг, чтобы увидеть его здесь
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {serviceOrders.map(order => {
              const statusColors = {
                pending: 'bg-yellow-100 text-yellow-800',
                confirmed: 'bg-blue-100 text-blue-800',
                paid: 'bg-green-100 text-green-800',
                in_progress: 'bg-purple-100 text-purple-800',
                completed: 'bg-gray-100 text-gray-800',
                cancelled: 'bg-red-100 text-red-800'
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
                <div key={order.id} className="border border-gray-300 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-black mb-2">
                        Заказ #{order.id}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || statusColors.pending}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                        {order.order_type === 'dont_know' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Требует обсуждения
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {order.price ? (
                        <>
                          <div className="text-lg font-bold text-black">
                            {order.price.toLocaleString('ru-RU')} ₽
                          </div>
                          {order.prepayment_percent && (
                            <div className="text-sm text-gray-600">
                              Предоплата {order.prepayment_percent}%: {(order.price * order.prepayment_percent / 100).toLocaleString('ru-RU')} ₽
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Цена не указана
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {categories.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Категории услуг:</div>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat, idx) => (
                          <span key={idx} className="px-3 py-1 bg-gray-100 rounded-lg text-sm">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {order.deadline_days && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Clock className="h-4 w-4" />
                      <span>Срок: {order.deadline_days} {order.deadline_days === 1 ? 'день' : order.deadline_days < 5 ? 'дня' : 'дней'}</span>
                    </div>
                  )}
                  
                  {order.description && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Описание:</div>
                      <p className="text-sm text-gray-600">{order.description}</p>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-4">
                    Создан: {formatMoscowDate(order.created_at)}
                  </div>
                  
                  {/* Информация о стоимости для заказов типа "знаю" */}
                  {order.order_type === 'know' && (
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
                              <div className="text-gray-300">Простая трэпчага в стиле Travis Scott, Yeat, Lil Baby, Pop Smoke и др. — 10-15K</div>
                            </div>
                          </div>
                          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {order.status === 'confirmed' && order.price && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                        <DollarSign className="h-5 w-5" />
                        <span>Требуется оплата</span>
                      </div>
                      <p className="text-sm text-yellow-700">
                        Заказ подтвержден. Необходимо оплатить {order.prepayment_percent || 50}% предоплату: {(order.price * (order.prepayment_percent || 50) / 100).toLocaleString('ru-RU')} ₽
                      </p>
                      <button 
                        onClick={() => {
                          const prepaymentAmount = order.price * (order.prepayment_percent || 50) / 100;
                          const params = new URLSearchParams();
                          params.append('type', 'order');
                          params.append('order_id', order.id.toString());
                          params.append('total_price', prepaymentAmount.toString());
                          navigate(`/test-payment?${params.toString()}`);
                        }}
                        className="mt-3 btn btn-primary btn-sm"
                      >
                        Оплатить
                      </button>
                    </div>
                  )}
                  
                  {/* Файлы результата (для заказов типа "не знаю" после оплаты) */}
                  {(order.result_wav_url || order.result_mp3_url || order.result_zip_url) && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800 font-medium mb-3">
                        <CheckCircle className="h-5 w-5" />
                        <span>Готовые файлы</span>
                      </div>
                      
                      <div className="space-y-3">
                        {/* MP3 файл с возможностью прослушивания */}
                        {order.result_mp3_url && (
                          <div className="bg-white p-3 rounded border border-green-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Music className="h-4 w-4 text-green-700" />
                                <span className="text-sm font-medium text-gray-700">MP3 файл</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const audioUrl = `${API_URL}${order.result_mp3_url}`;
                                    const trackId = `order_${order.id}_mp3`;
                                    if (isCurrentTrack(trackId) && isCurrentTrackPlaying(trackId)) {
                                      pauseTrack();
                                    } else {
                                      playTrack(trackId, audioUrl, `Заказ #${order.id} - MP3`);
                                    }
                                  }}
                                  className="btn btn-sm btn-outline h-8 px-3"
                                >
                                  {isCurrentTrack(`order_${order.id}_mp3`) && isCurrentTrackPlaying(`order_${order.id}_mp3`) ? (
                                    <>
                                      <Pause className="h-3 w-3 mr-1" />
                                      Пауза
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3 mr-1" />
                                      Плей
                                    </>
                                  )}
                                </button>
                                <a
                                  href={`${API_URL}${order.result_mp3_url}`}
                                  download
                                  className="btn btn-sm btn-outline h-8 px-3"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Скачать
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* WAV файл с возможностью прослушивания */}
                        {order.result_wav_url && (
                          <div className="bg-white p-3 rounded border border-green-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <FileAudio className="h-4 w-4 text-green-700" />
                                <span className="text-sm font-medium text-gray-700">WAV файл</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const audioUrl = `${API_URL}${order.result_wav_url}`;
                                    const trackId = `order_${order.id}_wav`;
                                    if (isCurrentTrack(trackId) && isCurrentTrackPlaying(trackId)) {
                                      pauseTrack();
                                    } else {
                                      playTrack(trackId, audioUrl, `Заказ #${order.id} - WAV`);
                                    }
                                  }}
                                  className="btn btn-sm btn-outline h-8 px-3"
                                >
                                  {isCurrentTrack(`order_${order.id}_wav`) && isCurrentTrackPlaying(`order_${order.id}_wav`) ? (
                                    <>
                                      <Pause className="h-3 w-3 mr-1" />
                                      Пауза
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3 mr-1" />
                                      Плей
                                    </>
                                  )}
                                </button>
                                <a
                                  href={`${API_URL}${order.result_wav_url}`}
                                  download
                                  className="btn btn-sm btn-outline h-8 px-3"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Скачать
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* ZIP архив */}
                        {order.result_zip_url && (
                          <div className="bg-white p-3 rounded border border-green-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-green-700" />
                                <span className="text-sm font-medium text-gray-700">ZIP архив</span>
                              </div>
                              <a
                                href={`${API_URL}${order.result_zip_url}`}
                                download
                                className="btn btn-sm btn-outline h-8 px-3"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Скачать
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
      
      {/* Bottom padding to prevent overlap with mini player */}
      <div className="h-20"></div>
    </div>
  );
};

export default PurchasesPage;
