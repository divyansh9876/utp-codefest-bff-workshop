// Read at build time. Render sets RENDER=true during its builds.
const DEFAULT_BFF_URL = process.env.RENDER ? "https://utp-codefest-bff.onrender.com" : "http://localhost:8080";
const BFF_URL = (process.env.BFF_URL || DEFAULT_BFF_URL).replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // The browser only ever calls /api/* on this origin; Next.js forwards it to
    // the Spring Boot BFF. Same origin for the browser = no CORS setup needed.
    return [{ source: "/api/:path*", destination: `${BFF_URL}/api/:path*` }];
  },
};

export default nextConfig;
