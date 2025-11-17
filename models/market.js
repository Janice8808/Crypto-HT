// models/market.js
let prices = {
    BTC: 68000,
    ETH: 4000,
    USDT: 1
};

// 模拟行情变化函数
function simulatePrices() {
    for (const coin in prices) {
        // 价格随机上下浮动 ±1% 左右
        const changePercent = (Math.random() * 2 - 1) / 100;
        prices[coin] = parseFloat((prices[coin] * (1 + changePercent)).toFixed(2));
    }
}

// 每 5 秒模拟一次行情
setInterval(simulatePrices, 5000);

function getPrice(coin) {
    return prices[coin];
}

function getAllPrices() {
    return prices;
}

module.exports = { getPrice, getAllPrices };
