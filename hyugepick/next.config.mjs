/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const nextConfig = {};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
