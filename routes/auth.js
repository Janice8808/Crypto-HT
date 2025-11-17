const express = require('express');
const router = express.Router();

const { register, login } = require('../controllers/authController');

// 原有接口
router.post('/register', register);
router.post('/login', login);


// ================================
//   Web3 钱包登录（新增）
// ================================
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");

// 临时存储（正式项目请放数据库）
const nonceStore = {};  // address -> nonce
const userStore = {};   // address -> userId

// 生成随机 nonce
function generateNonce() {
  return Math.random().toString(36).substring(2);
}

const JWT_SECRET = "your-secret-key";


// 1️⃣ 请求 nonce
router.post("/nonce", (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "Address required" });

  const normalized = address.toLowerCase();
  const nonce = generateNonce();

  nonceStore[normalized] = nonce;

  res.json({ nonce });
});


// 2️⃣ 验证签名
router.post("/verify", (req, res) => {
  const { address, signature } = req.body;

  if (!address || !signature) {
    return res.status(400).json({ error: "Address and signature required" });
  }

  const normalized = address.toLowerCase();
  const nonce = nonceStore[normalized];

  if (!nonce) {
    return res.status(400).json({ error: "Nonce not found" });
  }

  const message = `Login to Pankou\nNonce: ${nonce}`;

  let recovered;
  try {
    recovered = ethers.verifyMessage(message, signature);
  } catch (e) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (recovered.toLowerCase() !== normalized) {
    return res.status(401).json({ error: "Signature mismatch" });
  }

  // 创建或查找用户（这里模拟 userId）
  if (!userStore[normalized]) {
    userStore[normalized] = Date.now();  // 模拟用户 ID
  }

  const userId = userStore[normalized];

  // 发 token
  const token = jwt.sign(
    { userId, walletAddress: normalized },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  delete nonceStore[normalized];

  res.json({ token, userId });
});


module.exports = router;
