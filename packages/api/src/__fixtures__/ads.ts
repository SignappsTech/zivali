// C14 examples (wire shape): a served ad, admin ads with stats and history, partner stats, a lead and stored leads.
import type {
	Ad,
	AdminAd,
	AdminAdList,
	AdminLeadList,
	AdStats,
	AuditLogList,
	LeadInput,
	PartnerStats,
} from '@zivali/types';

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

/** GET /v1/admin/leads: stored leads, newest first (the second chose "all of Slovenia", no phone). */
export const adminLeads: AdminLeadList = {
	items: [
		{
			id: '1ead0000-0000-4000-8000-000000000002',
			company: lead.company,
			contact_name: lead.contact_name,
			email: lead.email,
			phone: '+386 1 234 56 78',
			region_interest: 'osrednjeslovenska',
			interest: 'vet_partner',
			message: lead.message,
			consent_at: '2026-10-18T09:15:00Z',
			status: 'new',
			created_at: '2026-10-18T09:15:01Z',
		},
		{
			id: '1ead0000-0000-4000-8000-000000000001',
			company: 'Pasja hrana Repek d.o.o.',
			contact_name: 'Marko Kranjc',
			email: 'marko@example.test',
			phone: null,
			region_interest: null,
			interest: 'ad',
			message: 'Radi bi oglaševali po vsej Sloveniji.',
			consent_at: '2026-10-12T16:40:00Z',
			status: 'new',
			created_at: '2026-10-12T16:40:02Z',
		},
	],
	next_cursor: null,
};

const sponsor = (id: string, ad: Partial<AdminAd>): AdminAd => ({
	id,
	title: '',
	body: '',
	cta: '',
	link_url: 'https://repek.si/jesen',
	image_url: null,
	image_alt: 'Pes z igračo ob polni skodelici hrane',
	locales: ['sl', 'en'],
	slots: ['detail'],
	region_ids: null,
	municipality_ids: null,
	species: null,
	starts_at: null,
	ends_at: null,
	status: 'draft',
	is_house: false,
	house_kind: null,
	exclusive: false,
	weight: 1,
	created_at: '2026-09-28T14:12:00Z',
	updated_at: '2026-10-15T12:32:00Z',
	...ad,
});
const house = (n: number, ad: Partial<AdminAd>): AdminAd =>
	sponsor(`00000000-0000-4000-a000-${String(n).padStart(12, '0')}`, {
		slots: ['feed', 'detail', 'reunited', 'sidebar'],
		status: 'active',
		is_house: true,
		...ad,
	});

