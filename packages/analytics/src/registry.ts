// Event taxonomy (contract C12 v2.0, tracking plan C12b): the only events and parameters that may reach GA4 or
// Firebase. Parameter names are the custom dimensions configured on GA4 property 559038055; values are enums (`region`
// is one of the 12 C6 statistical regions), C6 municipality slugs or code constants, so names, emails, phone and chip
// numbers, coordinates, ids, messages and free text cannot pass.

import { ERROR_CODES, LEAD_INTERESTS, PAYMENT_PURPOSES, REGION_SLUGS } from '@zivali/types';

type Check<T> = ((value: unknown) => value is T) & { optional?: true };

const oneOf =
	<const T extends string>(...values: T[]): Check<T> =>
	(value): value is T =>
		(values as unknown[]).includes(value);

const pattern =
	(re: RegExp): Check<string> =>
	(value): value is string =>
		typeof value === 'string' && re.test(value);

const opt = <T>(check: Check<T>) =>
	Object.assign((value: unknown): value is T => check(value), { optional: true as const });

// C6 municipality slug: lowercase ASCII words joined by hyphens, no digits, no spaces, no dots or commas.
const slug = pattern(/^(?=.{2,64}$)[a-z]+(?:-[a-z]+)*$/);

// EUR with at most two decimals and a sane cap, so a chip number, coordinate or timestamp cannot pass as `value`.
const eur: Check<number> = (value): value is number =>
	typeof value === 'number' &&
	value >= 0 &&
	value <= 10_000 &&
	Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

/** The GA4 parameter allowlist. */
export type ParamName =
	| 'municipality'
	| 'region'
	| 'species'
	| 'report_type'
	| 'ad_slot'
	| 'ad_id'
	| 'match_source'
	| 'value'
	| 'currency'
	| 'amount_bucket'
	| 'method'
	| 'purpose'
	| 'plan'
	| 'flow'
	| 'step'
	| 'dwell'
	| 'error_code'
	| 'error_field'
	| 'outcome'
	| 'lead_type';

/** C12b §3: each flow and its steps; `flow_step` and `flow_error` only accept a step of their flow. */
export const FLOWS = {
	report_lost: ['pet', 'photos', 'details', 'where', 'when', 'what', 'review', 'auth_gate'],
	report_found: ['photo', 'what', 'where', 'situation', 'send'],
	report_sighting: ['where', 'when', 'extra'],
	pet: ['form'],
	sign_up: ['form', 'sent', 'verified'],
	sign_in: ['form'],
	reset_password: ['request', 'sent', 'new_password', 'done'],
	match_review: ['confirm', 'reject'],
	chat: ['send'],
	reunite: ['dialog'],
	share: ['open'],
	alerts: ['form'],
	shelter_search: ['search', 'answer', 'no_answer', 'contact'],
	browse: ['filter', 'report_open'],
	checkout: ['amount', 'return'],
	partner_enquiry: ['form'],
} as const;
export type Flow = keyof typeof FLOWS;
export type StepOf<F extends Flow> = (typeof FLOWS)[F][number];

/** C12b §4 client codes, beside the C1 `ERROR_CODES` and `NETWORK` (no response). */
export const CLIENT_ERROR_CODES = [
	'required',
	'invalid',
	'too_short',
	'too_long',
	'too_large',
	'file_type',
	'upload_failed',
	'permission_denied',
	'location_unavailable',
	'timeout',
	'canceled',
	'payment_failed',
	'invalid_credentials',
	'link_expired',
	'oauth_failed',
] as const;

const municipality = slug;
// C6 `regions.slug`: the 12 statistical regions.
const region = oneOf(...REGION_SLUGS);
const species = oneOf('dog', 'cat');
const report_type = oneOf('lost', 'found', 'sighted');
const ad_slot = oneOf('feed', 'detail', 'reunited', 'sidebar');
const ad_id = pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const match_source = oneOf('chip', 'image', 'attributes');
const value = eur;
const currency = oneOf('EUR');
const amount_bucket = oneOf('2-4', '5-9', '10-19', '20+');
const plan = oneOf('monthly', 'yearly');
const flowSteps = { flow: oneOf(...(Object.keys(FLOWS) as Flow[])), step: oneOf(...Object.values(FLOWS).flat()) };
const error_code = oneOf(...ERROR_CODES, 'NETWORK', ...CLIENT_ERROR_CODES);
export type ErrorCodeParam = Value<typeof error_code>;
// The form's field key: lowercase words joined by `_`, at most 32 characters; never a value or a message.
const error_field = pattern(/^(?=.{1,32}$)[a-z]+(?:_[a-z]+)*$/);
const dwell = oneOf('0-9', '10-29', '30-59', '60-179', '180+');
const checkout = { value, currency, purpose: oneOf(...PAYMENT_PURPOSES), plan: opt(plan) };
const adSlot = { ad_slot, ad_id, region: opt(region), species: opt(species) };

