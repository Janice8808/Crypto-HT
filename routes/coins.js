const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('', async (req, res) => {
  try {
    // 你想显示的币种
    const coinIds = [
      "bitcoin","ethereum","binancecoin","ripple","solana","cardano","dogecoin",
      "litecoin","polkadot","matic-network","avalanche-2","shiba-inu","tron",
      "bitcoin-cash","chainlink","uniswap","cosmos","monero","ethereum-classic",
      "filecoin","algorand","vechain","internet-computer","decentraland","eos"
    ].join(',');

    // 请求 CoinGecko
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}`
    );

    // 返回数据给前端
    res.json(response.data);
  } catch (err) {
    console.error("获取币种数据失败", err.message, err);
    res.status(500).json({ error: "Failed to fetch coins" });
  }
});

module.exports = router;
