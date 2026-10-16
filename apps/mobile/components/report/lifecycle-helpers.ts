import { type EventParams, track } from '@zivali/analytics';
import type { DetailReport } from '@/components/report/slots/types';

// The pure parts of the P14 lifecycle (no sheets, no API hooks): /m and the report page share them without
// /m downloading lifecycle.tsx. Same rules as the web's lifecycle-helpers.ts.

const DAY = 86_400_000;
/** Found and sighted reports expire after 30 idle days (C4); the note shows from day 25 (P7). */
const EXPIRY_DAYS = 30;
const NOTICE_DAYS = 5;
/** Lost reports: the first reminder is at day 7 (C4); "Nadaljuj iskanje" resets the idle time. */
const REMINDER_DAYS = 7;

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

/** C10 deep-link action (`?action=`): anything else is no action. */
export type ReportAction = 'keep' | 'extend' | 'close';
export function parseAction(value: string | string[] | undefined): ReportAction | undefined {
	const v = Array.isArray(value) ? value[0] : value;
	return v === 'keep' || v === 'extend' || v === 'close' ? v : undefined;
}
