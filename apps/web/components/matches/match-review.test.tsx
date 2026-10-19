import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMockEvents, initAnalytics, resetMockEvents, setConsent } from '@zivali/analytics';
import { match, visualMatch } from '@zivali/api/__fixtures__/matches';
import { ownerReport } from '@zivali/api/__fixtures__/reports';
import { abuseCreated } from '@zivali/api/__fixtures__/abuse';
import { ApiError } from '@zivali/api/client';
import { createMockApi } from '@zivali/api/mock';
import { type ApiStore, createApiStore } from '@zivali/api/rtk';
import en from '@zivali/i18n/dist/en.json';
import sl from '@zivali/i18n/dist/sl.json';
import type { MatchList, MatchSuggestion, PublicPhoto, ReportOwnerView, VisualMatchReason } from '@zivali/types';
import { MatchesNote } from '@/components/report/slots/matches-note';

import { MatchReview } from './match-review';

const state = vi.hoisted(() => ({
	list: {} as { data?: MatchList; error?: unknown; isFetching?: boolean },
	mine: undefined as unknown,
	wide: true,
	confirm: vi.fn(),
	reject: vi.fn(),
	refetch: vi.fn(),
	push: vi.fn(),
	replace: vi.fn(),
}));
vi.mock('@zivali/api/matches', () => ({
	useListMatchesQuery: () => ({ refetch: state.refetch, ...state.list }),
	useConfirmMatchMutation: () => [state.confirm, { isLoading: false }],
	useRejectMatchMutation: () => [state.reject, { isLoading: false }],
}));
vi.mock('@zivali/api/reports', () => ({ useGetReportQuery: () => ({ data: state.mine }) }));
vi.mock('@zivali/api/geocode', () => ({ useReversePlaceQuery: () => ({ data: { label: 'Šiška, Ljubljana' } }) }));
vi.mock('next/navigation', async (actual) => ({
	...(await actual()),
	useRouter: () => ({ push: state.push, replace: state.replace, prefetch: vi.fn() }),
	useParams: () => ({ locale: 'sl' }),
	usePathname: () => '/r/Luna1234/ujemanja',
}));
// The P16 gate (gate.tsx, tested there): an unconfirmed account sees "Potrdite svoj e-naslov".
vi.mock('@/components/auth/gate', () => ({
	AuthGate: ({ open }: { open: boolean }) => (open ? <p role="dialog">{sl.auth.gate_unverified_title}</p> : null),
}));
// The abuse dialog (lazy) brings its own StoreProvider over the in-memory API; no session is needed to send.
const stores = vi.hoisted(() => ({ current: undefined as ApiStore | undefined }));
vi.mock('@/lib/store', async (actual) => {
	const real = await actual<typeof import('@/lib/store')>();
	return {
		...real,
		getStore: (...args: Parameters<typeof real.getStore>) => stores.current ?? real.getStore(...args),
	};
});
vi.mock('@/lib/auth', () => ({ ensureSession: vi.fn() }));
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock('sonner', async (actual) => ({ ...(await actual()), toast }));

const CHIP = '705098100012345';
const CODE = 'Luna1234';
const mine: ReportOwnerView = {
	...ownerReport,
	short_code: CODE,
	type: 'lost',
	name: 'Luna',
	manager_role: 'owner',
	chip_number: CHIP,
	sex: 'female',
	photos: [{ ...ownerReport.photos[0]!, alt: '' }],
};
const likely: MatchSuggestion = match;
const chip: MatchSuggestion = {
	...match,
	id: 'm-chip',
	score: 1,
	strength: 'strong',
	chip_match: true,
	reasons: [
		{ code: 'chip' },
		{ code: 'distance', band: 'lt1' },
		{ code: 'time', hours_band: 'lt24' },
		{ code: 'size', match: 'equal' },
	],
	other: { ...match.other, short_code: 'Chip0001', sex: 'female' },
};
const sighted: MatchSuggestion = {
	...match,
	id: 'm-sighted',
	score: 0.55,
	strength: 'possible',
	reasons: [{ code: 'colour', overlap: 0.5 }],
	other: { ...match.other, short_code: 'Seen0001', type: 'sighted', photos: [] },
};
// The API ranks by score; the chip match is pinned first.
const items = [likely, chip, sighted];

