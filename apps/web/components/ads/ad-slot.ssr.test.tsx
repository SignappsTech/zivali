// @vitest-environment node
import { PassThrough } from 'node:stream';

import { NextIntlClientProvider } from 'next-intl';
import { renderToPipeableStream } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import sl from '@zivali/i18n/dist/sl.json';

import { AdSlot } from './ad-slot';

// Next streams the server render (Fizz) and waits for a lazy chunk: the unit then runs on the server, where there is
// no window. It must not error there, and must not ask for an ad (nothing is counted on SSR).
describe('AdSlot streamed SSR', () => {
	for (const slot of ['feed', 'detail', 'reunited', 'sidebar'] as const)
		// Fails today: the unit reads window in its useState initialiser (QA bug, see backlog TASK-36 subtasks).
		it.fails(`${slot} renders on the server without an error and without a request`, async () => {
			const fetchMock = vi.fn();
			vi.stubGlobal('fetch', fetchMock);
			const errors: unknown[] = [];
			const html = await new Promise<string>((resolve) => {
				const out = new PassThrough();
				let text = '';
				out.on('data', (chunk) => (text += chunk));
				out.on('end', () => resolve(text));
				const stream = renderToPipeableStream(
					<NextIntlClientProvider locale="sl" messages={sl} timeZone="Europe/Ljubljana">
						<AdSlot slot={slot} />
					</NextIntlClientProvider>,
					{ onAllReady: () => stream.pipe(out), onError: (e) => errors.push(e) }
				);
			});
			expect(errors).toEqual([]);
			expect(html).toContain(`data-ad-slot="${slot}"`);
			expect(fetchMock).not.toHaveBeenCalled();
		});
});
