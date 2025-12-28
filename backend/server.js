const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Пути
const FRONTEND_PATH = path.join(__dirname, '../frontend');

// Настройка CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Настройка сессий
app.use(session({
    secret: process.env.SESSION_SECRET || 'review-analysis-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Обслуживание статических файлов фронтенда
app.use(express.static(FRONTEND_PATH));

// Подключение к базе данных
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'review_analysis',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true
});

// JWT секрет
const JWT_SECRET = process.env.JWT_SECRET || 'review-analysis-jwt-secret';

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

// Функция для безопасной конвертации в число
function safeInt(value, defaultValue = 0) {
    if (value === undefined || value === null) return defaultValue;
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
}

// Функция для логирования SQL запросов
function logQuery(sql, params) {
    console.log('\n📊 SQL Запрос:');
    console.log('SQL:', sql);
    console.log('Params:', params);
    console.log('Types:', params.map(p => typeof p));
    console.log('---\n');
}

// ==========================================
// МИДЛВАРЫ
// ==========================================

// Проверка JWT токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Требуется авторизация' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Недействительный токен' 
            });
        }
        req.user = user;
        next();
    });
};

// ==========================================
// МАРШРУТЫ ДЛЯ HTML СТРАНИЦ
// ==========================================

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// Дашборд
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'dashboard.html'));
});

// Настройки
app.get('/settings', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'settings.html'));
});

// Страница товара
app.get('/product/:id', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'product.html'));
});

// Сравнение
app.get('/comparison/:id', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'comparison.html'));
});

// ==========================================
// API МАРШРУТЫ - РЕГИСТРАЦИЯ И ВХОД
// ==========================================

// Регистрация нового пользователя
app.post('/api/auth/register', async (req, res) => {
    try {
        const { telegram_id, username, first_name, last_name, subscription_tier = 'free' } = req.body;

        // Валидация
        const errors = {};
        
        if (!telegram_id || isNaN(telegram_id) || telegram_id <= 0) {
            errors.telegram_id = 'Введите корректный Telegram ID';
        }
        
        if (!first_name || first_name.trim().length < 2) {
            errors.first_name = 'Имя должно содержать минимум 2 символа';
        }
        
        if (username && !username.startsWith('@')) {
            errors.username = 'Username должен начинаться с @';
        }
        
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ошибка валидации',
                errors
            });
        }

        console.log('📝 Регистрация пользователя:', { telegram_id, first_name, username });

        // Проверяем, существует ли пользователь
        const [existingUser] = await db.execute(
            'SELECT * FROM Users WHERE telegram_id = ?',
            [telegram_id]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Пользователь с таким Telegram ID уже существует'
            });
        }

        // Создаем пользователя (БЕЗ updated_at)
        const [result] = await db.execute(
            `INSERT INTO Users 
             (telegram_id, telegram_username, telegram_first_name, telegram_last_name, subscription_tier) 
             VALUES (?, ?, ?, ?, ?)`,
            [telegram_id, username || '', first_name, last_name || '', subscription_tier]
        );

        const userId = result.insertId;
        console.log(`👤 Зарегистрирован новый пользователь ID: ${userId}`);

        // Создаем JWT токен
        const token = jwt.sign(
            { 
                id: userId, 
                telegram_id: telegram_id,
                username: username,
                first_name: first_name,
                subscription_tier: subscription_tier
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Получаем данные пользователя
        const [userRows] = await db.execute(
            'SELECT * FROM Users WHERE id = ?',
            [userId]
        );

        const user = userRows[0];

        res.status(201).json({
            success: true,
            message: 'Регистрация успешна!',
            token,
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                telegram_username: user.telegram_username,
                telegram_first_name: user.telegram_first_name,
                telegram_last_name: user.telegram_last_name,
                subscription_tier: user.subscription_tier || 'free',
                registration_date: user.registration_date,
                last_login: user.last_login,
                is_active: user.is_active
            }
        });

    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при регистрации',
            error: error.message
        });
    }
});

