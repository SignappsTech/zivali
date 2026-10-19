'use client';

import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { flattenPages } from '@zivali/api/pagination';
import { useListAdminLeadsInfiniteQuery } from '@zivali/api/partners';
import { formatDate } from '@zivali/i18n/format';
import type { AdminLead } from '@zivali/types';
import { cn } from '@/lib/utils';

import { Paging, Region, tableClass } from './audit-log';
import { adminH1Class, Drawer, tdClass, thClass } from './directory/parts';

const rowLinkClass =
	'inline-flex min-h-11 cursor-pointer items-center rounded-sm text-left font-bold hover:underline hover:decoration-2 hover:underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';

const INTEREST = { ad: 'leads_type_ad', vet_partner: 'leads_type_vet', unsure: 'leads_type_unsure' } as const;

/**
 * P19 Enquiries (TASK-34.10, admins, aal2): the partner leads of GET /v1/admin/leads (C14), newest first, read only.
 * A row opens the drawer with the message and the consent record. Contact data stays on screen: no export, no
 * logging, nothing in the URL. `regions` are the region names by slug in the page's language.
 */
export function Enquiries({ regions }: { regions: Record<string, string> }) {
	const t = useTranslations('admin');
	const tPartners = useTranslations('partners');
	const locale = useLocale();
	const query = useListAdminLeadsInfiniteQuery();
	const leads = flattenPages(query.data);
	// The shown lead outlives `open`, so the drawer keeps its content while it closes.
	const [shown, setShown] = React.useState<AdminLead | null>(null);
	const [open, setOpen] = React.useState(false);
	// The drawer has no Radix trigger, so focus goes back to the row by hand when it closes (§10.9).
	const rowButton = React.useRef<HTMLButtonElement | null>(null);
	const openChange = (next: boolean) => {
		setOpen(next);
		if (!next) requestAnimationFrame(() => rowButton.current?.focus());
	};

	const time = (iso: string) => `${formatDate(iso, locale)} ${formatDate(iso, locale, 'time')}`;
	const region = (lead: AdminLead) =>
		lead.region_interest ? (regions[lead.region_interest] ?? lead.region_interest) : tPartners('form_region_all');
	const opener = (lead: AdminLead) => (
		<button
			type="button"
			className={rowLinkClass}
			onClick={(event) => {
				rowButton.current = event.currentTarget;
				setShown(lead);
				setOpen(true);
			}}
		>
			{lead.company}
		</button>
	);

	return (
		<>
			<h1 className={adminH1Class}>{t('leads_title')}</h1>
			<div>
				<Region
					query={query}
					empty={
						leads.length === 0 && (
							<p
								role="status"
								className="rounded-card bg-card px-4 py-10 text-center font-display text-xl font-semibold"
							>
								{t('empty')}
							</p>
						)
					}
				>
					<div className="rounded-card bg-card px-4 pt-1 pb-2 text-card-foreground">
						<table className={tableClass}>
							<caption className="sr-only">{t('leads_title')}</caption>
							<thead>
								<tr>
									<th scope="col" aria-sort="descending" className={cn(thClass, 'text-foreground')}>
										{t('leads_received')}
									</th>
									<th scope="col" className={thClass}>
										{t('leads_company')}
									</th>
									<th scope="col" className={thClass}>
										{t('leads_contact')}
									</th>
									<th scope="col" className={thClass}>
										{t('leads_email')}
									</th>
									<th scope="col" className={thClass}>
										{t('leads_region')}
									</th>
									<th scope="col" className={thClass}>
										{t('leads_consent_time')}
									</th>
								</tr>
							</thead>
							<tbody>
								{leads.map((lead) => (
									<tr
										key={lead.id}
										className="transition-colors hover:bg-accent/60 motion-reduce:transition-none"
									>
										<td
											className={cn(
												tdClass,
												'whitespace-nowrap text-muted-foreground tabular-nums'
											)}
										>
											{time(lead.created_at)}
										</td>
										<td className={tdClass}>{opener(lead)}</td>
										<td className={tdClass}>{lead.contact_name}</td>
										<td className={cn(tdClass, 'break-all')}>{lead.email}</td>
										<td className={tdClass}>{region(lead)}</td>
										<td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
											{time(lead.consent_at)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
						<ul aria-label={t('leads_title')} className="lg:hidden [&>li:last-child]:border-b-0">
							{leads.map((lead) => (
								<li key={lead.id} className="border-b border-border py-2">
									{opener(lead)}
									<p className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
										<span className="tabular-nums">{time(lead.created_at)}</span>
										<span>{lead.contact_name}</span>
										<span className="break-all">{lead.email}</span>
										<span>{region(lead)}</span>
									</p>
								</li>
							))}
						</ul>
					</div>
					<Paging query={query} />
				</Region>
			</div>
			<Drawer open={open} onOpenChange={openChange} title={shown?.company}>
				{shown && (
					<>
						<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
							{[
								[t('leads_contact'), shown.contact_name],
								[t('leads_email'), shown.email],
								[t('leads_phone'), shown.phone],
								[t('leads_region'), region(shown)],
								[t('leads_type'), t(INTEREST[shown.interest])],
								[t('leads_received'), time(shown.created_at)],
							].map(
								([label, value]) =>
									value && (
										<React.Fragment key={label}>
											<dt className="text-muted-foreground">{label}</dt>
											<dd className="break-words">{value}</dd>
										</React.Fragment>
									)
							)}
						</dl>
						<h3 className="mt-6 font-bold">{t('leads_message')}</h3>
						<p className="mt-1 break-words whitespace-pre-line">{shown.message}</p>
						<p className="mt-6 text-sm text-muted-foreground tabular-nums">
							{t('leads_consent', { date: time(shown.consent_at) })}
						</p>
					</>
				)}
			</Drawer>
		</>
	);
}
