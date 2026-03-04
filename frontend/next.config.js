/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // standalone só para Docker; no Vercel usa o build padrão
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    // Na Vercel, não fazer rewrite para localhost (causa DNS_HOSTNAME_RESOLVED_PRIVATE)
    const useRewrite = apiUrl && apiUrl.startsWith('http') && !apiUrl.includes('localhost');
    if (!useRewrite) return [];
    return [
      { source: '/api/proxy/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
