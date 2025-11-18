import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCoins } from "../hooks/useCoins";
import { 
  FaUser, FaBookOpen, FaInfoCircle, FaCoins,
  FaDollarSign, FaProjectDiagram, FaChartLine, FaArrowCircleUp
} from 'react-icons/fa';

const Home = () => {
  const features = [
    { name: "User center", icon: <FaUser /> },
    { name: "MSb", icon: <FaBookOpen /> },
    { name: "introduction", icon: <FaInfoCircle /> },
    { name: "Currency", icon: <FaCoins /> },
    { name: "Deposit", icon: <FaDollarSign /> },
    { name: "DeFi", icon: <FaProjectDiagram /> },
    { name: "Futures", icon: <FaChartLine /> },
    { name: "Withdraw", icon: <FaArrowCircleUp /> },
  ];

  const { allCoins, hotCoins, loading, error } = useCoins();
  const [currentBanner, setCurrentBanner] = useState(0);

  const images = [
    "/images/banner1.jpg",
    "/images/banner2.jpg",
    "/images/banner3.jpg",
    "/images/banner4.jpg",
    "/images/banner5.jpg",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-2 py-4 bg-gray-100 min-h-screen text-black">
      <h1 className="text-3xl font-bold mb-6 text-center text-black">TradeUS Clone</h1>

      {/* 轮播图 */}
      <div className="w-full h-56 relative overflow-hidden rounded-lg bg-gray-800 mb-2">
        {images.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`banner${idx+1}`}
            className={`w-full h-56 object-contain rounded-lg absolute top-0 left-0 transition-opacity duration-1000 ${
              idx === currentBanner ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      {/* 功能入口 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {features.map(item => (
          <div key={item.name} className="flex flex-col items-center justify-center bg-white text-black py-3 rounded-lg">
            <div className="text-2xl mb-1">{item.icon}</div>
            <div>{item.name}</div>
          </div>
        ))}
      </div>

      {/* 热门币种 */}
      <div className="mb-6">
        {loading ? (
          <div className="text-center">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {hotCoins.map(coin => {
              const isUp = coin.change >= 0;
              return (
                <Link key={coin.symbol} to={`/coin/${coin.symbol}`} className="flex flex-col items-center justify-center p-3 bg-white rounded-lg">
                  <div className="text-gray-500 text-sm mb-1">{coin.symbol}</div>
                  <div className={`text-base font-bold mb-2 ${isUp ? "text-green-500" : "text-red-500"}`}>
                    ${coin.price}
                  </div>
                  <div className={`text-sm px-1 py-0.5 ${isUp ? "bg-green-500 text-white" : "bg-red-500 text-white"} rounded-sm`}>
                    {isUp ? "+" : ""}{coin.change}%
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 实时行情 */}
      <div className="overflow-y-auto max-h-[500px] bg-white rounded-lg shadow p-2">
        <div className="px-2 py-1 font-semibold text-gray-500">Popular list</div>
        <div className="flex items-center justify-between px-2 py-1 font-semibold text-gray-700 border-b">
          <span className="flex-1 text-gray-500">Symbol</span>
          <span className="w-36 text-left text-gray-500">Latest Price</span>
          <span className="w-24 text-right text-gray-500">24h</span>
        </div>

        {loading ? (
          <div className="px-2 py-4 text-center text-gray-500">Loading...</div>
        ) : allCoins.length === 0 ? (
          <div className="px-2 py-4 text-center text-gray-500">No coins found</div>
        ) : (
          allCoins.map(coin => {
            const isUp = coin.change >= 0;
            return (
              <Link key={coin.symbol} to={`/coin/${coin.symbol}`} className="flex items-center justify-between px-2 py-2 hover:bg-gray-100 transition">
                {/* Logo */}
                <span className="mr-2 w-6 h-6 flex-shrink-0">
                  <img
                    src={coin.logo}
                    alt={coin.symbol}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => { e.target.onerror = null; e.target.src = "/images/default-coin.png"; }}
                  />
                </span>

                {/* Symbol */}
                <span className="flex-1 text-gray-500 font-medium">{coin.symbol}</span>

                {/* 价格 */}
                <span className={`w-36 text-left ${isUp ? "text-green-500" : "text-red-500"} font-medium`}>
                  ${coin.price}
                </span>

                {/* 涨跌幅 */}
                <span className={`inline-block font-semibold px-1 py-0.5 text-sm ${isUp ? "bg-green-500 text-white" : "bg-red-500 text-white"} rounded-sm`}>
                  {isUp ? "+" : ""}{coin.change}%
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Home;
