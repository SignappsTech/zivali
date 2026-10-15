// TASK-6.8: abuse, payments, ads, leads and organisations tables (C11, C13, C14): database checks and seeder 30-commerce.
import { describe, expect, it } from 'vitest';

import type { Prisma } from '../../generated/client.ts';
import { AD_SLOT } from '../../generated/enums.ts';
import seedCommerce, { houseAds, SEED_SHELTER_ID, sponsorAds } from '../../prisma/seeders/30-commerce.seeder.ts';
import { prisma } from '../../prisma/prisma.ts';

const ad = (over: Partial<Prisma.adsCreateInput> = {}): Prisma.adsCreateInput => ({
	title: 'Test',
	body: 'Test body',
	cta: 'Go',
	link_url: 'https://example.com',
	image_alt: 'A dog on a lead',
	slots: ['FEED'],
	...over,
});

describe('commerce schema checks', () => {
	it('has AD_SLOT with exactly FEED, DETAIL, REUNITED and SIDEBAR', async () => {
		const [row] = await prisma.$queryRaw<{ values: string[] }[]>`
			select enum_range(null::app."AD_SLOT")::text[] as values`;
		expect(row.values).toEqual(['FEED', 'DETAIL', 'REUNITED', 'SIDEBAR']);
		expect(Object.values(AD_SLOT)).toEqual(row.values);
	});

	it.each([
		['an http link', { link_url: 'http://example.com' }, 'ads_link_url_check'],
		['a javascript link', { link_url: 'javascript:alert(1)' }, 'ads_link_url_check'],
		['alt text under 5 characters', { image_alt: 'Dog' }, 'ads_image_alt_check'],
		['alt text over 140 characters', { image_alt: 'a'.repeat(141) }, 'ads_image_alt_check'],
		['no slot', { slots: [] }, 'ads_slots_check'],
		['an unknown species', { species: ['rabbit'] }, 'ads_species_check'],
		['an unknown status', { status: 'blocked' }, 'ads_status_check'],
	])('rejects an ad with %s', async (_, over, check) => {
		await expect(prisma.ads.create({ data: ad(over) })).rejects.toThrow(check);
	});

	it('accepts alt text of 5 and 140 characters', async () => {
		const ids = [];
		for (const image_alt of ['a'.repeat(5), 'a'.repeat(140)]) {
			ids.push((await prisma.ads.create({ data: ad({ image_alt }) })).id);
		}
		await prisma.ads.deleteMany({ where: { id: { in: ids } } });
	});

	it('rejects payments under EUR 2.00, in another currency or from an unknown provider', async () => {
		const payment = { user_id: SEED_SHELTER_ID, purpose: 'TIP' as const, amount_cents: 500, provider: 'mock' };
		const cases: [Prisma.paymentsUncheckedCreateInput, string][] = [
			[{ ...payment, amount_cents: 199 }, 'payments_amount_cents_check'],
			[{ ...payment, currency: 'USD' }, 'payments_currency_check'],
			[{ ...payment, provider: 'paypal' }, 'payments_provider_check'],
		];
		for (const [data, check] of cases) {
			await expect(prisma.payments.create({ data })).rejects.toThrow(check);
		}
	});

	it('rejects abuse reports and leads outside the allowed values', async () => {
		const report = { reporter_id: SEED_SHELTER_ID, target_id: SEED_SHELTER_ID, reason: 'SPAM' as const };
		await expect(prisma.abuse_reports.create({ data: { ...report, target_type: 'pet' } })).rejects.toThrow(
			'abuse_reports_target_type_check'
		);
		await expect(
			prisma.abuse_reports.create({ data: { ...report, target_type: 'report', note: 'x'.repeat(501) } })
		).rejects.toThrow('too long');
		const lead = { company: 'C', contact_name: 'N', email: 'n@example.com', message: 'Hi', consent_at: new Date() };
		await expect(prisma.leads.create({ data: { ...lead, interest: 'other' } })).rejects.toThrow(
			'leads_interest_check'
		);
	});
});

describe('seeder 30-commerce', () => {
	it('creates the house ads, the sponsor ads and a verified shelter, idempotently', async () => {
		await seedCommerce();
		await seedCommerce();

		const house = await prisma.ads.findMany({
			where: { is_house: true, id: { in: houseAds.map((a) => a.id!) } },
			select: { house_kind: true, locales: true, slots: true, status: true, link_url: true },
		});
		expect(house).toHaveLength(6);
		for (const kind of ['supporter', 'partner', 'adopt']) {
			expect(
				house
					.filter((a) => a.house_kind === kind)
					.flatMap((a) => a.locales)
					.sort()
			).toEqual(['en', 'sl']);
		}
		for (const a of house) {
			expect(a).toMatchObject({ status: 'active', slots: ['FEED', 'DETAIL', 'REUNITED', 'SIDEBAR'] });
		}

		const sponsors = await prisma.ads.findMany({
			where: { id: { in: sponsorAds.map((a) => a.id!) } },
			select: { is_house: true, region_ids: true, species: true },
			orderBy: { id: 'asc' },
		});
		expect(sponsors).toEqual([
			{ is_house: false, region_ids: [8], species: ['dog'] },
			{ is_house: false, region_ids: [2], species: ['cat'] },
		]);

		const shelter = await prisma.organisations.findUniqueOrThrow({
			where: { id: SEED_SHELTER_ID },
			include: { members: { select: { role: true } } },
		});
		expect(shelter).toMatchObject({ kind: 'SHELTER', municipality_id: 61, members: [{ role: 'ADMIN' }] });
		expect(shelter.verified_at).toBeInstanceOf(Date);
	});

	it('keeps admin edits to house ads on a rerun', async () => {
		const id = houseAds[0].id!;
		await prisma.ads.update({ where: { id }, data: { title: 'Edited by an admin' } });
		await seedCommerce();
		expect((await prisma.ads.findUniqueOrThrow({ where: { id } })).title).toBe('Edited by an admin');
		await prisma.ads.update({ where: { id }, data: { title: houseAds[0].title } });
	});
});
