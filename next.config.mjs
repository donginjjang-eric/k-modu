/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920],
    imageSizes: [320, 480],
    minimumCacheTTL: 86400,
    qualities: [70, 75, 82],
  },
};

export default nextConfig;
