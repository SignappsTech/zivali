// Fiscal adapter (C13 §Fiscal invoices): the ZOI string and date formats of the FURS spec, the deterministic mock, the
// provider switch (FURS production refused, furs needs its files), and the FURS request and response over an injected
// transport with a key generated here: no test reaches FURS and no certificate is in the repo.
import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { createFiscal, fursDateTime, zoiInput, type FiscalInvoice } from '../../adapters/fiscal/index.ts';
import { fursFiscal, type FursTransport } from '../../adapters/fiscal/furs.ts';
import { mockFiscal } from '../../adapters/fiscal/mock.ts';
import { config, type Config } from '../../lib/config.ts';

// 14:05:09 in Ljubljana (CEST, UTC+2).
const invoice: FiscalInvoice = {
	premise_id: 'SPLET',
	device_id: 'API1',
	sequence: 42,
	issued_at: new Date('2026-10-16T12:05:09.123Z'),
	gross_cents: 500,
	net_cents: 410,
	vat_rate: 22,
	vat_cents: 90,
	zoi: '0123456789abcdef0123456789abcdef',
	subsequent: false,
};
/** The invoice without the stored ZOI, as zoi() takes it. */
const { zoi: _stored, ...unsigned } = invoice;
const seller = { tax_number: '12345678', premise_id: 'SPLET', device_id: 'API1' };
const cfg = (patch: Partial<Config>): Config => ({ ...config, ...patch });
const fromB64 = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

describe('FURS formats', () => {
	it('builds the ZOI string: tax number, local dd.MM.yyyy HH:mm:ss, sequence, premise, device, total', () => {
		expect(zoiInput('12345678', invoice)).toBe('1234567816.10.2026 14:05:0942SPLETAPI15.00');
		// Winter time (CET, UTC+1) and a total with cents.
		const winter = { ...invoice, issued_at: new Date('2026-01-05T23:30:00Z'), gross_cents: 1999 };
		expect(zoiInput('12345678', winter)).toBe('1234567806.01.2026 00:30:0042SPLETAPI119.99');
		expect(fursDateTime(invoice.issued_at)).toBe('2026-10-16T14:05:09');
	});
});

describe('mock provider', () => {
	it('derives a 32-hex ZOI and issues a UUID-shaped EOR from the stored ZOI, others for another number', async () => {
		const fiscal = mockFiscal(seller);
		const zoi = fiscal.zoi(unsigned);
		expect(zoi).toMatch(/^[0-9a-f]{32}$/);
		const first = await fiscal.issue({ ...invoice, zoi });
		expect(first).toEqual(await mockFiscal(seller).issue({ ...invoice, zoi }));
		expect(first.zoi).toBe(zoi);
		expect(first.eor).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		expect(first.issued_at).toEqual(invoice.issued_at);
		const next = await fiscal.issue({ ...invoice, sequence: 43, zoi: fiscal.zoi({ ...unsigned, sequence: 43 }) });
		expect(next.zoi).not.toBe(first.zoi);
		expect(next.eor).not.toBe(first.eor);
		expect(fiscal).toMatchObject({ provider: 'mock', live: false, ...seller });
	});
});

describe('provider switch', () => {
	it('defaults to the mock everywhere and numbers under FISCAL_PREMISE_ID / FISCAL_DEVICE_ID', () => {
		for (const NODE_ENV of ['development', 'test', 'production'] as const)
			expect(createFiscal(cfg({ NODE_ENV })).provider).toBe('mock');
		expect(createFiscal(cfg({ FISCAL_PREMISE_ID: 'PP7', FISCAL_DEVICE_ID: 'BL2' }))).toMatchObject({
			premise_id: 'PP7',
			device_id: 'BL2',
		});
	});

	it('off issues nothing', () => {
		const off = createFiscal(cfg({ FISCAL_PROVIDER: 'off' }));
		expect(off).toMatchObject({ provider: 'off', live: false });
		expect(() => off.zoi(unsigned)).toThrow(/off/);
	});

	it('furs allows only the FURS test host: production (also with a trailing dot or in capitals), IPs and aliases are refused', () => {
		for (const FURS_URL of [
			'https://blagajne.fu.gov.si:9003/v1/cash_registers',
			'https://blagajne.fu.gov.si.:9003/v1/cash_registers',
			'https://BLAGAJNE.fu.gov.si/v1/cash_registers',
			'https://blagajne-test.fu.gov.si.:9002/v1/cash_registers',
			'https://127.0.0.1:9002/v1/cash_registers',
			'https://example.com/v1/cash_registers',
		])
			expect(() => createFiscal(cfg({ FISCAL_PROVIDER: 'furs', FURS_URL }))).toThrow(
				/only blagajne-test.fu.gov.si/
			);
	});

	it('furs names missing settings (the FURS CA included), before reading any file', () => {
		const test = 'https://blagajne-test.fu.gov.si:9002/v1/cash_registers';
		expect(() =>
			createFiscal(
				cfg({
					FISCAL_PROVIDER: 'furs',
					FURS_URL: test,
					FISCAL_TAX_NUMBER: undefined,
					FURS_CERT_PATH: undefined,
					FURS_KEY_PATH: undefined,
					FURS_CA_PATH: undefined,
				})
			)
		).toThrow(/FISCAL_TAX_NUMBER, FURS_CERT_PATH, FURS_KEY_PATH, FURS_CA_PATH/);
	});
});

