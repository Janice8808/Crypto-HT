const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const verifyToken = require('../middlewares/verifyToken');

// ============================
// 统一开仓接口：前端提供 direction ('long' 或 'short')
router.post('/open', verifyToken, contractController.openPosition);

// 查询当前用户合约状态
router.get('/status', verifyToken, contractController.getStatus);

// 手动触发结算（可选）
router.get('/settle', contractController.settleContracts);

// 后台切换强制多空模式
// body: { mode: 'long' | 'short' | 'free' }
router.post('/toggleForce', contractController.toggleForce);

module.exports = router;
