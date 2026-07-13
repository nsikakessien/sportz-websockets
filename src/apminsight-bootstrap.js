import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

const apminsightConfigPath = path.resolve(process.cwd(), "apminsightnode.json");
let fileLicenseKey = null;

try {
  const rawConfig = fs.readFileSync(apminsightConfigPath, "utf8");
  const parsedConfig = JSON.parse(rawConfig);

  if (
    parsedConfig &&
    typeof parsedConfig === "object" &&
    typeof parsedConfig.licenseKey === "string" &&
    parsedConfig.licenseKey.trim()
  ) {
    fileLicenseKey = parsedConfig.licenseKey.trim();
  }
} catch (error) {
  console.warn("Unable to read apminsightnode.json:", error.message);
}

const hasApmInsightLicense =
  Boolean(process.env.APMINSIGHT_LICENSE_KEY) || Boolean(fileLicenseKey);

if (hasApmInsightLicense) {
  const { default: AgentAPI } = await import("apminsight");

  const apminsightConfig = {
    appName: process.env.APMINSIGHT_APP_NAME || "sportz",
    port: Number(process.env.APMINSIGHT_PORT || process.env.PORT || 10000),
  };

  const licenseKey = process.env.APMINSIGHT_LICENSE_KEY || fileLicenseKey;

  if (licenseKey) {
    apminsightConfig.licenseKey = licenseKey;
  }

  try {
    AgentAPI.config(apminsightConfig);
  } catch (error) {
    console.warn("Apminsight configuration warning:", error.message);
  }
} else {
  console.info("Apminsight disabled: no license key configured.");
}