const resolves = (value?: unknown) => ({ unwrap: () => Promise.resolve(value) });
const refuses = (code: 'UNVERIFIED_EMAIL' | 'CONFLICT') => ({
	unwrap: () => Promise.reject(new ApiError(code, code, { status: 403 })),
});
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function show({
	list = { data: { items } } as typeof state.list,
	selected,
	locale = 'sl',
	code = CODE,
}: {
	list?: typeof state.list;
	selected?: string;
	locale?: 'sl' | 'en';
	code?: string;
} = {}) {
	state.list = list;
	return render(
		<NextIntlClientProvider locale={locale} messages={locale === 'sl' ? sl : en} timeZone="Europe/Ljubljana">
			<MatchReview code={code} selected={selected} />
		</NextIntlClientProvider>
	);
}
const t = sl.matches;
const rows = () => screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.includes('?m='));
const reviewHeading = () => screen.getByRole('heading', { level: 2, name: t.review_title });

beforeEach(() => {
	state.mine = mine;
	state.wide = true;
	window.matchMedia = ((query: string) => ({
		matches: state.wide,
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {},
	})) as unknown as typeof window.matchMedia;
	state.confirm.mockReturnValue(resolves({ conversation_id: 'c1' }));
	state.reject.mockReturnValue(resolves());
	initAnalytics();
	setConsent({ analytics: true });
	resetMockEvents();
});
afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	Reflect.deleteProperty(window, 'matchMedia');
});

describe('MatchReview list (P11)', () => {
	it('waits with row and comparison skeletons, announced once', () => {
		show({ list: {} });
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(t.title);
		expect(screen.getByRole('status').textContent).toBe(sl.common.loading);
		expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
	});

	it('ranks the chip match first, labelled, with words and bars for strength and bands for place and time', () => {
		show();
		expect(screen.getByText('3 možna ujemanja')).toBeTruthy();
		const [first, second, third] = rows();
		expect(first!.getAttribute('href')).toBe(`/r/${CODE}/ujemanja?m=m-chip`);
		expect(first!.textContent).toContain(t.chip_row);
		expect(within(first!).getByRole('img', { name: 'Moč ujemanja: Zelo verjetno' })).toBeTruthy();
		expect(first!.textContent).toContain('Šiška · manj kot 1 km');
		expect(first!.textContent).toContain('Prijavljena manj kot 24 ur po izgubi');
		expect(second!.textContent).toContain('Šiška · 1–3 km');
		expect(within(second!).getByRole('img', { name: 'Moč ujemanja: Verjetno' })).toBeTruthy();
		expect(third!.textContent).toContain(t.row_sighted);
		expect(within(third!).getByRole('img', { name: 'Moč ujemanja: Mogoče' })).toBeTruthy();
		// Never a percentage or the score.
		expect(document.body.textContent).not.toMatch(/%|0[.,]78/);
	});

	it('opens the first match beside the list from lg, marked as the current row', () => {
		show();
		expect(rows()[0]!.getAttribute('aria-current')).toBe('true');
		expect(reviewHeading()).toBeTruthy();
	});

	it('below lg shows only the list until a match is picked', () => {
		state.wide = false;
		show();
		expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
		expect(getMockEvents()).toEqual([]);
	});

	it('explains that the search keeps running and offers to share it when there are no matches', async () => {
		const share = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'share', { value: share, configurable: true });
		show({ list: { data: { items: [] } } });
		expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(t.empty_title);
		expect(screen.getByText(t.empty_body)).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: t.empty_share }));
		await flush();
		expect(share).toHaveBeenCalledWith({ url: `${window.location.origin}/r/${CODE}` });
		Reflect.deleteProperty(navigator, 'share');
	});

	it('opens the conversation once for a double trigger in the same tick', async () => {
		show({ selected: 'm-chip' });
		const button = screen.getByRole('button', { name: t.confirm });
		fireEvent.click(button);
		fireEvent.click(button);
		await flush();
		expect(state.confirm).toHaveBeenCalledTimes(1);
		expect(getMockEvents().filter((e) => e.name === 'match_confirmed')).toHaveLength(1);
	});

	it('clears the reject reason when the dialog is cancelled', () => {
		show({ selected: 'm-chip' });
		fireEvent.click(screen.getByRole('button', { name: t.reject }));
		let dialog = screen.getByRole('alertdialog', { name: t.reject_title });
		fireEvent.change(within(dialog).getByRole('textbox', { name: t.reject_reason }), { target: { value: 'Ne' } });
		fireEvent.click(within(dialog).getByRole('button', { name: t.reject_cancel }));
		fireEvent.click(screen.getByRole('button', { name: t.reject }));
		dialog = screen.getByRole('alertdialog', { name: t.reject_title });
		expect((within(dialog).getByRole('textbox', { name: t.reject_reason }) as HTMLTextAreaElement).value).toBe('');
	});

	it('offers the poster PDF and the alerts settings when there are no matches', () => {
		show({ list: { data: { items: [] } }, locale: 'en' });
		expect(screen.getByRole('link', { name: en.matches.empty_poster }).getAttribute('href')).toBe(
			`/r/${CODE}/poster.pdf?lang=en`
		);
		expect(screen.getByRole('link', { name: en.matches.empty_alerts }).getAttribute('href')).toBe(
			'/en/account/alerts'
		);
	});

	it('refuses a non-manager with the permission sentence and a link back to the report, not a retry', () => {
		show({ list: { error: { status: 403, data: { code: 'FORBIDDEN' } } } });
		expect(screen.getByRole('alert').textContent).toBe(sl.errors.FORBIDDEN);
		expect(screen.getByRole('link', { name: sl.common.back }).getAttribute('href')).toBe(`/r/${CODE}`);
		expect(screen.queryByRole('button', { name: sl.common.inline_error_retry })).toBeNull();
	});

	it('offers a retry for any other failure', () => {
		show({ list: { error: { status: 'FETCH_ERROR' } } });
		fireEvent.click(screen.getByRole('button', { name: sl.common.inline_error_retry }));
		expect(state.refetch).toHaveBeenCalled();
	});

	it('notes a match the server withdrew since the last load', () => {
		const view = show({ code: 'Gone1234' });
		expect(screen.queryByText(t.withdrawn)).toBeNull();
		state.list = { data: { items: [chip, sighted] } };
		view.rerender(
			<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				<MatchReview code="Gone1234" />
			</NextIntlClientProvider>
		);
		expect(screen.getByText(t.withdrawn)).toBeTruthy();
	});
});

