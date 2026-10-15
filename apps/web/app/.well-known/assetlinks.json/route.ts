import { assetLinks } from '@/lib/app-links';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export function GET() {
	return Response.json(assetLinks(env.ANDROID_CERT_SHA256), { headers: { 'cache-control': 'public, max-age=3600' } });
}
