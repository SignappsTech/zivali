// Plain zod. Schemas call `.openapi(refId, meta)`: a no-op here, so client bundles (web, mobile) never load
// @asteasolutions/zod-to-openapi. The server entry './openapi.ts' installs the real method BEFORE the schemas load.
// The type-only import below brings in the `.openapi` typings and is erased at build time.
import type {} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// `isStub` lets './openapi-extend.ts' fail loudly if it is imported AFTER this file (extendZodWithOpenApi silently skips
// when `.openapi` already exists, which would leave the no-op in place and the OpenAPI output empty).
const proto = z.ZodType.prototype as unknown as { openapi?: ((this: unknown) => unknown) & { isStub?: boolean } };
if (!proto.openapi) {
	const stub = function (this: unknown) {
		return this;
	};
	stub.isStub = true;
	proto.openapi = stub;
}

export { z };
