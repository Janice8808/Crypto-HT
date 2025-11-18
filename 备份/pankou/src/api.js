// api.js
import axios from "axios";

const API_BASE = "http://localhost:5000"; // 后端地址

// 本地模拟币种
export const getLocalCoins = async () => {
  const res = await axios.get(`${API_BASE}/api/market/coins`);
  return res.data;
};

// 火币前 10 个币种
export const getHuobiCoins = async () => {
  const res = await axios.get(`${API_BASE}/api/market/huobi/tickers`);
  return res.data;
};

// 火币单币种详情
export const getHuobiCoinDetail = async (symbol) => {
  const res = await axios.get(`${API_BASE}/api/market/huobi/coin/${symbol}`);
  return res.data;
};
