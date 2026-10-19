import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import * as React from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getConsent, track } from '@zivali/analytics';
import { attributesOtherAnimal, attributesPendingThenReady, attributesReady } from '@zivali/api/__fixtures__/ai';
import { responsibleConfirmed } from '@zivali/api/__fixtures__/directory';
import { placeReverse } from '@zivali/api/__fixtures__/geocode';
import { createdReport, publicReport } from '@zivali/api/__fixtures__/reports';
import { ApiError } from '@zivali/api/client';
import { createMockApi, type MockHandler, type MockRoutes, mockError } from '@zivali/api/mock';
import { createApiStore } from '@zivali/api/rtk';
import sl from '@zivali/i18n/dist/sl.json';
import { timeZone } from '@zivali/i18n/format';
import type { CreateReportInput, PhotoAttributes } from '@zivali/types';

import { FoundFlow } from './found-flow';
import { initialValues } from './found-form';

// The P7 flow with its pickers stubbed (PhotoPicker and LocationPicker have their own tests): the photo stub signs in
// the way the real uploads do (beforeUpload), reports EXIF and one uploaded photo; the API is the mock client.
const RAW = { lat: 46.0569, lng: 14.5058 };
const TAKEN = '2026-10-01T07:30:00.000Z';
const PICKED = { lat: 46.0612, lng: 14.4977 };
const LOST_ID = '51aa3c2e-4b1d-4f6a-9e2c-8d7b5a1f3e10';
const lostReport = { ...publicReport, id: LOST_ID, short_code: 'Rex12345', type: 'lost', name: 'Rex' };

// Radix radios measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

const idb = vi.hoisted(() => new Map<string, unknown>());
vi.mock('idb-keyval', () => ({
	get: async (key: string) => idb.get(key),
	set: async (key: string, value: unknown) => void idb.set(key, value),
	del: async (key: string) => void idb.delete(key),
}));
const exif = vi.hoisted(() => ({ on: true }));
const auth = vi.hoisted(() => ({ ensureSession: vi.fn(async () => {}) }));
vi.mock('@/lib/auth', () => auth);
vi.mock('@zivali/analytics', () => ({ track: vi.fn(), getConsent: vi.fn(() => null) }));
vi.mock('@/components/photos/use-photo-uploads', () => ({ clearPhotoDraft: vi.fn(async () => {}) }));
vi.mock('@/components/photos/photo-picker', () => ({
	PhotoPicker: ({
		onChange,
		onExif,
		beforeUpload,
		firstNote,
	}: {
		onChange: (photos: object[]) => void;
		onExif: (exif: object) => void;
		beforeUpload: () => Promise<unknown>;
		firstNote?: React.ReactNode;
	}) => (
		<>
			<button
				type="button"
				onClick={async () => {
					await beforeUpload();
					if (exif.on) onExif({ ...RAW, takenAt: new Date(TAKEN) });
					onChange([{ key: 'k1', photoId: 'photo-1', status: 'uploaded', progress: 1, preview: 'blob:1' }]);
				}}
			>
				Dodaj fotografijo
			</button>
			{firstNote}
		</>
	),
}));
vi.mock('@/components/location/location-picker', () => ({
	LocationPicker: ({ onChange }: { onChange: (value: object) => void }) => (
		<div>
			<h1>Kje ste žival videli?</h1>
			<button type="button" onClick={() => onChange({ point: PICKED, source: 'pin' })}>
				Potrdi kraj
			</button>
		</div>
	),
}));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
	usePathname: () => '/prijava/najdena-zival',
	useParams: () => ({ locale: 'sl' }),
}));

const created = { ...createdReport, manage_token: 'tok-private-123' };

// next/dynamic as the App Router build aliases it (Suspense-based), not the Pages Router loader the package exports.
vi.mock('next/dynamic', async () => ({ default: (await import('next/dist/shared/lib/app-dynamic')).default }));

/** Stands in for the page's Suspense: a lazy part without its own boundary would blank the whole page while it loads. */
let blanked = false;
function PageFallback() {
	blanked = true;
	return null;
}

