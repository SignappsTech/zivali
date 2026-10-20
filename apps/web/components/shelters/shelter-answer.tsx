'use client';

import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { SealQuestionIcon } from '@phosphor-icons/react/dist/ssr/SealQuestion';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';

import type { Locale } from '@zivali/api/client';
import { type MunicipalityRef, toResult, useGetResponsibleShelterQuery } from '@zivali/api/directory';
import { geocodeApi } from '@zivali/api/geocode';
import { formatCount } from '@zivali/i18n/format';
import type { LatLng } from '@zivali/types';
import { answerClass, AnswerSkeleton, errorCode, type ShelterFlow } from '@/components/shelters/shelter-search';
import { noteClass, titleLinkClass } from '@/components/shelters/classes';
import { StoreProvider } from '@/components/store-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { getStore } from '@/lib/store';
import { cn } from '@/lib/utils';

/** The answer under the T5 search with its store: ShelterSearch loads it with the first chosen municipality. */
export function ShelterAnswer({ municipality, flow }: { municipality: MunicipalityRef; flow: ShelterFlow }) {
	return (
		<StoreProvider>
			<Answer municipality={municipality} flow={flow} />
		</StoreProvider>
	);
}

/**
 * "Uporabi mojo lokacijo": the municipality slug at a point, from the C6 reverse lookup on the shared store (so it
 * loads with this chunk, not the page); null outside Slovenia. Not subscribed, so the point leaves the cache again.
 */
export async function municipalityAt(locale: Locale, point: LatLng): Promise<string | null> {
	const place = await getStore(locale)
		.dispatch(geocodeApi.endpoints.reversePlace.initiate(point, { subscribe: false }))
		.unwrap();
	return place?.municipality_slug ?? null;
}

const shelterHref = (slug: string) => ({ pathname: '/shelters/[slug]', params: { slug } }) as const;

function DetailsLink({ slug, className }: { slug: string; className?: string }) {
	const t = useTranslations('shelters');
	return (
		<Button asChild variant="text" className={className}>
			<Link href={shelterHref(slug)}>
				{t('details_link')}
				<ArrowRightIcon weight="bold" aria-hidden="true" />
			</Link>
		</Button>
	);
}

/**
 * The answer for one municipality (C18 client rule). Only a confirmed shelter gets the primary call button and its
 * number; a likely one is labelled "Ni potrjeno" with a secondary call; otherwise no phone at all, only the nearest.
 */
function Answer({ municipality, flow }: { municipality: MunicipalityRef; flow: ShelterFlow }) {
	const t = useTranslations('shelters');
	const tc = useTranslations('common');
	const locale = useLocale();
	const { currentData, error, isError, isFetching, refetch } = useGetResponsibleShelterQuery({
		municipality: municipality.slug,
	});
	const result = toResult(currentData, isError, isFetching);
	const name = result.municipality?.name ?? municipality.name;
	const actionsClass = 'mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 max-lg:grid';
	// A responsible shelter (confirmed or likely) is an answer; otherwise only the nearest or the directory.
	const { status } = result;
	useEffect(() => {
		if (status === 'loading') return;
		if (status === 'error') flow.error('search', errorCode(error));
		else
			flow.step(status === 'confirmed' || status === 'likely' ? 'answer' : 'no_answer', {
				municipality: municipality.slug,
			});
	}, [status, error, municipality.slug, flow]);
	const contact = () => flow.step('contact');

	switch (result.status) {
		case 'loading':
			return <AnswerSkeleton />;
		case 'error':
			return (
				<div className={cn(noteClass, answerClass)} role="alert">
					<WarningCircleIcon
						weight="fill"
						aria-hidden="true"
						className="mt-px size-[22px] shrink-0 text-destructive"
					/>
					<div>
						<p>{t('error')}</p>
						<Button variant="text" className="mt-1 -ml-3" onClick={() => refetch()}>
							<ArrowClockwiseIcon weight="bold" aria-hidden="true" />
							{tc('try_again')}
						</Button>
					</div>
				</div>
			);
		case 'confirmed': {
			const { shelter } = result;
			return (
				<Card className={answerClass}>
					<p className="text-sm text-muted-foreground">{t('answer_meta', { municipality: name })}</p>
					<h2 className="mt-1 font-display text-2xl font-bold tracking-[-0.015em] lg:text-3xl">
						<Link href={shelterHref(shelter.slug)} className={titleLinkClass}>
							{shelter.name}
						</Link>
					</h2>
					{shelter.phone && (
						<p className="mt-3 text-xl leading-7 font-bold whitespace-nowrap tabular-nums lg:mt-4 lg:text-2xl lg:leading-8">
							{shelter.phone_display}
						</p>
					)}
					<div className={actionsClass}>
						{shelter.phone && (
							<Button asChild size="lg">
								<a
									href={`tel:${shelter.phone}`}
									aria-label={t('call_a11y', { shelter: shelter.name })}
									onClick={contact}
								>
									<PhoneIcon weight="bold" aria-hidden="true" />
									{t('call')}
								</a>
							</Button>
						)}
						<DetailsLink slug={shelter.slug} />
					</div>
				</Card>
			);
		}
		case 'likely': {
			const { likely_shelter: shelter } = result;
			return (
				<Card className={answerClass}>
					<Badge>
						<SealQuestionIcon weight="bold" aria-hidden="true" />
						{t('not_confirmed')}
					</Badge>
					<h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.015em] lg:text-3xl">
						{t('maybe_responsible')}
					</h2>
					<p className="mt-1 text-lg leading-7">
						<Link href={shelterHref(shelter.slug)} className={titleLinkClass}>
							{shelter.name}
						</Link>
					</p>
					<p className="mt-3 text-sm text-muted-foreground">
						{t('not_confirmed_help', { municipality: name })}
					</p>
					<div className={actionsClass}>
						<Button asChild variant="secondary">
							<a
								href={`tel:${shelter.phone}`}
								aria-label={t('call_unconfirmed_a11y', { shelter: shelter.name })}
								onClick={contact}
							>
								<PhoneIcon weight="bold" aria-hidden="true" />
								{t('call_unconfirmed')}
							</a>
						</Button>
						<DetailsLink slug={shelter.slug} />
					</div>
				</Card>
			);
		}
		default: {
			const nearest = result.status === 'unconfirmed' ? result.nearest : [];
			return (
				<div className={cn(noteClass, answerClass)}>
					<InfoIcon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0 text-primary" />
					<div className="min-w-0 flex-1">
						<p>{t('unconfirmed', { municipality: name })}</p>
						{nearest.length > 0 && (
							<>
								<p className="mt-3 font-bold">{t('nearest_title')}</p>
								<ul className="mt-1">
									{nearest.map((shelter) => (
										<li
											key={shelter.slug}
											className="flex flex-wrap items-baseline justify-between gap-x-4"
										>
											<Link href={shelterHref(shelter.slug)} className={titleLinkClass}>
												{shelter.name}
											</Link>
											<span className="text-sm text-muted-foreground">
												{t('nearest_meta', {
													distance: formatCount(Math.round(shelter.distance_km), locale),
												})}
											</span>
										</li>
									))}
								</ul>
							</>
						)}
						<Button asChild variant="text" className="mt-1 -ml-3">
							<a href="#all">
								{t('unconfirmed_link')}
								<ArrowDownIcon weight="bold" aria-hidden="true" />
							</a>
						</Button>
					</div>
				</div>
			);
		}
	}
}
