import { formatEur, type Locale, timeZone } from '@zivali/i18n/format';
import type { Notification, NotificationType } from '@zivali/types';

// Inbox rows (P13): text from the `notifications` namespace (the in-app strings equal the push ones), rendered from
// the variables C10 lists per type only. Anything else a payload carries is never shown.

type Values = Record<string, string | number>;

const NAMED = ['has_name', 'pet_name', 'species'];
/** C10 §Types, the in-app variables per type; types without in-app copy (manage_link, new ones) are not listed. */
const FIELDS: Partial<Record<NotificationType, string[]>> = {
	match_chip: ['lost_code', 'other_type', ...NAMED],
	match_suggested: ['lost_code', 'strength', 'other_type', ...NAMED],
	match_confirmed: ['conversation_id', 'species', 'report_type'],
	chat_message: ['conversation_id', 'preview_alias'],
	nearby_lost: ['report_code', 'species', 'distance_band', 'has_area', 'area_name'],
	report_reminder: ['report_code', 'day', ...NAMED],
	report_expiring: ['report_code', 'report_type', 'days_left', ...NAMED],
	report_closed: ['report_code', 'report_type', 'reopen_days', ...NAMED],
	report_hidden: ['report_code'],
	report_reunited: ['report_code', 'species'],
	payment_receipt: ['amount_cents', 'purpose', 'is_test'],
};
// C10: pet_name is cut to 18 and preview_alias to 24 characters; area_name is a public area label.
const MAX: Record<string, number> = { pet_name: 18, preview_alias: 24, area_name: 40 };
const CODE = /^[\w-]{1,64}$/;

export const hasInAppText = (type: string): type is NotificationType => type in FIELDS;

/** ICU values of an inbox row: allowlisted keys only, booleans as yes/no selects, money in the locale. */
export function notificationValues(n: Notification, locale: Locale): Values {
	const values: Values = {};
	for (const key of FIELDS[n.type] ?? []) {
		const value = n.payload[key];
		if (typeof value === 'boolean') values[key] = value ? 'yes' : 'no';
		else if (typeof value === 'number') values[key] = value;
		else if (typeof value === 'string') values[key] = MAX[key] ? value.trim().slice(0, MAX[key]) : value;
	}
	if ('has_name' in values) values.has_name = values.pet_name ? 'yes' : 'no';
	if (typeof values.amount_cents === 'number') values.amount = formatEur(values.amount_cents, locale);
	return values;
}

/** A short code or id from the payload, only if it is one (it goes into a route). */
export function payloadCode(n: Notification, key: string): string | null {
	const value = n.payload[key];
	return typeof value === 'string' && CODE.test(value) ? value : null;
}

/** The app route a row opens (C15 §Mobile): listing, its matches, the conversation or payments. */
export function notificationTarget(n: Notification): string | null {
	const code = (key: string) => payloadCode(n, key);
	switch (n.type) {
		case 'match_chip':
		case 'match_suggested':
			return code('lost_code') && `/r/${code('lost_code')}/matches`;
		case 'match_confirmed':
		case 'chat_message':
			return code('conversation_id') && `/inbox/${code('conversation_id')}`;
		case 'payment_receipt':
			return '/settings/payments';
		default:
			return code('report_code') && `/r/${code('report_code')}`;
	}
}

export type InboxRow = {
	/** The newest notification of the row; a conversation's messages share one row (P13). */
	notification: Notification;
	/** Every id the row stands for, marked read together. */
	ids: string[];
	unread: boolean;
};
export type InboxGroup = { group: 'today' | 'week' | 'earlier'; rows: InboxRow[] };

const ljubljanaDate = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' });
/** Day number of the Ljubljana calendar date, so "today" ends at local midnight. */
function day(date: string | number): number {
	const parts = Object.fromEntries(ljubljanaDate.formatToParts(new Date(date)).map((p) => [p.type, p.value]));
	return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86_400_000;
}

function groupOf(createdAt: string, now: number): InboxGroup['group'] {
	const days = day(now) - day(createdAt);
	return days <= 0 ? 'today' : days < 7 ? 'week' : 'earlier';
}

/**
 * Today, This week (the last 7 days), Earlier; newest first with chip matches on top of their group. Messages of one
 * conversation become one row, unread while any of them is.
 */
export function inboxGroups(items: Notification[], now: number = Date.now()): InboxGroup[] {
	const rows: InboxRow[] = [];
	const conversations = new Map<string, InboxRow>();
	for (const n of items) {
		if (!hasInAppText(n.type)) continue;
		const conversation = n.type === 'chat_message' ? String(n.payload.conversation_id) : null;
		const existing = conversation ? conversations.get(conversation) : undefined;
		if (existing) {
			existing.ids.push(n.id);
			existing.unread ||= !n.read_at;
			continue;
		}
		const row = { notification: n, ids: [n.id], unread: !n.read_at };
		if (conversation) conversations.set(conversation, row);
		rows.push(row);
	}
	const groups: InboxGroup[] = [];
	for (const group of ['today', 'week', 'earlier'] as const) {
		const inGroup = rows.filter((row) => groupOf(row.notification.created_at, now) === group);
		const chip = (row: InboxRow) => Number(row.notification.type !== 'match_chip');
		inGroup.sort((a, b) => chip(a) - chip(b) || b.notification.created_at.localeCompare(a.notification.created_at));
		if (inGroup.length) groups.push({ group, rows: inGroup });
	}
	return groups;
}

const intlLocale: Record<Locale, string> = { sl: 'sl', en: 'en-GB' };
const ROW_TIME: Record<InboxGroup['group'], Intl.DateTimeFormatOptions> = {
	today: { hour: '2-digit', minute: '2-digit' },
	week: { weekday: 'short' },
	earlier: { day: 'numeric', month: 'numeric' },
};

/** "13:52" today, the weekday this week, else the day and month ("3. 10."). */
export function rowTime(createdAt: string, group: InboxGroup['group'], locale: Locale): string {
	return new Intl.DateTimeFormat(intlLocale[locale], { ...ROW_TIME[group], timeZone }).format(new Date(createdAt));
}
