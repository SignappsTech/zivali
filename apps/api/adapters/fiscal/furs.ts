// FURS fiscal verification, JSON over mutual TLS (FURS technical spec for cash registers): POST <FURS_URL>/invoices
// with { token }, a JWS (RS256) over the InvoiceRequest whose header names our certificate (subject, issuer, decimal
// serial). The response token carries the EOR (UniqueInvoiceID) or an Error. TLS with the FURS CA authenticates FURS,
// so the response token is decoded, not verified. Tests inject `transport`: nothing in the suite reaches FURS.
import { createHash, randomUUID, sign, type KeyObject } from 'node:crypto';
import { request } from 'node:https';

import { z } from 'zod';

import { fursDateTime, zoiInput, type FiscalAdapter } from './index.ts';

export type FursTls = { cert: string; key: string; passphrase?: string; ca?: string };
export type FursTransport = (url: string, body: string, tls: FursTls) => Promise<{ status: number; body: string }>;
export type FursOptions = {
	url: string;
	tax_number: string;
	premise_id: string;
	device_id: string;
	/** The certificate's private key: signs the ZOI and the JWS. */
	key: KeyObject;
	/** X509Certificate subject and issuer (newline-separated) and hex serial. */
	cert: { subject: string; issuer: string; serial: string };
	tls: FursTls;
	transport?: FursTransport;
};

const FursResponse = z.object({
	InvoiceResponse: z.object({
		UniqueInvoiceID: z.string().min(1).max(64).optional(),
		Error: z.object({ ErrorCode: z.string().max(16), ErrorMessage: z.string().max(500).optional() }).optional(),
	}),
});

const b64url = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
const eur = (cents: number) => Number((cents / 100).toFixed(2));
const dn = (name: string) => name.split('\n').join(',');

function decode(body: string): z.infer<typeof FursResponse> | null {
	try {
		const { token } = JSON.parse(body) as { token?: string };
		const payload = token?.split('.')[1];
		const parsed = payload && FursResponse.safeParse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
		return parsed && parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export function fursFiscal(o: FursOptions): FiscalAdapter {
	const transport = o.transport ?? httpsTransport;
	const zoi: FiscalAdapter['zoi'] = (invoice) =>
		createHash('md5')
			.update(sign('sha256', Buffer.from(zoiInput(o.tax_number, invoice), 'utf8'), o.key))
			.digest('hex');
	// The serial is written raw: as a JSON number it can exceed 2^53.
	const header =
		`{"alg":"RS256","subject_name":${JSON.stringify(dn(o.cert.subject))},` +
		`"issuer_name":${JSON.stringify(dn(o.cert.issuer))},"serial":${BigInt(`0x${o.cert.serial}`)}}`;
	return {
		provider: 'furs',
		live: false,
		tax_number: o.tax_number,
		premise_id: o.premise_id,
		device_id: o.device_id,
		zoi,
		async issue(invoice) {
			const protectedId = zoi(invoice);
			const payload = JSON.stringify({
				InvoiceRequest: {
					Header: { MessageID: randomUUID(), DateTime: fursDateTime(new Date()) },
					Invoice: {
						TaxNumber: Number(o.tax_number),
						IssueDateTime: fursDateTime(invoice.issued_at),
						// B: numbered per business premise and electronic device.
						NumberingStructure: 'B',
						InvoiceIdentifier: {
							BusinessPremiseID: invoice.premise_id,
							ElectronicDeviceID: invoice.device_id,
							InvoiceNumber: String(invoice.sequence),
						},
						InvoiceAmount: eur(invoice.gross_cents),
						PaymentAmount: eur(invoice.gross_cents),
						TaxesPerSeller: [
							{
								VAT: [
									{
										TaxRate: invoice.vat_rate,
										TaxableAmount: eur(invoice.net_cents),
										TaxAmount: eur(invoice.vat_cents),
									},
								],
							},
						],
						ProtectedID: protectedId,
						SubsequentSubmit: invoice.subsequent,
					},
				},
			});
			const signingInput = `${b64url(header)}.${b64url(payload)}`;
			const token = `${signingInput}.${sign('sha256', Buffer.from(signingInput), o.key).toString('base64url')}`;
			const res = await transport(`${o.url.replace(/\/+$/, '')}/invoices`, JSON.stringify({ token }), o.tls);
			if (res.status !== 200) throw new Error(`furs: HTTP ${res.status}`);
			const answer = decode(res.body)?.InvoiceResponse;
			if (answer?.Error) throw new Error(`furs: error ${answer.Error.ErrorCode} ${answer.Error.ErrorMessage ?? ''}`);
			if (!answer?.UniqueInvoiceID) throw new Error('furs: no EOR in the response');
			return { zoi: protectedId, eor: answer.UniqueInvoiceID, issued_at: invoice.issued_at };
		},
	};
}

/** POST over mutual TLS (our certificate and key; the FURS CA when given), 10 s timeout. */
const httpsTransport: FursTransport = (url, body, tls) =>
	new Promise((resolve, reject) => {
		const req = request(
			url,
			{
				method: 'POST',
				...tls,
				headers: { 'content-type': 'application/json; charset=UTF-8', 'content-length': Buffer.byteLength(body) },
				timeout: 10_000,
			},
			(res) => {
				const chunks: Buffer[] = [];
				res.on('data', (chunk: Buffer) => chunks.push(chunk));
				res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
				res.on('error', reject);
			}
		);
		req.on('timeout', () => req.destroy(new Error('furs: timeout')));
		req.on('error', reject);
		req.end(body);
	});
