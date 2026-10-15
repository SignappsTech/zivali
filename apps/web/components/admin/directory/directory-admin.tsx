'use client';

import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowUpIcon } from '@phosphor-icons/react/dist/ssr/ArrowUp';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretUpDownIcon } from '@phosphor-icons/react/dist/ssr/CaretUpDown';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { useLocale, useTranslations } from 'next-intl';
import { Select as SelectPrimitive } from 'radix-ui';
import * as React from 'react';

import {
	type AdminMunicipality,
	type AdminShelter,
	type DirectoryEntity,
	useListAdminMunicipalitiesQuery,
	useListAdminSheltersQuery,
} from '@zivali/api/directory-admin';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { DeleteDialog } from './delete-dialog';
import { isStale, todayIso } from './format';
import { History } from './history';
import { ImportDialog } from './import-dialog';
import { MunicipalityForm } from './municipality-form';
import {
	CheckedDate,
	ErrorNote,
	type MenuItem,
	noteClass,
	noteIconClass,
	Pill,
	pillClass,
	RowMenu,
	tdClass,
	thClass,
} from './parts';
import { ShelterForm } from './shelter-form';

type Tab = 'shelters' | 'municipalities';
type SortKey = 'name' | 'count' | 'checked' | 'shelter';
type Sort = { key: SortKey; dir: 1 | -1 };
type Panel =
	| { kind: 'shelter'; slug: string | null }
	| { kind: 'municipality'; slug: string }
	| { kind: 'history'; entity: DirectoryEntity; slug: string }
	| { kind: 'delete'; slug: string }
	| { kind: 'import' };

const PAGE = 50;
const fold = (value: string) =>
	value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();

const rowLinkClass =
	'inline-flex min-h-11 cursor-pointer items-center rounded-sm text-left font-bold group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4 hover:underline hover:decoration-2 hover:underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';
const statusClass = 'inline-flex items-center gap-1.5 text-sm font-bold whitespace-nowrap';

