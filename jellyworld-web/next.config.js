/** @type {import('next').NextConfig} */
const nextConfig = {
  // Autorise l'accès depuis votre IP locale en dev
  allowedDevOrigins: ['192.168.220.148'],

  // Autorise les images Jellyfin (domaines externes)
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '192.168.220.148',
        port: '8096',
        pathname: '/Items/**',
      },
      {
        protocol: 'http',
        hostname: 'jellyfin-backend',
        port: '8096',
        pathname: '/Items/**',
      },
    ],
  },
};

module.exports = nextConfig;
