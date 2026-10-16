// Universal links / App Links files (C15, TASK-12.3). Values come from env; a platform without its identifier is omitted.
export const APP_ID = 'si.signapps.zivali';

// Listing, manage-link and payment-return paths, SL and EN (C15 §Deep links).
export const APP_LINK_PATHS = ['/r/*', '/en/r/*', '/m', '/en/m', '/payments/*'] as const;

// Files under a listing (C15 server endpoints) open in the browser, not the app. iOS takes the first matching
// component, so these come first. Android has no exclusions: the app's intent filter claims listing pages by pattern
// (apps/mobile app.config.ts).
const APP_LINK_EXCLUDES = ['/r/*/poster.pdf', '/r/*/opengraph-image*'] as const;

export function appleAppSiteAssociation(teamId?: string) {
	const components = [
		...APP_LINK_EXCLUDES.map((path) => ({ '/': path, exclude: true })),
		...APP_LINK_PATHS.map((path) => ({ '/': path })),
	];
	return { applinks: { details: teamId ? [{ appIDs: [`${teamId}.${APP_ID}`], components }] : [] } };
}

/** `sha256` is the comma-separated list of signing certificate fingerprints (EAS release keystore, Play app signing). */
export function assetLinks(sha256?: string) {
	const fingerprints = (sha256 ?? '')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);
	return fingerprints.length
		? [
				{
					relation: ['delegate_permission/common.handle_all_urls'],
					target: { namespace: 'android_app', package_name: APP_ID, sha256_cert_fingerprints: fingerprints },
				},
			]
		: [];
}
