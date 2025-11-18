import React, { useState, useEffect } from 'react';

function RealTimeTicker() {
  const [prices, setPrices] = useState({}); // 初始化币种价格状态

  useEffect(() => {
    // 连接本地 WebSocket（确保后端 app.js 已启动并代理币安）
    const ws = new WebSocket('ws://localhost:5000');

    ws.onopen = () => console.log('Frontend connected to local WS');

    ws.onmessage = (event) => {
      try {
        // 后端发送的数据格式示例: [{s: 'BTCUSDT', c: '12345.67'}, {s: 'ETHUSDT', c: '3456.78'}]
        const data = JSON.parse(event.data);

        setPrices(prev => {
          const updated = { ...prev };
          data.forEach(item => {
            // 提取币种简写 BTC/ETH/...
            const symbol = item.s.replace('USDT', '');
            updated[symbol] = parseFloat(item.c).toFixed(2);
          });
          return updated;
        });
      } catch (err) {
        console.error('解析 WebSocket 消息失败:', err);
      }
    };

    ws.onerror = (err) => console.error('WebSocket 错误:', err);

    ws.onclose = () => console.log('Frontend disconnected from local WS');

    // 组件卸载时关闭 WebSocket
    return () => ws.close();
  }, []);

  // 转换成渲染数组
  const coins = Object.entries(prices).map(([symbol, price]) => ({ symbol, price }));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {coins.length > 0 ? (
        coins.map(coin => (
          <div
            key={coin.symbol}
            className="p-4 bg-gray-100 rounded-lg shadow text-center text-gray-800 hover:bg-gray-200 transition"
          >
            <div className="font-bold text-lg">{coin.symbol}</div>
            <div className="text-blue-600 text-xl">
              {coin.price !== null ? `$${coin.price}` : '加载中...'}
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-2 text-center text-gray-500">加载中...</div>
      )}
    </div>
  );
}

export default RealTimeTicker;
