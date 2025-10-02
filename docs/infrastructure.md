# Документация инфраструктуры

## Быстрый старт

### Запуск разработки
```bash
# 1. Клонировать репозиторий
git clone https://github.com/your-company/review-analyzer
cd review-analyzer

# 2. Запустить сервисы
docker-compose up -d

# 3. Проверить работу
curl http://localhost:8000/health

### Доступ к сервисам
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API документация: http://localhost:8000/docs
- База данных: localhost:5432
- Redis: localhost:6379

## Архитектура

### Компоненты системы
Frontend (React) → Backend (FastAPI) → База данных (PostgreSQL)
                            ↓
                    Worker (Celery) → Redis (очередь)
                            ↓
                    NLP API / LLM API (внешние)

### Сервисы в Docker
- frontend - React приложение
- backend - FastAPI + Python
- worker - Фоновая обработка задач
- db - PostgreSQL база данных
- redis - Кеш и очередь задач

## Troubleshooting

### Частые проблемы

Сервисы не запускаются
# Проверить логи
docker-compose logs backend
docker-compose logs db

# Пересобрать образы
docker-compose down
docker-compose build --no-cache
docker-compose up -d

Ошибки базы данных
# Проверить подключение к БД
docker-compose exec db psql -U postgres -d review_analyzer

# Пересоздать БД
docker-compose down -v
docker-compose up -d

Проблемы с зависимостями
# Обновить Python зависимости
docker-compose exec backend pip install -r requirements.txt

# Обновить npm пакеты
docker-compose exec frontend npm install

### Проверка здоровья
# Проверить все сервисы
docker-compose ps

# Проверить API
curl http://localhost:8000/health

# Проверить БД
docker-compose exec db pg_isready

# Проверить Redis
docker-compose exec redis redis-cli ping

## Cheat Sheet для команды

### Команды Docker
# Запуск
docker-compose up -d          # Запустить все сервисы
docker-compose down           # Остановить все сервисы
docker-compose restart backend # Перезапустить сервис

# Логи
docker-compose logs -f backend # Смотреть логи в реальном времени
docker-compose logs --tail=100 backend # Последние 100 строк

# Управление
docker-compose exec backend bash   # Войти в контейнер
docker-compose ps                 # Статус сервисов
docker-compose images            # Список образов

### Команды разработки
# Backend
docker-compose exec backend python -m pytest      # Запуск тестов
docker-compose exec backend python manage.py migrate  # Миграции БД

# Frontend  
docker-compose exec frontend npm run dev        # Режим разработки
docker-compose exec frontend npm run build      # Сборка проекта

### Работа с базой данных
# Подключение к БД
docker-compose exec db psql -U postgres -d review_analyzer

# Бэкап БД
docker-compose exec db pg_dump -U postgres review_analyzer > backup.sql

# Восстановление БД
docker-compose exec -T db psql -U postgres review_analyzer < backup.sql

### Мониторинг
# Использование ресурсов
docker stats

# Очистка
docker system prune -f      # Удалить неиспользуемые образы
docker volume prune -f      # Удалить неиспользуемые volumes

## Переменные окружения

### Обязательные настройки
DATABASE_URL=postgresql://postgres:postgres@db:5432/review_analyzer
REDIS_URL=redis://redis:6379/0
JWT_SECRET=your-secret-key

### Внешние API
NLP_API_URL=https://api.nlp-service.com
NLP_API_KEY=your-nlp-key
LLM_API_URL=https://api.llm-service.com  
LLM_API_KEY=your-llm-key

## Полезные ссылки

- Документация API: http://localhost:8000/docs
- Репозиторий: https://github.com/your-company/review-analyzer
- Trello/доска задач: [ссылка на трелло]
- Чат команды: [ссылка на слак/дискорд]

**Файловая структура:**
docs/
├── infrastructure.md      # Эта документация
├── api-guide.md          # Руководство по API
└── deployment.md         # Инструкции по деплою
```

Этот документ покрывает все основные сценарии работы с инфраструктурой проекта.
