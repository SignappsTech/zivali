// Public config DTO: { "<key>": <JSON value> } for every public app_config key.
import { z } from 'zod';

export const PublicConfigSchema = z.record(z.string(), z.unknown()).meta({
	id: 'PublicConfig',
	description: 'Public app_config flags by key, e.g. { "vet_partner.enabled": false }.',
});

export type PublicConfigDto = z.infer<typeof PublicConfigSchema>;

export function toPublicDto(flags: Record<string, unknown>): PublicConfigDto {
	return PublicConfigSchema.parse(flags);
}

export default { toPublicDto };
