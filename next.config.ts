import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  images: {
    localPatterns: [
      {
        pathname: "/desenhos/**",
      },
      {
        pathname: "/desenhos/**",
        search: "?v=*",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
