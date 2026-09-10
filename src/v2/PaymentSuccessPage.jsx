import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { api } from '../utils/api';
import { checkoutErrorMessage, formatRub } from '../utils/checkout';
import { PayActions, PayLink, PaymentTicket, TestBadge } from './PaymentChrome';

const KIND_CTA = {
  course: { to: '/courses', label: 'К курсам' },
  order: { to: '/purchases', label: 'Мои заказы' },
  cart: { to: '/purchases', label: 'Мои покупки' },
  beat: { to: '/purchases', label: 'Скачать в покупках' },
};

const PaymentSuccessPage = () => {
  const [params] = useSearchParams();
  const invId = params.get('InvId') || params.get('inv_id');
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!invId) {
      setError('Нет номера платежа. Если деньги списались — не плати повторно, напиши в поддержку.');
      return undefined;
    }
    let attempts = 0;
    let timer;
    let cancelled = false;

    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/intents/${invId}`);
        if (cancelled) return;
        setIntent(data);
        if (data.status === 'pending' && attempts < 24) {
          attempts += 1;
          timer = setTimeout(poll, 1500);
        } else if (data.status === 'pending') {
          setStale(true);
        }
      } catch (err) {
        if (!cancelled) setError(checkoutErrorMessage(err));
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [invId]);

  if (error && !intent) {
    return (
      <div className="v2-pay-screen">
        <PaymentTicket eyebrow="XWINNER · RECEIPT" title="Оплата не подтверждена" tone="bad">
          <p>{error}</p>
          <PayActions primary={<PayLink to="/purchases">Проверить покупки</PayLink>} secondary={<PayLink to="/">На главную</PayLink>} />
        </PaymentTicket>
      </div>
    );
  }

  if (!intent || intent.status === 'pending') {
    return (
      <div className="v2-pay-screen">
        <PaymentTicket eyebrow="XWINNER · RECEIPT" title="Проверяем платёж">
          <div className="flex items-center gap-3 text-white/60">
            <Loader className="h-5 w-5 animate-spin text-[#22c55e]" />
            Ждём подтверждение от Robokassa…
          </div>
          <TestBadge on={intent?.test} />
          {stale && (
            <p>
              Подтверждение задерживается. Не оплачивай ещё раз. Файл появится в покупках, как только придёт ResultURL.
            </p>
          )}
        </PaymentTicket>
      </div>
    );
  }

  if (intent.status !== 'paid') {
    return (
      <div className="v2-pay-screen">
        <PaymentTicket eyebrow="XWINNER · RECEIPT" title="Платёж не засчитан" tone="bad">
          <p>{intent.error || 'Шлюз не подтвердил оплату.'}</p>
          <PayActions
            primary={<PayLink to={`/payment/failure?InvId=${intent.inv_id}`} accent>Что делать</PayLink>}
          />
        </PaymentTicket>
      </div>
    );
  }

  const cta = KIND_CTA[intent.kind] || KIND_CTA.beat;

  return (
    <div className="v2-pay-screen">
      <PaymentTicket eyebrow="XWINNER · RECEIPT" title="Оплачено" amount={formatRub(intent.amount)} tone="ok">
        <TestBadge on={intent.test} />
        {intent.description && <p className="text-white">{intent.description}</p>}
        <p className="text-xs uppercase tracking-[0.18em] text-white/40">Inv {String(intent.inv_id).padStart(4, '0')}</p>
        <p>Доступ уже в кабинете. Если файла нет — обнови покупки через минуту, webhook мог задержаться.</p>
        <PayActions
          primary={<PayLink to={cta.to} accent>{cta.label}</PayLink>}
          secondary={<PayLink to="/">Слушать каталог</PayLink>}
        />
      </PaymentTicket>
    </div>
  );
};

export default PaymentSuccessPage;
