/// <reference types="node" />
// Loads the jest.setup Reanimated mock (with useReducedMotion) before expo-router's testing mocks register their own.
import 'react-native-reanimated';

import fs from 'node:fs';
import path from 'node:path';

import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, Stack } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import * as Network from 'expo-network';
import * as React from 'react';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { IntlProvider } from 'use-intl';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { responsibleConfirmed } from '@zivali/api/__fixtures__/directory';
import { placeReverse } from '@zivali/api/__fixtures__/geocode';
import { publicReport } from '@zivali/api/__fixtures__/reports';
import { createMockApi, type MockRequest, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import type { PublicReport } from '@zivali/types';
import ReportFoundScreen from '@/app/report/found/index';
import { capturedAt, type FoundValues, outboxPayload, stepErrors } from '@/components/report-found/found-flow';
import { useReport } from '@/lib/data/reports';
import { getDb } from '@/lib/db';
import { outboxDir } from '@/lib/db/files';
import { startOutbox } from '@/lib/offline/outbox';
import { getCachedShelter, lastSyncAt } from '@/lib/offline/sync';

// P7 on mobile (TASK-30.3) on the real outbox engine: node:sqlite and node:fs stand in for the native modules, the
// API is the in-memory mock, PhotoPicker and LocationPicker are stand-ins (they have their own tests).
let mockConnection: unknown;
jest.mock('expo-sqlite', () => {
	const sqlite = jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').sqlite();
	return { ...sqlite, openDatabaseAsync: async () => (mockConnection ??= await sqlite.openDatabaseAsync()) };
});
jest.mock('expo-file-system', () =>
	jest.requireActual<typeof import('@/test/offline-mocks')>('@/test/offline-mocks').fileSystem()
);
const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
	getItemAsync: async (name: string) => mockKeychain.get(name) ?? null,
	setItemAsync: async (name: string, value: string) => void mockKeychain.set(name, value),
}));
jest.mock('expo-crypto', () => ({
	randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
	getRandomValues: (array: Uint32Array) => array.fill(2 ** 31),
}));
type MockListener = (next: object) => void;
jest.mock('expo-network', () => {
	const ReactActual = jest.requireActual<typeof import('react')>('react');
	const listeners = new Set<MockListener>();
	const net = { state: { isConnected: true, isInternetReachable: true } as object };
	return {
		setNetwork: (state: object) => {
			net.state = state;
			listeners.forEach((listener) => listener(state));
		},
		getNetworkStateAsync: async () => net.state,
		addNetworkStateListener: (listener: MockListener) => {
			listeners.add(listener);
			return { remove: () => listeners.delete(listener) };
		},
		useNetworkState: () => {
			const [state, setState] = ReactActual.useState(net.state);
			ReactActual.useEffect(() => {
				listeners.add(setState);
				return () => void listeners.delete(setState);
			}, []);
			return state;
		},
	};
});
const mockLocation = { granted: true, fix: { lat: 46.0569, lng: 14.5058 } as { lat: number; lng: number } | null };
jest.mock('expo-location', () => ({
	Accuracy: { High: 4 },
	getForegroundPermissionsAsync: async () => ({ granted: mockLocation.granted, canAskAgain: true }),
	getLastKnownPositionAsync: async () =>
		mockLocation.fix ? { coords: { latitude: mockLocation.fix.lat, longitude: mockLocation.fix.lng } } : null,
	getCurrentPositionAsync: async () => {
		throw new Error('no fix');
	},
}));
jest.mock('expo-image-picker', () => ({
	getCameraPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
}));
jest.mock('@/lib/env', () => ({
	env: { EXPO_PUBLIC_APP_URL: 'https://najdimo.test', EXPO_PUBLIC_API_URL: 'https://api.najdimo.test' },
}));
const mockCaptcha: { id: number | null } = { id: null };
jest.mock('@/lib/anonymous', () => ({ useCaptchaRequest: () => mockCaptcha.id }));
jest.mock('@/lib/data/reports', () => ({ useReport: jest.fn(() => ({ data: undefined })) }));
jest.mock('@/lib/offline/sync', () => ({ getCachedShelter: jest.fn(async () => null), lastSyncAt: jest.fn() }));
jest.mock('@/components/photos/use-photo-uploads', () => ({ clearPhotoDraft: jest.fn(async () => {}) }));

