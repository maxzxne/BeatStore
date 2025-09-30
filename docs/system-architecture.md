# Архитектура системы BeatStore

## Общая схема системы

```mermaid
graph TB
    subgraph "Frontend (React)"
        A[HomePage] --> B[BeatCard]
        A --> C[Filters]
        A --> D[MiniPlayer]
        E[BeatPage] --> F[AudioPlayer]
        G[CartPage] --> H[CartItem]
        I[FavoritesPage] --> B
        J[PurchasesPage] --> K[PurchaseItem]
        L[Header] --> M[Navigation]
    end
    
    subgraph "Backend (FastAPI)"
        N[API Endpoints] --> O[Authentication]
        N --> P[Beat Management]
        N --> Q[User Management]
        N --> R[Purchase System]
    end
    
    subgraph "Database (SQLite)"
        S[Users Table]
        T[Beats Table]
        U[Purchases Table]
        V[Favorites Table]
        W[Cart Table]
    end
    
    subgraph "File Storage"
        X[Audio Files]
        Y[Cover Images]
        Z[Project Files]
    end
    
    A --> N
    E --> N
    G --> N
    I --> N
    J --> N
    
    N --> S
    N --> T
    N --> U
    N --> V
    N --> W
    
    N --> X
    N --> Y
    N --> Z
```

## Поток данных

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant D as Database
    participant S as Storage
    
    U->>F: Загружает страницу
    F->>B: GET /beats
    B->>D: SELECT * FROM beats
    D-->>B: Список битов
    B-->>F: JSON ответ
    F-->>U: Отображает каталог
    
    U->>F: Нажимает "В корзину"
    F->>B: POST /beats/{id}/cart
    B->>D: INSERT INTO user_cart
    D-->>B: Успех
    B-->>F: 200 OK
    F-->>U: Обновляет UI
    
    U->>F: Покупает бит
    F->>B: POST /beats/{id}/purchase
    B->>D: INSERT INTO purchases
    B->>D: DELETE FROM user_cart
    D-->>B: Успех
    B-->>F: 200 OK
    F-->>U: Показывает успех
    
    U->>F: Скачивает бит
    F->>B: GET /beats/{id}/download
    B->>D: Проверяет покупку
    B->>S: Читает файл
    S-->>B: Файл
    B-->>F: Blob ответ
    F-->>U: Скачивание
```

## Компонентная архитектура

### Frontend компоненты

```mermaid
graph TD
    A[App] --> B[Layout]
    B --> C[Header]
    B --> D[Router]
    
    D --> E[HomePage]
    D --> F[BeatPage]
    D --> G[CartPage]
    D --> H[FavoritesPage]
    D --> I[PurchasesPage]
    D --> J[LoginPage]
    D --> K[RegisterPage]
    
    E --> L[BeatCard]
    E --> M[Filters]
    E --> N[MiniPlayer]
    
    F --> O[AudioPlayer]
    
    G --> P[CartItem]
    
    I --> Q[PurchaseItem]
    
    R[AuthContext] --> A
    S[AudioPlayerContext] --> A
    T[NotificationContext] --> A
```

### Backend структура

```mermaid
graph TD
    A[main.py] --> B[Authentication]
    A --> C[Beat Endpoints]
    A --> D[User Endpoints]
    A --> E[Purchase Endpoints]
    A --> F[Admin Endpoints]
    
    B --> G[JWT Tokens]
    B --> H[Password Hashing]
    
    C --> I[CRUD Operations]
    C --> J[File Upload]
    
    D --> K[Registration]
    D --> L[Login]
    D --> M[Profile]
    
    E --> N[Purchase Logic]
    E --> O[Download Logic]
    
    F --> P[Beat Management]
    F --> Q[User Management]
    F --> R[Analytics]
```

## API Endpoints

### Публичные endpoints
- `GET /beats` - Получить список битов
- `GET /beats/{id}` - Получить информацию о бите
- `POST /register` - Регистрация пользователя
- `POST /login` - Вход в систему

### Аутентифицированные endpoints
- `GET /me` - Информация о текущем пользователе
- `GET /favorites` - Избранные биты
- `POST /beats/{id}/favorite` - Добавить в избранное
- `DELETE /beats/{id}/favorite` - Удалить из избранного
- `GET /cart` - Корзина
- `POST /beats/{id}/cart` - Добавить в корзину
- `DELETE /beats/{id}/cart` - Удалить из корзины
- `GET /purchases` - Покупки пользователя
- `POST /beats/{id}/purchase` - Купить бит
- `GET /beats/{id}/download` - Скачать бит

### Административные endpoints
- `POST /api/admin/login` - Вход администратора
- `GET /api/admin/beats` - Управление битами
- `POST /api/admin/upload-beat` - Загрузка нового бита
- `PUT /api/admin/beats/{id}` - Обновление бита
- `DELETE /api/admin/beats/{id}` - Удаление бита
- `GET /api/admin/purchases` - Просмотр покупок
- `GET /api/admin/analytics` - Аналитика

## Безопасность

### Аутентификация
- JWT токены с истечением срока действия
- Refresh токены для продления сессии
- Хеширование паролей с bcrypt

### Авторизация
- Роли пользователей (user/admin)
- Проверка прав доступа на уровне API
- Защита от CSRF атак

### Валидация данных
- Pydantic модели для валидации
- Санитизация пользовательского ввода
- Защита от SQL инъекций через ORM

## Производительность

### Frontend оптимизации
- Lazy loading компонентов
- Мемоизация дорогих вычислений
- Виртуализация списков
- Кэширование API запросов

### Backend оптимизации
- Индексы в базе данных
- Пагинация результатов
- Кэширование статических файлов
- Асинхронная обработка запросов

### База данных
- Оптимизированные запросы
- Индексы на часто используемых полях
- Связи через внешние ключи
- Транзакции для целостности данных

## Масштабируемость

### Горизонтальное масштабирование
- Stateless архитектура
- Микросервисная готовность
- Контейнеризация с Docker
- Load balancing готовность

### Вертикальное масштабирование
- Оптимизация запросов к БД
- Кэширование на разных уровнях
- CDN для статических файлов
- Мониторинг производительности
