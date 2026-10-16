# @zivali/api

Typed client for the REST API (`apps/api`, contract C1), shared by web and mobile: a fetch transport, an RTK Query slice with endpoints generated from the API's OpenAPI spec, a mock and fixtures. Source is consumed as TypeScript; every file in `src/` is a subpath (`@zivali/api/rtk`, `@zivali/api/generated/endpoints`, `@zivali/api/__fixtures__/reports`).

| Subpath                            | What                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `client`                           | `createApiClient({ baseUrl, getAccessToken, deviceId, locale })`, `ApiError`, `ErrorCode`, `ERROR_STATUS`           |
| `rtk`                              | `api` (empty slice, `reducerPath: 'api'`), `baseQuery`, `createApiStore(client)`, `QueryError`                      |
| `generated/endpoints`              | output of `pnpm --filter @zivali/api gen:api` (hooks, types, tags); never edit by hand                              |
| `pagination`                       | `Page<T>`, `pageParams` (`infiniteQueryOptions` for keyset lists), `flattenPages`                                   |
| `mock`                             | `createMockApi(routes)`, `mockError(code)` for tests and UI work before an endpoint is merged                       |
| `auth`                             | `configureAuth(supabase, store)`, Supabase Auth helpers (errors as `ApiError`), `useSession`, `useRequireAuth` (C3) |
| `me`, `pets`, `reports`, `matches` | endpoint stubs and hooks (C3, C4, C8) until codegen has them; each names its backend task                           |
| `photos`                           | `uploadPhoto(client, photo, { onProgress, signal, put })`, `xhrPut`, photo status/delete hooks (C5)                 |
| `geocode`                          | `searchPlaces` / `reversePlace` (POST, C6) and `usePlaceSearch(q, near)` (300 ms, ≥ 3 chars, aborts)                |
| `chat`                             | C9 endpoints and hooks; `subscribeConversation(supabase, store, id)` (Realtime, catch-up on resubscribe)            |
| `notifications`                    | C10 inbox, prefs, quiet hours, push tokens; `subscribeInbox(supabase, dispatch, userId, onEvent)`                   |
| `alerts`                           | C10 nearby-alert subscription                                                                                       |
| `abuse`                            | C11 abuse reports, admin queue and moderation flags                                                                 |
| `payments`                         | C13 checkout, payments; `startCheckout`, `redirectToCheckout` (web), `openCheckout` (mobile)                        |
| `ads`                              | C14 ad serving and admin; `useAd(slot, ctx)` → `{ ad, loading, error }` (never throws)                              |
| `partners`                         | C14 partner stats and leads                                                                                         |
| `directory-admin`                  | C18 §Admin directory editing (admin, aal2): lists, shelter and municipality writes, history, CSV import dry run     |
| `broadcast`                        | `subscribeBroadcast` (private Supabase Broadcast channel, typed without supabase-js)                                |

Until `gen:api` covers a domain, its file holds `injectEndpoints` stubs that follow the contract (paths, types, the owning backend task in the header); delete them when the generated endpoints land and keep the hand-written helpers.

```ts
const store = createApiStore(createApiClient({ baseUrl: env.API_URL, getAccessToken, deviceId, locale: 'sl' }));
// <Provider store={store}> (react-redux), then the generated hooks: useGetReportQuery({ code })
```

- **Codegen**: `gen:api` reads `apps/api/openapi.json` (zod-to-openapi, TASK-3.7) with `openapi-config.ts` and writes `src/generated/endpoints.ts`, which extends `api` with `injectEndpoints`. Without the spec it says so and exits 0.
- **Stubs**: until `apps/api/openapi.json` has a route, `src/<domain>.ts` injects a hand-written endpoint typed from `@zivali/types`, with the owning backend task in a comment; delete it when the generated one lands. Points in requests are the ones the form already coarsened (C6); coordinates in query strings are rounded to 2 decimals (C4).
- **Session**: call `configureAuth(supabase, store)` once at start-up. A different user (or sign-out) resets the API cache; `useRequireAuth()` returns a `gate` (`ok`, `loading`, `signin`, `verify`, `forbidden`, `aal2`, `error`) and the app redirects.
- **Headers**: every request sends `Accept-Language`, `x-device-id` (when set) and `Authorization: Bearer` (when a token exists). Paths must start with `/`.
- **Idempotency**: an endpoint with `extraOptions: { idempotent: true }` sends a fresh `Idempotency-Key` per call. A mutation that can be repeated (outbox, re-submit after a lost response) must pass a **stable string key**: the `Idempotency-Key` header parameter, or `idempotent: '<key>'` on `client.request`.
- **Errors**: `{ error: { code, message, details, issues } }` bodies become `ApiError` on the client and `{ status, data: { code, message, details, issues, requestId } }` in RTK Query (plain data, the store stays serialisable). Unknown codes and non-JSON bodies are `INTERNAL`, a failed fetch is `NETWORK` (status 0). Map `code` to `t('errors.<code>')`.
- **Retries**: queries retry network and 5xx errors twice; 4xx and mutations never.
- **Fixtures**: `src/__fixtures__/<domain>.ts` exports wire-shaped values copied from the contract example; `createApiStore(createMockApi({ 'GET /v1/reports/:code': report }))` serves them.
- **Next.js**: add `transpilePackages: ['@zivali/api']` to `next.config.ts` (the package ships TypeScript source).

`pnpm --filter @zivali/api test` runs `node --test` on `test/*.test.ts` (Node 22 type stripping).
