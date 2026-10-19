// Notification types (C10 §Types) and their text: push and email rendered with createTranslator (use-intl/core) from
// the @zivali/i18n namespaces `notifications` and `email` in the recipient's locale (C16). Copy:
// docs/content/notifications-and-emails.md. Email HTML escapes every rendered string; values never carry markup.
import { createTranslator, type AbstractIntlMessages } from 'use-intl/core';

import en from '@zivali/i18n/dist/en.json' with { type: 'json' };
import sl from '@zivali/i18n/dist/sl.json' with { type: 'json' };
import { formatDate, formatEur, formatRelative, timeZone, type Locale } from '@zivali/i18n/format';
import type { NotificationType } from '@zivali/types';

import { config } from '../../lib/config.ts';

export type Channel = 'in_app' | 'push' | 'email';
type Category = 'account' | 'search' | 'alert' | 'finder' | 'payment';
export type Vars = Record<string, unknown>;

export type TypeSpec = {
	channels: Channel[];
	/** Quiet hours apply (deferred to their end). */
	quiet: boolean;
	/** Footer reason line of the email. */
	category: Category;
	/** Governed by notification_prefs; transactional types are not. */
	prefs: boolean;
	/** Default of the email switch when the user has no pref row (nearby_lost: opt-in). */
	email_default?: boolean;
	/** Deep link (internal path, C15) from the payload; the email button and the push tap open it. */
	link: (v: Vars) => string;
	/** Allowlist of payload keys (C10 §Types) that survive normalize; anything else a source returns is dropped. */
	fields: string[];
};

const all: Channel[] = ['in_app', 'push', 'email'];
const toMatches = (v: Vars) => `/r/${v.lost_code}/matches`;
const toConversation = (v: Vars) => `/inbox/${v.conversation_id}`;
const toReport = (v: Vars) => `/r/${v.report_code}`;

/** Fields that only the email may carry (C10: Vet Partner and unsubscribe never reach push or the inbox). */
export const EMAIL_ONLY = ['has_vet_partner', 'clinic_name', 'clinic_area', 'clinic_url', 'ad_id', 'unsubscribe_url'];

export const TYPES: Record<NotificationType, TypeSpec> = {
	match_chip: {
		channels: all,
		quiet: false,
		category: 'search',
		prefs: true,
		link: toMatches,
		fields: ['match_id', 'lost_code', 'other_code', 'other_type', 'has_name', 'pet_name', 'species'],
	},
	match_suggested: {
		channels: all,
		quiet: true,
		category: 'search',
		prefs: true,
		link: toMatches,
		fields: ['match_id', 'lost_code', 'strength', 'other_type', 'has_name', 'pet_name', 'species'],
	},
	match_confirmed: {
		channels: all,
		quiet: true,
		category: 'search',
		prefs: true,
		link: toConversation,
		fields: ['conversation_id', 'report_code', 'species', 'report_type'],
	},
	// Email only after 30 minutes unread (domain: chat email follow-up).
	chat_message: {
		channels: all,
		quiet: false,
		category: 'search',
		prefs: true,
		link: toConversation,
		fields: ['conversation_id', 'preview_alias', 'unread_count'],
	},
	nearby_lost: {
		channels: all,
		quiet: true,
		category: 'alert',
		prefs: true,
		email_default: false,
		link: toReport,
		fields: [
			'report_code',
			'species',
			'distance_band',
			'has_area',
			'area_name',
			'reported_at',
			'thumb_url',
			...EMAIL_ONLY,
		],
	},
	report_reminder: {
		channels: all,
		quiet: true,
		category: 'search',
		prefs: true,
		link: (v) => `/my-reports?r=${v.report_code}&action=keep`,
		fields: ['report_code', 'day', 'has_name', 'pet_name', 'species'],
	},
	report_expiring: {
		channels: ['in_app', 'email'],
		quiet: true,
		category: 'search',
		prefs: true,
		link: (v) => `/my-reports?r=${v.report_code}&action=${v.report_type === 'lost' ? 'keep' : 'extend'}`,
		fields: ['report_code', 'report_type', 'days_left', 'has_name', 'pet_name', 'species'],
	},
	report_closed: {
		channels: ['in_app', 'email'],
		quiet: true,
		category: 'search',
		prefs: true,
		link: () => '/my-reports',
		fields: ['report_code', 'report_type', 'idle_days', 'reopen_days', 'has_name', 'pet_name', 'species'],
	},
	report_hidden: {
		channels: ['in_app', 'email'],
		quiet: true,
		category: 'search',
		prefs: true,
		link: () => '/my-reports',
		fields: ['report_code', 'report_type', 'support_email'],
	},
	report_reunited: {
		channels: ['in_app', 'push'],
		quiet: true,
		category: 'search',
		prefs: true,
		link: toReport,
		fields: ['report_code', 'species'],
	},
	manage_link: {
		channels: ['email'],
		quiet: false,
		category: 'finder',
		prefs: false,
		link: (v) => String(v.manage_url),
		fields: ['report_code', 'report_type', 'species', 'manage_url'],
	},
	payment_receipt: {
		channels: ['in_app', 'email'],
		quiet: false,
		category: 'payment',
		prefs: false,
		link: () => '/account/payments',
		fields: [
			'payment_id',
			'amount_cents',
			'purpose',
			'paid_at',
			'receipt_ref',
			'is_test',
			'has_invoice',
			'invoice_number',
			'zoi',
			'has_eor',
			'eor',
		],
	},
};

