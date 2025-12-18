/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // Fix for thread-stream test files being imported by thirdweb/walletconnect
    // Use NormalModuleReplacementPlugin to replace test files with empty module
    const webpack = require('webpack')
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /thread-stream[\/\\]test[\/\\]helper\.js$/,
        require.resolve('./lib/webpack-empty-module.js')
      )
    )
    
    return config
  },
}

export default nextConfig
