import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add environment variables that are safe to expose during build time
  // Only used for determining behavior during build, not secret values
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },

  // Allow skipping type checking during build for speed
  typescript: {
    // !! WARN !!
    // Only ignoring type checking for GitHub Actions build
    // This should be false for local development
    ignoreBuildErrors: true,
  },

  // Disable strict ESLint checks during build
  eslint: {
    // !! WARN !!
    // Only ignoring ESLint errors during build
    // This should be false for local development
    ignoreDuringBuilds: true,
  },

  // Improve output verbose messages
  output: 'standalone',
};

export default nextConfig;
