// controllers/tradeController.js
const db = require('../models/db');
const market = require('../models/market');

// 获取用户资产
exports.getAssets = async (req, res) => {
    const userId = req.userId;
    try {
        const [rows] = await db.execute('SELECT coin, amount, average_price FROM assets WHERE user_id = ?', [userId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '获取资产失败' });
    }
};

// 买入接口（按市场价）
exports.buy = async (req, res) => {
    const userId = req.userId;
    const { coin, amount } = req.body;

    if (!coin || !amount || amount <= 0) {
        return res.status(400).json({ error: '请输入币种和数量' });
    }

    const price = market.getPrice(coin); // 实时价格
    const cost = parseFloat((amount * price).toFixed(2));

    try {
        // 查询用户余额
        const [users] = await db.execute('SELECT virtual_balance FROM users WHERE id = ?', [userId]);
        const balance = users[0].virtual_balance;

        if (balance < cost) {
            return res.status(400).json({ error: '余额不足' });
        }

        // 扣除余额
        await db.execute('UPDATE users SET virtual_balance = virtual_balance - ? WHERE id = ?', [cost, userId]);

        // 更新资产表
        const [assets] = await db.execute('SELECT * FROM assets WHERE user_id = ? AND coin = ?', [userId, coin]);
        if (assets.length === 0) {
            await db.execute(
                'INSERT INTO assets (user_id, coin, amount, average_price) VALUES (?, ?, ?, ?)',
                [userId, coin, amount, price]
            );
        } else {
            const asset = assets[0];
            const newAmount = parseFloat((asset.amount + amount).toFixed(8));
            const newAvgPrice = parseFloat(((asset.amount * asset.average_price + amount * price) / newAmount).toFixed(2));
            await db.execute(
                'UPDATE assets SET amount = ?, average_price = ? WHERE id = ?',
                [newAmount, newAvgPrice, asset.id]
            );
        }

        // 返回更新后的资产
        const [updatedAssets] = await db.execute('SELECT coin, amount, average_price FROM assets WHERE user_id = ?', [userId]);
        const totalAssets = updatedAssets.reduce((sum, a) => sum + a.amount * market.getPrice(a.coin), 0) + (balance - cost);
        res.json({ message: '买入成功', assets: updatedAssets, total_assets: parseFloat(totalAssets.toFixed(2)) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '买入失败' });
    }
};

// 卖出接口（按市场价）
exports.sell = async (req, res) => {
    const userId = req.userId;
    const { coin, amount } = req.body;

    if (!coin || !amount || amount <= 0) {
        return res.status(400).json({ error: '请输入币种和数量' });
    }

    const price = market.getPrice(coin); // 实时价格

    try {
        // 查询用户资产
        const [assets] = await db.execute('SELECT * FROM assets WHERE user_id = ? AND coin = ?', [userId, coin]);
        if (assets.length === 0 || assets[0].amount < amount) {
            return res.status(400).json({ error: '资产不足' });
        }

        const asset = assets[0];
        const newAmount = parseFloat((asset.amount - amount).toFixed(8));

        // 更新资产表
        if (newAmount === 0) {
            await db.execute('DELETE FROM assets WHERE id = ?', [asset.id]);
        } else {
            await db.execute('UPDATE assets SET amount = ? WHERE id = ?', [newAmount, asset.id]);
        }

        // 增加虚拟余额
        const profit = parseFloat((amount * price).toFixed(2));
        await db.execute('UPDATE users SET virtual_balance = virtual_balance + ? WHERE id = ?', [profit, userId]);

        // 返回更新后的资产
        const [updatedAssets] = await db.execute('SELECT coin, amount, average_price FROM assets WHERE user_id = ?', [userId]);
        const [user] = await db.execute('SELECT virtual_balance FROM users WHERE id = ?', [userId]);
        const totalAssets = updatedAssets.reduce((sum, a) => sum + a.amount * market.getPrice(a.coin), 0) + user[0].virtual_balance;

        res.json({ message: '卖出成功', assets: updatedAssets, total_assets: parseFloat(totalAssets.toFixed(2)) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '卖出失败' });
    }
};
