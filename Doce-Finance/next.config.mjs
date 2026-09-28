/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remova 'allowedDevOrigins: ["*"]' — wildcard expõe a app em dev
  // allowedDevOrigins: ['localhost', '127.0.0.1'],

  images: {
    // Domínios usados pelo Supabase Storage para logos dos usuários
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Evita clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Força HTTPS
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Evita sniffing de tipo MIME
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Controla referrer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desabilita features desnecessárias
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
