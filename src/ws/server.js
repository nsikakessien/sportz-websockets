import { WebSocket, WebSocketServer } from "ws";

function sendJSON(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(payload));
  }
}

function getAllowedOrigins() {
  return (
    process.env.WS_ALLOWED_ORIGINS ||
    "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const attachWebSocketServer = (server) => {
  const allowedOrigins = getAllowedOrigins();
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
    verifyClient: (info, callback) => {
      if (info.origin && !allowedOrigins.includes(info.origin)) {
        callback(false, 403, "Origin not allowed");
        return;
      }

      callback(true);
    },
  });

  wss.on("connection", (socket) => {
    socket.isAlive = true;

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    const heartbeat = setInterval(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        clearInterval(heartbeat);
        return;
      }

      if (socket.isAlive === false) {
        socket.terminate();
        return;
      }

      socket.isAlive = false;
      socket.ping();
    }, 30000);

    socket.on("close", () => {
      clearInterval(heartbeat);
    });

    sendJSON(socket, {
      type: "welcome",
      message: "Welcome to the WebSocket server!",
    });

    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  function broadcastMatchCreated(match) {
    broadcast(wss, {
      type: "match_created",
      data: match,
    });
  }

  return {
    broadcastMatchCreated,
  };
};
