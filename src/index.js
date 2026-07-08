import express from "express";
import fs from "fs";
import http from "http";
import https from "https";
import { matchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";
const useTls = process.env.USE_TLS === "true";

const app = express();
let server;

if (useTls) {
  const certPath = process.env.SSL_CERT_PATH;
  const keyPath = process.env.SSL_KEY_PATH;

  if (!certPath || !keyPath) {
    throw new Error(
      "SSL_CERT_PATH and SSL_KEY_PATH must be set when USE_TLS=true",
    );
  }

  const key = fs.readFileSync(keyPath);
  const cert = fs.readFileSync(certPath);
  server = https.createServer({ key, cert }, app);
} else {
  server = http.createServer(app);

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "TLS is not enabled. Ensure a reverse proxy or load balancer terminates TLS before this server.",
    );
  }
}

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use("/matches", matchRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const protocol = useTls ? "https" : "http";
  const baseUrl =
    HOST === "0.0.0.0"
      ? `${protocol}://localhost:${PORT}`
      : `${protocol}://${HOST}:${PORT}`;
  console.log(`Server is running on ${baseUrl}`);
  console.log(
    `WebSocket server is available at ${baseUrl.replace(protocol, protocol === "https" ? "wss" : "ws")}/ws`,
  );
});
