/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-hosted deploy: emits .next/standalone/server.js with only the traced
  // runtime deps, so the VPS units run without node_modules. See deploy/README.md.
  output: "standalone",
};

export default nextConfig;
