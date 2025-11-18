// routes/market.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// 白名单币种
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

// 获取指定币种行情列表
router.get('/binance/tickers', async (req, res) => {
  try {
    const resp = await axios.get('https://api.binance.com/api/v3/ticker/24hr');

    const filtered = resp.data
      .filter(item => allowedSymbols[item.symbol])
      .map(item => ({
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
    console.error('获取币安行情失败:', err.message || err);
    res.status(500).json({ error: '获取币安行情失败' });
  }
});

// 获取单个币种详情
router.get('/binance/coin/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!allowedSymbols[symbol]) {
      return res.status(404).json({ error: '不支持该币种' });
    }

    const resp = await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
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
    console.error('获取币种详情失败:', err.message || err);
    res.status(500).json({ error: '获取币种详情失败' });
  }
});
// ====================== 新增接口：返回前端需要的 coins 列表 ======================
router.get('/coins', async (req, res) => {
  try {
    const resp = await axios.get('https://api.binance.com/api/v3/ticker/24hr');

    const filtered = resp.data
      .filter(item => allowedSymbols[item.symbol])
      .map(item => ({
        symbol: item.symbol,
        id: allowedSymbols[item.symbol],            // 提供 id 给前端 useCoins 组合
        price: parseFloat(item.lastPrice),
        change: parseFloat(item.priceChangePercent),
        image: `/images/coins/${item.symbol}.png`   // 若你有 logo 文件
      }));

    res.json(filtered);
  } catch (err) {
    console.error("获取 /coins 列表失败：", err.message);
    res.status(500).json({ error: "获取币种列表失败" });
  }
});

module.exports = router;
 