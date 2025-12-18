/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverExternalPackages: [
      "pino",
      "thread-stream",
      "@walletconnect/universal-provider",
    ],
  },
}

export default nextConfig
