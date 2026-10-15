// C18 §Admin (TASK-89): admins edit the responsible-shelter directory; the routes guard admin + aal2. Every write
// bumps the row's version, appends a directory_changes row (the full row after the change, with the admin's note) and
// writes an audit entry, all in one transaction. A shelter is never removed and its slug never changes: the deploy
// seed (05-directory) inserts the slugs it does not find, so it would bring a deleted or renamed shelter back. Every
// shelter has history (its first version), so DELETE always deactivates.
import type { z } from 'zod';

import type {
	CreateShelterInput,
	DirectoryImportResult,
	MunicipalityShelterInput,
	UpdateShelterInput,
} from '@zivali/validation';

import { parseCsv } from '../../lib/csv.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AppError } from '../../lib/errors.ts';
import type { municipality_shelters, Prisma, shelters } from '../../generated/client.ts';
import { prisma } from '../../prisma/prisma.ts';
import { AuditDao } from '../platform/index.ts';
import DirectoryDao from './directory.dao.ts';
import { AssignmentCsvRow, bySlName, ShelterCsvRow, toAssignment } from './directory.domain.ts';

type Tx = Prisma.TransactionClient;
type ShelterInput = z.infer<typeof CreateShelterInput> | z.infer<typeof UpdateShelterInput>;
export type ImportResult = z.infer<typeof DirectoryImportResult>;
type Diff = ImportResult['changes'][number]['diff'];
type Entity = 'shelter' | 'municipality_shelter';

const SHELTER_FIELDS = [
	'name',
	'address',
	'postal_code',
	'city',
	'lat',
	'lng',
	'phone',
	'phone_display',
	'email',
	'website',
	'opening_hours',
	'registry_id',
	'species',
	'source',
	'verified_at',
] as const;
const ASSIGNMENT_FIELDS = ['shelter_slug', 'status', 'source', 'verified_at'] as const;

const actorId = (ctx: Ctx) => ctx.actor?.user_id ?? null;
const inTx = <T>(ctx: Ctx, run: (tx: Tx) => Promise<T>) => (ctx.tx ? run(ctx.tx) : prisma.$transaction(run));
const invalid = (path: string, message: string) => new AppError('VALIDATION', message, undefined, [{ path, message }]);
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** ASCII slug from a name: "Zavetišče Ljubljana" → "zavetisce-ljubljana". */
export function slugify(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/đ/g, 'd')
		.replace(/[^a-z0-9]+/g, '-')
		.slice(0, 100)
		.replace(/^-+|-+$/g, '');
}

// Values compared as JSON with sorted keys (jsonb reorders object keys); dates as YYYY-MM-DD.
const plain = (value: unknown) => (value instanceof Date ? isoDate(value) : (value ?? null));
const canonical = (value: unknown) =>
	JSON.stringify(plain(value), (_key, v: unknown) =>
		v && typeof v === 'object' && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
			: v
	);

/** The fields whose value differs, as { from, to }; `before` null = every set field of a new row. */
function diffOf(
	before: Record<string, unknown> | null,
	after: Record<string, unknown>,
	fields: readonly string[]
): Diff {
	return Object.fromEntries(
		fields.flatMap((field) => {
			const [from, to] = [plain(before?.[field]), plain(after[field])];
			return canonical(from) === canonical(to) ? [] : [[field, { from, to }]];
		})
	);
}

async function addVersion(
	tx: Tx,
	entity: Entity,
	entity_id: string,
	row: { version: number; source: string },
	audit: { actor_id: string | null; note: string | null }
) {
	await DirectoryDao.createChanges(
		[
			{
				entity,
				entity_id,
				version: row.version,
				data: JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue,
				source: row.source,
				actor_id: audit.actor_id,
				audit_note: audit.note,
			},
		],
		tx
	);
}

// --- Lists ---

export async function listShelters(_input: void, ctx: Ctx) {
	return (await DirectoryDao.listAllShelters(ctx.tx)).sort(bySlName);
}

export async function listAssignments(_input: void, ctx: Ctx) {
	return (await DirectoryDao.listAdminAssignments(undefined, ctx.tx)).sort(bySlName);
}

