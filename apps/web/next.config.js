/** @type {import('next').NextConfig} */
const { version } = require("./package.json");
const { i18n } = require("./next-i18next.config");

const nextConfig = {
  i18n,
  reactStrictMode: true,
  staticPageGenerationTimeout: 1000,
  images: {
    remotePatterns: [
      // For profile pictures (Google OAuth)
      { hostname: "*.googleusercontent.com" },
    ],

    minimumCacheTTL: 10,
  },
  transpilePackages: [
    "@linkwarden/prisma",
    "@linkwarden/router",
    "@linkwarden/lib",
    "@linkwarden/types",
  ],
  env: {
    version,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ],
      },
    ];
  },
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/pgdata/**", "**/node_modules/**"],
    };

    return config;
  },
};

module.exports = nextConfig;
