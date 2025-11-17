const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');
const authenticateToken = require('../middlewares/authMiddleware'); // JWT验证中间件

// 所有接口都使用 JWT 中间件
router.post('/buy', authenticateToken, tradeController.buy);
router.post('/sell', authenticateToken, tradeController.sell);
router.get('/assets', authenticateToken, tradeController.getAssets);

module.exports = router;