describe('MatchReview review (P11)', () => {
	it('compares both photos with their alt text, the strength line, the chip banner and why', () => {
		show({ selected: 'm-chip' });
		const desktop = screen.getAllByRole('figure');
		expect(screen.getAllByAltText(`Vaša žival: Luna`).length).toBeGreaterThan(0);
		expect(screen.getAllByAltText(`Prijavljena žival: ${match.other.photos[0]!.alt}`).length).toBeGreaterThan(0);
		expect(desktop.length).toBeGreaterThanOrEqual(2);
		expect(screen.getByText('Ujemanje: Zelo verjetno')).toBeTruthy();
		expect(screen.getByText(t.chip_banner)).toBeTruthy();
		expect(screen.getByRole('heading', { level: 3, name: t.why_title })).toBeTruthy();
		for (const line of [t.reason_chip, 'Kraja sta manj kot 1 km narazen.', t.reason_size])
			expect(screen.getByText(line)).toBeTruthy();
		// The confirm note and no contact data or chip number on the page.
		expect(screen.getByText(t.confirm_note)).toBeTruthy();
		expect(document.body.textContent).not.toContain(CHIP);
	});

	it('lays the facts out as a table with headers, the result as words and "Kdaj" not compared', () => {
		show({ selected: 'm-chip' });
		const table = screen.getByRole('table', { name: t.table_caption });
		const headers = within(table)
			.getAllByRole('columnheader')
			.map((cell) => cell.textContent);
		expect(headers).toEqual([t.col_feature, t.col_mine, t.col_other, t.col_result]);
		const species = within(table).getByRole('row', { name: new RegExp(`^${t.row_species}`) });
		expect(species.textContent).toContain(t.result_same);
		const when = within(table).getByRole('row', { name: new RegExp(`^${t.row_when}`) });
		expect(when.textContent).toContain(t.result_not_compared);
	});

	it('says a sighting may have moved on', () => {
		show({ selected: 'm-sighted' });
		expect(screen.getByText(t.caveat_sighting)).toBeTruthy();
		expect(screen.getByText(t.reason_colour_partial)).toBeTruthy();
	});

	it('fires match_suggested once on view with species, region and match_source only', () => {
		show({ selected: 'm-chip' });
		expect(getMockEvents()).toEqual([
			{ name: 'match_suggested', params: { species: 'dog', region: 'osrednjeslovenska', match_source: 'chip' } },
		]);
	});

	it('sends no analytics without consent', async () => {
		setConsent({ analytics: false });
		show({ selected: 'm-chip' });
		fireEvent.click(screen.getByRole('button', { name: t.confirm }));
		await flush();
		expect(state.confirm).toHaveBeenCalled();
		expect(getMockEvents()).toEqual([]);
	});

	it('confirm opens the conversation itself and fires match_confirmed', async () => {
		show({ selected: 'm-chip' });
		resetMockEvents();
		fireEvent.click(screen.getByRole('button', { name: t.confirm }));
		await flush();
		expect(state.confirm).toHaveBeenCalledWith({ id: 'm-chip' });
		expect(state.push).toHaveBeenCalledWith('/nabiralnik/c1');
		expect(getMockEvents()).toEqual([
			{ name: 'match_confirmed', params: { species: 'dog', region: 'osrednjeslovenska', match_source: 'chip' } },
		]);
	});

	it('an unconfirmed email gets the sentence and the "Potrdite svoj e-naslov" gate, nothing tracked', async () => {
		state.confirm.mockReturnValue(refuses('UNVERIFIED_EMAIL'));
		show({ selected: 'm-chip' });
		resetMockEvents();
		fireEvent.click(screen.getByRole('button', { name: t.confirm }));
		await flush();
		const alert = screen.getByRole('alert');
		expect(alert.textContent).toContain(sl.errors.UNVERIFIED_EMAIL);
		fireEvent.click(within(alert).getByRole('button', { name: sl.auth.gate_unverified_title }));
		expect(screen.getByRole('dialog').textContent).toBe(sl.auth.gate_unverified_title);
		expect(state.push).not.toHaveBeenCalled();
		expect(getMockEvents()).toEqual([]);
	});

	it('other confirm failures are a toast', async () => {
		state.confirm.mockReturnValue(refuses('CONFLICT'));
		show({ selected: 'm-chip' });
		fireEvent.click(screen.getByRole('button', { name: t.confirm }));
		await flush();
		expect(toast.error).toHaveBeenCalledWith(sl.errors.CONFLICT);
	});

	it('reject asks once with an optional reason, sends it only when given, and hides the match', async () => {
		show({ selected: 'm-chip' });
		fireEvent.click(screen.getByRole('button', { name: t.reject }));
		let dialog = screen.getByRole('alertdialog', { name: t.reject_title });
		fireEvent.click(within(dialog).getByRole('button', { name: t.reject_confirm }));
		await flush();
		expect(state.reject).toHaveBeenLastCalledWith({ id: 'm-chip', body: undefined });
		expect(toast).toHaveBeenCalledWith(t.rejected_toast);
		expect(state.replace).toHaveBeenCalledWith(`/r/${CODE}/ujemanja`);

		fireEvent.click(screen.getByRole('button', { name: t.reject }));
		dialog = screen.getByRole('alertdialog', { name: t.reject_title });
		fireEvent.change(within(dialog).getByRole('textbox', { name: t.reject_reason }), {
			target: { value: '  Druga barva ovratnice  ' },
		});
		fireEvent.click(within(dialog).getByRole('button', { name: t.reject_confirm }));
		await flush();
		expect(state.reject).toHaveBeenLastCalledWith({ id: 'm-chip', body: { reason: 'Druga barva ovratnice' } });
	});

	it('a confirmed match says so and opens its conversation, no decision buttons and no match_suggested', async () => {
		const confirmed = { ...likely, state: 'confirmed' as const };
		show({ list: { data: { items: [confirmed] } }, selected: confirmed.id });
		expect(screen.getAllByText(t.confirmed).length).toBeGreaterThan(0);
		expect(screen.getByText(t.already_confirmed)).toBeTruthy();
		expect(screen.queryByRole('button', { name: t.confirm })).toBeNull();
		expect(screen.queryByRole('button', { name: t.reject })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: t.open_chat }));
		await flush();
		expect(state.push).toHaveBeenCalledWith('/nabiralnik/c1');
		expect(getMockEvents()).toEqual([]);
	});

	it('a match that is gone has its own unavailable state, with the way back below lg', () => {
		state.wide = false;
		show({ selected: 'm-old' });
		expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(t.unavailable_title);
		expect(screen.getByText(t.unavailable_body)).toBeTruthy();
		expect(screen.getByRole('link', { name: sl.common.back }).getAttribute('href')).toBe(`/r/${CODE}/ujemanja`);
	});

	it('moves focus to the review when a match is picked', () => {
		const view = show();
		view.rerender(
			<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
				<MatchReview code={CODE} selected="m-sighted" />
			</NextIntlClientProvider>
		);
		expect(document.activeElement).toBe(reviewHeading());
	});

	it('reads in English', () => {
		show({ selected: 'm-chip', locale: 'en' });
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en.matches.title);
		expect(screen.getByRole('button', { name: en.matches.confirm })).toBeTruthy();
		expect(screen.getAllByAltText('Your pet: Luna').length).toBeGreaterThan(0);
	});
});

