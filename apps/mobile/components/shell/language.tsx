import { TranslateIcon } from 'phosphor-react-native/src/icons/Translate';
import * as React from 'react';
import { useTranslations } from 'use-intl';

import { MenuRow } from '@/components/shell/parts';
import { Icon } from '@/components/ui/icon';
import { ChoiceRow, RadioGroup } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from '@/components/ui/sonner';
import { useLocaleSwitch } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Locale } from '@zivali/i18n/format';

const LOCALES: Locale[] = ['sl', 'en'];

/** SL / EN as choice rows, each name in its own language; choosing applies it at once (and saves it to the profile). */
export function LanguageChoice({
	onChoose,
	className,
	rowClassName,
}: {
	onChoose?: () => void;
	className?: string;
	rowClassName?: string;
}) {
	const t = useTranslations();
	const { locale, setLocale } = useLocaleSwitch();
	return (
		<RadioGroup
			value={locale}
			aria-label={t('profile.row_language')}
			className={cn('gap-3', className)}
			onValueChange={async (next) => {
				onChoose?.();
				const { ok } = await setLocale(next as Locale);
				if (!ok) toast.error(t('common.toast_error'));
			}}
		>
			{LOCALES.map((value) => (
				<ChoiceRow key={value} value={value} title={t(`nav.language_${value}_full`)} className={rowClassName} />
			))}
		</RadioGroup>
	);
}

/** The Jezik row with the current language; opens the language sheet (P2 A5). Works signed out. */
export function LanguageRow() {
	const t = useTranslations();
	const { locale } = useLocaleSwitch();
	const [open, setOpen] = React.useState(false);
	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<MenuRow
					icon={<Icon as={TranslateIcon} size={24} />}
					title={t('profile.row_language')}
					description={t(`nav.language_${locale}_full`)}
				/>
			</SheetTrigger>
			<SheetContent closeLabel={t('common.close')}>
				<SheetTitle>{t('profile.row_language')}</SheetTitle>
				<LanguageChoice className="pt-5" rowClassName="bg-background" onChoose={() => setOpen(false)} />
			</SheetContent>
		</Sheet>
	);
}
