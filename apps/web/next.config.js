/** @type {import('next').NextConfig} */
const path = require("path");
const { version } = require("./package.json");
const { i18n } = require("./next-i18next.config");

const nextConfig = {
  i18n,
  reactStrictMode: true,
  devIndicators: false,
  // Default tracing root follows the yarn workspace (repo root). Docker bind mounts there
  // (e.g. ./pgdata) are often root-only and break builds with EACCES. Scope tracing to
  // this app; hoisted deps under ../../node_modules are still resolved.
  outputFileTracingRoot: path.resolve(__dirname),
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
    // Set ALLOWED_ORIGINS to restrict API access (e.g. "https://links.example.com").
    // Falls back to "*" for backwards compatibility if unset.
    const corsOrigin = process.env.ALLOWED_ORIGINS || "*";

    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: corsOrigin },
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

    return config;
  },
};

module.exports = nextConfig;