const truncate = (value: unknown, max: number) => {
	const text = String(value ?? '').trim();
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

// Types whose copy names the pet (NotificationPayloads `Named`).
const NAMED = new Set<NotificationType>([
	'match_chip',
	'match_suggested',
	'report_reminder',
	'report_expiring',
	'report_closed',
]);

/** C10: the handler derives has_name and cuts pet_name to 18 and preview_alias to 24 characters. */
export function normalize(type: NotificationType, raw: Vars): Vars {
	const { pet_name, ...rest } = raw;
	const v = Object.fromEntries(Object.entries(rest).filter(([key]) => TYPES[type].fields.includes(key)));
	if (NAMED.has(type)) {
		const name = truncate(pet_name, 18);
		v.has_name = name ? 'yes' : 'no';
		if (name) v.pet_name = name;
	}
	if ('preview_alias' in v) v.preview_alias = truncate(v.preview_alias, 24);
	return v;
}

/** ICU arguments: booleans as yes/no selects, dates and money formatted for the locale. */
function icuValues(v: Vars, locale: Locale, now: Date): Record<string, string | number> {
	const out: Record<string, string | number> = {};
	for (const [key, value] of Object.entries(v)) {
		if (typeof value === 'boolean') out[key] = value ? 'yes' : 'no';
		else if (typeof value === 'number' || typeof value === 'string') out[key] = value;
	}
	if (typeof v.reported_at === 'string') out.when = formatRelative(v.reported_at, locale, now);
	if (typeof v.amount_cents === 'number') out.amount = formatEur(v.amount_cents, locale);
	if (typeof v.paid_at === 'string') out.paid_at = formatDate(v.paid_at, locale, 'long');
	return out;
}

const catalogues: Record<Locale, AbstractIntlMessages> = { sl, en };

// Keys are built from the type at runtime, so the translator is used untyped; `pnpm --filter @zivali/i18n check`
// guards the catalogues and the tests render every type in both locales.
type Values = Record<string, string | number>;
type Translator = {
	(key: string, values?: Values): string;
	markup(key: string, values: Record<string, string | number | ((chunks: string) => string)>): string;
};

function translator(locale: Locale, namespace: 'notifications' | 'email'): Translator {
	return createTranslator({ locale, messages: catalogues[locale], namespace, timeZone }) as unknown as Translator;
}

// C15: SL paths are localised per segment, EN paths are the internal ones under /en.
const SL_SEGMENTS: Record<string, string> = {
	matches: 'ujemanja',
	inbox: 'nabiralnik',
	'my-reports': 'moje-prijave',
	account: 'racun',
	payments: 'placila',
	notifications: 'obvestila',
};

/** Absolute web URL of an internal path (C15) in the recipient's language. */
export function webUrl(path: string, locale: Locale): string {
	if (/^https?:\/\//.test(path)) return path;
	const [pathname = '/', rest = ''] = path.split(/(?=[?#])/);
	const localised =
		locale === 'en' ? `/en${pathname}` : pathname.replace(/[^/]+/g, (segment) => SL_SEGMENTS[segment] ?? segment);
	return `${config.APP_URL.replace(/\/+$/, '')}${localised}${rest}`;
}

export function renderPush(type: NotificationType, payload: Vars, locale: Locale, now: Date) {
	const t = translator(locale, 'notifications');
	const values = icuValues(payload, locale, now);
	return { title: t(`${type}.title`, values), body: t(`${type}.body`, values) };
}

const escapeHtml = (text: string) =>
	text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Keys of email.<type> that are not body lines.
const NOT_BODY = new Set(['subject', 'preheader', 'button', 'link_close', 'ad']);

export type EmailOptions = { url: string; unsubscribe_url?: string; support_email: string };

/** Subject, HTML and plain text of a notification email (layout and footer: content slice §6). */
export function renderEmail(type: NotificationType, vars: Vars, locale: Locale, now: Date, options: EmailOptions) {
	const t = translator(locale, 'email');
	const spec = TYPES[type];
	const values: Values = {
		...icuValues(vars, locale, now),
		support_email: options.support_email,
		category: spec.category,
	};
	const keys = Object.keys((catalogues[locale].email as Record<string, Record<string, string>>)[type]);
	const lines = keys.filter((k) => !NOT_BODY.has(k)).map((k) => t(`${type}.${k}`, values));
	const body = lines.filter((line) => line.trim());
	const subject = t(`${type}.subject`, values);
	const preheader = t(`${type}.preheader`, values);
	const button = t(`${type}.button`, values);
	const closeLink = keys.includes('link_close')
		? { text: t(`${type}.link_close`, values), url: options.url.replace('action=keep', 'action=close') }
		: undefined;
	// Vet Partner line (nearby_lost email only, M4): labelled, one line, the clinic name links to clinic_url.
	let ad: { html: string; text: string } | undefined;
	if (values.has_vet_partner === 'yes' && typeof vars.clinic_url === 'string') {
		const href = escapeHtml(vars.clinic_url);
		const escaped = Object.fromEntries(
			Object.entries(values).map(([k, v]) => [k, typeof v === 'string' ? escapeHtml(v) : v])
		);
		ad = {
			html: t.markup(`${type}.ad`, { ...escaped, link: (chunks) => `<a href="${href}">${chunks}</a>` }),
			text: `${t.markup(`${type}.ad`, { ...values, link: (chunks) => chunks })} (${vars.clinic_url})`,
		};
	}
	const footer = {
		reason: t('layout.reason', values),
		// Settings link on notification emails, not on finder and payment emails (content slice §6.2).
		settings:
			spec.category === 'finder' || spec.category === 'payment'
				? undefined
				: { text: t('layout.settings'), url: webUrl('/account/notifications', locale) },
		unsubscribe: options.unsubscribe_url && { text: t('layout.unsubscribe'), url: options.unsubscribe_url },
		support: t('layout.support', values),
		company: t('layout.company'),
	};

	const p = (html: string, style = 'margin:0 0 16px;line-height:1.5') => `<p style="${style}">${html}</p>`;
	const a = (text: string, url: string) =>
		`<a href="${escapeHtml(url)}" style="color:#1f6f5c">${escapeHtml(text)}</a>`;
	const small = 'margin:0 0 8px;font-size:13px;line-height:1.5;color:#52606d';
	const html = [
		`<!doctype html><html lang="${locale}"><head><meta charset="utf-8">`,
		`<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>`,
		'<body style="margin:0;background:#f7f5f0;color:#1f2933;font-family:Arial,Helvetica,sans-serif">',
		`<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>`,
		'<div style="max-width:560px;margin:0 auto;padding:24px 16px">',
		p('Najdimo', 'margin:0;font-size:20px;font-weight:bold'),
		p(escapeHtml(t('layout.tagline')), 'margin:0 0 24px;color:#52606d'),
		...body.map((line) => p(escapeHtml(line))),
		p(
			`<a href="${escapeHtml(options.url)}" style="display:inline-block;padding:12px 20px;border-radius:6px;` +
				`background:#1f6f5c;color:#ffffff;text-decoration:none;font-weight:bold">${escapeHtml(button)}</a>`,
			'margin:24px 0'
		),
		closeLink ? p(a(closeLink.text, closeLink.url)) : '',
		ad ? p(ad.html, small) : '',
		'<hr style="border:0;border-top:1px solid #d9d4c7;margin:24px 0">',
		p(escapeHtml(footer.reason), small),
		footer.settings ? p(a(footer.settings.text, footer.settings.url), small) : '',
		footer.unsubscribe ? p(a(footer.unsubscribe.text, footer.unsubscribe.url), small) : '',
		p(escapeHtml(footer.support), small),
		p(escapeHtml(footer.company), small),
		'</div></body></html>',
	].join('');
	const text = [
		...body,
		`${button}: ${options.url}`,
		closeLink && `${closeLink.text}: ${closeLink.url}`,
		ad?.text,
		'--',
		footer.reason,
		footer.settings && `${footer.settings.text}: ${footer.settings.url}`,
		footer.unsubscribe && `${footer.unsubscribe.text}: ${footer.unsubscribe.url}`,
		footer.support,
		footer.company,
	]
		.filter(Boolean)
		.join('\n\n');
	return { subject, html, text };
}

/** Confirmation page of the one-click unsubscribe link (GET /v1/notifications/unsubscribe). */
export function renderUnsubscribed(locale: Locale): string {
	const t = translator(locale, 'email');
	const settings = webUrl('/account/notifications', locale);
	return [
		`<!doctype html><html lang="${locale}"><head><meta charset="utf-8">`,
		`<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(t('unsubscribe.title'))}</title></head>`,
		'<body style="margin:0;background:#f7f5f0;color:#1f2933;font-family:Arial,Helvetica,sans-serif">',
		'<main style="max-width:560px;margin:0 auto;padding:48px 16px">',
		`<h1 style="font-size:24px">${escapeHtml(t('unsubscribe.title'))}</h1>`,
		`<p style="line-height:1.5">${escapeHtml(t('unsubscribe.body'))}</p>`,
		`<p><a href="${escapeHtml(settings)}" style="color:#1f6f5c">${escapeHtml(t('layout.settings'))}</a></p>`,
		'</main></body></html>',
	].join('');
}

const CONFIRM = {
	sl: {
		title: 'Odjava od e-poštnih obvestil',
		body: 'Želite prenehati prejemati to vrsto obvestil po e-pošti?',
		button: 'Odjava',
	},
	en: {
		title: 'Unsubscribe from email alerts',
		body: 'Stop receiving this kind of notification by email?',
		button: 'Unsubscribe',
	},
} as const;

/** Confirm page of the unsubscribe link (GET): a POST form, so only a deliberate click changes the pref. */
export function renderUnsubscribeConfirm(locale: Locale, token: string): string {
	const c = CONFIRM[locale];
	return [
		`<!doctype html><html lang="${locale}"><head><meta charset="utf-8">`,
		`<meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(c.title)}</title></head>`,
		'<body style="margin:0;background:#f7f5f0;color:#1f2933;font-family:Arial,Helvetica,sans-serif">',
		'<main style="max-width:560px;margin:0 auto;padding:48px 16px">',
		`<h1 style="font-size:24px">${escapeHtml(c.title)}</h1>`,
		`<p style="line-height:1.5">${escapeHtml(c.body)}</p>`,
		`<form method="post" action="?token=${encodeURIComponent(token)}">`,
		`<button type="submit" style="padding:12px 20px;border:0;border-radius:6px;background:#1f6f5c;color:#fff;font-weight:bold">${escapeHtml(c.button)}</button>`,
		'</form></main></body></html>',
	].join('');
}
