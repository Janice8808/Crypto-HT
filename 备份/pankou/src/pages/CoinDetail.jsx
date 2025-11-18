import React, { useState, useEffect } from "react";
import axios from "axios";
import CandlestickIcon from "../components/CandlestickIcon";
import { useCoins } from "../hooks/useCoins";

const TradePanel = () => {
  const { allCoins } = useCoins(); // 获取币种列表和数据
  const [currentSymbol, setCurrentSymbol] = useState("BTCUSDT");
  const [showDropdown, setShowDropdown] = useState(false);
  const [tradeType, setTradeType] = useState("buy");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [percentage, setPercentage] = useState(null);
  const [available, setAvailable] = useState(1000);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });

  useEffect(() => {
    const fetchOrderBook = async () => {
      try {
        const symbol = currentSymbol.toUpperCase();
        const res = await axios.get(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=5`);
        setOrderBook({
          bids: res.data.bids.map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
          asks: res.data.asks.map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 1000);
    return () => clearInterval(interval);
  }, [currentSymbol]);

  const handlePercentage = (pct) => {
    setPercentage(pct);
    const price = tradeType === "buy" ? orderBook.asks[0]?.price : orderBook.bids[0]?.price;
    if (price > 0) {
      const q = ((available * (pct / 100)) / price).toFixed(6);
      setQuantity(q);
      setAmount((q * price).toFixed(2));
    }
  };

  return (
    <div className="p-3 bg-white min-h-screen text-xs sm:text-sm">

      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center space-x-2 relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-gray-600 text-xl px-2 py-1 hover:text-gray-800"
          >
            ≡
          </button>
          <span className="text-gray-500 font-medium text-sm">{currentSymbol.replace("USDT", "/USDT")}</span>

          {/* 下拉币种列表 */}
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 w-80 max-h-96 overflow-y-auto bg-white border rounded shadow-md z-50">
              {allCoins.length > 0 ? allCoins.map((coin) => {
                const isUp = coin.change >= 0;
                return (
                  <div
                    key={coin.symbol}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setCurrentSymbol(coin.symbol);
                      setShowDropdown(false);
                      setQuantity("");
                      setAmount("");
                    }}
                  >
                    <span className="flex items-center text-black font-medium">
                      <img
                        src={coin.logo}
                        alt={coin.symbol}
                        className="w-6 h-6 rounded-full mr-2"
                        onError={(e) => { e.target.onerror = null; e.target.src = "/images/default-coin.png"; }}
                      />
                      {coin.symbol}
                    </span>
                    <span className={`text-white font-semibold px-1 py-0.5 text-sm ${isUp ? "bg-green-500" : "bg-red-500"} rounded-sm`}>
                      {isUp ? "+" : ""}{coin.change}%
                    </span>
                  </div>
                );
              }) : (
                <div className="px-3 py-2 text-gray-400 text-sm">No coins</div>
              )}
            </div>
          )}
        </div>

        <div className="font-bold text-lg">{currentSymbol}</div>

        <button className="text-gray-600 text-xl px-2 py-1 hover:text-gray-800">
          <CandlestickIcon width={24} height={24} color="currentColor" />
        </button>
      </div>

      {/* Trade Panel */}
      <div className="bg-gray-100 rounded-lg p-3 mt-2 flex space-x-4">
        <div className="w-1/2 space-y-3">

          {/* Buy/Sell 按钮 */}
          <div className="flex space-x-2 mb-2">
            <button className="flex-1 py-2 rounded font-bold bg-green-500 text-white" onClick={() => setTradeType("buy")}>Buy</button>
            <button className="flex-1 py-2 rounded font-bold bg-red-500 text-white" onClick={() => setTradeType("sell")}>Sell</button>
          </div>

          {/* Amount */}
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full py-2 pl-20 pr-3 border rounded outline-none text-sm bg-white text-center"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Amount (USD)</span>
          </div>

          {/* Quantity */}
          <div className="relative mt-3">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full py-2 pl-20 pr-3 border rounded outline-none text-sm bg-white text-center"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
              Quantity ({currentSymbol.replace("USDT", "")})
            </span>
          </div>

{/* 百分比 */}
<div className="flex justify-between space-x-1 mt-1">
  {[25,50,75,100].map(p => (
    <button
      key={p}
      className={`flex-1 py-1 rounded text-gray-800 ${percentage===p ? "bg-gray-300" : "bg-white"}`}
      onClick={() => handlePercentage(p)}
    >
      {p}%
    </button>
  ))}
</div>


          {/* Available */}
          <div className="flex justify-between mt-3 text-gray-800">
            <span>Available:</span>
            <span className="font-semibold">{available.toFixed(2)} USDT</span>
          </div>

          {/* Buy/Sell 确认按钮 */}
          <button className={`w-full py-2 rounded font-bold mt-2 ${tradeType==="buy"?"bg-green-500 text-white":"bg-red-500 text-white"}`}>
            {tradeType==="buy"?"Buy":"Sell"}
          </button>
        </div>

        {/* 挂单深度 */}
        <div className="w-1/2 space-y-2">
          <div className="font-semibold text-red-600">Sell Orders</div>
          {orderBook.asks.slice(0).reverse().map((ask,idx)=>(
            <div key={idx} className="flex justify-between">
              <span className="text-red-500">{ask.price}</span>
              <span className="text-red-500">{ask.qty}</span>
            </div>
          ))}
          <div className="h-4"/>
          <div className="font-semibold text-green-600">Buy Orders</div>
          {orderBook.bids.map((bid,idx)=>(
            <div key={idx} className="flex justify-between">
              <span className="text-green-500">{bid.price}</span>
              <span className="text-green-500">{bid.qty}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Limit Order */}
      <div className="mt-6 bg-white">
        <div className="flex justify-between items-center border-b px-3 py-2">
          <span className="text-gray-500 font-medium text-sm">Limit order</span>
          <button onClick={()=>window.location.href="/"} className="text-gray-400 text-xl hover:text-gray-600">≡</button>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📄</div>
          <div className="text-sm">No delegated order</div>
        </div>
      </div>
    </div>
  );
};

export default TradePanel;