/** The shelter's versions, newest first (inactive shelters too). */
export async function listShelterChanges(slug: string, ctx: Ctx) {
	const shelter = await DirectoryDao.findShelterBySlug(slug, ctx.tx);
	if (!shelter) throw new AppError('NOT_FOUND', 'Unknown shelter');
	return DirectoryDao.listChanges('shelter', shelter.id, ctx.tx);
}

// --- Shelters ---

const shelterData = (input: ShelterInput) => ({
	name: input.name,
	address: input.address,
	postal_code: input.postal_code,
	city: input.city,
	lat: input.lat ?? null,
	lng: input.lng ?? null,
	phone: input.phone,
	phone_display: input.phone_display,
	email: input.email ?? null,
	website: input.website ?? null,
	opening_hours: input.opening_hours,
	source: input.source,
	verified_at: new Date(input.verified_at),
});

/**
 * Makes `slugs` exactly the shelter's CONFIRMED municipalities (with the shelter's source and date). A municipality
 * moved from another shelter is reassigned; one dropped from the list becomes UNCONFIRMED without a shelter.
 */
async function assignMunicipalities(shelter: shelters, slugs: string[], note: string, ctx: Ctx, tx: Tx) {
	const ids = new Map((await DirectoryDao.listMunicipalityIds(tx)).map((m) => [m.slug, m.id]));
	const unknown = slugs.findIndex((slug) => !ids.has(slug));
	if (unknown >= 0) throw invalid(`municipalities.${unknown}`, 'Unknown municipality');
	if (slugs.length && !shelter.active) throw invalid('municipalities', 'An inactive shelter cannot be confirmed');
	const target = new Set(slugs.map((slug) => ids.get(slug)!));
	const current = new Set(await DirectoryDao.listConfirmedMunicipalityIds(shelter.id, tx));
	const added = [...target].filter((id) => !current.has(id));
	const removed = [...current].filter((id) => !target.has(id));
	const fields = { source: shelter.source, verified_at: shelter.verified_at };
	for (const [municipality_id, shelter_id, status] of [
		...added.map((id) => [id, shelter.id, 'CONFIRMED'] as const),
		...removed.map((id) => [id, null, 'UNCONFIRMED'] as const),
	]) {
		const row = await DirectoryDao.saveAssignment({ municipality_id, shelter_id, status, ...fields }, tx);
		await addVersion(tx, 'municipality_shelter', String(municipality_id), row, { actor_id: actorId(ctx), note });
	}
	const slugOf = new Map([...ids].map(([slug, id]) => [id, slug]));
	return { added: added.map((id) => slugOf.get(id)!), removed: removed.map((id) => slugOf.get(id)!) };
}

/** A new active shelter (version 1); the slug comes from the name unless given. Taken slug = VALIDATION. */
export async function createShelter(input: z.infer<typeof CreateShelterInput>, ctx: Ctx): Promise<shelters> {
	const slug = input.slug ?? slugify(input.name);
	if (!slug) throw invalid('slug', 'Cannot derive a slug from the name');
	return inTx(ctx, async (tx) => {
		if (await DirectoryDao.findShelterBySlug(slug, tx)) throw invalid('slug', 'Slug already in use');
		const shelter = await DirectoryDao.createShelter({ ...shelterData(input), slug }, tx);
		const audit = { actor_id: actorId(ctx), note: input.audit_note };
		await addVersion(tx, 'shelter', shelter.id, shelter, audit);
		const municipalities = await assignMunicipalities(shelter, input.municipalities, input.audit_note, ctx, tx);
		await AuditDao.write(tx, {
			actor_id: audit.actor_id,
			action: 'directory.shelter.create',
			target_type: 'shelter',
			target_id: shelter.id,
			diff: { slug, municipalities },
			note: input.audit_note,
		});
		return shelter;
	});
}

