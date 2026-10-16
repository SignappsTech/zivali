import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import { getConsent, track } from '@zivali/analytics';
import { pet } from '@zivali/api/__fixtures__/pets';
import { createMockApi, type MockRequest, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import { LostFlow } from '@/components/report-lost/lost-flow';

const t = sl.report_lost;

jest.mock('expo-crypto', () => {
	let n = 0;
	return { randomUUID: () => `5b1e28ba-2fa1-4d3b-a3f5-ef19b5a7633${n++}` };
});
const mockRouter = { replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
// false while the auth screens are on top of the flow.
const mockScreen = { focused: true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useIsFocused: () => mockScreen.focused }));
jest.mock('@zivali/analytics', () => ({ track: jest.fn(), getConsent: jest.fn(() => null) }));

// The test renderer has no native nodes to focus: record which mounts ask for the screen reader focus.
const mockFocus = jest.fn();
jest.mock('@rn-primitives/hooks', () => {
	const { useEffect, useRef } = jest.requireActual<typeof import('react')>('react');
	return {
		...jest.requireActual('@rn-primitives/hooks'),
		useAccessibilityFocus: (enabled = true) => {
			useEffect(() => mockFocus(enabled), [enabled]);
			return useRef(null);
		},
	};
});
const mockAuth = { gate: 'ok', me: { phone: null } as { phone: string | null } | null };
jest.mock('@zivali/api/auth', () => ({ useRequireAuth: () => mockAuth }));
jest.mock('@zivali/api/geocode', () => ({
	useReversePlaceQuery: () => ({ currentData: { label: 'Šiška, Ljubljana' } }),
}));
jest.mock('@/components/auth/parts', () => ({
	useErrorText: () => (error: { data?: { code?: string } }) => `errors.${error.data?.code}`,
}));

// The sign-in gate (P16, TASK-9.4) as a marker that can sign in.
jest.mock('@/components/auth/gate', () => {
	const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
	const { createElement } = jest.requireActual<typeof import('react')>('react');
	return {
		AuthGate: ({ open, title, onReady }: { open: boolean; title: string; onReady: () => void }) =>
			open
				? createElement(Pressable, { role: 'button', onPress: onReady }, createElement(Text, null, title))
				: null,
	};
});

// PhotoPicker (TASK-14.3) adds an uploaded photo, or keeps it on the device while held; the tests play its uploads
// through `mockPicker.onChange`. LocationPicker (TASK-15.5) confirms an already coarsened point.
const COARSE = { lat: 46.07012, lng: 14.48771 };
const photo = { key: 'k1', photoId: 'ph-1', status: 'uploaded', progress: 1, thumb: { uri: 'file:///t1.jpg' } };
const mockPicker: { hold?: boolean; onChange?: (photos: unknown[]) => void } = {};
jest.mock('@/components/photos/photo-picker', () => {
	const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
	const { createElement } = jest.requireActual<typeof import('react')>('react');
	return {
		PhotoPicker: ({ onChange, hold }: { onChange: (photos: unknown[]) => void; hold?: boolean }) => {
			Object.assign(mockPicker, { hold, onChange });
			const kept = { ...photo, photoId: undefined, status: 'kept', progress: 0 };
			return createElement(
				Pressable,
				{ role: 'button', onPress: () => onChange([hold ? kept : photo]) },
				createElement(Text, null, 'Fotografiraj')
			);
		},
	};
});
const mockClearPhotos = jest.fn(async (_draft: string) => {});
jest.mock('@/components/photos/use-photo-uploads', () => ({
	clearPhotoDraft: (draft: string) => mockClearPhotos(draft),
}));
jest.mock('@/components/location/location-picker', () => {
	const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
	const { createElement } = jest.requireActual<typeof import('react')>('react');
	return {
		LocationPicker: ({ onChange }: { onChange: (value: object) => void }) =>
			createElement(
				Pressable,
				{ role: 'button', onPress: () => onChange({ point: COARSE, radiusM: 750, source: 'pin' }) },
				createElement(Text, null, 'Potrdi kraj')
			),
	};
});

