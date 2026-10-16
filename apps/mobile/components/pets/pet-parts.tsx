import { type Href, useRouter } from 'expo-router';
import { ArchiveIcon } from 'phosphor-react-native/src/icons/Archive';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { PawPrintIcon } from 'phosphor-react-native/src/icons/PawPrint';
import * as React from 'react';
import { Image, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';

import type { Pet } from '@zivali/types';
import { CheckoutSheet } from '@/components/payments/checkout';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * Active pets a free account keeps (C4 app_config `pets.free_limit`, lead decision: 2). Every account is free until
 * Premium entitlements exist (M4); the API's CONFLICT `PET_LIMIT` stays the source of truth.
 */
export const FREE_LIMIT = 2;

/** "Pes · Beagle" (species alone without a breed). */
export function usePetMeta() {
	const t = useTranslations('pets');
	const ta = useTranslations('attributes');
	const tb = useTranslations('breeds');
	return (pet: Pick<Pet, 'species' | 'breed_codes'>) => {
		const species = ta(`species.${pet.species}`);
		const breed = pet.breed_codes[0];
		return breed ? t('row_meta', { species, breed: tb(breed) }) : species;
	};
}

/** Archived pets stay listed (they no longer count to the limit); the word says so (icon 16 + 14 bold, muted). */
export function ArchivedLabel({ className }: { className?: string }) {
	const t = useTranslations('pets');
	return (
		<View accessible className={cn('flex-row items-center gap-[5px]', className)}>
			<Icon as={ArchiveIcon} size={16} className="text-muted-foreground" />
			<Text className="font-sans-bold text-sm text-muted-foreground">{t('archived_label')}</Text>
		</View>
	);
}

/** A pet's photo (private, a 10-minute presigned thumb), or a paw on `muted` while it has none. */
export function PetPhoto({ pet, alt, className }: { pet: Pet; alt: string; className: string }) {
	const uri = pet.photos[0]?.thumb_url;
	if (!uri)
		return (
			<View aria-hidden className={cn('items-center justify-center bg-muted', className)}>
				<Icon as={PawPrintIcon} size={28} className="text-muted-foreground" />
			</View>
		);
	return <Image source={{ uri }} alt={alt} resizeMode="cover" className={cn('bg-muted', className)} />;
}

/**
 * P8 limit note: quiet, never a modal. With `actions` (adding a pet over the limit) it offers Premium, which opens web
 * checkout in the in-app browser (A-014, no native purchase UI), and reporting a lost pet with inline details.
 */
export function LimitNote({ actions, className }: { actions?: boolean; className?: string }) {
	const t = useTranslations('pets');
	const locale = useLocale();
	const router = useRouter();
	const [paying, setPaying] = React.useState(false);
	return (
		<>
			<View
				role="status"
				aria-live="polite"
				className={cn('flex-row gap-3 rounded-row bg-muted px-[18px] py-4', className)}
			>
				<Icon as={InfoIcon} size={22} className="mt-0.5" />
				<View className="min-w-0 flex-1 items-start">
					<Text className="text-control leading-[22px]">
						{t('limit_note_premium', { limit: FREE_LIMIT })}
					</Text>
					{actions ? (
						<>
							<Button variant="text" className="-ml-3 mt-1" onPress={() => setPaying(true)}>
								{t('premium_action')}
							</Button>
							<Button
								variant="text"
								className="-ml-3"
								onPress={() => router.push('/report/lost' as Href)}
							>
								{t('report_without_profile')}
							</Button>
						</>
					) : null}
				</View>
			</View>
			<CheckoutSheet
				open={paying}
				onOpenChange={setPaying}
				checkout={{ purpose: 'subscription', returnTo: locale === 'en' ? '/en/my-pets' : '/moje-zivali' }}
			/>
		</>
	);
}
