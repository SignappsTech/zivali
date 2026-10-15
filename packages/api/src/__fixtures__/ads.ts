// C14 examples (wire shape): a served ad, partner stats, a lead.
import type { Ad, LeadInput, PartnerStats } from '@zivali/types';

/** GET /v1/ads/slot/detail?region_id=8&species=dog&locale=sl */
export const ad: Ad = {
	id: 'ad7e1f2a-0000-4000-8000-000000000001',
	title: 'Dežurni veterinar 24/7',
	body: 'Nujna pomoč za pse in mačke, vse dni v letu.',
	cta: 'Pokliči',
	image_url: 'https://media.example.test/ad-images/ad7/1.webp',
	image_alt: 'Veterinarka pregleduje psa',
	click_url: 'http://localhost:4000/v1/ads/ad7e1f2a-0000-4000-8000-000000000001/click?s=detail&r=8',
	is_house: false,
	label: 'Oglas',
};

export const partnerStats: PartnerStats = {
	generated_at: '2026-10-15T06:00:00Z',
	pilot: true,
	totals: { users: 1240, active_reports: 86, reunions_90d: 31 },
	by_region: [
		{ region_slug: 'osrednjeslovenska', users: 610, active_reports: 42, reunions_90d: 17 },
		{ region_slug: 'koroska', users: 38, active_reports: '<5', reunions_90d: 0 },
	],
};

export const lead: LeadInput = {
	company: 'Veterina Bežigrad d.o.o.',
	contact_name: 'Ana Novak',
	email: 'ana@example.test',
	interest: 'vet_partner',
	message: 'Zanima nas oglaševanje v osrednjeslovenski regiji.',
	consent: true,
	captcha_token: 'mock-ok',
	locale: 'sl',
};
