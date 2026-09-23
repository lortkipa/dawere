import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

/**
 * No nonces, so inline scripts are allowed (Next's own bootstrap and the theme
 * script need them); the policy still pins every other source to this origin.
 * Post bodies may embed images from anywhere, hence the open img-src.
 * No upgrade-insecure-requests: it would break `npm start` over plain http on
 * localhost. Terminate TLS in front of the app and set HSTS there.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: http: data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  // A self-contained server in .next/standalone, for the Docker image.
  output: 'standalone',
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // The default 1 MB cap would reject avatars the UI allows (5 MB, see
      // src/lib/storage.ts) and long posts: Georgian is 3 bytes a character,
      // so the 400k-character body limit is over a megabyte on the wire.
      bodySizeLimit: '6mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
