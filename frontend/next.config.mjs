/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const raw = process.env.BACKEND_URL ?? "";
    const base = raw.trim().replace(/\/$/, "") || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${base}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
