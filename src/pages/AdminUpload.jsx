import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Upload, Music, Image, FileAudio } from 'lucide-react';

const AdminUpload = () => {
  const { isAdminAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    genre: '',
    bpm: '',
    price: '',
    key: '',
    description: ''
  });
  const [files, setFiles] = useState({
    demo_file: null,
    full_file: null,
    cover_file: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFiles(prev => ({
      ...prev,
      [name]: files[0] || null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!files.demo_file) {
      alert('Демо файл обязателен');
      return;
    }

    setLoading(true);
    
    try {
      const submitData = new FormData();
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          submitData.append(key, value);
        }
      });
      
      // Add files
      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          submitData.append(key, file);
        }
      });

      const response = await api.post('/api/admin/upload-beat', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Бит успешно загружен!');
      
      // Reset form
      setFormData({
        title: '',
        artist: '',
        genre: '',
        bpm: '',
        price: '',
        key: '',
        description: ''
      });
      setFiles({
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

  if (!isAdminAuthenticated) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Доступ запрещен. Войдите как администратор.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Загрузить бит</h1>
        <p className="text-gray-600">Добавить новый бит в каталог</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-white">Beat Information</h2>
            </div>
            
            <div className="card-content space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Название *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Исполнитель *
                  </label>
                  <input
                    type="text"
                    name="artist"
                    value={formData.artist}
                    onChange={handleInputChange}
                    className="input w-full"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Жанр *
                  </label>
                  <input
                    type="text"
                    name="genre"
                    value={formData.genre}
                    onChange={handleInputChange}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    BPM *
                  </label>
                  <input
                    type="number"
                    name="bpm"
                    value={formData.bpm}
                    onChange={handleInputChange}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Цена (₽) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="input w-full"
                    placeholder="0"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Тональность
                </label>
                <input
                  type="text"
                  name="key"
                  value={formData.key}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="e.g., C, F#, Am"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Описание
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="input w-full h-20 resize-none"
                  placeholder="Describe your beat..."
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-black">Аудио файлы</h2>
            </div>
            
            <div className="card-content space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Демо файл *
                </label>
                <div className="flex items-center space-x-3">
                  <FileAudio className="h-5 w-5 text-dark-400" />
                  <input
                    type="file"
                    name="demo_file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="input flex-1"
                    required
                  />
                </div>
                <p className="text-xs text-dark-400 mt-1">
                  Короткая превью версия вашего бита
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Полный файл
                </label>
                <div className="flex items-center space-x-3">
                  <FileAudio className="h-5 w-5 text-dark-400" />
                  <input
                    type="file"
                    name="full_file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="input flex-1"
                  />
                </div>
                <p className="text-xs text-dark-400 mt-1">
                  Полная версия для скачивания после покупки
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-black">Обложка</h2>
            </div>
            
            <div className="card-content">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Обложка
                </label>
                <div className="flex items-center space-x-3">
                  <Image className="h-5 w-5 text-dark-400" />
                  <input
                    type="file"
                    name="cover_file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="input flex-1"
                  />
                </div>
                <p className="text-xs text-dark-400 mt-1">
                  Опциональная обложка для вашего бита
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
      </div>
    </div>
  );
};

export default AdminUpload;