/** Replaces the shelter's fields and municipalities when `version` is still current, else CONFLICT. */
export async function updateShelter(
	input: z.infer<typeof UpdateShelterInput> & { slug: string },
	ctx: Ctx
): Promise<shelters> {
	return inTx(ctx, async (tx) => {
		const current = await DirectoryDao.findShelterBySlug(input.slug, tx);
		if (!current) throw new AppError('NOT_FOUND', 'Unknown shelter');
		const shelter = await DirectoryDao.updateShelter(current.id, input.version, shelterData(input), tx);
		if (!shelter) throw new AppError('CONFLICT', 'Changed by someone else', { version: current.version });
		const audit = { actor_id: actorId(ctx), note: input.audit_note };
		await addVersion(tx, 'shelter', shelter.id, shelter, audit);
		const municipalities = await assignMunicipalities(shelter, input.municipalities, input.audit_note, ctx, tx);
		await AuditDao.write(tx, {
			actor_id: audit.actor_id,
			action: 'directory.shelter.update',
			target_type: 'shelter',
			target_id: shelter.id,
			diff: { ...diffOf(current, shelter, SHELTER_FIELDS), municipalities },
			note: input.audit_note,
		});
		return shelter;
	});
}

/** Deactivates the shelter (see the file header); refused while municipalities are confirmed to it. */
export async function deleteShelter(input: { slug: string; audit_note: string }, ctx: Ctx): Promise<void> {
	await inTx(ctx, async (tx) => {
		const current = await DirectoryDao.findShelterBySlug(input.slug, tx);
		if (!current) throw new AppError('NOT_FOUND', 'Unknown shelter');
		const count = current.municipality_shelters.length;
		if (count)
			throw new AppError('CONFLICT', 'Reassign its municipalities first', { code: 'HAS_ASSIGNMENTS', count });
		if (!current.active) return;
		const shelter = (await DirectoryDao.updateShelter(current.id, undefined, { active: false }, tx))!;
		await addVersion(tx, 'shelter', shelter.id, shelter, { actor_id: actorId(ctx), note: input.audit_note });
		await AuditDao.write(tx, {
			actor_id: actorId(ctx),
			action: 'directory.shelter.deactivate',
			target_type: 'shelter',
			target_id: shelter.id,
			diff: { slug: shelter.slug },
			note: input.audit_note,
		});
	});
}

// --- Municipality assignments ---

/** Reassigns one municipality when `version` is still current, else CONFLICT; CONFIRMED needs an active shelter. */
export async function updateAssignment(
	input: z.infer<typeof MunicipalityShelterInput> & { municipality: string },
	ctx: Ctx
) {
	return inTx(ctx, async (tx) => {
		const municipality = await DirectoryDao.findMunicipality({ slug: input.municipality }, tx);
		const current = municipality && (await DirectoryDao.findAssignment(municipality.id, tx));
		if (!municipality || !current) throw new AppError('NOT_FOUND', 'Unknown municipality');
		const shelter =
			input.shelter_slug === null ? null : await DirectoryDao.findShelterBySlug(input.shelter_slug, tx);
		if (input.shelter_slug !== null && !shelter) throw invalid('shelter_slug', 'Unknown shelter');
		if (input.status === 'CONFIRMED' && !shelter?.active)
			throw invalid('shelter_slug', 'An inactive shelter cannot be confirmed');
		const row = await DirectoryDao.updateAssignment(
			municipality.id,
			input.version,
			{
				shelter_id: shelter?.id ?? null,
				status: input.status,
				source: input.source,
				verified_at: new Date(input.verified_at),
			},
			tx
		);
		if (!row) throw new AppError('CONFLICT', 'Changed by someone else', { version: current.version });
		const audit = { actor_id: actorId(ctx), note: input.audit_note };
		await addVersion(tx, 'municipality_shelter', String(municipality.id), row, audit);
		const before = { ...current, shelter_slug: current.shelter?.slug ?? null };
		await AuditDao.write(tx, {
			actor_id: audit.actor_id,
			action: 'directory.assignment.update',
			target_type: 'municipality_shelter',
			target_id: String(municipality.id),
			diff: {
				municipality: municipality.slug,
				...diffOf(before, { ...row, shelter_slug: input.shelter_slug }, ASSIGNMENT_FIELDS),
			},
			note: input.audit_note,
		});
		return (await DirectoryDao.listAdminAssignments(municipality.id, tx))[0]!;
	});
}

// --- CSV import ---

type Write = (tx: Tx, note: string) => Promise<void>;
type Plan = ImportResult & { writes: Write[] };

/** The first failing column of a row. */
const failedField = (error: z.ZodError) => String(error.issues[0]?.path[0] ?? 'row');

