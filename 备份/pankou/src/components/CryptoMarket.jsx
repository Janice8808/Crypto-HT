import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3',
  timeout: 10000,
});

// 缓存对象
const cache = {};

// 封装请求函数（自动重试 + 缓存）
async function fetchWithCache(url, cacheTime = 30, maxRetries = 5) {
  const now = Date.now();

  // 如果缓存存在且未过期，直接返回缓存数据
  if (cache[url] && now - cache[url].timestamp < cacheTime * 1000) {
    return cache[url].data;
  }

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await api.get(url);
      const data = response.data;

      // 更新缓存
      cache[url] = {
        data,
        timestamp: Date.now(),
      };

      return data;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '30', 10);
        console.warn(`请求过于频繁，等待 ${retryAfter} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, (retryAfter + 1) * 1000));
        attempt++;
      } else {
        throw error;
      }
    }
  }

  throw new Error('请求失败，重试次数已用尽');
}

// React 组件
const CryptoMarket = () => {
  const [data, setData] = useState([]);
  const intervalRef = useRef(null);

  // 列出你想要的币种
  const coins = [
    'bitcoin', 'ethereum', 'binancecoin', 'ripple', 'solana',
    'cardano', 'dogecoin', 'litecoin', 'polkadot'
  ];

  const fetchData = async () => {
    try {
      const url = `/coins/markets?vs_currency=usd&ids=${coins.join(',')}`;
      const result = await fetchWithCache(url, 30);
      setData(result);
    } catch (err) {
      console.error('获取行情失败:', err.message);
    }
  };

  useEffect(() => {
    // 首次加载
    fetchData();

    // 定时刷新（比如每 30 秒刷新一次）
    intervalRef.current = setInterval(fetchData, 30000);

    // 清理定时器
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div>
      <h2>实时行情</h2>
      <table>
        <thead>
          <tr>
            <th>名称</th>
            <th>价格(USD)</th>
            <th>24h变化</th>
          </tr>
        </thead>
        <tbody>
          {data.map(coin => (
            <tr key={coin.id}>
              <td>{coin.name}</td>
              <td>${coin.current_price.toLocaleString()}</td>
              <td style={{ color: coin.price_change_percentage_24h >= 0 ? 'green' : 'red' }}>
                {coin.price_change_percentage_24h.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CryptoMarket;