// Вход по Telegram ID - ИСПРАВЛЕННАЯ ВЕРСИЯ (без updated_at)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { telegram_id } = req.body;

        // Валидация
        if (!telegram_id || isNaN(telegram_id) || telegram_id <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Введите корректный Telegram ID',
                errors: { telegram_id: 'Введите корректный Telegram ID' }
            });
        }

        console.log('🔑 Вход пользователя:', { telegram_id });

        // Ищем пользователя
        const [users] = await db.execute(
            'SELECT * FROM Users WHERE telegram_id = ?',
            [telegram_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден. Зарегистрируйтесь.',
                errors: { telegram_id: 'Пользователь не найден' }
            });
        }

        const user = users[0];

        // Обновляем время последнего входа (БЕЗ updated_at)
        await db.execute(
            `UPDATE Users 
             SET last_login = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [user.id]
        );

        // Создаем JWT токен
        const token = jwt.sign(
            { 
                id: user.id, 
                telegram_id: user.telegram_id,
                username: user.telegram_username,
                first_name: user.telegram_first_name,
                subscription_tier: user.subscription_tier || 'free'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`✅ Успешный вход пользователя ID: ${user.id}`);

        res.json({
            success: true,
            message: 'Вход выполнен успешно!',
            token,
            redirect: '/dashboard',
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                telegram_username: user.telegram_username,
                telegram_first_name: user.telegram_first_name,
                telegram_last_name: user.telegram_last_name,
                subscription_tier: user.subscription_tier || 'free',
                registration_date: user.registration_date,
                last_login: user.last_login,
                is_active: user.is_active
            }
        });

    } catch (error) {
        console.error('❌ Ошибка входа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при входе',
            error: error.message
        });
    }
});

// Получение информации о пользователе
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await db.execute(
            'SELECT * FROM Users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        const user = users[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                telegram_username: user.telegram_username,
                telegram_first_name: user.telegram_first_name,
                telegram_last_name: user.telegram_last_name,
                subscription_tier: user.subscription_tier || 'free',
                registration_date: user.registration_date,
                last_login: user.last_login,
                is_active: user.is_active
            }
        });

    } catch (error) {
        console.error('❌ Ошибка получения данных пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера'
        });
    }
});

// ==========================================
// API МАРШРУТЫ - АВТОРИЗАЦИЯ (старый Telegram способ, оставлен для совместимости)
// ==========================================

// Аутентификация через Telegram (старая версия) - ИСПРАВЛЕНА
app.post('/api/auth/telegram', async (req, res) => {
    try {
        const { id, first_name, last_name, username } = req.body;

        if (!id || !first_name) {
            return res.status(400).json({
                success: false,
                message: 'Недостаточно данных от Telegram'
            });
        }

        console.log('🔐 Авторизация Telegram:', { id, first_name, username });

        // Проверяем, существует ли пользователь
        const [existingUser] = await db.execute(
            'SELECT * FROM Users WHERE telegram_id = ?',
            [id]
        );

        let userId;
        let isNewUser = false;

        if (existingUser.length > 0) {
            // Пользователь существует - обновляем данные (БЕЗ updated_at)
            userId = existingUser[0].id;
            
            await db.execute(
                `UPDATE Users 
                 SET telegram_username = ?, 
                     telegram_first_name = ?, 
                     telegram_last_name = ?,
                     last_login = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [username || '', first_name, last_name || '', userId]
            );
            
            console.log(`📝 Обновлен пользователь ID: ${userId}`);
        } else {
            // Новый пользователь - создаем запись
            const [result] = await db.execute(
                `INSERT INTO Users 
                 (telegram_id, telegram_username, telegram_first_name, telegram_last_name, subscription_tier) 
                 VALUES (?, ?, ?, ?, 'free')`,
                [id, username || '', first_name, last_name || '']
            );
            
            userId = result.insertId;
            isNewUser = true;
            console.log(`👤 Создан новый пользователь ID: ${userId}`);
        }

        // Создаем JWT токен
        const token = jwt.sign(
            { 
                id: userId, 
                telegram_id: id,
                username: username,
                first_name: first_name,
                subscription_tier: 'free'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Получаем обновленные данные пользователя
        const [userRows] = await db.execute(
            'SELECT * FROM Users WHERE id = ?',
            [userId]
        );

        const user = userRows[0];

        res.json({
            success: true,
            message: isNewUser ? 'Добро пожаловать!' : 'Добро пожаловать обратно!',
            token,
            redirect: '/dashboard',
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                telegram_username: user.telegram_username,
                telegram_first_name: user.telegram_first_name,
                telegram_last_name: user.telegram_last_name,
                subscription_tier: user.subscription_tier || 'free',
                registration_date: user.registration_date,
                last_login: user.last_login,
                is_active: user.is_active
            }
        });

    } catch (error) {
        console.error('❌ Ошибка Telegram аутентификации:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при аутентификации',
            error: error.message
        });
    }
});