describe('MatchReview photo similarity (C8 §Visual similarity, TASK-43.4)', () => {
	const best = visualMatch.reasons.find((r): r is VisualMatchReason => r.code === 'visual')!;
	// C5 public media path: r/<report_id>/<photo_id>/display.webp.
	const media = (report: string, id: string, alt: string): PublicPhoto => ({
		url: `https://media.zivali.test/r/${report}/${id}/display.webp`,
		thumb_url: `https://media.zivali.test/r/${report}/${id}/thumb.webp`,
		alt,
		width: 1600,
		height: 1200,
	});
	const SIDE = 'e4a7b5c9-6e8f-4a0b-8c4d-5e6f7a8b9c00';
	const visual: MatchSuggestion = {
		...visualMatch,
		other: {
			...visualMatch.other,
			// The API order: the most similar photo (other_photo_id) first.
			photos: [
				media(visualMatch.other.id, best.other_photo_id, 'Najden pes od blizu'),
				media(visualMatch.other.id, SIDE, 'Najden pes s strani'),
			],
		},
	};
	const withBand = (band: VisualMatchReason['band']): MatchSuggestion => ({
		...visual,
		reasons: visual.reasons.map((r) => (r.code === 'visual' ? { ...r, band } : r)),
	});
	const mainPhoto = (figure: HTMLElement) => within(figure).getByRole('img').getAttribute('alt');

	beforeEach(() => {
		// The owner's photos in their own order; lost_photo_id is the second.
		state.mine = {
			...mine,
			photos: [media(mine.id, SIDE, 'Luna s strani'), media(mine.id, best.lost_photo_id, 'Luna od blizu')],
		};
	});

	it('adds the band line to the reasons, the AI caveat once, and opens on the most similar pair (AC#1, AC#2)', () => {
		show({ list: { data: { items: [visual] } }, selected: visual.id });
		const line = screen.getByText(t.reason_visual_very_similar);
		expect(line.closest('ul')?.textContent).toContain('Kraja sta 1–3 km narazen.');
		expect(screen.getAllByText(t.visual_caveat)).toHaveLength(1);
		const pair = screen.getByRole('group', { name: t.visual_pair_a11y });
		const [own, other] = within(pair).getAllByRole('figure');
		expect(mainPhoto(own!)).toBe('Vaša žival: Luna od blizu');
		expect(mainPhoto(other!)).toBe('Prijavljena žival: Najden pes od blizu');
		// The rest keep their order: the owner's other photo is the second thumbnail, the API's second photo too.
		const thumbs = (figure: HTMLElement) =>
			within(figure)
				.getAllByRole('button')
				.map((button) => button.querySelector('img')?.getAttribute('src'));
		expect(thumbs(own!)).toEqual([
			`https://media.zivali.test/r/${mine.id}/${best.lost_photo_id}/thumb.webp`,
			`https://media.zivali.test/r/${mine.id}/${SIDE}/thumb.webp`,
		]);
		expect(thumbs(other!)).toEqual(visual.other.photos.map((p) => p.thumb_url));
	});

	it('reads every band in SL and EN', () => {
		for (const band of ['very_similar', 'similar', 'some'] as const)
			for (const locale of ['sl', 'en'] as const) {
				const m = withBand(band);
				show({ list: { data: { items: [m] } }, selected: m.id, locale });
				const messages = locale === 'sl' ? sl : en;
				expect(screen.getByText(messages.matches[`reason_visual_${band}`])).toBeTruthy();
				expect(screen.getByRole('group', { name: messages.matches.visual_pair_a11y })).toBeTruthy();
				cleanup();
			}
	});

	it('has no photo line, caveat or pair name without a visual reason, and keeps the owner photo order', () => {
		show({ list: { data: { items: [match] } }, selected: match.id });
		expect(screen.queryByText(t.visual_caveat)).toBeNull();
		expect(screen.queryByRole('group', { name: t.visual_pair_a11y })).toBeNull();
		expect(mainPhoto(screen.getAllByRole('figure')[0]!)).toBe('Vaša žival: Luna s strani');
	});

	it('confirms and rejects a photo-based match as before (AC#2)', async () => {
		show({ list: { data: { items: [visual] } }, selected: visual.id });
		fireEvent.click(screen.getByRole('button', { name: t.confirm }));
		await flush();
		expect(state.confirm).toHaveBeenCalledWith({ id: visual.id });
		expect(state.push).toHaveBeenCalledWith('/nabiralnik/c1');

		fireEvent.click(screen.getByRole('button', { name: t.reject }));
		const dialog = screen.getByRole('alertdialog', { name: t.reject_title });
		fireEvent.click(within(dialog).getByRole('button', { name: t.reject_confirm }));
		await flush();
		expect(state.reject).toHaveBeenLastCalledWith({ id: visual.id, body: undefined });
		expect(state.replace).toHaveBeenCalledWith(`/r/${CODE}/ujemanja`);
	});
});

