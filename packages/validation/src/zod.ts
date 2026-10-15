// zod with the zod-to-openapi extension (`.openapi(refId, { description, example })`). Schemas stay plain zod:
// they validate without any registry; `registerSchemas()` in openapi.ts collects them for the API docs.
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export { z };
