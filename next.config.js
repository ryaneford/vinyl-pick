/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.discogs.com',
      },
      {
        protocol: 'https',
        hostname: '*.discogs.com',
      },
    ],
  },
}

module.exports = nextConfig