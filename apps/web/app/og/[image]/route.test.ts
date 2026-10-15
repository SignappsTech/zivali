// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { GET, generateStaticParams } from './route';

const get = (image: string) =>
	GET(new Request(`https://najdimo.si/og/${image}`), { params: Promise.resolve({ image }) });

describe('/og/[image].png', () => {
	it('builds one card per P3 page and locale', () => {
		expect(generateStaticParams()).toHaveLength(12);
		expect(generateStaticParams()).toContainEqual({ image: 'sl-for-shelters.png' });
	});

	it('answers a 1200 x 630 PNG', async () => {
		const response = await get('sl-faq.png');
		const png = Buffer.from(await response.arrayBuffer());

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/png');
		expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
	});

	it.each(['de-home.png', 'sl-nope.png', 'sl-home.jpg'])('answers 404 for %s', async (image) => {
		expect((await get(image)).status).toBe(404);
	});
});
