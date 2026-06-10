/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  outputFileTracingIncludes: {
    "/assets/[...path]": ["./assets/**/*"],
  },
};

export default nextConfig;
