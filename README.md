# Review Analyzer (Team Berries) — MLOps Sprint

Этот репозиторий содержит проект **Review Analyzer**, разработанный в рамках спринта **MLOps** командой Berries.  
Ветка `lab2-mlops-sprint` включает код модели, инфраструктуры и конфигурации деплоя / мониторинга.

## ⚙ Установка и локальный запуск (development)

1. Склонируй репозиторий и перейди на ветку `lab2-mlops-sprint`:
   ```bash
   git clone <URL репозитория>
   cd bachelor-2025-team-berries
   git checkout lab2-mlops-sprint

2. Скопируй .env.example в .env и заполни переменные окружения.
3. Запусти Docker-композицию для dev: docker-compose -f docker-compose.dev.yml up --build
4. После запуска будут доступны сервисы:

   * **Frontend**: [http://localhost:3000](http://localhost:3000)
   * **Backend API**: [http://localhost:8000](http://localhost:8000)
   * **Grafana**: [http://localhost:3001](http://localhost:3001)
   * **Prometheus**: [http://localhost:9090](http://localhost:9090)
   * **Loki**: [http://localhost:3100](http://localhost:3100)
   * **Langfuse**: [http://localhost:3002](http://localhost:3002)

---

## ✅ CI/CD

В `.github/workflows` настроены пайплайны:

* **ci.yml** — тесты, линтинг, покрытие (backend + frontend)
* **deploy-dev.yml** — деплой на dev-сервер при пуше в `develop`
* **pr-checks.yml** — проверки pull request (коммиты, безопасность, линтинг)
* **docker-security.yml** — сканирование Docker-образов (еженедельно)
* **dependabot.yml** — автообновление зависимостей
* **auto-assign.yml** — автоприсвоение ревьюеров

---

## 🧪 Тестирование

Backend:

```bash
cd backend
pytest --cov=./
```

Frontend:

```bash
cd frontend
npm test -- --coverage --watchAll=false
```

---

## 📚 Используемые технологии

* **Backend**: Python 3.11, FastAPI/Django (API), Celery
* **Frontend**: React (Node.js 18)
* **БД**: PostgreSQL
* **Кэш и брокер задач**: Redis
* **Мониторинг**: Prometheus, Grafana, Loki
* **Обсервабилити**: OpenTelemetry, Langfuse
* **CI/CD**: GitHub Actions
* **Контейнеризация**: Docker, Docker Compose

---



