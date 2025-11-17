// controllers/contractController.js
const db = require('../models/db');

// ============================
// 后台控制多空方向
// null = 用户自由选择, true = 强制多, false = 强制空
let FORCE_LONG = true; // 初始为只多，可通过接口切换

// ============================
// 统一开仓接口
exports.openPosition = async (req, res) => {
    const { price, amount, direction } = req.body;
    const userId = req.user.id;

    if (!price || !amount) {
        return res.status(400).json({ error: '请提供价格和数量' });
    }

    // 后台控制方向生效时覆盖用户选择
    let finalDirection = direction;
    if (FORCE_LONG !== null) finalDirection = FORCE_LONG ? 'long' : 'short';

    try {
        await db.execute(
            `INSERT INTO contracts 
             (user_id, direction, open_price, amount, open_time, is_settled) 
             VALUES (?, ?, ?, ?, NOW(), 0)`,
            [userId, finalDirection, price, amount]
        );
        res.json({ message: `开${finalDirection === 'long' ? '多' : '空'}仓成功`, direction: finalDirection });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '开仓失败' });
    }
};

// ============================
// 查询当前合约状态
exports.getStatus = async (req, res) => {
    const userId = req.user.id;
    const [rows] = await db.execute('SELECT * FROM contracts WHERE user_id = ?', [userId]);
    res.json(rows);
};

// ============================
// 后台切换强制多空
exports.toggleForce = (req, res) => {
    const { mode } = req.body; // mode: 'long', 'short', 'free'
    if (mode === 'long') FORCE_LONG = true;
    else if (mode === 'short') FORCE_LONG = false;
    else FORCE_LONG = null;

    res.json({ message: '后台方向已切换', force_long: FORCE_LONG });
};

// ============================
// 自动结算函数（可外部调用或定时调用）
exports.settleContracts = async () => {
    const now = new Date();
    const [contracts] = await db.execute('SELECT * FROM contracts WHERE is_settled = 0');

    for (const c of contracts) {
        const openTime = new Date(c.open_time);
        const elapsedSec = (now - openTime) / 1000;

        let profitRate = 0;

        // 按时间结算利润
        if (elapsedSec >= 20 * 60) profitRate = 0.15;
        else if (elapsedSec >= 10 * 60) profitRate = 0.10;
        else if (elapsedSec >= 5 * 60) profitRate = 0.08;
        else if (elapsedSec >= 60) profitRate = 0.05;

        if (profitRate > 0) {
            let profit = c.amount * c.open_price * profitRate;
            if (c.direction === 'short') profit = -profit; // 空仓利润取反

            // 更新合约状态
            await db.execute(
                'UPDATE contracts SET is_settled = 1, profit = ? WHERE id = ?',
                [profit, c.id]
            );

            // 更新用户虚拟余额
            await db.execute(
                'UPDATE users SET virtual_balance = virtual_balance + ? WHERE id = ?',
                [profit, c.user_id]
            );
        }
    }
};
