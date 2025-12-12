# MLOps Dev Environment

## Сервисы

Сервис           Порт   Описание                               
PostgreSQL       5432   База данных                              
Backend          8081   API сервис                               
Frontend         3000   React интерфейс                          
Jupyter Notebook 8888   Эксперименты и LLM                       
LLM Service      8080   HuggingFace text-generation-inference    

## Запуск проекта

1. Перейти в корень проекта:
пишим это в командную строку
cd D:\project-root
2. собираем и запускаем контейнеры 
docker compose -f docker-compose.dev.yml up -d --build
3. проверка работоспособности контейнеров 
docker ps
Проверка работы
Backend: http://localhost:8081
DB test: http://localhost:8081/db-test
Health check: http://localhost:8081/health
Jupyter: http://localhost:8888
 (токен: mlops)
LLM: http://localhost:8080