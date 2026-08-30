/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'i1.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'i2.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'i3.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'i4.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'yt3.ggpht.com',
      },
      {
        protocol: 'https',
        hostname: 'yt3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
      },
    ],
  },
};

module.exports = nextConfig;