describe('furs provider (injected transport)', () => {
	const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
	const tls = { cert: 'CERT-PEM', key: 'KEY-PEM', passphrase: 'pass', ca: 'CA-PEM' };
	const options = {
		...seller,
		url: 'https://blagajne-test.fu.gov.si:9002/v1/cash_registers/',
		key: privateKey,
		cert: {
			subject: 'C=SI\nO=state-institutions\nCN=TEST 12345678',
			issuer: 'C=SI\nO=state-institutions\nCN=Tax CA Test',
			serial: 'FFFFFFFFFFFFFFFFFF',
		},
		tls,
	};
	const answer = (payload: object, status = 200) => ({
		status,
		body: JSON.stringify({ token: `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig` }),
	});

	it('signs the InvoiceRequest as an RS256 JWS, sends it over mutual TLS and returns the EOR', async () => {
		const calls: Parameters<FursTransport>[] = [];
		const fiscal = fursFiscal({
			...options,
			transport: async (...args) => {
				calls.push(args);
				return answer({ InvoiceResponse: { UniqueInvoiceID: 'a1b2c3d4-0000-4000-8000-000000000001' } });
			},
		});
		// The ZOI sent is the stored one, never recomputed from the current key.
		const result = await fiscal.issue({ ...invoice, subsequent: true });
		// ZOI: MD5 of our RSA-SHA256 signature over the FURS string.
		const zoi = createHash('md5')
			.update(sign('sha256', Buffer.from('1234567816.10.2026 14:05:0942SPLETAPI15.00'), privateKey))
			.digest('hex');
		expect(result).toEqual({
			zoi: invoice.zoi,
			eor: 'a1b2c3d4-0000-4000-8000-000000000001',
			issued_at: invoice.issued_at,
		});
		expect(fiscal.zoi(unsigned)).toBe(zoi);

		expect(calls).toHaveLength(1);
		const [url, body, sentTls] = calls[0]!;
		expect(url).toBe('https://blagajne-test.fu.gov.si:9002/v1/cash_registers/invoices');
		expect(sentTls).toBe(tls);
		const [header, payload, signature] = (JSON.parse(body) as { token: string }).token.split('.') as [
			string,
			string,
			string,
		];
		expect(
			verify('sha256', Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, 'base64url'))
		).toBe(true);
		// The serial stays exact beyond 2^53.
		expect(Buffer.from(header, 'base64url').toString()).toContain('"serial":4722366482869645213695}');
		expect(fromB64(header)).toMatchObject({
			alg: 'RS256',
			subject_name: 'C=SI,O=state-institutions,CN=TEST 12345678',
			issuer_name: 'C=SI,O=state-institutions,CN=Tax CA Test',
		});
		const sent = fromB64(payload).InvoiceRequest;
		expect(sent.Header).toEqual({
			MessageID: expect.any(String),
			DateTime: expect.stringMatching(/^\d{4}-\d\d-\d\dT/),
		});
		expect(sent.Invoice).toEqual({
			TaxNumber: 12345678,
			IssueDateTime: '2026-10-16T14:05:09',
			NumberingStructure: 'B',
			InvoiceIdentifier: { BusinessPremiseID: 'SPLET', ElectronicDeviceID: 'API1', InvoiceNumber: '42' },
			InvoiceAmount: 5,
			PaymentAmount: 5,
			TaxesPerSeller: [{ VAT: [{ TaxRate: 22, TaxableAmount: 4.1, TaxAmount: 0.9 }] }],
			ProtectedID: invoice.zoi,
			SubsequentSubmit: true,
		});
	});

	it('throws on a FURS error, a non-200 answer or an unreadable body, so the job retries', async () => {
		for (const [response, message] of [
			[answer({ InvoiceResponse: { Error: { ErrorCode: 'S002', ErrorMessage: 'Napačen podpis' } } }), /S002/],
			[answer({}, 503), /HTTP 503/],
			[{ status: 200, body: 'not json' }, /no EOR/],
			[answer({ InvoiceResponse: {} }), /no EOR/],
		] as const) {
			const fiscal = fursFiscal({ ...options, transport: async () => response });
			await expect(fiscal.issue(invoice)).rejects.toThrow(message);
		}
	});
});
