

# AI Review Analyzer API Документация

## 🔐 Аутентификация и авторизация
```markdown
### 📋 Получить форму авторизации
```http
GET /
Описание: Возвращает HTML страницу для входа в систему аналитики отзывов

Параметры: Нет

Заголовки:
Content-Type: text/html
```

### 🔑 Авторизация пользователя
```http
POST /auth
Content-Type: application/x-www-form-urlencoded

Описание: Выполняет аутентификацию пользователя для доступа к аналитике

Параметры формы:
email (string, required) - Email пользователя
password (string, required) - Пароль пользователя
```

### 📝 Регистрация нового пользователя
```http
POST /register
Content-Type: application/x-www-form-urlencoded

Описание: Создает нового пользователя для системы аналитики

Параметры формы:
name (string, required) - Имя пользователя
email (string, required) - Email для входа
password (string, required) - Пароль (мин. 6 символов)
company (string, optional) - Название компании
```

---

## 📊 Анализ отзывов

### 🔗 Подключить маркетплейс
```http
POST /connect-marketplace
Content-Type: application/json

Описание: Подключает аккаунт маркетплейса для сбора отзывов

Параметры тела:
marketplace (string, required) - Имя маркетплейса: "wildberries", "ozon", "yandex_market"
api_key (string, required) - API ключ для доступа
seller_id (string, required) - ID продавца/магазина
```

### 📥 Начать сбор отзывов
```http
POST /start-collection
Content-Type: application/json

Описание: Запускает сбор отзывов с подключенных маркетплейсов

Параметры тела:
marketplace (string, optional) - Конкретный маркетплейс (если не указан - все)
product_ids (array, optional) - Список ID товаров для анализа
date_from (string, optional) - Дата начала сбора (YYYY-MM-DD)
date_to (string, optional) - Дата окончания сбора (YYYY-MM-DD)
```

### 📊 Получить статус сбора
```http
GET /collection-status/{task_id}
Описание: Получает статус и результаты сбора отзывов

Параметры пути:
task_id (string, required) - UUID задачи сбора
```

---

## 🤖 AI Анализ

### 🧠 Анализировать тональность отзывов
```http
POST /analyze-sentiment
Content-Type: application/json

Описание: Запускает AI-анализ тональности собранных отзывов

Параметры тела:
task_id (string, required) - UUID задачи сбора отзывов
analysis_type (string, optional) - Тип анализа: "basic", "advanced", "deep" (по умолчанию: "basic")
language (string, optional) - Язык анализа: "ru", "en" (по умолчанию: "ru")
```

### 🔍 Выявить проблемы
```http
POST /detect-problems
Content-Type: application/json

Описание: Анализирует отзывы для выявления частых проблем и жалоб

Параметры тела:
task_id (string, required) - UUID задачи сбора отзывов
problem_categories (array, optional) - Категории проблем для поиска
min_frequency (integer, optional) - Минимальная частота проблемы для включения (по умолчанию: 3)
```

### 📈 Получить аналитику
```http
GET /analytics/{task_id}
Описание: Получает результаты AI-анализа отзывов

Параметры пути:
task_id (string, required) - UUID задачи анализа
```

---

## 💡 Рекомендации

### 💎 Сгенерировать рекомендации
```http
POST /generate-recommendations
Content-Type: application/json

Описание: Генерирует рекомендации по улучшению на основе анализа отзывов

Параметры тела:
task_id (string, required) - UUID задачи анализа
priority (string, optional) - Приоритет: "urgent", "high", "medium", "low" (по умолчанию: "medium")
category (string, optional) - Категория рекомендаций: "product", "service", "delivery", "all"
```

### 🎯 Получить рекомендации
```http
GET /recommendations/{task_id}
Описание: Получает сгенерированные рекомендации по улучшению

Параметры пути:
task_id (string, required) - UUID задачи генерации рекомендаций
```

---

## 📊 Отчеты и визуализация

### 📄 Сгенерировать отчет
```http
POST /generate-report
Content-Type: application/json

