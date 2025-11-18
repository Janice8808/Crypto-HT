const db = require('../models/db');

// ============================
// 后台控制多空方向
let FORCE_LONG = true; // 初始强制多，可后台切换

// ============================
// 开仓
exports.openPosition = async (req, res) => {
    const { price, amount, direction } = req.body;
    const userId = req.user.id;

    if (!price || !amount)
        return res.status(400).json({ error: '请提供价格和数量' });

    let finalDirection = direction;
    if (FORCE_LONG !== null)
        finalDirection = FORCE_LONG ? 'long' : 'short';

    try {
        await db.query(
            `INSERT INTO contracts 
            (user_id, direction, open_price, amount, open_time, is_settled) 
            VALUES ($1, $2, $3, $4, NOW(), 0)`,
            [userId, finalDirection, price, amount]
        );

        res.json({
            message: `开${finalDirection === 'long' ? '多' : '空'}仓成功`,
            direction: finalDirection
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '开仓失败' });
    }
};

// ============================
// 查询用户合约
exports.getStatus = async (req, res) => {
    const userId = req.user.id;
    const { rows } = await db.query(
        'SELECT * FROM contracts WHERE user_id = $1',
        [userId]
    );
    res.json(rows);
};

// ============================
// 后台切换方向
exports.toggleForce = (req, res) => {
    const { mode } = req.body;

    if (mode === 'long') FORCE_LONG = true;
    else if (mode === 'short') FORCE_LONG = false;
    else FORCE_LONG = null;

    res.json({ message: '后台方向已切换', force_long: FORCE_LONG });
};

// ============================
// 自动结算
exports.settleContracts = async () => {
    const now = new Date();
    const { rows: contracts } = await db.query(
        'SELECT * FROM contracts WHERE is_settled = 0'
    );

    for (const c of contracts) {
        const openTime = new Date(c.open_time);
        const elapsedSec = (now - openTime) / 1000;

        let profitRate = 0;
        if (elapsedSec >= 20 * 60) profitRate = 0.15;
        else if (elapsedSec >= 10 * 60) profitRate = 0.10;
        else if (elapsedSec >= 5 * 60) profitRate = 0.08;
        else if (elapsedSec >= 60) profitRate = 0.05;

        if (profitRate > 0) {
            let profit = c.amount * c.open_price * profitRate;
            if (c.direction === 'short') profit = -profit;

            await db.query(
                'UPDATE contracts SET is_settled = 1, profit = $1 WHERE id = $2',
                [profit, c.id]
            );

            await db.query(
                'UPDATE users SET virtual_balance = virtual_balance + $1 WHERE id = $2',
                [profit, c.user_id]
            );
        }
    }
};
