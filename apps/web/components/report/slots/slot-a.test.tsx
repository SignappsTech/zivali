import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { publicReport } from '@zivali/api/__fixtures__/reports';
import sl from '@zivali/i18n/dist/sl.json';
import type { DetailReport } from '@/components/report/slots/types';

import { SlotA } from './slot-a';

const show = (report: Partial<DetailReport>) =>
	render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<SlotA report={{ ...publicReport, ...report } as DetailReport} />
		</NextIntlClientProvider>
	);
afterEach(cleanup);

describe('SlotA sighting (P9, TASK-30.2)', () => {
	it('opens the short sighting flow linked to a lost report', () => {
		show({ type: 'lost', short_code: 'Rex12345' });
		const href = screen.getByRole('link', { name: 'Sporoči opažanje' }).getAttribute('href')!;
		const url = new URL(href, 'http://localhost');
		expect(url.pathname).toBe('/prijava/najdena-zival');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			type: 'sighted',
			linked_report_id: publicReport.id,
			code: 'Rex12345',
			species: 'dog',
		});
	});

	it('opens the plain sighting flow from a found report (the API links sightings to lost reports only)', () => {
		show({ type: 'found' });
		expect(screen.getByRole('link', { name: 'Sporoči opažanje' }).getAttribute('href')).toBe(
			'/prijava/najdena-zival?type=sighted'
		);
	});

	it('offers no sighting on a sighting or to the report owner', () => {
		show({ type: 'sighted' });
		expect(screen.queryByRole('link', { name: 'Sporoči opažanje' })).toBeNull();
		cleanup();
		show({ type: 'lost', is_mine: true });
		expect(screen.queryByRole('link', { name: 'Sporoči opažanje' })).toBeNull();
	});
});
