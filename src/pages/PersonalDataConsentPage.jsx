import React from 'react';

const DocLink = ({ href, children, className = '' }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={`text-[#22c55e] hover:underline cursor-pointer ${className}`}>
    {children}
  </a>
);

/** Legacy fallback. Canonical: backend/footer_templates/consent-personal-data.html */
const PersonalDataConsentPage = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e] mb-3">Legal</p>
      <h1 className="font-[Syne] text-3xl font-extrabold text-white mb-6">
        Согласие на обработку персональных данных
      </h1>

      <p className="text-sm text-white/50 mb-6">
        Редакция от 21.09.2026. Полная форма: <DocLink href="/consent-personal-data">/consent-personal-data</DocLink>.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-white/70">
        <p>
          Я, пользователь XWinner.beats.please, даю согласие ИП Власову Игорю Сергеевичу (ИНН{' '}
          <span className="font-semibold">[ИНН]</span>, ОГРНИП <span className="font-semibold">[ОГРНИП]</span>,
          адрес <span className="font-semibold">[адрес регистрации]</span>) на обработку моих персональных
          данных в объёме, который я фактически передаю и/или который образуется при использовании доступных
          мне функций Сайта (учётная запись, заказы, услуги/реклама при их доступности, поддержка, OAuth/капча
          при включении, технические данные).
        </p>
        <p>
          Цели: регистрация, исполнение договоров, оплата, доступ к покупкам, поддержка, безопасность,
          требования закона. Действия: сбор, хранение, использование, передача провайдерам (платежи, хостинг{' '}
          <span className="font-semibold">[хостинг‑провайдер]</span>, OAuth/капча — если используются) и др. по{' '}
          <DocLink href="/privacy">Политике</DocLink>.
        </p>
        <p>
          Срок — до отзыва или достижения целей, с учётом закона. Отзыв:{' '}
          <span className="font-semibold">[email для обращений субъектов ПДн]</span>. Согласие — чекбоксом в
          формах Сайта. Также принимаю <DocLink href="/terms">Оферту</DocLink>.
        </p>
      </div>
    </div>
  );
};

export default PersonalDataConsentPage;
