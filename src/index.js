import "dotenv/config";
import "./apminsight-bootstrap.js";

import express from "express";
import http from "http";
import { matchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "./arcjet.js";
import { commentaryRouter } from "./routes/commentary.js";

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from Express server!");
});

app.use(securityMiddleware());

app.use("/matches", matchRouter);
app.use("/matches/:id/commentary", commentaryRouter);

const { broadcastMatchCreated, broadcastCommentary } =
  attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

function logServerReady(listeningPort) {
  const baseUrl =
    HOST === "0.0.0.0"
      ? `http://localhost:${listeningPort}`
      : `http://${HOST}:${listeningPort}`;

  console.log(`Server is running on ${baseUrl}`);
  console.log(
    `WebSocket Server is running on ${baseUrl.replace("http", "ws")}/ws`,
  );
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    const allowRandomPortFallback =
      process.env.NODE_ENV !== "production" ||
      process.env.ALLOW_PORT_FALLBACK === "true";

    if (!allowRandomPortFallback) {
      throw error;
    }

    console.warn(
      `Port ${PORT} is already in use. Using a random available port instead.`,
    );
    server.listen(0, HOST, () => {
      const address = server.address();
      const listeningPort =
        typeof address === "object" && address ? address.port : PORT;
      logServerReady(listeningPort);
    });
    return;
  }

  throw error;
});

server.listen(PORT, HOST, () => {
  logServerReady(PORT);
});