Описание: Генерирует детальный отчет по анализу отзывов

Параметры тела:
task_id (string, required) - UUID задачи анализа
report_type (string, optional) - Тип отчета: "summary", "detailed", "executive" (по умолчанию: "summary")
format (string, optional) - Формат: "pdf", "html", "json" (по умолчанию: "html")
```

### 📊 Получить дашборд
```http
GET /dashboard
Описание: Возвращает интерактивный дашборд с аналитикой отзывов

Параметры query:
period (string, optional) - Период: "day", "week", "month", "quarter", "year" (по умолчанию: "month")
```

### 📉 Сравнительная аналитика
```http
GET /comparison
Описание: Возвращает страницу для сравнения показателей по разным периодам или товарам

Параметры query:
compare_type (string, optional) - Тип сравнения: "period", "product", "marketplace" (по умолчанию: "period")
period1 (string, required) - Первый период (YYYY-MM-DD)
period2 (string, required) - Второй период (YYYY-MM-DD)
```

---

## ⚙️ Настройки и профиль

### 👤 Профиль пользователя
```http
GET /profile
Описание: Страница профиля пользователя с настройками аналитики

POST /profile/settings
Content-Type: application/json
Описание: Сохраняет настройки пользователя
```


### 📦 Управление товарами
```http
GET /products
Описание: Страница управления товарами для анализа

POST /products/import
Content-Type: application/json
Описание: Импортирует список товаров для мониторинга
```

---

## 📈 Основные метрики API

### 🎯 Ключевые метрики
```http
GET /metrics/summary
Описание: Возвращает сводку ключевых метрик по отзывам

GET /metrics/trends
Описание: Возвращает тренды изменения метрик во времени
```

### 🚨 Оповещения
```http
GET /alerts
Описание: Возвращает активные оповещения и уведомления

POST /alerts/settings
Content-Type: application/json
Описание: Настраивает условия оповещений
```

---

## 🔄 Коды ответов HTTP

| Код | Описание | Использование |
|-----|-----------|---------------|
| `200` | Успешный запрос | Большинство успешных операций |
| `201` | Создано | Успешное создание ресурса |
| `400` | Неверный запрос | Ошибки валидации данных |
| `401` | Не авторизован | Отсутствует аутентификация |
| `403` | Доступ запрещен | Нет прав доступа |
| `404` | Не найдено | Ресурс не существует |
| `429` | Слишком много запросов | Превышен лимит запросов |
| `500` | Внутренняя ошибка сервера | Ошибки в коде приложения |

---

## 🚨 Коды ошибок приложения

| Код ошибки | Описание | HTTP статус |
|------------|-----------|-------------|
| `MARKETPLACE_CONNECTION_FAILED` | Ошибка подключения к маркетплейсу | 400 |
| `API_LIMIT_EXCEEDED` | Превышен лимит API запросов | 429 |
| `ANALYSIS_FAILED` | Ошибка AI-анализа | 500 |
| `REPORT_GENERATION_FAILED` | Ошибка генерации отчета | 500 |
| `DATA_NOT_FOUND` | Данные не найдены | 404 |
| `INVALID_CONFIGURATION` | Неверная конфигурация | 400 |

---

## 📝 Технические характеристики

### Производительность
- **Сбор отзывов**: ~100 отзывов/5 минут
- **AI-анализ тональности**: ~100 отзывов/минута
- **Генерация рекомендаций**: ~2-5 секунд на отчет
- **Время ответа API**: < 200 мс для большинства запросов

### Ограничения
- **Максимальное количество товаров**: 1000 на аккаунт
- **История отзывов**: до 2 лет хранения
- **Частота обновления**: каждые 15 минут для активных товаров
- **Параллельные задачи**: до 5 одновременных процессов анализа

### Интеграции
- Поддерживаемые маркетплейсы: Wildberries
---



Этот API документ соответствует структуре вашего проекта AI Review Analyzer и включает все основные функции для анализа отзывов с маркетплейсов.
