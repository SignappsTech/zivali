// GA4 funnels by API (TASK-119.16): the C12b §8 funnels and the "stuck" table, read-only.
// node scripts/ga-funnels.mjs <root> [--days 28] [--funnel <n>] [--md <file>]
// <root> holds .env.local with GA_SERVICE_ACCOUNT_KEY_FILE (path relative to <root>) and GA_PROPERTY_ID,
// as .secrets/ga-admin.mjs. Only runFunnelReport and runReport (Data API), readonly scope.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const DATA = 'https://analyticsdata.googleapis.com';

const ev = (event) => ({ name: event, event });
const flowStep = (flow, step) => ({ name: `${flow} ${step}`, event: 'flow_step', params: { flow, step } });

// Mirrors C12b §8 "Saved funnel explorations" (same numbers and order); change both together.
// A step is an event, optionally with event parameters (matched on the same event) or dimensions (`fields`).
export const FUNNELS = [
	{
		n: 1,
		name: 'Lost',
		steps: [
			ev('report_lost_start'),
			...['where', 'when', 'what', 'review'].map((s) => flowStep('report_lost', s)),
			ev('report_lost_submit'),
		],
	},
	{
		n: 1,
		name: 'Lost, new-pet path',
		steps: [flowStep('report_lost', 'photos'), flowStep('report_lost', 'details')],
	},
	{
		n: 2,
		name: 'Found',
		steps: [
			ev('report_found_start'),
			...['photo', 'what', 'where', 'situation', 'send'].map((s) => flowStep('report_found', s)),
			ev('report_found_submit'),
		],
	},
	{
		n: 3,
		name: 'Sighting',
		steps: [
			...['where', 'when', 'extra'].map((s) => flowStep('report_sighting', s)),
			{ name: 'report_found_submit sighted', event: 'report_found_submit', params: { report_type: 'sighted' } },
		],
	},
	{ n: 4, name: 'Sign-up', steps: [flowStep('sign_up', 'form'), ev('sign_up'), flowStep('sign_up', 'verified')] },
	{
		n: 5,
		name: 'Match loop',
		open: true,
		steps: [ev('match_suggested'), ev('match_confirmed'), ev('chat_started'), ev('reunited')],
	},
	{
		n: 6,
		name: 'Checkout',
		breakdown: 'customEvent:purpose',
		steps: [flowStep('checkout', 'amount'), ev('begin_checkout'), ev('purchase')],
	},
	{
		n: 7,
		name: 'Partners',
		steps: [
			{ name: 'page_view /advertise', event: 'page_view', fields: { pagePath: '/advertise' } },
			flowStep('partner_enquiry', 'form'),
			ev('generate_lead'),
		],
	},
	{
		n: 8,
		name: 'Stuck',
		event: 'flow_error',
		dimensions: ['customEvent:flow', 'customEvent:step', 'customEvent:error_field', 'customEvent:error_code'],
	},
	{ n: 8, name: 'Stuck, dwell', event: 'flow_step', dimensions: ['customEvent:step', 'customEvent:dwell'] },
];

const exact = (value) => ({ matchType: 'EXACT', value });

function stepFilter({ event, params = {}, fields = {} }) {
	const p = Object.entries(params).map(([eventParameterName, v]) => ({
		funnelParameterFilter: { eventParameterName, stringFilter: exact(v) },
	}));
	const eventFilter = { eventName: event };
	if (p.length)
		eventFilter.funnelParameterFilterExpression = p.length === 1 ? p[0] : { andGroup: { expressions: p } };
	const f = Object.entries(fields).map(([fieldName, v]) => ({
		funnelFieldFilter: { fieldName, stringFilter: exact(v) },
	}));
	return f.length
		? { andGroup: { expressions: [{ funnelEventFilter: eventFilter }, ...f] } }
		: { funnelEventFilter: eventFilter };
}

/** The last `days` full days, ending yesterday (local calendar). */
export function dateRange(days, now = new Date()) {
	const day = (k) =>
		new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - k)).toISOString().slice(0, 10);
	return { startDate: day(days), endDate: day(1) };
}

export function funnelBody(f, range) {
	const body = {
		dateRanges: [range],
		funnel: {
			isOpenFunnel: Boolean(f.open),
			steps: f.steps.map((s) => ({ name: s.name, filterExpression: stepFilter(s) })),
		},
	};
	if (f.breakdown) body.funnelBreakdown = { breakdownDimension: { name: f.breakdown }, limit: '15' };
	return body;
}

export function reportBody(f, range) {
	return {
		dateRanges: [range],
		dimensions: f.dimensions.map((name) => ({ name })),
		metrics: [{ name: 'eventCount' }],
		dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: exact(f.event) } },
		orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
	};
}

const cell = (v) => String(v).replace(/[|\r\n]/g, (c) => (c === '|' ? '\\|' : ' '));
const table = (cols, rows) =>
	[cols, cols.map(() => '---'), ...rows].map((r) => `| ${r.map(cell).join(' | ')} |`).join('\n');
const heading = (f) => `## ${f.n}. ${f.name}${f.open ? ' (open funnel)' : ''}`;
const label = (dim) => dim.replace(/^customEvent:/, '');

