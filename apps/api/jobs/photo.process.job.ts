// photo.process { photo_id } (C5): validate the upload, re-encode it with sharp into the private variants, accept or
// reject with a reason (PhotosDomain.processPhoto).
import { z } from 'zod';

import { PhotosDomain } from '../domains/photos/index.ts';
import type { JobCtx } from './index.ts';

const Data = z.object({ photo_id: z.uuid() });

export async function handle(data: unknown, ctx: JobCtx): Promise<void> {
	const parsed = Data.safeParse(data);
	// Bad data stays bad: retrying cannot help.
	if (!parsed.success) return ctx.logger.error('photo.process: invalid job dropped');
	await PhotosDomain.processPhoto(parsed.data, ctx);
}
