// app.js（最终合并 + Render 兼容 WebSocket）
// -----------------------------------------------

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { WebSocketServer } = require("ws");
const notifier = require("./notifier");
require("dotenv").config();
const { pool, initTables } = require("./models/db");

const jwt = require("jsonwebtoken");
const { verifyMessage } = require("ethers");


// ====================== IP 定位 ======================
async function getIpLocation(ip) {
  if (!ip || ip === "127.0.0.1" || ip === "::1") {
    return { country: "本地", city: "开发环境" };
  }
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

  try {
    const resp = await fetch(`https://ipwho.is/${ip}`);
    const data = await resp.json();
    if (data?.success) {
      return { country: data.country || "", city: data.city || "" };
    }
  } catch {}

  return { country: "", city: "" };
}


// ====================== Express 初始化 ======================
const tradeRoutes = require("./routes/tradeRoutes");
const assetRoutes = require("./routes/asset");
const marketRoutes = require("./routes/market");
const contractRoutes = require("./routes/contract");
const contractController = require("./controllers/contractController");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// ====================== 简易用户数据库 ======================
const DB_FILE = path.join(__dirname, "data", "users.json");

function loadUsers() {
  if (!fs.existsSync(DB_FILE)) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, "{}");
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveUsers(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}


// ====================== 常量 ======================
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
let currentLanguage = "English";


// ====================== 挂载路由 ======================
app.use("/api/trade", tradeRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/contract", contractRoutes);


// ====================== UI 基础接口 ======================
app.post("/api/withdrawal-password", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });
  res.json({ message: "Withdrawal password updated successfully!" });
});

app.get("/api/userinfo", authMiddleware, (req, res) => {
  const users = loadUsers();
  const wallet = req.user.walletAddress.toLowerCase();
  const u = users[wallet];
  if (!u) return res.status(404).json({ error: "User not found" });

  res.json({
    address: u.wallet,
    uid: u.userId,
    avatar: "/images/avatar.png",
    language: currentLanguage,
    addressLabel: u.addressLabel || "",
  });
});

app.post("/api/language", (req, res) => {
  currentLanguage = req.body.language;
  res.json({ message: "Language updated" });
});

app.post("/api/bankcard", (req, res) => {
  const { name, cardNumber, bankName } = req.body;
  if (!name || !cardNumber || !bankName)
    return res.status(400).json({ error: "All fields required" });

  res.json({ message: "Saved!" });
});

app.post("/api/mail", (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@"))
    return res.status(400).json({ error: "Invalid email" });
  res.json({ message: "Mail saved!" });
});


// ====================== Web3 登录 ======================
const nonceStore = {};

app.post("/api/auth/nonce", (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "Address required" });
  const normalized = address.toLowerCase();
  const nonce = Math.random().toString(36).substring(2);
  nonceStore[normalized] = nonce;
  res.json({ nonce });
});

app.post("/api/auth/verify", async (req, res) => {
  const { address, signature } = req.body;
  if (!address || !signature)
    return res.status(400).json({ error: "Missing fields" });

  const normalized = address.toLowerCase();
  const nonce = nonceStore[normalized];
  if (!nonce) return res.status(400).json({ error: "Nonce missing" });

  const msg = `Login to Pankou - Nonce: ${nonce}`;
  let recovered;
  try {
    recovered = verifyMessage(msg, signature);
  } catch {
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (recovered.toLowerCase() !== normalized)
    return res.status(401).json({ error: "Signature mismatch" });

  let users = loadUsers();
  let ip =
    (req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "")?.split(",")[0];

  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

  const now = Date.now();
  const loc = await getIpLocation(ip);

  if (!users[normalized]) {
    users[normalized] = {
      userId: now,
      wallet: normalized,
      createdAt: now,
      lastLogin: now,
      registerIp: ip,
      lastLoginIp: ip,
      loginCount: 1,
      addressLabel: `${loc.country} ${loc.city}`,
      balances: { USDT: 0, BTC: 0, ETH: 0 },
      remark: "",
      controlMode: "normal",
      logs: [],
      verifyStatus: "success",
    };
  } else {
    const u = users[normalized];
    u.lastLogin = now;
    u.lastLoginIp = ip;
    u.loginCount++;
  }

  saveUsers(users);
  delete nonceStore[normalized];

  const token = jwt.sign(
    { userId: users[normalized].userId, walletAddress: normalized },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  res.json({ token, userId: users[normalized].userId });
});


// ====================== JWT 中间件 ======================
function authMiddleware(req, res, next) {
  const raw = req.headers.authorization || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function adminMiddleware(req, res, next) {
  const raw = req.headers.authorization || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing admin token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ error: "Not admin" });
    next();
  } catch {
    res.status(401).json({ error: "Invalid admin token" });
  }
}


