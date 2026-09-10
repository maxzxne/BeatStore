import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileAudio,
  FileText,
  Link as LinkIcon,
  Loader2,
  Music,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { api, buildMediaUrl } from '../utils/api';
import { formatMoscowDate } from '../utils/dateUtils';
import { ruCount } from '../utils/ruPlural';

const QUEUES = [
  { id: 'action', label: 'Нужно действие' },
  { id: 'payment', label: 'Ждёт оплату' },
  { id: 'work', label: 'В работе' },
  { id: 'done', label: 'Сдано' },
  { id: 'cancelled', label: 'Отмена' },
  { id: 'all', label: 'Все' },
];

const STATUS_UI = {
  pending: { label: 'Новая', badge: 'admin-badge-warn' },
  confirmed: { label: 'Ждёт оплату', badge: 'admin-badge-warn' },
  paid: { label: 'В работе', badge: 'admin-badge-ok' },
  in_progress: { label: 'В работе', badge: 'admin-badge-ok' },
  completed: { label: 'Сдано', badge: 'admin-badge-ok' },
  cancelled: { label: 'Отменено', badge: 'admin-badge-err' },
};

const QUEUE_BY_STATUS = {
  pending: 'action',
  confirmed: 'payment',
  paid: 'work',
  in_progress: 'work',
  completed: 'done',
  cancelled: 'cancelled',
};

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

function orderQueue(order) {
  return order.queue || QUEUE_BY_STATUS[order.status] || 'action';
}

