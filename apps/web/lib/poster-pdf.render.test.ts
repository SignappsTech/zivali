// @vitest-environment node
// TASK-24.4 QA: a real render. Text is read back from the PDF (pdftotext, skipped when absent); the QR is rebuilt from
// the drawn ink rectangles and compared with the module matrix of the short link (no QR decoder is installed), and
// every fill colour is checked to be neutral (no hue), so greyscale contrast holds.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

import { create as createQr } from 'qrcode';
import { describe, expect, it } from 'vitest';

import { publicReport } from '@zivali/api/__fixtures__/reports';
import type { PublicReport } from '@zivali/types';

import { posterContent, renderPosterPdf } from './poster-pdf';

const lost: PublicReport = {
	...publicReport,
	short_code: 'Rex12345',
	type: 'lost',
	status: 'open',
	species: 'dog',
	name: 'Žan Čšž',
	reward: { eur: 50, note: 'čšž' },
	has_chip: true,
	area: { lat: 46.0612, lng: 14.4872, radius_m: 500 },
};
const place = { label: 'Šiška, Ljubljana', area: 'Šiška', municipality: 'Ljubljana' };
const PHOTO = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64'
);

function streams(pdf: Buffer): string[] {
	const out: string[] = [];
	const raw = pdf.toString('latin1');
	for (const match of raw.matchAll(/stream\r?\n/g)) {
		const start = match.index! + match[0].length;
		const end = raw.indexOf('endstream', start);
		try {
			out.push(inflateSync(pdf.subarray(start, end)).toString('latin1'));
		} catch {
			/* not flate */
		}
	}
	return out;
}

describe('rendered poster', () => {
	it('prints č š ž, no phone/email/chip/exact point, a QR of the short link, neutral ink on paper', async () => {
		const pdf = await renderPosterPdf(posterContent(lost, place, 'sl'), PHOTO);
		const dir = mkdtempSync(join(tmpdir(), 'poster-'));
		const file = join(dir, 'p.pdf');
		writeFileSync(file, pdf);
		let text = '';
		try {
			text = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', file, '-'], { encoding: 'utf8' });
		} catch {
			/* no poppler here */
		}
		if (text) {
			expect(text).toContain('Pogrešan pes');
			expect(text).toContain('Žan Čšž');
			expect(text).toContain('najdimo.si/r/Rex12345');
			expect(text).toMatch(/Šiška/);
			expect(text).not.toMatch(/46\.0|14\.4|@|\+386|čip|chip|manage|upravljaj/i);
		}

		const content = streams(pdf).join('\n');
		const fills = new Set(
			[...content.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) rg/g)].map((m) => `${m[1]} ${m[2]} ${m[3]}`)
		);
		for (const rgb of fills) {
			const [r, g, b] = rgb.split(' ');
			expect({ rgb, neutral: r === g && g === b }).toEqual({ rgb, neutral: true });
		}

		const { modules } = createQr('https://najdimo.si/r/Rex12345', { errorCorrectionLevel: 'M' });
		const rects = [...content.matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re/g)].map((m) =>
			m.slice(1).map(Number)
		);
		const unit = (56 * 72) / 25.4 / modules.size;
		const runs = rects.filter(([, , , h]) => Math.abs(h! - unit) < 0.01);
		expect(runs.length).toBeGreaterThan(50);
		const x0 = Math.min(...runs.map((r) => r[0]!));
		const y0 = Math.min(...runs.map((r) => r[1]!));
		const grid = Array.from({ length: modules.size }, () => new Array<boolean>(modules.size).fill(false));
		for (const [x, y, w] of runs) {
			const row = Math.round((y! - y0) / unit);
			const col = Math.round((x! - x0) / unit);
			for (let i = 0; i < Math.round(w! / unit); i++) grid[row]![col + i] = true;
		}
		for (let r = 0; r < modules.size; r++)
			for (let c = 0; c < modules.size; c++) expect(grid[r]![c]).toBe(!!modules.get(r, c));
	});
});