/** What the next picked photo carries: its EXIF (place and time) and its file in the app cache. */
const mockPick: { exif?: { lat?: number; lng?: number; takenAt?: Date } } = {};
function mockPhoto() {
	const dir = path.resolve(outboxDir.uri, '../../cache/ImagePicker');
	fs.mkdirSync(dir, { recursive: true });
	const uri = path.join(dir, 'a.jpg');
	fs.writeFileSync(uri, Buffer.from('jpeg'));
	return {
		key: 'a',
		sha256: 'a'.repeat(64),
		width: 1600,
		height: 1200,
		bytes: 900_000,
		file: { uri },
		thumb: { uri },
		status: 'uploaded' as const,
		progress: 1,
	};
}
type PickerProps = {
	ref?: React.Ref<{ pick: () => Promise<void> }>;
	tiles?: boolean;
	onChange?: (photos: ReturnType<typeof mockPhoto>[]) => void;
	onExif?: (exif: NonNullable<typeof mockPick.exif>) => void;
};
jest.mock('@/components/photos/photo-picker', () => {
	const ReactActual = jest.requireActual<typeof import('react')>('react');
	const RN = jest.requireActual<typeof import('react-native')>('react-native');
	return {
		PhotoPicker: ({ ref, tiles, onChange, onExif }: PickerProps) => {
			const add = async () => {
				if (mockPick.exif) onExif?.(mockPick.exif);
				onChange?.([mockPhoto()]);
			};
			ReactActual.useImperativeHandle(ref, () => ({ pick: add }));
			return tiles ? (
				<RN.Pressable role="button" onPress={() => void add()}>
					<RN.Text>photo tiles</RN.Text>
				</RN.Pressable>
			) : null;
		},
	};
});
type LocationPickerProps = {
	mode: string;
	suggested?: { source: string };
	onChange: (value: { point: { lat: number; lng: number }; source: 'pin' }) => void;
};
jest.mock('@/components/location/location-picker', () => {
	const RN = jest.requireActual<typeof import('react-native')>('react-native');
	return {
		LocationPicker: ({ mode, suggested, onChange }: LocationPickerProps) => (
			<RN.Pressable role="button" onPress={() => onChange({ point: { lat: 46.1, lng: 14.6 }, source: 'pin' })}>
				<RN.Text>{`picker:${mode}:${suggested?.source ?? 'none'}`}</RN.Text>
			</RN.Pressable>
		),
	};
});

const t = sl.report_found;
const tc = sl.common;
const ts = sl.shelter_row;
const setNetwork = (Network as unknown as { setNetwork: (state: object) => void }).setNetwork;
const OFFLINE = { isConnected: false, isInternetReachable: false };
const ONLINE = { isConnected: true, isInternetReachable: true };
// Two hours ago, whole seconds (EXIF has no milliseconds); a time in the future would not count.
const TAKEN = new Date(Math.floor(Date.now() / 1000 - 2 * 3600) * 1000);
const lostRex: PublicReport = { ...publicReport, id: 'lost-1', short_code: 'Rex2Lost', type: 'lost', name: 'Rex' };

/** The API as apps/api answers it; `reportReply` overrides the POST /v1/reports answer. */
function server() {
	let created = 0;
	const state = { reportReply: undefined as ((request: MockRequest) => unknown) | undefined };
	const api = createMockApi({
		'POST /v1/photos': { photo_id: 'photo-a', upload: { url: 'https://r2.test/put', method: 'PUT', headers: {} } },
		'POST /v1/photos/:id/complete': { status: 'uploaded' },
		'POST /v1/reports': (request) => {
			if (state.reportReply) return state.reportReply(request);
			created += 1;
			return {
				id: `report-${created}`,
				short_code: `CODE${created}`,
				moderation_state: 'visible',
				manage_token: `token-${created}`,
				warnings: [],
			};
		},
		'GET /v1/reports/:code': ({ params }) => ({
			...publicReport,
			short_code: params.code,
			moderation_state: 'visible',
			manager_role: 'finder',
		}),
		'POST /v1/geo/reverse': placeReverse,
		'GET /v1/shelters/responsible': responsibleConfirmed,
	});
	const reportBodies = () =>
		api.calls.filter((call) => call.method === 'POST' && call.path === '/v1/reports').map((call) => call.body);
	return { api, state, reportBodies };
}
let api: ReturnType<typeof server>;
let stop = () => {};

async function open(url = '/report/found') {
	const store = createApiStore(api.api);
	const Providers = ({ children }: { children: React.ReactNode }) => (
		<Provider store={store}>
			<IntlProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				{children}
				<PortalHost />
			</IntlProvider>
		</Provider>
	);
	const page = renderRouter(
		{
			_layout: () => <Stack screenOptions={{ headerShown: false }} />,
			index: () => <Text>map tab</Text>,
			'report/found/index': ReportFoundScreen,
			'r/[code]/index': () => <Text>report detail</Text>,
		},
		{ initialUrl: url, wrapper: Providers }
	);
	// The methods (getPathname, …) sit on the returned promise, so it is wrapped: returning it would unwrap it.
	await page;
	return { page };
}

