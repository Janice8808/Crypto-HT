// controllers/assetController.js
const db = require('../models/db');
const jwt = require('jsonwebtoken');

// JWT 验证中间件可选，如果前端传 token 就验证用户身份
exports.getAssets = async (req, res) => {
    try {
        // 从请求头 Authorization 获取 token: Bearer <token>
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ error: '缺少 token' });

        const token = authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ error: '无效 token' });

        // 验证 token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // 查询用户资产
        const [rows] = await db.execute(
            'SELECT coin, amount, average_price FROM assets WHERE user_id = ?',
            [userId]
        );

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '获取资产失败' });
    }
};