// Проверка токена
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Выход
app.post('/api/logout', authenticateToken, async (req, res) => {
    try {
        res.json({ 
            success: true, 
            message: 'Вы вышли из системы' 
        });
    } catch (error) {
        console.error('❌ Ошибка выхода:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при выходе'
        });
    }
});

// ==========================================
// API МАРШРУТЫ - ПРОЕКТЫ
// ==========================================

// Получение списка товаров
app.get('/api/projects', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 12, search = '' } = req.query;
        
        // Конвертируем параметры в числа
        const pageNum = safeInt(page, 1);
        const limitNum = safeInt(limit, 12);
        const offset = (pageNum - 1) * limitNum;
        
        console.log('📦 Получение проектов:', { userId, pageNum, limitNum, offset, search });

        // Базовый запрос
        let query = 'SELECT * FROM Projects WHERE user_id = ?';
        const params = [userId];

        if (search && search.trim() !== '') {
            query += ' AND (product_name LIKE ? OR marketplace_url LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY created_at DESC';
        
        const [projects] = await db.execute(query, params);
        
        // Если есть пагинация - применяем ее вручную
        let paginatedProjects = projects;
        if (limitNum > 0) {
            paginatedProjects = projects.slice(offset, offset + limitNum);
        }

        res.json({
            success: true,
            projects: paginatedProjects,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: projects.length,
                pages: limitNum > 0 ? Math.ceil(projects.length / limitNum) : 1
            }
        });

    } catch (error) {
        console.error('❌ Ошибка получения проектов:', error);
        console.error('Детали ошибки:', {
            message: error.message,
            sql: error.sql,
            code: error.code,
            errno: error.errno
        });
        
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении проектов',
            error: error.message
        });
    }
});