function show(props: Partial<React.ComponentProps<typeof FoundFlow>> = {}, routes: MockRoutes = {}) {
	const api = createMockApi({
		'POST /v1/reports': created,
		'POST /v1/geo/reverse': placeReverse,
		'GET /v1/shelters/responsible': responsibleConfirmed,
		'GET /v1/reports/:code': ({ params }) => (params.code === lostReport.short_code ? lostReport : publicReport),
		...routes,
	});
	render(
		<NextIntlClientProvider locale="sl" messages={sl} timeZone={timeZone}>
			<Provider store={createApiStore(api)}>
				<React.Suspense fallback={<PageFallback />}>
					<FoundFlow entry="found" {...props} />
				</React.Suspense>
			</Provider>
		</NextIntlClientProvider>
	);
	return api;
}
const posts = (api: ReturnType<typeof createMockApi>) =>
	api.calls.filter((call) => call.method === 'POST' && call.path === '/v1/reports');
const keyOf = (call: { headers: Record<string, string> }) => call.headers['Idempotency-Key'];
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Naprej' }));
const metres = (a: typeof RAW, b: typeof RAW) =>
	Math.hypot((b.lng - a.lng) * Math.cos((a.lat * Math.PI) / 180), b.lat - a.lat) * 111_320;

/** Photo, Pes, the photo's place, "Da, žival je pri meni" (and an email), up to Publish. */
async function fillFound(email = '') {
	expect(await screen.findByRole('heading', { level: 1, name: 'Fotografirajte žival' })).toBeTruthy();
	// No photo yet: the picker's tiles are the step's actions.
	expect(screen.queryByRole('button', { name: 'Naprej' })).toBeNull();
	fireEvent.click(screen.getByRole('button', { name: 'Dodaj fotografijo' }));
	await screen.findByRole('button', { name: 'Naprej' });
	next();
	fireEvent.click(await screen.findByRole('radio', { name: 'Pes' }));
	next();
	expect(await screen.findByRole('heading', { level: 1, name: 'Kje ste žival našli?' })).toBeTruthy();
	expect(await screen.findByText('Šiška, Ljubljana')).toBeTruthy();
	expect(screen.getByText('Kraj smo prebrali iz fotografije.')).toBeTruthy();
	expect(screen.getByText('Ne sprašujemo, kje je žival zdaj.')).toBeTruthy();
	next();
	fireEvent.click(await screen.findByRole('radio', { name: /Da, žival je pri meni/ }));
	if (email) fireEvent.change(screen.getByLabelText('E-naslov (neobvezno)'), { target: { value: email } });
	next();
	expect(await screen.findByRole('heading', { level: 1, name: 'Objavite prijavo' })).toBeTruthy();
}
const publish = () => fireEvent.click(screen.getByRole('button', { name: 'Objavi prijavo' }));
// A server answer renders outside act(): its effects (the `online` listener, the saved token) may run a moment after
// the screen shows it, so the tests wait for an effect, and for each answer's note before the next tap (TASK-114.24).
/** The browser is back online, again until the POST has gone out (the retry runs one attempt at a time). */
const reconnect = (api: ReturnType<typeof createMockApi>, count: number) =>
	waitFor(() => {
		if (posts(api).length < count) window.dispatchEvent(new Event('online'));
		expect(posts(api)).toHaveLength(count);
	});

beforeEach(() => {
	blanked = false;
	idb.clear();
	localStorage.clear();
	exif.on = true;
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.mocked(getConsent).mockReturnValue(null);
	auth.ensureSession.mockImplementation(async () => {});
	expect(blanked, 'a lazy part suspended to the page and blanked it').toBe(false);
});

