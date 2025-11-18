// controllers/contractController.js
const { pool } = require("../models/db");

// ============================
// 后台控制多空方向（null = 不强制）
// ============================
let FORCE_LONG = true; // 初始强制多，可后台切换

// ============================
// 开仓（现在主要保证不报错，你前端暂时不用也没关系）
// ============================
exports.openPosition = async (req, res) => {
  const { price, amount, direction } = req.body;

  // Web3 登录的 token 里是 { userId, walletAddress }
  const userId = req.user?.userId ?? null;

  if (!price || !amount) {
    return res.status(400).json({ error: "请提供价格和数量" });
  }

  let finalDirection = direction;
  if (FORCE_LONG !== null) {
    finalDirection = FORCE_LONG ? "long" : "short";
  }

  try {
    await pool.query(
      `
      INSERT INTO contracts
      (user_id, direction, open_price, amount, open_time, is_settled)
      VALUES ($1, $2, $3, $4, NOW(), false)
    `,
      [userId, finalDirection, price, amount]
    );

    res.json({
      message: `开${finalDirection === "long" ? "多" : "空"}仓成功`,
      direction: finalDirection,
    });
  } catch (err) {
    console.error("openPosition error:", err);
    res.status(500).json({ error: "开仓失败" });
  }
};

// ============================
// 查询用户合约（如果以后要用）
// ============================
exports.getStatus = async (req, res) => {
  const userId = req.user?.userId ?? null;

  try {
    let result;
    if (userId == null) {
      // 没有 userId 就返回最近 100 条
      result = await pool.query(
        "SELECT * FROM contracts ORDER BY id DESC LIMIT 100"
      );
    } else {
      result = await pool.query(
        "SELECT * FROM contracts WHERE user_id = $1 ORDER BY id DESC",
        [userId]
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error("getStatus error:", err);
    res.status(500).json({ error: "获取合约信息失败" });
  }
};

// ============================
// 后台切换方向
// ============================
exports.toggleForce = (req, res) => {
  const { mode } = req.body;

  if (mode === "long") FORCE_LONG = true;
  else if (mode === "short") FORCE_LONG = false;
  else FORCE_LONG = null;

  res.json({ message: "后台方向已切换", force_long: FORCE_LONG });
};

// ============================
// 自动结算（被 app.js 的 setInterval 调用）
// ============================
exports.settleContracts = async () => {
  const now = new Date();

  try {
    const { rows: contracts } = await pool.query(
      "SELECT * FROM contracts WHERE is_settled = false"
    );

    for (const c of contracts) {
      const openTime = new Date(c.open_time);
      const elapsedSec = (now - openTime) / 1000;

      let profitRate = 0;
      if (elapsedSec >= 20 * 60) profitRate = 0.15;
      else if (elapsedSec >= 10 * 60) profitRate = 0.1;
      else if (elapsedSec >= 5 * 60) profitRate = 0.08;
      else if (elapsedSec >= 60) profitRate = 0.05;

      if (profitRate <= 0) continue;

      let profit = Number(c.amount) * Number(c.open_price) * profitRate;
      if (c.direction === "short") profit = -profit;

      // 1. 更新合约记录
      await pool.query(
        "UPDATE contracts SET is_settled = true, profit = $1 WHERE id = $2",
        [profit, c.id]
      );

      // 2. 把收益加回用户虚拟余额（users.virtual_balance）
      if (c.user_id) {
        await pool.query(
          "UPDATE users SET virtual_balance = virtual_balance + $1 WHERE id = $2",
          [profit, c.user_id]
        );
      }
    }
  } catch (err) {
    console.error("settleContracts error:", err);
  }
};
