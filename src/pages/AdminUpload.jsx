import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Upload, Music, Image, FileAudio, Video, GraduationCap, X, CheckCircle } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

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
      <div className="py-12 text-center text-white/50">
        Доступ запрещен. Войдите как администратор.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Загрузка</h1>
        <p className="admin-page-sub">Новый бит или курс в каталог</p>
      </div>

      <div className="inline-flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('beat')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'beat'
              ? 'bg-[#22c55e] text-[#0f172a]'
              : 'text-white/55 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Music className="h-4 w-4" />
          Бит
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('course')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'course'
              ? 'bg-[#22c55e] text-[#0f172a]'
              : 'text-white/55 hover:bg-white/5 hover:text-white'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Курс
        </button>
      </div>

      <div className="max-w-2xl">
        {activeTab === 'beat' ? (
          <form onSubmit={handleBeatSubmit} className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-[Syne] text-lg font-semibold text-white">Информация о бите</h2>
            </div>
            
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="beat_title" className="admin-field-label">
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
                  <label htmlFor="beat_artist" className="admin-field-label">
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
                  <label htmlFor="beat_genre" className="admin-field-label">
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
                  <label htmlFor="beat_bpm" className="admin-field-label">
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
                  <label htmlFor="beat_price" className="admin-field-label">
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
                  <p className="text-xs text-white/40 mt-1">
                    Используется, если не указаны отдельные цены
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="beat_price_mp3" className="admin-field-label">
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
                  <label htmlFor="beat_price_wav" className="admin-field-label">
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
                  <label htmlFor="beat_price_exclusive" className="admin-field-label">
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
                <label htmlFor="beat_key" className="admin-field-label">
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
                <label htmlFor="beat_description" className="admin-field-label">
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

          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-[Syne] text-lg font-semibold text-white">Аудио файлы</h2>
            </div>
            
            <div className="space-y-4 p-5">
              <div>
                <label htmlFor="beat_demo_file" className="admin-field-label">
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
                          <p className="text-sm font-medium text-white truncate">{beatFiles.demo_file.name}</p>
                          <p className="text-xs text-white/40">{formatFileSize(beatFiles.demo_file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('demo_file', 'beat')}
                        className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-red-300" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="beat_demo_file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/15 border-dashed rounded-xl cursor-pointer bg-white/[0.03] hover:bg-white/5 hover:border-[#22c55e]/40 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-8 w-8 text-white/35 mb-2" />
                        <p className="mb-2 text-sm text-white/40">
                          <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                        </p>
                        <p className="text-xs text-white/35">AUDIO файлы</p>
                      </div>
                    </label>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-1">
                  Короткая превью версия вашего бита
                </p>
              </div>
              
              <div>
                <label htmlFor="beat_wav_file" className="admin-field-label">
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
                          <p className="text-sm font-medium text-white truncate">{beatFiles.wav_file.name}</p>
                          <p className="text-xs text-white/40">{formatFileSize(beatFiles.wav_file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('wav_file', 'beat')}
                        className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-red-300" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="beat_wav_file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/15 border-dashed rounded-xl cursor-pointer bg-white/[0.03] hover:bg-white/5 hover:border-[#22c55e]/40 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-8 w-8 text-white/35 mb-2" />
                        <p className="mb-2 text-sm text-white/40">
                          <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                        </p>
                        <p className="text-xs text-white/35">WAV файлы</p>
                      </div>
                    </label>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-1">
                  WAV версия для покупки
                </p>
              </div>
              
              <div>
                <label htmlFor="beat_mp3_file" className="admin-field-label">
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
                          <p className="text-sm font-medium text-white truncate">{beatFiles.mp3_file.name}</p>
                          <p className="text-xs text-white/40">{formatFileSize(beatFiles.mp3_file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('mp3_file', 'beat')}
                        className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-red-300" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="beat_mp3_file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/15 border-dashed rounded-xl cursor-pointer bg-white/[0.03] hover:bg-white/5 hover:border-[#22c55e]/40 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-8 w-8 text-white/35 mb-2" />
                        <p className="mb-2 text-sm text-white/40">
                          <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                        </p>
                        <p className="text-xs text-white/35">MP3 файлы</p>
                      </div>
                    </label>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-1">
                  MP3 версия для покупки
                </p>
              </div>
              
              <div>
                <label htmlFor="beat_exclusive_file" className="admin-field-label">
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
                          <p className="text-sm font-medium text-white truncate">{beatFiles.exclusive_file.name}</p>
                          <p className="text-xs text-white/40">{formatFileSize(beatFiles.exclusive_file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('exclusive_file', 'beat')}
                        className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-red-300" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="beat_exclusive_file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/15 border-dashed rounded-xl cursor-pointer bg-white/[0.03] hover:bg-white/5 hover:border-[#22c55e]/40 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-8 w-8 text-white/35 mb-2" />
                        <p className="mb-2 text-sm text-white/40">
                          <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                        </p>
                        <p className="text-xs text-white/35">ZIP архивы</p>
                      </div>
                    </label>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-1">
                  ZIP архив с FL-проектом, дорожками и другими файлами
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-[Syne] text-lg font-semibold text-white">Настройки покупки</h2>
            </div>
            
            <div className="p-5">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="allow_multiple_purchases"
                  checked={allowMultiplePurchases}
                  onChange={(e) => setAllowMultiplePurchases(e.target.checked)}
                  className="w-4 h-4 text-white border-white/15 rounded focus:ring-black"
                />
                <label htmlFor="allow_multiple_purchases" className="text-sm font-medium text-white">
                  Разрешить множественные покупки
                </label>
              </div>
              <p className="text-xs text-white/45 mt-2">
                {allowMultiplePurchases 
                  ? "Бит можно покупать много раз (как в аренду)"
                  : "Бит эксклюзивный - только один покупатель (по умолчанию)"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-[Syne] text-lg font-semibold text-white">Обложка</h2>
            </div>
            
            <div className="p-5">
              <div>
                <label htmlFor="beat_cover_file" className="admin-field-label">
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
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
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
                          <p className="text-sm font-medium text-white truncate">{beatFiles.cover_file.name}</p>
                          <p className="text-xs text-white/40">{formatFileSize(beatFiles.cover_file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFileRemove('cover_file', 'beat')}
                        className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-red-300" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="beat_cover_file"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/15 border-dashed rounded-xl cursor-pointer bg-white/[0.03] hover:bg-white/5 hover:border-[#22c55e]/40 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Image className="h-8 w-8 text-white/35 mb-2" />
                        <p className="mb-2 text-sm text-white/40">
                          <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                        </p>
                        <p className="text-xs text-white/35">JPEG, PNG или WebP</p>
                      </div>
                    </label>
                  )}
                </div>
                <p className="text-xs text-white/45 mt-1">
                  JPEG, PNG или WebP. Не SVG, не HEIC. Макс. 10 МБ.
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Лучше квадрат 1400×1400 или 2000×2000, JPEG/WebP до 400 КБ.
                  V3 кадрирует обложку на весь stage (левый край важнее) и в строку 72px — не грузи 4K PNG.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="admin-primary-btn w-full justify-center h-11"
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
            <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="font-[Syne] text-lg font-semibold text-white">Информация о курсе</h2>
              </div>
              
              <div className="space-y-4 p-5">
                <div>
                  <label htmlFor="course_title" className="admin-field-label">
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
                  <label htmlFor="course_purpose" className="admin-field-label">
                    Предназначение
                  </label>
                  <CustomSelect
                    id="course_purpose"
                    name="purpose"
                    value={courseFormData.purpose}
                    onChange={(v) => handleCourseInputChange({ target: { name: 'purpose', value: v } })}
                    options={[
                      { value: '', label: 'Выберите предназначение' },
                      { value: 'сведение', label: 'Сведение' },
                      { value: 'битмэйкинг', label: 'Битмэйкинг' },
                      { value: 'саунддизайн', label: 'Саунд-дизайн' }
                    ]}
                    placeholder="Выберите предназначение"
                  />
                </div>
                
                <div>
                  <label htmlFor="course_tags" className="admin-field-label">
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
                  <label htmlFor="course_price" className="admin-field-label">
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
                  <label htmlFor="course_description" className="admin-field-label">
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

            <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="font-[Syne] text-lg font-semibold text-white">Видео файлы</h2>
              </div>
              
              <div className="space-y-4 p-5">
                <div>
                  <label htmlFor="course_preview_video" className="admin-field-label">
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
                            <p className="text-sm font-medium text-white truncate">{courseFiles.preview_video_file.name}</p>
                            <p className="text-xs text-white/40">{formatFileSize(courseFiles.preview_video_file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFileRemove('preview_video_file', 'course')}
                          className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                        >
                          <X className="h-4 w-4 text-red-300" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="course_preview_video"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/15 border-dashed rounded-xl cursor-pointer bg-white/[0.03] hover:bg-white/5 hover:border-[#22c55e]/40 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Video className="h-8 w-8 text-white/35 mb-2" />
                          <p className="mb-2 text-sm text-white/40">
                            <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                          </p>
                          <p className="text-xs text-white/35">Видео файлы</p>
                        </div>
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    Короткое превью для просмотра на сайте
                  </p>
                </div>
                
                <div>
                  <label htmlFor="course_full_video" className="admin-field-label">
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
                            <p className="text-sm font-medium text-white truncate">{courseFiles.full_video_file.name}</p>
                            <p className="text-xs text-white/40">{formatFileSize(courseFiles.full_video_file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFileRemove('full_video_file', 'course')}
                          className="ml-3 p-1 hover:bg-red-100 rounded-full transition-colors"
                        >
                          <X className="h-4 w-4 text-red-300" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="course_full_video"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/15 border-dashed rounded-xl cursor-pointer bg-white/[0.03] hover:bg-white/5 hover:border-[#22c55e]/40 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Video className="h-8 w-8 text-white/35 mb-2" />
                          <p className="mb-2 text-sm text-white/40">
                            <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                          </p>
                          <p className="text-xs text-white/35">Видео файлы</p>
                        </div>
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    Полное видео для скачивания после покупки
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="admin-primary-btn w-full justify-center h-11"
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