/** shelters.csv: rows by slug; a known slug is updated (active stays as it is), a new one created. */
async function planShelters(rows: Record<string, string>[], tx: Tx): Promise<Plan> {
	const plan: Plan = { changes: [], errors: [], writes: [] };
	const existing = new Map((await DirectoryDao.listAllShelters(tx)).map((s) => [s.slug, s]));
	const seen = new Set<string>();
	for (const [i, raw] of rows.entries()) {
		const parsed = ShelterCsvRow.safeParse(raw);
		const field = !parsed.success ? failedField(parsed.error) : seen.has(parsed.data.slug) ? 'slug' : null;
		if (field) {
			plan.errors.push({ row: i + 2, field });
			continue;
		}
		const data = parsed.data!;
		seen.add(data.slug);
		const before = existing.get(data.slug);
		const diff = diffOf(before ?? null, data, SHELTER_FIELDS);
		const action = !before ? 'create' : Object.keys(diff).length ? 'update' : 'none';
		plan.changes.push({ entity: 'shelter', id: data.slug, action, diff });
		if (action === 'none') continue;
		plan.writes.push(async (wtx, note) => {
			const row = before
				? (await DirectoryDao.updateShelter(before.id, undefined, data, wtx))!
				: await DirectoryDao.createShelter(data, wtx);
			await addVersion(wtx, 'shelter', row.id, row, { actor_id: null, note });
		});
	}
	return plan;
}

/** municipality_shelters.csv: rows grouped by municipality and collapsed like the seed (toAssignment). */
async function planAssignments(rows: Record<string, string>[], tx: Tx): Promise<Plan> {
	const plan: Plan = { changes: [], errors: [], writes: [] };
	const shelters = await DirectoryDao.listAllShelters(tx);
	const bySlug = new Map(shelters.map((s) => [s.slug, s]));
	const slugOf = new Map(shelters.map((s) => [s.id, s.slug]));
	const municipalityIds = new Map((await DirectoryDao.listMunicipalityIds(tx)).map((m) => [m.slug, m.id]));
	const current = new Map((await DirectoryDao.listAllAssignments(tx)).map((a) => [a.municipality_id, a]));
	const groups = new Map<string, AssignmentCsvRow[]>();
	const failedReference = (row: AssignmentCsvRow, group: AssignmentCsvRow[] = []) => {
		if (!municipalityIds.has(row.municipality_slug)) return 'municipality_slug';
		if (group.some((r) => r.species === row.species)) return 'species'; // one row per municipality and species
		const shelter = row.shelter_slug ? bySlug.get(row.shelter_slug) : undefined;
		if ((row.shelter_slug && !shelter) || (row.status === 'CONFIRMED' && !shelter?.active)) return 'shelter_slug';
		if (row.suggested_shelter && !bySlug.has(row.suggested_shelter)) return 'suggested_shelter';
		return null;
	};
	for (const [i, raw] of rows.entries()) {
		const parsed = AssignmentCsvRow.safeParse(raw);
		const group = parsed.data && groups.get(parsed.data.municipality_slug);
		const field = parsed.success ? failedReference(parsed.data, group) : failedField(parsed.error);
		if (field) plan.errors.push({ row: i + 2, field });
		else groups.set(parsed.data!.municipality_slug, [...(group ?? []), parsed.data!]);
	}
	const view = (a: Pick<municipality_shelters, 'shelter_id' | 'status' | 'source' | 'verified_at'>) => ({
		...a,
		shelter_slug: a.shelter_id ? (slugOf.get(a.shelter_id) ?? null) : null,
	});
	for (const [slug, group] of groups) {
		const id = municipalityIds.get(slug)!;
		const next = toAssignment(group, id, (s) => bySlug.get(s)!.id);
		const before = current.get(id);
		const diff = diffOf(before ? view(before) : null, view(next as municipality_shelters), ASSIGNMENT_FIELDS);
		const action = !before ? 'create' : Object.keys(diff).length ? 'update' : 'none';
		plan.changes.push({ entity: 'municipality_shelter', id: slug, action, diff });
		if (action === 'none') continue;
		plan.writes.push(async (wtx, note) => {
			const row = await DirectoryDao.saveAssignment({ ...next, municipality_id: id }, wtx);
			await addVersion(wtx, 'municipality_shelter', String(id), row, { actor_id: null, note });
		});
	}
	return plan;
}

