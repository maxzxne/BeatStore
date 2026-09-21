import React, { useEffect, useRef, useState } from 'react';
import { Copy, UserPlus, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

const copyText = async (value, input) => {
  if (input) {
    input.focus();
    input.select();
    try {
      input.setSelectionRange(0, value.length);
    } catch {
      /* some browsers reject setSelectionRange on type=text in edge cases */
    }
  }
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    }
  }
};

const AdminContributorsPage = () => {
  const { isAdminAuthenticated } = useAuth();
  const [people, setPeople] = useState([]);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const inviteInputRef = useRef(null);

  const load = async () => {
    const response = await api.get('/api/admin/contributors');
    setPeople(response.data);
  };

  useEffect(() => {
    if (isAdminAuthenticated) load().catch(() => setError('Не удалось загрузить список'));
  }, [isAdminAuthenticated]);

  if (!isAdminAuthenticated) return null;

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await api.post('/api/admin/contributors', { name, notes });
      setName('');
      setNotes('');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось создать');
    }
  };

  const handleInvite = async (id) => {
    const response = await api.post(`/api/admin/contributors/${id}/invite`);
    const url = response.data.invite_url;
    setInviteUrl(url);
    setCopied(false);
    requestAnimationFrame(async () => {
      const ok = await copyText(url, inviteInputRef.current);
      if (ok) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    const ok = await copyText(inviteUrl, inviteInputRef.current);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetQuota = async (person) => {
    if (!window.confirm(`Сбросить лимит загрузок для ${person.name}? Он снова сможет заливать сегодня.`)) {
      return;
    }
    await api.post(`/api/admin/contributors/${person.id}/reset-quota`);
    await load();
  };

  const handleToggle = async (person) => {
    await api.patch(`/api/admin/contributors/${person.id}`, { is_active: !person.is_active });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Люди</h1>
        <p className="admin-page-sub">На кого считать продажи. Не витрина и не роль админки.</p>
      </div>

      <form onSubmit={handleCreate} className="admin-panel space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Имя"
            className={fieldClass}
          />
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Заметка"
            className={fieldClass}
          />
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button type="submit" className="admin-primary-btn inline-flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Добавить
        </button>
      </form>

      {inviteUrl && (
        <div
          data-selectable
          className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 p-4"
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
        >
          <p className="mb-2 text-sm text-[#86efac]">Приглашение (одноразовое, 7 дней)</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={inviteInputRef}
              readOnly
              value={inviteUrl}
              onFocus={(event) => event.target.select()}
              onClick={(event) => event.target.select()}
              className={`${fieldClass} cursor-text font-mono text-xs sm:text-sm`}
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
              aria-label="Ссылка приглашения"
            />
            <button type="button" className="admin-primary-btn shrink-0" onClick={handleCopyInvite}>
              <Copy className="mr-1 inline h-3.5 w-3.5" />
              {copied ? 'Скопировано' : 'Копировать'}
            </button>
          </div>
          <p className="mt-2 text-xs text-white/40">
            Клик по ссылке выделяет всё. Можно Ctrl/⌘C или кнопку «Копировать».
          </p>
        </div>
      )}

      <div className="admin-panel overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Статус</th>
              <th>Аккаунт</th>
              <th className="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id}>
                <td>
                  <div className="font-medium">{person.name}</div>
                  {person.notes && <div className="text-xs text-white/40">{person.notes}</div>}
                </td>
                <td>
                  <span className={`admin-badge ${person.is_active ? 'admin-badge-ok' : 'admin-badge-err'}`}>
                    {person.is_active ? 'Активен' : 'Выключен'}
                  </span>
                </td>
                <td className="text-white/50">{person.user_id ? `#${person.user_id}` : 'ещё не вошёл'}</td>
                <td>
                  <div className="flex justify-end gap-2">
                    <button type="button" className="admin-ghost-btn" onClick={() => handleInvite(person.id)}>
                      <Copy className="mr-1 inline h-3.5 w-3.5" />
                      Инвайт
                    </button>
                    <button type="button" className="admin-ghost-btn" onClick={() => handleResetQuota(person)}>
                      <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
                      Сбросить лимит
                    </button>
                    <button type="button" className="admin-ghost-btn" onClick={() => handleToggle(person)}>
                      {person.is_active ? 'Выключить' : 'Включить'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {people.length === 0 && <div className="admin-empty">Пока никого нет.</div>}
      </div>
    </div>
  );
};

export default AdminContributorsPage;
