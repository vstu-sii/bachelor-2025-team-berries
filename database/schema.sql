-- Создание базы данных для системы анализа отзывов
-- Автор: AlexandraR
-- Дата: 19.09.2025

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица пользователей
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(100),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Таблица проектов/анализов
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_url TEXT NOT NULL,
    product_name VARCHAR(500),
    marketplace_type VARCHAR(50) NOT NULL CHECK (marketplace_type IN ('wildberries', 'ozon', 'yandex_market')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'parsing', 'analyzing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analysis_started_at TIMESTAMP WITH TIME ZONE,
    analysis_completed_at TIMESTAMP WITH TIME ZONE,
    total_reviews INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB
);

-- Таблица отзывов
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    review_text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    author_name VARCHAR(200),
    review_date TIMESTAMP WITH TIME ZONE,
    sentiment VARCHAR(10) CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    aspects_json JSONB,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица результатов анализа
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    summary_json JSONB NOT NULL,
    charts_data JSONB,
    aspects_analysis JSONB,
    top_reviews JSONB,
    recommendations JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    report_version VARCHAR(20) DEFAULT '1.0'
);

-- Таблица взаимодействий с LLM
CREATE TABLE llm_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    prompt_type VARCHAR(50) NOT NULL CHECK (prompt_type IN ('sentiment_analysis', 'aspect_extraction', 'summary_generation', 'review_classification')),
    input_data JSONB NOT NULL,
    response_data JSONB NOT NULL,
    model_used VARCHAR(100) DEFAULT 'gpt-4',
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица пользовательских сессий
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации производительности

-- Пользователи
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_email_verified ON users(email_verified) WHERE email_verified = true;

-- Проекты
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_marketplace ON projects(marketplace_type);
CREATE INDEX idx_projects_user_created ON projects(user_id, created_at DESC);

-- Отзывы
CREATE INDEX idx_reviews_project_id ON reviews(project_id);
CREATE INDEX idx_reviews_sentiment ON reviews(sentiment);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_date ON reviews(review_date);
CREATE INDEX idx_reviews_project_sentiment ON reviews(project_id, sentiment);

-- Результаты анализа
CREATE INDEX idx_analysis_results_project ON analysis_results(project_id);
CREATE INDEX idx_analysis_results_generated ON analysis_results(generated_at);

-- LLM взаимодействия
CREATE INDEX idx_llm_project_id ON llm_interactions(project_id);
CREATE INDEX idx_llm_prompt_type ON llm_interactions(prompt_type);
CREATE INDEX idx_llm_created_at ON llm_interactions(created_at);
CREATE INDEX idx_llm_project_type ON llm_interactions(project_id, prompt_type);

-- Сессии пользователей
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);

-- Частичные индексы для оптимизации
CREATE INDEX idx_projects_active ON projects(user_id, created_at DESC) WHERE status IN ('completed', 'analyzing');
CREATE INDEX idx_reviews_helpful ON reviews(project_id, helpful_count DESC) WHERE helpful_count > 0;
