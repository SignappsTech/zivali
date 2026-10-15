// Universal links / App Links files (C15, TASK-12.3). Values come from env; a platform without its identifier is omitted.
export const APP_ID = 'si.signapps.zivali';

// Listing, manage-link and payment-return paths, SL and EN (C15 §Deep links).
export const APP_LINK_PATHS = ['/r/*', '/en/r/*', '/m', '/en/m', '/payments/*'] as const;

export function appleAppSiteAssociation(teamId?: string) {
	return {
		applinks: {
			details: teamId
				? [{ appIDs: [`${teamId}.${APP_ID}`], components: APP_LINK_PATHS.map((path) => ({ '/': path })) }]
				: [],
		},
	};
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
