import type { NextConfig } from "next";

const config: NextConfig = {
  allowedDevOrigins: ["local.policies.taskly.iy0306.com"],
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
};

export default config;
