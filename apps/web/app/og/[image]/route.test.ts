// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { GET, generateStaticParams } from './route';

const get = (image: string) =>
	GET(new Request(`https://najdimo.si/og/${image}`), { params: Promise.resolve({ image }) });

describe('/og/[image].png', () => {
	it('builds one card per P3 page and P22, per locale', () => {
		expect(generateStaticParams()).toHaveLength(14);
		expect(generateStaticParams()).toContainEqual({ image: 'sl-for-shelters.png' });
		expect(generateStaticParams()).toContainEqual({ image: 'en-partners.png' });
	});

	it.each(['sl-faq.png', 'en-partners.png'])('answers %s as a 1200 x 630 PNG', async (image) => {
		const response = await get(image);
		const png = Buffer.from(await response.arrayBuffer());

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/png');
		expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
	});

	it.each(['de-home.png', 'sl-nope.png', 'sl-home.jpg'])('answers 404 for %s', async (image) => {
		expect((await get(image)).status).toBe(404);
	});
});
