// routes/market.js

const express = require("express");
const axios = require("axios");
const router = express.Router();

// 25 个币的白名单（symbol -> CoinGecko ID）
const allowedSymbols = {
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
  BNBUSDT: "binancecoin",
  XRPUSDT: "ripple",
  SOLUSDT: "solana",
  ADAUSDT: "cardano",
  DOGEUSDT: "dogecoin",
  LTCUSDT: "litecoin",
  DOTUSDT: "polkadot",
  MATICUSDT: "matic-network",
  AVAXUSDT: "avalanche-2",
  SHIBUSDT: "shiba-inu",
  TRXUSDT: "tron",
  BCHUSDT: "bitcoin-cash",
  LINKUSDT: "chainlink",
  UNIUSDT: "uniswap",
  ATOMUSDT: "cosmos",
  XMRUSDT: "monero",
  ETCUSDT: "ethereum-classic",
  FILUSDT: "filecoin",
  ALGOUSDT: "algorand",
  VETUSDT: "vechain",
  ICPUSDT: "internet-computer",
  MANAUSDT: "decentraland",
  EOSUSDT: "eos"
};

/* -------------------------------------------
   方案 A：给前端 fallback 使用的核心接口
   /api/market  返回 CoinGecko 官方数据（含 logo）
---------------------------------------------*/
router.get("/", async (req, res) => {
  try {
    const ids = Object.values(allowedSymbols).join(",");

    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`;

    const resp = await axios.get(url);

    // 直接返回 CoinGecko 原始数据（包含官方图标 image 字段）
    res.json(resp.data);
  } catch (err) {
    console.error("CoinGecko 接口失败:", err.message);
    res.status(500).json({ error: "CoinGecko 获取失败" });
  }
});

/* -------------------------------------------
   Binance 全量行情（非 fallback）
---------------------------------------------*/
router.get("/binance/tickers", async (req, res) => {
  try {
    const resp = await axios.get("https://api.binance.com/api/v3/ticker/24hr");

    const filtered = resp.data
      .filter((item) => allowedSymbols[item.symbol])
      .map((item) => ({
        symbol: item.symbol,
        name: allowedSymbols[item.symbol],
        price: parseFloat(item.lastPrice),
        change: parseFloat(item.priceChangePercent),
        high: parseFloat(item.highPrice),
        low: parseFloat(item.lowPrice),
        vol: parseFloat(item.volume),
      }));

    res.json(filtered);
  } catch (err) {
    console.error("获取币安行情失败:", err.message);
    res.status(500).json({ error: "获取币安行情失败" });
  }
});

/* -------------------------------------------
   Binance 单币数据
---------------------------------------------*/
router.get("/binance/coin/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!allowedSymbols[symbol]) {
      return res.status(404).json({ error: "不支持该币种" });
    }

    const resp = await axios.get(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
    );

    res.json({
      symbol: resp.data.symbol,
      name: allowedSymbols[symbol],
      price: parseFloat(resp.data.lastPrice),
      change: parseFloat(resp.data.priceChangePercent),
      high: parseFloat(resp.data.highPrice),
      low: parseFloat(resp.data.lowPrice),
      vol: parseFloat(resp.data.volume),
    });
  } catch (err) {
    console.error("获取币种详情失败:", err.message);
    res.status(500).json({ error: "获取币种详情失败" });
  }
});

/* -------------------------------------------
   自定义 coins（如果你有自制 logo 才需要）
---------------------------------------------*/
router.get("/coins", async (req, res) => {
  try {
    const resp = await axios.get("https://api.binance.com/api/v3/ticker/24hr");

    const filtered = resp.data
      .filter((item) => allowedSymbols[item.symbol])
      .map((item) => ({
        symbol: item.symbol,
        id: allowedSymbols[item.symbol],
        price: parseFloat(item.lastPrice),
        change: parseFloat(item.priceChangePercent),
        image: `/images/coins/${item.symbol}.png`,
      }));

    res.json(filtered);
  } catch (err) {
    console.error("获取 /coins 列表失败:", err.message);
    res.status(500).json({ error: "获取币种列表失败" });
  }
});

module.exports = router;
