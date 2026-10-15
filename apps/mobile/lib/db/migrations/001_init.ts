// C17 local schema. A released migration is never edited: a schema change adds the next NNN_<slug>.ts.
// reports_cache holds only the public whitelist with the server's fuzzed area, never an exact point.
export default `
create table drafts (id text primary key, kind text not null check (kind in ('lost','found','sighted','pet')),
	data text not null, photo_paths text not null default '[]', updated_at integer not null);
create table outbox (id text primary key, kind text not null check (kind in ('found','sighted')),
	payload text not null, captured_at text not null,
	status text not null check (status in ('queued','sending','sent','failed','needs_action')),
	attempts integer not null default 0, next_attempt_at integer, last_error_code text, last_error_message text,
	result text, created_at integer not null, updated_at integer not null);
create table outbox_photos (outbox_id text not null references outbox(id) on delete cascade, position integer not null,
	path text not null, sha256 text not null, photo_id text, uploaded integer not null default 0,
	primary key (outbox_id, position));
create table reports_cache (id text primary key, short_code text not null, type text not null, status text not null,
	species text not null, name text, breed_codes text, colours text, pattern text, size text, sex text, has_chip integer,
	event_at text not null, area_lat real not null, area_lng real not null, area_radius_m integer not null,
	municipality_slug text, region_slug text, thumb_url text, thumb_path text, thumb_bytes integer default 0,
	boosted integer default 0, updated_at text not null, synced_at integer not null);
create index reports_cache_geo on reports_cache (area_lat, area_lng);
create index reports_cache_synced on reports_cache (synced_at);
create table cache_areas (id text primary key check (id in ('home','current')), lat real not null, lng real not null,
	radius_km real not null, since text, last_sync_at integer);
create table geofences (region_id text primary key, short_code text, lat real not null,
	lng real not null, radius_m integer not null, registered_at integer not null);
create table geofence_events (report_id text not null, area_key text not null, fired_at integer not null,
	primary key (report_id, area_key));
`;
