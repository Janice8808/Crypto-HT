// controllers/authController.js
const { pool } = require("../models/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

// =================== 注册 ===================
exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ error: "请填写用户名、邮箱和密码" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // PostgreSQL: 用 RETURNING 拿 id
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [username, email, hashedPassword]
    );

    const userId = result.rows[0].id;

    const token = jwt.sign({ id: userId }, JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ message: "注册成功", token });
  } catch (err) {
    console.error("register error:", err);

    // PG 唯一约束错误 code 通常为 '23505'
    if (err.code === "23505") {
      res.status(400).json({ error: "用户名或邮箱已存在" });
    } else {
      res.status(500).json({ error: "注册失败" });
    }
  }
};

// =================== 登录 ===================
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "请填写邮箱和密码" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "用户不存在" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: "密码错误" });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ message: "登录成功", token });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "登录失败" });
  }
};