function formatMoney(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString('ru-RU')} ₽`;
}

function parseMediaList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  const raw = String(value).trim();
  if (!raw) return [];
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      /* fall through */
    }
  }
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function fileName(url) {
  try {
    const path = String(url).split('?')[0];
    return decodeURIComponent(path.split('/').pop() || 'файл');
  } catch {
    return 'файл';
  }
}

function customerName(order) {
  return order.user_username || order.customer_name || 'Гость';
}

function customerEmail(order) {
  return order.user_email || order.customer_email || '';
}

function categoriesOf(order) {
  if (order.service_categories?.length) return order.service_categories;
  return order.service_category ? [order.service_category] : [];
}

function nextStep(order) {
  const queue = orderQueue(order);
  if (queue === 'action') {
    return order.price || order.quoted_price ? 'Выставить счёт' : 'Указать цену';
  }
  if (queue === 'payment') return 'Ждёт клиента';
  if (queue === 'work') return 'Сдать заказ';
  if (queue === 'cancelled') return 'Вернуть';
  return '—';
}

function dueDate(order) {
  if (!order.deadline_days || !order.created_at) return null;
  const date = new Date(order.created_at);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + Number(order.deadline_days));
  return date;
}

const AdminOrders = () => {
  const { isAdminAuthenticated } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState('action');
  const [queueReady, setQueueReady] = useState(false);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [priceDraft, setPriceDraft] = useState('');
  const [prepayDraft, setPrepayDraft] = useState('50');
  const [noteDraft, setNoteDraft] = useState('');
  const [resultFiles, setResultFiles] = useState({ wav: null, mp3: null, zip: null });

  const selectedId = Number(searchParams.get('id')) || null;

  const fetchOrders = async () => {
    const response = await api.get('/api/admin/service-orders');
    setOrders(response.data || []);
    return response.data || [];
  };

  useEffect(() => {
    if (!isAdminAuthenticated) return undefined;
    let cancelled = false;
    const boot = async () => {
      try {
        setLoading(true);
        const rows = await fetchOrders();
        if (cancelled) return;
        if (!queueReady) {
          const counts = rows.reduce((acc, order) => {
            const key = orderQueue(order);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
          if (counts.action) setQueue('action');
          else if (counts.payment) setQueue('payment');
          else if (counts.work) setQueue('work');
          else setQueue('all');
          setQueueReady(true);
        }
      } catch (error) {
        if (!cancelled) showError(error.response?.data?.detail || 'Не удалось загрузить заявки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
  }, [isAdminAuthenticated]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedId) || null,
    [orders, selectedId]
  );

  useEffect(() => {
    if (!selectedOrder) {
      setPriceDraft('');
      setPrepayDraft('50');
      setNoteDraft('');
      setResultFiles({ wav: null, mp3: null, zip: null });
      return undefined;
    }
    setPriceDraft(selectedOrder.price ? String(selectedOrder.price) : selectedOrder.quoted_price ? String(selectedOrder.quoted_price) : '');
    setPrepayDraft(String(selectedOrder.prepayment_percent || 50));
    setNoteDraft(selectedOrder.admin_note || '');
    setResultFiles({ wav: null, mp3: null, zip: null });
    const onKey = (event) => {
      if (event.key === 'Escape') setSearchParams({});
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedOrder?.id]);

  const counts = useMemo(() => {
    const acc = { action: 0, payment: 0, work: 0, done: 0, cancelled: 0, all: orders.length };
    orders.forEach((order) => {
      const key = orderQueue(order);
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (queue !== 'all' && orderQueue(order) !== queue) return false;
      if (!needle) return true;
      const haystack = [
        `#${order.id}`,
        customerName(order),
        customerEmail(order),
        order.contact_info,
        order.description,
        order.admin_note,
        categoriesOf(order).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [orders, queue, query]);

  const openOrder = (id) => {
    setSearchParams(id ? { id: String(id) } : {});
  };

  const patchLocal = (updated) => {
    setOrders((prev) => prev.map((order) => (order.id === updated.id ? { ...order, ...updated } : order)));
  };

  const updateOrder = async (orderId, fields) => {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== null && value !== undefined) formData.append(key, String(value));
    });
    const response = await api.put(`/api/admin/service-orders/${orderId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const updated = response.data?.order;
    if (updated) patchLocal(updated);
    return updated;
  };

  const handleUpdate = async (fields, successMessage) => {
    if (!selectedOrder) return;
    try {
      setSaving(true);
      await updateOrder(selectedOrder.id, fields);
      if (successMessage) showSuccess(successMessage);
    } catch (error) {
      showError(error.response?.data?.detail || 'Не удалось обновить заявку');
    } finally {
      setSaving(false);
    }
  };

  const parsedPrice = () => {
    const value = parseFloat(priceDraft);
    return value > 0 ? value : null;
  };

  const sendInvoice = async () => {
    const price = parsedPrice();
    if (!price && !selectedOrder?.quoted_price) {
      showError('Сначала укажи стоимость');
      return;
    }
    const fields = { status: 'confirmed', prepayment_percent: Number(prepayDraft) || 50 };
    if (price) fields.price = price;
    await handleUpdate(fields, 'Счёт выставлен. Клиент может оплатить из профиля.');
  };

  const saveMoney = async () => {
    const price = parsedPrice();
    if (!price) {
      showError('Укажи стоимость');
      return;
    }
    await handleUpdate(
      { price, prepayment_percent: Number(prepayDraft) || 50 },
      'Стоимость сохранена'
    );
  };

  const saveNote = async () => {
    await handleUpdate({ admin_note: noteDraft }, 'Заметка сохранена');
  };

  const handleUploadResults = async () => {
    if (!selectedOrder) return;
    if (!resultFiles.wav && !resultFiles.mp3 && !resultFiles.zip) {
      showError('Выбери хотя бы один файл');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      if (resultFiles.wav) formData.append('wav_file', resultFiles.wav);
      if (resultFiles.mp3) formData.append('mp3_file', resultFiles.mp3);
      if (resultFiles.zip) formData.append('zip_file', resultFiles.zip);
      const response = await api.post(`/api/admin/service-orders/${selectedOrder.id}/upload-result`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data?.order) patchLocal(response.data.order);
      setResultFiles({ wav: null, mp3: null, zip: null });
      showSuccess('Файлы результата загружены');
    } catch (error) {
      showError(error.response?.data?.detail || 'Ошибка загрузки файлов');
    } finally {
      setUploading(false);
    }
  };

  const copyText = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showSuccess('Скопировано');
    } catch {
      showError('Не удалось скопировать');
    }
  };

  if (!isAdminAuthenticated) {
    return <div className="py-12 text-center text-white/50">Доступ запрещен. Войдите как администратор.</div>;
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <Loader2 className="h-5 w-5 animate-spin" />
        Загрузка заявок…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Продажи</p>
        <h1 className="admin-page-title mt-1">Заявки</h1>
        <p className="admin-page-sub">
          {counts.action
            ? `${ruCount(counts.action, 'заявка ждёт', 'заявки ждут', 'заявок ждут')} действия · ${orders.length} всего`
            : `${orders.length} всего`}
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="admin-queue-tabs" role="tablist" aria-label="Очереди заявок">
          {QUEUES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={queue === item.id}
              className={`admin-queue-tab ${queue === item.id ? 'is-active' : ''}`}
              onClick={() => setQueue(item.id)}
            >
              {item.label}
              <span className="admin-queue-count">{counts[item.id] || 0}</span>
            </button>
          ))}
        </div>
        <label className="relative block w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск: имя, почта, #id, услуга"
            aria-label="Поиск заявок"
            className={`${fieldClass} pl-9`}
          />
        </label>
      </div>

      <div className="admin-panel">
        {visibleOrders.length === 0 ? (
          <div className="admin-empty">
            <FileText className="mx-auto mb-3 h-10 w-10 text-white/25" />
            {orders.length === 0 ? 'Заявок пока нет' : 'В этой очереди пусто'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Клиент</th>
                  <th>Услуга</th>
                  <th>Срок</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th>Дальше</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => {
                  const status = STATUS_UI[order.status] || STATUS_UI.pending;
                  const due = dueDate(order);
                  const overdue = due && due.getTime() < Date.now() && orderQueue(order) !== 'done' && orderQueue(order) !== 'cancelled';
                  return (
                    <tr
                      key={order.id}
                      className={selectedId === order.id ? 'is-selected' : ''}
                      onClick={() => openOrder(order.id)}
                    >
                      <td className="whitespace-nowrap font-medium text-white/80">#{order.id}</td>
                      <td>
                        <div className="font-medium text-white">{customerName(order)}</div>
                        <div className="text-xs text-white/40">{customerEmail(order) || 'без почты'}</div>
                      </td>
                      <td>
                        <div className="max-w-[220px] truncate text-white/80">
                          {categoriesOf(order).join(', ') || (order.order_type === 'dont_know' ? 'Нужно обсуждение' : 'Заказ')}
                        </div>
                        <div className="text-xs text-white/35">
                          {order.order_type === 'dont_know' ? 'Обсуждение' : 'Бриф'}
                        </div>
                      </td>
                      <td className={`whitespace-nowrap text-xs ${overdue ? 'text-red-300' : 'text-white/45'}`}>
                        {order.deadline_days ? ruCount(order.deadline_days, 'день', 'дня', 'дней') : '—'}
                      </td>
                      <td className="whitespace-nowrap text-white/80">
                        {order.price ? formatMoney(order.price) : order.quoted_price ? formatMoney(order.quoted_price) : '—'}
                      </td>
                      <td>
                        <span className={`admin-badge ${status.badge}`}>{status.label}</span>
                      </td>
                      <td className="whitespace-nowrap text-xs text-white/55">{nextStep(order)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          saving={saving}
          uploading={uploading}
          priceDraft={priceDraft}
          prepayDraft={prepayDraft}
          noteDraft={noteDraft}
          resultFiles={resultFiles}
          onClose={() => openOrder(null)}
          onPrice={setPriceDraft}
          onPrepay={setPrepayDraft}
          onNote={setNoteDraft}
          onResultFile={(type, file) => setResultFiles((prev) => ({ ...prev, [type]: file }))}
          onSendInvoice={sendInvoice}
          onSaveMoney={saveMoney}
          onSaveNote={saveNote}
          onUpload={handleUploadResults}
          onCopy={copyText}
          onAction={(fields, message) => handleUpdate(fields, message)}
        />
      )}
    </div>
  );
};

function FileRow({ url, label, icon: Icon }) {
  if (!url) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-white/45" />
        <span className="truncate text-sm text-white/70">{label}</span>
      </div>
      <a href={buildMediaUrl(url)} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-[#22c55e] hover:underline">
        Скачать
      </a>
    </div>
  );
}

function OrderDrawer({
  order,
  saving,
  uploading,
  priceDraft,
  prepayDraft,
  noteDraft,
  resultFiles,
  onClose,
  onPrice,
  onPrepay,
  onNote,
  onResultFile,
  onSendInvoice,
  onSaveMoney,
  onSaveNote,
  onUpload,
  onCopy,
  onAction,
}) {
  const queue = orderQueue(order);
  const status = STATUS_UI[order.status] || STATUS_UI.pending;
  const cats = categoriesOf(order);
  const materials = parseMediaList(order.materials_url);
  const refFiles = parseMediaList(order.reference_files_url);
  const refLinks = parseMediaList(order.reference_links);
  const due = dueDate(order);
  const dueNow = order.due_amount || (order.price && (order.price * (order.prepayment_percent || 50)) / 100);
  const busy = saving || uploading;
  const canInvoice = queue === 'action';
  const canDeliver = queue === 'work';
  const hasResults = Boolean(order.result_wav_url || order.result_mp3_url || order.result_zip_url);

  const primary = () => {
    if (canInvoice) {
      return (
        <button type="button" className="admin-primary-btn w-full justify-center" disabled={busy} onClick={onSendInvoice}>
          Выставить счёт
        </button>
      );
    }
    if (queue === 'payment') {
      return (
        <button
          type="button"
          className="admin-primary-btn w-full justify-center"
          disabled={busy}
          onClick={() => onAction({ status: 'paid' }, 'Оплата отмечена, заказ в работе')}
        >
          Оплата получена
        </button>
      );
    }
    if (canDeliver) {
      return (
        <button
          type="button"
          className="admin-primary-btn w-full justify-center"
          disabled={busy}
          onClick={() => {
            if (!hasResults && !window.confirm('Сдать заказ без файлов результата?')) return;
            onAction({ status: 'completed' }, 'Заказ сдан');
          }}
        >
          Сдать заказ
        </button>
      );
    }
    if (queue === 'cancelled') {
      return (
        <button
          type="button"
          className="admin-primary-btn w-full justify-center"
          disabled={busy}
          onClick={() => onAction({ status: 'pending' }, 'Заявка снова в очереди')}
        >
          Вернуть в очередь
        </button>
      );
    }
    return null;
  };

  return (
    <div className="admin-drawer-backdrop">
      <button type="button" className="admin-drawer-scrim" aria-label="Закрыть заявку" onClick={onClose} />
      <aside className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="order-drawer-title">
        <header className="admin-drawer-head">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Заявка</p>
            <h2 id="order-drawer-title" className="font-[Syne] text-xl font-bold text-white">
              #{order.id}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`admin-badge ${status.badge}`}>{status.label}</span>
            <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="Закрыть">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="admin-drawer-body">
          <section>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="admin-field-label">Клиент</p>
                <p className="text-white">{customerName(order)}</p>
                <p className="text-sm text-white/45">{customerEmail(order) || 'Почта не указана'}</p>
                {!order.user_id && <p className="mt-1 text-xs text-white/35">Гость, без аккаунта</p>}
              </div>
              {customerEmail(order) && (
                <button type="button" className="admin-ghost-btn !px-3 !py-2 text-xs" onClick={() => onCopy(customerEmail(order))}>
                  Почта
                </button>
              )}
            </div>
            {order.contact_info && (
              <button type="button" className="mt-2 text-left text-sm text-[#22c55e] hover:underline" onClick={() => onCopy(order.contact_info)}>
                {order.contact_info}
              </button>
            )}
          </section>

          <section>
            <p className="admin-field-label">Услуга</p>
            {cats.length ? (
              <div className="flex flex-wrap gap-1.5">
                {cats.map((cat) => (
                  <span key={cat} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80">
                    {cat}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white/70">{order.order_type === 'dont_know' ? 'Клиент не знает, что нужно — обсудить' : 'Не указано'}</p>
            )}
            <p className="mt-2 text-xs text-white/40">
              {order.order_type === 'dont_know' ? 'Тип: обсуждение' : 'Тип: бриф'} · {formatMoscowDate(order.created_at)}
              {order.deadline_days ? ` · срок ${ruCount(order.deadline_days, 'день', 'дня', 'дней')}` : ''}
              {due ? ` · до ${due.toLocaleDateString('ru-RU')}` : ''}
            </p>
          </section>

          {order.description && (
            <section>
              <p className="admin-field-label">ТЗ</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{order.description}</p>
            </section>
          )}

          {(materials.length > 0 || refFiles.length > 0 || refLinks.length > 0) && (
            <section className="space-y-2">
              <p className="admin-field-label">Материалы</p>
              {materials.map((url) => (
                <FileRow key={url} url={url} label={fileName(url)} icon={Upload} />
              ))}
              {refFiles.map((url) => (
                <FileRow key={url} url={url} label={`Референс · ${fileName(url)}`} icon={FileAudio} />
              ))}
              {refLinks.map((link) => (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 truncate text-sm text-[#22c55e] hover:underline"
                >
                  <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                  {link}
                </a>
              ))}
            </section>
          )}

          <section className="space-y-3">
            <p className="admin-field-label">Деньги</p>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1 block text-xs text-white/40">Стоимость, ₽</span>
                <input
                  type="number"
                  min="1"
                  value={priceDraft}
                  onChange={(event) => onPrice(event.target.value)}
                  className={fieldClass}
                  placeholder={order.quoted_price ? String(order.quoted_price) : '0'}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs text-white/40">Предоплата</span>
                <select value={prepayDraft} onChange={(event) => onPrepay(event.target.value)} className={fieldClass}>
                  <option value="50">50%</option>
                  <option value="100">100%</option>
                </select>
              </label>
            </div>
            <p className="text-xs text-white/40">
              {dueNow > 0 ? `К оплате сейчас: ${formatMoney(dueNow)}` : 'Сначала укажи стоимость, потом выставляй счёт'}
              {order.quoted_price && !order.price ? ` · тариф ${formatMoney(order.quoted_price)}` : ''}
            </p>
            {queue !== 'done' && queue !== 'cancelled' && (
              <button type="button" className="admin-ghost-btn text-xs" disabled={busy} onClick={onSaveMoney}>
                Сохранить сумму
              </button>
            )}
          </section>

          <section className="space-y-2">
            <p className="admin-field-label">Заметка себе</p>
            <textarea
              value={noteDraft}
              onChange={(event) => onNote(event.target.value)}
              rows={3}
              className={fieldClass}
              placeholder="Что обсудили, куда скинуть, кто должен деньги"
            />
            <button type="button" className="admin-ghost-btn text-xs" disabled={busy} onClick={onSaveNote}>
              Сохранить заметку
            </button>
          </section>

          {(queue === 'work' || queue === 'done' || hasResults) && (
            <section className="space-y-3">
              <p className="admin-field-label">Результат</p>
              <div className="space-y-2">
                <FileRow url={order.result_wav_url} label="WAV" icon={FileAudio} />
                <FileRow url={order.result_mp3_url} label="MP3" icon={Music} />
                <FileRow url={order.result_zip_url} label="ZIP" icon={FileText} />
              </div>
              {queue !== 'cancelled' && (
                <div className="space-y-2">
                  {['wav', 'mp3', 'zip'].map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm text-white/60">
                      <span className="w-10 uppercase text-white/35">{type}</span>
                      <input
                        type="file"
                        className="block w-full text-xs text-white/50 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white"
                        accept={type === 'zip' ? '.zip,application/zip' : 'audio/*'}
                        onChange={(event) => onResultFile(type, event.target.files?.[0] || null)}
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className="admin-ghost-btn w-full justify-center text-xs"
                    disabled={busy || (!resultFiles.wav && !resultFiles.mp3 && !resultFiles.zip)}
                    onClick={onUpload}
                  >
                    {uploading ? 'Загрузка…' : hasResults ? 'Заменить файлы' : 'Загрузить файлы'}
                  </button>
                </div>
              )}
            </section>
          )}

          {queue !== 'cancelled' && queue !== 'done' && (
            <details className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <summary className="cursor-pointer text-xs uppercase tracking-wide text-white/40">Другие статусы</summary>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {order.status !== 'pending' && (
                  <button type="button" className="admin-ghost-btn text-xs" disabled={busy} onClick={() => onAction({ status: 'pending' }, 'Вернули в новые')}>
                    В новые
                  </button>
                )}
                {order.status !== 'in_progress' && (order.status === 'paid' || order.status === 'confirmed') && (
                  <button type="button" className="admin-ghost-btn text-xs" disabled={busy} onClick={() => onAction({ status: 'in_progress' }, 'В работе')}>
                    Пометить «в работе»
                  </button>
                )}
              </div>
            </details>
          )}
        </div>

        <footer className="admin-drawer-foot">
          {primary()}
          {queue !== 'cancelled' && queue !== 'done' && (
            <button
              type="button"
              className="admin-ghost-btn w-full justify-center text-red-300 hover:border-red-400 hover:text-red-200"
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Отменить заявку?')) return;
                onAction({ status: 'cancelled' }, 'Заявка отменена');
              }}
            >
              Отменить заявку
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}

export default AdminOrders;
