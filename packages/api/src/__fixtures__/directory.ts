// C18 examples, wire-shaped.
export const ljubljanaShelter = {
	slug: 'zavetisce-ljubljana',
	name: 'Zavetišče Ljubljana',
	address: 'Cesta 1',
	postal_code: '1000',
	city: 'Ljubljana',
	phone: '+38612345678',
	phone_display: '01 234 56 78',
	opening_hours: [{ days: 'mon-sun', from: '10:00', to: '18:00' }],
	source: 'UVHVVR 2026-09',
	verified_at: '2026-10-01',
};

export const responsibleConfirmed = {
	status: 'confirmed',
	municipality: { slug: 'ljubljana', name: 'Ljubljana' },
	shelter: ljubljanaShelter,
};

export const responsibleLikely = {
	status: 'likely',
	municipality: { slug: 'kocevje', name: 'Kočevje' },
	likely_shelter: {
		slug: 'zavetisce-ljubljana',
		name: 'Zavetišče Ljubljana',
		phone: '+38612345678',
		distance_km: 62.4,
	},
};

export const responsibleUnconfirmed = {
	status: 'unconfirmed',
	municipality: { slug: 'osilnica', name: 'Osilnica' },
	nearest: [
		{ slug: 'zavetisce-ljubljana', name: 'Zavetišče Ljubljana', distance_km: 71.2 },
		{ slug: 'zavetisce-kocevje', name: 'Zavetišče Kočevje', distance_km: 18.9 },
	],
};

export const responsibleOutside = { status: 'outside_slovenia' };

export const shelterList = {
	items: [
		{ slug: 'zavetisce-ljubljana', name: 'Zavetišče Ljubljana', city: 'Ljubljana', phone_display: '01 234 56 78' },
	],
};

export const shelterPage = { ...ljubljanaShelter, municipalities: [{ slug: 'ljubljana', name: 'Ljubljana' }] };

export const municipalityList = {
	items: [
		{ slug: 'ljubljana', name: 'Ljubljana', shelter_slug: 'zavetisce-ljubljana' },
		{ slug: 'osilnica', name: 'Osilnica', shelter_slug: null },
	],
};
