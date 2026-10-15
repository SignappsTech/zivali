import { appleAppSiteAssociation } from '@/lib/app-links';
import { env } from '@/lib/env';

// Read per request: the Team ID is runtime config. No redirect, application/json, same file on every host.
export const dynamic = 'force-dynamic';

export function GET() {
	return Response.json(appleAppSiteAssociation(env.APPLE_TEAM_ID), {
		headers: { 'cache-control': 'public, max-age=3600' },
	});
}
