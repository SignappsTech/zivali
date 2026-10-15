import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Baseline for every response; the per-request CSP with its nonce is set in proxy.ts.
const securityHeaders = [
	{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	// Legacy twin of CSP frame-ancestors 'none', also for responses the proxy skips.
	{ key: 'X-Frame-Options', value: 'DENY' },
	// Camera for photos and location for the picker, own origin only.
	{ key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=(), payment=(), usb=()' },
];

const nextConfig: NextConfig = {
	// Own container on the Hetzner VPS (ADR-016).
	output: 'standalone',
	poweredByHeader: false,
	// Ship TypeScript source (@zivali/i18n/format).
	transpilePackages: ['@zivali/api', '@zivali/analytics', '@zivali/i18n'],
	headers: async () => [{ source: '/:path*', headers: securityHeaders }],
};

export default createNextIntlPlugin()(nextConfig);
