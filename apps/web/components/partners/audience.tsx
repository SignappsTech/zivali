'use client';

import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { formatCount } from '@zivali/i18n/format';
import type { CountValue, PartnerStats } from '@zivali/types';
import { FormField } from '@/components/ui/form-field';
import { cn } from '@/lib/utils';

import { NativeSelect } from './native-select';

const STATS = [
	['users', 'stat_users'],
	['active_reports', 'stat_reports'],
	['reunions_90d', 'stat_reunions'],
] as const;

/** A masked count reads "< 5" and is announced "manj kot 5"; 0 stays 0 (C14 CountValue). */
function Count({ value }: { value: CountValue }) {
	const t = useTranslations('partners');
	const locale = useLocale();
	if (value !== '<5') return formatCount(value, locale);
	return (
		<>
			<span aria-hidden="true">{t('stat_under5')}</span>
			<span className="sr-only">{t('stat_under5_a11y')}</span>
		</>
	);
}

/**
 * P22 audience numbers with the region filter. The snapshot holds every region, so switching is local: no request,
 * no reload. The numbers are text, in a polite live region so a new region's figures are announced.
 */
export function AudienceStats({
	stats,
	regions,
}: {
	stats: Pick<PartnerStats, 'totals' | 'by_region'>;
	regions: { slug: string; name: string }[];
}) {
	const t = useTranslations('partners');
	const [region, setRegion] = React.useState('');
	const counts = stats.by_region.find(({ region_slug }) => region_slug === region) ?? stats.totals;

	return (
		<>
			<FormField label={t('region_label')} className="lg:max-w-[320px]">
				<NativeSelect name="region" value={region} onChange={(event) => setRegion(event.target.value)}>
					<option value="">{t('region_all')}</option>
					{regions.map(({ slug, name }) => (
						<option key={slug} value={slug}>
							{name}
						</option>
					))}
				</NativeSelect>
			</FormField>
			<dl aria-live="polite" className="m-0 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-3 lg:gap-x-12">
				{STATS.map(([key, label], index) => (
					<div key={key} className={cn('flex flex-col', index === 2 && 'col-span-2 lg:col-span-1')}>
						<dt className="order-2 mt-1">{t(label)}</dt>
						<dd className="order-1 m-0 font-display text-[44px] leading-[48px] font-bold tracking-[-0.02em] tabular-nums lg:text-[56px] lg:leading-[60px]">
							<Count value={counts[key]} />
						</dd>
					</div>
				))}
			</dl>
		</>
	);
}
