/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.220.148'],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: '192.168.220.148', port: '8096', pathname: '/Items/**' },
      { protocol: 'http', hostname: 'jellyfin-backend', port: '8096', pathname: '/Items/**' },
    ],
  },
};

module.exports = nextConfig;
