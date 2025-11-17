// notifier.js
let wss = null;

function setWss(server) {
  wss = server;
}

function broadcast(event, payload) {
  if (!wss) return;
  const msg = JSON.stringify({
    type: event,
    ...payload,
  });

console.log("📤 WS broadcast:", msg);

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

function notifyNewOrder(order) {
  broadcast("NEW_ORDER", { order });
}

function notifyNewWithdraw(withdraw) {
  broadcast("NEW_WITHDRAW", { withdraw });
}

module.exports = {
  setWss,
  notifyNewOrder,
  notifyNewWithdraw,
};
