import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to web/. In the monorepo (app/ + web/) the GitHub
  // build clones both, and Next/Turbopack otherwise walks up and tries to parse
  // the sibling Expo `app/tsconfig.json` (extends "expo/tsconfig.base"), which
  // fails on Vercel. Scoping the root to this dir keeps the web build isolated.
  turbopack: { root: __dirname },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
