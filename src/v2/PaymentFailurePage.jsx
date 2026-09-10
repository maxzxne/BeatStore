import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { checkoutErrorMessage, formatRub, retryCheckout } from '../utils/checkout';
import { PayActions, PayLink, PaymentTicket, TestBadge } from './PaymentChrome';

const PaymentFailurePage = () => {
  const [params] = useSearchParams();
  const invId = params.get('InvId') || params.get('inv_id');
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!invId) return;
    api
      .get(`/payments/intents/${invId}`)
      .then(({ data }) => setIntent(data))
      .catch((err) => setError(checkoutErrorMessage(err)));
  }, [invId]);

  const retry = async () => {
    if (!invId) return;
    setBusy(true);
    try {
      await retryCheckout(invId);
    } catch (err) {
      setError(checkoutErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="v2-pay-screen">
      <PaymentTicket eyebrow="XWINNER · DECLINED" title="Оплата не прошла" amount={intent ? formatRub(intent.amount) : null} tone="bad">
        <TestBadge on={intent?.test} />
        <p>{intent?.error || error || 'Банк или шлюз отклонил платёж. Деньги не должны были списаться.'}</p>
        <ul className="list-disc space-y-1 pl-4 text-white/55">
          <li>Не хватило денег или лимит банка</li>
          <li>3-D Secure не подтвердили</li>
          <li>Закрыли окно оплаты</li>
        </ul>
        <PayActions
          primary={
            invId ? (
              <button type="button" className="v2-pay-btn-accent" disabled={busy} onClick={retry}>
                {busy ? 'Открываем шлюз…' : 'Попробовать снова'}
              </button>
            ) : (
              <PayLink to="/cart" accent>
                Вернуться в корзину
              </PayLink>
            )
          }
          secondary={<PayLink to="/">На главную</PayLink>}
        />
      </PaymentTicket>
    </div>
  );
};

export default PaymentFailurePage;
