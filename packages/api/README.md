# @zivali/api

Typed fetch client for the REST API (`apps/api`, contract C1), shared by web and mobile. Source is consumed as TypeScript; every file in `src/` is a subpath (`@zivali/api/client`, `@zivali/api/reports`, `@zivali/api/__fixtures__/reports`).

| Subpath    | What                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `client`   | `createApiClient({ baseUrl, getAccessToken, deviceId, locale })`, `ApiError`, `ErrorCode`, `ERROR_STATUS`               |
| `query`    | `queryDefaults` (staleTime 30 s, 2 retries, none for 4xx), `queryKeys(domain)`, `Page<T>`, `pageParams`, `flattenPages` |
| `mock`     | `createMockApi(routes)`, `mockError(code)` for tests and UI work before an endpoint is merged                           |
| `<domain>` | one file per domain (C3–C14); functions take the client first: `getReport(api, code)`                                   |

```ts
const api = createApiClient({ baseUrl: env.API_URL, getAccessToken, deviceId, locale: 'sl' });
await api.request<Created>('POST', '/v1/reports', { body, idempotent: outboxId }); // Idempotency-Key
const queryClient = new QueryClient({ defaultOptions: queryDefaults });
```

- Every request sends `Accept-Language`, `x-device-id` (when set) and `Authorization: Bearer` (when a token exists). `idempotent: '<key>'` sends that `Idempotency-Key`; pass a stable key when the call may be repeated, `true` makes a fresh one.
- Non-2xx bodies `{ error: { code, message, details, issues } }` throw `ApiError`; unknown codes and non-JSON bodies become `INTERNAL`, a failed fetch becomes `NETWORK` (status 0). Map `code` to `t('errors.<code>')`.
- Fixtures: `src/__fixtures__/<domain>.ts` exports wire-shaped values copied from the contract example; serve them with `createMockApi({ 'GET /v1/reports/:code': report })`.

`pnpm --filter @zivali/api test` runs `node --test` on `test/*.test.ts` (Node 22 type stripping).