/** P19 shelter directory (TASK-89.2): shelters and municipality assignments, edit, history, CSV import, delete. */
export function DirectoryAdmin() {
	const t = useTranslations('admin');
	const tCommon = useTranslations('common');
	const locale = useLocale();
	const shelters = useListAdminSheltersQuery();
	const municipalities = useListAdminMunicipalitiesQuery();
	const today = React.useMemo(() => todayIso(), []);
	const [tab, setTab] = React.useState<Tab>('shelters');
	const [query, setQuery] = React.useState({ shelters: '', municipalities: '' });
	const [stale, setStale] = React.useState(false);
	const [shelterFilter, setShelterFilter] = React.useState('all');
	const [noShelter, setNoShelter] = React.useState(false);
	const [sort, setSort] = React.useState<Record<Tab, Sort>>({
		shelters: { key: 'name', dir: 1 },
		municipalities: { key: 'name', dir: 1 },
	});
	const [limit, setLimit] = React.useState(PAGE);
	const [panel, setPanel] = React.useState<Panel | null>(null);

	const shelterItems = React.useMemo(() => shelters.data?.items ?? [], [shelters.data]);
	const municipalityItems = React.useMemo(() => municipalities.data?.items ?? [], [municipalities.data]);
	const names = React.useMemo(() => new Map(shelterItems.map((s) => [s.slug, s.name])), [shelterItems]);
	const shelterName = React.useCallback((slug: string) => names.get(slug) ?? slug, [names]);
	const counts = React.useMemo(() => {
		const map = new Map<string, number>();
		for (const m of municipalityItems)
			if (m.shelter_slug) map.set(m.shelter_slug, (map.get(m.shelter_slug) ?? 0) + 1);
		return map;
	}, [municipalityItems]);
	const staleCount = [...shelterItems, ...municipalityItems].filter((item) =>
		isStale(item.verified_at, today)
	).length;
	const loading = shelters.isLoading || municipalities.isLoading;
	const failed = shelters.isError || municipalities.isError;
	const filtered = stale || noShelter || shelterFilter !== 'all' || query[tab] !== '';

	const compare = (key: SortKey) => (a: AdminShelter | AdminMunicipality, b: AdminShelter | AdminMunicipality) => {
		if (key === 'count') return (counts.get(a.slug) ?? 0) - (counts.get(b.slug) ?? 0);
		if (key === 'checked') return a.verified_at.localeCompare(b.verified_at);
		if (key === 'shelter') {
			const [x, y] = [a, b].map((m) =>
				'shelter_slug' in m && m.shelter_slug ? shelterName(m.shelter_slug) : '￿'
			);
			return x!.localeCompare(y!, locale);
		}
		return a.name.localeCompare(b.name, locale);
	};
	const visible = <T extends AdminShelter | AdminMunicipality>(items: T[], view: Tab, keep: (item: T) => boolean) => {
		const { key, dir } = sort[view];
		return items
			.filter((item) => fold(item.name).includes(fold(query[view].trim())))
			.filter((item) => !stale || isStale(item.verified_at, today))
			.filter(keep)
			.sort((a, b) => compare(key)(a, b) * dir);
	};
	const shelterRows = visible(shelterItems, 'shelters', () => true);
	const municipalityRows = visible(
		municipalityItems,
		'municipalities',
		(m) => (!noShelter || !m.shelter_slug) && (shelterFilter === 'all' || m.shelter_slug === shelterFilter)
	);

	const clearFilters = () => {
		setQuery({ shelters: '', municipalities: '' });
		setStale(false);
		setNoShelter(false);
		setShelterFilter('all');
	};
	const refetch = () => {
		void shelters.refetch();
		void municipalities.refetch();
	};
	// Focus goes back to the row (or the button that opened the panel) when a drawer or dialog closes (§10.9).
	const opener = React.useRef<HTMLElement | null>(null);
	const open = (next: Panel) => {
		opener.current = document.activeElement as HTMLElement | null;
		setPanel(next);
	};
	const close = () => {
		const slug = panel && 'slug' in panel ? panel.slug : null;
		setPanel(null);
		requestAnimationFrame(() => {
			const rows = slug ? [...document.querySelectorAll<HTMLElement>(`[data-row="${slug}"]`)] : [];
			(rows.find((row) => row.getClientRects().length > 0) ?? opener.current)?.focus();
		});
	};

	const sortHeader = (view: Tab, key: SortKey, label: string, numeric = false) => {
		const active = sort[view].key === key;
		const dir = sort[view].dir;
		const SortIcon = !active ? CaretUpDownIcon : dir === 1 ? ArrowUpIcon : ArrowDownIcon;
		return (
			<th
				scope="col"
				aria-sort={active ? (dir === 1 ? 'ascending' : 'descending') : undefined}
				className={cn(thClass, numeric && 'text-right', active && 'text-foreground')}
			>
				<button
					type="button"
					aria-label={t('sort_by', { column: label })}
					onClick={() =>
						setSort((current) => ({ ...current, [view]: { key, dir: active ? (-dir as 1 | -1) : 1 } }))
					}
					className="-mx-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm px-2 font-bold hover:bg-foreground/10 hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
				>
					{label}
					<SortIcon weight="bold" aria-hidden="true" className="size-4" />
				</button>
			</th>
		);
	};

	const shelterMenu = (s: AdminShelter): MenuItem[] => [
		{
			label: t('directory.action_edit'),
			icon: PencilSimpleIcon,
			onSelect: () => open({ kind: 'shelter', slug: s.slug }),
		},
		{
			label: t('directory.action_history'),
			icon: ClockCounterClockwiseIcon,
			onSelect: () => open({ kind: 'history', entity: 'shelter', slug: s.slug }),
		},
		{
			label: t('directory.action_delete'),
			icon: TrashIcon,
			danger: true,
			onSelect: () => open({ kind: 'delete', slug: s.slug }),
		},
	];
	const municipalityMenu = (m: AdminMunicipality): MenuItem[] => [
		{
			label: t('directory.action_edit'),
			icon: PencilSimpleIcon,
			onSelect: () => open({ kind: 'municipality', slug: m.slug }),
		},
		{
			label: t('directory.action_history'),
			icon: ClockCounterClockwiseIcon,
			onSelect: () => open({ kind: 'history', entity: 'municipality_shelter', slug: m.slug }),
		},
	];
	const status = (m: AdminMunicipality) =>
		m.status === 'CONFIRMED' ? (
			<span className={cn(statusClass, 'text-muted-foreground')}>
				<CheckCircleIcon weight="fill" aria-hidden="true" className="size-4" />
				{t('directory.status_confirmed')}
			</span>
		) : (
			<span className={statusClass}>
				<InfoIcon weight="fill" aria-hidden="true" className="size-4" />
				{t('directory.status_unconfirmed')}
			</span>
		);
	const rowTitle = (name: string, next: Panel & { slug: string }) => (
		<button type="button" data-row={next.slug} className={rowLinkClass} onClick={() => open(next)}>
			{name}
		</button>
	);

	const search = (view: Tab, label: string) => (
		<FormField label={label} className="w-80 max-w-full">
			<div className="relative">
				<MagnifyingGlassIcon
					weight="bold"
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 left-0.5 size-5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					type="search"
					autoComplete="off"
					className="pl-8"
					value={query[view]}
					onChange={(event) => setQuery((current) => ({ ...current, [view]: event.target.value }))}
				/>
			</div>
		</FormField>
	);

	const region = (view: Tab, rows: unknown[], content: React.ReactNode) =>
		failed ? (
			<ErrorNote
				action={
					<Button variant="text" size="sm" className="mt-1 -ml-3" onClick={refetch}>
						{t('retry')}
					</Button>
				}
			>
				{t('error')}
			</ErrorNote>
		) : loading ? (
			<div className="grid gap-4 rounded-card bg-card p-4" aria-busy="true">
				{[0, 1, 2, 3].map((key) => (
					<Skeleton key={key} className="h-6" />
				))}
				<p role="status" className="sr-only">
					{tCommon('loading')}
				</p>
			</div>
		) : rows.length === 0 ? (
			<div className="rounded-card bg-card px-4 py-10 text-center">
				<p role="status" className="font-display text-xl font-semibold">
					{t('empty')}
				</p>
				{filtered && (
					<Button variant="secondary" size="sm" className="mt-4" onClick={clearFilters}>
						{t('filters_clear')}
					</Button>
				)}
			</div>
		) : (
			<div className="rounded-card bg-card px-4 pt-1 pb-2" data-view={view}>
				{content}
			</div>
		);

	const tableClass =
		'w-full border-collapse text-control leading-[22px] max-lg:hidden [&_tbody_tr:last-child>td]:border-b-0';
	const listClass = 'lg:hidden [&>li:last-child]:border-b-0';
	const stackedClass = 'flex items-start gap-2 border-b border-border py-2';
	const metaClass = 'mb-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-muted-foreground';

	const current = panel && 'slug' in panel ? panel.slug : null;
	const panelShelter = shelterItems.find((s) => s.slug === current);
	const panelMunicipality = municipalityItems.find((m) => m.slug === current);

	return (
		<div className="grid gap-10">
			<div>
				<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
					<h1 className="font-display text-3xl leading-9 font-bold tracking-[-0.02em] text-balance">
						{t('directory.title')}
					</h1>
					<div className="flex flex-wrap items-center gap-3">
						<Button variant="secondary" size="sm" onClick={() => open({ kind: 'import' })}>
							<UploadSimpleIcon weight="bold" aria-hidden="true" />
							{t('directory.import')}
						</Button>
						<Button size="sm" onClick={() => open({ kind: 'shelter', slug: null })}>
							<PlusIcon weight="bold" aria-hidden="true" />
							{t('directory.add')}
						</Button>
					</div>
				</div>
				<p className="mt-2 max-w-[62ch] text-muted-foreground">{t('directory.live_note')}</p>
			</div>

			{/* Stale = checked over 12 months ago (P19); the reminder shows whenever there are any. */}
			{staleCount > 0 && (
				<div className={cn(noteClass, 'items-center pr-2')}>
					<ClockIcon weight="fill" aria-hidden="true" className={noteIconClass} />
					<p className="flex-1">
						{t.rich('directory.reminder', {
							count: staleCount,
							b: (chunks) => <b className="tabular-nums">{chunks}</b>,
						})}
					</p>
					<Button
						variant="text"
						size="sm"
						onClick={() => {
							setStale(true);
							setSort((current) => ({ ...current, [tab]: { key: 'checked', dir: 1 } }));
						}}
					>
						{t('directory.reminder_show')}
					</Button>
				</div>
			)}

			<Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="gap-6">
				<TabsList aria-label={t('directory.tablist_label')} className="w-fit max-w-none">
					<TabsTrigger value="shelters" className="min-w-34 flex-none">
						{t('directory.tab_shelters')}
					</TabsTrigger>
					<TabsTrigger value="municipalities" className="min-w-34 flex-none">
						{t('directory.tab_municipalities')}
					</TabsTrigger>
				</TabsList>

				<div className="flex flex-wrap items-end gap-x-6 gap-y-3">
					{search(
						tab,
						t(tab === 'shelters' ? 'directory.search_shelters' : 'directory.search_municipalities')
					)}
					<div role="group" aria-label={t('filters')} className="flex flex-wrap items-center gap-2">
						{tab === 'municipalities' && (
							<>
								<Select value={shelterFilter} onValueChange={setShelterFilter}>
									<SelectPrimitive.Trigger
										aria-label={t('directory.col_shelter')}
										className={pillClass}
									>
										<SelectPrimitive.Value />
										<CaretDownIcon weight="bold" aria-hidden="true" className="size-4" />
									</SelectPrimitive.Trigger>
									<SelectContent>
										<SelectItem value="all">{t('directory.filter_shelter_all')}</SelectItem>
										{shelterItems.map((s) => (
											<SelectItem key={s.slug} value={s.slug}>
												{s.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Pill pressed={noShelter} onPressedChange={setNoShelter}>
									{t('directory.filter_no_shelter')}
								</Pill>
							</>
						)}
						<Pill pressed={stale} onPressedChange={setStale}>
							{t('directory.filter_stale')}
						</Pill>
						{filtered && (
							<Button variant="text" size="sm" onClick={clearFilters}>
								{t('filters_clear')}
							</Button>
						)}
					</div>
				</div>

				<TabsContent value="shelters" className="mt-4">
					{region(
						'shelters',
						shelterRows,
						<>
							<table className={tableClass}>
								<caption className="sr-only">{t('directory.tab_shelters')}</caption>
								<thead>
									<tr>
										{sortHeader('shelters', 'name', t('directory.col_name'))}
										{sortHeader('shelters', 'count', t('directory.col_municipalities'), true)}
										<th scope="col" className={thClass}>
											{t('directory.col_phone')}
										</th>
										{sortHeader('shelters', 'checked', t('directory.col_checked'))}
										<th scope="col" className={thClass}>
											{t('directory.col_source')}
										</th>
										<th scope="col" className={cn(thClass, 'w-13 px-1')}>
											<span className="sr-only">{t('row_actions')}</span>
										</th>
									</tr>
								</thead>
								<tbody>
									{shelterRows.map((s) => (
										<tr key={s.slug} className="group transition-colors hover:bg-accent/60">
											<td className={tdClass}>
												{rowTitle(s.name, { kind: 'shelter', slug: s.slug })}
											</td>
											<td className={cn(tdClass, 'text-right tabular-nums')}>
												{counts.get(s.slug) ?? 0}
											</td>
											<td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
												{s.phone_display}
											</td>
											<td className={tdClass}>
												<CheckedDate date={s.verified_at} today={today} />
											</td>
											<td className={tdClass}>{s.source}</td>
											<td className={cn(tdClass, 'px-1 text-right')}>
												<RowMenu
													label={`${t('row_actions')}: ${s.name}`}
													items={shelterMenu(s)}
												/>
											</td>
										</tr>
									))}
								</tbody>
							</table>
							<ul aria-label={t('directory.tab_shelters')} className={listClass}>
								{shelterRows.map((s) => (
									<li key={s.slug} className={stackedClass}>
										<div className="min-w-0 flex-1 pt-1">
											{rowTitle(s.name, { kind: 'shelter', slug: s.slug })}
											<p className={metaClass}>
												<CheckedDate date={s.verified_at} today={today} />
												<span className="tabular-nums">{s.phone_display}</span>
												<span>
													{t('directory.row_municipalities', { n: counts.get(s.slug) ?? 0 })}
												</span>
												<span>{t('directory.row_source', { source: s.source })}</span>
											</p>
										</div>
										<RowMenu label={`${t('row_actions')}: ${s.name}`} items={shelterMenu(s)} />
									</li>
								))}
							</ul>
						</>
					)}
				</TabsContent>

				<TabsContent value="municipalities" className="mt-4">
					{region(
						'municipalities',
						municipalityRows,
						<>
							<table className={tableClass}>
								<caption className="sr-only">{t('directory.tab_municipalities')}</caption>
								<thead>
									<tr>
										{sortHeader('municipalities', 'name', t('directory.col_municipality'))}
										{sortHeader('municipalities', 'shelter', t('directory.col_shelter'))}
										<th scope="col" className={thClass}>
											{t('directory.col_status')}
										</th>
										{sortHeader('municipalities', 'checked', t('directory.col_checked'))}
										<th scope="col" className={thClass}>
											{t('directory.col_source')}
										</th>
										<th scope="col" className={cn(thClass, 'w-13 px-1')}>
											<span className="sr-only">{t('row_actions')}</span>
										</th>
									</tr>
								</thead>
								<tbody>
									{municipalityRows.slice(0, limit).map((m) => (
										<tr key={m.slug} className="group transition-colors hover:bg-accent/60">
											<td className={tdClass}>
												{rowTitle(m.name, { kind: 'municipality', slug: m.slug })}
											</td>
											<td className={tdClass}>
												{m.shelter_slug ? (
													shelterName(m.shelter_slug)
												) : (
													<span className={statusClass}>
														<InfoIcon weight="fill" aria-hidden="true" className="size-4" />
														{t('directory.status_unconfirmed')}
													</span>
												)}
											</td>
											<td className={tdClass}>{status(m)}</td>
											<td className={tdClass}>
												<CheckedDate date={m.verified_at} today={today} />
											</td>
											<td className={tdClass}>{m.source}</td>
											<td className={cn(tdClass, 'px-1 text-right')}>
												<RowMenu
													label={`${t('row_actions')}: ${m.name}`}
													items={municipalityMenu(m)}
												/>
											</td>
										</tr>
									))}
								</tbody>
							</table>
							<ul aria-label={t('directory.tab_municipalities')} className={listClass}>
								{municipalityRows.slice(0, limit).map((m) => (
									<li key={m.slug} className={stackedClass}>
										<div className="min-w-0 flex-1 pt-1">
											{rowTitle(m.name, { kind: 'municipality', slug: m.slug })}
											<p className={metaClass}>
												{status(m)}
												{m.shelter_slug && <span>{shelterName(m.shelter_slug)}</span>}
												<CheckedDate date={m.verified_at} today={today} />
											</p>
										</div>
										<RowMenu label={`${t('row_actions')}: ${m.name}`} items={municipalityMenu(m)} />
									</li>
								))}
							</ul>
						</>
					)}
					{!loading && !failed && municipalityRows.length > limit && (
						<div className="mt-6 flex justify-center">
							<Button variant="secondary" size="sm" onClick={() => setLimit((n) => n + PAGE)}>
								{t('load_more')}
							</Button>
						</div>
					)}
				</TabsContent>
			</Tabs>

			{panel?.kind === 'shelter' && (panel.slug === null || panelShelter) && (
				<ShelterForm
					key={panelShelter ? `${panelShelter.slug}-${panelShelter.version}` : 'new'}
					shelter={panelShelter ?? null}
					municipalities={municipalityItems}
					shelterName={shelterName}
					today={today}
					onClose={close}
					onRefresh={refetch}
					onHistory={() => setPanel({ kind: 'history', entity: 'shelter', slug: panel.slug! })}
				/>
			)}
			{panel?.kind === 'municipality' && panelMunicipality && (
				<MunicipalityForm
					key={`${panelMunicipality.slug}-${panelMunicipality.version}`}
					municipality={panelMunicipality}
					shelters={shelterItems}
					today={today}
					onClose={close}
					onHistory={() => setPanel({ kind: 'history', entity: 'municipality_shelter', slug: panel.slug })}
				/>
			)}
			{panel?.kind === 'history' && (panel.entity === 'shelter' ? panelShelter : panelMunicipality) && (
				<History
					entity={panel.entity}
					target={(panel.entity === 'shelter' ? panelShelter : panelMunicipality)!}
					shelterName={shelterName}
					onClose={close}
				/>
			)}
			{panel?.kind === 'delete' && panelShelter && (
				<DeleteDialog shelter={panelShelter} assigned={counts.get(panelShelter.slug) ?? 0} onClose={close} />
			)}
			{panel?.kind === 'import' && <ImportDialog shelterName={shelterName} onClose={close} />}
		</div>
	);
}
