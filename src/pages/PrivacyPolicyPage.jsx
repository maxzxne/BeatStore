import React from 'react';

const DocLink = ({ href, children, className = '' }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={`text-[#22c55e] hover:underline cursor-pointer ${className}`}>
    {children}
  </a>
);

/** Legacy fallback if CMS body empty. Canonical text: backend/footer_templates/privacy.html */
const PrivacyPolicyPage = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e] mb-3">Legal</p>
      <h1 className="font-[Syne] text-3xl font-extrabold text-white mb-6">
        Политика конфиденциальности и обработки персональных данных
      </h1>

      <p className="text-sm text-white/50 mb-6">
        Редакция от 21.09.2026. Оператор: ИП Власов Игорь Сергеевич. Заполните поля в квадратных скобках.
        Актуальная CMS‑версия: <DocLink href="/privacy">/privacy</DocLink>.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-white/70">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Оператор</h2>
          <p>
            ИП Власов Игорь Сергеевич, ИНН <span className="font-semibold">[ИНН]</span>, ОГРНИП{' '}
            <span className="font-semibold">[ОГРНИП]</span>, адрес:{' '}
            <span className="font-semibold">[адрес регистрации]</span>. Сайт: XWinner.beats.please —
            официальная витрина XWinner (не маркетплейс). Обработка по 152‑ФЗ и иным актам РФ.
          </p>
          <p>
            Email субъектов ПДн: <span className="font-semibold">[email для обращений субъектов ПДн]</span>.
            Уведомление РКН: <span className="font-semibold">[номер / статус уведомления]</span>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. Данные и цели</h2>
          <p>
            Обрабатываются только данные, фактически полученные при использовании доступных функций
            (разделы курсов, рекламы, OAuth, капча, поддержка, contributors могут быть выключены). Состав:
            email, username, контакты, заказы/лицензии, заявки, переписка поддержки, технические данные
            (IP, cookie, сессия), данные OAuth/капчи — при включённых интеграциях.
          </p>
          <p>
            Цели: аккаунт, исполнение договоров на цифровой контент и услуги, оплата (Robokassa и др.),
            доступ к покупкам, поддержка, безопасность, законные обязанности. Маркетинг — только при
            отдельном согласии.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. Основания и сроки</h2>
          <p>
            Согласие; исполнение/заключение договора; обязанности по закону; законные интересы Оператора
            (безопасность) — в пределах ст. 6 152‑ФЗ. Сроки: пока нужны цели; учётные документы по заказам —
            как правило не менее 5 лет; подробности в полной Политике.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. Передача и локализация</h2>
          <p>
            Платёжные провайдеры, хостинг <span className="font-semibold">[хостинг‑провайдер]</span> (
            <span className="font-semibold">[страна серверов]</span>), OAuth/капча/уведомления — при
            фактическом использовании. Локализация БД граждан РФ:{' '}
            <span className="font-semibold">[указать размещение БД в РФ]</span>. Трансграничка — по ст. 12
            152‑ФЗ при использовании зарубежных сервисов.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">5. Права</h2>
          <p>
            Сведения об обработке, уточнение, блокирование, уничтожение, отзыв согласия, жалоба в РКН/суд.
            Запрос на <span className="font-semibold">[email для обращений субъектов ПДн]</span>. Cookie —{' '}
            <DocLink href="/cookies">Политика cookie</DocLink>. Согласие —{' '}
            <DocLink href="/consent-personal-data">форма согласия</DocLink>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
