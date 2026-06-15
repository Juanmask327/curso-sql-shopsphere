import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Monaco Editor WASM and sql.js WASM to load correctly
  webpack: (config, { isServer }) => {
    // Required for sql.js WebAssembly
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Allow .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    return config;
  },
  // Headers for WASM (required for SharedArrayBuffer in some browsers)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      {
        // Cache the SQLite dataset in the browser for 1 hour
        source: "/dataset.db",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, immutable" },
          { key: "Content-Type", value: "application/octet-stream" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
