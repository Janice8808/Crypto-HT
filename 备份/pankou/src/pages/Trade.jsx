import React, { useState, useEffect, useRef } from "react";

// TradingView Widget 组件
const TradingViewWidget = ({ symbol }) => {
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!widgetRef.current) return;
    widgetRef.current.innerHTML = "";

    if (!window.TradingView) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        new window.TradingView.widget({
          container_id: widgetRef.current.id,
          symbol: `BINANCE:${symbol}`,
          interval: "1",
          timezone: "Etc/UTC",
          theme: "light",
          style: "1",
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true,
          hideideas: true,
        });
      };
      document.body.appendChild(script);
    } else {
      new window.TradingView.widget({
        container_id: widgetRef.current.id,
        symbol: `BINANCE:${symbol}`,
        interval: "1",
        timezone: "Etc/UTC",
        theme: "light",
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: true,
        hideideas: true,
      });
    }
  }, [symbol]);

  return <div ref={widgetRef} id="tv_widget" style={{ flex: 1, minHeight: 0 }} />;
};

// 弹窗遮罩 + 底部弹窗组件
const BottomModal = ({ children, onClose }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.3)",
    }}
    onClick={onClose} // 点击遮罩关闭
  >
    <div
      style={{
        height: "80%",
        backgroundColor: "#fff",
        borderTopLeftRadius: "16px",
        borderTopRightRadius: "16px",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        padding: "20px 20px 10px 20px",
      }}
      onClick={(e) => e.stopPropagation()} // 阻止点击内部关闭
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
        <button onClick={onClose} style={{ fontSize: "18px", background: "none", border: "none", cursor: "pointer" }}>
          ✕
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  </div>
);

const OrderForm = ({ symbol, modalType, price }) => {
  const [customAmount, setCustomAmount] = useState("");

  const periods = [
    { time: "60S", percent: "25%" },
    { time: "90S", percent: "30%" },
    { time: "120S", percent: "37%" },
    { time: "180S", percent: "50%" },
    { time: "360S", percent: "70%" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", minHeight: 0 }}>
      {/* Selection Period */}
      <div style={{ fontSize: "12px", color: "#999" }}>Selection Period</div>
      <div
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          paddingBottom: "8px",
        }}
      >
        {periods.map((p) => (
          <div
            key={p.time}
            style={{
              minWidth: "70px",
              flex: "0 0 auto",
              backgroundColor: "#2ecc71",
              borderRadius: "10px",
              padding: "10px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              color: "#fff",
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            <div>{p.time}</div>
            <div>{p.percent}</div>
          </div>
        ))}
      </div>

      {/* Custom Amount */}
      <div style={{ fontSize: "12px", color: "#999" }}>Custom amount</div>
      <input
        type="number"
        placeholder="Please enter amount"
        value={customAmount}
        onChange={(e) => setCustomAmount(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #ccc",
          color: "#2ecc71",
          fontSize: "14px",
        }}
      />
      <div style={{ fontSize: "12px", color: "#999" }}>
        Balance: 0.00000 USDT, Balance: 0.00000 USDT
      </div>

      <div style={{ height: "1px", backgroundColor: "#ccc", width: "100%", margin: "8px 0" }} />

      {/* Table headers */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#999" }}>
        <div>Symbol</div>
        <div>Direction</div>
        <div>Price</div>
        <div>Money</div>
        <div>Expected</div>
      </div>

      {/* Table values */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#333", fontWeight: "bold" }}>
        <div>{symbol}</div>
        <div>{modalType}</div>
        <div>{price.toFixed(2)}</div>
        <div>10 USDT</div>
        <div>0 USDT</div>
      </div>

      {/* Confirm Button */}
      <button
        style={{
          marginTop: "auto",
          backgroundColor: "#f1c40f",
          color: "#fff",
          padding: "14px",
          borderRadius: "10px",
          border: "none",
          fontSize: "16px",
          cursor: "pointer",
        }}
        onClick={() => alert(`Confirmed ${modalType} order for ${symbol}`)}
      >
        Confirm Order
      </button>
    </div>
  );
};

const Trade = () => {
  const [currentSymbol, setCurrentSymbol] = useState("BTCUSDT");
  const [showMenu, setShowMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");

  const [price, setPrice] = useState(0);
  const [changePercent, setChangePercent] = useState(0);
  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(0);
  const [amount24h, setAmount24h] = useState(0);

  const wsRef = useRef(null);
  const symbolsList = ["BTCUSDT", "ETHUSDT", "LTCUSDT", "XRPUSDT"];
  const priceColor = changePercent >= 0 ? "#2ecc71" : "#e74c3c";

  const handleSymbolChange = (symbol) => {
    setCurrentSymbol(symbol);
    setShowMenu(false);
  };

  useEffect(() => {
    if (wsRef.current) wsRef.current.close();
    const url = `wss://stream.binance.com:9443/ws/${currentSymbol.toLowerCase()}@ticker`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPrice(parseFloat(data.c));
      setChangePercent(parseFloat(data.P));
      setLow(parseFloat(data.l));
      setHigh(parseFloat(data.h));
      setAmount24h(parseFloat(data.v));
    };
    return () => ws.close();
  }, [currentSymbol]);

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#fff", overflow: "hidden" }}>
      {/* 顶部导航 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #eee", color: "#666", position: "relative" }}>
        <button onClick={() => window.history.back()} style={{ fontSize: "18px", color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>←</button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, gap: "5px", position: "relative" }}>
          <button onClick={() => setShowMenu(!showMenu)} style={{ fontSize: "18px", color: "#666", background: "none", border: "none", cursor: "pointer", padding: 0 }}>☰</button>
          <span>{currentSymbol}</span>
          {showMenu && (
            <div style={{ position: "absolute", top: "30px", backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "6px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)", zIndex: 10 }}>
              {symbolsList.map((symbol) => (
                <div key={symbol} onClick={() => handleSymbolChange(symbol)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #eee", color: "#666" }}>{symbol}</div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: "24px" }}></div>
      </div>

      {/* 信息栏 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: "1px solid #eee", fontSize: "14px", color: "#666", backgroundColor: "#fafafa" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "22px", fontWeight: "bold", color: priceColor }}>${price.toLocaleString()}</span>
          <span style={{ fontSize: "14px", color: priceColor }}>{changePercent >= 0 ? "+" : ""}{changePercent}%</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <span>Low</span>
          <span>High</span>
          <span>24h Amount</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span>{low}</span>
          <span>{high}</span>
          <span>{amount24h}</span>
        </div>
      </div>

      {/* TradingView */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <TradingViewWidget symbol={currentSymbol} />
      </div>

      {/* 底部按钮 */}
      <div style={{ display: "flex", gap: "12px", padding: "12px 16px", borderTop: "1px solid #eee" }}>
        <button style={{ flex: 1, backgroundColor: "#2ecc71", color: "#fff", padding: "16px 0", border: "none", borderRadius: "10px", fontSize: "16px", cursor: "pointer" }} onClick={() => { setModalType("Buy Up"); setShowModal(true); }}>Buy Up</button>
        <button style={{ flex: 1, backgroundColor: "#e74c3c", color: "#fff", padding: "16px 0", border: "none", borderRadius: "10px", fontSize: "16px", cursor: "pointer" }} onClick={() => { setModalType("Buy Fall"); setShowModal(true); }}>Buy Fall</button>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <BottomModal onClose={() => setShowModal(false)}>
          <OrderForm symbol={currentSymbol} modalType={modalType} price={price} />
        </BottomModal>
      )}
    </div>
  );
};

export default Trade;
