import { formatEur, type Locale, timeZone } from '@zivali/i18n/format';
import type { Notification, NotificationType } from '@zivali/types';
import type { getPathname } from '@/i18n/navigation';

type Href = Parameters<typeof getPathname>[0]['href'];
type Payload = Record<string, unknown>;

/**
 * In-app types and the payload variables their row may use (C10 §Types): copy and deep link read only these, so a
 * field a source adds later never reaches the page. manage_link is email only; nearby_local is a mobile-only local alert.
 */
const FIELDS = {
	match_chip: ['lost_code', 'other_type', 'has_name', 'pet_name', 'species'],
	match_suggested: ['lost_code', 'strength', 'other_type', 'has_name', 'pet_name', 'species'],
	match_confirmed: ['conversation_id'],
	chat_message: ['conversation_id', 'preview_alias'],
	nearby_lost: ['report_code', 'species', 'distance_band', 'has_area', 'area_name'],
	report_reminder: ['report_code', 'day', 'has_name', 'pet_name', 'species'],
	report_expiring: ['report_code', 'report_type', 'days_left', 'has_name', 'pet_name', 'species'],
	report_closed: ['report_type', 'reopen_days', 'has_name', 'pet_name', 'species'],
	report_hidden: [],
	report_reunited: ['report_code', 'species'],
	payment_receipt: ['amount_cents', 'purpose', 'is_test'],
} as const satisfies Partial<Record<NotificationType, readonly string[]>>;

export type InboxType = keyof typeof FIELDS;
export type Kind = 'chip' | 'match' | 'message' | 'nearby' | 'reminder' | 'system';
export type Group = 'today' | 'week' | 'earlier';
export type InboxRow = {
	id: string;
	/** Every inbox row this one stands for (messages are grouped per conversation); marked read together. */
	ids: string[];
	type: InboxType;
	kind: Kind;
	unread: boolean;
	created_at: string;
	/** ICU values for `notifications.<type>.title` and `.body`. */
	values: Record<string, string | number>;
	href: Href;
	/** report_reminder: its report, for the Keep searching and Close search buttons. */
	report_code?: string;
};

const KIND: Record<InboxType, Kind> = {
	match_chip: 'chip',
	match_suggested: 'match',
	match_confirmed: 'match',
	chat_message: 'message',
	nearby_lost: 'nearby',
	report_reminder: 'reminder',
	report_expiring: 'reminder',
	report_closed: 'reminder',
	report_hidden: 'system',
	report_reunited: 'system',
	payment_receipt: 'system',
};

const isInboxType = (type: string): type is InboxType => Object.hasOwn(FIELDS, type);

/** The allowlisted fields as ICU arguments: booleans as yes/no selects, the amount formatted for the locale. */
function icuValues(type: InboxType, payload: Payload, locale: Locale) {
	const values: Record<string, string | number> = {};
	for (const key of FIELDS[type] as readonly string[]) {
		const value = payload[key];
		if (key === 'amount_cents') {
			if (typeof value === 'number') values.amount = formatEur(value, locale);
		} else if (typeof value === 'boolean') values[key] = value ? 'yes' : 'no';
		else if (typeof value === 'string' || typeof value === 'number') values[key] = value;
	}
	return values;
}

/** C10 deep link of a row (C15 internal paths), or undefined when the payload lacks its target. */
function deepLink(type: InboxType, v: Record<string, string | number>): Href | undefined {
	const code = v.report_code && String(v.report_code);
	switch (type) {
		case 'match_chip':
		case 'match_suggested':
			return v.lost_code ? { pathname: '/r/[code]/matches', params: { code: String(v.lost_code) } } : undefined;
		case 'match_confirmed':
		case 'chat_message':
			return v.conversation_id
				? { pathname: '/inbox/[id]', params: { id: String(v.conversation_id) } }
				: undefined;
		case 'nearby_lost':
		case 'report_reunited':
			return code ? { pathname: '/r/[code]', params: { code } } : undefined;
		case 'report_reminder':
			return code ? { pathname: '/my-reports', query: { r: code, action: 'keep' } } : undefined;
		case 'report_expiring':
			return code
				? { pathname: '/my-reports', query: { r: code, action: v.report_type === 'lost' ? 'keep' : 'extend' } }
				: undefined;
		case 'report_closed':
		case 'report_hidden':
			return '/my-reports';
		case 'payment_receipt':
			return '/account/payments';
	}
}

const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
/** Day number of the Ljubljana calendar date, so groups follow midnights, not 24-hour blocks. */
export const dayNumber = (date: Date | string) => Date.parse(dayFormat.format(new Date(date))) / 86_400_000;

export function groupOf(date: string, now: Date): Group {
	const days = dayNumber(now) - dayNumber(date);
	return days <= 0 ? 'today' : days < 7 ? 'week' : 'earlier';
}

const intlLocale = (locale: Locale) => (locale === 'en' ? 'en-GB' : 'sl');
const TIME_LABEL: Record<Group, Intl.DateTimeFormatOptions> = {
	today: { hour: '2-digit', minute: '2-digit' },
	week: { weekday: 'short' },
	earlier: { day: 'numeric', month: 'numeric' },
};

/** Right-hand time of a row (P13): "13:52" today, "tor" this week, "3. 10." earlier. */
export function timeLabel(date: string, group: Group, locale: Locale): string {
	return new Intl.DateTimeFormat(intlLocale(locale), { ...TIME_LABEL[group], timeZone }).format(new Date(date));
}

/**
 * P13 inbox rows from the API list (newest first), grouped Today, This week, Earlier: unknown types and rows without
 * a target are left out, messages are one row per conversation (the newest), and a chip match sorts first in its group.
 */
export function inboxGroups(items: Notification[], now: Date, locale: Locale): { group: Group; rows: InboxRow[] }[] {
	const rows: InboxRow[] = [];
	const conversations = new Map<string, InboxRow>();
	for (const item of items) {
		if (!isInboxType(item.type)) continue;
		const values = icuValues(item.type, item.payload, locale);
		const href = deepLink(item.type, values);
		if (!href) continue;
		const unread = item.read_at === null;
		const grouped = item.type === 'chat_message' ? conversations.get(String(values.conversation_id)) : undefined;
		if (grouped) {
			grouped.ids.push(item.id);
			grouped.unread ||= unread;
			continue;
		}
		const row: InboxRow = {
			id: item.id,
			ids: [item.id],
			type: item.type,
			kind: KIND[item.type],
			unread,
			created_at: item.created_at,
			values,
			href,
			report_code: item.type === 'report_reminder' ? String(values.report_code) : undefined,
		};
		if (item.type === 'chat_message') conversations.set(String(values.conversation_id), row);
		rows.push(row);
	}
	const groups = (['today', 'week', 'earlier'] as const).map((group) => ({
		group,
		rows: rows
			.filter((row) => groupOf(row.created_at, now) === group)
			.sort((a, b) => Number(b.kind === 'chip') - Number(a.kind === 'chip')),
	}));
	return groups.filter(({ rows }) => rows.length > 0);
}