// Альтернативная версия с пагинацией через SQL
app.get('/api/projects2', authenticateToken, async (req, res) => {
    try {
        const userId = safeInt(req.user.id);
        const page = safeInt(req.query.page, 1);
        const limit = safeInt(req.query.limit, 12);
        const offset = (page - 1) * limit;
        
        console.log('📦 Альтернативный запрос проектов:', { userId, page, limit, offset });

        const query = 'SELECT * FROM Projects WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
        const params = [userId, limit, offset];
        
        logQuery(query, params);
        
        const [projects] = await db.execute(query, params);
        
        // Получаем общее количество
        const [countResult] = await db.execute(
            'SELECT COUNT(*) as total FROM Projects WHERE user_id = ?',
            [userId]
        );
        
        const total = countResult[0].total;

        res.json({
            success: true,
            projects,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('❌ Ошибка альтернативного получения проектов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении проектов',
            error: error.message
        });
    }
});

// Добавление нового товара
app.post('/api/projects', authenticateToken, async (req, res) => {
    try {
        const userId = safeInt(req.user.id);
        const { marketplace_url, product_name, product_image_url, marketplace_type } = req.body;

        if (!marketplace_url) {
            return res.status(400).json({
                success: false,
                message: 'Ссылка на товар обязательна'
            });
        }

        console.log('➕ Добавление проекта:', { userId, marketplace_url, product_name });

        // Проверяем, не существует ли уже такой товар у пользователя
        const [existingProject] = await db.execute(
            'SELECT id FROM Projects WHERE user_id = ? AND marketplace_url = ?',
            [userId, marketplace_url]
        );

        if (existingProject.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Этот товар уже есть в вашей коллекции'
            });
        }

        // Определяем маркетплейс
        const marketplace = marketplace_type || 'wildberries';

        // Создаем проект
        const [result] = await db.execute(
            `INSERT INTO Projects 
             (user_id, marketplace_url, product_name, product_image_url, marketplace_type) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, marketplace_url, product_name || 'Без названия', product_image_url || '', marketplace]
        );

        const projectId = result.insertId;

        // Получаем созданный проект
        const [projectRows] = await db.execute(
            'SELECT * FROM Projects WHERE id = ?',
            [projectId]
        );

        const project = projectRows[0];

        res.status(201).json({
            success: true,
            message: 'Товар успешно добавлен',
            project
        });

    } catch (error) {
        console.error('❌ Ошибка добавления проекта:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при добавлении проекта',
            error: error.message
        });
    }
});

// Получение информации о конкретном товаре
app.get('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const userId = safeInt(req.user.id);
        const projectId = safeInt(req.params.id);

        console.log('📄 Получение проекта:', { userId, projectId });

        const [projects] = await db.execute(
            'SELECT * FROM Projects WHERE id = ? AND user_id = ?',
            [projectId, userId]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Товар не найден'
            });
        }

        res.json({
            success: true,
            project: projects[0]
        });

    } catch (error) {
        console.error('❌ Ошибка получения проекта:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении проекта'
        });
    }
});

// Удаление товара
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const userId = safeInt(req.user.id);
        const projectId = safeInt(req.params.id);

        console.log('🗑️ Удаление проекта:', { userId, projectId });

        // Проверяем, принадлежит ли товар пользователю
        const [projects] = await db.execute(
            'SELECT id FROM Projects WHERE id = ? AND user_id = ?',
            [projectId, userId]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Товар не найден'
            });
        }

        await db.execute('DELETE FROM Projects WHERE id = ?', [projectId]);

        res.json({
            success: true,
            message: 'Товар удален'
        });

    } catch (error) {
        console.error('❌ Ошибка удаления проекта:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при удалении проекта'
        });
    }
});

// ==========================================
// API МАРШРУТЫ - АНАЛИЗЫ (демо версия)
// ==========================================

// Запуск анализа
app.post('/api/projects/:id/analyses', authenticateToken, async (req, res) => {
    try {
        const userId = safeInt(req.user.id);
        const projectId = safeInt(req.params.id);

        console.log('🔍 Запуск анализа:', { userId, projectId });

        // Проверяем, принадлежит ли товар пользователю
        const [projects] = await db.execute(
            'SELECT id FROM Projects WHERE id = ? AND user_id = ?',
            [projectId, userId]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Товар не найден'
            });
        }

        // Создаем запись анализа
        const [result] = await db.execute(
            `INSERT INTO Analyses 
             (project_id, status, analysis_date, period_start, period_end) 
             VALUES (?, 'processing', CURRENT_TIMESTAMP, CURDATE(), CURDATE())`,
            [projectId]
        );

        const analysisId = result.insertId;

        // Имитация анализа через 2 секунды
        setTimeout(async () => {
            try {
                // Генерируем тестовые данные
                const totalReviews = Math.floor(Math.random() * 100) + 20;
                const averageRating = parseFloat((Math.random() * 2 + 3).toFixed(2));
                const positiveCount = Math.floor(Math.random() * 50) + 10;
                const neutralCount = Math.floor(Math.random() * 30) + 5;
                const negativeCount = Math.floor(Math.random() * 20) + 1;
                
                await db.execute(
                    `UPDATE Analyses 
                     SET status = 'completed',
                         total_reviews = ?,
                         average_rating = ?,
                         positive_count = ?,
                         neutral_count = ?,
                         negative_count = ?
                     WHERE id = ?`,
                    [totalReviews, averageRating, positiveCount, neutralCount, negativeCount, analysisId]
                );
                
                console.log(`✅ Анализ ${analysisId} завершен`);
            } catch (error) {
                console.error(`❌ Ошибка завершения анализа ${analysisId}:`, error);
                await db.execute(
                    `UPDATE Analyses SET status = 'failed', error_message = ? WHERE id = ?`,
                    [error.message.substring(0, 255), analysisId]
                );
            }
        }, 2000);

        res.status(201).json({
            success: true,
            message: 'Анализ запущен',
            analysis_id: analysisId
        });

    } catch (error) {
        console.error('❌ Ошибка запуска анализа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при запуске анализа'
        });
    }
});

// Обновление анализа (добавление summary и обновление статуса)
app.put('/api/projects/:projectId/analyses/:analysisId', authenticateToken, async (req, res) => {
    try {
        const userId = safeInt(req.user.id);
        const projectId = safeInt(req.params.projectId);
        const analysisId = safeInt(req.params.analysisId);
        const { summary, status, error_message } = req.body;

        console.log('📝 Обновление анализа:', { userId, projectId, analysisId, hasSummary: !!summary, status });

        // Проверяем, принадлежит ли товар пользователю
        const [projects] = await db.execute(
            'SELECT id FROM Projects WHERE id = ? AND user_id = ?',
            [projectId, userId]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Товар не найден'
            });
        }

        // Проверяем, принадлежит ли анализ проекту
        const [analyses] = await db.execute(
            'SELECT id FROM Analyses WHERE id = ? AND project_id = ?',
            [analysisId, projectId]
        );

        if (analyses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Анализ не найден'
            });
        }

        // Формируем запрос на обновление
        const updates = [];
        const values = [];

        if (summary !== undefined) {
            updates.push('summary = ?');
            values.push(summary);
        }

        if (status !== undefined) {
            updates.push('status = ?');
            values.push(status);
        }

        if (error_message !== undefined) {
            updates.push('error_message = ?');
            values.push(error_message);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Нет данных для обновления'
            });
        }

        values.push(analysisId);

        const updateQuery = `UPDATE Analyses SET ${updates.join(', ')} WHERE id = ?`;
        
        await db.execute(updateQuery, values);

        console.log(`✅ Анализ ${analysisId} обновлен`);

        res.json({
            success: true,
            message: 'Анализ обновлен'
        });

    } catch (error) {
        console.error('❌ Ошибка обновления анализа:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при обновлении анализа',
            error: error.message
        });
    }
});

// Получение анализов товара
app.get('/api/projects/:id/analyses', authenticateToken, async (req, res) => {
    try {
        const userId = safeInt(req.user.id);
        const projectId = safeInt(req.params.id);

        // Проверяем, принадлежит ли товар пользователю
        const [projects] = await db.execute(
            'SELECT id FROM Projects WHERE id = ? AND user_id = ?',
            [projectId, userId]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Товар не найден'
            });
        }

        const [analyses] = await db.execute(
            `SELECT a.*
             FROM Analyses a
             WHERE a.project_id = ?
             ORDER BY a.analysis_date DESC`,
            [projectId]
        );

        res.json({
            success: true,
            analyses
        });

    } catch (error) {
        console.error('❌ Ошибка получения анализов:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении анализов'
        });
    }
});

// ==========================================
// API МАРШРУТЫ - НАСТРОЙКИ
// ==========================================

// Получение настроек
app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const userId = safeInt(req.user.id);

        const [users] = await db.execute(
            'SELECT * FROM Users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Пользователь не найден'
            });
        }

        const user = users[0];

        res.json({
            success: true,
            profile: {
                telegram_id: user.telegram_id,
                telegram_username: user.telegram_username,
                telegram_first_name: user.telegram_first_name,
                telegram_last_name: user.telegram_last_name,
                subscription_tier: user.subscription_tier || 'free',
                registration_date: user.registration_date,
                last_login: user.last_login,
                is_active: user.is_active
            }
        });

    } catch (error) {
        console.error('❌ Ошибка получения настроек:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка сервера при получении настроек'
        });
    }
});

// ==========================================
// СИСТЕМНЫЕ МАРШРУТЫ
// ==========================================

// Проверка здоровья сервера
app.get('/api/health', async (req, res) => {
    try {
        // Проверяем соединение с БД
        await db.execute('SELECT 1');
        
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Создание тестовых данных
app.post('/api/test/setup', async (req, res) => {
    try {
        // Создаем тестового пользователя если нет
        const [existingUser] = await db.execute(
            'SELECT id FROM Users WHERE telegram_id = ?',
            [123456789]
        );
        
        let userId;
        if (existingUser.length === 0) {
            const [result] = await db.execute(
                `INSERT INTO Users 
                 (telegram_id, telegram_username, telegram_first_name, telegram_last_name, subscription_tier) 
                 VALUES (?, ?, ?, ?, 'free')`,
                [123456789, 'test_user', 'Тестовый', 'Пользователь']
            );
            userId = result.insertId;
        } else {
            userId = existingUser[0].id;
        }
        
        // Создаем тестовый проект
        const [projectResult] = await db.execute(
            `INSERT INTO Projects 
             (user_id, marketplace_url, product_name, marketplace_type) 
             VALUES (?, ?, ?, ?)`,
            [userId, 'https://www.wildberries.ru/catalog/1234567/detail.aspx', 'Тестовый товар', 'wildberries']
        );
        
        res.json({
            success: true,
            message: 'Тестовые данные созданы',
            user_id: userId,
            project_id: projectResult.insertId
        });
        
    } catch (error) {
        console.error('Ошибка создания тестовых данных:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка создания тестовых данных',
            error: error.message
        });
    }
});

// ==========================================
// ЗАПУСК СЕРВЕРА И ИНИЦИАЛИЗАЦИЯ
// ==========================================

async function initializeDatabase() {
    try {
        console.log('🔄 Инициализация базы данных...');
        
        // Проверяем существование таблиц
        const [tables] = await db.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'review_analysis'
        `);
        
        const tableNames = tables.map(t => t.TABLE_NAME);
        console.log('Существующие таблицы:', tableNames);
        
        // Создаем таблицы если их нет
        if (!tableNames.includes('Users')) {
            console.log('Создаю таблицу Users...');
            await db.execute(`
                CREATE TABLE IF NOT EXISTS Users (
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
                )
            `);
        }
        
        if (!tableNames.includes('Projects')) {
            console.log('Создаю таблицу Projects...');
            await db.execute(`
                CREATE TABLE IF NOT EXISTS Projects (
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
                    INDEX idx_user_id (user_id),
                    INDEX idx_user_active (user_id, is_active),
                    INDEX idx_marketplace_url (marketplace_url(255)),
                    INDEX idx_created_at (created_at),
                    INDEX idx_current_rating (current_rating),
                    UNIQUE KEY unique_user_product (user_id, marketplace_url(500))
                )
            `);
        }
        
        if (!tableNames.includes('Analyses')) {
            console.log('Создаю таблицу Analyses...');
            await db.execute(`
                CREATE TABLE IF NOT EXISTS Analyses (
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
                    INDEX idx_project_id (project_id),
                    INDEX idx_analysis_date (analysis_date),
                    INDEX idx_period (period_start, period_end),
                    INDEX idx_status (status),
                    INDEX idx_rating_trend (rating_trend)
                )
            `);
        }
        
        console.log('✅ База данных инициализирована');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
    }
}

