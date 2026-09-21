import React from 'react';

const DocLink = ({ href, children, className = '' }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={`text-[#22c55e] hover:underline cursor-pointer ${className}`}>
    {children}
  </a>
);

/** Legacy fallback. Canonical: backend/footer_templates/terms.html */
const TermsOfUsePage = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e] mb-3">Legal</p>
      <h1 className="font-[Syne] text-3xl font-extrabold text-white mb-6">
        Пользовательское соглашение (публичная оферта)
      </h1>

      <p className="text-sm text-white/50 mb-6">
        Редакция от 21.09.2026. ИП Власов Игорь Сергеевич. Ассортимент и разделы Сайта могут включаться и
        отключаться — действует то, что доступно в интерфейсе на момент заказа. Полный текст:{' '}
        <DocLink href="/terms">/terms</DocLink>.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-white/70">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Стороны и акцепт</h2>
          <p>
            Оператор: ИП Власов Игорь Сергеевич, ИНН <span className="font-semibold">[ИНН]</span>, ОГРНИП{' '}
            <span className="font-semibold">[ОГРНИП]</span>, адрес:{' '}
            <span className="font-semibold">[адрес регистрации]</span>, email:{' '}
            <span className="font-semibold">[email для обращений]</span>. Сайт XWinner.beats.please —
            официальная витрина XWinner. Акцепт: регистрация, заказ, оплата, согласие в интерфейсе.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. Предмет (если доступно на Сайте)</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>демо и покупка лицензий на биты (MP3 / WAV / Exclusive — по карточке);</li>
            <li>курсы — если раздел доступен пользователю;</li>
            <li>индивидуальные услуги и реклама на витрине — если формы включены;</li>
            <li>иной цифровой контент/услуги из интерфейса.</li>
          </ul>
          <p className="mt-2">
            Конкретные условия — в карточке/корзине/заявке. Цифровая передача без физдоставки, если не
            согласовано иное.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. Лицензии, оплата, возвраты</h2>
          <p>
            Объём прав — по типу покупки. Exclusive может снимать бит с продажи. Оплата через платёжных
            провайдеров (в т.ч. Robokassa). После предоставления доступа к цифровому контенту возврат, как
            правило, не производится (ст. 26.1 ЗоЗПП), кроме случаев непредоставления доступа по вине
            Оператора или иного требования закона. Чек:{' '}
            <span className="font-semibold">[способ выдачи чека]</span>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. ПДн и право</h2>
          <p>
            ПДн — <DocLink href="/privacy">Политика</DocLink> и{' '}
            <DocLink href="/consent-personal-data">Согласие</DocLink>. Право РФ. Претензии:{' '}
            <span className="font-semibold">[email для обращений]</span>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfUsePage;
