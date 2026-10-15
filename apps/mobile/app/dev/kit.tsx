import { Redirect } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { HandHeartIcon } from 'phosphor-react-native/src/icons/HandHeart';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { LinkIcon } from 'phosphor-react-native/src/icons/Link';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MegaphoneIcon } from 'phosphor-react-native/src/icons/Megaphone';
import { RocketLaunchIcon } from 'phosphor-react-native/src/icons/RocketLaunch';
import { SealCheckIcon } from 'phosphor-react-native/src/icons/SealCheck';
import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import { XCircleIcon } from 'phosphor-react-native/src/icons/XCircle';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { type Samples, samples } from '@/components/kit/samples';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, Spinner } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useRingStyle } from '@/components/ui/focus-ring';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input, lineFocused } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ChoiceRow, RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { StatusLabel } from '@/components/ui/status-label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { env } from '@/lib/env';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/utils';

// Static "shown" states, as in the P23 mockup: the ring is drawn without keyboard focus, the field line as if focused.
const noteClass = 'flex-row gap-3 rounded-row bg-muted px-[18px] py-4';

function Section({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
	return (
		<View className="pt-12">
			<Text role="heading" className="font-display text-2xl tracking-[-0.36px]">
				{title}
			</Text>
			<Text className="mt-2 text-muted-foreground">{lede}</Text>
			{children}
		</View>
	);
}

function Sub({ title }: { title: string }) {
	return (
		<Text role="heading" className="mb-5 mt-10 font-display-semibold text-xl tracking-[-0.1px]">
			{title}
		</Text>
	);
}

function Spec({ caption, className, children }: { caption: string; className?: string; children: React.ReactNode }) {
	return (
		<View className={cn('min-w-0', className)}>
			<Text className="mb-3 text-xs text-muted-foreground">{caption}</Text>
			{children}
		</View>
	);
}

/** Specs side by side where they fit, wrapping on a phone. */
function Row({ children, className }: { children: React.ReactNode; className?: string }) {
	return <View className={cn('flex-row flex-wrap items-start gap-x-8 gap-y-7', className)}>{children}</View>;
}

/** Specs stacked one per row, for fields and wide components. */
function Stack({ children, className }: { children: React.ReactNode; className?: string }) {
	return <View className={cn('gap-10', className)}>{children}</View>;
}

type Variant = 'default' | 'secondary' | 'ghost' | 'text' | 'destructive';

function ButtonStates({ variant, label, icon }: { variant: Variant; label: string; icon?: React.ReactNode }) {
	const ring = useRingStyle();
	return (
		<Row>
			<Spec caption="Default">
				<Button variant={variant}>
					{icon}
					{label}
				</Button>
			</Spec>
			<Spec caption="Focus">
				<Button variant={variant} style={ring}>
					{icon}
					{label}
				</Button>
			</Spec>
			<Spec caption="Disabled">
				<Button variant={variant} disabled>
					{icon}
					{label}
				</Button>
			</Spec>
			<Spec caption="Loading">
				<Button variant={variant} loading>
					{icon}
					{label}
				</Button>
			</Spec>
		</Row>
	);
}

function Segmented({ s, focus, disabled }: { s: Samples; focus?: boolean; disabled?: boolean }) {
	const ring = useRingStyle();
	return (
		<Tabs defaultValue="conversations">
			<TabsList>
				<TabsTrigger value="conversations" disabled={disabled} style={focus ? ring : undefined}>
					{s.view_conversations}
				</TabsTrigger>
				<TabsTrigger value="notifications" disabled={disabled}>
					{s.view_notifications}
				</TabsTrigger>
			</TabsList>
			{['conversations', 'notifications'].map((value) => (
				<TabsContent key={value} value={value} className="max-w-[280px] gap-2 p-1">
					<Skeleton className="h-4" />
					<Skeleton className="h-4 w-2/3" />
				</TabsContent>
			))}
		</Tabs>
	);
}

function ReportRows({
	s,
	focusLast,
	disableLast,
	onSheet,
}: {
	s: Samples;
	focusLast?: boolean;
	disableLast?: boolean;
	onSheet?: boolean;
}) {
	const ring = useRingStyle();
	// On a card sheet the rows take the background surface (§10.4).
	const row = onSheet ? 'bg-background' : undefined;
	return (
		<RadioGroup aria-label={s.report_menu_title} defaultValue="found" className="gap-3">
			<ChoiceRow
				value="lost"
				className={row}
				icon={
					<Icon as={MegaphoneIcon} weight="fill" size={24} className="text-status-lost-subtle-foreground" />
				}
				title={s.report_lost_title}
				description={s.report_lost_desc}
			/>
			<ChoiceRow
				value="found"
				className={row}
				icon={
					<Icon as={HandHeartIcon} weight="fill" size={24} className="text-status-found-subtle-foreground" />
				}
				title={s.report_found_title}
				description={s.report_found_desc}
			/>
			<ChoiceRow
				value="sighted"
				className={row}
				icon={<Icon as={EyeIcon} weight="fill" size={24} className="text-status-sighted-subtle-foreground" />}
				title={s.report_sighted_title}
				description={s.report_sighted_desc}
				disabled={disableLast}
				style={focusLast ? ring : undefined}
			/>
		</RadioGroup>
	);
}

function SearchField({ s, loading }: { s: Samples; loading?: boolean }) {
	const [query, setQuery] = React.useState(s.search_value);
	return (
		<FormField label={s.search_label}>
			<View>
				<Input
					autoComplete="off"
					placeholder={s.search_placeholder}
					value={query}
					onChangeText={setQuery}
					className={cn('pl-[34px] pr-12', loading && lineFocused)}
				/>
				<View className="pointer-events-none absolute inset-y-0 left-0.5 justify-center">
					<Icon as={MagnifyingGlassIcon} size={22} className="text-muted-foreground" />
				</View>
				<View className="absolute inset-y-0 right-0 justify-center">
					{loading ? (
						// The spinner takes the clear button's place; a polite live region says why.
						<View
							accessible
							aria-label={s.searching}
							aria-live="polite"
							className="size-11 items-center justify-center"
						>
							<Spinner className="text-primary" />
						</View>
					) : query ? (
						<Button variant="ghost" size="icon" aria-label={s.search_clear} onPress={() => setQuery('')}>
							<Icon as={XCircleIcon} />
						</Button>
					) : null}
				</View>
			</View>
		</FormField>
	);
}

function StatusList({ s }: { s: Samples }) {
	return (
		<View className="gap-3">
			<StatusLabel status="lost">{s.status_lost}</StatusLabel>
			<StatusLabel status="found">{s.status_found}</StatusLabel>
			<StatusLabel status="sighted">{s.status_sighted}</StatusLabel>
			<StatusLabel status="reunited">{s.status_reunited}</StatusLabel>
		</View>
	);
}

/** Placeholder spot illustration (flat geometry in tokens) until the image task delivers, as in the P23 mockup. */
function SpotArt() {
	const c = useColors();
	return (
		<Svg viewBox="0 0 320 210" width="100%" height="100%">
			<Rect width="320" height="210" fill={c.accent} />
			<Circle cx="232" cy="70" r="32" fill={c['status-reunited']} />
			<Path d="M0 150 C60 112 120 120 172 140 C222 160 272 150 320 120 V210 H0Z" fill={c.secondary} />
			<Path d="M0 182 C70 146 130 162 190 180 C240 194 290 186 320 170 V210 H0Z" fill={c.primary} />
		</Svg>
	);
}

function InlineError({ s, retrying }: { s: Samples; retrying?: boolean }) {
	return (
		<View role={retrying ? undefined : 'alert'} className={noteClass}>
			<Icon as={WarningCircleIcon} weight="fill" size={22} className="mt-px text-destructive" />
			<View className="shrink">
				<Text className="text-control leading-[22px]">{s.inline_error}</Text>
				<Button variant="text" loading={retrying} className="-ml-3 mt-1 self-start">
					{s.try_again}
				</Button>
			</View>
		</View>
	);
}

function Gallery() {
	const { colorScheme, setColorScheme } = useColorScheme();
	const [lang, setLang] = React.useState<'sl' | 'en'>('sl');
	const ring = useRingStyle();
	const s = samples[lang];
	const dark = colorScheme === 'dark';

	return (
		<>
			<ScrollView contentContainerClassName="px-5 pb-24">
				<View className="flex-row flex-wrap items-center gap-x-6 gap-y-3 py-4">
					<Text className="font-display text-lg">Najdimo UI kit</Text>
					<View role="radiogroup" aria-label="Sample text language" className="flex-row gap-1">
						{(['sl', 'en'] as const).map((code) => (
							<Button
								key={code}
								size="sm"
								variant={code === lang ? 'secondary' : 'ghost'}
								role="radio"
								aria-checked={code === lang}
								onPress={() => setLang(code)}
							>
								{code.toUpperCase()}
							</Button>
						))}
					</View>
					<View role="radiogroup" aria-label="Colour mode" className="flex-row gap-1">
						<Button
							size="sm"
							variant={dark ? 'ghost' : 'secondary'}
							role="radio"
							aria-checked={!dark}
							onPress={() => setColorScheme('light')}
						>
							Light
						</Button>
						<Button
							size="sm"
							variant={dark ? 'secondary' : 'ghost'}
							role="radio"
							aria-checked={dark}
							onPress={() => setColorScheme('dark')}
						>
							Dark
						</Button>
					</View>
				</View>

				<Text role="heading" className="pt-6 font-display text-3xl tracking-[-0.6px]">
					P23 UI kit gallery
				</Text>
				<Text className="mt-4 text-lg text-muted-foreground">
					Every core component of components/ui in its default, focus, disabled, error and loading states,
					with product strings from the P23 content slice. Switch the sample language and the colour mode at
					the top; set the OS text size to 200 % to check that nothing clips.
				</Text>

				<Section
					title="1. Actions"
					lede="Button in five variants, three sizes and its states, and the icon button. Full pill, no border, no shadow, 16 px bold (17 on lg), icon 20 before the label."
				>
					<Sub title="Primary (default)" />
					<ButtonStates variant="default" label={s.primary} />
					<Sub title="Secondary" />
					<ButtonStates variant="secondary" label={s.secondary} />
					<Sub title="Ghost (with icon)" />
					<ButtonStates variant="ghost" label={s.share} icon={<Icon as={ShareNetworkIcon} />} />
					<Sub title="Text" />
					<ButtonStates variant="text" label={s.text} />
					<Sub title="Destructive" />
					<ButtonStates variant="destructive" label={s.destructive} />

					<Sub title="Sizes: sm 44, md 48, lg 56" />
					<Row>
						<Spec caption="sm">
							<Button size="sm">{s.primary}</Button>
						</Spec>
						<Spec caption="md">
							<Button>{s.primary}</Button>
						</Spec>
						<Spec caption="lg">
							<Button size="lg">{s.primary}</Button>
						</Spec>
						<Spec caption="Mobile action stack" className="w-full">
							<View className="gap-1">
								<Button size="lg">{s.primary}</Button>
								<Button variant="text">{s.text}</Button>
							</View>
						</Spec>
					</Row>

					<Sub title="Icon button and disabled with a reason" />
					<Row>
						<Spec caption="Default">
							<Button variant="ghost" size="icon" aria-label={s.close}>
								<Icon as={XIcon} size={24} />
							</Button>
						</Spec>
						<Spec caption="Focus">
							<Button variant="ghost" size="icon" aria-label={s.close} style={ring}>
								<Icon as={XIcon} size={24} />
							</Button>
						</Spec>
						<Spec caption="Disabled">
							<Button variant="ghost" size="icon" aria-label={s.close} disabled>
								<Icon as={XIcon} size={24} />
							</Button>
						</Spec>
						<Spec caption="Loading">
							<Button variant="ghost" size="icon" aria-label={s.close} loading>
								<Icon as={XIcon} size={24} />
							</Button>
						</Spec>
						<Spec caption="Disabled, reason in help text" className="w-full">
							<Button disabled accessibilityHint={s.send_disabled_help} className="self-start">
								{s.send}
							</Button>
							<Text className="mt-2 text-sm text-muted-foreground">{s.send_disabled_help}</Text>
						</Spec>
					</Row>
				</Section>

				<Section
					title="2. Fields"
					lede="FormField: label above, line input with a 2 px underline, help and error below, read with the field. Focus adds 2 px in the ring colour, error is destructive, disabled is dashed."
				>
					<Sub title="Input" />
					<Stack>
						<Spec caption="Default">
							<FormField label={s.chip_label} hint={s.chip_help}>
								<Input inputMode="numeric" autoComplete="off" />
							</FormField>
						</Spec>
						<Spec caption="Focus (typing)">
							<FormField label={s.chip_label} hint={s.chip_help}>
								<Input
									inputMode="numeric"
									autoComplete="off"
									defaultValue="705 1234"
									className={lineFocused}
								/>
							</FormField>
						</Spec>
						<Spec caption="Filled">
							<FormField label={s.chip_label} hint={s.chip_help}>
								<Input inputMode="numeric" autoComplete="off" defaultValue="705 1234 5678 9012" />
							</FormField>
						</Spec>
						<Spec caption="Error">
							<FormField label={s.chip_label} hint={s.chip_help} error={s.chip_warning}>
								<Input inputMode="numeric" autoComplete="off" defaultValue="705 1234 567" />
							</FormField>
						</Spec>
						<Spec caption="Disabled, with reason">
							<FormField label={s.chip_label} hint={s.closed_reason} disabled>
								<Input inputMode="numeric" defaultValue="705 1234 5678 9012" />
							</FormField>
						</Spec>
					</Stack>

					<Sub title="Textarea, select and search" />
					<Stack>
						<Spec caption="Textarea · default">
							<FormField label={s.circumstances_label} hint={s.circumstances_help}>
								<Textarea placeholder={s.circumstances_placeholder} />
							</FormField>
						</Spec>
						<Spec caption="Textarea · focus, filled">
							<FormField label={s.circumstances_label} hint={s.circumstances_help}>
								<Textarea defaultValue={s.circumstances_value} className={lineFocused} />
							</FormField>
						</Spec>
						<Spec caption="Textarea · error">
							<FormField label={s.circumstances_label} error={s.circumstances_too_long}>
								<Textarea defaultValue={s.circumstances_value} />
							</FormField>
						</Spec>
						<Spec caption="Select · default (opens a sheet of choice rows)">
							<FormField label={s.region_label}>
								<Select defaultValue={s.region_all}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent closeLabel={s.close}>
										{[s.region_all, ...s.regions].map((region) => (
											<SelectItem key={region} value={region}>
												{region}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</FormField>
						</Spec>
						<Spec caption="Select · focus, filled">
							<FormField label={s.region_label}>
								<Select defaultValue={s.region_value}>
									<SelectTrigger className={lineFocused}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent closeLabel={s.close}>
										{[s.region_all, ...s.regions].map((region) => (
											<SelectItem key={region} value={region}>
												{region}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</FormField>
						</Spec>
						<Spec caption="Select · disabled, with reason">
							<FormField label={s.region_label} hint={s.closed_reason} disabled>
								<Select defaultValue={s.region_value}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent closeLabel={s.close}>
										<SelectItem value={s.region_value}>{s.region_value}</SelectItem>
									</SelectContent>
								</Select>
							</FormField>
						</Spec>
						<Spec caption="Search · filled, clear button">
							<SearchField s={s} />
							<Text className="mt-3 text-sm text-muted-foreground">{s.search_attribution}</Text>
						</Spec>
						<Spec caption="Search · loading results">
							<SearchField s={s} loading />
						</Spec>
					</Stack>
				</Section>

				<Section
					title="3. Choices"
					lede="Choice row, segmented control, switch, checkbox and radio. Selected is always a fill plus a check, a dot, the thumb position or the raised segment, never colour alone."
				>
					<Sub title="Choice row" />
					<Stack>
						<Spec caption="Unselected · selected · focus">
							<ReportRows s={s} focusLast />
						</Spec>
						<Spec caption="Disabled (last row)">
							<ReportRows s={s} disableLast />
						</Spec>
					</Stack>

					<Sub title="Segmented control (Tabs)" />
					<Stack>
						<Spec caption="Selected · unselected">
							<Segmented s={s} />
						</Spec>
						<Spec caption="Focus">
							<Segmented s={s} focus />
						</Spec>
						<Spec caption="Disabled">
							<Segmented s={s} disabled />
						</Spec>
					</Stack>

					<Sub title="Switch (the row is the target)" />
					<Stack className="gap-6">
						<Spec caption="Off">
							<Switch label={s.alerts_nearby} />
						</Spec>
						<Spec caption="On">
							<Switch label={s.alerts_nearby} defaultChecked />
						</Spec>
						<Spec caption="Focus">
							<Switch label={s.alerts_nearby} defaultChecked style={ring} />
						</Spec>
						<Spec caption="Disabled, with reason">
							<Switch label={s.alerts_nearby} disabled accessibilityHint={s.notifications_denied} />
							<Text className="text-sm text-muted-foreground">{s.notifications_denied}</Text>
						</Spec>
					</Stack>

					<Sub title="Checkbox and radio" />
					<Stack>
						<Spec caption="Checkbox group: checked · focus · disabled with reasons">
							<View role="list" aria-label={s.channels_title}>
								<Text className="mb-1 font-sans-bold text-control">{s.channels_title}</Text>
								<Checkbox label={s.channel_push} defaultChecked style={ring} />
								<Checkbox label={s.channel_email} disabled accessibilityHint={s.email_unverified} />
								<Text className="text-sm text-muted-foreground">{s.email_unverified}</Text>
								<Checkbox
									label={s.channel_inapp}
									defaultChecked
									disabled
									accessibilityHint={s.locked_note}
								/>
								<Text className="text-sm text-muted-foreground">{s.locked_note}</Text>
							</View>
						</Spec>
						<Spec caption="Single checkbox: with help · error">
							<View className="gap-4">
								<View>
									<Checkbox label={s.block_label} accessibilityHint={s.block_help} />
									<Text className="text-sm text-muted-foreground">{s.block_help}</Text>
								</View>
								<View>
									<Checkbox label={s.consent} aria-invalid accessibilityHint={s.consent_error} />
									<FieldError>{s.consent_error}</FieldError>
								</View>
							</View>
						</Spec>
						<Spec caption="Radio: selected · focus">
							<Text className="mb-1 font-sans-bold text-control">{s.reason_label}</Text>
							<RadioGroup aria-label={s.reason_label} defaultValue={s.reasons[0]}>
								{s.reasons.map((reason, index) => (
									<RadioGroupItem
										key={reason}
										value={reason}
										label={reason}
										style={index === 1 ? ring : undefined}
									/>
								))}
							</RadioGroup>
						</Spec>
						<Spec caption="Radio: whole group disabled while sending">
							<Text className="mb-1 font-sans-bold text-control text-muted-foreground">
								{s.reason_label}
							</Text>
							<RadioGroup aria-label={s.reason_label} defaultValue={s.reasons[0]} disabled>
								{s.reasons.map((reason) => (
									<RadioGroupItem key={reason} value={reason} label={reason} />
								))}
							</RadioGroup>
						</Spec>
					</Stack>
				</Section>

				<Section
					title="4. Status"
					lede="Status is always an icon plus a coloured word. Tonal pills for the one main status on a detail page and the premium and verified marks."
				>
					<Sub title="StatusLabel (icon + word)" />
					<Row>
						<Spec caption="On background">
							<StatusList s={s} />
						</Spec>
						<Spec caption="On card">
							<Card>
								<StatusList s={s} />
							</Card>
						</Spec>
						<Spec caption="Counts: Slovenian plural forms, tabular numbers" className="w-full">
							<Text className="text-lg" style={{ fontVariant: ['tabular-nums'] }}>
								{s.counts}
							</Text>
						</Spec>
					</Row>

					<Sub title="Badge (tonal pill)" />
					<Row className="gap-x-3 gap-y-3">
						<Badge variant="lost">
							<Icon as={MegaphoneIcon} weight="fill" size={17} />
							{s.status_lost}
						</Badge>
						<Badge variant="found">
							<Icon as={HandHeartIcon} weight="fill" size={17} />
							{s.status_found}
						</Badge>
						<Badge variant="sighted">
							<Icon as={EyeIcon} weight="fill" size={17} />
							{s.status_sighted}
						</Badge>
						<Badge variant="reunited">
							<Icon as={HeartIcon} weight="fill" size={17} />
							{s.status_reunited}
						</Badge>
						<Badge variant="premium">
							<Icon as={RocketLaunchIcon} weight="fill" size={17} />
							{s.premium}
						</Badge>
						<Badge variant="verified">
							<Icon as={SealCheckIcon} weight="fill" size={17} />
							{s.verified}
						</Badge>
					</Row>
				</Section>

				<Section
					title="5. Surfaces"
					lede="Flat surfaces separated by tone and space: no borders, no shadows, never a card inside a card. Every surface has a skeleton in its final shape."
				>
					<Stack className="mt-10">
						<Spec caption="Card · default">
							<Card>
								<CardTitle>{s.alerts_nearby}</CardTitle>
								<CardContent>
									<Text>{s.empty_body}</Text>
								</CardContent>
								<CardFooter>
									<Button variant="secondary">{s.secondary}</Button>
								</CardFooter>
							</Card>
						</Spec>
						<Spec caption="Card · loading">
							<Card>
								<Skeleton className="h-7 w-52" />
								<Skeleton className="mt-4 h-4" />
								<Skeleton className="mt-2 h-4 w-4/5" />
								<Skeleton className="mt-6 h-12 w-44 rounded-full" />
							</Card>
							<View accessible aria-label={s.loading} aria-live="polite" />
						</Spec>
						<Spec caption="Note (one per view at most)">
							<View className={noteClass}>
								<Icon as={ShieldCheckIcon} size={22} className="mt-px" />
								<Text className="shrink text-control leading-[22px]">{s.safety_note}</Text>
							</View>
						</Spec>
						<Spec caption="Avatar: initials 72 · 48 · 32 · loading">
							<View className="flex-row flex-wrap items-end gap-3">
								<Avatar size={72}>
									<AvatarFallback label={s.avatar_name}>{s.avatar_initials}</AvatarFallback>
								</Avatar>
								<Avatar size={48}>
									<AvatarFallback label={s.avatar_name}>{s.avatar_initials}</AvatarFallback>
								</Avatar>
								<Avatar size={32}>
									<AvatarFallback label={s.avatar_name}>{s.avatar_initials}</AvatarFallback>
								</Avatar>
								<Skeleton className="size-[72px] rounded-full" />
								<Skeleton className="size-12 rounded-full" />
								<Skeleton className="size-8 rounded-full" />
							</View>
						</Spec>
					</Stack>
				</Section>

				<Section
					title="6. Overlays"
					lede="Dialog, bottom sheet, alert dialog and toast, opened for real: popover or card surface, scrim behind modals, screen reader focus moves in and back, Android back closes."
				>
					<Row className="mt-10">
						<Spec caption="Dialog (content dialog, close icon)">
							<Dialog>
								<DialogTrigger asChild>
									<Button variant="secondary">{s.report_menu_title}</Button>
								</DialogTrigger>
								<DialogContent closeLabel={s.close} className="max-w-[600px] p-7">
									<DialogTitle className="pr-10 font-display text-2xl tracking-[-0.36px]">
										{s.report_menu_title}
									</DialogTitle>
									<View className="mt-5">
										<ReportRows s={s} />
									</View>
								</DialogContent>
							</Dialog>
						</Spec>
						<Spec caption="Bottom sheet (grabber = close button)">
							<Sheet>
								<SheetTrigger asChild>
									<Button variant="secondary">{s.report_menu_title}</Button>
								</SheetTrigger>
								<SheetContent closeLabel={s.close}>
									<SheetTitle>{s.report_menu_title}</SheetTitle>
									<View className="mt-5">
										<ReportRows s={s} onSheet />
									</View>
								</SheetContent>
							</Sheet>
						</Spec>
						<Spec caption="Alert dialog (focus starts on cancel)">
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive">{s.destructive}</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogTitle>{s.delete_title}</AlertDialogTitle>
									<AlertDialogDescription>{s.delete_body}</AlertDialogDescription>
									<AlertDialogFooter>
										<AlertDialogAction>{s.destructive}</AlertDialogAction>
										<AlertDialogCancel>{s.cancel}</AlertDialogCancel>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</Spec>
						<Spec caption="Toast (5 s, dismissible, polite)">
							<Button variant="ghost" onPress={() => toast.success(s.link_copied)}>
								<Icon as={LinkIcon} />
								{s.copy_link}
							</Button>
						</Spec>
					</Row>
				</Section>

				<Section
					title="7. Feedback"
					lede="Skeleton, empty state, inline error and progress. Loading keeps the final layout; errors say what happened and offer the next step."
				>
					<Stack className="mt-10">
						<Spec caption="Skeleton: heading and text">
							<Skeleton className="h-9 w-3/4" />
							<Skeleton className="mt-5 h-4" />
							<Skeleton className="mt-2 h-4" />
							<Skeleton className="mt-2 h-4 w-2/3" />
							<View accessible aria-label={s.loading} aria-live="polite" />
						</Spec>
						<Spec caption="Skeleton: field and button row">
							<Skeleton className="h-4 w-40" />
							<Skeleton className="mt-12 h-[2px] rounded-none" />
							<Skeleton className="mt-3 h-4 w-56" />
							<View className="mt-8 flex-row gap-3">
								<Skeleton className="h-12 w-48 rounded-full" />
								<Skeleton className="size-12 rounded-full" />
							</View>
						</Spec>
						<Spec caption="Empty state (placeholder illustration)">
							<EmptyState
								illustration={<SpotArt />}
								title={s.empty_title}
								description={s.empty_body}
								action={<Button variant="secondary">{s.secondary}</Button>}
							/>
						</Spec>
						<Spec caption="Inline error · retrying">
							<View className="gap-6">
								<InlineError s={s} />
								<InlineError s={s} retrying />
							</View>
						</Spec>
						<Spec caption="Progress: uploading · done · failed">
							<View className="gap-7">
								<View>
									<Text className="font-sans-bold text-sm">{s.uploading}</Text>
									<Progress value={40} aria-label={s.progress_a11y} className="mt-2" />
								</View>
								<View>
									<View accessible aria-live="polite" className="flex-row items-center gap-2">
										<Icon as={CheckCircleIcon} weight="fill" size={18} className="text-primary" />
										<Text className="text-sm">{s.uploaded}</Text>
									</View>
									<Progress value={100} aria-label={s.progress_a11y} className="mt-2" />
								</View>
								<View>
									<Progress value={60} error aria-label={s.progress_a11y} />
									<FieldError className="mt-2">{s.upload_failed}</FieldError>
									<Button variant="text" className="-ml-3 self-start">
										{s.try_again}
									</Button>
								</View>
							</View>
						</Spec>
					</Stack>
				</Section>
			</ScrollView>
		</>
	);
}

/**
 * P23 UI kit gallery (TASK-8.3): every components/ui primitive in its states, SL and EN, light and dark. Dev route
 * `/dev/kit`, never in production. The gesture, sheet and toast roots are in the root layout (app/_layout.tsx).
 */
export default function KitScreen() {
	if (env.EXPO_PUBLIC_APP_ENV === 'production') return <Redirect href="/" />;
	return (
		<SafeAreaView className="flex-1 bg-background">
			<Gallery />
		</SafeAreaView>
	);
}