/** Drop-off table from a runFunnelReport response: step, active users, % of the previous step, drop-off. */
export function formatFunnel(f, res) {
	const t = res.funnelTable ?? {};
	const dims = (t.dimensionHeaders ?? []).map((h) => h.name);
	const users = (t.metricHeaders ?? []).findIndex((h) => h.name === 'activeUsers');
	const stepCol = dims.indexOf('funnelStepName');
	const byCol = f.breakdown ? dims.indexOf(f.breakdown) : -1;
	const groups = new Map();
	for (const row of t.rows ?? []) {
		// funnelStepName is "<1-based index>. <step name>"
		const name = row.dimensionValues[stepCol].value;
		const i = (Number.parseInt(name, 10) || f.steps.findIndex((s) => s.name === name) + 1) - 1;
		if (i < 0 || i >= f.steps.length) continue;
		const key = byCol < 0 ? '' : row.dimensionValues[byCol].value.replace('RESERVED_TOTAL', 'total');
		if (!groups.has(key))
			groups.set(
				key,
				f.steps.map(() => 0)
			);
		groups.get(key)[i] = Number(row.metricValues[users]?.value ?? 0);
	}
	if (!groups.size)
		groups.set(
			f.breakdown ? 'total' : '',
			f.steps.map(() => 0)
		);
	const rows = [...groups]
		.sort(([a], [b]) => (b === 'total') - (a === 'total'))
		.flatMap(([key, counts]) =>
			counts.map((u, i) => {
				const prev = counts[i - 1];
				const pct = i === 0 ? '–' : prev ? `${((u / prev) * 100).toFixed(1)}%` : '–';
				const r = [`${i + 1}. ${f.steps[i].name}`, u, pct, i === 0 ? '–' : prev - u];
				return f.breakdown ? [key, ...r] : r;
			})
		);
	const cols = ['step', 'active users', '% of previous', 'drop-off'];
	return `${heading(f)}\n\n${table(f.breakdown ? [label(f.breakdown), ...cols] : cols, rows)}`;
}

/** Free-form table from a runReport response (the "stuck" tabs). */
export function formatReport(f, res) {
	const rows = (res.rows ?? []).map((r) => [...r.dimensionValues.map((v) => v.value), r.metricValues[0].value]);
	const body = rows.length ? table([...f.dimensions.map(label), `${f.event} events`], rows) : '(no data)';
	return `${heading(f)}\n\n${body}`;
}

function readEnv(root) {
	const lines = fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/);
	return Object.fromEntries(
		lines.filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
	);
}

// Service-account JWT grant, as .secrets/ga-admin.mjs; never prints the key or the token.
async function auth(root) {
	const env = readEnv(root);
	if (!env.GA_SERVICE_ACCOUNT_KEY_FILE || !env.GA_PROPERTY_ID) {
		throw new Error('.env.local needs GA_SERVICE_ACCOUNT_KEY_FILE and GA_PROPERTY_ID');
	}
	let key;
	try {
		key = JSON.parse(fs.readFileSync(path.join(root, env.GA_SERVICE_ACCOUNT_KEY_FILE), 'utf8'));
	} catch {
		throw new Error('cannot read the GA_SERVICE_ACCOUNT_KEY_FILE JSON'); // the parse error would quote the key
	}
	const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
	const now = Math.floor(Date.now() / 1000);
	const claims = { iss: key.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 };
	const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claims)}`;
	const jwt = `${unsigned}.${crypto.sign('RSA-SHA256', Buffer.from(unsigned), key.private_key).toString('base64url')}`;
	const r = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
	});
	const tok = await r.json().catch(() => ({}));
	if (!tok.access_token) throw new Error(`token request failed: ${r.status} ${tok.error ?? ''}`.trim());
	return { token: tok.access_token, propertyId: env.GA_PROPERTY_ID };
}

async function post(token, url, body) {
	const r = await fetch(url, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	const json = await r.json().catch(() => ({}));
	if (!r.ok) throw new Error(`${r.status} ${json.error?.message ?? r.statusText}`);
	return json;
}

export function parseCli(argv) {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: { days: { type: 'string', default: '28' }, funnel: { type: 'string' }, md: { type: 'string' } },
	});
	const usage = 'usage: node scripts/ga-funnels.mjs <root> [--days 28] [--funnel 1-8] [--md <file>]';
	if (positionals.length !== 1) throw new Error(usage);
	if (!/^[1-9]\d{0,3}$/.test(values.days)) throw new Error(`--days must be 1-9999\n${usage}`);
	if (values.funnel !== undefined && !/^[1-8]$/.test(values.funnel))
		throw new Error(`--funnel must be 1-8\n${usage}`);
	return {
		root: positionals[0],
		days: Number(values.days),
		funnel: values.funnel && Number(values.funnel),
		md: values.md,
	};
}

/** Runs the selected funnels; returns the Markdown report and whether any request failed. */
export async function run(argv, now = new Date()) {
	const { root, days, funnel, md } = parseCli(argv);
	const range = dateRange(days, now);
	const { token, propertyId } = await auth(root);
	const parts = [`# GA4 funnels ${range.startDate} to ${range.endDate} (${days} days, property ${propertyId})`];
	let failed = false;
	for (const f of FUNNELS.filter((x) => !funnel || x.n === funnel)) {
		try {
			parts.push(
				f.steps
					? formatFunnel(
							f,
							await post(
								token,
								`${DATA}/v1alpha/properties/${propertyId}:runFunnelReport`,
								funnelBody(f, range)
							)
						)
					: formatReport(
							f,
							await post(token, `${DATA}/v1beta/properties/${propertyId}:runReport`, reportBody(f, range))
						)
			);
		} catch (e) {
			failed = true;
			parts.push(`${heading(f)}\n\nERROR: ${e.message}`);
		}
	}
	const text = `${parts.join('\n\n')}\n`;
	if (md) fs.writeFileSync(md, text);
	return { text, failed };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	run(process.argv.slice(2)).then(
		({ text, failed }) => {
			process.stdout.write(text);
			process.exitCode = failed ? 1 : 0;
		},
		(e) => {
			console.error(e.message);
			process.exitCode = 1;
		}
	);
}
