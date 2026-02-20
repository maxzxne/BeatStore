import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Upload, Music, Image, FileAudio, Video, GraduationCap, X, CheckCircle } from 'lucide-react';

const AdminUpload = () => {
  const [activeTab, setActiveTab] = useState('beat'); // 'beat' или 'course'
  const { isAdminAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [beatFormData, setBeatFormData] = useState({
    title: '',
    artist: '',
    genre: '',
    bpm: '',
    price: '',
    price_mp3: '',
    price_wav: '',
    price_exclusive: '',
    key: '',
    description: ''
  });
  const [courseFormData, setCourseFormData] = useState({
    title: '',
    purpose: '',
    description: '',
    tags: '',
    price: ''
  });
  const [beatFiles, setBeatFiles] = useState({
    demo_file: null,
    wav_file: null,
    mp3_file: null,
    exclusive_file: null,
    cover_file: null
  });
  const [allowMultiplePurchases, setAllowMultiplePurchases] = useState(false);
  const [courseFiles, setCourseFiles] = useState({
    preview_video_file: null,
    full_video_file: null
  });

  const handleBeatInputChange = (e) => {
    const { name, value } = e.target;
    setBeatFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCourseInputChange = (e) => {
    const { name, value } = e.target;
    setCourseFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBeatFileChange = (e) => {
    const { name, files } = e.target;
    setBeatFiles(prev => ({
      ...prev,
      [name]: files[0] || null
    }));
  };

  const handleCourseFileChange = (e) => {
    const { name, files } = e.target;
    setCourseFiles(prev => ({
      ...prev,
      [name]: files[0] || null
    }));
  };

  const handleFileDrop = (e, name, fileType) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (fileType === 'beat') {
        setBeatFiles(prev => ({
          ...prev,
          [name]: file
        }));
      } else {
        setCourseFiles(prev => ({
          ...prev,
          [name]: file
        }));
      }
    }
  };

  const handleFileRemove = (name, fileType) => {
    if (fileType === 'beat') {
      setBeatFiles(prev => ({
        ...prev,
        [name]: null
      }));
      // Сброс input
      const input = document.getElementById(name);
      if (input) input.value = '';
    } else {
      setCourseFiles(prev => ({
        ...prev,
        [name]: null
      }));
      const input = document.getElementById(name);
      if (input) input.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleBeatSubmit = async (e) => {
    e.preventDefault();
    
    if (!beatFiles.demo_file) {
      alert('Демо файл обязателен');
      return;
    }

    setLoading(true);
    
    try {
      const submitData = new FormData();
      
      Object.entries(beatFormData).forEach(([key, value]) => {
        if (value) {
          submitData.append(key, value);
        }
      });
      
      Object.entries(beatFiles).forEach(([key, file]) => {
        if (file) {
          submitData.append(key, file);
        }
      });

      await api.post('/api/admin/upload-beat', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Бит успешно загружен!');
      
      setBeatFormData({
        title: '',
        artist: '',
        genre: '',
        bpm: '',
        price: '',
        price_mp3: '',
        price_wav: '',
        price_exclusive: '',
        key: '',
        description: ''
      });
      setBeatFiles({
        demo_file: null,
        full_file: null,
        cover_file: null
      });
      
    } catch (error) {
      console.error('Error uploading beat:', error);
      alert('Ошибка загрузки бита: ' + (error.response?.data?.detail || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    
    if (!courseFiles.preview_video_file || !courseFiles.full_video_file) {
      alert('Оба видео файла обязательны (превью и полное)');
      return;
    }

    setLoading(true);
    
    try {
      const submitData = new FormData();
      
      Object.entries(courseFormData).forEach(([key, value]) => {
        if (value) {
          submitData.append(key, value);
        }
      });
      
      submitData.append('preview_video_file', courseFiles.preview_video_file);
      submitData.append('full_video_file', courseFiles.full_video_file);

      await api.post('/api/admin/upload-course', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Курс успешно загружен!');
      
      setCourseFormData({
        title: '',
        purpose: '',
        description: '',
        tags: '',
        price: ''
      });
      setCourseFiles({
        preview_video_file: null,
        full_video_file: null
      });
      
    } catch (error) {
      console.error('Error uploading course:', error);
      alert('Ошибка загрузки курса: ' + (error.response?.data?.detail || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 dark:text-neutral-400">Доступ запрещен. Войдите как администратор.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Загрузка контента</h1>
        <p className="text-gray-600 dark:text-neutral-400">Добавить новый бит или курс в каталог</p>
      </div>

      {/* Табы */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('beat')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'beat'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 dark:text-neutral-400 hover:bg-gray-200'
          }`}
        >
          <Music className="h-5 w-5" />
          Загрузить бит
        </button>
        <button
          onClick={() => setActiveTab('course')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'course'
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 dark:text-neutral-400 hover:bg-gray-200'
          }`}
        >
          <GraduationCap className="h-5 w-5" />
          Загрузить курс
        </button>
      </div>

      <div className="max-w-2xl">
        {activeTab === 'beat' ? (
          <form onSubmit={handleBeatSubmit} className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-white">Информация о бите</h2>
            </div>
            
            <div className="card-content space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="beat_title" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Название *
                  </label>
                  <input
                    type="text"
                    id="beat_title"
                    name="title"
                    value={beatFormData.title}
                    onChange={handleBeatInputChange}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="beat_artist" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Исполнитель *
                  </label>
                  <input
                    type="text"
                    id="beat_artist"
                    name="artist"
                    value={beatFormData.artist}
                    onChange={handleBeatInputChange}
                    className="input w-full"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="beat_genre" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Жанр *
                  </label>
                  <input
                    type="text"
                    id="beat_genre"
                    name="genre"
                    value={beatFormData.genre}
                    onChange={handleBeatInputChange}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="beat_bpm" className="block text-sm font-medium text-black dark:text-white mb-2">
                    BPM *
                  </label>
                  <input
                    type="number"
                    id="beat_bpm"
                    name="bpm"
                    value={beatFormData.bpm}
                    onChange={handleBeatInputChange}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="beat_price" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Базовая цена (₽) *
                  </label>
                  <input
                    type="number"
                    id="beat_price"
                    step="1"
                    name="price"
                    value={beatFormData.price}
                    onChange={handleBeatInputChange}
                    className="input w-full"
                    placeholder="0"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                    Используется, если не указаны отдельные цены
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="beat_price_mp3" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Цена MP3 (₽)
                  </label>
                  <input
                    type="number"
                    id="beat_price_mp3"
                    step="1"
                    name="price_mp3"
                    value={beatFormData.price_mp3}
                    onChange={handleBeatInputChange}
                    className="input w-full"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label htmlFor="beat_price_wav" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Цена WAV (₽)
                  </label>
                  <input
                    type="number"
                    id="beat_price_wav"
                    step="1"
                    name="price_wav"
                    value={beatFormData.price_wav}
                    onChange={handleBeatInputChange}
                    className="input w-full"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label htmlFor="beat_price_exclusive" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Цена Exclusive (₽)
                  </label>
                  <input
                    type="number"
                    id="beat_price_exclusive"
                    step="1"
                    name="price_exclusive"
                    value={beatFormData.price_exclusive}
                    onChange={handleBeatInputChange}
                    className="input w-full"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="beat_key" className="block text-sm font-medium text-black dark:text-white mb-2">
                  Тональность
                </label>
                <input
                  type="text"
                  id="beat_key"
                  name="key"
                    value={beatFormData.key}
                    onChange={handleBeatInputChange}
                  className="input w-full"
                  placeholder="например, C, F#, Am"
                />
              </div>
              
              <div>
                <label htmlFor="beat_description" className="block text-sm font-medium text-black dark:text-white mb-2">
                  Описание
                </label>
                <textarea
                  id="beat_description"
                  name="description"
                    value={beatFormData.description}
                    onChange={handleBeatInputChange}
                  className="input w-full h-20 resize-none"
                  placeholder="Опишите ваш бит..."
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-black dark:text-white">Аудио файлы</h2>
            </div>
            
            <div className="card-content space-y-4">
              <div>
                <label htmlFor="beat_demo_file" className="block text-sm font-medium text-black dark:text-white mb-2">
                  Демо файл (для прослушивания) *
                </label>
                <div
                  onDrop={(e) => handleFileDrop(e, 'demo_file', 'beat')}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="relative"
                >
                  <input
                    type="file"
                    id="beat_demo_file"
                    accept="audio/*"
                    name="demo_file"
                    onChange={handleBeatFileChange}
                    className="hidden"
                    required
                  />
                  {beatFiles.demo_file ? (
                    <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="bg-green-100 rounded-full p-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black dark:text-white truncate">{beatFiles.demo_file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-neutral-500">{formatFileSize(beatFiles.demo_file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('demo_file', 'beat')}
                        className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="beat_demo_file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-neutral-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-neutral-500">
                          <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                        </p>
                        <p className="text-xs text-gray-400 dark:text-neutral-500">AUDIO файлы</p>
                      </div>
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                  Короткая превью версия вашего бита
                </p>
              </div>
              
              <div>
                <label htmlFor="beat_wav_file" className="block text-sm font-medium text-black dark:text-white mb-2">
                  WAV файл *
                </label>
                <div
                  onDrop={(e) => handleFileDrop(e, 'wav_file', 'beat')}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="relative"
                >
                  <input
                    type="file"
                    id="beat_wav_file"
                    name="wav_file"
                    accept="audio/wav,audio/*"
                    onChange={handleBeatFileChange}
                    className="hidden"
                    required
                  />
                  {beatFiles.wav_file ? (
                    <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="bg-green-100 rounded-full p-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black dark:text-white truncate">{beatFiles.wav_file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-neutral-500">{formatFileSize(beatFiles.wav_file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('wav_file', 'beat')}
                        className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="beat_wav_file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-neutral-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-neutral-500">
                          <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                        </p>
                        <p className="text-xs text-gray-400 dark:text-neutral-500">WAV файлы</p>
                      </div>
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                  WAV версия для покупки
                </p>
              </div>
              
              <div>
                <label htmlFor="beat_mp3_file" className="block text-sm font-medium text-black dark:text-white mb-2">
                  MP3 файл *
                </label>
                <div
                  onDrop={(e) => handleFileDrop(e, 'mp3_file', 'beat')}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="relative"
                >
                  <input
                    type="file"
                    id="beat_mp3_file"
                    name="mp3_file"
                    accept="audio/mpeg,audio/mp3,audio/*"
                    onChange={handleBeatFileChange}
                    className="hidden"
                    required
                  />
                  {beatFiles.mp3_file ? (
                    <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="bg-green-100 rounded-full p-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black dark:text-white truncate">{beatFiles.mp3_file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-neutral-500">{formatFileSize(beatFiles.mp3_file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('mp3_file', 'beat')}
                        className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="beat_mp3_file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-neutral-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-neutral-500">
                          <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                        </p>
                        <p className="text-xs text-gray-400 dark:text-neutral-500">MP3 файлы</p>
                      </div>
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                  MP3 версия для покупки
                </p>
              </div>
              
              <div>
                <label htmlFor="beat_exclusive_file" className="block text-sm font-medium text-black dark:text-white mb-2">
                  Эксклюзивный файл (ZIP) *
                </label>
                <div
                  onDrop={(e) => handleFileDrop(e, 'exclusive_file', 'beat')}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="relative"
                >
                  <input
                    type="file"
                    id="beat_exclusive_file"
                    name="exclusive_file"
                    accept=".zip,application/zip"
                    onChange={handleBeatFileChange}
                    className="hidden"
                    required
                  />
                  {beatFiles.exclusive_file ? (
                    <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="bg-green-100 rounded-full p-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black dark:text-white truncate">{beatFiles.exclusive_file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-neutral-500">{formatFileSize(beatFiles.exclusive_file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('exclusive_file', 'beat')}
                        className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="beat_exclusive_file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-neutral-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-neutral-500">
                          <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                        </p>
                        <p className="text-xs text-gray-400 dark:text-neutral-500">ZIP архивы</p>
                      </div>
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                  ZIP архив с FL-проектом, дорожками и другими файлами
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-black dark:text-white">Настройки покупки</h2>
            </div>
            
            <div className="card-content">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="allow_multiple_purchases"
                  checked={allowMultiplePurchases}
                  onChange={(e) => setAllowMultiplePurchases(e.target.checked)}
                  className="w-4 h-4 text-black dark:text-white border-gray-300 dark:border-neutral-700 rounded focus:ring-black"
                />
                <label htmlFor="allow_multiple_purchases" className="text-sm font-medium text-black dark:text-white">
                  Разрешить множественные покупки
                </label>
              </div>
              <p className="text-xs text-gray-600 dark:text-neutral-400 mt-2">
                {allowMultiplePurchases 
                  ? "Бит можно покупать много раз (как в аренду)"
                  : "Бит эксклюзивный - только один покупатель (по умолчанию)"}
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-black dark:text-white">Обложка</h2>
            </div>
            
            <div className="card-content">
              <div>
                <label htmlFor="beat_cover_file" className="block text-sm font-medium text-black dark:text-white mb-2">
                  Обложка
                </label>
                <div
                  onDrop={(e) => handleFileDrop(e, 'cover_file', 'beat')}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="relative"
                >
                  <input
                    type="file"
                    id="beat_cover_file"
                    name="cover_file"
                    accept="image/*"
                    onChange={handleBeatFileChange}
                    className="hidden"
                  />
                  {beatFiles.cover_file ? (
                    <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="bg-green-100 rounded-full p-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black dark:text-white truncate">{beatFiles.cover_file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-neutral-500">{formatFileSize(beatFiles.cover_file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('cover_file', 'beat')}
                        className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="beat_cover_file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-neutral-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Image className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-neutral-500">
                          <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                        </p>
                        <p className="text-xs text-gray-400 dark:text-neutral-500">Изображения (JPG, PNG, etc.)</p>
                      </div>
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-neutral-400 mt-1">
                  Опциональная обложка для вашего бита
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                  Рекомендуемое разрешение: 500×500px или больше
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? (
              'Загрузка...'
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Загрузить бит
              </>
            )}
          </button>
        </form>
        ) : (
          <form onSubmit={handleCourseSubmit} className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-black dark:text-white">Информация о курсе</h2>
              </div>
              
              <div className="card-content space-y-4">
                <div>
                  <label htmlFor="course_title" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Название курса *
                  </label>
                  <input
                    type="text"
                    id="course_title"
                    name="title"
                    value={courseFormData.title}
                    onChange={handleCourseInputChange}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="course_purpose" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Предназначение
                  </label>
                  <select
                    id="course_purpose"
                    name="purpose"
                    value={courseFormData.purpose}
                    onChange={handleCourseInputChange}
                    className="input w-full"
                  >
                    <option value="">Выберите предназначение</option>
                    <option value="сведение">Сведение</option>
                    <option value="битмэйкинг">Битмэйкинг</option>
                    <option value="саунддизайн">Саунд-дизайн</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="course_tags" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Тэги (через запятую)
                  </label>
                  <input
                    type="text"
                    id="course_tags"
                    name="tags"
                    value={courseFormData.tags}
                    onChange={handleCourseInputChange}
                    className="input w-full"
                    placeholder="компрессия, эквализация, саунд-дизайн"
                  />
                </div>
                
                <div>
                  <label htmlFor="course_price" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Цена (₽) *
                  </label>
                  <input
                    type="number"
                    id="course_price"
                    step="1"
                    name="price"
                    value={courseFormData.price}
                    onChange={handleCourseInputChange}
                    className="input w-full"
                    placeholder="0"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="course_description" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Описание
                  </label>
                  <textarea
                    id="course_description"
                    name="description"
                    value={courseFormData.description}
                    onChange={handleCourseInputChange}
                    className="input w-full h-20 resize-none"
                    placeholder="Опишите курс..."
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-black dark:text-white">Видео файлы</h2>
              </div>
              
              <div className="card-content space-y-4">
                <div>
                  <label htmlFor="course_preview_video" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Превью видео * (для просмотра на сайте)
                  </label>
                  <div
                    onDrop={(e) => handleFileDrop(e, 'preview_video_file', 'course')}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="relative"
                  >
                    <input
                      type="file"
                      id="course_preview_video"
                      name="preview_video_file"
                      accept="video/*"
                      onChange={handleCourseFileChange}
                      className="hidden"
                      required
                    />
                    {courseFiles.preview_video_file ? (
                      <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="bg-green-100 rounded-full p-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black dark:text-white truncate">{courseFiles.preview_video_file.name}</p>
                            <p className="text-xs text-gray-500 dark:text-neutral-500">{formatFileSize(courseFiles.preview_video_file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFileRemove('preview_video_file', 'course')}
                          className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="course_preview_video"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-neutral-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Video className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="mb-2 text-sm text-gray-500 dark:text-neutral-500">
                            <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                          </p>
                          <p className="text-xs text-gray-400 dark:text-neutral-500">Видео файлы</p>
                        </div>
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                    Короткое превью для просмотра на сайте
                  </p>
                </div>
                
                <div>
                  <label htmlFor="course_full_video" className="block text-sm font-medium text-black dark:text-white mb-2">
                    Полное видео * (для скачивания после покупки)
                  </label>
                  <div
                    onDrop={(e) => handleFileDrop(e, 'full_video_file', 'course')}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    className="relative"
                  >
                    <input
                      type="file"
                      id="course_full_video"
                      name="full_video_file"
                      accept="video/*"
                      onChange={handleCourseFileChange}
                      className="hidden"
                      required
                    />
                    {courseFiles.full_video_file ? (
                      <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="bg-green-100 rounded-full p-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-black dark:text-white truncate">{courseFiles.full_video_file.name}</p>
                            <p className="text-xs text-gray-500 dark:text-neutral-500">{formatFileSize(courseFiles.full_video_file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFileRemove('full_video_file', 'course')}
                          className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="course_full_video"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-neutral-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-400 dark:hover:border-neutral-600 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Video className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="mb-2 text-sm text-gray-500 dark:text-neutral-500">
                            <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                          </p>
                          <p className="text-xs text-gray-400 dark:text-neutral-500">Видео файлы</p>
                        </div>
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
                    Полное видео для скачивания после покупки
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? (
                'Загрузка...'
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Загрузить курс
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminUpload;

