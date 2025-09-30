import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Edit, Trash2, Eye, Music } from 'lucide-react';

const AdminBeats = () => {
  const { isAdminAuthenticated } = useAuth();
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBeat, setEditingBeat] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchBeats();
    }
  }, [isAdminAuthenticated]);

  const fetchBeats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/beats');
      setBeats(response.data);
    } catch (error) {
      console.error('Error fetching beats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (beat) => {
    setEditingBeat(beat);
    setEditForm({
      title: beat.title,
      artist: beat.artist,
      genre: beat.genre,
      bpm: beat.bpm,
      price: beat.price,
      key: beat.key || '',
      description: beat.description || '',
      is_available: beat.is_available
    });
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/api/admin/beats/${editingBeat.id}`, editForm);
      setEditingBeat(null);
      fetchBeats();
    } catch (error) {
      console.error('Error updating beat:', error);
      alert('Ошибка обновления бита');
    }
  };

  const handleDelete = async (beatId) => {
    if (!confirm('Вы уверены, что хотите удалить этот бит?')) return;
    
    try {
      await api.delete(`/api/admin/beats/${beatId}`);
      fetchBeats();
    } catch (error) {
      console.error('Error deleting beat:', error);
      alert('Ошибка удаления бита');
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Доступ запрещен. Войдите как администратор.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Загрузка битов...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Управление битами</h1>
        <p className="text-gray-600">{beats.length} битов в каталоге</p>
      </div>

      {beats.length === 0 ? (
        <div className="text-center py-12">
          <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-600 text-lg">Биты не найдены</div>
          <p className="text-gray-500 mt-2">
            Загрузите первый бит для начала работы
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {beats.map(beat => (
            <div key={beat.id} className="card">
              <div className="card-content">
                <div className="flex items-center space-x-4">
                  {beat.cover_url ? (
                    <img
                      src={`http://localhost:8000${beat.cover_url}`}
                      alt={beat.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-300 rounded flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-black bg-opacity-5"></div>
                      <div className="relative z-10">
                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-black">{beat.title}</h3>
                    <p className="text-gray-600 text-sm">{beat.artist}</p>
                    <p className="text-gray-600 text-sm">
                      {beat.genre} • {beat.bpm} BPM • {beat.price === 0 ? 'Бесплатно' : `${beat.price.toFixed(0)} ₽`}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        beat.is_available 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {beat.is_available ? 'Доступен' : 'Недоступен'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(beat)}
                      className="btn btn-outline btn-sm"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(beat.id)}
                      className="btn btn-outline btn-sm text-red-400 hover:text-red-300 hover:border-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingBeat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 border border-gray-300">
            <h2 className="text-xl font-bold text-black mb-4">Редактировать бит</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Название
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Исполнитель
                </label>
                <input
                  type="text"
                  value={editForm.artist}
                  onChange={(e) => setEditForm({...editForm, artist: e.target.value})}
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Жанр
                </label>
                <input
                  type="text"
                  value={editForm.genre}
                  onChange={(e) => setEditForm({...editForm, genre: e.target.value})}
                  className="input w-full"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    BPM
                  </label>
                  <input
                    type="number"
                    value={editForm.bpm}
                    onChange={(e) => setEditForm({...editForm, bpm: parseInt(e.target.value)})}
                    className="input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Цена (₽)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value)})}
                    className="input w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Тональность
                </label>
                <input
                  type="text"
                  value={editForm.key}
                  onChange={(e) => setEditForm({...editForm, key: e.target.value})}
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Описание
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  className="input w-full h-20 resize-none"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={editForm.is_available}
                  onChange={(e) => setEditForm({...editForm, is_available: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="is_available" className="text-black text-sm">
                  Доступен для покупки
                </label>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={handleSaveEdit}
                className="btn btn-primary flex-1"
              >
                Сохранить
              </button>
              
              <button
                onClick={() => setEditingBeat(null)}
                className="btn btn-outline flex-1"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBeats;
