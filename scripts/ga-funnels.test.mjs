import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
	FUNNELS,
	dateRange,
	formatFunnel,
	formatReport,
	funnelBody,
	parseCli,
	reportBody,
	run,
} from './ga-funnels.mjs';

const range = { startDate: '2026-09-22', endDate: '2026-10-19' };
const byName = (name) => FUNNELS.find((f) => f.name === name);
const MATCH = ['EXACT', 'BEGINS_WITH', 'ENDS_WITH', 'CONTAINS', 'FULL_REGEXP', 'PARTIAL_REGEXP'];

// Minimal v1alpha schema check: every union holds exactly one known member.
function checkString(s) {
	assert.ok(MATCH.includes(s.matchType) && typeof s.value === 'string' && s.value, JSON.stringify(s));
}
function checkParam(e) {
	const [k, ...rest] = Object.keys(e);
	assert.equal(rest.length, 0);
	if (k === 'andGroup') return e.andGroup.expressions.forEach(checkParam);
	assert.equal(k, 'funnelParameterFilter');
	assert.deepEqual(Object.keys(e[k]).sort(), ['eventParameterName', 'stringFilter']);
	checkString(e[k].stringFilter);
}
function checkExpr(e) {
	const [k, ...rest] = Object.keys(e);
	assert.equal(rest.length, 0);
	if (k === 'andGroup') return e.andGroup.expressions.forEach(checkExpr);
	if (k === 'funnelFieldFilter') {
		assert.deepEqual(Object.keys(e[k]).sort(), ['fieldName', 'stringFilter']);
		return checkString(e[k].stringFilter);
	}
	assert.equal(k, 'funnelEventFilter');
	const { eventName, funnelParameterFilterExpression: p, ...other } = e[k];
	assert.deepEqual(other, {});
	assert.match(eventName, /^[a-z_]+$/);
	if (p) checkParam(p);
}

test('FUNNELS mirror the 8 entries of C12b §8 (Lost has a second funnel, 8 is free form)', () => {
	assert.deepEqual([...new Set(FUNNELS.map((f) => f.n))], [1, 2, 3, 4, 5, 6, 7, 8]);
	assert.deepEqual(
		FUNNELS.filter((f) => f.steps).map((f) => f.n),
		[1, 1, 2, 3, 4, 5, 6, 7]
	);
	assert.deepEqual(
		FUNNELS.filter((f) => !f.steps).map((f) => f.n),
		[8, 8]
	);
});

test('builds valid runFunnelReport bodies for every funnel', () => {
	for (const f of FUNNELS.filter((x) => x.steps)) {
		const body = funnelBody(f, range);
		assert.deepEqual(body.dateRanges, [range]);
		assert.deepEqual(Object.keys(body.funnel), ['isOpenFunnel', 'steps']);
		assert.equal(body.funnel.isOpenFunnel, f.name === 'Match loop', f.name);
		const names = body.funnel.steps.map((s) => s.name);
		assert.ok(names.length >= 2 && new Set(names).size === names.length, f.name);
		for (const s of body.funnel.steps) {
			assert.deepEqual(Object.keys(s), ['name', 'filterExpression']);
			checkExpr(s.filterExpression);
		}
		const extra = Object.keys(body).filter((k) => !['dateRanges', 'funnel'].includes(k));
		assert.deepEqual(extra, f.name === 'Checkout' ? ['funnelBreakdown'] : [], f.name);
	}
});

test('flow_step steps match flow and step on the same event; plain steps are event filters', () => {
	const steps = funnelBody(byName('Lost'), range).funnel.steps;
	assert.deepEqual(
		steps.map((s) => s.name),
		[
			'report_lost_start',
			'report_lost where',
			'report_lost when',
			'report_lost what',
			'report_lost review',
			'report_lost_submit',
		]
	);
	assert.deepEqual(steps[0].filterExpression, { funnelEventFilter: { eventName: 'report_lost_start' } });
	const exact = (value) => ({ matchType: 'EXACT', value });
	assert.deepEqual(steps[1].filterExpression, {
		funnelEventFilter: {
			eventName: 'flow_step',
			funnelParameterFilterExpression: {
				andGroup: {
					expressions: [
						{ funnelParameterFilter: { eventParameterName: 'flow', stringFilter: exact('report_lost') } },
						{ funnelParameterFilter: { eventParameterName: 'step', stringFilter: exact('where') } },
					],
				},
			},
		},
	});
	const sighted = funnelBody(byName('Sighting'), range).funnel.steps.at(-1).filterExpression;
	assert.deepEqual(sighted, {
		funnelEventFilter: {
			eventName: 'report_found_submit',
			funnelParameterFilterExpression: {
				funnelParameterFilter: { eventParameterName: 'report_type', stringFilter: exact('sighted') },
			},
		},
	});
	const advertise = funnelBody(byName('Partners'), range).funnel.steps[0].filterExpression;
	assert.deepEqual(advertise, {
		andGroup: {
			expressions: [
				{ funnelEventFilter: { eventName: 'page_view' } },
				{ funnelFieldFilter: { fieldName: 'pagePath', stringFilter: exact('/advertise') } },
			],
		},
	});
	assert.deepEqual(funnelBody(byName('Checkout'), range).funnelBreakdown, {
		breakdownDimension: { name: 'customEvent:purpose' },
		limit: '15',
	});
});