/**
 * Imports one seed-format CSV (shelters.csv or municipality_shelters.csv, told apart by the header) and returns the
 * diff. `dry_run` writes nothing; otherwise, when there are no errors, every changed row is versioned (actor_id null,
 * C18) and one audit entry covers the import, all in one transaction. Applying needs `audit_note`.
 */
export async function importDirectory(
	input: { csv: string; dry_run: boolean; audit_note?: string },
	ctx: Ctx
): Promise<ImportResult> {
	const note = input.audit_note;
	if (!input.dry_run && !note) throw invalid('audit_note', 'Required to apply an import');
	const rows = parseCsv(input.csv);
	const header = rows[0] ?? {};
	const entity: Entity | null =
		'municipality_slug' in header ? 'municipality_shelter' : 'slug' in header ? 'shelter' : null;
	if (!entity) return { changes: [], errors: [{ row: 1, field: 'header' }] };
	return inTx(ctx, async (tx) => {
		const { writes, ...result } = await (entity === 'shelter' ? planShelters : planAssignments)(rows, tx);
		if (input.dry_run || result.errors.length) return result;
		for (const write of writes) await write(tx, note!);
		const count = (action: string) => result.changes.filter((c) => c.action === action).length;
		await AuditDao.write(tx, {
			actor_id: actorId(ctx),
			action: 'directory.import',
			target_type: entity,
			diff: { rows: rows.length, created: count('create'), updated: count('update') },
			note,
		});
		return result;
	});
}

// --- Yearly reminder (directory.reminder, 1 April) ---

const escapeHtml = (text: string) =>
	text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Emails every admin with a confirmed address the active shelters and assignments verified more than 12 months ago
 * (FR-044 R-044.3). Nothing stale = no email. Throws (pg-boss retries) only when no email could be sent.
 */
export async function sendReminder(_input: void, ctx: Ctx) {
	const before = new Date(ctx.now);
	before.setUTCFullYear(before.getUTCFullYear() - 1);
	const stale = await DirectoryDao.listStaleEntries(before, ctx.tx);
	const counts = { shelters: stale.shelters.length, municipalities: stale.municipalities.length };
	if (!counts.shelters && !counts.municipalities) {
		ctx.logger.info(counts, 'directory.reminder: nothing older than 12 months');
		return { ...counts, sent: 0 };
	}
	const list = (title: string, items: { name: string; verified_at: Date }[]) =>
		items.length
			? [
					`${title} (${items.length}):`,
					...items.sort(bySlName).map((i) => `- ${i.name}, ${isoDate(i.verified_at)}`),
				]
			: [];
	const lines = [
		'Ti vnosi v imeniku zavetišč niso bili preverjeni več kot 12 mesecev. Preverite jih v skrbniški konzoli ' +
			'(Imenik zavetišč) in posodobite vir ter datum preverjanja.',
		...list('Zavetišča', stale.shelters),
		...list('Občine', stale.municipalities),
	];
	const message = {
		subject: 'Imenik zavetišč: letna osvežitev',
		text: lines.join('\n'),
		html: lines.map((line) => `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`).join(''),
	};
	const admins = await DirectoryDao.listAdminEmails(ctx.tx);
	let sent = 0;
	for (const to of admins) {
		try {
			await ctx.adapters.email.send({ to, ...message });
			sent++;
		} catch (err) {
			ctx.logger.warn({ err }, 'directory.reminder: email failed');
		}
	}
	if (admins.length && !sent) throw new Error('directory.reminder: no email could be sent');
	await AuditDao.write(ctx.tx, {
		actor_id: null,
		action: 'directory.reminder',
		target_type: 'directory',
		diff: { ...counts, admins: admins.length, sent },
	});
	ctx.logger.info({ ...counts, admins: admins.length, sent }, 'directory.reminder sent');
	return { ...counts, sent };
}

export default {
	listShelters,
	listAssignments,
	listShelterChanges,
	createShelter,
	updateShelter,
	deleteShelter,
	updateAssignment,
	importDirectory,
	sendReminder,
};
