import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { publicReport } from '@zivali/api/__fixtures__/reports';
import sl from '@zivali/i18n/dist/sl.json';
import type { DetailReport } from '@/components/report/slots/types';

import { SlotC } from './slot-c';

vi.mock('@/components/report/slots/owner-lazy', () => ({ OwnerMenu: () => <div data-testid="owner-menu" /> }));

// TASK-25.6: the abuse entry is a visitor's; the report's own managers never see "Prijavi zlorabo" (C11 refuses it).
const show = (report: Partial<DetailReport>) =>
	render(
		<NextIntlClientProvider locale="sl" messages={sl}>
			<SlotC report={{ ...publicReport, ...report } as DetailReport} />
		</NextIntlClientProvider>
	);
afterEach(cleanup);

describe('SlotC abuse entry (TASK-25.6)', () => {
	it('offers "Prijavi zlorabo" to a visitor', async () => {
		show({ is_mine: false });
		fireEvent.keyDown(screen.getByRole('button', { name: sl.report.more }), { key: 'Enter' });
		const menu = await screen.findByRole('menu');
		expect(within(menu).getByRole('menuitem', { name: sl.report.more_abuse })).toBeTruthy();
	});

	it('hides it from the owner: the owner menu stands in', () => {
		show({ is_mine: true });
		expect(screen.getByTestId('owner-menu')).toBeTruthy();
		expect(screen.queryByRole('button', { name: sl.report.more })).toBeNull();
	});
});
