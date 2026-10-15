// photo.publish { report_id } (C5): copy the accepted variants of a visible report to the media bucket, or delete the
// public copies of a held, hidden, removed or expired one (PhotosDomain.publishReportPhotos). Sent by every write
// that changes a report's visibility or photos, and by photo.process for a photo already on a report.
import { z } from 'zod';

import { PhotosDomain } from '../domains/photos/index.ts';
import type { JobCtx } from './index.ts';

const Data = z.object({ report_id: z.uuid() });

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	const parsed = Data.safeParse(data);
	// Bad data stays bad: retrying cannot help.
	if (!parsed.success) return ctx.logger.error('photo.publish: invalid job dropped');
	await PhotosDomain.publishReportPhotos(parsed.data, ctx);
}
