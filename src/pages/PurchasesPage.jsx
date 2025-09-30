import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BeatCard from '../components/BeatCard';
import { api } from '../utils/api';
import { Download, CheckCircle } from 'lucide-react';

const PurchasesPage = () => {
  const { isAuthenticated } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPurchases();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await api.get('/purchases');
      setPurchases(response.data);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (beatId) => {
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
        <p className="text-gray-600">
          {purchases.length} купленных битов
        </p>
      </div>

      {purchases.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-600 text-lg">Покупок пока нет</div>
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
                    src={`http://localhost:8000${beat.cover_url}`}
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
                
                {/* Download button overlay */}
                <button
                  onClick={() => handleDownload(beat.id)}
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                >
                  <div className="bg-primary-600 rounded-full p-3">
                    <Download className="h-6 w-6 text-white" />
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
                    onClick={() => handleDownload(beat.id)}
                    className="btn btn-primary btn-sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Скачать
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {/* Bottom padding to prevent overlap with mini player */}
      <div className="h-20"></div>
    </div>
  );
};

export default PurchasesPage;