// The drafts table (C17) in memory.
const mockDrafts = new Map<string, { data: string; updated_at: number }>();
jest.mock('@/lib/db', () => ({
	getDb: async () => ({
		getFirstAsync: async (_sql: string, id: string) => mockDrafts.get(id) ?? null,
		runAsync: async (sql: string, id: string, data?: string, at?: number) => {
			if (sql.startsWith('delete')) mockDrafts.delete(id);
			else mockDrafts.set(id, { data: data!, updated_at: at! });
		},
	}),
}));

let routes: Record<string, unknown> = {};
let calls: MockRequest[] = [];
const created = { id: 'r1', short_code: 'Hk3vT9qP', moderation_state: 'visible', warnings: [] };

async function renderFlow() {
	const client = createMockApi({
		'GET /v1/pets': () => ({ items: [pet] }),
		'POST /v1/reports': () => created,
		...routes,
	});
	calls = client.calls;
	const store = createApiStore(client);
	const ui = () => (
		<Provider store={store}>
			<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				<LostFlow />
				<PortalHost />
			</IntlProvider>
		</Provider>
	);
	const view = await render(ui());
	return { rerender: () => view.rerender(ui()) };
}

const eur = (n: number) =>
	new Intl.NumberFormat('sl', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const next = () => press(t.next);
const bars = () => screen.getByRole('progressbar');
const posted = () => calls.filter((call) => call.method === 'POST' && call.path === '/v1/reports');
const offline = () => {
	throw new TypeError('Network request failed');
};

/** From step 1 to the review with the saved pet Runo (bars: 6). */
async function toReviewWithSavedPet() {
	await renderFlow();
	await fireEvent.press(await screen.findByRole('radio', { name: /Runo · Pes/ }));
	await next();
	await press('Fotografiraj');
	await next();
	await press('Potrdi kraj');
	await next(); // when: Pravkar
	await next(); // what
	await screen.findByRole('heading', { name: t.review_title });
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
	mockDrafts.clear();
	routes = {};
	mockAuth.gate = 'ok';
	mockAuth.me = { phone: null };
	mockScreen.focused = true;
});