test('stuck runReport body: flow_error by flow, step, error_field, error_code', () => {
	assert.deepEqual(reportBody(byName('Stuck'), range), {
		dateRanges: [range],
		dimensions: [
			{ name: 'customEvent:flow' },
			{ name: 'customEvent:step' },
			{ name: 'customEvent:error_field' },
			{ name: 'customEvent:error_code' },
		],
		metrics: [{ name: 'eventCount' }],
		dimensionFilter: {
			filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'flow_error' } },
		},
		orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
	});
});

test('dateRange: the last N full days ending yesterday', () => {
	assert.deepEqual(dateRange(28, new Date(2026, 9, 20, 0, 30)), range);
	assert.deepEqual(dateRange(1, new Date(2026, 0, 1, 23, 59)), { startDate: '2025-12-31', endDate: '2025-12-31' });
});

const funnelFixture = (rows, dims = ['funnelStepName']) => ({
	funnelTable: {
		dimensionHeaders: dims.map((name) => ({ name })),
		metricHeaders: [{ name: 'activeUsers' }, { name: 'funnelStepCompletionRate' }],
		rows: rows.map(([d, u]) => ({
			dimensionValues: [].concat(d).map((value) => ({ value })),
			metricValues: [{ value: String(u) }, { value: '0.5' }],
		})),
	},
	kind: 'analyticsData#runFunnelReport',
});

test('formats a funnel response into the drop-off table (missing step = 0)', () => {
	const res = funnelFixture([
		['1. report_lost_start', 200],
		['2. report_lost where', 150],
		['3. report_lost when', 120],
		['5. report_lost review', 0],
		['4. report_lost what', 90],
	]);
	assert.equal(
		formatFunnel(byName('Lost'), res),
		[
			'## 1. Lost',
			'',
			'| step | active users | % of previous | drop-off |',
			'| --- | --- | --- | --- |',
			'| 1. report_lost_start | 200 | – | – |',
			'| 2. report_lost where | 150 | 75.0% | 50 |',
			'| 3. report_lost when | 120 | 80.0% | 30 |',
			'| 4. report_lost what | 90 | 75.0% | 30 |',
			'| 5. report_lost review | 0 | 0.0% | 90 |',
			'| 6. report_lost_submit | 0 | – | 0 |',
		].join('\n')
	);
});

test('breakdown funnel: total first, one table, escaped cells', () => {
	const res = funnelFixture(
		[
			[['1. checkout amount', 'tip'], 10],
			[['2. begin_checkout', 'tip'], 5],
			[['1. checkout amount', 'RESERVED_TOTAL'], 20],
			[['2. begin_checkout', 'RESERVED_TOTAL'], 8],
			[['3. purchase', 'RESERVED_TOTAL'], 4],
			[['1. checkout amount', 'a|b'], 1],
		],
		['funnelStepName', 'customEvent:purpose']
	);
	const out = formatFunnel(byName('Checkout'), res).split('\n');
	assert.equal(out[2], '| purpose | step | active users | % of previous | drop-off |');
	assert.deepEqual(out.slice(4), [
		'| total | 1. checkout amount | 20 | – | – |',
		'| total | 2. begin_checkout | 8 | 40.0% | 12 |',
		'| total | 3. purchase | 4 | 50.0% | 4 |',
		'| tip | 1. checkout amount | 10 | – | – |',
		'| tip | 2. begin_checkout | 5 | 50.0% | 5 |',
		'| tip | 3. purchase | 0 | 0.0% | 5 |',
		'| a\\|b | 1. checkout amount | 1 | – | – |',
		'| a\\|b | 2. begin_checkout | 0 | 0.0% | 1 |',
		'| a\\|b | 3. purchase | 0 | – | 0 |',
	]);
	assert.match(
		formatFunnel(byName('Match loop'), {}),
		/^## 5\. Match loop \(open funnel\)\n[\s\S]*\| 4\. reunited \| 0 \| – \| 0 \|$/
	);
});

test('formats the stuck runReport response', () => {
	const res = {
		rows: [
			{
				dimensionValues: ['report_lost', 'photos', 'photo', 'required'].map((value) => ({ value })),
				metricValues: [{ value: '7' }],
			},
		],
	};
	assert.equal(
		formatReport(byName('Stuck'), res),
		'## 8. Stuck\n\n| flow | step | error_field | error_code | flow_error events |\n| --- | --- | --- | --- | --- |\n| report_lost | photos | photo | required | 7 |'
	);
	assert.equal(formatReport(byName('Stuck, dwell'), {}), '## 8. Stuck, dwell\n\n(no data)');
});

