import { useTranslations } from 'next-intl';

import { ApiError, type ErrorCode } from '@zivali/api/client';
import type { QueryError } from '@zivali/api/rtk';

// Apart from parts.tsx (which re-exports them), so the report flows take these without the auth views' toaster.

/** The C1 code of a thrown ApiError or of an RTK Query error (`{ status, data: { code } }`); else INTERNAL. */
export const errorCode = (error: unknown): ErrorCode =>
	error instanceof ApiError ? error.code : ((error as Partial<QueryError> | undefined)?.data?.code ?? 'INTERNAL');

/** ApiError or RTK Query error code → its errors.* sentence (C1); anything else is the generic one. */
export function useErrorText() {
	const t = useTranslations('errors');
	return (error: unknown) => {
		const code = errorCode(error);
		if (code === 'RATE_LIMITED') return t('RATE_LIMITED_generic');
		return t.has(code) ? t(code) : t('INTERNAL');
	};
}
