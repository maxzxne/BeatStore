import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { api } from '../utils/api';
import { checkoutErrorMessage, formatRub, startCheckout } from '../utils/checkout';
import { PayActions, PaymentTicket, TestBadge } from './PaymentChrome';

const KIND_FROM_QUERY = {
  cart: 'cart',
  beat: 'beat',
  course: 'course',
  order: 'order',
};

const PaymentPayPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const invId = params.get('inv_id') || params.get('InvId');
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const boot = async () => {
      try {
        if (invId) {
          const { data } = await api.get(`/payments/intents/${invId}`);
          setIntent(data);
          return;
        }
        const kind = KIND_FROM_QUERY[params.get('type') || params.get('kind') || ''];
        if (!kind) {
          setError('Нет данных для оплаты. Вернись в корзину или к биту.');
          return;
        }
        const payload = { kind };
        if (params.get('item_id')) payload.item_id = Number(params.get('item_id'));
        if (params.get('purchase_type')) payload.purchase_type = params.get('purchase_type');
        if (params.get('order_id')) payload.order_id = Number(params.get('order_id'));
        const formats = params.get('beats_formats');
        if (formats) {
          try {
            payload.beats_formats = JSON.parse(formats);
          } catch {
            /* ignore */
          }
        }
        await startCheckout(payload);
      } catch (err) {
        setError(checkoutErrorMessage(err));
      }
    };
    boot();
  }, [invId]);

  const simulate = async (success) => {
    if (!intent?.inv_id) return;
    setBusy(true);
    try {
      const { data } = await api.post('/payments/simulate', { inv_id: intent.inv_id, success });
      navigate(success ? `/payment/success?InvId=${data.inv_id}` : `/payment/failure?InvId=${data.inv_id}`);
    } catch (err) {
      setError(checkoutErrorMessage(err));
      setBusy(false);
    }
  };

  if (error && !intent) {
    return (
      <div className="v2-pay-screen">
        <PaymentTicket eyebrow="XWINNER · PAY" title="Не удалось начать оплату" tone="bad">
          <p>{error}</p>
          <PayActions
            primary={
              <button type="button" className="v2-pay-btn-accent" onClick={() => navigate(-1)}>
                Назад
              </button>
            }
          />
        </PaymentTicket>
      </div>
    );
  }

  if (!intent) {
    return (
      <div className="v2-pay-screen">
        <div className="flex flex-col items-center gap-3 text-white/60">
          <Loader className="h-8 w-8 animate-spin text-[#22c55e]" />
          <p>Готовим оплату…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="v2-pay-screen">
      <PaymentTicket eyebrow="ROBOKASSA · TEST TERMINAL" title="Оплата" amount={formatRub(intent.amount)}>
        <TestBadge on={intent.test !== false} />
        {intent.description && <p className="text-white/80">{intent.description}</p>}
        {error && <p className="text-red-300">{error}</p>}
        <p className="text-xs text-white/45">
          Запасной симулятор. Кнопка «Оплатить» на сайте открывает Robokassa, не эту страницу.
        </p>
        <PayActions
          primary={
            <button type="button" className="v2-pay-btn-accent" disabled={busy} onClick={() => simulate(true)}>
              {busy ? 'Проводим…' : 'Оплатить успешно'}
            </button>
          }
          secondary={
            <button type="button" className="v2-pay-btn-ghost" disabled={busy} onClick={() => simulate(false)}>
              Сорвать оплату
            </button>
          }
        />
      </PaymentTicket>
    </div>
  );
};

export default PaymentPayPage;
