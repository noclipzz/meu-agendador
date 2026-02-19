import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  reloadOnOnline: false, // Desativado para evitar loops em conexões instáveis
  workboxOptions: {
    clientsClaim: true,
    skipWaiting: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/accounts\.nohud\.com\.br\/.*/i,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /\/_next\/data\/.+/,
        handler: 'NetworkFirst',
      },
      {
        urlPattern: /\/api\/.+/,
        handler: 'NetworkOnly',
      }
    ]
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);