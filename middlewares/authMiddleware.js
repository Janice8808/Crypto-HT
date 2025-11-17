// JWT 中间件
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer token

    if (!token) return res.status(401).json({ error: '未提供 Token' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token 无效' });
        req.user = user; // user.id
        next();
    });
}

module.exports = authenticateToken;
