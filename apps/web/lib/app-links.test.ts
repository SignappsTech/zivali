import { describe, expect, it } from 'vitest';

import { appleAppSiteAssociation, assetLinks } from './app-links';

const SHA = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0').toUpperCase()).join(':');

describe('app links files', () => {
	it('lists the deep-link paths under the app id when the Team ID is set', () => {
		const [detail] = appleAppSiteAssociation('ABCDE12345').applinks.details;
		expect(detail.appIDs).toEqual(['ABCDE12345.si.signapps.zivali']);
		expect(detail.components.map((c) => c['/'])).toEqual(['/r/*', '/en/r/*', '/m', '/en/m', '/payments/*']);
	});

	it('omits iOS without a Team ID and Android without fingerprints', () => {
		expect(appleAppSiteAssociation().applinks.details).toEqual([]);
		expect(assetLinks()).toEqual([]);
		expect(assetLinks(' , ')).toEqual([]);
	});

	it('emits every fingerprint for the package', () => {
		expect(assetLinks(`${SHA}, ${SHA}`)[0].target).toMatchObject({
			package_name: 'si.signapps.zivali',
			sha256_cert_fingerprints: [SHA, SHA],
		});
	});
});
