/**
 * Official BeatStore admin operator guide.
 * Source of truth for /admin/guide — keep in sync with admin + public product changes.
 * Personal notes live in SQLite (API), not here.
 */

export const ADMIN_GUIDE_VERSION = '2026-09-22e';

/** @typedef {{ type: 'p'|'h3'|'ul'|'ol'|'steps'|'tip'|'warn'|'link', text?: string, items?: string[], href?: string, label?: string }} GuideBlock */
/** @typedef {{ id: string, title: string, group: string, adminPath?: string|null, publicPaths?: string[], keywords?: string[], blocks: GuideBlock[] }} GuideSection */

/** @type {GuideSection[]} */
export const guideSections = [
  {
    id: 'overview',
    title: 'Что это за админка',
    group: 'Введение',
    adminPath: '/admin/dashboard',
    keywords: ['обзор', 'xwinner', 'витрина', 'не маркетплейс'],
    blocks: [
      {
        type: 'p',
        text: 'BeatStore — официальная витрина битов бренда XWinner (XWinner.beats.please). Это не маркетплейс и не BeatStars: на витрине продаётся ваш каталог, а не чужие продюсеры с royalty-разделами.',
      },
      {
        type: 'p',
        text: 'Админка управляет каталогом, продажами, заявками на услуги, маркетингом главной, юридическими страницами, доступом к курсам/рекламе и модерацией загрузок от приглашённых людей (contributors).',
      },
      {
        type: 'h3',
        text: 'Как устроено меню',
      },
      {
        type: 'ul',
        items: [
          'Обзор — панель (KPI + очередь действий) и доходы',
          'Каталог — биты, курсы, загрузка, люди, модерация сабмитов',
          'Продажи — покупки, пользователи, заявки на услуги, поддержка',
          'Сайт — hero, баннеры, скидки, промокоды, футер, настройки',
          'Система — журнал ошибок и эта инструкция',
          'Telegram-бот — пуши заявок/поддержки и быстрые действия (см. раздел «Telegram-бот»)',
        ],
      },
      {
        type: 'tip',
        text: 'Внизу сайдбара: «Сайт» открывает публичную витрину в новой вкладке, «Выйти» сбрасывает admin-сессию.',
      },
    ],
  },
  {
    id: 'login',
    title: 'Вход в админку',
    group: 'Введение',
    adminPath: '/admin/login',
    keywords: ['логин', '2fa', 'captcha', 'пароль'],
    blocks: [
      {
        type: 'steps',
        items: [
          'Откройте /admin/login (или иконку «Админка» в шапке, если вы уже админ на витрине).',
          'Введите логин и пароль админа.',
          'Если включены SmartCaptcha и/или 2FA (TOTP) — пройдите их.',
          'После успеха попадёте на /admin/dashboard.',
        ],
      },
      {
        type: 'warn',
        text: 'Captcha и 2FA включаются в «Настройки сайта». Если сами себя заблокировали 2FA — нужна правка на сервере/БД; не выключайте 2FA вслепую на проде без запасного доступа.',
      },
      {
        type: 'p',
        text: 'Токен админа хранится отдельно от токена покупателя. API предпочитает adminToken, поэтому в одной вкладке удобнее не смешивать «покупку как юзер» и «правки как админ».',
      },
    ],
  },
  {
    id: 'quickstart',
    title: 'Быстрый старт: типичный день',
    group: 'Введение',
    keywords: ['чеклист', 'день', 'ритуал', 'порядок'],
    blocks: [
      {
        type: 'ol',
        items: [
          'Панель — есть ли продажи / регистрации за сутки.',
          'На проверке — одобрить или отклонить сабмиты.',
          'Заявки — взять новые, выставить цену/предоплату, сдвинуть статус.',
          'Поддержка — ответить на непрочитанные треды.',
          'Баннеры / Скидки / Промокоды — проверить даты и статусы активных акций.',
          'Ошибки — глянуть свежие auth/payment сбои.',
        ],
      },
      {
        type: 'tip',
        text: 'Новый бит: Загрузка → проверить карточку на витрине → при акции добавить скидку или баннер. Не публикуйте exclusive без ZIP и цены exclusive.',
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Панель',
    group: 'Обзор',
    adminPath: '/admin/dashboard',
    keywords: ['kpi', 'аналитика', 'dashboard', 'очередь', 'inbox', 'sparkline'],
    blocks: [
      {
        type: 'p',
        text: 'Сводка за 30 дней: пользователи, биты, покупки и доход по битам. Сверху — очередь действий (сабмиты на проверке, новые заявки, непрочитанная поддержка). Карточки кликабельны; у покупок/дохода — sparkline и Δ за 7 дней vs предыдущие 7.',
      },
      {
        type: 'ul',
        items: [
          'Inbox-полоска ведёт в «На проверке», «Заявки» и «Поддержка».',
          'KPI «Доход битов» — только покупки битов за 30 дней; полная выручка с курсами/услугами — в «Доходы».',
          'Δ считается по дневным рядам за окно 30 дней (не отдельный API).',
          'Раздел только для чтения — здесь ничего не редактируется.',
        ],
      },
    ],
  },
  {
    id: 'revenue',
    title: 'Доходы',
    group: 'Обзор',
    adminPath: '/admin/revenue',
    keywords: ['выручка', 'contributor', 'период', 'отчёт', 'пресет'],
    blocks: [
      {
        type: 'p',
        text: 'Аналитика выручки за период. Пресеты 7 / 30 / 90 дней и «этот месяц», area-график + таблица по дням, полоса состава (биты / курсы / услуги). Можно отфильтровать по бенефициару (contributor).',
      },
      {
        type: 'steps',
        items: [
          'Выберите пресет периода или задайте start/end вручную.',
          'При необходимости выберите человека из списка contributors (или кликните строку в таблице).',
          'Смотрите KPI, состав дохода и график; под графиком — таблица дней для точных сумм.',
        ],
      },
      {
        type: 'tip',
        text: 'Активный фильтр по человеку показывается чипом «Фильтр: …» — клик снимает его. «Люди» (contributors) — справочник бенефициаров, не роли админов.',
      },
    ],
  },
  {
    id: 'beats',
    title: 'Биты',
    group: 'Каталог',
    adminPath: '/admin/beats',
    publicPaths: ['/', '/beat/:id'],
    keywords: ['каталог', 'цена', 'mp3', 'wav', 'exclusive', 'bpm', 'множественные покупки'],
    blocks: [
      {
        type: 'p',
        text: 'Список битов каталога. Создание нового бита — через «Загрузка» или одобрение сабмита. Здесь — редактирование и удаление.',
      },
      {
        type: 'h3',
        text: 'Что можно менять',
      },
      {
        type: 'ul',
        items: [
          'Мета: название, артист, жанр, BPM, тональность, описание',
          'Цены лицензий: базовая + MP3 / WAV / Exclusive (как при загрузке); в таблице — primary price',
          'Множественные покупки (allow_multiple_purchases) — иначе бит «одноразовый» exclusive',
          'Доступность и бенефициар (contributor)',
          'Файлы: обложка, демо, mp3, wav, exclusive ZIP — по отдельности',
        ],
      },
      {
        type: 'tip',
        text: 'Цены после создания правятся здесь же: откройте бит → укажите Цена MP3 / WAV / Exclusive и при необходимости базовую цену. Не нужно перезаливать бит только ради смены цен.',
      },
      {
        type: 'h3',
        text: 'Как это видит покупатель',
      },
      {
        type: 'ul',
        items: [
          'Главная /: карточки с play, избранным, корзиной, ценой (со strikethrough при скидке)',
          '/beat/:id — лицензии MP3/WAV/Exclusive, промокод, купить сейчас / в корзину',
          'Демо играет в sticky mini-player, не в нативных controls браузера',
        ],
      },
      {
        type: 'warn',
        text: 'Удаление бита необратимо для карточки. Покупки и скачивания уже купивших завязаны на историю покупок — не чистите файлы «ради красоты», если лицензия ещё продаётся.',
      },
    ],
  },
  {
    id: 'courses',
    title: 'Курсы',
    group: 'Каталог',
    adminPath: '/admin/courses',
    publicPaths: ['/courses', '/course/:id'],
    keywords: ['обучение', 'видео', 'preview'],
    blocks: [
      {
        type: 'p',
        text: 'Редактирование курсов: название, purpose, описание, цена, теги; замена preview/full video и обложки. Создание — вкладка Course в «Загрузка».',
      },
      {
        type: 'h3',
        text: 'Видимость раздела на витрине',
      },
      {
        type: 'p',
        text: 'Управляется в «Настройки сайта» → courses_visibility:',
      },
      {
        type: 'ul',
        items: [
          'all — раздел виден всем',
          'admins_only — только админам (для превью перед запуском)',
          'hidden — раздел закрыт',
        ],
      },
      {
        type: 'tip',
        text: 'Перед запуском курса: загрузите → поставьте admins_only → проверьте /courses под админом → переключите на all.',
      },
    ],
  },
  {
    id: 'upload',
    title: 'Загрузка',
    group: 'Каталог',
    adminPath: '/admin/upload',
    keywords: ['upload', 'создать', 'файл', 'multipart'],
    blocks: [
      {
        type: 'p',
        text: 'Создание бита или курса с нуля (multipart upload).',
      },
      {
        type: 'h3',
        text: 'Бит — файлы',
      },
      {
        type: 'ul',
        items: [
          'Обложка (обязательна для нормальной карточки)',
          'Demo — то, что слышит гость на витрине',
          'MP3 / WAV — выдаются после покупки соответствующей лицензии',
          'Exclusive — обычно ZIP со стемами/полным пакетом',
          'Цены по типам лицензий + бенефициар',
          'Платные файлы (/static/audio, /static/course_videos) не публичны: стрим только у покупателя/админа через ?access= (~1ч) или Bearer',
        ],
      },
      {
        type: 'h3',
        text: 'Курс — файлы',
      },
      {
        type: 'ul',
        items: [
          'Обложка',
          'Preview video — доступно до покупки',
          'Full video — после покупки / скачивания',
          'Цена (0 = бесплатный курс с мгновенной выдачей)',
        ],
      },
      {
        type: 'warn',
        text: 'Большие файлы: дождитесь окончания загрузки. Обрыв сети = битый сабмит; перепроверьте карточку на витрине сразу после успеха.',
      },
    ],
  },
  {
    id: 'contributors',
    title: 'Люди (contributors)',
    group: 'Каталог',
    adminPath: '/admin/contributors',
    publicPaths: ['/submit', '/submit/join'],
    keywords: ['invite', 'квота', 'бенефициар', 'приглашение'],
    blocks: [
      {
        type: 'p',
        text: 'Справочник бенефициаров и приглашённых, кто может слать биты на модерацию через /submit.',
      },
      {
        type: 'steps',
        items: [
          'Создайте человека.',
          'Сгенерируйте invite-ссылку и отправьте ему.',
          'Он проходит /submit/join?token=…, задаёт логин/пароль.',
          'В шапке витрины у contributor появляется Upload → /submit.',
          'Сабмиты появляются в «На проверке».',
        ],
      },
      {
        type: 'ul',
        items: [
          'Toggle active — отключить доступ без удаления истории',
          'Reset quota — сбросить лимит загрузок (если квота включена в логике)',
        ],
      },
    ],
  },
  {
    id: 'submissions',
    title: 'На проверке',
    group: 'Каталог',
    adminPath: '/admin/submissions',
    keywords: ['модерация', 'approve', 'reject', 'сабмит'],
    blocks: [
      {
        type: 'p',
        text: 'Очередь сабмитов от contributors. Фильтр по статусу.',
      },
      {
        type: 'ul',
        items: [
          'Approve — бит попадает в каталог (часто скрытым/как настроено пайплайном; проверьте карточку в «Биты» и на витрине).',
          'Reject — отклонение с причиной; автор видит отказ в кабинете сабмита.',
        ],
      },
      {
        type: 'tip',
        text: 'Перед approve прослушайте demo, проверьте BPM/key/жанр и что exclusive не пустой, если заявлен.',
      },
    ],
  },
  {
    id: 'purchases',
    title: 'Покупки',
    group: 'Продажи',
    adminPath: '/admin/purchases',
    publicPaths: ['/purchases', '/cart'],
    keywords: ['история', 'buyer', 'лицензия'],
    blocks: [
      {
        type: 'p',
        text: 'Read-only журнал покупок: бит/товар, покупатель, сумма, дата.',
      },
      {
        type: 'p',
        text: 'Покупатель видит то же в /purchases (вкладки beats / courses / orders) и скачивает файлы оттуда. Оплата идёт через Robokassa; выдача по webhook, не по SuccessURL.',
      },
      {
        type: 'warn',
        text: 'Не «чините» покупку вручную правкой фронта. Если оплата прошла, а файл не выдался — смотрите «Ошибки», PaymentIntent и webhook. Тест-оплата только в test-режиме.',
      },
    ],
  },
  {
    id: 'users',
    title: 'Пользователи',
    group: 'Продажи',
    adminPath: '/admin/users',
    publicPaths: ['/profile', '/favorites'],
    keywords: ['crm', 'ltv', 'покупатель', 'карточка'],
    blocks: [
      {
        type: 'p',
        text: 'CRM покупателей: поиск, сортировка (в т.ч. по LTV), карточка /admin/users/:id.',
      },
      {
        type: 'h3',
        text: 'В карточке',
      },
      {
        type: 'ul',
        items: [
          'Контакты и профиль',
          'История покупок и заказов услуг',
          'Открыть / создать тред поддержки с этим аккаунтом',
        ],
      },
      {
        type: 'tip',
        text: 'Промокоды привязаны к username — сначала найдите пользователя здесь, потом создайте код в «Промокоды».',
      },
    ],
  },
  {
    id: 'orders',
    title: 'Заявки на услуги',
    group: 'Продажи',
    adminPath: '/admin/orders',
    publicPaths: ['/order', '/order/ads'],
    keywords: ['услуга', 'препрода', 'статус', 'wav', 'результат'],
    blocks: [
      {
        type: 'p',
        text: 'Операционка service-заказов с витрины /order (и /order/ads, если реклама включена). Сроки и цены для расчёта в форме редактируются в «Настройки сайта» → «Прайс услуг» (таблица + тексты). Плашка-аккордеон «Прайс услуг» на /order больше не показывается — клиент видит суммы в шагах формы. ТЗ в подробной форме обязательно; срок по умолчанию — 2–3 недели (21 день), если такой слот есть в прайсе.',
      },
      {
        type: 'h3',
        text: 'Очереди статусов',
      },
      {
        type: 'ul',
        items: [
          'action — нужно ваше действие',
          'payment — ждём оплату / предоплату',
          'work — в работе',
          'done — готово',
          'cancelled — отменено',
        ],
      },
      {
        type: 'h3',
        text: 'Типовой цикл',
      },
      {
        type: 'steps',
        items: [
          'Клиент оставил заявку на /order (wizard или короткая форма).',
          'Вы открываете заявку (?id= для deep-link), ставите цену и предоплату.',
          'Переводите в confirmed / нужный статус — клиент видит оплату в /purchases → orders.',
          'После работы загружаете результат (wav/mp3/zip) через upload-result.',
          'Закрываете в done.',
        ],
      },
      {
        type: 'tip',
        text: 'Новая заявка также приходит в Telegram (ADMIN_TELEGRAM_CHAT_ID): кнопка «Открыть», «В работу», «Готово». Confirmed с ценой — только в админке.',
      },
      {
        type: 'p',
        text: 'Реклама: отдельная сущность AdOrder. Ставка ads_price_per_day в настройках/Баннеры→Заявки. Форма /order/ads (только логин) считает дни×ставка (− скидка scope ads). Статусы: новая → одобрена → опубликована (или отклонена/отменена). После одобрения поля заморожены, клиент оплачивает (kind=ads + промокод), webhook публикует PromoBanner на N дней с момента оплаты.',
      },
    ],
  },
  {
    id: 'support',
    title: 'Поддержка',
    group: 'Продажи',
    adminPath: '/admin/support',
    publicPaths: ['/support'],
    keywords: ['чат', 'тред', 'сообщения', 'telegram'],
    blocks: [
      {
        type: 'p',
        text: 'Один тред поддержки на аккаунт. Список с непрочитанными, ответ из админки, deep-link ?threadId=.',
      },
      {
        type: 'steps',
        items: [
          'Клиент пишет в /support (нужен логин).',
          'В Telegram приходит пуш с маркером «тред #N» и кнопкой «Открыть тред».',
          'Можно ответить reply прямо в Telegram — сообщение попадёт в тред.',
          'Или ответить в админке; клиенту с Telegram OAuth уйдёт пуш.',
        ],
      },
      {
        type: 'tip',
        text: 'Пункт «Поддержка» в футере витрины — особый kind в CMS футера (чат), не обычная HTML-страница.',
      },
    ],
  },
  {
    id: 'telegram-bot',
    title: 'Telegram-бот',
    group: 'Система',
    adminPath: null,
    publicPaths: [],
    keywords: ['telegram', 'бот', 'mini app', 'admin', 'пуш'],
    blocks: [
      {
        type: 'p',
        text: 'Один бот на витрину и оператора. Токен: TELEGRAM_BOT_TOKEN. Операторам шлётся в ADMIN_TELEGRAM_CHAT_ID. Mini App / сайт: MINI_APP_URL и FRONTEND_URL.',
      },
      {
        type: 'h3',
        text: 'Пользователь',
      },
      {
        type: 'ul',
        items: [
          '/start и /help — меню: Магазин, Заказать услугу, Поддержка, Мои покупки',
          'Вход только через Mini App initData / Login Widget (HMAC). Spoofable chat_id auth выключен.',
          'Пуши: ответ поддержки, смена статуса заявки, успешная покупка (если oauth_provider=telegram)',
        ],
      },
      {
        type: 'h3',
        text: 'Оператор',
      },
      {
        type: 'ul',
        items: [
          '/admin — сводка: pending-заявки и непрочитанная поддержка + ссылки',
          'Пуш заявки: Открыть / В работу / Готово',
          'Пуш поддержки: Открыть тред; reply на сообщение = ответ клиенту',
        ],
      },
      {
        type: 'warn',
        text: 'Кнопки статуса из бота не ставят confirmed и не выставляют цену — для этого админка. Не держите второй polling-инстанс бота локально на том же токене (409 Conflict). Каталог битов отдаёт is_favorite/is_in_cart в GET /beats — карточки не должны N+1 долбить /favorites+/cart.',
      },
    ],
  },
  {
    id: 'hero',
    title: 'Главный экран (Hero)',
    group: 'Сайт',
    adminPath: '/admin/hero',
    publicPaths: ['/'],
    keywords: ['cms', 'cta', 'поиск', 'фильтры', 'обложка'],
    blocks: [
      {
        type: 'p',
        text: 'CMS первого экрана главной: включение, eyebrow/title/subtitle, картинка и позиция, CTA, показ поиска и фильтров каталога.',
      },
      {
        type: 'ul',
        items: [
          'enabled — выключить hero, оставив каталог',
          'image_position — top / left / right / bottom',
          'show_search / show_filters — спрятать поиск или фильтры без правки кода',
          'search_placeholder — текст в поле поиска битов (пусто → дефолт)',
          'CTA: label + href (внутренняя или внешняя ссылка)',
        ],
      },
      {
        type: 'warn',
        text: 'Title может быть многострочным. Не перегружайте hero промо-наклейками — для акций есть «Баннеры».',
      },
    ],
  },
  {
    id: 'banners',
    title: 'Баннеры',
    group: 'Сайт',
    adminPath: '/admin/banners',
    publicPaths: ['/'],
    keywords: ['promo', 'слайдер', 'даты', 'расписание'],
    blocks: [
      {
        type: 'p',
        text: 'Две вкладки: «Витрина» — ваши промо-слайды; «Заявки» — очередь платной рекламы (AdOrder), ставка ₽/день, апрув с правкой цены.',
      },
      {
        type: 'steps',
        items: [
          'Витрина: картинка, заголовок, ссылка (link_url), порядок, даты, enabled.',
          'Чекбокс «На полный экран»: вкл — featured-карточка 16:9 (до ~58rem ширины, без peek, стрелки на карточке); выкл — компакт ~70% + peek следующего (gap 24px), тоже 16:9. Креативы лучше готовить под 16:9 — max-height не сплющивает.',
          'Заявки: модерация новой → одобрить (можно изменить итог ₽) → клиент платит → баннер публикуется на N дней с оплаты.',
          'После «одобрена» поля заявки заморожены. Статусы: новая / одобрена / опубликована / отклонена / отменена.',
        ],
      },
      {
        type: 'tip',
        text: 'Скидку на расчёт формы ставьте в «Скидки» со scope «Реклама». Промокод клиент вводит при оплате одобренной заявки.',
      },
    ],
  },
  {
    id: 'sales',
    title: 'Скидки',
    group: 'Сайт',
    adminPath: '/admin/sales',
    keywords: ['sale', 'percent', 'fixed', 'scope'],
    blocks: [
      {
        type: 'p',
        text: 'Витринные кампании скидок: scope all / beats / courses / services / ads; kind percent или amount; даты; enabled.',
      },
      {
        type: 'p',
        text: 'На карточках появляется цена «было» (strikethrough). Скидки работают вместе с промокодами по правилам quote на сервере — не обещайте клиенту сумму «на глаз».',
      },
      {
        type: 'p',
        text: 'Scope «Реклама на витрине» (ads) режет расчёт дни×ставка на /order/ads до апрува. «Все товары» на рекламу не действует. На чекауте после апрува применяется только промокод.',
      },
      {
        type: 'warn',
        text: 'Две пересекающиеся активные кампании на один scope могут путать. Держите одну явную акцию на период.',
      },
    ],
  },
  {
    id: 'promo-codes',
    title: 'Промокоды',
    group: 'Сайт',
    adminPath: '/admin/promo-codes',
    keywords: ['купон', 'одноразовый', 'username'],
    blocks: [
      {
        type: 'p',
        text: 'Одноразовые промокоды, привязанные к конкретному пользователю (username). Редактирования нет — только создать / скопировать / удалить.',
      },
      {
        type: 'ul',
        items: [
          'Статусы: free → in-payment → used',
          'Kind: percent или фиксированная сумма',
          'Опционально свой код и заметка',
        ],
      },
      {
        type: 'steps',
        items: [
          'Найдите username в «Пользователи».',
          'Создайте код, скопируйте, отправьте человеку.',
          'Он вводит код на бите / в корзине / при оплате заказа.',
        ],
      },
      {
        type: 'warn',
        text: 'Код чужому username не сработает. Если удалили used-код — история покупки останется, но учёта кода уже не будет.',
      },
    ],
  },
  {
    id: 'footer',
    title: 'Футер и юридические страницы',
    group: 'Сайт',
    adminPath: '/admin/footer',
    publicPaths: ['/privacy', '/terms', '/pages/:slug'],
    keywords: ['legal', 'html', 'slug', 'dnd', 'пдн', 'оферта', 'cookie', 'инн', '152'],
    blocks: [
      {
        type: 'p',
        text: 'CMS пунктов футера: slug, label, title, HTML body, enable, порядок (drag-and-drop). Есть шаблон default-body и превью. Builtin-страницы: /terms (оферта), /privacy (ПДн), /consent-personal-data, /cookies.',
      },
      {
        type: 'ul',
        items: [
          'Обычные страницы → /pages/:slug или зашитые маршруты вроде /privacy, /terms',
          'Kind support — чат поддержки, не HTML',
          'Builtin-пункты нельзя ломать без понимания; можно выключить',
          'Шаблоны в репозитории: backend/footer_templates/*.html — при деплое с новой LEGAL_TEMPLATES_VERSION тела builtin перезапишутся из файлов',
        ],
      },
      {
        type: 'tip',
        text: 'После деплоя юрдоков открой /admin/footer и замени все [ИНН], [ОГРНИП], [адрес регистрации], email, хостинг, чек, уведомление РКН. Пока в тексте есть квадратные скобки — на прод лучше не пускать трафик без заполнения.',
      },
      {
        type: 'warn',
        text: 'Тексты написаны с оговоркой «если раздел доступен»: курсы, реклама, OAuth, капча, contributors могут быть выключены в настройках — в оферте это учтено. Если правишь HTML вручную, а потом в коде поднимут LEGAL_TEMPLATES_VERSION — правки затрутся шаблоном; после синка снова заполни реквизиты.',
      },
      {
        type: 'tip',
        text: 'Пишите юридический текст аккуратно: HTML редактируется CodeMirror. Сохраняйте черновик у себя, если правите большие документы. Кнопка «Подставить шаблон» подтягивает актуальный файл из репозитория.',
      },
    ],
  },
  {
    id: 'site-settings',
    title: 'Настройки сайта',
    group: 'Сайт',
    adminPath: '/admin/oauth-settings',
    publicPaths: ['/login', '/register', '/courses', '/order/ads'],
    keywords: ['oauth', 'totp', 'captcha', 'visibility', 'прайс', 'услуг'],
    blocks: [
      {
        type: 'p',
        text: 'Маршрут называется oauth-settings исторически, но здесь общие флаги сайта и OAuth.',
      },
      {
        type: 'ul',
        items: [
          'courses_visibility — all / admins_only / hidden',
          'ads_orders_enabled — витрина /order/ads',
          'ads_price_per_day — ставка ₽/день для расчёта заявки',
          'Прайс услуг — таблица сроков/цен для расчёта в форме /order (плашка на витрине выключена); в админке: слева группы полей, справа переменные + превью',
          'Системный доступ (скрыто, 5 кликов по «···» внизу): maintenance 503 + HTTP Basic Auth',
          'totp_enabled — требовать 2FA у пользователей (где включено)',
          'captcha_enabled — SmartCaptcha на логине/регистрации',
          'OAuth: тумблеры «Показывать кнопку» и «Разрешить вход» (зелёный = доступен). Скрытие/disable пишутся в is_hidden / is_disabled.',
        ],
      },
      {
        type: 'tip',
        text: 'В текстах прайса не пиши суммы руками — кликни поле, справа выбери чип («Неделя» в группе 50%/100%): в расчёте формы подставится число из таблицы. Превью в админке остаётся для проверки копирайта.',
      },
      {
        type: 'tip',
        text: 'Ставку и очередь заявок удобнее править в Баннеры → Заявки. Скидку на рекламу — в «Скидки» (scope ads).',
      },
      {
        type: 'warn',
        text: 'Системный доступ: внизу страницы настроек кликни «···» пять раз. HTTP Basic прячет весь сайт паролем браузера (для пререлиза). Maintenance отдаёт OLED-страницу 503 публике, /admin остаётся. Аварийно: SITE_GATE_DISABLE=1 или HTTP_BASIC_USER/PASSWORD в env. Превью UI: /status?kind=maintenance|error|offline|not_found.',
      },
      {
        type: 'warn',
        text: 'Client ID / секреты OAuth живут в env сервера, не в этой форме. Форма только показывает/прячет кнопки на /login и /register.',
      },
    ],
  },
  {
    id: 'errors',
    title: 'Ошибки',
    group: 'Система',
    adminPath: '/admin/errors',
    keywords: ['лог', 'auth', 'payment', 'debug', 'группа'],
    blocks: [
      {
        type: 'p',
        text: 'Журнал ошибок с пресетами периода и фильтром по типу. KPI-карточки типов кликабельны (включают фильтр). Список слева группирует одинаковые сообщения (×N); справа — детали. ?id= в URL шарится на конкретную запись. User ID ведёт в карточку пользователя.',
      },
      {
        type: 'tip',
        text: 'Если клиент пишет «оплатил, а бита нет» — сначала сюда и в покупки/PaymentIntent, не в правку цены бита.',
      },
    ],
  },
  {
    id: 'public-store',
    title: 'Как устроена витрина для покупателя',
    group: 'Витрина',
    publicPaths: ['/', '/cart', '/payment/success'],
    keywords: ['корзина', 'guest', 'лицензии', 'robokassa'],
    blocks: [
      {
        type: 'h3',
        text: 'Каталог и плеер',
      },
      {
        type: 'ul',
        items: [
          'Фильтры: жанр, тональность, BPM, цена, купленные/не купленные (если залогинен)',
          'Избранное — только биты, нужен логин',
          'Гость может класть биты в guest cart с карточки каталога и со страницы бита; checkout требует аккаунт',
          'На /beat/:id кнопка покупки всегда показывает сумму (или «бесплатно»); legacy-биты без tier-цен показывают одну «Лицензию» по полю price',
        ],
      },
      {
        type: 'h3',
        text: 'Лицензии',
      },
      {
        type: 'ul',
        items: [
          'MP3 / WAV / Exclusive — это purchase_type, не отдельная сущность License',
          'Exclusive обычно ZIP; если exclusive куплен и повтор запрещён — остаётся только exclusive',
        ],
      },
      {
        type: 'h3',
        text: 'Оплата',
      },
      {
        type: 'ul',
        items: [
          'Корзина / бит / курс / предоплата заказа → PaymentIntent на сервере',
          'Robokassa ResultURL подтверждает оплату и выдаёт товар',
          'Страницы success/failure только показывают статус (poll intent)',
          'Бесплатные позиции могут выдать сразу → /success',
        ],
      },
    ],
  },
  {
    id: 'public-auth-profile',
    title: 'Аккаунт покупателя',
    group: 'Витрина',
    publicPaths: ['/login', '/register', '/profile', '/purchases', '/favorites'],
    keywords: ['регистрация', 'пароль', '2fa', 'скачать'],
    blocks: [
      {
        type: 'ul',
        items: [
          '/login и /register — пароль, OAuth, captcha, 2FA',
          '/profile — контакты, пароль, 2FA setup, удаление аккаунта',
          '/purchases — скачивание купленного (download API) и стрим full через media-access, оплата confirmed-заказов',
          '/favorites — избранные биты',
          'Telegram WebApp может логинить автоматически, если настроено',
        ],
      },
    ],
  },
  {
    id: 'public-order',
    title: 'Услуги на витрине',
    group: 'Витрина',
    publicPaths: ['/order', '/order/ads'],
    keywords: ['wizard', 'реклама', 'заявка'],
    blocks: [
      {
        type: 'ul',
        items: [
          '«Знаю что нужно» — wizard с шагами; суммы из прайса в настройках (плашка на /order скрыта)',
          '«Пока не уверен» — короткая заявка',
          'Реклама — отдельный флоу, если ads_orders_enabled',
        ],
      },
      {
        type: 'p',
        text: 'Дальше всё ведётся в «Заявки». Клиент платит предоплату из /purchases, когда вы выставили confirmed/цену.',
      },
    ],
  },
  {
    id: 'checklist-new-beat',
    title: 'Чеклист: выложить бит',
    group: 'Чеклисты',
    keywords: ['чеклист', 'бит', 'публикация'],
    blocks: [
      {
        type: 'ol',
        items: [
          'Загрузка → все нужные файлы и цены',
          'Биты → проверить метаданные',
          'Открыть /beat/:id инкогнито — play demo, цены, exclusive',
          'Если акция — Скидки или Баннер с датами',
          'Прогнать тестовую покупку только на test-платежах',
        ],
      },
    ],
  },
  {
    id: 'checklist-sale',
    title: 'Чеклист: запустить акцию',
    group: 'Чеклисты',
    keywords: ['акция', 'скидка', 'баннер'],
    blocks: [
      {
        type: 'ol',
        items: [
          'Скидки → scope + %/сумма + даты + enabled',
          'Баннеры → креатив + link + те же даты',
          'Hero CTA при необходимости ведёт на / или якорь каталога',
          'Проверить strikethrough на карточке и итоговую сумму в корзине',
          'В день окончания — выключить или дождаться expires',
        ],
      },
    ],
  },
  {
    id: 'checklist-promo',
    title: 'Чеклист: выдать промокод',
    group: 'Чеклисты',
    keywords: ['промокод', 'подарок'],
    blocks: [
      {
        type: 'ol',
        items: [
          'Пользователи → убедиться что username верный (или попросить зарегистрироваться)',
          'Промокоды → создать → скопировать',
          'Написать человеку код и куда вводить (бит / корзина)',
          'После использования статус станет used — не удаляйте зря',
        ],
      },
    ],
  },
  {
    id: 'checklist-service',
    title: 'Чеклист: закрыть заявку на услугу',
    group: 'Чеклисты',
    keywords: ['заявка', 'услуга', 'сдать'],
    blocks: [
      {
        type: 'ol',
        items: [
          'Заявки → цена + предоплата + статус',
          'Дождаться оплаты (Покупки / Ошибки при сбое)',
          'Сделать работу → upload-result',
          'Статус done + короткое сообщение в Поддержке',
        ],
      },
    ],
  },
  {
    id: 'donts',
    title: 'Чего не делать',
    group: 'Важно',
    keywords: ['запрет', 'опасно', 'платежи'],
    blocks: [
      {
        type: 'ul',
        items: [
          'Не считать SuccessURL оплатой — только серверный webhook/fulfill',
          'Не писать «Marketplace» в публичном UI',
          'Не смешивать стили старых UI; публичная витрина = V2',
          'Не выкладывать exclusive без файла и цены',
          'Не отдавать /static/audio и /static/course_videos без покупки — demos/previews остаются публичными',
          'Не отключать всех OAuth + требовать captcha без запасного входа',
          'Не править личные заметки этого гайда через деплой — они в БД',
        ],
      },
    ],
  },
  {
    id: 'notes-info',
    title: 'Про блок «Мои заметки»',
    group: 'Важно',
    keywords: ['заметки', 'persist', 'sqlite'],
    blocks: [
      {
        type: 'p',
        text: 'Внизу страницы инструкции — личный блок заметок. Он сохраняется в базе сайта (site_settings), поэтому не сбрасывается при деплое, обновлении гайда в коде и откате фронта.',
      },
      {
        type: 'ul',
        items: [
          'Пишите сюда пароли от внешних кабинетов не стоит — только операционные напоминания',
          'Заметки видят все, кто вошёл как админ (общий блок на магазин)',
          'Кнопка «Сохранить» активна только при несохранённых изменениях; статус объявляется через aria-live',
          'Очистка поля + Сохранить = намеренно стереть',
        ],
      },
    ],
  },
];

export function flattenGuideSearchText(section) {
  const parts = [
    section.title,
    section.group,
    section.adminPath || '',
    ...(section.publicPaths || []),
    ...(section.keywords || []),
  ];
  for (const block of section.blocks || []) {
    if (block.text) parts.push(block.text);
    if (block.label) parts.push(block.label);
    if (block.href) parts.push(block.href);
    if (block.items) parts.push(block.items.join(' '));
  }
  return parts.join(' ').toLowerCase();
}

export function filterGuideSections(sections, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return sections;
  return sections.filter((section) => flattenGuideSearchText(section).includes(q));
}

export function groupGuideSections(sections) {
  const order = [];
  const map = new Map();
  for (const section of sections) {
    if (!map.has(section.group)) {
      map.set(section.group, []);
      order.push(section.group);
    }
    map.get(section.group).push(section);
  }
  return order.map((group) => ({ group, sections: map.get(group) }));
}
