// routes/asset.js
const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');

// GET /api/assets - 获取当前用户资产
router.get('/', assetController.getAssets);

module.exports = router;
