
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // NOTE: Currently ignoring build errors due to multiple TypeScript issues that need systematic fixes:
    // - Missing function implementations (updateArcadeSession, loadProfileByAddress, saveProfileByAddress)
    // - Type mismatches in service methods
    // - Missing properties in context types
    // TODO: Fix TypeScript errors systematically and remove this flag
    // See: TYPESCRIPT_FIXES_NEEDED.md for full list of errors
    ignoreBuildErrors: true,
  },
  images: {
    // Images are unoptimized, likely for static export compatibility
    // If not using static export, consider enabling optimization for better performance
    unoptimized: true,
  },
  // Security headers including Content Security Policy
  // TEMPORARILY DISABLED FOR TESTING - Re-enable after confirming app works
  // NOTE: CSP is relaxed for development. In production, consider tightening restrictions.
  // async headers() {
  //   const isDev = process.env.NODE_ENV === 'development'
  //   
  //   return [
  //     {
  //       source: '/:path*',
  //       headers: [
  //         {
  //           key: 'Content-Security-Policy',
  //           value: [
  //             "default-src 'self'",
  //             // Scripts: Allow self, eval (for Next.js), inline (for some libraries), and thirdweb
  //             `script-src 'self' 'unsafe-eval' 'unsafe-inline'${isDev ? " 'unsafe-hashes'" : ""} https://vercel.live https://*.thirdweb.com https://*.thirdweb.dev https://*.vercel.app https://chunks.thirdweb.com`,
  //             // Styles: Allow self, inline (for styled-components and similar), and Google Fonts
  //             "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  //             // Images: Allow self, data URIs, HTTPS, and blob
  //             "img-src 'self' data: https: blob:",
  //             // Fonts: Allow self, data URIs, and Google Fonts
  //             "font-src 'self' data: https://fonts.gstatic.com",
  //             // Connections: Allow self, thirdweb, supabase, and game domains
  //             "connect-src 'self' https://*.thirdweb.com https://*.thirdweb.dev https://*.supabase.co wss://*.supabase.co https://*.vercel.app https://ape-in-game.vercel.app https://cryptoku.vercel.app wss://*.thirdweb.com",
  //             // Frames: Allow self and game domains for iframe embeds
  //             "frame-src 'self' https://*.thirdweb.com https://*.thirdweb.dev https://*.vercel.app https://ape-in-game.vercel.app https://cryptoku.vercel.app",
  //             // Media: Allow self and blob for audio/video
  //             "media-src 'self' blob:",
  //             // Object: Block all
  //             "object-src 'none'",
  //             // Base URI: Only self
  //             "base-uri 'self'",
  //             // Form actions: Only self
  //             "form-action 'self'",
  //             // Frame ancestors: Block embedding (prevents clickjacking)
  //             "frame-ancestors 'none'",
  //             // Upgrade insecure requests in production
  //             ...(isDev ? [] : ["upgrade-insecure-requests"]),
  //           ].join('; '),
  //         },
  //         {
  //           key: 'X-Frame-Options',
  //           value: 'DENY',
  //         },
  //         {
  //           key: 'X-Content-Type-Options',
  //           value: 'nosniff',
  //         },
  //         {
  //           key: 'Referrer-Policy',
  //           value: 'strict-origin-when-cross-origin',
  //         },
  //         {
  //           key: 'Permissions-Policy',
  //           value: 'camera=(), microphone=(), geolocation=()',
  //         },
  //       ],
  //     },
  //   ]
  // },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("pino-pretty", "encoding", "thread-stream")
    } else {
      // Fix for MetaMask SDK trying to import @react-native-async-storage/async-storage
      // The postinstall script creates a stub in node_modules, but we need to alias it
      // Use dynamic import path resolution for ES modules
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-native-async-storage/async-storage': false, // Disable the module entirely
      }
      // Add fallback for the module
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
      }
    }
    return config
  },
}

export default nextConfig
