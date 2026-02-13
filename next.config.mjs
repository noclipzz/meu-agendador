import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  reloadOnOnline: true, // Recarrega se voltar online
  workboxOptions: {
    padding: 1, // Muda o hash do SW
    clientsClaim: true,
    skipWaiting: true
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default withPWA(nextConfig);