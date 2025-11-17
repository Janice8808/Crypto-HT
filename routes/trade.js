// routes/trade.js
const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');

// 买入
router.post('/buy', tradeController.buy);

// 卖出
router.post('/sell', tradeController.sell);

module.exports = router;
