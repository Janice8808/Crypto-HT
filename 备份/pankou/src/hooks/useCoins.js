import { useState, useEffect } from "react";

export const useCoins = () => {
  const [allCoins, setAllCoins] = useState([]);
  const [hotCoins, setHotCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const realTimeList = [
    "BTCUSDT","ETHUSDT","BNBUSDT","XRPUSDT","SOLUSDT",
    "ADAUSDT","DOGEUSDT","LTCUSDT","DOTUSDT","MATICUSDT",
    "AVAXUSDT","SHIBUSDT","TRXUSDT","BCHUSDT","LINKUSDT",
    "UNIUSDT","ATOMUSDT","XMRUSDT","ETCUSDT","FILUSDT",
    "ALGOUSDT","VETUSDT","ICPUSDT","MANAUSDT","EOSUSDT"
  ];

  const hotList = ["BTCUSDT","ETHUSDT","BCHUSDT"];

  const coinIdsMap = {
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

  const fetchCoinsWithLogo = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1️⃣ 先取缓存的 Logo
      let logoMap = {};
      const logoCache = localStorage.getItem("coinLogoMap");
      if (logoCache) {
        logoMap = JSON.parse(logoCache);
      } else {
        const res = await fetch("http://localhost:5000/api/coins");
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch(err) {
          console.error("解析币种 JSON 出错:", err);
          setError("币种数据解析失败");
          setAllCoins([]);
          setHotCoins([]);
          setLoading(false);
          return;
        }
        Object.keys(coinIdsMap).forEach(sym => {
          const coin = data.find(d => d.id === coinIdsMap[sym]);
          if (coin) logoMap[sym] = coin.image;
        });
        localStorage.setItem("coinLogoMap", JSON.stringify(logoMap));
      }

      // 2️⃣ 取 Binance 24h 数据（支持缓存 30s）
      let binanceData;
      const binanceCache = localStorage.getItem("binance24h");
      const binanceTime = localStorage.getItem("binance24hTime");
      if (binanceCache && binanceTime && Date.now() - parseInt(binanceTime) < 30000) {
        binanceData = JSON.parse(binanceCache);
      } else {
        const binanceRes = await fetch("https://api.binance.com/api/v3/ticker/24hr");
        binanceData = await binanceRes.json();
        localStorage.setItem("binance24h", JSON.stringify(binanceData));
        localStorage.setItem("binance24hTime", Date.now().toString());
      }

      // 3️⃣ 组合数据
      const filteredAll = binanceData
        .filter(c => realTimeList.includes(c.symbol))
        .map(c => ({
          symbol: c.symbol,
          price: parseFloat(c.lastPrice).toFixed(4),
          change: parseFloat(c.priceChangePercent).toFixed(2),
          logo: logoMap[c.symbol] || "/images/default-coin.png"
        }));

      const filteredHot = filteredAll.filter(c => hotList.includes(c.symbol));

      setAllCoins(filteredAll);
      setHotCoins(filteredHot);
      setLoading(false);

    } catch (err) {
      console.error("获取币种数据失败:", err);
      setAllCoins([]);
      setHotCoins([]);
      setError("获取币种数据失败");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoinsWithLogo();
    // 可选：每 30 秒自动刷新
    const interval = setInterval(fetchCoinsWithLogo, 30000);
    return () => clearInterval(interval);
  }, []);

  return { allCoins, hotCoins, loading, error };
};
