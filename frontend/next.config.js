/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // standalone só para Docker; no Vercel usa o build padrão
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      { source: '/api/proxy/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
