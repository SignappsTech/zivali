import { type Href, useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { MapTrifoldIcon } from 'phosphor-react-native/src/icons/MapTrifold';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { UserCircleIcon } from 'phosphor-react-native/src/icons/UserCircle';
import * as React from 'react';
import { Keyboard, Pressable, type StyleProp, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { MenuRow } from '@/components/shell/parts';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { statusIcons, type Status } from '@/components/ui/status-label';
import { NavLabel } from '@/lib/font-scale';
import { cn } from '@/lib/utils';

const TABS: Record<string, { label: 'tab_map' | 'tab_inbox' | 'tab_profile'; icon: PhosphorIcon }> = {
	index: { label: 'tab_map', icon: MapTrifoldIcon },
	inbox: { label: 'tab_inbox', icon: ChatCircleIcon },
	profile: { label: 'tab_profile', icon: UserCircleIcon },
};

// Flow routes come with their stories (P6 TASK-29, P7 TASK-30); P7 serves found and sighted, told apart by `type`.
const REPORTS: { type: Exclude<Status, 'reunited'>; href: Href; color: string }[] = [
	{ type: 'lost', href: '/report/lost' as Href, color: 'text-status-lost-subtle-foreground' },
	{ type: 'found', href: '/report/found' as Href, color: 'text-status-found-subtle-foreground' },
	{ type: 'sighted', href: '/report/found?type=sighted' as Href, color: 'text-status-sighted-subtle-foreground' },
];

/** Lost, found, sighted: status icon, title, one-line description and a caret (P2 Report sheet). */
export function ReportChoices({ onChoose, rowClassName }: { onChoose?: () => void; rowClassName?: string }) {
	const t = useTranslations('nav');
	const router = useRouter();
	return (
		<View className="gap-3 pt-5">
			{REPORTS.map(({ type, href, color }) => (
				<MenuRow
					key={type}
					className={rowClassName}
					icon={<Icon as={statusIcons[type]} weight="fill" size={24} className={color} />}
					title={t(`report_${type}_title`)}
					description={t(`report_${type}_desc`)}
					onPress={() => {
						onChoose?.();
						router.push(href);
					}}
				/>
			))}
		</View>
	);
}

/** One bottom-navigation item: icon above the label, at least 44 px, with the focus ring for keyboard and D-pad. */
function NavItem({
	style,
	onFocus,
	onBlur,
	...props
}: Omit<React.ComponentProps<typeof Pressable>, 'style'> & { style?: StyleProp<ViewStyle> }) {
	const focus = useFocusRing(onFocus, onBlur);
	return (
		<Pressable
			className="min-h-11 flex-1 items-center gap-[3px] rounded-row"
			style={[focus.ringStyle, style]}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			{...props}
		/>
	);
}

function useKeyboardShown() {
	const [shown, setShown] = React.useState(false);
	React.useEffect(() => {
		const show = Keyboard.addListener('keyboardDidShow', () => setShown(true));
		const hide = Keyboard.addListener('keyboardDidHide', () => setShown(false));
		return () => {
			show.remove();
			hide.remove();
		};
	}, []);
	return shown;
}

/**
 * Bottom navigation (system §10.7, P2): card, no top border, four items on one label baseline: Zemljevid, Sporočila,
 * the Prijavi action (a 48 px primary circle that opens the Report sheet, announced as a button) and Profil. Icon 26,
 * label 13/16 bold capped at 1.3x; active = primary and the fill icon. Hidden while the keyboard is open.
 */
export function TabBar({ state, navigation }: Pick<BottomTabBarProps, 'state' | 'navigation'>) {
	const t = useTranslations('nav');
	const insets = useSafeAreaInsets();
	const [reportOpen, setReportOpen] = React.useState(false);
	const keyboardShown = useKeyboardShown();
	if (keyboardShown) return null;

	return (
		<View
			role="tablist"
			className="min-h-[68px] flex-row items-end bg-card px-2"
			style={{ paddingBottom: Math.max(insets.bottom, 8) }}
		>
			{state.routes.map((route, index) => {
				if (route.name === 'report') {
					return (
						<Sheet key={route.key} open={reportOpen} onOpenChange={setReportOpen}>
							<SheetTrigger asChild>
								<NavItem aria-label={t('tab_report_a11y')}>
									<View className="size-12 items-center justify-center rounded-full bg-primary">
										<Icon as={PlusIcon} size={24} className="text-primary-foreground" />
									</View>
									<NavLabel className="font-sans-bold text-[13px] leading-4 text-foreground">
										{t('tab_report')}
									</NavLabel>
								</NavItem>
							</SheetTrigger>
							<SheetContent closeLabel={t('sheet_close')}>
								<SheetTitle>{t('report_menu_title')}</SheetTitle>
								<ReportChoices rowClassName="bg-background" onChoose={() => setReportOpen(false)} />
							</SheetContent>
						</Sheet>
					);
				}
				const tab = TABS[route.name];
				if (!tab) return null;
				const focused = state.index === index;
				return (
					<NavItem
						key={route.key}
						role="tab"
						aria-selected={focused}
						aria-label={t(tab.label)}
						onPress={() => {
							const event = navigation.emit({
								type: 'tabPress',
								target: route.key,
								canPreventDefault: true,
							});
							if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
						}}
					>
						<Icon
							as={tab.icon}
							size={26}
							weight={focused ? 'fill' : 'regular'}
							className={focused ? 'text-primary' : 'text-muted-foreground'}
						/>
						<NavLabel
							className={cn(
								'font-sans-bold text-[13px] leading-4',
								focused ? 'text-primary' : 'text-muted-foreground'
							)}
						>
							{t(tab.label)}
						</NavLabel>
					</NavItem>
				);
			})}
		</View>
	);
}
