// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import * as React from 'react';
import { AccessibilityInfo, Pressable } from 'react-native';
import { Provider } from 'react-redux';
import { createTranslator, IntlProvider } from 'use-intl';

import { checkout, payment } from '@zivali/api/__fixtures__/payments';
import { pet as fixture } from '@zivali/api/__fixtures__/pets';
import { createMockApi, type MockRoutes, mockError } from '@zivali/api/mock';
import { type ApiStore, createApiStore, api as rtk } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { Pet } from '@zivali/types';
import PetsLayout from '@/app/pets/_layout';
import EditPet from '@/app/pets/[id]/edit';
import PetScreen from '@/app/pets/[id]/index';
import PetsScreen from '@/app/pets/index';
import NewPet from '@/app/pets/new';
import type { PickedPhoto } from '@/components/photos/use-photo-uploads';

// --- Stand-ins: the photo step (photos.test.tsx covers PhotoPicker), the session, the browser, toasts ---

type PickerProps = {
	draft: string;
	kind: string;
	onChange?: (photos: Partial<PickedPhoto>[]) => void;
	saved?: { id: string }[];
	confirmRemove?: { title: string; body: string; confirm: string };
};
const mockPickerProps = jest.fn((_props: PickerProps) => {});
/** A PhotoPicker that keeps a list: "add photo" adds an uploaded one, "add uploading" one still on its way. */
function MockPhotoPicker(props: PickerProps) {
	mockPickerProps(props);
	const [list, setList] = React.useState<Partial<PickedPhoto>[]>(() =>
		(props.saved ?? []).map(({ id }) => ({ key: id, photoId: id, status: 'uploaded' }))
	);
	const { onChange } = props;
	React.useEffect(() => onChange?.(list), [list, onChange]);
	const add = (status: 'uploaded' | 'uploading') =>
		setList((photos) => [
			...photos,
			{ key: `k${photos.length}`, photoId: status === 'uploaded' ? `photo-${photos.length}` : undefined, status },
		]);
	return (
		<>
			<Pressable role="button" aria-label="test: add photo" onPress={() => add('uploaded')} />
			<Pressable role="button" aria-label="test: add uploading" onPress={() => add('uploading')} />
			<Pressable
				role="button"
				aria-label="test: remove first"
				onPress={() => setList((photos) => photos.slice(1))}
			/>
		</>
	);
}
jest.mock('@/components/photos/photo-picker', () => ({ PhotoPicker: MockPhotoPicker }));
const mockClearDraft = jest.fn(async (_draft: string) => {});
jest.mock('@/components/photos/use-photo-uploads', () => ({
	clearPhotoDraft: (draft: string) => mockClearDraft(draft),
}));
jest.mock('@/components/shell/permission-primer', () => ({ PermissionPrimer: () => null }));
function mockStub(label: string, onPress?: () => void) {
	return <Pressable role="button" aria-label={label} onPress={onPress} />;
}
jest.mock('@/components/notifications/notifications-view', () => ({
	Loading: () => mockStub('test: loading'),
	InlineError: ({ onRetry }: { onRetry: () => void }) => mockStub('test: inline error', onRetry),
}));
let mockSearches = new Map<string, string>();
jest.mock('@/lib/data/reports', () => ({ useOpenLostReportsByPet: () => mockSearches }));
const mockOpenAuthSession = jest.fn();
jest.mock('expo-web-browser', () => ({
	openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSession(...args),
}));
jest.mock('@/lib/env', () => ({ env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test', EXPO_PUBLIC_APP_ENV: 'local' } }));
jest.mock('@/lib/supabase', () => ({ supabase: { auth: {} } }));
const mockSession = { gate: 'ok', isVerified: true };
jest.mock('@zivali/api/auth', () => ({ useSession: () => mockSession, useRequireAuth: () => mockSession }));
const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock('@/components/ui/sonner', () => ({
	get toast() {
		return mockToast;
	},
}));

jest.setTimeout(60_000);

const t = sl.pets;
const tSl = createTranslator({ locale: 'sl', messages: sl });

// --- Fixtures and an in-memory pets API ---

const runo: Pet = fixture;
const luna: Pet = {
	...fixture,
	id: 'pet-luna',
	species: 'cat',
	name: 'Luna',
	breed_codes: ['cat.european_shorthair'],
	chip_number: null,
	chip_status: 'none',
	photos: [
		{ id: 'photo-a', thumb_url: 'https://media.zivali.test/a.webp' },
		{ id: 'photo-b', thumb_url: 'https://media.zivali.test/b.webp' },
	],
};
const old: Pet = { ...fixture, id: 'pet-old', name: 'Piki', archived_at: '2026-09-01T08:00:00Z' };

/** GET/POST/PATCH/DELETE pets and their photos over a list the test can see. */
function petsApi(initial: Pet[], overrides: MockRoutes = {}) {
	let pets = [...initial];
	const find = (id: string) => pets.find((item) => item.id === id) ?? mockError('NOT_FOUND');
	const change = (id: string, fields: Partial<Pet>) => {
		pets = pets.map((item) => (item.id === id ? { ...item, ...fields } : item));
		return find(id);
	};
	return createMockApi({
		'GET /v1/pets': () => ({ items: pets }),
		'GET /v1/pets/:id': ({ params }) => find(params.id),
		'POST /v1/pets': ({ body }) => {
			const created: Pet = {
				...fixture,
				...(body as Partial<Pet>),
				id: 'pet-new',
				chip_number: null,
				chip_status: 'invalid',
				photos: [],
			};
			pets.push(created);
			return created;
		},
		'PATCH /v1/pets/:id': ({ params, body }) => change(params.id, body as Partial<Pet>),
		'PUT /v1/pets/:id/photos': ({ params, body }) =>
			change(params.id, {
				photos: (body as { photo_ids: string[] }).photo_ids.map((id) => ({ id, thumb_url: `https://t/${id}` })),
			}),
		'POST /v1/pets/:id/archive': ({ params }) => change(params.id, { archived_at: '2026-10-16T08:00:00Z' }),
		'DELETE /v1/pets/:id': ({ params }) => {
			pets = pets.filter((item) => item.id !== params.id);
			return undefined;
		},
		'DELETE /v1/photos/:id': () => undefined,
		'POST /v1/payments/checkout': checkout,
		'GET /v1/payments/:id': { ...payment, purpose: 'subscription', status: 'canceled' },
		...overrides,
	});
}
type Api = ReturnType<typeof petsApi>;
const callsTo = (api: Api, method: string, path: string) =>
	api.calls.filter((call) => call.method === method && call.path === path);

// One store per client, reset after each test so RTK's cache timers do not keep Jest running.
const stores = new Map<Api, ApiStore>();
afterEach(() => {
	for (const store of stores.values()) store.dispatch(rtk.util.resetApiState());
	stores.clear();
});

function Providers({ api, locale, children }: { api: Api; locale: 'sl' | 'en'; children: React.ReactNode }) {
	if (!stores.has(api)) stores.set(api, createApiStore(api));
	return (
		<Provider store={stores.get(api)!}>
			<IntlProvider locale={locale} messages={locale === 'sl' ? sl : en} timeZone="Europe/Ljubljana">
				{children}
				<PortalHost />
			</IntlProvider>
		</Provider>
	);
}

// renderRouter's result is a promise with the router getters attached; awaiting it would drop them.
async function open(api: Api, initialUrl: string, locale: 'sl' | 'en' = 'sl') {
	const result = renderRouter(
		{
			_layout: () => <Stack screenOptions={{ headerShown: false }} />,
			profile: () => null,
			'pets/_layout': PetsLayout,
			'pets/index': PetsScreen,
			'pets/new': NewPet,
			'pets/[id]/index': PetScreen,
			'pets/[id]/edit': EditPet,
			// Stand-ins for the lost flow (TASK-29.5) and the report detail (TASK-18.3).
			'report/lost': () => null,
			'r/[code]': () => null,
		},
		{
			initialUrl,
			wrapper: ({ children }) => (
				<Providers api={api} locale={locale}>
					{children}
				</Providers>
			),
		}
	);
	await result;
	return { getPathname: result.getPathname, getSearchParams: result.getSearchParams };
}

const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const heading = (name: string) => screen.findByRole('heading', { name });

beforeEach(() => {
	jest.clearAllMocks();
	mockSearches = new Map();
	mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });
});

describe('My pets list', () => {
	test('rows show photo, species and breed and the chip status word, never the number; a row opens the detail', async () => {
		mockSearches = new Map([[luna.id, 'Hk3vT9qP']]);
		const api = petsApi([runo, luna, old]);
		const result = await open(api, '/pets');

		expect(await heading(t.title)).toBeOnTheScreen();
		expect(await screen.findByText(tSl('pets.count', { count: 2 }))).toBeOnTheScreen();
		const rows = screen.getAllByRole('link');
		expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([
			`Runo, Pes · Labradorec, ${t.chip_on_file}`,
			`Luna, Mačka · Evropska kratkodlaka, ${t.chip_none}`,
			`Piki, Pes · Labradorec, ${t.chip_on_file}, ${t.archived_label}`,
		]);
		// The chip number stays on the owner's pet detail.
		expect(screen.queryByText(/705/)).toBeNull();
		// Two active pets (the archived one does not count): the quiet limit note, no offers yet.
		expect(screen.getByText(tSl('pets.limit_note_premium', { limit: 2 }))).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: t.premium_action })).toBeNull();

		// Luna has an open search: the status word and its link sit under the row.
		expect(screen.getByText(t.status_lost)).toBeOnTheScreen();
		await press(t.open_search);
		expect(result.getPathname()).toBe('/r/Hk3vT9qP');
		await act(() => router.back());

		await fireEvent.press(rows[0]!);
		expect(await heading('Runo')).toBeOnTheScreen();
		expect(result.getPathname()).toBe(`/pets/${runo.id}`);
	});

	test('below the limit (archived pets do not count) "Dodaj žival" opens the add flow', async () => {
		const result = await open(petsApi([runo, old]), '/pets');
		await screen.findByRole('button', { name: t.add });
		expect(screen.queryByText(tSl('pets.limit_note_premium', { limit: 2 }))).toBeNull();
		await press(t.add);
		expect(result.getPathname()).toBe('/pets/new');
	});

	test('with no pets the empty state offers "Dodaj žival"', async () => {
		const empty = await open(petsApi([]), '/pets');
		expect(await heading(t.empty_title)).toBeOnTheScreen();
		expect(screen.getByText(t.empty_body)).toBeOnTheScreen();
		await press(t.empty_action);
		expect(empty.getPathname()).toBe('/pets/new');
	});

	test('shows row skeletons while loading, then an inline error with a working retry', async () => {
		let release: (value: unknown) => void = () => {};
		let calls = 0;
		const api = petsApi([], {
			'GET /v1/pets': () => (++calls === 1 ? new Promise((resolve) => (release = resolve)) : { items: [runo] }),
		});
		await open(api, '/pets');

		expect(screen.getByLabelText(sl.common.loading)).toBeOnTheScreen();
		await act(async () => release(mockError('FORBIDDEN')));
		await screen.findByRole('button', { name: 'test: inline error' });
		await press('test: inline error');
		expect(await screen.findByRole('link', { name: /^Runo/ })).toBeOnTheScreen();
	});

	test('adding over the free limit opens no form: the note offers Premium in the browser and a report without a profile', async () => {
		const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
		const api = petsApi([runo, luna]);
		const result = await open(api, '/pets');
		await screen.findByRole('button', { name: t.add });
		const note = tSl('pets.limit_note_premium', { limit: 2 });

		await press(t.add);

		expect(result.getPathname()).toBe('/pets');
		expect(announce).toHaveBeenCalledWith(note);
		await press(t.premium_action);
		expect(await heading(sl.payments.handoff_title)).toBeOnTheScreen();
		await press(sl.payments.handoff_continue);
		await waitFor(() =>
			expect(mockOpenAuthSession).toHaveBeenCalledWith(checkout.checkout_url, 'zivali://payments/return')
		);
		expect(callsTo(api, 'POST', '/v1/payments/checkout')[0]?.body).toEqual({
			purpose: 'subscription',
			locale: 'sl',
			return_to: '/moje-zivali',
			return_scheme: true,
		});
		expect(await heading(sl.payments.cancel_title)).toBeOnTheScreen();
		await press(sl.payments.cancel_back);

		await press(t.report_without_profile);
		expect(result.getPathname()).toBe('/report/lost');
		announce.mockRestore();
	});

	test('works in English', async () => {
		await open(petsApi([runo]), '/pets', 'en');
		expect(await heading(en.pets.title)).toBeOnTheScreen();
		expect(await screen.findByText('1 pet')).toBeOnTheScreen();
		expect(screen.getByText(en.pets.chip_on_file)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: en.pets.add })).toBeOnTheScreen();
	});
});

