// Plain zod. Schemas call `.openapi(refId, meta)`: a no-op here, so client bundles (web, mobile) never load
// @asteasolutions/zod-to-openapi. The server entry './openapi.ts' installs the real method BEFORE the schemas load.
// The type-only import below brings in the `.openapi` typings and is erased at build time.
import type {} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

const proto = z.ZodType.prototype as unknown as { openapi?: unknown };
proto.openapi ??= function (this: unknown) {
	return this;
};

export { z };
