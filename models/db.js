// models/db.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ⭐ 自动建表函数（服务器启动时自动执行）
async function initTables() {
  try {
    // users 表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        virtual_balance NUMERIC(18,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // assets 表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        coin VARCHAR(50),
        amount NUMERIC(38,8) DEFAULT 0,
        average_price NUMERIC(18,2) DEFAULT 0
      );
    `);

    // contracts 表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        direction VARCHAR(10),
        open_price NUMERIC(18,2),
        amount NUMERIC(38,8),
        open_time TIMESTAMP DEFAULT NOW(),
        is_settled BOOLEAN DEFAULT FALSE,
        profit NUMERIC(18,2)
      );
    `);

    console.log("✅ PostgreSQL tables initialized");
  } catch (err) {
    console.error("❌ Table init error:", err);
  }
}

module.exports = { pool, initTables };
