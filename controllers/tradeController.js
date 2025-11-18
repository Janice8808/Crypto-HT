// controllers/tradeController.js
const { pool } = require("../models/db");
const market = require("../models/market");

// 从 JWT 中间件拿用户 ID：
// 建议你的 verifyToken 中写的是：req.userId = decoded.id
// 这里就直接用 req.userId
function getUserId(req) {
  // 兼容不同中间件写法
  return req.userId || req.user?.id || req.user?.userId;
}

// =================== 获取用户资产 ===================
exports.getAssets = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "未登录" });
  }

  try {
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

// =================== 买入（按市场价） ===================
exports.buy = async (req, res) => {
  const userId = getUserId(req);
  const { coin, amount } = req.body;

  if (!userId) return res.status(401).json({ error: "未登录" });
  if (!coin || !amount || amount <= 0) {
    return res.status(400).json({ error: "请输入币种和数量" });
  }

  const buyAmount = Number(amount);
  const price = market.getPrice(coin); // 实时价格
  const cost = parseFloat((buyAmount * price).toFixed(2));

  try {
    // 1. 查询用户余额
    const userResult = await pool.query(
      "SELECT virtual_balance FROM users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "用户不存在" });
    }
    const balance = Number(userResult.rows[0].virtual_balance || 0);

    if (balance < cost) {
      return res.status(400).json({ error: "余额不足" });
    }

    // 用事务比较安全
    await pool.query("BEGIN");

    // 2. 扣除余额
    await pool.query(
      "UPDATE users SET virtual_balance = virtual_balance - $1 WHERE id = $2",
      [cost, userId]
    );

    // 3. 查询/更新资产表
    const assetResult = await pool.query(
      "SELECT id, amount, average_price FROM assets WHERE user_id = $1 AND coin = $2",
      [userId, coin]
    );

    if (assetResult.rows.length === 0) {
      // 新币种
      await pool.query(
        "INSERT INTO assets (user_id, coin, amount, average_price) VALUES ($1, $2, $3, $4)",
        [userId, coin, buyAmount, price]
      );
    } else {
      const asset = assetResult.rows[0];
      const oldAmount = Number(asset.amount);
      const oldAvg = Number(asset.average_price);
      const newAmount = parseFloat((oldAmount + buyAmount).toFixed(8));
      const newAvgPrice = parseFloat(
        ((oldAmount * oldAvg + buyAmount * price) / newAmount).toFixed(2)
      );

      await pool.query(
        "UPDATE assets SET amount = $1, average_price = $2 WHERE id = $3",
        [newAmount, newAvgPrice, asset.id]
      );
    }

    // 4. 重新计算资产总价值
    const { rows: updatedAssets } = await pool.query(
      "SELECT coin, amount, average_price FROM assets WHERE user_id = $1",
      [userId]
    );
    const userAfter = await pool.query(
      "SELECT virtual_balance FROM users WHERE id = $1",
      [userId]
    );
    const newBalance = Number(userAfter.rows[0].virtual_balance || 0);

    const totalAssets =
      updatedAssets.reduce(
        (sum, a) => sum + Number(a.amount) * market.getPrice(a.coin),
        0
      ) + newBalance;

    await pool.query("COMMIT");

    res.json({
      message: "买入成功",
      assets: updatedAssets,
      total_assets: parseFloat(totalAssets.toFixed(2)),
    });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("buy error:", err);
    res.status(500).json({ error: "买入失败" });
  }
};

// =================== 卖出（按市场价） ===================
exports.sell = async (req, res) => {
  const userId = getUserId(req);
  const { coin, amount } = req.body;

  if (!userId) return res.status(401).json({ error: "未登录" });
  if (!coin || !amount || amount <= 0) {
    return res.status(400).json({ error: "请输入币种和数量" });
  }

  const sellAmount = Number(amount);
  const price = market.getPrice(coin);

  try {
    await pool.query("BEGIN");

    // 1. 查询用户资产
    const assetResult = await pool.query(
      "SELECT id, amount FROM assets WHERE user_id = $1 AND coin = $2",
      [userId, coin]
    );

    if (
      assetResult.rows.length === 0 ||
      Number(assetResult.rows[0].amount) < sellAmount
    ) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "资产不足" });
    }

    const asset = assetResult.rows[0];
    const newAmount = parseFloat(
      (Number(asset.amount) - sellAmount).toFixed(8)
    );

    // 2. 更新资产表
    if (newAmount === 0) {
      await pool.query("DELETE FROM assets WHERE id = $1", [asset.id]);
    } else {
      await pool.query("UPDATE assets SET amount = $1 WHERE id = $2", [
        newAmount,
        asset.id,
      ]);
    }

    // 3. 增加虚拟余额
    const profit = parseFloat((sellAmount * price).toFixed(2));
    await pool.query(
      "UPDATE users SET virtual_balance = virtual_balance + $1 WHERE id = $2",
      [profit, userId]
    );

    // 4. 返回更新资产和总资产
    const { rows: updatedAssets } = await pool.query(
      "SELECT coin, amount, average_price FROM assets WHERE user_id = $1",
      [userId]
    );
    const userResult = await pool.query(
      "SELECT virtual_balance FROM users WHERE id = $1",
      [userId]
    );
    const balance = Number(userResult.rows[0].virtual_balance || 0);

    const totalAssets =
      updatedAssets.reduce(
        (sum, a) => sum + Number(a.amount) * market.getPrice(a.coin),
        0
      ) + balance;

    await pool.query("COMMIT");

    res.json({
      message: "卖出成功",
      assets: updatedAssets,
      total_assets: parseFloat(totalAssets.toFixed(2)),
    });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("sell error:", err);
    res.status(500).json({ error: "卖出失败" });
  }
};
