// controllers/assetController.js
const { pool } = require("../models/db");

// 返回用户资产
exports.getAssets = async (req, res) => {
  try {
    // verifyToken 已经把 userId 放进 req.userId
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "未登录" });
    }

    // 查询用户的所有币种资产
    const { rows } = await pool.query(
      "SELECT coin, amount, average_price FROM assets WHERE user_id = $1",
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("getAssets error:", err);
    res.status(500).json({ error: "获取资产失败" });
  }
};
