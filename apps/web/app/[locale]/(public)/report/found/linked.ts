import { z } from 'zod';

import { SPECIES } from '@zivali/types';
import type { Linked } from '@/components/report-found/found-form';

/**
 * C15 `report/found?type=sighted&linked_report_id=<uuid>&code=&species=`: the short linked sighting flow. A bad id is
 * dropped, so the finder still gets the normal sighting flow; without a species the flow reads it from the listing.
 */
export function parseLinked(params: Record<string, string | string[] | undefined>): Linked | undefined {
	const one = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : undefined);
	const id = one('linked_report_id');
	const code = one('code') || undefined;
	const species = SPECIES.find((s) => s === one('species'));
	if (one('type') !== 'sighted' || !z.uuid().safeParse(id).success || !(species || code)) return undefined;
	return { id: id!, ...(code && { code }), ...(species && { species }) };
}