describe('report lost flow (P6)', () => {
	test('a saved pet: six steps, then create_report with the pet, the coarsened point and the photo', async () => {
		await renderFlow();
		expect(track).toHaveBeenCalledWith('report_lost_start');
		expect(screen.getByRole('heading', { name: t.pet_title })).toBeTruthy();
		expect(bars()).toHaveProp('aria-label', 'Korak 1 od 7');

		await fireEvent.press(await screen.findByRole('radio', { name: /Runo · Pes/ }));
		expect(bars()).toHaveProp('aria-label', 'Korak 1 od 6');
		await next();
		expect(screen.getByRole('heading', { name: t.photos_title })).toBeTruthy();
		expect(bars()).toHaveProp('aria-label', 'Korak 2 od 6');

		// No photo yet: the error, and the step stays.
		await next();
		expect(screen.getByText(t.photos_required)).toBeTruthy();
		await press('Fotografiraj');
		expect(screen.queryByText(t.photos_required)).toBeNull();
		await next();

		await press('Potrdi kraj');
		expect(screen.getByRole('heading', { name: t.when_title })).toBeTruthy();
		expect(screen.getByRole('radio', { name: t.when_now })).toBeChecked();
		expect(await screen.findByText(t.draft_saved)).toBeTruthy();
		await next();
		expect(screen.getByRole('heading', { name: t.circumstances_title })).toBeTruthy();
		await next();

		expect(screen.getByRole('heading', { name: t.review_title })).toBeTruthy();
		expect(screen.getByText('Šiška, Ljubljana · Polmer 750 m')).toBeTruthy();
		expect(screen.getByText(t.review_reward_none)).toBeTruthy();
		for (const field of [t.review_photos, t.review_pet, t.review_place, t.review_time, t.review_contact])
			expect(screen.getByRole('button', { name: `Uredi: ${field}` })).toBeTruthy();
		expect(screen.queryByTestId(/ad-slot/i)).toBeNull();

		await press(t.publish);

		await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
		expect(posted()).toHaveLength(1);
		expect(posted()[0]!.body).toMatchObject({
			type: 'lost',
			pet_id: pet.id,
			species: 'dog',
			location: COARSE,
			requested_radius_m: 750,
			contact_pref: 'chat_only',
			photo_ids: ['ph-1'],
			reward_eur: null,
		});
		expect(posted()[0]!.headers['Idempotency-Key']).toBeTruthy();
		expect(mockRouter.replace).toHaveBeenCalledWith({
			pathname: '/report/lost/done',
			params: { code: created.short_code, name: 'Runo' },
		});
		// The draft goes with the send; without consent nothing else is fetched or tracked.
		expect(mockDrafts.size).toBe(0);
		expect(mockClearPhotos).toHaveBeenCalledWith('lost');
		expect(track).not.toHaveBeenCalledWith('report_lost_submit', expect.anything());
	});

	test('a new pet: the details step checks species and colour, then sends them inline', async () => {
		await renderFlow();
		await fireEvent.press(await screen.findByRole('radio', { name: new RegExp(`^${t.pet_other}`) }));
		expect(bars()).toHaveProp('aria-label', 'Korak 1 od 7');
		await next();
		await press('Fotografiraj');
		await next();
		expect(screen.getByRole('heading', { name: t.details_title })).toBeTruthy();

		await next();
		expect(await screen.findByText(t.validation_summary)).toBeTruthy();
		expect(screen.getByText(sl.pets.species_required)).toBeTruthy();
		expect(screen.getByText(t.colour_required)).toBeTruthy();
		expect(screen.getByRole('heading', { name: t.details_title })).toBeTruthy();

		await fireEvent.press(screen.getByRole('radio', { name: 'Pes' }));
		await fireEvent.press(screen.getByRole('checkbox', { name: 'Rjava' }));
		await waitFor(() => expect(screen.queryByText(t.colour_required)).toBeNull());
		await fireEvent.changeText(screen.getByLabelText(sl.pets.name_label), 'Medo');
		await next();
		await press('Potrdi kraj');
		await next();
		await next();
		await press(t.publish);

		await waitFor(() => expect(posted()).toHaveLength(1));
		expect(posted()[0]!.body).toMatchObject({ species: 'dog', name: 'Medo', colours: ['brown'] });
		expect(posted()[0]!.body).not.toHaveProperty('pet_id');
	});

	test('signed out: the draft (fields and photos) waits for sign-in or sign-up, then the same publish sends it', async () => {
		mockAuth.gate = 'signin';
		mockAuth.me = null;
		const view = await renderFlow();
		expect(screen.getAllByRole('radio')).toHaveLength(1);
		await waitFor(() => expect(screen.getByRole('radio', { name: t.pet_enter })).toBeChecked());
		await next();
		// Nothing is sent before sign-in (C3): the photo stays on the device.
		expect(mockPicker.hold).toBe(true);
		await press('Fotografiraj');
		await next();
		await fireEvent.press(screen.getByRole('radio', { name: 'Mačka' }));
		await fireEvent.press(screen.getByRole('checkbox', { name: 'Črna' }));
		await next();
		await press('Potrdi kraj');
		await next();
		await next();
		await press(t.publish);

		expect(await screen.findByText(t.gate_title)).toBeTruthy();
		expect(screen.queryByText(t.photos_wait)).toBeNull();
		expect(calls).toHaveLength(0);
		// Every step was saved in the drafts table (C17), so an app restart on the way keeps it too.
		expect(JSON.parse(mockDrafts.get('lost')!.data)).toMatchObject({
			step: 'review',
			values: { species: 'cat', colours: ['black'], location: COARSE },
		});

		// The account is ready while the auth screens are still on top (sign-up: the email link).
		mockScreen.focused = false;
		mockAuth.gate = 'ok';
		mockAuth.me = { phone: '041000000' };
		await view.rerender();
		await press(t.gate_title);
		expect(mockPicker.hold).toBe(false);
		await act(async () => mockPicker.onChange!([{ ...photo, photoId: undefined, status: 'uploading' }]));
		await act(async () => mockPicker.onChange!([photo]));
		expect(posted()).toHaveLength(0);
		expect(screen.getByRole('button', { name: t.publishing })).toBeTruthy();

		// Back on the flow with the upload done: the report goes out once, with the photo the new account uploaded.
		mockScreen.focused = true;
		await view.rerender();
		await waitFor(() => expect(posted()).toHaveLength(1));
		expect(posted()[0]!.body).toMatchObject({ species: 'cat', colours: ['black'], photo_ids: ['ph-1'] });
		await waitFor(() =>
			expect(mockRouter.replace).toHaveBeenCalledWith({
				pathname: '/report/lost/done',
				params: { code: created.short_code },
			})
		);
		expect(mockDrafts.size).toBe(0);
	});

	test('after sign-in the send waits for the photo upload', async () => {
		mockAuth.gate = 'signin';
		mockAuth.me = null;
		const view = await renderFlow();
		await waitFor(() => expect(screen.getByRole('radio', { name: t.pet_enter })).toBeChecked());
		await next();
		await press('Fotografiraj');
		await next();
		await fireEvent.press(screen.getByRole('radio', { name: 'Pes' }));
		await fireEvent.press(screen.getByRole('checkbox', { name: 'Rjava' }));
		await next();
		await press('Potrdi kraj');
		await next();
		await next();
		await press(t.publish);
		mockAuth.gate = 'ok';
		mockAuth.me = { phone: null };
		await view.rerender();
		await press(t.gate_title);
		await act(async () => mockPicker.onChange!([{ ...photo, photoId: undefined, status: 'uploading' }]));
		expect(posted()).toHaveLength(0);
		await act(async () => mockPicker.onChange!([photo]));
		await waitFor(() => expect(posted()).toHaveLength(1));
	});

	test('when: Danes asks the time, a future date is refused, more than 30 days back only warns', async () => {
		await renderFlow();
		await fireEvent.press(await screen.findByRole('radio', { name: /Runo · Pes/ }));
		await next();
		await press('Fotografiraj');
		await next();
		await press('Potrdi kraj');

		await fireEvent.press(screen.getByRole('radio', { name: t.when_today }));
		expect(screen.getByLabelText(t.when_time).props.value).toMatch(/^\d\d\.\d\d$/);
		expect(screen.queryByLabelText(t.when_date)).toBeNull();

		await fireEvent.press(screen.getByRole('radio', { name: t.when_other }));
		const tomorrow = new Date(Date.now() + 86_400_000);
		await fireEvent.changeText(
			screen.getByLabelText(t.when_date),
			`${tomorrow.getDate()}. ${tomorrow.getMonth() + 1}. ${tomorrow.getFullYear()}`
		);
		await next();
		expect(await screen.findByText(t.when_future)).toBeTruthy();
		expect(screen.getByRole('heading', { name: t.when_title })).toBeTruthy();

		await fireEvent.changeText(screen.getByLabelText(t.when_date), '1. 1. 2020');
		await waitFor(() => expect(screen.queryByText(t.when_future)).toBeNull());
		expect(screen.getByText(t.when_old)).toBeTruthy();
		await next();
		expect(screen.getByRole('heading', { name: t.circumstances_title })).toBeTruthy();
	});

	test('reward (display only): the switch row, the shield note, and the contact-data error from containsContactData()', async () => {
		await renderFlow();
		await fireEvent.press(await screen.findByRole('radio', { name: /Runo · Pes/ }));
		await next();
		await press('Fotografiraj');
		await next();
		await press('Potrdi kraj');
		await next();

		const toggle = screen.getByRole('switch', { name: t.reward_toggle });
		expect(screen.queryByText(t.reward_warning)).toBeNull();
		await fireEvent.press(toggle);
		expect(screen.getByText(t.reward_warning)).toBeTruthy();

		await next();
		expect(await screen.findByText(t.reward_empty)).toBeTruthy();

		await fireEvent.changeText(screen.getByLabelText(t.reward_amount_label), '20000');
		await fireEvent.changeText(screen.getByLabelText(t.reward_note_label), 'Pokličite me na 041 123 456');
		expect(await screen.findByText(t.reward_amount_max.replace('{max}', eur(10_000)))).toBeTruthy();
		expect(screen.getByText(t.reward_note_contact_data)).toBeTruthy();
		expect(screen.queryByText(t.reward_empty)).toBeNull();
		expect(screen.getByText('27/80', { includeHiddenElements: true })).toBeTruthy();
		await next();
		expect(screen.getByRole('heading', { name: t.circumstances_title })).toBeTruthy();

		await fireEvent.changeText(screen.getByLabelText(t.reward_amount_label), '100');
		await fireEvent.changeText(screen.getByLabelText(t.reward_note_label), 'Tudi za podatek');
		await waitFor(() => expect(screen.queryByText(t.reward_note_contact_data)).toBeNull());
		await next();

		expect(screen.getByText(eur(100))).toBeTruthy();
		expect(screen.getByText('Tudi za podatek')).toBeTruthy();
		await press(t.publish);
		await waitFor(() => expect(posted()).toHaveLength(1));
		expect(posted()[0]!.body).toMatchObject({ reward_eur: 100, reward_note: 'Tudi za podatek' });
	});

	test('DUPLICATE_OPEN_REPORT offers to update the open search, and Publish then updates it', async () => {
		routes = {
			'POST /v1/reports': () =>
				mockError('DUPLICATE_OPEN_REPORT', 'open', { report_id: 'r0', short_code: 'Pq7xYz12' }),
			'PATCH /v1/reports/:code': () => ({ short_code: 'Pq7xYz12' }),
		};
		await toReviewWithSavedPet();
		await press(t.publish);

		expect(await screen.findByText(t.duplicate_title)).toBeTruthy();
		expect(screen.getByRole('radio', { name: t.duplicate_update })).toBeChecked();
		await press(t.publish);

		await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
		const patch = calls.find((call) => call.method === 'PATCH')!;
		expect(patch.path).toBe('/v1/reports/Pq7xYz12');
		expect(patch.body).toMatchObject({ location: COARSE, photo_ids: ['ph-1'] });
		expect(patch.body).not.toHaveProperty('type');
	});

	test('"Ustvari novo prijavo" sends the pet inline, without its id', async () => {
		routes = {
			'POST /v1/reports': ({ body }: MockRequest) =>
				(body as { pet_id?: string }).pet_id
					? mockError('DUPLICATE_OPEN_REPORT', 'open', { report_id: 'r0', short_code: 'Pq7xYz12' })
					: created,
		};
		await toReviewWithSavedPet();
		await press(t.publish);
		await fireEvent.press(await screen.findByRole('radio', { name: t.duplicate_new }));
		await press(t.publish);

		await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
		const [first, second] = posted();
		expect(second!.body).not.toHaveProperty('pet_id');
		expect(second!.body).toMatchObject({ name: 'Runo', species: 'dog', colours: ['golden'] });
		// The server answered the first one, so the second is a new submission.
		expect(second!.headers['Idempotency-Key']).not.toBe(first!.headers['Idempotency-Key']);
	});

	test('a network failure keeps the input and the draft; the retry repeats the same Idempotency-Key', async () => {
		let fail = true;
		routes = { 'POST /v1/reports': () => (fail ? offline() : created) };
		await toReviewWithSavedPet();
		await press(t.publish);

		expect(await screen.findByText(t.send_failed)).toBeTruthy();
		expect(mockRouter.replace).not.toHaveBeenCalled();
		expect(JSON.parse(mockDrafts.get('lost')!.data)).toMatchObject({
			step: 'review',
			values: { pet: pet.id, location: COARSE },
		});

		fail = false;
		// "Pravkar" is the clock: a recomputed event_at would differ.
		await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
		await press(t.publish);
		await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
		const [first, second] = posted();
		expect(second!.headers['Idempotency-Key']).toBe(first!.headers['Idempotency-Key']);
		expect(second!.body).toEqual(first!.body);
		expect((second!.body as { event_at: string }).event_at).toBe((first!.body as { event_at: string }).event_at);
	});

	test('editing the input after a network failure is a new submission: a new Idempotency-Key', async () => {
		let fail = true;
		routes = { 'POST /v1/reports': () => (fail ? offline() : created) };
		await toReviewWithSavedPet();
		await press(t.publish);
		expect(await screen.findByText(t.send_failed)).toBeTruthy();

		await press(`Uredi: ${t.review_reward}`);
		await fireEvent.changeText(screen.getByLabelText(t.circumstances_label), 'Pobegnil je na sprehodu');
		await next();
		fail = false;
		await press(t.publish);
		await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
		const [first, second] = posted();
		expect(second!.headers['Idempotency-Key']).not.toBe(first!.headers['Idempotency-Key']);
		expect(second!.body).toMatchObject({ circumstances: 'Pobegnil je na sprehodu' });
	});

	test('a time edit after a network failure takes a new key and the new event_at', async () => {
		let fail = true;
		routes = { 'POST /v1/reports': () => (fail ? offline() : created) };
		await toReviewWithSavedPet();
		await press(t.publish);
		expect(await screen.findByText(t.send_failed)).toBeTruthy();

		await press(`Uredi: ${t.review_time}`);
		await fireEvent.press(screen.getByRole('radio', { name: t.when_other }));
		await fireEvent.changeText(screen.getByLabelText(t.when_date), '1. 1. 2020');
		await next();
		fail = false;
		await press(t.publish);
		await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
		const [first, second] = posted();
		expect(second!.headers['Idempotency-Key']).not.toBe(first!.headers['Idempotency-Key']);
		expect((second!.body as { event_at: string }).event_at).toMatch(/^2020-01-01/);
	});

	test.each([
		['a 5xx', () => mockError('INTERNAL'), true],
		['a 429', () => mockError('RATE_LIMITED', 'x', { retry_after_s: 90 }), true],
		['a 409 in progress', () => mockError('CONFLICT'), true],
		['a definitive 403', () => mockError('FORBIDDEN'), false],
	])('after %s the retry %s the Idempotency-Key', async (_name, failure, same) => {
		let fail = true;
		routes = { 'POST /v1/reports': () => (fail ? failure() : created) };
		await toReviewWithSavedPet();
		await press(t.publish);
		await waitFor(() => expect(posted()).toHaveLength(1));
		await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
		fail = false;
		await press(t.publish);
		await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
		const [first, second] = posted();
		const keys = [first!.headers['Idempotency-Key'], second!.headers['Idempotency-Key']];
		expect(keys[0] === keys[1]).toBe(same);
	});

	test('the open search found for one pet is forgotten when another pet is chosen', async () => {
		const other = { ...pet, id: 'pet-2', name: 'Muri' };
		routes = {
			'GET /v1/pets': () => ({ items: [pet, other] }),
			'POST /v1/reports': ({ body }: MockRequest) =>
				(body as { pet_id?: string }).pet_id === pet.id
					? mockError('DUPLICATE_OPEN_REPORT', 'open', { report_id: 'r0', short_code: 'Pq7xYz12' })
					: created,
		};
		await renderFlow();
		await fireEvent.press(await screen.findByRole('radio', { name: /Runo · Pes/ }));
		await next();
		await press('Fotografiraj');
		await next();
		await press('Potrdi kraj');
		await next();
		await next();
		await press(t.publish);
		expect(await screen.findByText(t.duplicate_title)).toBeTruthy();

		await press(`Uredi: ${t.review_pet}`);
		await fireEvent.press(screen.getByRole('radio', { name: /Muri · Pes/ }));
		await next();
		expect(screen.queryByText(t.duplicate_title)).toBeNull();
		await press(t.publish);
		await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
		expect(calls.some((call) => call.method === 'PATCH')).toBe(false);
		expect(posted()[1]!.body).toMatchObject({ pet_id: 'pet-2' });
	});

	test('a double press starts one publish', async () => {
		routes = { 'POST /v1/reports': () => new Promise((resolve) => setTimeout(() => resolve(created), 50)) };
		await toReviewWithSavedPet();
		const publish = screen.getByRole('button', { name: t.publish });
		await fireEvent.press(publish);
		await fireEvent.press(publish);
		await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
		expect(posted()).toHaveLength(1);
	});

	test('report_lost_submit is not tracked after the duplicate update', async () => {
		jest.mocked(getConsent).mockReturnValue({ v: 1, analytics: true, ts: new Date().toISOString() });
		routes = {
			'POST /v1/reports': () =>
				mockError('DUPLICATE_OPEN_REPORT', 'open', { report_id: 'r0', short_code: 'Pq7xYz12' }),
			'PATCH /v1/reports/:code': () => ({ short_code: 'Pq7xYz12' }),
			'GET /v1/reports/:code': () => ({ short_code: 'Pq7xYz12', species: 'dog' }),
		};
		await toReviewWithSavedPet();
		await press(t.publish);
		await screen.findByText(t.duplicate_title);
		await press(t.publish);
		await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
		expect(track).not.toHaveBeenCalledWith('report_lost_submit', expect.anything());
	});

	test('report_lost_submit fires with consent only, with the region and municipality the API derived', async () => {
		jest.mocked(getConsent).mockReturnValue({ v: 1, analytics: true, ts: new Date().toISOString() });
		routes = {
			[`GET /v1/reports/${created.short_code}`]: () => ({
				short_code: created.short_code,
				species: 'dog',
				region_slug: 'osrednjeslovenska',
				municipality_slug: 'ljubljana',
			}),
		};
		await toReviewWithSavedPet();
		await press(t.publish);

		await waitFor(() =>
			expect(track).toHaveBeenCalledWith('report_lost_submit', {
				report_type: 'lost',
				species: 'dog',
				region: 'osrednjeslovenska',
				municipality: 'ljubljana',
			})
		);
	});

	test('a draft from an earlier visit is offered on open and restored', async () => {
		mockDrafts.set('lost', {
			data: JSON.stringify({ step: 'what', values: { pet: pet.id, location: COARSE, radius_m: 500 } }),
			updated_at: new Date(2026, 9, 15).getTime(),
		});
		await renderFlow();
		expect(await screen.findByText(t.resume_title)).toBeTruthy();
		expect(screen.getByText(t.resume_body.replace('{date}', '15. 10. 2026'))).toBeTruthy();
		await act(async () => press(t.resume_continue));
		expect(await screen.findByRole('heading', { name: t.circumstances_title })).toBeTruthy();
		expect(bars()).toHaveProp('aria-label', 'Korak 5 od 6');
	});

	test('screen readers: named controls on every step, and focus moves to the new step', async () => {
		const focused = async () => {
			await waitFor(() => expect(mockFocus).toHaveBeenCalledWith(true));
			mockFocus.mockClear();
		};
		await renderFlow();
		await focused();
		expect(screen.getAllByRole('button', { name: t.back })).toHaveLength(1);
		expect(screen.getByLabelText(t.pet_title)).toBeTruthy();
		await fireEvent.press(await screen.findByRole('radio', { name: /Runo · Pes/ }));
		await next();
		await focused();
		expect(screen.getByRole('button', { name: 'Fotografiraj' })).toBeTruthy();
		await press('Fotografiraj');
		await next();
		// The picker brings its own h1 (P5): the step bars take the focus.
		await focused();
		await press('Potrdi kraj');
		await focused();
		expect(screen.getByLabelText(t.when_title)).toBeTruthy();
		await next();
		await focused();
		expect(screen.getByLabelText(t.contact_label)).toBeTruthy();
		expect(screen.getByLabelText(t.circumstances_label)).toBeTruthy();
		expect(screen.getByRole('switch', { name: t.reward_toggle })).toBeTruthy();
		await next();
		await focused();
		expect(screen.getByRole('heading', { name: t.review_title })).toBeTruthy();
		expect(screen.getByRole('button', { name: `Uredi: ${t.review_reward}` })).toBeTruthy();

		// "Uredi" goes to the step and Naprej comes back to the review.
		await press(`Uredi: ${t.review_time}`);
		expect(screen.getByRole('heading', { name: t.when_title })).toBeTruthy();
		await next();
		expect(screen.getByRole('heading', { name: t.review_title })).toBeTruthy();
	});

	test('close asks first and keeps the draft', async () => {
		await renderFlow();
		// The first "Zapri" is the top bar's (the closed sheets' mocks render theirs too).
		await fireEvent.press(screen.getAllByRole('button', { name: t.close })[0]!);
		expect(await screen.findByText(t.close_body)).toBeTruthy();
		await press(t.close_confirm);
		expect(mockRouter.back).toHaveBeenCalled();
	});
});
