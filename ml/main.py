from fastapi import FastAPI
from app.api import router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="WB Parser API",
    version="0.1.0",
)

# Разрешаем CORS, чтобы фронтенд мог отправлять запросы к API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем запросы с любых источников (для разработки)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)