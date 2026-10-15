import { Redirect, Stack } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ArrowUUpLeftIcon } from 'phosphor-react-native/src/icons/ArrowUUpLeft';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { FlaskIcon } from 'phosphor-react-native/src/icons/Flask';
import { ReceiptIcon } from 'phosphor-react-native/src/icons/Receipt';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { ScrollView, View } from 'react-native';
import { useLocale, useTranslations } from 'use-intl';

import { useRequireAuth } from '@zivali/api/auth';
import { useListMyPaymentsQuery } from '@zivali/api/payments';
import { formatDate, formatEur } from '@zivali/i18n/format';
import type { Locale, Payment } from '@zivali/types';
import { useErrorText } from '@/components/auth/parts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';

// The M2 purposes (boost and subscriptions come with M4).
const PURPOSES = {
	tip: 'purpose_tip',
	report_contribution: 'purpose_report_contribution',
	support: 'purpose_support',
} as const;

// Settled payments only: an abandoned checkout (pending, canceled) was never a contribution. Icon + word + colour.
const STATUSES = {
	succeeded: {
		label: 'status_paid',
		icon: CheckCircleIcon,
		weight: 'fill',
		iconClass: 'text-primary',
		textClass: '',
	},
	failed: {
		label: 'status_failed',
		icon: WarningCircleIcon,
		weight: 'fill',
		iconClass: 'text-destructive',
		textClass: 'text-destructive',
	},
	refunded: {
		label: 'status_refunded',
		icon: ArrowUUpLeftIcon,
		weight: 'bold',
		iconClass: 'text-muted-foreground',
		textClass: 'text-muted-foreground',
	},
} as const satisfies Record<
	string,
	{ label: string; icon: PhosphorIcon; weight: 'fill' | 'bold'; iconClass: string; textClass: string }
>;

type Shown = Payment & { purpose: keyof typeof PURPOSES; status: keyof typeof STATUSES };
const shown = (payment: Payment): payment is Shown => payment.purpose in PURPOSES && payment.status in STATUSES;

/** P15 My payments (Settings → Plačila): plain list, newest first, no cards or dividers, "Testno" outside production. */
export default function PaymentsSettings() {
	const t = useTranslations('payments');
	const { gate } = useRequireAuth();
	if (gate === 'signin') return <Redirect href="/profile" />;
	return (
		<>
			<Stack.Screen options={{ title: t('list_title') }} />
			{gate === 'loading' ? <View className="flex-1 bg-background" /> : <PaymentsList />}
		</>
	);
}

function PaymentsList() {
	const t = useTranslations();
	const locale = useLocale() as Locale;
	const errorText = useErrorText();
	// One page (C1 keyset): enough for one-off M2 contributions; "load more" comes with subscriptions (M4).
	const { data, error, isLoading, isFetching, refetch } = useListMyPaymentsQuery();
	const payments = data?.items.filter(shown) ?? [];
	const test = env.EXPO_PUBLIC_APP_ENV !== 'production';

	return (
		<ScrollView contentContainerClassName="px-5 pb-8 pt-6">
			{isLoading ? (
				<View accessible aria-label={t('common.loading')} aria-live="polite" className="gap-5">
					{[0, 1, 2].map((row) => (
						<View key={row}>
							<Skeleton className="h-4 w-3/4" />
							<Skeleton className="mt-2 h-4 w-1/3" />
						</View>
					))}
				</View>
			) : error && !data ? (
				<View role="alert" className="flex-row gap-3 rounded-row bg-muted px-[18px] py-4">
					<Icon as={WarningCircleIcon} weight="fill" size={22} className="mt-px text-destructive" />
					<View className="shrink">
						<Text className="text-control leading-[22px]">{errorText(error)}</Text>
						<Button variant="text" loading={isFetching} className="-ml-3 mt-1 self-start" onPress={refetch}>
							{t('common.try_again')}
						</Button>
					</View>
				</View>
			) : payments.length === 0 ? (
				<View className="flex-row gap-3">
					<Icon as={ReceiptIcon} size={22} className="mt-px text-muted-foreground" />
					<Text className="shrink text-muted-foreground">{t('payments.empty')}</Text>
				</View>
			) : (
				<View role="list" className="gap-5">
					{payments.map((payment) => {
						const status = STATUSES[payment.status];
						return (
							<View key={payment.id} role="listitem" accessible>
								<Text className="tabular-nums">
									{t('payments.row', {
										date: formatDate(payment.created_at, locale),
										purpose: t(`payments.${PURPOSES[payment.purpose]}`),
										amount: formatEur(payment.amount_cents, locale),
									})}
								</Text>
								<View className="mt-0.5 flex-row flex-wrap items-center gap-x-3 gap-y-1">
									<View className="flex-row items-center gap-[5px]">
										<Icon
											as={status.icon}
											weight={status.weight}
											size={16}
											className={status.iconClass}
										/>
										<Text className={cn('font-sans-bold text-sm', status.textClass)}>
											{t(`payments.${status.label}`)}
										</Text>
									</View>
									{test ? (
										<View className="flex-row items-center gap-1.5">
											<Icon as={FlaskIcon} size={16} className="text-muted-foreground" />
											<Text className="text-sm text-muted-foreground">
												{t('payments.test_label')}
											</Text>
										</View>
									) : null}
								</View>
							</View>
						);
					})}
				</View>
			)}
		</ScrollView>
	);
}
