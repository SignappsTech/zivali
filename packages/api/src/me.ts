// C3 profile and admin users over REST, and the password of a converting anonymous session (C7 §6). Stubs typed from @zivali/types until apps/api/openapi.json has these routes;
// then `gen:api` generates them (src/generated/endpoints.ts) and this file is deleted.
import type {
	AdminUserList,
	AdminUserQuery,
	AuditLogList,
	AuditLogQuery,
	ConvertPasswordInput,
	Me,
	Profile,
	SetRoleInput,
	SetRoleResponse,
	UpdateMeInput,
	Uuid,
} from '@zivali/types';

import type { ApiClient } from './client.ts';
import { pageParams } from './pagination.ts';
import { api } from './rtk.ts';

/**
 * POST /v1/me/convert-password (TASK-17.12): after updateUser({ email }) on an anonymous session, its password. A plain
 * call (lib/auth convertAnonymous awaits it between two Supabase calls), so failures are ApiError (C1).
 */
export const convertAnonymousPassword = (client: ApiClient, body: ConvertPasswordInput) =>
	client.request<void>('POST', '/v1/me/convert-password', { body });

export const meApi = api.enhanceEndpoints({ addTagTypes: ['Me', 'AdminUsers', 'AuditLog'] }).injectEndpoints({
	endpoints: (build) => ({
		// TASK-9.2
		getMe: build.query<Me, void>({ query: () => '/v1/me', providesTags: ['Me'] }),
		// TASK-9.2. `home` is the point already coarsened by the form (C6 §Storage).
		updateMe: build.mutation<Profile, UpdateMeInput>({
			query: (body) => ({ url: '/v1/me', method: 'PATCH', body }),
			invalidatesTags: ['Me'],
		}),
		// TASK-34.2 (moderator, aal2)
		listAdminUsers: build.infiniteQuery<AdminUserList, Omit<AdminUserQuery, 'cursor'>, string | null>({
			infiniteQueryOptions: pageParams,
			query: ({ queryArg, pageParam }) => ({
				url: '/v1/admin/users',
				params: { query: queryArg.query, cursor: pageParam },
			}),
			providesTags: ['AdminUsers'],
		}),
		// TASK-34.2 (admin, aal2)
		setUserRole: build.mutation<SetRoleResponse, { id: Uuid; body: SetRoleInput }>({
			query: ({ id, body }) => ({ url: `/v1/admin/users/${id}/role`, method: 'PUT', body }),
			invalidatesTags: ['AdminUsers', 'AuditLog'],
		}),
		// TASK-34.2 (admin, aal2): newest first, exact-match filters.
		listAuditLog: build.infiniteQuery<AuditLogList, Omit<AuditLogQuery, 'cursor'>, string | null>({
			infiniteQueryOptions: pageParams,
			query: ({ queryArg, pageParam }) => ({
				url: '/v1/admin/audit-log',
				params: { ...queryArg, cursor: pageParam },
			}),
			providesTags: ['AuditLog'],
		}),
	}),
});

export const {
	useGetMeQuery,
	useUpdateMeMutation,
	useListAdminUsersInfiniteQuery,
	useSetUserRoleMutation,
	useListAuditLogInfiniteQuery,
} = meApi;
