// Prisma access for nearby alerts (C10). center_point and the report points are geography columns, so they are
// written and read with parameterised $queryRaw only. Matching uses the report's public_point, never exact_point
// (CH-148): a subscriber moving their centre around learns nothing finer than the public circle.
import { Prisma } from '../../generated/client.ts';
import { prisma } from '../../prisma/prisma.ts';

export type SubscriptionRow = {
	lat: number;
	lng: number;
	radius_km: number;
	species: string[];
	paused: boolean;
	daily_cap: number;
	created_at: Date;
	updated_at: Date;
};

export type SubscriptionFields = {
	center: { lat: number; lng: number };
	radius_km: number;
	species: string[];
	paused: boolean;
};

/** What the fan-out and the notify.send gate need of a report; area_name from the public municipality (C6). */
export type AlertReport = {
	id: string;
	short_code: string;
	type: string;
	status: string;
	moderation_state: string;
	species: string;
	area_name: string | null;
	created_at: Date;
};

export type Recipient = { user_id: string; distance_m: number };

/** The largest radius_km (check constraint): a constant bound lets the GiST index on center_point prefilter. */
const MAX_RADIUS_M = 25_000;

export async function getSubscription(user_id: string, tx?: Prisma.TransactionClient): Promise<SubscriptionRow | null> {
	const db = tx ?? prisma;
	const [row] = await db.$queryRaw<SubscriptionRow[]>`
		select extensions.st_y(center_point::extensions.geometry) as lat,
			extensions.st_x(center_point::extensions.geometry) as lng,
			radius_km, species::text[] as species, paused, daily_cap, created_at, updated_at
		from app.alert_subscriptions where user_id = ${user_id}::uuid`;
	return row ?? null;
}

/** Only ever called with a centre already coarsened by the domain (C6 §Storage). */
export async function upsertSubscription(
	user_id: string,
	fields: SubscriptionFields,
	tx?: Prisma.TransactionClient
): Promise<void> {
	const db = tx ?? prisma;
	const { center, radius_km, species, paused } = fields;
	await db.$executeRaw`
		insert into app.alert_subscriptions (id, user_id, center_point, radius_km, species, paused, updated_at)
		values (gen_random_uuid(), ${user_id}::uuid,
			extensions.st_setsrid(extensions.st_makepoint(${center.lng}, ${center.lat}), 4326)::extensions.geography,
			${radius_km}, ${species}::text[], ${paused}, now())
		on conflict (user_id) do update set center_point = excluded.center_point, radius_km = excluded.radius_km,
			species = excluded.species, paused = excluded.paused, updated_at = now()`;
}

export async function deleteSubscription(user_id: string, tx?: Prisma.TransactionClient): Promise<void> {
	const db = tx ?? prisma;
	await db.alert_subscriptions.deleteMany({ where: { user_id } });
}

export async function hasActiveSubscription(user_id: string, tx?: Prisma.TransactionClient): Promise<boolean> {
	const db = tx ?? prisma;
	return (await db.alert_subscriptions.count({ where: { user_id, paused: false } })) > 0;
}

export async function getAlertReport(
	key: { id: string } | { short_code: string },
	tx?: Prisma.TransactionClient
): Promise<AlertReport | null> {
	const db = tx ?? prisma;
	const where = 'id' in key ? Prisma.sql`r.id = ${key.id}::uuid` : Prisma.sql`r.short_code = ${key.short_code}`;
	const [row] = await db.$queryRaw<AlertReport[]>`
		select r.id::text as id, r.short_code, r.type::text as type, r.status::text as status,
			r.moderation_state::text as moderation_state, r.species::text as species, m.name_sl as area_name, r.created_at
		from app.reports r left join app.municipalities m on m.id = r.municipality_id
		where ${where}`;
	return row ?? null;
}

/**
 * Up to `limit` subscribers whose circle covers the report's public point (C10): not paused, species match, not a
 * manager of the report, no alert for it yet and under their daily cap (alerts in the last 24 h).
 */
export async function findRecipients(report_id: string, limit: number, tx?: Prisma.TransactionClient) {
	const db = tx ?? prisma;
	return db.$queryRaw<Recipient[]>`
		select s.user_id::text as user_id, extensions.st_distance(s.center_point, r.public_point) as distance_m
		from app.reports r
		join app.alert_subscriptions s
			on extensions.st_dwithin(s.center_point, r.public_point, ${MAX_RADIUS_M})
			and extensions.st_dwithin(s.center_point, r.public_point, s.radius_km * 1000)
		where r.id = ${report_id}::uuid
			and not s.paused
			and r.species::text = any(s.species::text[])
			and not exists (select 1 from app.report_managers m where m.report_id = r.id and m.user_id = s.user_id)
			and not exists (select 1 from app.alert_deliveries d where d.report_id = r.id and d.user_id = s.user_id)
			and (select count(*) from app.alert_deliveries d
				where d.user_id = s.user_id and d.sent_at > now() - interval '24 hours') < s.daily_cap
		order by s.user_id
		limit ${limit}`;
}

/** One row per report and user (the pk keeps it at one alert); returns the users newly recorded. */
export async function insertDeliveries(
	report_id: string,
	user_ids: string[],
	tx?: Prisma.TransactionClient
): Promise<string[]> {
	const db = tx ?? prisma;
	const rows = await db.$queryRaw<{ user_id: string }[]>`
		insert into app.alert_deliveries (report_id, user_id, channel)
		select ${report_id}::uuid, u, 'push' from unnest(${user_ids}::uuid[]) as u
		on conflict do nothing
		returning user_id::text as user_id`;
	return rows.map((row) => row.user_id);
}

export default {
	getSubscription,
	upsertSubscription,
	deleteSubscription,
	hasActiveSubscription,
	getAlertReport,
	findRecipients,
	insertDeliveries,
};
