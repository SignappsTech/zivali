import { describe, expect, it } from 'vitest';

import { posterFileName, squareFileName } from '@/lib/poster-link';

describe('download file names', () => {
	it('carry the code and the language, never a pet name, so both languages download as two files', () => {
		expect(posterFileName('Rex12345', 'sl')).toBe('najdimo-Rex12345-sl.pdf');
		expect(posterFileName('Rex12345', 'en')).toBe('najdimo-Rex12345-en.pdf');
		expect(squareFileName('Rex12345', 'sl')).toBe('najdimo-Rex12345-sl.png');
		expect(squareFileName('Rex12345', 'en')).toBe('najdimo-Rex12345-en.png');
	});
});