describe('Add and edit', () => {
	const next = () => press(sl.common.next);

	test('adds a pet section by section: a photo, then species and name; a short chip does not block saving', async () => {
		const api = petsApi([]);
		const result = await open(api, '/pets/new');

		expect(await heading(t.section_photos)).toBeOnTheScreen();
		expect(screen.getByLabelText('Korak 1 od 5')).toBeOnTheScreen();
		expect(mockPickerProps.mock.lastCall?.[0]).toMatchObject({
			draft: 'pet-new',
			kind: 'pet',
			confirmRemove: { title: t.photo_delete_title, body: t.photo_delete_body, confirm: t.photo_delete_confirm },
		});
		await next();
		expect(screen.getByText(t.photos_required)).toBeOnTheScreen();
		await press('test: add photo');
		expect(screen.queryByText(t.photos_required)).toBeNull();

		await next();
		expect(await heading(t.section_basics)).toBeOnTheScreen();
		expect(screen.getByLabelText('Korak 2 od 5')).toBeOnTheScreen();
		await next();
		expect(await screen.findByText(t.species_required)).toBeOnTheScreen();
		expect(screen.getByText(t.name_required)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('radio', { name: 'Pes' }));
		await fireEvent.changeText(screen.getByLabelText(t.name_label), 'Runo');

		await next();
		expect(await heading(t.section_looks)).toBeOnTheScreen();
		await next();
		expect(await heading(t.section_chip)).toBeOnTheScreen();
		await fireEvent.changeText(screen.getByLabelText(t.chip_label), '7051234');
		await next();
		expect(await heading(t.section_notes)).toBeOnTheScreen();
		await press(t.save);

		await waitFor(() => expect(result.getPathname()).toBe('/pets/pet-new'));
		expect(callsTo(api, 'POST', '/v1/pets')[0]?.body).toMatchObject({
			species: 'dog',
			name: 'Runo',
			chip: '705 1234',
			breed_codes: [],
			colours: [],
		});
		expect(callsTo(api, 'PUT', '/v1/pets/pet-new/photos')[0]?.body).toEqual({ photo_ids: ['photo-0'] });
		expect(mockToast.success).toHaveBeenCalledWith(t.saved);
		expect(mockClearDraft).toHaveBeenCalledWith('pet-new');
		expect(await heading('Runo')).toBeOnTheScreen();
	});

	test('waits for uploads before saving and sends the user back to the photos', async () => {
		const api = petsApi([]);
		await open(api, '/pets/new');
		await heading(t.section_photos);
		await press('test: add uploading');
		await next();
		await fireEvent.press(screen.getByRole('radio', { name: 'Mačka' }));
		await fireEvent.changeText(screen.getByLabelText(t.name_label), 'Luna');
		await next();
		await next();
		await next();
		await press(t.save);

		expect(await heading(t.section_photos)).toBeOnTheScreen();
		expect(screen.getByText(t.photos_pending)).toBeOnTheScreen();
		expect(callsTo(api, 'POST', '/v1/pets')).toHaveLength(0);
	});

	test('PET_LIMIT keeps everything typed and shows the limit note with Premium and a report without a profile', async () => {
		const api = petsApi([], {
			'POST /v1/pets': mockError('CONFLICT', 'Pet limit reached', { code: 'PET_LIMIT', limit: 2 }),
		});
		await open(api, '/pets/new');
		await heading(t.section_photos);
		await press('test: add photo');
		await next();
		await fireEvent.press(screen.getByRole('radio', { name: 'Pes' }));
		await fireEvent.changeText(screen.getByLabelText(t.name_label), 'Rex');
		await next();
		await next();
		await next();
		await press(t.save);

		expect(await screen.findByText(tSl('pets.limit_note_premium', { limit: 2 }))).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: t.premium_action })).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: t.report_without_profile })).toBeOnTheScreen();
		expect(screen.getByRole('heading', { name: t.section_notes })).toBeOnTheScreen();
		await press(sl.common.back);
		await press(sl.common.back);
		await press(sl.common.back);
		expect(screen.getByLabelText(t.name_label).props.value).toBe('Rex');
		expect(callsTo(api, 'PUT', '/v1/pets/pet-new/photos')).toHaveLength(0);
	});

	test('edit patches only what changed (an untouched unknown chip stays) and deletes the photos taken off', async () => {
		const unknownChip: Pet = { ...luna, chip_number: null, chip_status: 'invalid' };
		const api = petsApi([unknownChip]);
		const result = await open(api, `/pets/${luna.id}`);
		await heading('Luna');
		await press(t.edit);

		expect(await heading(t.section_photos)).toBeOnTheScreen();
		expect(mockPickerProps.mock.lastCall?.[0]).toMatchObject({ draft: `pet-${luna.id}`, saved: luna.photos });
		await press('test: remove first');
		await next();
		expect(screen.getByLabelText(t.name_label).props.value).toBe('Luna');
		await fireEvent.changeText(screen.getByLabelText(t.name_label), 'Lunica');
		await next();
		await next();
		expect(screen.getByLabelText(t.chip_label).props.value).toBe('');
		await next();
		await press(t.save);

		await waitFor(() => expect(result.getPathname()).toBe(`/pets/${luna.id}`));
		expect(callsTo(api, 'PATCH', `/v1/pets/${luna.id}`).map((call) => call.body)).toEqual([{ name: 'Lunica' }]);
		expect(callsTo(api, 'PUT', `/v1/pets/${luna.id}/photos`)[0]?.body).toEqual({ photo_ids: ['photo-b'] });
		await waitFor(() => expect(callsTo(api, 'DELETE', '/v1/photos/photo-a')).toHaveLength(1));
		expect(callsTo(api, 'DELETE', '/v1/photos/photo-b')).toHaveLength(0);
		expect(mockToast.success).toHaveBeenCalledWith(t.saved);
		expect(await heading('Lunica')).toBeOnTheScreen();
	});

	test('leaving with changes asks first; untouched it just leaves; Android back goes one section back', async () => {
		const result = await open(petsApi([runo]), '/pets');
		await screen.findByRole('button', { name: t.add });
		await press(t.add);
		await heading(t.section_photos);
		await press(sl.common.close);
		await waitFor(() => expect(result.getPathname()).toBe('/pets'));
		expect(screen.queryByRole('heading', { name: sl.common.discard_title })).toBeNull();

		await press(t.add);
		await heading(t.section_photos);
		await press('test: add photo');
		await next();
		await heading(t.section_basics);
		// Android back (any removal of the screen) on a later section: the section before.
		await act(() => router.back());
		expect(await heading(t.section_photos)).toBeOnTheScreen();
		expect(result.getPathname()).toBe('/pets/new');

		await press(sl.common.close);
		expect(await heading(sl.common.discard_title)).toBeOnTheScreen();
		expect(screen.getByText(sl.common.discard_body)).toBeOnTheScreen();
		await press(sl.common.keep_editing);
		await waitFor(() => expect(screen.queryByRole('heading', { name: sl.common.discard_title })).toBeNull());
		expect(result.getPathname()).toBe('/pets/new');

		await press(sl.common.back);
		await heading(sl.common.discard_title);
		await press(sl.common.discard_confirm);
		await waitFor(() => expect(result.getPathname()).toBe('/pets'));
		expect(mockClearDraft).toHaveBeenCalledWith('pet-new');
	});
});

