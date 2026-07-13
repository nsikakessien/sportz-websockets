import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

let AgentAPI = null;

const apminsightConfigPath = path.resolve(process.cwd(), "apminsightnode.json");
const hasApmInsightLicense =
  Boolean(process.env.APMINSIGHT_LICENSE_KEY) ||
  Boolean(
    fs.existsSync(apminsightConfigPath) &&
    JSON.parse(fs.readFileSync(apminsightConfigPath, "utf8")).licenseKey,
  );

if (hasApmInsightLicense) {
  const apminsightModule = await import("apminsight");
  AgentAPI = apminsightModule.default;

  const apminsightConfig = {
    appName: process.env.APMINSIGHT_APP_NAME || "sportz",
    port: Number(process.env.APMINSIGHT_PORT || process.env.PORT || 10000),
  };

  if (process.env.APMINSIGHT_LICENSE_KEY) {
    apminsightConfig.licenseKey = process.env.APMINSIGHT_LICENSE_KEY;
  }

  try {
    AgentAPI.config(apminsightConfig);
  } catch (error) {
    console.warn("Apminsight configuration warning:", error.message);
  }
} else {
  console.info("Apminsight disabled: no license key configured.");
}

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
