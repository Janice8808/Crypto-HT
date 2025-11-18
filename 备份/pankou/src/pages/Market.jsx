import React from "react";
import { Link } from "react-router-dom";
import { useCoins } from "../hooks/useCoins";

const Market = () => {
  const { allCoins } = useCoins();

  return (
    <div className="w-full min-h-screen text-black px-2 py-4 bg-white">
      {/* 页面标题 */}
      <h1 className="text-3xl font-bold mb-4">Market</h1>

      {/* 表头 */}
      <div className="flex items-center px-1 py-1 font-semibold text-gray-700">
        <span className="w-1/3 text-gray-500">Symbol</span>
        <span className="w-1/3 text-right text-gray-500">Latest Price</span>
        <span className="w-1/3 text-right text-gray-500">24h</span>
      </div>

      {/* 币种列表 */}
      {allCoins.map((coin) => {
        const isUp = coin.change >= 0;
        return (
          <Link
            key={coin.symbol}
            to={`/coin/${coin.symbol}`}
            className="flex items-center px-1 py-2 hover:bg-gray-100 transition"
          >
            {/* Symbol */}
            <span className="w-1/3 flex items-center text-gray-500 font-medium">
              <img
                src={coin.logo}
                alt={coin.symbol}
                className="w-6 h-6 rounded-full mr-2"
                onError={(e) => { e.target.onerror = null; e.target.src = "/images/default-coin.png"; }}
              />
              {coin.symbol}
            </span>

            {/* Latest Price */}
            <span className={`w-1/3 text-center ${isUp ? "text-green-500" : "text-red-500"} relative`} style={{ left: '24px' }}>
              ${coin.price}
            </span>

            {/* 24h 涨跌幅红绿框紧贴数字 */}
            <span className="w-1/3 flex justify-end">
              <span className={`text-white font-semibold px-1 py-0.5 text-sm ${isUp ? "bg-green-500" : "bg-red-500"} rounded-sm`}>
                {isUp ? "+" : ""}{coin.change}%
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default Market;
