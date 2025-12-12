import express from "express";
import pkg from "pg";

const { Pool } = pkg;
const app = express();
const PORT = 8081;

// Подключение к PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || "db",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "user",
  password: process.env.DB_PASS || "pass",
  database: process.env.DB_NAME || "app_db",
});

// Простой маршрут
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.send(`✅ Сервер работает! Время в БД: ${result.rows[0].now}`);
  } catch (err) {
    console.error("❌ Ошибка подключения к БД:", err);
    res.status(500).send("Ошибка подключения к базе данных");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
