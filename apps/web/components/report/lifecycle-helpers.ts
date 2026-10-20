import { type ErrorCodeParam, type EventParams, flowTracker, track } from '@zivali/analytics';
import type { DetailReport } from '@/components/report/slots/types';

// The pure parts of the P14 lifecycle (no store, no API hooks): /m, the edit page and the owner actions share them
// without the public report page or /m downloading lifecycle.tsx.

const DAY = 86_400_000;
/** C4 `lifecycle.reopen_days` (default 7). Past it the API answers GONE, which the reopen action shows. */
export const REOPEN_DAYS = 7;
/** Found and sighted reports expire after 30 idle days (C4); the note shows from day 25 (P7). */
const EXPIRY_DAYS = 30;
const NOTICE_DAYS = 5;
/** Lost reports: the first reminder is at day 7 (C4); "Nadaljuj iskanje" resets the idle time. */
const REMINDER_DAYS = 7;

/** A manager's closed or reunited report, still within the reopen window. A moderation removal stays closed. */
export function canReopen(report: DetailReport, now: number): boolean {
	const ended =
		report.status === 'closed' ? report.closed_at : report.status === 'reunited' ? report.reunited_at : null;
	return Boolean(
		report.is_mine && report.close_reason !== 'removed' && ended && now - Date.parse(ended) < REOPEN_DAYS * DAY
	);
}

/**
 * The open search's due notice, if any: a lost report idle for 7 days gets the reminder ("Še iščete?", with the days
 * since it was posted); a found or sighted one the expiry note from day 25 (with the days left).
 */
export function expiryNotice(
	report: DetailReport,
	now: number
): { kind: 'reminder' | 'expiry'; days: number } | undefined {
	if (!report.is_mine || (report.status !== 'open' && report.status !== 'matched')) return undefined;
	const idle = Math.floor((now - Date.parse(report.last_owner_update_at ?? report.created_at)) / DAY);
	if (report.type === 'lost')
		return idle >= REMINDER_DAYS
			? { kind: 'reminder', days: Math.floor((now - Date.parse(report.created_at)) / DAY) }
			: undefined;
	const left = EXPIRY_DAYS - idle;
	return left >= 1 && left <= NOTICE_DAYS ? { kind: 'expiry', days: left } : undefined;
}

/** C12 `reunited`: species, region and municipality only. A no-op without consent; nothing for a place abroad. */
export function trackReunited({
	species,
	region_slug,
	municipality_slug,
}: Pick<DetailReport, 'species' | 'region_slug' | 'municipality_slug'>) {
	if (region_slug && municipality_slug)
		track('reunited', {
			species,
			region: region_slug as EventParams['reunited']['region'],
			municipality: municipality_slug,
		});
}

/** C12b reunite: `dialog` each time the mark-reunited dialog opens (each opening is its own flow instance). */
export const trackReuniteDialog = () => flowTracker('reunite').step('dialog');
/** C12b reunite: one flow_error per refused mark_reunited transition, with its C1 code. */
export const trackReuniteRefused = (code: ErrorCodeParam) => flowTracker('reunite').error('dialog', code);

let pending: string | undefined;

/**
 * A toast for the next owner view to show: the edit page leaves it before it goes back to the report, whose toaster
 * mounts only then (the two pages are in different layouts).
 */
export function flash(message: string) {
	pending = message;
}

/** The toast `flash` left, once. */
export function takeFlash(): string | undefined {
	const message = pending;
	pending = undefined;
	return message;
}
