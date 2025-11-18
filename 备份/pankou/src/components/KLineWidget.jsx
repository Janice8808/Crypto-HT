import React, { useEffect, useRef } from "react";

const KLineWidget = ({ symbol = "BINANCE:BTCUSDT", interval = "15" }) => {
  const widgetRef = useRef(null);

  useEffect(() => {
    // 检查是否已经加载 TradingView 脚本
    if (!window.TradingView) {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = createWidget;
      document.body.appendChild(script);
    } else {
      createWidget();
    }

    function createWidget() {
      if (!widgetRef.current) return;
      new window.TradingView.widget({
        width: "100%",
        height: 400,
        symbol: symbol, // 交易对
        interval: interval, // K线周期，比如 "1", "5", "15", "60", "D"
        container_id: widgetRef.current.id,
        locale: "cn",
        theme: "light",
        toolbar_bg: "#f1f3f6",
        hide_top_toolbar: false,
        save_image: false,
        allow_symbol_change: true
      });
    }
  }, [symbol, interval]);

  return <div ref={widgetRef} id="tradingview-widget" />;
};

export default KLineWidget;