const heading = (name: string) => screen.findByRole('heading', { name });
/** A radio row's name starts with its title (the description follows); the titles have no regex characters. */
const startsWith = (text: string) => new RegExp(`^${text}`);
const press = async (name: string, role: 'button' | 'radio' = 'button') =>
	fireEvent.press(await screen.findByRole(role, { name: role === 'radio' ? startsWith(name) : name }));
const outboxRows = async () =>
	(await getDb()).getAllAsync<{ status: string; captured_at: string }>('select status, captured_at from outbox');

/** Steps 1 to 4 of the found flow, to the publish step. */
async function toPublish({ situation = t.situation_have, email = '' } = {}) {
	await heading(t.photo_title);
	await press(t.photo_take);
	await press(tc.next);
	await heading(t.species_title);
	await press(t.species_dog, 'radio');
	await press(tc.next);
	await heading(sl.location.title_found);
	await press(tc.next);
	await heading(t.situation_title);
	await press(situation, 'radio');
	await fireEvent.changeText(screen.getByLabelText(t.note_label), '  Prijazen je, ima rdečo ovratnico.  ');
	if (email) await fireEvent.changeText(screen.getByLabelText(t.email_label), email);
	await press(tc.next);
	await heading(t.send_title);
}

beforeEach(async () => {
	mockKeychain.clear();
	mockPick.exif = { lat: 46.0712, lng: 14.5102, takenAt: TAKEN };
	mockLocation.granted = true;
	mockLocation.fix = { lat: 46.0569, lng: 14.5058 };
	mockCaptcha.id = null;
	setNetwork(ONLINE);
	const db = await getDb();
	await db.runAsync('delete from outbox');
	await db.runAsync('delete from drafts');
	initAnalytics({ provider: 'mock', storage: { get: () => null, set: () => {} } });
	resetMockEvents();
	api = server();
	stop = startOutbox({ api: api.api, ensureSession: async () => ({}), put: async () => {} });
});
afterEach(() => stop());

test('found online: five steps, publish through the outbox, M6 with the private link and the shelter to call', async () => {
	setConsent({ analytics: true });
	const { page } = await open();
	await toPublish({ email: 'finder@zivali.test' });
	// The summary: one line per answer, each with "Uredi"; never a question about where the animal is kept.
	expect(screen.getByText(t.summary_with_me)).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: `${tc.edit}: ${t.summary_place}` })).toBeOnTheScreen();
	expect(screen.getByText(t.privacy_line)).toBeOnTheScreen();

	await press(t.publish);
	await heading(t.done_title);

	const [body] = api.reportBodies() as Record<string, unknown>[];
	const { location, ...rest } = body as { location: { lat: number; lng: number } };
	expect(rest).toEqual({
		type: 'found',
		species: 'dog',
		circumstances: 'Prijazen je, ima rdečo ovratnico.',
		finder_email: 'finder@zivali.test',
		photo_ids: ['photo-a'],
		// The photo's capture time, not the send time (C17).
		event_at: TAKEN.toISOString(),
	});
	// The EXIF place, coarsened once (C6): near the photo's point but never the raw one.
	const metres = Math.hypot((location.lat - 46.0712) * 111_320, (location.lng - 14.5102) * 77_000);
	expect(metres).toBeGreaterThan(5);
	expect(metres).toBeLessThan(40);

	// The token is in secure storage only, shown once as the link.
	expect(mockKeychain.get('manage_token.report-1')).toBe('token-1');
	expect(await screen.findByText('https://najdimo.test/m#token-1')).toBeOnTheScreen();
	expect(screen.getByText(t.link_emailed)).toBeOnTheScreen();
	expect(page.getPathname()).toBe('/report/found');

	// AC #5: the responsible shelter after submit, with the call button and the chip line.
	expect(
		await screen.findByText(`${ts.found_body.replace('{municipality}', 'Ljubljana')} ${ts.not_replace}`)
	).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: 'Pokliči Zavetišče Ljubljana' })).toBeOnTheScreen();
	expect(screen.getByText(ts.chip_line)).toBeOnTheScreen();
	expect(screen.queryByText('Oglas')).toBeNull();

	// AC #4: both events, with the server's region and municipality; nothing personal.
	await waitFor(() =>
		expect(getMockEvents()).toEqual([
			{ name: 'report_found_start', params: {} },
			{
				name: 'report_found_submit',
				params: {
					report_type: 'found',
					species: 'dog',
					region: 'osrednjeslovenska',
					municipality: 'ljubljana',
				},
			},
		])
	);
	expect(await outboxRows()).toEqual([{ status: 'sent', captured_at: TAKEN.toISOString() }]);

	await press(t.open_report);
	expect(await screen.findByText('report detail')).toBeOnTheScreen();
	expect(page.getPathname()).toBe('/r/CODE1');
});

