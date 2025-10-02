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
