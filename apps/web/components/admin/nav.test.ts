import { describe, expect, it } from 'vitest';

import { adminItem, canOpen, comingSection, itemHref } from './nav';

describe('admin navigation rules', () => {
	it('finds the item of a page and of the pages below it; the dashboard matches only itself', () => {
		expect(adminItem('/admin')?.key).toBe('nav_dashboard');
		expect(adminItem('/admin/shelters/lipa')?.key).toBe('nav_directory');
		expect(adminItem('/admin/ads')?.key).toBe('nav_ads');
		expect(adminItem('/admin/unknown')).toBeUndefined();
	});

	it('opens Overview and Safety to moderators, everything to admins, unlisted pages to admins only', () => {
		expect(canOpen('/admin', 'MODERATOR')).toBe(true);
		expect(canOpen('/admin/moderation', 'MODERATOR')).toBe(true);
		expect(canOpen('/admin/abuse-reports', 'MODERATOR')).toBe(true);
		expect(canOpen('/admin/audit-log', 'MODERATOR')).toBe(false);
		expect(canOpen('/admin/shelters', 'MODERATOR')).toBe(false);
		expect(canOpen('/admin/unknown', 'MODERATOR')).toBe(false);
		expect(canOpen('/admin/unknown', 'ADMIN')).toBe(true);
	});

	it('links built pages directly and the others through /admin/[section]', () => {
		expect(itemHref(adminItem('/admin/audit-log')!)).toBe('/admin/audit-log');
		expect(itemHref(comingSection('ads')!)).toEqual({ pathname: '/admin/[section]', params: { section: 'ads' } });
		expect(comingSection('shelters')).toBeUndefined();
		expect(comingSection('abuse-reports')).toBeUndefined();
	});
});
