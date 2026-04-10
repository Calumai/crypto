/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    // Ensure no trailing slash and valid URL
    const base = backendUrl.replace(/\/$/, "");
    if (!base.startsWith("http")) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${base}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
