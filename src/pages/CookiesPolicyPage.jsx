import React from 'react';

const CookiesPolicyPage = () => {
  return (
    <div className="container mx-auto px-6 py-10 max-w-4xl">
      <h1 className="text-3xl font-bold text-black dark:text-white mb-6">
        Политика использования файлов cookie
      </h1>

      <p className="text-sm text-gray-600 dark:text-neutral-400 mb-6">
        Этот документ является примерочной (обезличенной) политикой использования файлов cookie. Перед
        применением в реальном проекте его следует адаптировать под ваши технические настройки и согласовать
        с юристом.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-700 dark:text-neutral-300">
        <section>
          <h2 className="text-lg font-semibold text-black dark:text-white mb-2">
            1. Что такое файлы cookie
          </h2>
          <p>
            Cookie — это небольшие текстовые файлы, которые сохраняются на вашем устройстве (компьютер,
            смартфон и т.п.) при посещении сайта. Они позволяют распознавать ваш браузер, запоминать
            настройки и улучшать работу сервиса.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black dark:text-white mb-2">
            2. Какие cookie используются на XWinner.beats.please
          </h2>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <span className="font-semibold">Технические (обязательные) cookie</span> — необходимы для
              корректной работы сайта, авторизации, сохранения сессии и настроек интерфейса.
            </li>
            <li>
              <span className="font-semibold">Функциональные cookie</span> — помогают запоминать ваши
              предпочтения (например, выбранную тему оформления).
            </li>
            <li>
              <span className="font-semibold">Аналитические cookie</span> — используются для сбора
              обезличенной статистики о том, как пользователи используют сайт (посещаемые страницы, время
              на сайте и т.п.), чтобы улучшать сервис.
            </li>
          </ul>
          <p className="mt-2">
            Конкретный список и провайдеры (например, Яндекс.Метрика, Google Analytics и др.) следует
            указать здесь, если вы их используете.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black dark:text-white mb-2">
            3. Как управлять cookie
          </h2>
          <p>
            Большинство браузеров позволяют просматривать, удалять и блокировать файлы cookie. Вы можете
            изменить настройки браузера так, чтобы он блокировал все cookie или уведомлял вас об их
            отправке. Однако в этом случае некоторые функции сайта XWinner.beats.please могут работать некорректно.
          </p>
          <p className="mt-2">
            Инструкции по управлению cookie обычно доступны в разделе «Помощь» вашего браузера.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black dark:text-white mb-2">
            4. Согласие на использование cookie
          </h2>
          <p>
            Продолжая использовать сайт XWinner.beats.please, вы соглашаетесь с использованием файлов cookie в
            соответствии с настоящей Политикой. Если вы не согласны с использованием cookie, пожалуйста,
            измените настройки браузера или прекратите использование сайта.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-black dark:text-white mb-2">
            5. Изменения в Политике cookie
          </h2>
          <p>
            Оператор оставляет за собой право вносить изменения в настоящую Политику cookie. Актуальная
            версия Политики всегда доступна на сайте по адресу «/cookies».
          </p>
        </section>
      </div>
    </div>
  );
};

export default CookiesPolicyPage;


