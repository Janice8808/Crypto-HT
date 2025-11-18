// models/db.js
const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;

console.log("🔍 Loaded DATABASE_URL:", DATABASE_URL ? "OK" : "❌ MISSING");

let pool = null;

if (DATABASE_URL) {
  const isProduction = process.env.NODE_ENV === "production";

  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isProduction
      ? { rejectUnauthorized: false }
      : false
  });
} else {
  console.error("❌ No DATABASE_URL found! PostgreSQL will not connect.");
}


// ⭐ 自动建表函数
async function initTables() {
  if (!pool) {
    console.log("⚠️ Skip table creation: PostgreSQL not initialized.");
    return;
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255),
        email VARCHAR(255),
        password_hash VARCHAR(255),
        virtual_balance NUMERIC(18,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        coin VARCHAR(50),
        amount NUMERIC(38,8) DEFAULT 0,
        average_price NUMERIC(18,2) DEFAULT 0
      );
    `);

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


// ⭐ 导出 query，解决 db.query is not a function
async function query(sql, params) {
  if (!pool) throw new Error("PostgreSQL not initialized");
  return pool.query(sql, params);
}

module.exports = { pool, query, initTables };
