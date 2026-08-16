import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { api } from '../../utils/api';
import { Button, Field, TextInput } from '../components/Primitives';
import {
  SERVICE_CATEGORIES,
  calculateTotalPrice,
  categoryDescription,
  categoryLabel,
  emptyOrderForm,
  getPrice,
  getServiceCounts,
} from '../orderLogic';

function FileDrop({ files, name, onChange, onRemove, hint }) {
  return (
    <div>
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} className="v3-file-row">
          <span className="truncate">{file.name}</span>
          <button type="button" className="v3-icon-btn" aria-label="Убрать файл" onClick={() => onRemove(name, index)}>
            <X size={14} />
          </button>
        </div>
      ))}
      <label
        className="v3-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onChange(name, Array.from(event.dataTransfer.files));
        }}
      >
        <Upload size={16} className="mb-2" />
        {hint}
        <input type="file" name={name} multiple className="hidden" onChange={(event) => onChange(name, Array.from(event.target.files || []))} />
      </label>
    </div>
  );
}

export default function OrderPageV3() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [orderType, setOrderType] = useState(null);
  const [formData, setFormData] = useState(() => emptyOrderForm(null));
  const [uploading, setUploading] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData((prev) => ({
        ...prev,
        customer_name: prev.customer_name || user.username || '',
        customer_email: prev.customer_email || user.email || '',
        contact_info: prev.contact_info || user.additional_contact || '',
      }));
    }
  }, [isAuthenticated, user]);

  const reset = () => setFormData(emptyOrderForm(isAuthenticated ? user : null));

  const onField = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addFiles = (name, next) => {
    setFormData((prev) => ({ ...prev, [name]: [...prev[name], ...next] }));
  };

  const removeFile = (name, index) => {
    setFormData((prev) => ({ ...prev, [name]: prev[name].filter((_, i) => i !== index) }));
  };

  const simpleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.customer_name || !formData.customer_email) {
      showError('Укажите имя и email');
      return;
    }
    try {
      setUploading(true);
      await api.post('/service-orders', {
        order_type: 'dont_know',
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        description: formData.description || 'Пользователь не знает, что хочет. Требуется обсуждение.',
        contact_info: formData.contact_info || null,
      });
      showSuccess('Заявка отправлена. Свяжемся для обсуждения.');
      reset();
      setOrderType(null);
    } catch (err) {
      showError(err.response?.data?.detail || 'Ошибка заявки');
    } finally {
      setUploading(false);
    }
  };

  const detailedSubmit = async (event) => {
    event.preventDefault();
    if (!formData.service_categories.length) return showError('Выберите хотя бы одну услугу');
    if (!formData.deadline_days) return showError('Укажите срок');
    if (!isAuthenticated && (!formData.customer_name || !formData.customer_email)) {
      return showError('Укажите имя и email');
    }
    try {
      setUploading(true);
      const materialsUrls = [];
      for (const file of formData.materials) {
        const payload = new FormData();
        payload.append('file', file);
        const response = await api.post('/upload-materials', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        materialsUrls.push(response.data.url);
      }
      const referenceUrls = [];
      for (const file of formData.reference_files) {
        const payload = new FormData();
        payload.append('file', file);
        const response = await api.post('/upload-reference-files', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        referenceUrls.push(response.data.url);
      }
      const response = await api.post('/service-orders', {
        order_type: 'know',
        service_categories: formData.service_categories,
        materials_url: materialsUrls.length ? JSON.stringify(materialsUrls) : null,
        reference_links: formData.reference_links,
        reference_files_url: referenceUrls.length ? JSON.stringify(referenceUrls) : null,
        description: formData.description,
        deadline_days: parseInt(formData.deadline_days, 10),
        prepayment_percent: formData.prepayment_percent,
        contact_info: formData.contact_info || null,
        customer_name: !isAuthenticated ? formData.customer_name : null,
        customer_email: !isAuthenticated ? formData.customer_email : null,
      });
      const total = calculateTotalPrice(formData);
      const prepay = total * (formData.prepayment_percent / 100);
      if (total > 0) {
        const params = new URLSearchParams({
          type: 'order',
          order_id: String(response.data.id),
          total_price: String(prepay),
        });
        navigate(`/test-payment?${params.toString()}`);
        return;
      }
      showSuccess('Заказ создан');
      reset();
      setOrderType(null);
    } catch (err) {
      showError(err.response?.data?.detail || 'Ошибка заказа');
    } finally {
      setUploading(false);
    }
  };

  if (orderType === null) {
    return (
      <div className="v3-shell v3-narrow v3-catalog">
        <div className="v3-page-head">
          <h1>Заказ</h1>
          <p>Кастомный бит, сведение, трек под ключ</p>
        </div>
        <button type="button" className="v3-choice" onClick={() => setOrderType('know')}>
          <h3>Я знаю, что хочу</h3>
          <p>Услуги, срок, предоплата и расчёт стоимости</p>
        </button>
        <button type="button" className="v3-choice" onClick={() => setOrderType('dont_know')}>
          <h3>Пока не уверен</h3>
          <p>Короткая заявка — обсудим детали</p>
        </button>
      </div>
    );
  }

  if (orderType === 'dont_know') {
    return (
      <div className="v3-shell v3-narrow v3-catalog">
        <button type="button" className="v3-btn v3-btn-ghost px-0 mb-4" onClick={() => setOrderType(null)}>← Назад</button>
        <div className="v3-page-head">
          <h1>Простая заявка</h1>
          <p>Заполните форму, свяжемся для обсуждения</p>
        </div>
        <form onSubmit={simpleSubmit} className="space-y-6">
          <Field label="Имя *"><TextInput name="customer_name" value={formData.customer_name} onChange={onField} required /></Field>
          <Field label="Email *"><TextInput type="email" name="customer_email" value={formData.customer_email} onChange={onField} required /></Field>
          <Field label="Описание"><textarea className="v3-textarea" name="description" value={formData.description} onChange={onField} /></Field>
          <Field label="Связь (Telegram, WhatsApp)"><TextInput name="contact_info" value={formData.contact_info} onChange={onField} /></Field>
          <label className="v3-check">
            <input type="checkbox" required />
            <span>
              Принимаю <Link to="/terms">соглашение</Link> и <Link to="/privacy">политику</Link>, даю согласие на обработку ПДн.
            </span>
          </label>
          <Button type="submit" disabled={uploading}>{uploading ? 'Отправка…' : 'Отправить заявку'}</Button>
        </form>
      </div>
    );
  }

  const total = calculateTotalPrice(formData);
  const prepay = total * (formData.prepayment_percent / 100);
  const counts = getServiceCounts(formData.service_categories);

  return (
    <div className="v3-shell v3-narrow v3-catalog">
      <button type="button" className="v3-btn v3-btn-ghost px-0 mb-4" onClick={() => setOrderType(null)}>← Назад</button>
      <div className="v3-page-head">
        <h1>Подробный заказ</h1>
        <p>Услуги, срок и предоплата</p>
      </div>
      <form onSubmit={detailedSubmit}>
        <div className="v3-panel space-y-5">
          <p className="v3-label">Контакты</p>
          <Field label="Имя *"><TextInput name="customer_name" value={formData.customer_name} onChange={onField} required={!isAuthenticated} /></Field>
          <Field label="Email *"><TextInput type="email" name="customer_email" value={formData.customer_email} onChange={onField} required={!isAuthenticated} /></Field>
          <Field label="Доп. связь"><TextInput name="contact_info" value={formData.contact_info} onChange={onField} /></Field>
        </div>

        <div className="v3-panel space-y-4">
          <p className="v3-label">Услуги</p>
          {formData.service_categories.map((value, index) => (
            <div key={`${value}-${index}`} className="v3-file-row">
              <span>{categoryLabel(value)}{categoryDescription(value) ? ` — ${categoryDescription(value)}` : ''}</span>
              <button
                type="button"
                className="v3-icon-btn"
                aria-label="Убрать услугу"
                onClick={() => setFormData((prev) => ({ ...prev, service_categories: prev.service_categories.filter((_, i) => i !== index) }))}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {showCategories ? (
            <div>
              {SERVICE_CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  className="v3-choice"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, service_categories: [...prev.service_categories, category.value] }));
                    setShowCategories(false);
                  }}
                >
                  <h3>{category.label}</h3>
                  {category.description && <p>{category.description}</p>}
                </button>
              ))}
              <Button variant="ghost" onClick={() => setShowCategories(false)}>Отмена</Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setShowCategories(true)}>Добавить услугу</Button>
          )}
          <Field label="Срок, дни *">
            <TextInput type="number" min="1" name="deadline_days" value={formData.deadline_days} onChange={onField} required placeholder="1, 3, 7, 14…" />
          </Field>
          <Field label="ТЗ">
            <textarea className="v3-textarea" name="description" value={formData.description} onChange={onField} />
          </Field>
        </div>

        <div className="v3-panel space-y-5">
          <p className="v3-label">Файлы</p>
          <Field label="Материалы">
            <FileDrop files={formData.materials} name="materials" onChange={addFiles} onRemove={removeFile} hint="Нажмите или перетащите файлы" />
          </Field>
          <Field label="Ссылки на референсы">
            <textarea className="v3-textarea" name="reference_links" value={formData.reference_links} onChange={onField} />
          </Field>
          <Field label="Референсы файлами">
            <FileDrop files={formData.reference_files} name="reference_files" onChange={addFiles} onRemove={removeFile} hint="Нажмите или перетащите файлы" />
          </Field>
        </div>

        <div className="v3-panel space-y-4">
          <p className="v3-label">Предоплата</p>
          <div className="flex gap-6">
            {[50, 100].map((value) => (
              <label key={value} className="v3-check">
                <input
                  type="radio"
                  name="prepayment_percent"
                  checked={formData.prepayment_percent === value}
                  onChange={() => setFormData((prev) => ({ ...prev, prepayment_percent: value }))}
                />
                {value}%
              </label>
            ))}
          </div>
          <div className="v3-choice !cursor-default hover:!bg-[var(--surface)]">
            <h3>Расчёт</h3>
            {formData.service_categories.length === 0 ? (
              <p>Выберите услуги</p>
            ) : (
              Object.entries(counts).map(([category, count]) => {
                const trap = category === 'бит в стиле трэп';
                const price = trap ? 15000 : getPrice(formData.deadline_days, formData.prepayment_percent);
                return (
                  <p key={category}>
                    {categoryLabel(category)} × {count}
                    {price ? ` — ${(price * count).toLocaleString('ru-RU')} ₽` : ' — укажите срок'}
                  </p>
                );
              })
            )}
            {total > 0 && (
              <p className="mt-2 text-[var(--text)]">
                Итого {total.toLocaleString('ru-RU')} ₽ · предоплата {prepay.toLocaleString('ru-RU')} ₽
              </p>
            )}
          </div>
        </div>

        <label className="v3-check mt-6">
          <input type="checkbox" required />
          <span>
            Принимаю <Link to="/terms">соглашение</Link> и <Link to="/privacy">политику</Link>, даю согласие на обработку ПДн.
          </span>
        </label>
        <Button type="submit" className="mt-6" disabled={uploading || total === 0}>
          {uploading ? 'Отправка…' : total > 0 ? `Оформить · ${prepay.toLocaleString('ru-RU')} ₽` : 'Оформить заказ'}
        </Button>
      </form>
    </div>
  );
}