/** GET /v1/admin/ads (TASK-37.2): running, scheduled, draft and ended sponsor ads on 15. 10. 2026, then the house ads. */
export const adminAds: AdminAdList = {
	items: [
		sponsor('ad7e1f2a-0000-4000-8000-000000000011', {
			title: 'Repek: hrana in igrače za pse in mačke',
			body: 'Za nakupe nad 25 € je dostava po vsej Sloveniji brezplačna do konca oktobra.',
			image_url: 'https://media.example.test/ads/ad7e1f2a-0000-4000-8000-000000000011/1.jpg',
			slots: ['detail', 'sidebar'],
			region_ids: [8, 9],
			species: ['dog', 'cat'],
			starts_at: '2026-09-30T22:00:00Z',
			ends_at: '2026-10-31T23:00:00Z',
			status: 'active',
			exclusive: true,
		}),
		sponsor('ad7e1f2a-0000-4000-8000-000000000012', {
			title: 'Hotel Mijav: zimska ponudba',
			body: 'Varstvo za mačke med prazniki, z dnevnimi fotografijami.',
			cta: 'Rezerviraj',
			link_url: 'https://mijav.si',
			image_alt: 'Mačka v košari ob oknu',
			slots: ['sidebar'],
			starts_at: '2026-10-31T23:00:00Z',
			ends_at: '2026-11-30T23:00:00Z',
			status: 'active',
		}),
		sponsor('ad7e1f2a-0000-4000-8000-000000000013', {
			title: 'Salon Šapa: striženje psov',
			body: 'Striženje in kopanje za vse pasme, tudi ob sobotah.',
			slots: ['feed'],
			region_ids: [2],
			municipality_ids: [70],
			species: ['dog'],
		}),
		sponsor('ad7e1f2a-0000-4000-8000-000000000014', {
			title: 'Pasja šola Vižmarje: poletni tečaj',
			body: 'Tečaj za mladičke ob sobotah dopoldne.',
			slots: ['detail'],
			starts_at: '2026-06-30T22:00:00Z',
			ends_at: '2026-08-31T22:00:00Z',
			status: 'ended',
		}),
		house(101, {
			house_kind: 'supporter',
			locales: ['sl'],
			title: 'Podprite Najdimo',
			body: 'Najdimo je brezplačen za vse. Z majhnim prispevkom pomagate, da tako tudi ostane.',
			cta: 'Podprite nas',
			link_url: 'https://najdimo.si/o-nas',
			image_alt: 'Pes in mačka skupaj na kavču',
		}),
		house(102, {
			house_kind: 'supporter',
			locales: ['en'],
			title: 'Support Najdimo',
			body: 'Najdimo is free for everyone. A small contribution helps keep it that way.',
			cta: 'Support us',
			link_url: 'https://najdimo.si/en/about',
			image_alt: 'A dog and a cat together on a sofa',
			status: 'paused',
		}),
		house(103, {
			house_kind: 'partner',
			locales: ['sl'],
			title: 'Oglašujte pri nas',
			body: 'Dosezite lastnike psov in mačk v svoji regiji.',
			cta: 'Več o oglaševanju',
			link_url: 'https://najdimo.si/oglasevanje',
			image_alt: 'Lastnica s psom pred veterinarsko ambulanto',
		}),
		house(104, {
			house_kind: 'partner',
			locales: ['en'],
			title: 'Advertise with us',
			body: 'Reach dog and cat owners in your region.',
			cta: 'Learn more',
			link_url: 'https://najdimo.si/en/advertise',
			image_alt: 'A woman with her dog outside a vet clinic',
		}),
		house(105, {
			house_kind: 'adopt',
			locales: ['sl'],
			title: 'Posvojite žival iz zavetišča',
			body: 'V zavetiščih po Sloveniji psi in mačke čakajo na nov dom.',
			cta: 'Poiščite zavetišče',
			link_url: 'https://najdimo.si/zavetisca',
			image_alt: 'Mačka v zavetišču gleda v kamero',
		}),
		house(106, {
			house_kind: 'adopt',
			locales: ['en'],
			title: 'Adopt from a shelter',
			body: 'Dogs and cats in shelters across Slovenia are waiting for a new home.',
			cta: 'Find a shelter',
			link_url: 'https://najdimo.si/en/shelters',
			image_alt: 'A shelter cat looking at the camera',
		}),
	],
	next_cursor: null,
};

/** GET /v1/admin/ads/:id/stats for the running ad: two days, two slots, two regions and the unknown one (null). */
export const adStats: AdStats = {
	items: [
		{
			day: '2026-10-13',
			slot: 'detail',
			region_slug: 'osrednjeslovenska',
			impressions: 640,
			clicks: 16,
			ctr: 0.025,
		},
		{ day: '2026-10-13', slot: 'sidebar', region_slug: 'gorenjska', impressions: 210, clicks: 3, ctr: 0.0143 },
		{
			day: '2026-10-14',
			slot: 'detail',
			region_slug: 'osrednjeslovenska',
			impressions: 700,
			clicks: 14,
			ctr: 0.02,
		},
		{ day: '2026-10-14', slot: 'sidebar', region_slug: null, impressions: 4, clicks: 0, ctr: 0 },
	],
};

/** GET /v1/admin/audit-log?target_type=ad&target_id=<the running ad> */
export const adHistory: AuditLogList = {
	items: [
		{
			id: '7f3c1a2e-9b4d-4e6f-8a1c-2d3e4f5a6b81',
			actor_id: '1b9c6f4e-2d1a-4c8e-9f3b-5a7d2e8c1f00',
			action: 'ad.update',
			target_type: 'ad',
			target_id: 'ad7e1f2a-0000-4000-8000-000000000011',
			diff: { from: { exclusive: false }, to: { exclusive: true } },
			created_at: '2026-10-15T12:32:00Z',
		},
		{
			id: '7f3c1a2e-9b4d-4e6f-8a1c-2d3e4f5a6b80',
			actor_id: '1b9c6f4e-2d1a-4c8e-9f3b-5a7d2e8c1f00',
			action: 'ad.create',
			target_type: 'ad',
			target_id: 'ad7e1f2a-0000-4000-8000-000000000011',
			diff: null,
			created_at: '2026-09-28T14:12:00Z',
		},
	],
	next_cursor: null,
};