// ====================== Admin 登录 ======================
function adminLoginHandler(req, res) {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: "Invalid admin password" });

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "1d" });
  res.json({ adminToken: token });
}

app.post("/api/admin/login", adminLoginHandler);


// ====================== 创建订单 + 提醒 ======================
app.post("/api/order/create", authMiddleware, (req, res) => {
  const { amount, symbol, period, type, price } = req.body;

  const users = loadUsers();
  const wallet = req.user.walletAddress;
  const sym = (symbol || "USDT").toUpperCase();

  if (!users[wallet]) return res.status(404).json({ error: "User not found" });
  if (!users[wallet].balances[sym]) users[wallet].balances[sym] = 0;

  const n = Number(amount);
  if (users[wallet].balances[sym] < n)
    return res.status(400).json({ error: "Insufficient balance" });

  users[wallet].balances[sym] -= n;

  const order = {
    id: Date.now(),
    wallet,
    symbol: sym,
    amount: n,
    period,
    type,
    openPrice: price,
    createdAt: Date.now(),
  };

  saveUsers(users);

  notifier.notifyNewOrder({
    ...order,
    remark: users[wallet].remark || "",
  });

  res.json({ success: true, order });
});


// ====================== 余额查询 ======================
app.get("/api/user/balance", authMiddleware, (req, res) => {
  const users = loadUsers();
  const u = users[req.user.walletAddress];
  res.json({
    balances: u.balances,
    userId: u.userId,
    remark: u.remark,
    controlMode: u.controlMode,
  });
});


// ====================== 用户提币 ======================
app.post("/api/user/withdraw", authMiddleware, (req, res) => {
  const { symbol, amount, address, network } = req.body;

  const users = loadUsers();
  const wallet = req.user.walletAddress;
  const sym = symbol.toUpperCase();
  const n = Number(amount);

  if (!users[wallet]) return res.status(404).json({ error: "User not found" });
  if (users[wallet].balances[sym] < n)
    return res.status(400).json({ error: "Insufficient balance" });

  users[wallet].balances[sym] -= n;

  const record = {
    id: Date.now(),
    type: "withdraw",
    symbol: sym,
    amount: n,
    address,
    network,
    wallet,
    createdAt: Date.now(),
  };
  users[wallet].logs.push(record);

  saveUsers(users);

  notifier.notifyNewWithdraw({
    ...record,
    remark: users[wallet].remark || "",
    addressLabel: users[wallet].addressLabel || "",
  });

  res.json({ success: true });
});


// ====================== WebSocket（Render 兼容版） ======================
const PORT = process.env.PORT || 5000;

// 创建 WS
const wss = new WebSocketServer({ noServer: true });
notifier.setWss(wss);

// 启动 Express
const server = app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

// 处理 Upgrade（关键！没有这个 Render 上 WS 就不能用）
server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

// 前端 WebSocket 客户端连接
wss.on("connection", (ws) => {
  console.log("🌐 Client WebSocket connected");
  ws.on("close", () => console.log("❌ Client disconnected"));
});

// ====================== Binance 转发 ======================
let binanceWs;

function connectBinance() {
  console.log("Connecting to Binance feed...");
  binanceWs = new WebSocket(
    "wss://mute-cherry-de72.xiaosheng90808.workers.dev/"
  );

  binanceWs.on("open", () => console.log("Binance connected"));

  binanceWs.on("message", (msg) => {
    wss.clients.forEach((c) => {
      if (c.readyState === 1) c.send(msg.toString());
    });
  });

  binanceWs.on("close", () => {
    console.log("Binance closed, retrying...");
    setTimeout(connectBinance, 5000);
  });

  binanceWs.on("error", (e) => console.error("Binance Error:", e));
}

connectBinance();


// ====================== 自动结算 ======================
(async () => {
  await initTables();
})();
setInterval(() => {
  contractController.settleContracts().catch(console.error);
}, 10000);

