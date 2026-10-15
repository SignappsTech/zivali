// Fiscal verification of invoices (C13 §Fiscal invoices, TASK-92; ZDavPR: card payments count as cash). Provider:
// FISCAL_PROVIDER mock (default everywhere: payments are test-only, and a test payment must never reach FURS
// production) | furs (FURS test environment only; the production endpoint is refused) | off (no invoices). The ZOI is
// ours (MD5 of our RSA-SHA256 signature over the FURS string), the EOR comes back from FURS.
import { createPrivateKey, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';

import type { Config } from '../../lib/config.ts';
import { fursFiscal } from './furs.ts';
import { mockFiscal } from './mock.ts';

/** One invoice as FURS sees it; every field is stored on the invoice row, so a retry sends the same data. */
export type FiscalInvoice = {
	premise_id: string;
	device_id: string;
	sequence: number;
	issued_at: Date;
	gross_cents: number;
	net_cents: number;
	/** Percent, e.g. 22. */
	vat_rate: number;
	vat_cents: number;
	/** A retry after a failed submission (FURS SubsequentSubmit). */
	subsequent: boolean;
};
export type FiscalResult = { zoi: string; eor: string; issued_at: Date };
export type FiscalAdapter = {
	provider: 'mock' | 'furs' | 'off';
	/** True only against FURS production (no provider yet): part of the C13 live gate. */
	live: boolean;
	/** Seller's tax number and the FURS-registered premise and device that new invoices are numbered under. */
	tax_number: string;
	premise_id: string;
	device_id: string;
	/** ZOI (zaščitna oznaka izdajatelja): deterministic, so it is stored at creation and printed even without an EOR. */
	zoi(invoice: FiscalInvoice): string;
	/** Fiscal verification; throws when the provider fails, so the job retries with backoff. */
	issue(invoice: FiscalInvoice): Promise<FiscalResult>;
};

const clock = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/Ljubljana',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23',
});
const local = (date: Date) =>
	Object.fromEntries(clock.formatToParts(date).map((p) => [p.type, p.value])) as Record<
		'year' | 'month' | 'day' | 'hour' | 'minute' | 'second',
		string
	>;

/** Slovenian local time as FURS messages carry it: 2026-10-16T14:05:09 (no zone). */
export function fursDateTime(date: Date): string {
	const t = local(date);
	return `${t.year}-${t.month}-${t.day}T${t.hour}:${t.minute}:${t.second}`;
}

/** The string the ZOI signs (FURS spec): tax number, dd.MM.yyyy HH:mm:ss, sequence, premise, device, total. */
export function zoiInput(taxNumber: string, invoice: FiscalInvoice): string {
	const t = local(invoice.issued_at);
	const issued = `${t.day}.${t.month}.${t.year} ${t.hour}:${t.minute}:${t.second}`;
	const total = (invoice.gross_cents / 100).toFixed(2);
	return `${taxNumber}${issued}${invoice.sequence}${invoice.premise_id}${invoice.device_id}${total}`;
}

const FURS_PRODUCTION_HOST = 'blagajne.fu.gov.si';

export function createFiscal(cfg: Config): FiscalAdapter {
	const seller = {
		tax_number: cfg.FISCAL_TAX_NUMBER ?? '00000000',
		premise_id: cfg.FISCAL_PREMISE_ID,
		device_id: cfg.FISCAL_DEVICE_ID,
	};
	if (cfg.FISCAL_PROVIDER === 'mock') return mockFiscal(seller);
	if (cfg.FISCAL_PROVIDER === 'off') {
		const fail = () => {
			throw new Error('FISCAL_PROVIDER is off');
		};
		return { provider: 'off', live: false, ...seller, zoi: fail, issue: fail };
	}
	// Never FURS production from this build: a live fiscal provider opens the live gate (C13), which waits for Q-012.
	if (new URL(cfg.FURS_URL).hostname === FURS_PRODUCTION_HOST)
		throw new Error('FURS_URL: the FURS production endpoint is refused (test environment only, C13 live gate)');
	const missing = (['FISCAL_TAX_NUMBER', 'FURS_CERT_PATH', 'FURS_KEY_PATH'] as const).filter((name) => !cfg[name]);
	if (missing.length) throw new Error(`FISCAL_PROVIDER=furs needs ${missing.join(', ')}`);
	// The files live outside the repo (.secrets/ or the VPS); their contents and the passphrase are never logged.
	const certPem = readFileSync(cfg.FURS_CERT_PATH!, 'utf8');
	const keyPem = readFileSync(cfg.FURS_KEY_PATH!, 'utf8');
	const cert = new X509Certificate(certPem);
	return fursFiscal({
		...seller,
		url: cfg.FURS_URL,
		key: createPrivateKey({ key: keyPem, passphrase: cfg.FURS_KEY_PASSPHRASE }),
		cert: { subject: cert.subject, issuer: cert.issuer, serial: cert.serialNumber },
		tls: {
			cert: certPem,
			key: keyPem,
			passphrase: cfg.FURS_KEY_PASSPHRASE,
			ca: cfg.FURS_CA_PATH ? readFileSync(cfg.FURS_CA_PATH, 'utf8') : undefined,
		},
	});
}
