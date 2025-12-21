import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import BeatCard from '../components/BeatCard';
import { api } from '../utils/api';
import { Play, Pause, Download, CheckCircle, Video } from 'lucide-react';

// Получаем API URL для построения полных URL файлов
const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');

const PurchasesPage = () => {
  const { isAuthenticated } = useAuth();
  const { playTrack, isCurrentTrackPlaying, pauseTrack, resumeTrack } = useAudioPlayer();
  const [purchases, setPurchases] = useState([]);
  const [coursePurchases, setCoursePurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('beats'); // 'beats' или 'courses'

  useEffect(() => {
    if (isAuthenticated) {
      fetchPurchases();
      fetchCoursePurchases();
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
        
        {/* Табы для переключения между битами и курсами */}
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
                    <div className="bg-primary-600 rounded-full p-3">
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
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handlePlay(beat, e)}
                        className="btn btn-primary btn-sm"
                      >
                        {isCurrentTrackPlaying(beat.id) ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Пауза
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Плей
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDownload(beat.id, e)}
                        className="btn btn-outline btn-sm"
                        title="Скачать"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
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
                        <div className="bg-primary-600 rounded-full p-3">
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
                        <div className="bg-primary-600 rounded-full p-3">
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
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handlePlayCourse(course, e)}
                        className="btn btn-primary btn-sm"
                      >
                        {isCurrentTrackPlaying(`course_${course.id}`) ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Пауза
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Плей
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDownloadCourse(course.id, e)}
                        className="btn btn-outline btn-sm"
                        title="Скачать"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
      
      {/* Bottom padding to prevent overlap with mini player */}
      <div className="h-20"></div>
    </div>
  );
};

export default PurchasesPage;
