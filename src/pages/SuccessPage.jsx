import React from 'react';
import { PayActions, PayLink, PaymentTicket } from '../v2/PaymentChrome';

/** Free / local success — same chrome as payment receipt. */
const SuccessPage = () => {
  return (
    <div className="v2-pay-screen">
      <PaymentTicket eyebrow="XWINNER · DONE" title="Готово" tone="ok">
        <p>Файлы уже в покупках — скачай в любой момент.</p>
        <PayActions
          primary={<PayLink to="/purchases" accent>Мои покупки</PayLink>}
          secondary={<PayLink to="/">На главную</PayLink>}
        />
      </PaymentTicket>
    </div>
  );
};

export default SuccessPage;