export const EVENTS = {
	report_lost_start: { species: opt(species), region: opt(region), municipality: opt(municipality) },
	report_lost_submit: { report_type, species, region, municipality },
	report_found_start: {},
	report_found_submit: { report_type: oneOf('found', 'sighted'), species, region, municipality },
	match_suggested: { species, region, match_source },
	match_confirmed: { species, region, match_source },
	match_rejected: { species, region, match_source },
	chat_started: { species: opt(species), region: opt(region) },
	reunited: { species, region, municipality },
	boost_purchase: { value, currency, species, region },
	donation: { value, currency, amount_bucket, purpose: oneOf('tip', 'report_contribution', 'support') },
	supporter_subscribe: { value, currency },
	premium_subscribe: { plan, value, currency },
	begin_checkout: checkout,
	purchase: checkout,
	// `ad_impression` (web) and `ad_click` (app) are reserved by GA4 and never reach reports (C12b §7).
	ad_slot_impression: adSlot,
	ad_slot_click: adSlot,
	share: { method: oneOf('whatsapp', 'facebook', 'copy_link', 'native'), report_type, species },
	poster_download: { species, region },
	alert_opt_in: { species: opt(species) },
	// GA4's recommended events; `convert`: an anonymous finder session became the account (C7 §6).
	sign_up: { method: oneOf('email', 'google', 'apple', 'convert') },
	login: { method: oneOf('password', 'google', 'apple') },
	generate_lead: { lead_type: oneOf(...LEAD_INTERESTS) },
	flow_step: {
		...flowSteps,
		dwell: opt(dwell),
		species: opt(species),
		report_type: opt(report_type),
		municipality: opt(municipality),
	},
	flow_error: { ...flowSteps, error_code, error_field: opt(error_field) },
	ai_prefill: {
		flow: oneOf('report_lost', 'report_found', 'pet'),
		outcome: oneOf('filled', 'empty', 'unavailable', 'timeout', 'error', 'confirmed', 'edited'),
	},
} satisfies Record<string, Partial<Record<ParamName, Check<unknown>>>>;

type Schema = typeof EVENTS;
type Value<C> = C extends (value: unknown) => value is infer T ? T : never;
type Params<S> = { [K in keyof S as S[K] extends { optional: true } ? never : K]: Value<S[K]> } & {
	[K in keyof S as S[K] extends { optional: true } ? K : never]?: Value<S[K]>;
};

// flow_step / flow_error: `step` narrowed to the steps of `flow`.
type FlowStep = { [F in Flow]: { flow: F; step: StepOf<F> } }[Flow];
type WithFlow<P> = Omit<P, 'flow' | 'step'> & FlowStep;

export type EventName = keyof Schema;
export type EventParams = {
	[E in EventName]: E extends 'flow_step' | 'flow_error' ? WithFlow<Params<Schema[E]>> : Params<Schema[E]>;
};

export const USER_ROLES = ['owner', 'finder', 'shelter', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Keeps the allowlisted params; `params` is null for an unknown event. Errors name keys only, never values. */
export function checkEvent(event: string, input: Record<string, unknown>) {
	const errors: string[] = [];
	if (!Object.hasOwn(EVENTS, event)) return { params: null, errors: [`unknown event "${event}"`] };
	const schema: Partial<Record<string, Check<unknown>>> = EVENTS[event as EventName];
	const params: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(input)) {
		const check = Object.hasOwn(schema, key) ? schema[key] : undefined;
		if (!check) errors.push(`param "${key}" is not allowed on "${event}"`);
		else if (val === undefined && check.optional) continue;
		else if (!check(val)) errors.push(`invalid value for "${key}" on "${event}"`);
		else params[key] = val;
	}
	for (const [key, check] of Object.entries(schema)) {
		if (!check?.optional && input[key] === undefined) errors.push(`missing "${key}" on "${event}"`);
	}
	if ('step' in params && !(FLOWS[params.flow as Flow] as readonly unknown[] | undefined)?.includes(params.step)) {
		errors.push(`"step" is not a step of "flow" on "${event}"`);
		delete params.step;
	}
	return { params, errors };
}

// Screens are route templates (`/r/[code]`, `/en/map`): lowercase words, `[param]`, `[...param]` or `(group)`.
const SEGMENT = /^(?:[a-z][a-z-]*|\[(?:\.\.\.)?[a-zA-Z]+\]|\([a-z-]+\))$/;
export const isRouteTemplate = (path: string) =>
	path === '/' ||
	(path.startsWith('/') &&
		path
			.slice(1)
			.split('/')
			.every((segment) => SEGMENT.test(segment)));