describe('FoundFlow (P7 web, FR-006)', () => {
	it('runs photo, animal, prefilled place, situation and publish, then shows the private link and the shelter', async () => {
		const api = show();
		await fillFound('ana@primer.si');
		expect(screen.getByText('Šiška, Ljubljana')).toBeTruthy();
		expect(screen.getByText('pri meni')).toBeTruthy();
		publish();

		// The confirmation loads once the report is sent (TASK-112); focus lands on its heading when it is there.
		const thanks = await screen.findByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' });
		await waitFor(() => expect(document.activeElement).toBe(thanks));
		const [post] = posts(api);
		const body = post!.body as CreateReportInput;
		expect(body).toMatchObject({
			type: 'found',
			species: 'dog',
			event_at: TAKEN,
			photo_ids: ['photo-1'],
			finder_email: 'ana@primer.si',
		});
		// Only the coarsened point leaves the browser (C6), once: 20–30 m from the photo's.
		const distance = metres(RAW, body.location);
		expect(distance).toBeGreaterThan(15);
		expect(distance).toBeLessThan(35);
		expect(Object.keys(body).sort()).toEqual(
			['event_at', 'finder_email', 'location', 'photo_ids', 'species', 'type'].sort()
		);
		expect(keyOf(post!)).toMatch(/^[0-9a-f-]{36}$/);
		// The anonymous session (C7): for the photo upload and again (a no-op then) before the create.
		expect(auth.ensureSession).toHaveBeenCalled();

		// C7: the link is shown, kept on this device, and the email note is there.
		expect(screen.getByText(/\/m#tok-private-123$/)).toBeTruthy();
		await waitFor(() => expect(localStorage.getItem(`manage:${created.id}`)).toBe('tok-private-123'));
		expect(screen.getByText('Povezavo smo poslali tudi na vaš e-naslov.')).toBeTruthy();
		// C18 shelter row for "Da, žival je pri meni".
		expect(
			await screen.findByText(
				'Najdbo čim prej sporočite zavetišču, pristojnemu za občino Ljubljana. Prijava na Najdimo tega ne nadomesti.'
			)
		).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Pokliči Zavetišče Ljubljana' }).getAttribute('href')).toBe(
			'tel:+38612345678'
		);
		expect(screen.getByText('Čip lahko prebere katero koli zavetišče ali veterinar.')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Odpri mojo prijavo' }).getAttribute('href')).toBe(
			`/r/${created.short_code}`
		);
		// Sign-up converts this anonymous session (C7 §6).
		expect(screen.getByRole('link', { name: 'Ustvari račun in obdrži prijavo' }).getAttribute('href')).toBe(
			'/registracija?convert=1'
		);
		expect(document.querySelector('[data-ad-slot]')).toBeNull();
		// The draft is gone once the report is live.
		await waitFor(() => expect(idb.size).toBe(0));
	});

	it('says when the report is held for checking, and that the link already works', async () => {
		show({}, { 'POST /v1/reports': { ...created, moderation_state: 'held' } });
		await fillFound();
		publish();
		expect(await screen.findByText(sl.report_found.held_note)).toBeTruthy();
		expect(screen.getByText(/\/m#tok-private-123$/)).toBeTruthy();
		expect(screen.queryByText('Povezavo smo poslali tudi na vaš e-naslov.')).toBeNull();
	});

	// TASK-30.4 QA, TASK-30.6 (fixed with TASK-17.12): a held linked sighting gets held_note, as on mobile.
	it('a held linked sighting says it is being checked, not that the owner was told (mobile parity)', async () => {
		show(
			{ entry: 'sighted', linked: { id: LOST_ID, code: lostReport.short_code } },
			{ 'POST /v1/reports': { ...created, moderation_state: 'held' } }
		);
		fireEvent.click(await screen.findByRole('button', { name: 'Potrdi kraj' }));
		await screen.findByRole('heading', { level: 1, name: 'Kdaj ste jo videli?' });
		next();
		await screen.findByRole('heading', { level: 1, name: 'Dodate fotografijo?' });
		fireEvent.click(screen.getByRole('button', { name: 'Pošlji opažanje' }));
		await screen.findByRole('heading', { level: 1, name: 'Hvala za opažanje' });
		expect(screen.getByText(sl.report_found.held_note)).toBeTruthy();
		expect(screen.queryByText(sl.report_found.sighting_done_body)).toBeNull();
	});

	it('asks a signed-in finder no email and shows no private link', async () => {
		const api = show({ account: true }, { 'POST /v1/reports': createdReport });
		expect(await screen.findByRole('heading', { level: 1, name: 'Fotografirajte žival' })).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Dodaj fotografijo' }));
		await screen.findByRole('button', { name: 'Naprej' });
		next();
		fireEvent.click(await screen.findByRole('radio', { name: 'Pes' }));
		next();
		await screen.findByText('Šiška, Ljubljana');
		next();
		fireEvent.click(await screen.findByRole('radio', { name: /Ne, žival ni pri meni/ }));
		expect(screen.queryByLabelText('E-naslov (neobvezno)')).toBeNull();
		next();
		await screen.findByRole('heading', { level: 1, name: 'Objavite prijavo' });
		publish();
		expect(await screen.findByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' })).toBeTruthy();
		expect(posts(api)[0]!.body).toMatchObject({ type: 'sighted' });
		expect(posts(api)[0]!.body).not.toHaveProperty('finder_email');
		expect(screen.queryByText('Vaša zasebna povezava')).toBeNull();
		// An account has nothing to convert (C7 §6).
		expect(screen.queryByRole('link', { name: 'Ustvari račun in obdrži prijavo' })).toBeNull();
		// The softer row for a sighting: no "does not replace" and no chip line.
		expect(
			await screen.findByText(
				'Če žival ujamete ali jo kdo vzame k sebi, pokličite zavetišče, pristojno za občino Ljubljana.'
			)
		).toBeTruthy();
		expect(screen.queryByText('Čip lahko prebere katero koli zavetišče ali veterinar.')).toBeNull();
	});

	it('"Sporoči opažanje" on a lost listing sends a SIGHTED report linked to it, with no email and no shelter row', async () => {
		const api = show({ entry: 'sighted', linked: { id: LOST_ID, code: lostReport.short_code } });
		// The listing on every step: name and status word.
		expect(await screen.findByText('Rex')).toBeTruthy();
		fireEvent.click(await screen.findByRole('button', { name: 'Potrdi kraj' }));
		expect(await screen.findByRole('heading', { level: 1, name: 'Kdaj ste jo videli?' })).toBeTruthy();
		next();
		expect(await screen.findByRole('heading', { level: 1, name: 'Dodate fotografijo?' })).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Pošlji opažanje' }));

		expect(await screen.findByRole('heading', { level: 1, name: 'Hvala za opažanje' })).toBeTruthy();
		const body = posts(api)[0]!.body as CreateReportInput;
		// The species comes from the listing; the place is the picker's (already coarsened) point.
		expect(body).toMatchObject({
			type: 'sighted',
			species: 'dog',
			linked_report_id: LOST_ID,
			location: PICKED,
			photo_ids: [],
		});
		expect(body).not.toHaveProperty('finder_email');
		expect(screen.queryByRole('link', { name: /Pokliči/ })).toBeNull();
		expect(screen.getByRole('link', { name: 'Zapri' }).getAttribute('href')).toBe('/r/Rex12345');
	});

	it('says a held sighting from a listing is being checked, not that the owner was told', async () => {
		show(
			{ entry: 'sighted', linked: { id: LOST_ID, code: lostReport.short_code } },
			{ 'POST /v1/reports': { ...created, moderation_state: 'held' } }
		);
		fireEvent.click(await screen.findByRole('button', { name: 'Potrdi kraj' }));
		await screen.findByRole('heading', { level: 1, name: 'Kdaj ste jo videli?' });
		next();
		await screen.findByRole('heading', { level: 1, name: 'Dodate fotografijo?' });
		fireEvent.click(screen.getByRole('button', { name: 'Pošlji opažanje' }));

		expect(await screen.findByRole('heading', { level: 1, name: 'Hvala za opažanje' })).toBeTruthy();
		expect(screen.getByText(sl.report_found.held_note)).toBeTruthy();
		expect(screen.queryByText(sl.report_found.sighting_done_body)).toBeNull();
	});

	it('"Spremeni" on "Kje" opens the picker in a dialog over the step, and its place goes on (TASK-112)', async () => {
		show();
		expect(await screen.findByRole('heading', { level: 1, name: 'Fotografirajte žival' })).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Dodaj fotografijo' }));
		await screen.findByRole('button', { name: 'Naprej' });
		next();
		fireEvent.click(await screen.findByRole('radio', { name: 'Pes' }));
		next();
		expect(await screen.findByText('Šiška, Ljubljana')).toBeTruthy();

		// The dialog loads on this first open, in its own Suspense: the step stays (afterEach checks the page).
		fireEvent.click(screen.getByRole('button', { name: sl.report_found.where_change }));
		const dialog = await screen.findByRole('dialog');
		fireEvent.click(await within(dialog).findByRole('button', { name: 'Potrdi kraj' }));
		expect(await screen.findByRole('heading', { level: 1, name: sl.report_found.situation_title })).toBeTruthy();
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});

	it('fires report_found_start, and report_found_submit with the region only with consent', async () => {
		show();
		await fillFound();
		expect(track).toHaveBeenCalledWith('report_found_start');
		publish();
		await screen.findByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' });
		expect(vi.mocked(track).mock.calls.map(([event]) => event)).toEqual(['report_found_start']);

		cleanup();
		vi.mocked(getConsent).mockReturnValue({ v: 1, analytics: true, ts: '2026-10-16T00:00:00Z' });
		show();
		await fillFound();
		publish();
		await waitFor(() =>
			expect(track).toHaveBeenCalledWith('report_found_submit', {
				report_type: 'found',
				species: 'dog',
				region: 'osrednjeslovenska',
				municipality: 'ljubljana',
			})
		);
		expect(vi.mocked(track).mock.calls.filter(([event]) => event === 'report_found_submit')).toHaveLength(1);
	});
});

describe('FoundFlow publish (C1 Idempotency-Key, C7 retries)', () => {
	it('repeats the same key after no answer, retrying by itself on reconnect (TASK-29.3 review a)', async () => {
		let fail = true;
		const api = show(
			{},
			{
				'POST /v1/reports': () => {
					if (!fail) return created;
					fail = false;
					throw new TypeError('Failed to fetch');
				},
			}
		);
		await fillFound();
		publish();
		expect(await screen.findByText(sl.errors.NETWORK)).toBeTruthy();
		await reconnect(api, 2);
		expect(await screen.findByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' })).toBeTruthy();
		const [first, second] = posts(api);
		expect(keyOf(second!)).toBe(keyOf(first!));
		expect(second!.body).toEqual(first!.body);
	});

	it('repeats the same key after a server fault, and takes a new one after a refusal or an edit', async () => {
		const answers: (MockHandler | object)[] = [
			() => mockError('INTERNAL'),
			() => mockError('INTERNAL'),
			() => mockError('VALIDATION'),
			() => mockError('VALIDATION'),
			created,
		];
		const api = show({}, { 'POST /v1/reports': (request) => resolve(answers.shift()!, request) });
		await fillFound();
		publish();
		expect(await screen.findByText(sl.errors.INTERNAL)).toBeTruthy();
		// A try clears a refusal's note at once; its own answer brings the note back.
		publish();
		expect(await screen.findByText(sl.errors.INTERNAL)).toBeTruthy();
		expect(posts(api)).toHaveLength(2);
		expect(keyOf(posts(api)[1]!)).toBe(keyOf(posts(api)[0]!));
		publish();
		expect(await screen.findByText(sl.errors.VALIDATION)).toBeTruthy();
		expect(posts(api)).toHaveLength(3);
		expect(keyOf(posts(api)[2]!)).toBe(keyOf(posts(api)[0]!));
		// A definitive refusal ends that submission: the same answers go again under a new key.
		publish();
		expect(await screen.findByText(sl.errors.VALIDATION)).toBeTruthy();
		expect(posts(api)).toHaveLength(4);
		expect(keyOf(posts(api)[3]!)).not.toBe(keyOf(posts(api)[2]!));
		// An edit is a new submission too.
		fireEvent.click(screen.getByRole('button', { name: 'Uredi: Žival je' }));
		fireEvent.click(await screen.findByRole('radio', { name: /Ne, žival ni pri meni/ }));
		next();
		await screen.findByRole('heading', { level: 1, name: 'Objavite prijavo' });
		publish();
		expect(await screen.findByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' })).toBeTruthy();
		expect(keyOf(posts(api)[4]!)).not.toBe(keyOf(posts(api)[3]!));
		expect(posts(api)[4]!.body).toMatchObject({ type: 'sighted' });
	});

	it('shows the hourly limit with its minutes and keeps Publish off until then; the key stays', async () => {
		const api = show(
			{},
			{ 'POST /v1/reports': () => mockError('RATE_LIMITED', 'Too many reports', { retry_after_s: 1800 }) }
		);
		await fillFound();
		publish();
		const note = await screen.findByText(
			'V kratkem času ste oddali več prijav, zato smo jih začasno omejili. Poskusite znova čez 30 minut.'
		);
		const button = screen.getByRole('button', { name: 'Objavi prijavo' }) as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		expect(button.getAttribute('aria-describedby')).toBe(note.parentElement!.id);
		expect(posts(api)).toHaveLength(1);
	});

	it('reuses the key for the second POST once the limit is over', async () => {
		const answers: (MockHandler | object)[] = [
			() => mockError('RATE_LIMITED', 'Too many', { retry_after_s: 1 }),
			created,
		];
		const api = show({}, { 'POST /v1/reports': (request) => resolve(answers.shift()!, request) });
		await fillFound();
		publish();
		await waitFor(() =>
			expect((screen.getByRole('button', { name: 'Objavi prijavo' }) as HTMLButtonElement).disabled).toBe(true)
		);
		await waitFor(
			() =>
				expect((screen.getByRole('button', { name: 'Objavi prijavo' }) as HTMLButtonElement).disabled).toBe(
					false
				),
			{ timeout: 3000 }
		);
		publish();
		expect(await screen.findByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' })).toBeTruthy();
		expect(posts(api)).toHaveLength(2);
		expect(keyOf(posts(api)[1]!)).toBe(keyOf(posts(api)[0]!));
	});

	it('keeps the key on a CONFLICT (the first request with it is still running, C1)', async () => {
		const answers: (MockHandler | object)[] = [() => mockError('CONFLICT'), created];
		const api = show({}, { 'POST /v1/reports': (request) => resolve(answers.shift()!, request) });
		await fillFound();
		publish();
		await screen.findByText(sl.errors.CONFLICT);
		publish();
		expect(await screen.findByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' })).toBeTruthy();
		expect(posts(api)).toHaveLength(2);
		expect(keyOf(posts(api)[1]!)).toBe(keyOf(posts(api)[0]!));
	});

	it('shows the limit when the anonymous sign-in itself is rate limited (GoTrue 429)', async () => {
		const api = show();
		await fillFound();
		auth.ensureSession.mockRejectedValueOnce(new ApiError('RATE_LIMITED', 'RATE_LIMITED', { status: 429 }));
		publish();
		expect(
			await screen.findByText(
				'V kratkem času ste oddali več prijav, zato smo jih začasno omejili. Poskusite znova čez 1 minuto.'
			)
		).toBeTruthy();
		expect((screen.getByRole('button', { name: 'Objavi prijavo' }) as HTMLButtonElement).disabled).toBe(true);
		expect(posts(api)).toHaveLength(0);
	});

	it('does not publish from the automatic retry unless the finder is on the last step', async () => {
		let fail = true;
		const api = show(
			{},
			{
				'POST /v1/reports': () => {
					if (!fail) return created;
					fail = false;
					throw new TypeError('Failed to fetch');
				},
			}
		);
		await fillFound();
		publish();
		await screen.findByText(sl.errors.NETWORK);
		fireEvent.click(screen.getByRole('button', { name: 'Nazaj' }));
		await screen.findByRole('heading', { level: 1, name: sl.report_found.situation_title });
		act(() => void window.dispatchEvent(new Event('online')));
		await new Promise((r) => setTimeout(r, 100));
		expect(posts(api)).toHaveLength(1);
		next();
		await screen.findByRole('heading', { level: 1, name: 'Objavite prijavo' });
		await reconnect(api, 2);
		expect(await screen.findByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' })).toBeTruthy();
		expect(posts(api)).toHaveLength(2);
	});

	it("keeps the draft's startedAt as the capture time when it is restored", async () => {
		exif.on = false;
		const startedAt = '2026-10-01T05:00:00.000Z';
		idb.set('draft:found:found', {
			step: 'send',
			values: {
				...initialValues('found'),
				startedAt,
				species: 'dog',
				situation: 'have',
				location: PICKED,
				source: 'pin',
			},
		});
		const api = show();
		await screen.findByRole('heading', { level: 1, name: 'Objavite prijavo' });
		fireEvent.click(screen.getByRole('button', { name: 'Dodaj fotografijo', hidden: true }));
		// The summary shows the photo once the flow has it (Publish is on before that).
		await screen.findByRole('img', { name: 'Fotografija 1 od 1' });
		publish();
		expect(await screen.findByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' })).toBeTruthy();
		expect((posts(api)[0]!.body as CreateReportInput).event_at).toBe(startedAt);
	});

	it('falls back to the plain flow when the linked listing cannot be read and the link has no species', async () => {
		show(
			{ entry: 'sighted', linked: { id: LOST_ID, code: 'Gone1234' } },
			{ 'GET /v1/reports/:code': () => mockError('NOT_FOUND') }
		);
		expect(await screen.findByRole('heading', { level: 1, name: 'Fotografirajte žival' })).toBeTruthy();
	});

	it('says the daily limit when the wait is longer than an hour', async () => {
		show({}, { 'POST /v1/reports': () => mockError('RATE_LIMITED', 'Too many', { retry_after_s: 6 * 3600 }) });
		await fillFound();
		publish();
		expect(await screen.findByText(sl.report_found.limit_day)).toBeTruthy();
	});

	it('keeps the answers after a failed captcha and tries again on reconnect', async () => {
		const api = show();
		await fillFound();
		auth.ensureSession.mockRejectedValueOnce(new ApiError('CAPTCHA_FAILED', 'CAPTCHA_FAILED'));
		publish();
		expect(await screen.findByText(sl.report_found.captcha_failed)).toBeTruthy();
		expect(posts(api)).toHaveLength(0);
		// Publish stays on, the answers stay.
		expect((screen.getByRole('button', { name: 'Objavi prijavo' }) as HTMLButtonElement).disabled).toBe(false);
		expect(screen.getByText('pri meni')).toBeTruthy();
		await reconnect(api, 1);
		expect(await screen.findByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' })).toBeTruthy();
		expect(posts(api)).toHaveLength(1);
	});

	it('sends once when Enter and a click submit together (TASK-29.3 review c)', async () => {
		const api = show();
		await fillFound();
		const form = screen.getByRole('heading', { level: 1, name: 'Objavite prijavo' }).closest('form')!;
		fireEvent.submit(form);
		fireEvent.submit(form);
		fireEvent.click(screen.getByRole('button', { name: /^Objav/ }));
		expect(await screen.findByRole('heading', { level: 1, name: 'Hvala, prijava je objavljena' })).toBeTruthy();
		expect(posts(api)).toHaveLength(1);
	});
});

describe('FoundFlow AI pre-fill (C19, TASK-41.2)', () => {
	const ATTRIBUTES = 'GET /v1/photos/:id/attributes';
	const on = (result: PhotoAttributes = attributesReady): MockRoutes => ({
		'GET /v1/config/public': { 'ai.enabled': true },
		[ATTRIBUTES]: attributesPendingThenReady(result, 1),
	});
	const LOW = 'Iz fotografije tega ne moremo zanesljivo razbrati. Izberite sami.';
	/** The photo, then the result is in before Naprej (dog, black; size below the minimum; a collar). */
	async function photoChecked(announced = 'Iz fotografije smo predlagali 2 podatka. Preverite ju.') {
		expect(await screen.findByRole('heading', { level: 1, name: 'Fotografirajte žival' })).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Dodaj fotografijo' }));
		expect(
			await screen.findByText('Pregledujemo fotografijo … Obrazec lahko medtem izpolnjujete naprej.')
		).toBeTruthy();
		expect((await screen.findAllByText(announced, undefined, { timeout: 3000 })).length).toBeGreaterThan(0);
	}
	/** From "Kje" to Publish: the photo's place, the animal with the finder. */
	async function toPublish() {
		expect(await screen.findByRole('heading', { level: 1, name: 'Kje ste žival našli?' })).toBeTruthy();
		next();
		fireEvent.click(await screen.findByRole('radio', { name: /Da, žival je pri meni/ }));
		next();
		expect(await screen.findByRole('heading', { level: 1, name: 'Objavite prijavo' })).toBeTruthy();
	}

	it('asks "Je to pravilno?" with the breed; "Da, nadaljuj" makes the suggestion the report', async () => {
		const api = show({}, on());
		await photoChecked();
		next();
		expect(await screen.findByRole('heading', { level: 1, name: 'Je to pravilno?' })).toBeTruthy();
		// Size is below the minimum confidence, so it is left out of the sentence.
		expect(screen.getByText('Pes, labradorec, črne barve')).toBeTruthy();
		expect(screen.getByText('Predlog iz fotografije. Umetna inteligenca se lahko moti.')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Kako nastanejo predlogi?' }));
		expect(screen.getByText(/^Fotografijo pregleda model umetne inteligence\./)).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Da, nadaljuj' }));
		expect(await screen.findByRole('heading', { level: 1, name: 'Kje ste žival našli?' })).toBeTruthy();
		next();
		fireEvent.click(await screen.findByRole('radio', { name: /Da, žival je pri meni/ }));
		// The photo shows a collar and P7 has no collar field: the hint goes under the note.
		expect(screen.getByText('Na fotografiji je videti ovratnica. Če lahko, jo omenite v opombi.')).toBeTruthy();
		next();
		expect(await screen.findByRole('heading', { level: 1, name: 'Objavite prijavo' })).toBeTruthy();
		expect(screen.getByText('Pes · Labradorec · Črna')).toBeTruthy();
		publish();
		await waitFor(() => expect(posts(api)).toHaveLength(1));
		const body = posts(api)[0]!.body as CreateReportInput;
		expect(body).toMatchObject({ species: 'dog', breed_codes: ['dog.labrador_retriever'], colours: ['black'] });
		expect(body.size).toBeUndefined();
	});

	it('"Uredi podatke" opens the choices with the suggestions marked, the breed to change or clear, and the hint', async () => {
		const api = show({}, on());
		await photoChecked();
		next();
		fireEvent.click(await screen.findByRole('button', { name: 'Uredi podatke' }));
		expect(await screen.findByRole('heading', { level: 1, name: 'Katera žival je to?' })).toBeTruthy();
		expect(screen.getByRole('radio', { name: 'Pes' }).getAttribute('aria-checked')).toBe('true');
		expect(screen.getByRole('button', { name: 'Črna' }).getAttribute('aria-pressed')).toBe('true');
		// The sentence named a breed (wireframe v2 F3): "Pasma (neobvezno)", filled and marked.
		const breed = screen.getByRole('combobox', { name: 'Pasma (neobvezno)' }) as HTMLInputElement;
		expect(breed.value).toBe('Labradorec');
		// The mark with its confidence in the selected row (the h1 is the label), after the breed label and after the
		// colour heading; the hint under the sizes.
		expect(screen.getAllByText('Predlog')).toHaveLength(3);
		expect(screen.getByText('· 98 %')).toBeTruthy();
		expect(screen.getByText('· 81 %')).toBeTruthy();
		expect(screen.getByText('· 93 %')).toBeTruthy();
		// The finder clears the breed: its mark goes and no breed is sent.
		fireEvent.change(breed, { target: { value: '' } });
		fireEvent.blur(breed);
		expect(screen.getAllByText('Predlog')).toHaveLength(2);
		expect(screen.getByText(LOW)).toBeTruthy();
		expect(screen.getByText(/zato jih preverite, preden nadaljujete\./)).toBeTruthy();
		// Choosing a size is the finder's own answer: the hint goes.
		fireEvent.click(screen.getByRole('button', { name: 'Velika' }));
		expect(screen.queryByText(LOW)).toBeNull();
		next();
		await toPublish();
		publish();
		await waitFor(() => expect(posts(api)).toHaveLength(1));
		const body = posts(api)[0]!.body as CreateReportInput;
		expect(body).toMatchObject({ species: 'dog', size: 'l', colours: ['black'] });
		expect(body.breed_codes).toBeUndefined();
	});

	it('a draft left after "Uredi podatke" comes back as the manual step 2, with the breed unmarked', async () => {
		exif.on = false;
		idb.set('draft:found:found', {
			step: 'where',
			aiMode: 'manual',
			values: {
				...initialValues('found'),
				species: 'dog',
				breed_codes: ['dog.labrador_retriever'],
				colours: ['black'],
				location: PICKED,
				source: 'pin',
			},
		});
		show({}, on());
		expect(await screen.findByRole('heading', { level: 1, name: 'Kje ste žival našli?' })).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Nazaj' }));
		expect(await screen.findByRole('heading', { level: 1, name: 'Katera žival je to?' })).toBeTruthy();
		expect((screen.getByRole('combobox', { name: 'Pasma (neobvezno)' }) as HTMLInputElement).value).toBe(
			'Labradorec'
		);
		expect(screen.queryByText('Predlog')).toBeNull();
	});

	it('another animal: the note under the photo and on step 2, nothing filled, the finder carries on by hand', async () => {
		const api = show({}, on(attributesOtherAnimal));
		await photoChecked('Na fotografiji je videti druga žival');
		expect(screen.getByRole('button', { name: 'Zamenjaj fotografijo' })).toBeTruthy();
		next();
		expect(await screen.findByRole('heading', { level: 1, name: 'Katera žival je to?' })).toBeTruthy();
		expect(screen.getByRole('radio', { name: 'Pes' }).getAttribute('aria-checked')).toBe('false');
		// In the AI slot by Naprej now (the photo step, with its own copy under the photo, is hidden).
		expect(screen.getAllByText(/Prijave na Najdimo so samo za pse in mačke\./).length).toBeGreaterThan(0);
		fireEvent.click(screen.getByRole('button', { name: 'Obdrži fotografijo' }));
		expect(screen.queryByText(/Prijave na Najdimo so samo za pse in mačke\./)).toBeNull();
		fireEvent.click(screen.getByRole('radio', { name: 'Mačka' }));
		next();
		await toPublish();
		publish();
		await waitFor(() => expect(posts(api)).toHaveLength(1));
		expect(posts(api)[0]!.body).toMatchObject({ species: 'cat' });
	});

	it('polls nothing with ai.enabled false: the flow as before', async () => {
		const attributes = vi.fn(() => attributesReady);
		const api = show({}, { 'GET /v1/config/public': { 'ai.enabled': false }, [ATTRIBUTES]: attributes });
		await fillFound();
		expect(api.calls.some((call) => call.path === '/v1/config/public')).toBe(true);
		expect(attributes).not.toHaveBeenCalled();
		expect(screen.queryByText('Predlog')).toBeNull();
	});
});

function resolve(answer: MockHandler | object, request: Parameters<MockHandler>[0]) {
	return typeof answer === 'function' ? (answer as MockHandler)(request) : answer;
}
