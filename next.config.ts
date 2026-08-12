import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  async redirects() {
    return [
      {
        source: "/calculovidro",
        destination: "/calculo/calculovidro",
        permanent: false,
      },
    ]
  },
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
