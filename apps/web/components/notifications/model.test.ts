import { describe, expect, it } from 'vitest';

import type { Notification } from '@zivali/types';

import { groupOf, inboxGroups, timeLabel } from './model';

const now = new Date('2026-10-15T14:20:00+02:00');
let seq = 0;
const item = (type: string, payload: Record<string, unknown>, created_at: string, read = false): Notification => ({
	id: `n${++seq}`,
	type: type as Notification['type'],
	payload,
	read_at: read ? created_at : null,
	created_at,
});

describe('inboxGroups', () => {
	it('groups by the Ljubljana day: today, the last 7 days, earlier', () => {
		expect(groupOf('2026-10-15T00:10:00+02:00', now)).toBe('today');
		// 23:30 UTC on the 14th is already the 15th in Ljubljana.
		expect(groupOf('2026-10-14T23:30:00Z', now)).toBe('today');
		expect(groupOf('2026-10-14T21:00:00Z', now)).toBe('week');
		expect(groupOf('2026-10-09T09:00:00+02:00', now)).toBe('week');
		expect(groupOf('2026-10-08T09:00:00+02:00', now)).toBe('earlier');
	});

	it('passes only the allowlisted payload variables to the copy, and links each type to its C10 target', () => {
		const [today] = inboxGroups(
			[
				item(
					'match_chip',
					{
						lost_code: 'Pq7',
						other_code: 'Hk3',
						other_type: 'found',
						has_name: 'yes',
						pet_name: 'Luna',
						species: 'dog',
						email: 'x@y.si',
					},
					'2026-10-15T13:52:00+02:00'
				),
				item(
					'report_reunited',
					{ report_code: 'Rr1', species: 'cat', secret: 'no' },
					'2026-10-15T12:00:00+02:00'
				),
				item(
					'report_expiring',
					{ report_code: 'Ex1', report_type: 'found', days_left: 3 },
					'2026-10-15T11:00:00+02:00'
				),
				item(
					'payment_receipt',
					{ amount_cents: 300, purpose: 'tip', is_test: true, receipt_ref: 'R-1' },
					'2026-10-15T10:00:00+02:00'
				),
			],
			now,
			'sl'
		);

		expect(today!.rows.map(({ values, href }) => ({ values, href }))).toEqual([
			{
				values: { lost_code: 'Pq7', other_type: 'found', has_name: 'yes', pet_name: 'Luna', species: 'dog' },
				href: { pathname: '/r/[code]/matches', params: { code: 'Pq7' } },
			},
			{
				values: { report_code: 'Rr1', species: 'cat' },
				href: { pathname: '/r/[code]', params: { code: 'Rr1' } },
			},
			{
				values: { report_code: 'Ex1', report_type: 'found', days_left: 3 },
				href: { pathname: '/my-reports', query: { r: 'Ex1', action: 'extend' } },
			},
			{ values: { amount: '3,00 €', purpose: 'tip', is_test: 'yes' }, href: '/account/payments' },
		]);
	});

	it('leaves out email-only, local and unknown types and rows without a target', () => {
		const groups = inboxGroups(
			[
				item('manage_link', { report_code: 'M1', manage_url: 'https://x' }, '2026-10-15T10:00:00+02:00'),
				item('nearby_local', { report_code: 'L1' }, '2026-10-15T10:00:00+02:00'),
				item('chat_message', { preview_alias: 'Ana' }, '2026-10-15T10:00:00+02:00'),
				item(
					'report_hidden',
					{ report_code: 'H1', support_email: 'podpora@najdimo.si' },
					'2026-10-15T09:00:00+02:00'
				),
			],
			now,
			'sl'
		);

		expect(groups.flatMap(({ rows }) => rows.map((row) => [row.type, row.values]))).toEqual([
			['report_hidden', {}],
		]);
	});

	it('shows one row per conversation, sorts a chip match first in its group and keeps the order otherwise', () => {
		const groups = inboxGroups(
			[
				item(
					'chat_message',
					{ conversation_id: 'c1', preview_alias: 'Ana', unread_count: 2 },
					'2026-10-15T13:00:00+02:00',
					true
				),
				item(
					'report_reminder',
					{ report_code: 'R7', day: 7, has_name: 'no', species: 'cat' },
					'2026-10-13T08:00:00+02:00'
				),
				item(
					'chat_message',
					{ conversation_id: 'c1', preview_alias: 'Ana', unread_count: 1 },
					'2026-10-15T12:00:00+02:00'
				),
				item(
					'match_chip',
					{ lost_code: 'Pq7', other_type: 'found', has_name: 'no', species: 'dog' },
					'2026-10-15T09:00:00+02:00',
					true
				),
				item(
					'payment_receipt',
					{ amount_cents: 500, purpose: 'contribution', is_test: false },
					'2026-09-29T08:00:00+02:00'
				),
			],
			now,
			'en'
		);

		expect(groups.map(({ group, rows }) => [group, rows.map((row) => row.type)])).toEqual([
			['today', ['match_chip', 'chat_message']],
			['week', ['report_reminder']],
			['earlier', ['payment_receipt']],
		]);
		const chat = groups[0]!.rows[1]!;
		expect(chat.ids).toHaveLength(2);
		expect(chat.unread).toBe(true);
		expect(chat.href).toEqual({ pathname: '/inbox/[id]', params: { id: 'c1' } });
		expect(groups[1]!.rows[0]!.report_code).toBe('R7');
		expect(groups[2]!.rows[0]!.values.amount).toBe('€5.00');
	});
});

describe('timeLabel', () => {
	it('shows the time today, the weekday this week and the date earlier, in the locale', () => {
		expect(timeLabel('2026-10-15T13:52:00+02:00', 'today', 'sl')).toBe('13:52');
		expect(timeLabel('2026-10-15T13:52:00+02:00', 'today', 'en')).toBe('13:52');
		expect(timeLabel('2026-10-13T08:00:00+02:00', 'week', 'sl')).toBe('tor.');
		expect(timeLabel('2026-10-13T08:00:00+02:00', 'week', 'en')).toBe('Tue');
		expect(timeLabel('2026-10-03T08:00:00+02:00', 'earlier', 'sl')).toBe('3. 10.');
		expect(timeLabel('2026-10-03T08:00:00+02:00', 'earlier', 'en')).toBe('03/10');
	});
});
