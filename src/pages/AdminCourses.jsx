import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, buildMediaUrl } from '../utils/api';
import { Pencil, Trash2, GraduationCap, Loader2, X } from 'lucide-react';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45';

const AdminCourses = () => {
  const { isAdminAuthenticated } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

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
      tags: course.tags || '',
    });
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      await api.put(`/api/admin/courses/${editingCourse.id}`, editForm);
      setEditingCourse(null);
      fetchCourses();
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Ошибка обновления курса');
    } finally {
      setSaving(false);
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
      <div className="py-12 text-center text-white/50">
        Доступ запрещен. Войдите как администратор.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <Loader2 className="h-5 w-5 animate-spin" />
        Загрузка курсов…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Курсы</h1>
        <p className="admin-page-sub">{courses.length} в каталоге</p>
      </div>

      <div className="admin-panel">
        {courses.length === 0 ? (
          <div className="admin-empty">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 text-white/25" />
            Курсов пока нет. Загрузите первый в разделе «Загрузка».
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Превью</th>
                  <th>Курс</th>
                  <th>Теги</th>
                  <th>Цена</th>
                  <th className="text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      {course.preview_video_url ? (
                        <div className="h-14 w-20 overflow-hidden rounded-xl bg-black">
                          <video
                            src={buildMediaUrl(course.preview_video_url)}
                            className="h-full w-full object-cover"
                            muted
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-white/5">
                          <GraduationCap className="h-5 w-5 text-white/30" />
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="font-medium text-white">{course.title}</div>
                      {course.purpose && (
                        <div className="mt-0.5 text-xs text-white/40">{course.purpose}</div>
                      )}
                      {course.description && (
                        <div className="mt-0.5 line-clamp-1 text-xs text-white/30">{course.description}</div>
                      )}
                    </td>
                    <td className="text-xs text-white/45">
                      {course.tags
                        ? course.tags.split(',').slice(0, 3).map((t) => t.trim()).filter(Boolean).join(' · ')
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap text-white/80">
                      {course.price === 0 ? 'Бесплатно' : `${course.price.toFixed(0)} ₽`}
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(course)}
                          className="admin-icon-btn"
                          aria-label="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(course.id)}
                          className="admin-icon-btn admin-icon-btn-danger"
                          aria-label="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingCourse && (
        <div className="admin-modal-backdrop">
          <div className="absolute inset-0" onClick={() => setEditingCourse(null)} aria-hidden="true" />
          <div className="admin-modal max-w-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-[Syne] text-xl font-bold text-white">Редактировать курс</h2>
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Название</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Назначение</label>
                <input
                  type="text"
                  value={editForm.purpose}
                  onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Теги (через запятую)</label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className={fieldClass}
                  placeholder="сведение, битмэйкинг"
                />
              </div>
              <div>
                <label className={labelClass}>Цена (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Описание</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className={`${fieldClass} h-20 resize-y`}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingCourse(null)} className="admin-ghost-btn">
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="admin-primary-btn"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
