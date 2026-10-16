// C1 public config: GET /v1/config/public returns every app_config key with is_public = true as { key: value }
// (feature and content flags, `share.facebook_groups`, …). The values are admin-edited JSON, so callers parse the keys
// they read. An injectEndpoints stub: delete it when `gen:api` emits the generated one.
import { api } from './rtk.ts';

export type PublicConfig = Record<string, unknown>;

export const configApi = api.injectEndpoints({
	endpoints: (build) => ({
		getPublicConfig: build.query<PublicConfig, void>({ query: () => '/v1/config/public' }),
	}),
});

export const { useGetPublicConfigQuery } = configApi;
