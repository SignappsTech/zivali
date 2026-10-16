import { describe, expect, it } from 'vitest';

import { parseLinked } from './linked';

const ID = '51aa3c2e-4b1d-4f6a-9e2c-8d7b5a1f3e10';

describe('parseLinked (C15 report/found?type=sighted&linked_report_id=)', () => {
	it('links a sighting to a lost report with a valid id and its code or species', () => {
		expect(parseLinked({ type: 'sighted', linked_report_id: ID, code: 'Rex12345' })).toEqual({
			id: ID,
			code: 'Rex12345',
		});
		expect(parseLinked({ type: 'sighted', linked_report_id: ID, species: 'cat' })).toEqual({
			id: ID,
			species: 'cat',
		});
	});

	it('falls back to the plain flow for a bad id, another type, an unknown species or neither code nor species', () => {
		expect(parseLinked({ type: 'sighted', linked_report_id: 'not-a-uuid', code: 'Rex12345' })).toBeUndefined();
		expect(parseLinked({ type: 'sighted', linked_report_id: [ID, ID], code: 'Rex12345' })).toBeUndefined();
		expect(parseLinked({ linked_report_id: ID, code: 'Rex12345' })).toBeUndefined();
		expect(parseLinked({ type: 'sighted', linked_report_id: ID, species: 'horse' })).toBeUndefined();
		expect(parseLinked({ type: 'sighted', linked_report_id: ID })).toBeUndefined();
	});
});