test('without consent the flow sends no analytics event', async () => {
	await open();
	await toPublish();
	await press(t.publish);
	await heading(t.done_title);
	expect(getMockEvents()).toEqual([]);
});

test('offline: Publish waits in the outbox with the capture time, then turns into M6 once it is sent', async () => {
	jest.mocked(getCachedShelter).mockResolvedValue(responsibleConfirmed as never);
	jest.mocked(lastSyncAt).mockResolvedValue(Date.parse('2026-10-12T08:00:00Z'));
	// A gallery photo with a time but no place: "Kje" comes from GPS.
	mockPick.exif = { takenAt: TAKEN };
	setNetwork(OFFLINE);
	await open();
	await heading(t.photo_title);
	await press(t.photo_take);
	await press(tc.next);
	await press(t.species_cat, 'radio');
	await press(tc.next);
	await heading(sl.location.title_found);
	expect(screen.getByText(t.where_from_gps)).toBeOnTheScreen();
	expect(screen.getByText(sl.location.offline_gps_set)).toBeOnTheScreen();
	await press(tc.next);
	await press(t.situation_seen, 'radio');
	await press(tc.next);
	await press(t.publish);

	await heading(t.outbox_title);
	expect(screen.getByText(t.offline_queued)).toBeOnTheScreen();
	expect(await outboxRows()).toEqual([{ status: 'queued', captured_at: TAKEN.toISOString() }]);
	// The softer sighted row from the saved directory, with its date; no link to the page offline.
	expect(await screen.findByText(ts.sighted_body.replace('{municipality}', 'Ljubljana'))).toBeOnTheScreen();
	expect(screen.getByText(ts.cached.replace('{date}', '12. 10. 2026'))).toBeOnTheScreen();
	expect(screen.queryByText(ts.chip_line)).toBeNull();
	expect(screen.queryByText(ts.details_link)).toBeNull();
	expect(api.reportBodies()).toEqual([]);

	await act(async () => setNetwork(ONLINE));
	await heading(t.done_title);
	expect(api.reportBodies()).toEqual([
		expect.objectContaining({ type: 'sighted', species: 'cat', event_at: TAKEN.toISOString() }),
	]);
	expect(await screen.findByText('https://najdimo.test/m#token-1')).toBeOnTheScreen();
	expect(await screen.findByRole('button', { name: 'Pokliči Zavetišče Ljubljana' })).toBeOnTheScreen();
	expect(screen.getByText(ts.details_link)).toBeOnTheScreen();
});

test('"I saw this pet": the short linked flow creates a SIGHTED report linked to the listing, without email or shelter row', async () => {
	jest.mocked(useReport).mockReturnValue({ data: lostRex } as ReturnType<typeof useReport>);
	await open('/report/found?type=sighted&linked_report_id=lost-1&code=Rex2Lost&species=dog');
	await heading(t.sighting_where);
	expect(screen.getByText('Rex')).toBeOnTheScreen();
	expect(screen.getByText(t.where_from_gps)).toBeOnTheScreen();
	await press(tc.next);
	await heading(t.sighting_when);
	await press(t.sighting_when_today, 'radio');
	await fireEvent.changeText(screen.getByLabelText(t.sighting_time), '25.99');
	await press(tc.next);
	expect(await screen.findByText(t.sighting_when_invalid)).toBeOnTheScreen();
	await fireEvent.changeText(screen.getByLabelText(t.sighting_time), '00.00');
	await press(tc.next);
	await heading(t.sighting_photo);
	expect(screen.queryByLabelText(t.email_label)).toBeNull();
	await press(t.sighting_send);

	await heading(t.sighting_done_title);
	const [body] = api.reportBodies() as Record<string, unknown>[];
	expect(body).toEqual(
		expect.objectContaining({ type: 'sighted', species: 'dog', linked_report_id: 'lost-1', photo_ids: [] })
	);
	expect(body).not.toHaveProperty('finder_email');
	// Today at 00.00 in the device's clock.
	const at = new Date(body!.event_at as string);
	expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([new Date().getDate(), 0, 0]);
	expect(await screen.findByText('https://najdimo.test/m#token-1')).toBeOnTheScreen();
	expect(screen.queryByText(ts.chip_line)).toBeNull();
	expect(screen.queryByRole('button', { name: 'Pokliči Zavetišče Ljubljana' })).toBeNull();
	// The bottom "Zapri" (the top bar has the other one).
	await fireEvent.press(screen.getAllByRole('button', { name: tc.close }).at(-1)!);
	expect(await screen.findByText('map tab')).toBeOnTheScreen();
});