describe('P9 matches-note slot', () => {
	const note = (report: ReportOwnerView | typeof ownerReport) =>
		render(
			<NextIntlClientProvider locale="sl" messages={sl}>
				<MatchesNote report={report} />
			</NextIntlClientProvider>
		);

	it('counts the open suggestions of an open lost report and links to the list', async () => {
		state.list = { data: { items: [chip, sighted, { ...likely, state: 'confirmed' }] } };
		note(mine);
		// The owner's island loads lazily (slots/owner-lazy), so a visitor's page ships no store.
		const status = await screen.findByRole('status');
		expect(status.textContent).toContain('2 možni ujemanji');
		expect(within(status).getByRole('link', { name: sl.report.owner_matches_link }).getAttribute('href')).toBe(
			`/r/${CODE}/ujemanja`
		);
	});

	it('shows nothing without suggestions, to the public, or for a found report', () => {
		state.list = { data: { items: [] } };
		note(mine);
		expect(screen.queryByRole('status')).toBeNull();
		cleanup();
		state.list = { data: { items } };
		note({ ...mine, is_mine: false });
		note({ ...mine, type: 'found' });
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('the held note wins over the matches', () => {
		state.list = { data: { items } };
		note({ ...mine, moderation_state: 'held' });
		expect(screen.getByRole('status').textContent).toBe(sl.report.owner_held);
	});
});

describe('MatchReview abuse entry (TASK-20.6)', () => {
	it('reports the other report from the overflow menu: the submit sends target_id = other.id', async () => {
		const api = createMockApi({ 'POST /v1/abuse-reports': abuseCreated });
		stores.current = createApiStore(api);
		show({ selected: 'm-chip' });
		fireEvent.keyDown(screen.getByRole('button', { name: sl.report.more }), { key: 'Enter' });
		const menu = await screen.findByRole('menu', { name: sl.report.more });
		fireEvent.click(within(menu).getByRole('menuitem', { name: sl.report.more_abuse }));
		const dialog = await screen.findByRole('dialog');
		fireEvent.click(within(dialog).getByRole('radio', { name: sl.abuse.reason_scam }));
		fireEvent.click(within(dialog).getByRole('button', { name: sl.abuse.send }));
		await waitFor(() => expect(api.calls.filter((call) => call.path === '/v1/abuse-reports')).toHaveLength(1));
		expect(api.calls.find((call) => call.path === '/v1/abuse-reports')?.body).toMatchObject({
			target_type: 'report',
			target_id: chip.other.id,
			reason: 'scam',
		});
	});
});