describe('Pet detail', () => {
	test('facts, the chip number hidden until "Pokaži številko", and "Prijavi izgubljeno žival" with this pet', async () => {
		const result = await open(petsApi([runo]), `/pets/${runo.id}`);

		expect(await heading('Runo')).toBeOnTheScreen();
		expect(screen.getByText('Pes · Labradorec')).toBeOnTheScreen();
		for (const [label, value] of [
			[t.fact_species, 'Pes'],
			[t.fact_sex, 'Samec'],
			[t.fact_breed, 'Labradorec'],
			[t.fact_born, '2021'],
			[t.fact_colour, 'Zlata'],
			[t.fact_pattern, 'Enobarvna'],
			[t.fact_size, 'Velika'],
			[t.fact_collar, 'Rdeča ovratnica'],
		]) {
			expect(screen.getByText(label)).toBeOnTheScreen();
			expect(screen.getByText(value)).toBeOnTheScreen();
		}

		const masked = screen.getByLabelText(t.chip_hidden);
		expect(masked).toHaveTextContent('••• •••• •••• ••••');
		expect(screen.queryByText('705 0000 0012 3456')).toBeNull();
		expect(screen.getByText(t.chip_only_you)).toBeOnTheScreen();
		await press(t.chip_show);
		expect(screen.getByText('705 0000 0012 3456')).toBeOnTheScreen();
		await press(t.chip_hide);
		expect(screen.queryByText('705 0000 0012 3456')).toBeNull();

		await press(t.report_lost);
		expect(result.getPathname()).toBe('/report/lost');
		expect(result.getSearchParams()).toMatchObject({ pet_id: runo.id });
	});

	test('a pet without a chip says so and has nothing to reveal', async () => {
		await open(petsApi([luna]), `/pets/${luna.id}`);
		await heading('Luna');
		expect(screen.getByText(t.chip_none)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: t.chip_show })).toBeNull();
	});

	test('delete asks first, then deletes the profile, says so and returns to the list', async () => {
		const api = petsApi([runo]);
		const result = await open(api, '/pets');
		await fireEvent.press(await screen.findByRole('link', { name: /^Runo/ }));
		await heading('Runo');

		await press(t.delete);
		expect(await heading(t.delete_title)).toBeOnTheScreen();
		expect(screen.getByText(t.delete_body)).toBeOnTheScreen();
		expect(callsTo(api, 'DELETE', `/v1/pets/${runo.id}`)).toHaveLength(0);
		await press(t.delete_confirm);

		await waitFor(() => expect(result.getPathname()).toBe('/pets'));
		expect(callsTo(api, 'DELETE', `/v1/pets/${runo.id}`)).toHaveLength(1);
		expect(mockToast.success).toHaveBeenCalledWith(t.deleted);
		expect(await heading(t.empty_title)).toBeOnTheScreen();
	});

	test('archive asks first; an archived pet says so instead of offering a report', async () => {
		const api = petsApi([runo]);
		await open(api, `/pets/${runo.id}`);
		await heading('Runo');

		await press(t.archive);
		expect(await heading(t.archive_title)).toBeOnTheScreen();
		await press(t.archive_confirm);

		expect(await screen.findByText(t.archived_label)).toBeOnTheScreen();
		expect(callsTo(api, 'POST', `/v1/pets/${runo.id}/archive`)).toHaveLength(1);
		expect(mockToast.success).toHaveBeenCalledWith(t.archived);
		expect(screen.queryByRole('button', { name: t.report_lost })).toBeNull();
		expect(screen.queryByRole('button', { name: t.archive })).toBeNull();
	});
});