test('parseCli validates arguments', () => {
	assert.deepEqual(parseCli(['C:/x']), { root: 'C:/x', days: 28, funnel: undefined, md: undefined });
	assert.deepEqual(parseCli(['r', '--days', '7', '--funnel', '6', '--md', 'o.md']), {
		root: 'r',
		days: 7,
		funnel: 6,
		md: 'o.md',
	});
	assert.throws(() => parseCli([]), /usage/);
	assert.throws(() => parseCli(['r', '--days', '0']), /--days/);
	assert.throws(() => parseCli(['r', '--funnel', '9']), /--funnel/);
	assert.throws(() => parseCli(['r', '--write']), /Unknown option/);
});

function fakeRoot(keyJson) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-funnels-'));
	fs.mkdirSync(path.join(root, '.secrets'));
	fs.writeFileSync(path.join(root, '.secrets', 'key.json'), keyJson);
	fs.writeFileSync(
		path.join(root, '.env.local'),
		'GA_SERVICE_ACCOUNT_KEY_FILE=.secrets/key.json\r\nGA_PROPERTY_ID=123\n'
	);
	return root;
}

async function withFetch(handler, fn) {
	const original = globalThis.fetch;
	const calls = [];
	globalThis.fetch = async (url, init) => {
		calls.push({ url: String(url), ...init });
		return handler(String(url), calls.length);
	};
	try {
		return { calls, result: await fn() };
	} finally {
		globalThis.fetch = original;
	}
}

test('run: readonly token, only runFunnelReport/runReport POSTs, no key material out, --md report', async () => {
	const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
		modulusLength: 2048,
		privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
		publicKeyEncoding: { type: 'spki', format: 'pem' },
	});
	const root = fakeRoot(JSON.stringify({ client_email: 'sa@x.iam.gserviceaccount.com', private_key: privateKey }));
	const md = path.join(root, 'report.md');
	const { calls, result } = await withFetch(
		(url, n) => {
			if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'tok-secret-123' });
			if (n === 4) return Response.json({ error: { message: 'bad step' } }, { status: 400 }); // 2. Found
			return Response.json(url.endsWith(':runFunnelReport') ? funnelFixture([['1. x', 5]]) : {});
		},
		() => run([root, '--md', md], new Date(2026, 9, 20))
	);
	const [token, ...api] = calls;
	assert.equal(token.method, 'POST');
	const [head, claims, sig] = token.body.get('assertion').split('.');
	assert.ok(crypto.verify('RSA-SHA256', Buffer.from(`${head}.${claims}`), publicKey, Buffer.from(sig, 'base64url')));
	assert.equal(
		JSON.parse(Buffer.from(claims, 'base64url')).scope,
		'https://www.googleapis.com/auth/analytics.readonly'
	);
	assert.equal(api.length, 10);
	for (const c of api) {
		assert.equal(c.method, 'POST');
		assert.equal(c.headers.authorization, 'Bearer tok-secret-123');
		assert.match(
			c.url,
			/^https:\/\/analyticsdata\.googleapis\.com\/(v1alpha\/properties\/123:runFunnelReport|v1beta\/properties\/123:runReport)$/
		);
	}
	assert.equal(api.filter((c) => c.url.endsWith(':runReport')).length, 2);
	assert.deepEqual(JSON.parse(api[0].body), funnelBody(FUNNELS[0], range));
	const { text, failed } = result;
	assert.equal(failed, true);
	assert.match(text, /^# GA4 funnels 2026-09-22 to 2026-10-19 \(28 days, property 123\)\n/);
	assert.match(text, /## 2\. Found\n\nERROR: 400 bad step\n/);
	assert.match(text, /## 3\. Sighting\n\n\| step/);
	assert.equal((text.match(/^## /gm) ?? []).length, 10);
	assert.ok(!text.includes('tok-secret-123') && !text.includes('PRIVATE KEY'));
	assert.equal(fs.readFileSync(md, 'utf8'), text);
});

test('run: --funnel selects one entry; a broken key file is reported without its content', async () => {
	const root = fakeRoot('{"private_key": "SECRETSTUFF');
	await assert.rejects(
		withFetch(
			() => Response.json({}),
			() => run([root])
		),
		(e) => !e.message.includes('SECRETSTUFF') && /GA_SERVICE_ACCOUNT_KEY_FILE/.test(e.message)
	);
	const { privateKey } = crypto.generateKeyPairSync('rsa', {
		modulusLength: 2048,
		privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
		publicKeyEncoding: { type: 'spki', format: 'pem' },
	});
	const ok = fakeRoot(JSON.stringify({ client_email: 'sa@x', private_key: privateKey }));
	const { calls } = await withFetch(
		(url) => Response.json(url.includes('oauth2') ? { access_token: 't' } : {}),
		() => run([ok, '--funnel', '8', '--days', '7'], new Date(2026, 9, 20))
	);
	assert.deepEqual(
		calls.slice(1).map((c) => JSON.parse(c.body).dimensions.length),
		[4, 2]
	);
	assert.deepEqual(JSON.parse(calls[1].body).dateRanges, [{ startDate: '2026-10-13', endDate: '2026-10-19' }]);
});
