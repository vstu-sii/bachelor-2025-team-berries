# Infrastructure Guide

## 🚀 Запуск Dev-окружения

### 📋 Требования
- **Docker** & **Docker Compose** (версия >= 3.8)
- **Git**
- Доступ к dev-серверу (для деплоя)

### 🖥️ Локальный запуск

```bash
# Клонируем репозиторий
git clone https://github.com/your-repo/project-root.git
cd project-root/monitoring

# Создаём сеть для backend (если её нет)
docker network create backend_network

# Запускаем всё окружение
docker compose up -d
```

### ✅ Проверка запущенных сервисов

После запуска должны быть активны:
- **prometheus** — сбор метрик
- **grafana** — визуализация данных
- **loki** и **promtail** — сбор и хранение логов
- **clickhouse** — аналитика и долгосрочное хранение
- **langfuse** и **langfuse_db** — трассировка LLM

```bash
# Проверяем запущенные контейнеры
docker ps
```

### 🌐 Сервисы и порты

| Сервис       | Порт              |
|--------------|-------------------|
| **Grafana**  | 3000              |
| **Prometheus** | 9090            |
| **Loki**     | 3100              |
| **Langfuse** | 3001              |
| **ClickHouse** | 8123 / 9000     |

---

## 🔧 Troubleshooting Guide

### 1. Контейнер не запускается
```bash
docker ps -a
docker logs <container_name>
```
- Проверьте переменные окружения (`DATABASE_URL`, `CLICKHOUSE_URL` для Langfuse)
- Убедитесь в наличии volume и network

### 2. Grafana выдает ошибки
```bash
docker compose down -v
docker compose up -d
```

### 3. Promtail не запускается
Проверьте путь к конфигу в `docker-compose.yml`:
```yaml
volumes:
  - ./promtail.yml:/etc/promtail/config.yml
```

### 4. Langfuse падает
```bash
docker inspect --format='{{.State.Health.Status}}' langfuse-db
```

### 5. Контейнер “unhealthy”
- Проверьте healthcheck и зависимости в `docker-compose.yml`
- Перезапустите контейнер:
```bash
docker restart <container_name>
```

---

## 📊 Архитектура и взаимодействие сервисов

1. **Backend → Langfuse**: Трассировка LLM-запросов и цепочек  
2. **Backend → Prometheus**: Отправка метрик приложения  
3. **Backend → Promtail**: Отправка логов приложения  
4. **Promtail → Loki**: Централизованное хранение логов  
5. **Prometheus → Grafana**: Визуализация метрик и дашборды  
6. **Loki → Grafana**: Поиск и анализ логов  
7. **Langfuse → PostgreSQL/ClickHouse**: Хранение данных трассировок  
8. **Prometheus → ClickHouse**: Долгосрочное хранение метрик  

---

## 📘 Cheat Sheet для команды

### 🐳 Docker
```bash
docker compose up -d       # Запуск всех сервисов
docker compose down -v     # Остановка и удаление volumes
docker ps                  # Список работающих контейнеров
docker logs <container>    # Логи контейнера
docker restart <container> # Перезапуск контейнера
```

### ⚙️ GitHub Actions
```bash
# Проверка workflow
gh workflow list
gh run list
```

### 🔐 SSH-доступ на dev
```bash
ssh DEV_USER@DEV_HOST
```

---

## 🏗️ Структура сервисов (схема)

<img width="975" height="1150" alt="image" src="https://github.com/user-attachments/assets/e044cdb3-3d60-4eec-935e-8c0520b22e81" />
