// Side-effect module: installs `.openapi()` on zod. Must be the first import of openapi.ts so it runs before the schemas.
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

if ((z.ZodType.prototype as unknown as { openapi?: { isStub?: boolean } }).openapi?.isStub)
	throw new Error('import @zivali/validation/openapi before @zivali/validation');

extendZodWithOpenApi(z);