test('checks on Naprej, the picker when there is no place, and a rate limit that keeps the form', async () => {
	mockPick.exif = undefined;
	mockLocation.granted = false;
	await open('/report/found?type=sighted');
	await press(t.photo_take);
	await press(tc.next);
	await press(tc.next);
	expect(await screen.findByText(t.species_required)).toBeOnTheScreen();
	await press(t.species_dog, 'radio');
	await press(tc.next);
	// No EXIF and no GPS: "Kje" opens straight on the picker; its (coarsened) point goes on to the next step.
	await press('picker:sighted:none');
	await heading(t.situation_title);
	// The sighted entry starts on "Ne, žival ni pri meni".
	expect(screen.getByRole('radio', { name: startsWith(t.situation_seen) })).toBeChecked();
	await fireEvent.changeText(screen.getByLabelText(t.email_label), 'petra.k@gmail');
	await fireEvent.changeText(screen.getByLabelText(t.note_label), 'x'.repeat(1001));
	await press(tc.next);
	expect(await screen.findByText(t.email_invalid)).toBeOnTheScreen();
	expect(screen.getByText(t.note_too_long.replace('{max}', '1000'))).toBeOnTheScreen();
	await fireEvent.changeText(screen.getByLabelText(t.email_label), '');
	await fireEvent.changeText(screen.getByLabelText(t.note_label), '');
	await press(tc.next);
	await heading(t.send_title);

	api.state.reportReply = () => mockError('RATE_LIMITED', 'slow down', { retry_after_s: 720 });
	await press(t.publish);
	expect(await screen.findByText(/Poskusite znova čez 12 minut\./)).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: t.publish })).toBeDisabled();
	// The form stays and the outbox item goes, so a later Publish sends the answers as they are then.
	expect(await outboxRows()).toEqual([]);
	expect(screen.getByRole('heading', { name: t.send_title })).toBeOnTheScreen();
});

test('close keeps the draft on the device; opening the flow again goes on where it stopped', async () => {
	await open();
	await press(t.photo_take);
	await press(tc.next);
	await press(t.species_cat, 'radio');
	await fireEvent.press(screen.getAllByRole('button', { name: tc.close })[0]!);
	expect(await screen.findByText(t.close_body)).toBeOnTheScreen();
	await fireEvent.press(screen.getAllByRole('button', { name: tc.close }).at(-1)!);
	expect(await screen.findByText('map tab')).toBeOnTheScreen();

	await act(async () => router.push('/report/found'));
	await heading(t.species_title);
	await waitFor(() => expect(screen.getByRole('radio', { name: startsWith(t.species_cat) })).toBeChecked());
});

test('pure rules: capture time, the checks and the body', () => {
	const values: FoundValues = {
		colours: ['brown'],
		note: '',
		email: '',
		when: 'now',
		date: '',
		time: '',
		startedAt: '2026-10-16T08:00:00.000Z',
	};
	const now = Date.parse('2026-10-16T09:00:00Z');
	expect(capturedAt({ ...values, takenAt: '2026-10-16T07:00:00.000Z' }, false, now)).toBe('2026-10-16T07:00:00.000Z');
	// A photo clock in the future does not count; the time the flow opened does.
	expect(capturedAt({ ...values, takenAt: '2026-10-17T07:00:00.000Z' }, false, now)).toBe(values.startedAt);
	expect(capturedAt(values, false, now)).toBe(values.startedAt);
	expect(stepErrors('what', values)).toEqual({ species: true });
	expect(stepErrors('situation', { ...values, situation: 'have', email: 'a@b.si' })).toEqual({});
	const point = { lat: 46.05, lng: 14.5 };
	expect(outboxPayload({ ...values, species: 'cat', location: point, situation: 'have', email: ' a@b.si ' })).toEqual(
		{
			type: 'found',
			species: 'cat',
			colours: ['brown'],
			location: point,
			finder_email: 'a@b.si',
		}
	);
	expect(outboxPayload({ ...values, species: 'dog', location: point, email: 'a@b.si' }, { id: 'lost-1' })).toEqual({
		type: 'sighted',
		species: 'dog',
		colours: ['brown'],
		location: point,
		linked_report_id: 'lost-1',
	});
});
