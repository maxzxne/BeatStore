import React from 'react';

const DocLink = ({ href, children, className = '' }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={`text-[#22c55e] hover:underline cursor-pointer ${className}`}>
    {children}
  </a>
);

/** Legacy fallback. Canonical: backend/footer_templates/cookies.html */
const CookiesPolicyPage = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e] mb-3">Legal</p>
      <h1 className="font-[Syne] text-3xl font-extrabold text-white mb-6">
        Политика использования файлов cookie
      </h1>

      <p className="text-sm text-white/50 mb-6">
        Редакция от 21.09.2026. ИП Власов Игорь Сергеевич. Набор cookie зависит от включённых функций.
        Полный текст: <DocLink href="/cookies">/cookies</DocLink>.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-white/70">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Какие cookie используются</h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Строго необходимые — сессия, корзина, безопасность, оформление заказа.</li>
            <li>Функциональные — предпочтения интерфейса (если есть).</li>
            <li>
              Аналитические — если подключены:{' '}
              <span className="font-semibold">[провайдеры аналитики или «не используется»]</span>.
            </li>
            <li>
              Маркетинговые — если подключены:{' '}
              <span className="font-semibold">[или «не используется»]</span>.
            </li>
            <li>Капча / OAuth — только при включённых соответствующих интеграциях.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. Управление</h2>
          <p>
            Настройки браузера позволяют удалять и блокировать cookie; блокировка необходимых может сломать
            вход и оплату. ПДн: <DocLink href="/privacy">Политика конфиденциальности</DocLink>. Контакт:{' '}
            <span className="font-semibold">[email для обращений субъектов ПДн]</span>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default CookiesPolicyPage;
