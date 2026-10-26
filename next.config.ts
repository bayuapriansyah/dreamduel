import type { NextConfig } from "next";

const config: NextConfig = {
  turbopack: { root: __dirname },
  // The SDK and reactivity client open WebSockets and are server-safe as plain Node modules.
  serverExternalPackages: ["@somnia-chain/markets-sdk", "@somnia-chain/reactivity"],
};

export default config;
