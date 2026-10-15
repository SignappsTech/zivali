// Event taxonomy (contract C12): the only events and parameters that may reach GA4 or Firebase.
// Parameter names are the custom dimensions configured on GA4 property 559038055; values are enums or slugs only,
// so names, emails, phone and chip numbers, coordinates, ids and free text cannot pass.

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

// C6 slugs: lowercase ASCII words joined by hyphens, no digits, no spaces, no dots or commas.
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
	| 'purpose';

const municipality = slug;
const region = slug;
const species = oneOf('dog', 'cat');
const report_type = oneOf('lost', 'found', 'sighted');
const ad_slot = oneOf('feed', 'detail', 'reunited', 'sidebar');
const ad_id = pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const match_source = oneOf('chip', 'image', 'attributes');
const value = eur;
const currency = oneOf('EUR');
const amount_bucket = oneOf('2-4', '5-9', '10-19', '20+');
const method = oneOf('whatsapp', 'facebook', 'copy_link', 'native');
const purpose = oneOf('tip', 'report_contribution', 'support');

export const EVENTS = {
	report_lost_start: { species: opt(species), region: opt(region), municipality: opt(municipality) },
	report_lost_submit: { report_type, species, region, municipality },
	report_found_start: {},
	report_found_submit: { report_type: oneOf('found', 'sighted'), species, region, municipality },
	match_suggested: { species, region, match_source },
	match_confirmed: { species, region, match_source },
	chat_started: { species: opt(species), region: opt(region) },
	reunited: { species, region, municipality },
	boost_purchase: { value, currency, species, region },
	donation: { value, currency, amount_bucket, purpose },
	supporter_subscribe: { value, currency },
	ad_impression: { ad_slot, ad_id, region: opt(region), species: opt(species) },
	ad_click: { ad_slot, ad_id, region: opt(region), species: opt(species) },
	share: { method, report_type, species },
	poster_download: { species, region },
	alert_opt_in: { species: opt(species), region: opt(region) },
} satisfies Record<string, Partial<Record<ParamName, Check<unknown>>>>;

type Schema = typeof EVENTS;
type Value<C> = C extends (value: unknown) => value is infer T ? T : never;
type Params<S> = { [K in keyof S as S[K] extends { optional: true } ? never : K]: Value<S[K]> } & {
	[K in keyof S as S[K] extends { optional: true } ? K : never]?: Value<S[K]>;
};

export type EventName = keyof Schema;
export type EventParams = { [E in EventName]: Params<Schema[E]> };

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
