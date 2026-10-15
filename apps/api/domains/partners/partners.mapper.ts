// Partner stats and lead DTOs (C14), parsed with the shared schemas. Leads (contact data) reach admins only.
import type { z } from 'zod';

import { AdminLead, PartnerStats } from '@zivali/validation';

import type { leads } from '../../generated/client.ts';

/** The stored snapshot is already masked; parsing guards against a malformed row. */
export function toPartnerStatsDto(data: unknown): z.infer<typeof PartnerStats> {
	return PartnerStats.parse(data);
}

export function toAdminLeadDto(row: leads): z.infer<typeof AdminLead> {
	return AdminLead.parse({
		...row,
		consent_at: row.consent_at.toISOString(),
		created_at: row.created_at.toISOString(),
	});
}

export default { toPartnerStatsDto, toAdminLeadDto };
