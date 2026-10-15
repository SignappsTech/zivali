// TASK-6.8: abuse, payments, ads, leads and organisations tables (C11, C13, C14): database checks, foreign keys and
// seeder 30-commerce.
import { randomUUID } from 'node:crypto';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Prisma } from '../../generated/client.ts';
import { AD_SLOT } from '../../generated/enums.ts';
import { fixtureUsers } from '../../prisma/seeders/00-users.seeder.ts';
import seedGeo from '../../prisma/seeders/01-geo.seeder.ts';
import seedCommerce, { houseAds, SEED_SHELTER_ID, sponsorAds } from '../../prisma/seeders/30-commerce.seeder.ts';
import { prisma } from '../../prisma/prisma.ts';

const fixture = (email: string) => fixtureUsers.find((user) => user.email === email)!;
const SHELTER_USER = fixture('shelter@zivali.test').id;

// The seeder's local fixtures need the fixture profiles (only the rows: 00-users needs Supabase Auth) and 01-geo.
beforeAll(async () => {
	if (!(await prisma.municipalities.count())) await seedGeo();
	for (const { id, display_name, role } of [fixture('admin@zivali.test'), fixture('shelter@zivali.test')]) {
		await prisma.profiles.upsert({ where: { id }, create: { id, display_name, role }, update: {} });
	}
});

const ad = (over: Partial<Prisma.adsUncheckedCreateInput> = {}): Prisma.adsUncheckedCreateInput => ({
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

	it('rejects an ad without slots (null)', async () => {
		const { slots: _, ...noSlots } = ad();
		await expect(prisma.ads.create({ data: noSlots })).rejects.toThrow('Null constraint violation');
	});

	it('accepts alt text of 5 and 140 characters', async () => {
		const ids = [];
		for (const image_alt of ['a'.repeat(5), 'a'.repeat(140)]) {
			ids.push((await prisma.ads.create({ data: ad({ image_alt }) })).id);
		}
		await prisma.ads.deleteMany({ where: { id: { in: ids } } });
	});

	it('rejects payments under EUR 2.00, in another currency or from an unknown provider', async () => {
		const payment = { user_id: SHELTER_USER, purpose: 'TIP' as const, amount_cents: 500, provider: 'mock' };
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
		const report = { reporter_id: SHELTER_USER, target_id: randomUUID(), reason: 'SPAM' as const };
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

	it('keeps one payment event per provider event id, as a redacted summary only', async () => {
		const provider_event_id = `evt_test_${randomUUID()}`;
		const summary = {
			id: provider_event_id,
			type: 'checkout.session.completed',
			object_id: 'cs_test_1',
			payment_intent: 'pi_test_1',
			amount: 500,
			currency: 'eur',
			status: 'complete',
			livemode: false,
		};
		const event = { provider: 'stripe', provider_event_id, type: summary.type, summary };
		await prisma.payment_events.create({ data: event });
		await expect(prisma.payment_events.create({ data: event })).rejects.toThrow('provider_event_id');
		const raw = {
			...summary,
			customer_details: { email: 'buyer@example.com' },
			card: { brand: 'visa', last4: '4242' },
		};
		await expect(
			prisma.payment_events.create({
				data: { ...event, provider_event_id: `${provider_event_id}_raw`, summary: raw },
			})
		).rejects.toThrow('payment_events_summary_keys_check');
		await prisma.payment_events.deleteMany({ where: { provider_event_id } });
	});
});

describe('commerce foreign keys', () => {
	it('rejects rows that point at an unknown profile or municipality', async () => {
		const ghost = randomUUID();
		const org = await prisma.organisations.create({ data: { kind: 'VET', name: 'Ambulanta (test)' } });
		const cases: [() => Promise<unknown>, string][] = [
			[
				() =>
					prisma.payments.create({
						data: { user_id: ghost, purpose: 'TIP', amount_cents: 500, provider: 'mock' },
					}),
				'payments_user_id_fkey',
			],
			[
				() =>
					prisma.abuse_reports.create({
						data: { reporter_id: ghost, target_type: 'report', target_id: randomUUID(), reason: 'SPAM' },
					}),
				'abuse_reports_reporter_id_fkey',
			],
			[() => prisma.ads.create({ data: ad({ created_by: ghost }) }), 'ads_created_by_fkey'],
			[
				() => prisma.organisation_members.create({ data: { organisation_id: org.id, user_id: ghost } }),
				'organisation_members_user_id_fkey',
			],
			[
				() => prisma.organisations.create({ data: { kind: 'VET', name: 'Nowhere', municipality_id: 999 } }),
				'organisations_municipality_id_fkey',
			],
		];
		for (const [insert, fkey] of cases) await expect(insert()).rejects.toThrow(fkey);
		await prisma.organisations.delete({ where: { id: org.id } });
	});

	it('deletes the abuse reports and memberships of a deleted profile and anonymises its payments and ads', async () => {
		const { id: user_id } = await prisma.profiles.create({ data: { id: randomUUID() } });
		const org = await prisma.organisations.create({
			data: { kind: 'VET', name: 'Ambulanta (test)', members: { create: { user_id } } },
		});
		const report = await prisma.abuse_reports.create({
			data: { reporter_id: user_id, target_type: 'profile', target_id: randomUUID(), reason: 'SPAM' },
		});
		const payment = await prisma.payments.create({
			data: { user_id, purpose: 'TIP', amount_cents: 500, provider: 'mock' },
		});
		const created = await prisma.ads.create({ data: ad({ created_by: user_id }) });

		await prisma.profiles.delete({ where: { id: user_id } });

		expect(await prisma.abuse_reports.findUnique({ where: { id: report.id } })).toBeNull();
		expect(await prisma.organisation_members.count({ where: { user_id } })).toBe(0);
		expect(await prisma.payments.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ user_id: null });
		expect(await prisma.ads.findUniqueOrThrow({ where: { id: created.id } })).toMatchObject({ created_by: null });

		await prisma.payments.delete({ where: { id: payment.id } });
		await prisma.ads.delete({ where: { id: created.id } });
		await prisma.organisations.delete({ where: { id: org.id } });
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
			include: { members: { select: { role: true, user_id: true } } },
		});
		expect(shelter).toMatchObject({
			kind: 'SHELTER',
			municipality_id: 61,
			members: [{ role: 'ADMIN', user_id: SHELTER_USER }],
		});
		expect(shelter.verified_at).toBeInstanceOf(Date);
	});

	it('seeds only the house ads without the fixture profiles', async () => {
		const count = vi.spyOn(prisma.profiles, 'count').mockResolvedValueOnce(0);
		const createMany = vi.spyOn(prisma.ads, 'createMany');
		const upsert = vi.spyOn(prisma.organisations, 'upsert');
		try {
			await seedCommerce();
			expect(createMany).toHaveBeenCalledExactlyOnceWith({ data: houseAds, skipDuplicates: true });
			expect(upsert).not.toHaveBeenCalled();
		} finally {
			for (const spy of [count, createMany, upsert]) spy.mockRestore();
		}
	});

	it('keeps admin edits to house ads on a rerun', async () => {
		const id = houseAds[0].id!;
		await prisma.ads.update({ where: { id }, data: { title: 'Edited by an admin' } });
		await seedCommerce();
		expect((await prisma.ads.findUniqueOrThrow({ where: { id } })).title).toBe('Edited by an admin');
		await prisma.ads.update({ where: { id }, data: { title: houseAds[0].title } });
	});
});
