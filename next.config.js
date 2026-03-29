/** @type {import('next').NextConfig} */
const nextConfig = {
  // Kakao SDK는 외부 스크립트이므로 허용
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
