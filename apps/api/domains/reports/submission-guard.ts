// Submission guard (C7): createReport calls it before any other rule. Stub from TASK-29.2: every report is visible.
// TASK-17.1 adds the anonymous rules here (per IP and device hash limits → RATE_LIMITED, holds → 'held').
import type { z } from 'zod';

import type { ModerationState } from '@zivali/types';
import type { CreateReportInput } from '@zivali/validation';

import type { Ctx } from '../../lib/ctx.ts';

export type SubmissionVerdict = { moderation_state: Extract<ModerationState, 'visible' | 'held'> };

export async function submissionGuard(
	_input: z.infer<typeof CreateReportInput>,
	_ctx: Ctx
): Promise<SubmissionVerdict> {
	return { moderation_state: 'visible' };
}

export default { submissionGuard };
