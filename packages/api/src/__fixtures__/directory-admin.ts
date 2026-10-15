// C18 §Admin, wire-shaped. SAMPLE data (shelters, phones, people, dates), not the real directory.
export const adminShelters = {
	items: [
		{
			slug: 'zavetisce-lipa',
			name: 'Zavetišče Lipa',
			address: 'Lipova ulica 4',
			postal_code: '1000',
			city: 'Ljubljana',
			phone: '+38612345678',
			phone_display: '01 234 56 78',
			email: 'info@lipa.example',
			website: 'https://lipa.example',
			opening_hours: [
				{ days: 'mon-fri', from: '08:00', to: '15:00' },
				{ days: 'sat', from: '', to: '', closed: true },
			],
			source: 'Spletna stran',
			verified_at: '2025-02-03',
			version: 3,
		},
		{
			slug: 'zavetisce-ob-kolpi',
			name: 'Zavetišče Ob Kolpi',
			address: 'Kolpska cesta 12',
			postal_code: '8340',
			city: 'Črnomelj',
			phone: '+38673056241',
			phone_display: '07 305 62 41',
			email: null,
			opening_hours: [{ days: 'mon-fri', from: '08:00', to: '16:00' }],
			source: 'Klic',
			verified_at: '2026-06-02',
			version: 2,
		},
		{
			slug: 'zavetisce-soncni-log',
			name: 'Zavetišče Sončni Log',
			address: 'Sončna pot 1',
			postal_code: '2000',
			city: 'Maribor',
			phone: '+38628704560',
			phone_display: '02 870 45 60',
			email: null,
			opening_hours: [],
			source: 'Klic',
			verified_at: '2026-05-04',
			version: 1,
		},
	],
};

export const adminMunicipalities = {
	items: [
		{
			slug: 'borovnica',
			name: 'Borovnica',
			shelter_slug: 'zavetisce-lipa',
			status: 'CONFIRMED',
			source: 'Spletna stran',
			verified_at: '2025-02-03',
			version: 1,
		},
		{
			slug: 'ljubljana',
			name: 'Ljubljana',
			shelter_slug: 'zavetisce-lipa',
			status: 'CONFIRMED',
			source: 'Spletna stran',
			verified_at: '2026-03-12',
			version: 2,
		},
		{
			slug: 'crnomelj',
			name: 'Črnomelj',
			shelter_slug: 'zavetisce-ob-kolpi',
			status: 'CONFIRMED',
			source: 'Klic',
			verified_at: '2026-06-02',
			version: 1,
		},
		{
			slug: 'bloke',
			name: 'Bloke',
			shelter_slug: 'zavetisce-ob-kolpi',
			status: 'UNCONFIRMED',
			source: 'Klic',
			verified_at: '2026-04-01',
			version: 1,
		},
		{
			slug: 'bistrica-ob-sotli',
			name: 'Bistrica ob Sotli',
			shelter_slug: null,
			status: 'UNCONFIRMED',
			source: 'Klic na občino',
			verified_at: '2026-06-02',
			version: 1,
		},
	],
};

const { opening_hours: hours, ...lipa } = adminShelters.items[0]!;

/** History of Zavetišče Lipa, newest first. */
export const shelterHistory = {
	items: [
		{
			id: 'c3',
			version: 3,
			data: { ...lipa, opening_hours: hours },
			source: 'Spletna stran',
			actor: { display_name: 'Rok Bizjak' },
			created_at: '2025-02-03T10:14:00Z',
		},
		{
			id: 'c2',
			version: 2,
			data: {
				...lipa,
				phone: '+38612345670',
				phone_display: '01 234 56 70',
				email: null,
				opening_hours: [{ days: 'mon-fri', from: '08:00', to: '16:00' }],
				verified_at: '2024-10-13',
			},
			source: 'Uvoz CSV',
			actor: { display_name: 'Maja Kovač' },
			created_at: '2024-10-13T07:40:00Z',
		},
		{
			id: 'c1',
			version: 1,
			data: { ...lipa, phone_display: '01 234 56 70', email: null, opening_hours: [], verified_at: '2024-09-02' },
			source: 'Seed',
			actor: null,
			created_at: '2024-09-02T06:30:00Z',
		},
	],
};

export const importWithErrors = {
	changes: [
		{ entity: 'shelter', label: 'Zavetišče Ob Krki', before: null, after: { name: 'Zavetišče Ob Krki' } },
		{
			entity: 'shelter',
			label: 'Zavetišče Lipa',
			before: { phone_display: '01 234 56 70' },
			after: { phone_display: '01 234 56 78' },
		},
		{
			entity: 'municipality_shelter',
			label: 'Bloke',
			before: { status: 'UNCONFIRMED' },
			after: { status: 'CONFIRMED' },
		},
	],
	errors: [
		{ row: 14, field: 'phone' },
		{ row: 31, field: 'source' },
	],
};

export const importClean = { changes: importWithErrors.changes, errors: [] };
