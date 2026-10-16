import { describe, expect, it } from 'vitest';

import { appleAppSiteAssociation, assetLinks } from './app-links';

const SHA = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0').toUpperCase()).join(':');

describe('app links files', () => {
	it('lists the deep-link paths under the app id when the Team ID is set', () => {
		const [detail] = appleAppSiteAssociation('ABCDE12345').applinks.details;
		expect(detail.appIDs).toEqual(['ABCDE12345.si.signapps.zivali']);
		expect(detail.components.filter((c) => !('exclude' in c)).map((c) => c['/'])).toEqual([
			'/r/*',
			'/en/r/*',
			'/m',
			'/en/m',
			'/payments/*',
		]);
	});

	it('keeps the poster PDF and OG image in the browser: excluded before the listing paths (TASK-12.6)', () => {
		const [detail] = appleAppSiteAssociation('ABCDE12345').applinks.details;
		// iOS uses the first component that matches; `*` matches any characters, `/` included.
		const glob = (pattern: string) => new RegExp(`^${pattern.replace(/[.]/g, '\\.').replace(/\*/g, '.*')}$`);
		const claimed = (path: string) => {
			const component = detail.components.find((c) => glob(c['/']).test(path));
			return component !== undefined && !('exclude' in component);
		};
		expect(claimed('/r/Hk3vT9qP/poster.pdf')).toBe(false);
		expect(claimed('/r/Hk3vT9qP/opengraph-image')).toBe(false);
		expect(claimed('/r/Hk3vT9qP/opengraph-image-1x2y3z')).toBe(false);
		expect(claimed('/r/Hk3vT9qP')).toBe(true);
		expect(claimed('/r/Hk3vT9qP/ujemanja')).toBe(true);
		expect(claimed('/en/r/Hk3vT9qP/matches')).toBe(true);
		expect(claimed('/r/Hk3vT9qP/spet-doma')).toBe(true);
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