app.listen(PORT, async () => {
    console.log(`\n🚀 Сервер ReviewAnalysis запущен на http://localhost:${PORT}`);
    console.log(`📁 Фронтенд доступен: ${FRONTEND_PATH}`);
    console.log(`📊 API доступен: http://localhost:${PORT}/api`);
    console.log(`🏥 Проверка здоровья: http://localhost:${PORT}/api/health\n`);
    console.log(`🔐 Доступные методы авторизации:`);
    console.log(`   POST /api/auth/register - регистрация`);
    console.log(`   POST /api/auth/login - вход по Telegram ID`);
    console.log(`   POST /api/auth/telegram - Telegram аутентификация (старая версия)\n`);
    
    try {
        const connection = await db.getConnection();
        console.log('✅ Соединение с базой данных установлено');
        connection.release();
        
        // Инициализируем базу данных
        await initializeDatabase();
        
    } catch (error) {
        console.error('❌ Ошибка подключения к базе данных:', error.message);
        console.log('⚠️  Сервер будет работать в демо-режиме без базы данных');
    }
});

process.on('SIGINT', async () => {
    console.log('\n🛑 Завершение работы сервера...');
    try {
        await db.end();
        console.log('✅ Соединение с базой данных закрыто');
    } catch (error) {
        console.error('❌ Ошибка при закрытии соединения с БД:', error);
    }
    process.exit(0);
});