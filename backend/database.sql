CREATE DATABASE IF NOT EXISTS review_analysis;
USE review_analysis;

-- Пользователи системы (аутентификация через Telegram)
CREATE TABLE Users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    telegram_username VARCHAR(255),
    telegram_first_name VARCHAR(255),
    telegram_last_name VARCHAR(255),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_tier ENUM('free', 'pro', 'business') DEFAULT 'free',
    INDEX idx_telegram_id (telegram_id),
    INDEX idx_registration_date (registration_date),
    INDEX idx_subscription_tier (subscription_tier)
);

-- Создаем Analyses без внешнего ключа на Projects (пока)
CREATE TABLE Analyses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_reviews INT UNSIGNED DEFAULT 0,
    average_rating DECIMAL(3,2),
    positive_count INT UNSIGNED DEFAULT 0,
    neutral_count INT UNSIGNED DEFAULT 0,
    negative_count INT UNSIGNED DEFAULT 0,
    rating_trend ENUM('improved', 'declined', 'stable') DEFAULT 'stable',
    previous_analysis_id BIGINT UNSIGNED,
    status ENUM('pending', 'processing', 'completed', 'failed', 'no_data') DEFAULT 'pending',
    parsing_duration INT UNSIGNED,
    error_message TEXT,
    retry_count INT UNSIGNED DEFAULT 0,
    next_retry_at TIMESTAMP NULL,
    metadata JSON,
    summary TEXT,
    INDEX idx_project_id (project_id),
    INDEX idx_analysis_date (analysis_date),
    INDEX idx_period (period_start, period_end),
    INDEX idx_status (status),
    INDEX idx_rating_trend (rating_trend)
);

-- Теперь создаем Projects с внешним ключом на Analyses
CREATE TABLE Projects (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    marketplace_url VARCHAR(1000) NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    product_image_url VARCHAR(1000),
    marketplace_type ENUM('wildberries', 'ozon', 'yandex_market') DEFAULT 'wildberries',
    current_rating DECIMAL(3,2) DEFAULT 0.00,
    last_analysis_id BIGINT UNSIGNED,
    total_analyses INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (last_analysis_id) REFERENCES Analyses(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_marketplace_url (marketplace_url(255)),
    INDEX idx_created_at (created_at),
    INDEX idx_current_rating (current_rating),
    UNIQUE KEY unique_user_product (user_id, marketplace_url(500))
);

-- Теперь добавляем внешний ключ в Analyses на Projects
ALTER TABLE Analyses
ADD FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
ADD INDEX idx_project_status_date (project_id, status, analysis_date DESC),
ADD FOREIGN KEY (previous_analysis_id) REFERENCES Analyses(id) ON DELETE SET NULL;

-- Остальные таблицы в правильном порядке
CREATE TABLE AnalysisLimits (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    last_analysis_date DATE,
    analyses_today INT UNSIGNED DEFAULT 0,
    daily_limit INT UNSIGNED DEFAULT 10,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE AnalysisResults (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    analysis_id BIGINT UNSIGNED NOT NULL,
    aspect_name VARCHAR(100) NOT NULL,
    aspect_category ENUM('product', 'service', 'shipping', 'price', 'other') DEFAULT 'product',
    mentions_count INT UNSIGNED DEFAULT 0,
    positive_mentions INT UNSIGNED DEFAULT 0,
    negative_mentions INT UNSIGNED DEFAULT 0,
    sentiment_score DECIMAL(4,3),
    trend_direction ENUM('improving', 'declining', 'stable') DEFAULT 'stable',
    common_themes JSON,
    key_phrases JSON,
    FOREIGN KEY (analysis_id) REFERENCES Analyses(id) ON DELETE CASCADE,
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_aspect_name (aspect_name),
    INDEX idx_aspect_category (aspect_category),
    INDEX idx_sentiment_score (sentiment_score),
    UNIQUE KEY unique_analysis_aspect (analysis_id, aspect_name)
);

CREATE TABLE ParsingSessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    analysis_id BIGINT UNSIGNED,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    reviews_parsed INT UNSIGNED DEFAULT 0,
    pages_processed INT UNSIGNED DEFAULT 0,
    parsing_status ENUM('started', 'completed', 'failed', 'no_data', 'rate_limited') DEFAULT 'started',
    error_details TEXT,
    marketplace_response_code INT,
    retry_count INT UNSIGNED DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    FOREIGN KEY (analysis_id) REFERENCES Analyses(id) ON DELETE SET NULL,
    INDEX idx_project_id (project_id),
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_started_at (started_at),
    INDEX idx_parsing_status (parsing_status)
);

CREATE TABLE LLMInteractions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    analysis_id BIGINT UNSIGNED,
    prompt_type ENUM('sentiment_analysis', 'aspect_extraction', 'comparison_insights', 'trend_analysis') NOT NULL,
    prompt_text TEXT NOT NULL,
    llm_response JSON,
    model_used VARCHAR(100) DEFAULT 'gpt-4',
    tokens_used INT UNSIGNED,
    processing_time INT UNSIGNED,
    cost DECIMAL(10,6) DEFAULT 0.000000,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    FOREIGN KEY (analysis_id) REFERENCES Analyses(id) ON DELETE SET NULL,
    INDEX idx_project_id (project_id),
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_created_at (created_at),
    INDEX idx_prompt_type (prompt_type),
    INDEX idx_success (success)
);

CREATE TABLE ComparisonReports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    project_id BIGINT UNSIGNED NOT NULL,
    analysis_ids JSON NOT NULL,
    analysis_count INT UNSIGNED DEFAULT 0,
    period_range JSON,
    comparison_data JSON,
    key_insights JSON,
    visualization_data JSON,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_project_id (project_id),
    INDEX idx_generated_at (generated_at),
    INDEX idx_is_active (is_active)
);

CREATE TABLE SystemSettings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSON,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
);

-- Триггер остается без изменений
DELIMITER //
CREATE TRIGGER after_analysis_complete
    AFTER UPDATE ON Analyses
    FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE Projects 
        SET last_analysis_id = NEW.id, 
            current_rating = NEW.average_rating,
            total_analyses = total_analyses + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.project_id;
        
        INSERT INTO AnalysisLimits (user_id, last_analysis_date, analyses_today, daily_limit)
        SELECT p.user_id, CURDATE(), 1, 10
        FROM Projects p 
        WHERE p.id = NEW.project_id
        ON DUPLICATE KEY UPDATE 
            analyses_today = IF(last_analysis_date = CURDATE(), analyses_today + 1, 1),
            last_analysis_date = CURDATE();
    END IF;
END//
DELIMITER ;

INSERT INTO SystemSettings (setting_key, setting_value, description) VALUES
('analysis_rate_limit', '{"free": 10, "pro": 50, "business": 200}', 'Суточные лимиты анализов по подпискам'),
('parsing_timeout', '{"default": 30, "extended": 60}', 'Таймауты парсинга в секундах'),
('supported_marketplaces', '["wildberries", "ozon", "yandex_market"]', 'Поддерживаемые маркетплейсы'),
('llm_models', '["gpt-4", "gpt-3.5-turbo", "claude-3"]', 'Доступные модели ИИ');

CREATE USER 'review_analysis_user'@'%' IDENTIFIED BY 'secure_password_123';
GRANT SELECT, INSERT, UPDATE, DELETE ON review_analysis.* TO 'review_analysis_user'@'%';
FLUSH PRIVILEGES;