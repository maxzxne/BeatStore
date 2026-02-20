import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Edit, Trash2, GraduationCap } from 'lucide-react';

// Получаем API URL для построения полных URL файлов
const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');

const AdminCourses = () => {
  const { isAdminAuthenticated } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchCourses();
    }
  }, [isAdminAuthenticated]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setEditForm({
      title: course.title,
      purpose: course.purpose || '',
      description: course.description || '',
      price: course.price,
      tags: course.tags || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/api/admin/courses/${editingCourse.id}`, editForm);
      setEditingCourse(null);
      fetchCourses();
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Ошибка обновления курса');
    }
  };

  const handleDelete = async (courseId) => {
    if (!confirm('Вы уверены, что хотите удалить этот курс?')) return;
    
    try {
      await api.delete(`/api/admin/courses/${courseId}`);
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Ошибка удаления курса');
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 dark:text-neutral-400">Доступ запрещен. Войдите как администратор.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-neutral-400">Загрузка курсов...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Управление курсами</h1>
        <p className="text-gray-600 dark:text-neutral-400">{courses.length} курсов в каталоге</p>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-600 dark:text-neutral-400 text-lg">Курсы не найдены</div>
          <p className="text-gray-500 dark:text-neutral-500 mt-2">
            Загрузите первый курс для начала работы
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map(course => (
            <div key={course.id} className="card">
              <div className="card-content">
                <div className="flex items-center space-x-4">
                  {course.preview_video_url ? (
                    <div className="w-24 h-24 bg-black rounded overflow-hidden flex-shrink-0">
                      <video
                        src={`${API_URL}${course.preview_video_url}`}
                        className="w-full h-full object-cover"
                        muted
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-300 rounded flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-8 w-8 text-gray-400 dark:text-neutral-500" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-black dark:text-white">{course.title}</h3>
                    {course.purpose && (
                      <p className="text-gray-600 dark:text-neutral-400 text-sm">{course.purpose}</p>
                    )}
                    <p className="text-gray-600 dark:text-neutral-400 text-sm">
                      {course.tags && `${course.tags.split(',')[0]} • `}
                      {course.price === 0 ? 'Бесплатно' : `${course.price.toFixed(0)} ₽`}
                    </p>
                    {course.description && (
                      <p className="text-gray-500 dark:text-neutral-500 text-xs mt-1 line-clamp-2">{course.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(course)}
                      className="btn btn-outline btn-sm"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(course.id)}
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
      {editingCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 border border-gray-300 dark:border-neutral-700">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Редактировать курс</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
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
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Назначение
                </label>
                <input
                  type="text"
                  value={editForm.purpose}
                  onChange={(e) => setEditForm({...editForm, purpose: e.target.value})}
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Теги (через запятую)
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                  className="input w-full"
                  placeholder="сведение, битмэйкинг"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
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
              
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  Описание
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  className="input w-full h-20 resize-none"
                />
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
                onClick={() => setEditingCourse(null)}
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

export default AdminCourses;


