// Side-effect module: installs `.openapi()` on zod. Must be the first import of openapi.ts so it runs before the schemas.
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);
