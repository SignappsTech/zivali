'use client';

import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { HandHeartIcon } from '@phosphor-icons/react/dist/ssr/HandHeart';
import { HeartIcon } from '@phosphor-icons/react/dist/ssr/Heart';
import { LinkIcon } from '@phosphor-icons/react/dist/ssr/Link';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { RocketLaunchIcon } from '@phosphor-icons/react/dist/ssr/RocketLaunch';
import { SealCheckIcon } from '@phosphor-icons/react/dist/ssr/SealCheck';
import { ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { XCircleIcon } from '@phosphor-icons/react/dist/ssr/XCircle';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import Link from 'next/link';
import * as React from 'react';
import { toast } from 'sonner';

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
import { Button, buttonVariants, Spinner } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FieldError, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ChoiceRow, RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { StatusLabel } from '@/components/ui/status-label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import type { Samples } from './samples';

// Static "shown" states, as in the P23 mockup: the token focus ring and the focused field underline.
const focusRing = 'outline-3 outline-offset-2 outline-ring';
const focusLine = 'border-ring shadow-[0_2px_0_0_hsl(var(--ring))]';
const rowSpecs = 'flex flex-wrap items-start gap-x-8 gap-y-7';
const gridSpecs = 'grid gap-x-8 gap-y-10 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]';
// A label row is the 44 px target of a checkbox, radio or switch (system §10.3).
const checkRow =
	'flex min-h-11 cursor-pointer items-start gap-3 py-2.5 has-[:disabled]:cursor-not-allowed has-[:disabled]:text-muted-foreground';
const switchRow =
	'flex min-h-14 max-w-[360px] cursor-pointer items-center justify-between gap-4 font-bold has-[:disabled]:cursor-not-allowed has-[:disabled]:text-muted-foreground';
const noteClass = 'flex gap-3 rounded-row bg-muted px-[18px] py-4 text-[15px] leading-[22px]';

function Section({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
	return (
		<section className="border-t-0 py-12 lg:py-16">
			<h2
				lang="en"
				className="font-display text-2xl leading-[30px] font-bold tracking-[-0.015em] text-balance lg:text-3xl lg:leading-9"
			>
				{title}
			</h2>
			<p lang="en" className="mt-2 max-w-[74ch] text-muted-foreground">
				{lede}
			</p>
			{children}
		</section>
	);
}

function Sub({ title }: { title: string }) {
	return (
		<h3 lang="en" className="mt-12 mb-5 font-display text-xl leading-7 font-semibold tracking-[-0.005em]">
			{title}
		</h3>
	);
}

function Spec({ caption, className, children }: { caption: string; className?: string; children: React.ReactNode }) {
	return (
		<figure className={cn('m-0 min-w-0', className)}>
			<figcaption lang="en" className="mb-3 text-xs font-normal text-muted-foreground">
				{caption}
			</figcaption>
			{children}
		</figure>
	);
}

function ButtonStates({
	variant,
	label,
	icon,
}: {
	variant: 'default' | 'secondary' | 'ghost' | 'text' | 'destructive';
	label: string;
	icon?: React.ReactNode;
}) {
	return (
		<div className={rowSpecs}>
			<Spec caption="Default">
				<Button variant={variant}>
					{icon}
					{label}
				</Button>
			</Spec>
			<Spec caption="Focus">
				<Button variant={variant} className={focusRing}>
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
		</div>
	);
}

function Segmented({ s, focus, disabled }: { s: Samples; focus?: boolean; disabled?: boolean }) {
	return (
		<Tabs defaultValue="conversations">
			<TabsList>
				<TabsTrigger value="conversations" disabled={disabled} className={cn(focus && focusRing)}>
					{s.view_conversations}
				</TabsTrigger>
				<TabsTrigger value="notifications" disabled={disabled}>
					{s.view_notifications}
				</TabsTrigger>
			</TabsList>
			{['conversations', 'notifications'].map((value) => (
				<TabsContent key={value} value={value} className="grid max-w-[280px] gap-2 p-1">
					<Skeleton className="h-4" />
					<Skeleton className="h-4 w-2/3" />
				</TabsContent>
			))}
		</Tabs>
	);
}

function ReportRows({ s, focusLast, disableLast }: { s: Samples; focusLast?: boolean; disableLast?: boolean }) {
	return (
		<RadioGroup aria-label={s.report_menu_title} defaultValue="found" className="gap-3">
			<ChoiceRow
				value="lost"
				icon={<MegaphoneIcon weight="fill" aria-hidden="true" className="text-status-lost-subtle-foreground" />}
				title={s.report_lost_title}
				description={s.report_lost_desc}
			/>
			<ChoiceRow
				value="found"
				icon={
					<HandHeartIcon weight="fill" aria-hidden="true" className="text-status-found-subtle-foreground" />
				}
				title={s.report_found_title}
				description={s.report_found_desc}
			/>
			<ChoiceRow
				value="sighted"
				icon={<EyeIcon weight="fill" aria-hidden="true" className="text-status-sighted-subtle-foreground" />}
				title={s.report_sighted_title}
				description={s.report_sighted_desc}
				disabled={disableLast}
				className={cn(focusLast && focusRing)}
			/>
		</RadioGroup>
	);
}

function SearchField({ s, loading }: { s: Samples; loading?: boolean }) {
	const [query, setQuery] = React.useState(s.search_value);

	return (
		<FormField label={s.search_label}>
			<div className="relative">
				<MagnifyingGlassIcon
					weight="bold"
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 left-0.5 size-[22px] -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					type="search"
					autoComplete="off"
					placeholder={s.search_placeholder}
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					className={cn(
						'pr-12 pl-[34px] [&::-webkit-search-cancel-button]:appearance-none',
						loading && focusLine
					)}
				/>
				<span className="absolute top-1/2 right-0 grid min-h-11 min-w-11 -translate-y-1/2 place-items-center text-primary">
					{loading ? (
						<Spinner />
					) : (
						query && (
							<Button
								variant="ghost"
								size="icon"
								aria-label={s.search_clear}
								onClick={() => setQuery('')}
							>
								<XCircleIcon weight="bold" aria-hidden="true" />
							</Button>
						)
					)}
				</span>
			</div>
			{loading && (
				<p role="status" className="sr-only">
					{s.searching}
				</p>
			)}
		</FormField>
	);
}

function StatusList({ s }: { s: Samples }) {
	return (
		<ul className="m-0 grid list-none gap-3 p-0">
			<li>
				<StatusLabel status="lost">{s.status_lost}</StatusLabel>
			</li>
			<li>
				<StatusLabel status="found">{s.status_found}</StatusLabel>
			</li>
			<li>
				<StatusLabel status="sighted">{s.status_sighted}</StatusLabel>
			</li>
			<li>
				<StatusLabel status="reunited">{s.status_reunited}</StatusLabel>
			</li>
		</ul>
	);
}

/** Placeholder spot illustration (flat geometry in tokens) until the image task delivers, as in the P23 mockup. */
function SpotArt() {
	return (
		<svg viewBox="0 0 320 210" aria-hidden="true">
			<rect width="320" height="210" className="fill-accent" />
			<circle cx="232" cy="70" r="32" className="fill-status-reunited" />
			<path d="M0 150 C60 112 120 120 172 140 C222 160 272 150 320 120 V210 H0Z" className="fill-secondary" />
			<path d="M0 182 C70 146 130 162 190 180 C240 194 290 186 320 170 V210 H0Z" className="fill-primary" />
		</svg>
	);
}

const subscribeToTheme = (onChange: () => void) => {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
	return () => observer.disconnect();
};

/** Colour mode for the gallery: follows the OS (root layout script) until a button sets it. */
function ThemeSwitch() {
	const dark = React.useSyncExternalStore(
		subscribeToTheme,
		() => document.documentElement.classList.contains('dark'),
		() => false
	);
	const set = (next: boolean) => document.documentElement.classList.toggle('dark', next);

	return (
		<div role="group" aria-label="Colour mode" className="flex gap-1">
			<Button size="sm" variant={dark ? 'ghost' : 'secondary'} aria-pressed={!dark} onClick={() => set(false)}>
				Light
			</Button>
			<Button size="sm" variant={dark ? 'secondary' : 'ghost'} aria-pressed={dark} onClick={() => set(true)}>
				Dark
			</Button>
		</div>
	);
}

export function Kit({ s, locale }: { s: Samples; locale: string }) {
	const languages = [
		{ code: 'sl', href: '/dev/kit', label: 'SL' },
		{ code: 'en', href: '/en/dev/kit', label: 'EN' },
	];

	return (
		<>
			<header
				lang="en"
				className="mx-auto flex max-w-[1248px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 lg:px-12"
			>
				<p className="font-display text-lg font-bold">Najdimo UI kit</p>
				<nav aria-label="Sample text language" className="ml-auto flex gap-1">
					{languages.map(({ code, href, label }) => (
						<Link
							key={code}
							href={href}
							hrefLang={code}
							aria-current={code === locale ? 'page' : undefined}
							className={buttonVariants({ size: 'sm', variant: code === locale ? 'secondary' : 'ghost' })}
						>
							{label}
						</Link>
					))}
				</nav>
				<ThemeSwitch />
			</header>

			<main className="mx-auto max-w-[1248px] px-5 pb-24 lg:px-12">
				<div lang="en" className="pt-6 lg:pt-10">
					<h1 className="font-display text-3xl leading-9 font-bold tracking-[-0.02em] text-balance lg:text-5xl lg:leading-[52px]">
						P23 UI kit gallery
					</h1>
					<p className="mt-4 max-w-[74ch] text-lg text-muted-foreground">
						Every core component of <code>components/ui</code> in its default, focus, disabled, error and
						loading states, with product strings from the P23 content slice. Switch the sample language and
						the colour mode at the top.
					</p>
				</div>

				<Section
					title="1. Actions"
					lede="Button in five variants, three sizes and its states, and the icon button. Full pill, no border, no shadow, 16 px bold (17 on lg), icon 20 before the label."
				>
					<Sub title="Primary (default)" />
					<ButtonStates variant="default" label={s.primary} />
					<Sub title="Secondary" />
					<ButtonStates variant="secondary" label={s.secondary} />
					<Sub title="Ghost (with icon)" />
					<ButtonStates
						variant="ghost"
						label={s.share}
						icon={<ShareNetworkIcon weight="bold" aria-hidden="true" />}
					/>
					<Sub title="Text" />
					<ButtonStates variant="text" label={s.text} />
					<Sub title="Destructive" />
					<ButtonStates variant="destructive" label={s.destructive} />

					<Sub title="Sizes: sm 44, md 48, lg 56" />
					<div className={rowSpecs}>
						<Spec caption="sm">
							<Button size="sm">{s.primary}</Button>
						</Spec>
						<Spec caption="md">
							<Button>{s.primary}</Button>
						</Spec>
						<Spec caption="lg">
							<Button size="lg">{s.primary}</Button>
						</Spec>
						<Spec caption="Mobile action stack (390)" className="w-full max-w-[390px]">
							<div className="grid gap-1">
								<Button size="lg" className="w-full">
									{s.primary}
								</Button>
								<Button variant="text" className="w-full">
									{s.text}
								</Button>
							</div>
						</Spec>
					</div>

					<Sub title="Icon button and disabled with a reason" />
					<div className={rowSpecs}>
						<Spec caption="Default">
							<Button variant="ghost" size="icon" aria-label={s.close}>
								<XIcon weight="bold" aria-hidden="true" />
							</Button>
						</Spec>
						<Spec caption="Focus">
							<Button variant="ghost" size="icon" aria-label={s.close} className={focusRing}>
								<XIcon weight="bold" aria-hidden="true" />
							</Button>
						</Spec>
						<Spec caption="Disabled">
							<Button variant="ghost" size="icon" aria-label={s.close} disabled>
								<XIcon weight="bold" aria-hidden="true" />
							</Button>
						</Spec>
						<Spec caption="Loading">
							<Button variant="ghost" size="icon" aria-label={s.close} loading>
								<XIcon weight="bold" aria-hidden="true" />
							</Button>
						</Spec>
						<Spec caption="Disabled, reason in help text">
							<Button disabled aria-describedby="kit-send-help">
								{s.send}
							</Button>
							<p id="kit-send-help" className="mt-2 text-sm text-muted-foreground">
								{s.send_disabled_help}
							</p>
						</Spec>
					</div>
				</Section>

				<Section
					title="2. Fields"
					lede="FormField: label above, line input with a 2 px underline, help and error below, tied by aria-describedby. Hover turns the line foreground, focus adds 2 px in the ring colour, error is destructive, disabled is dashed."
				>
					<Sub title="Input" />
					<div className={gridSpecs}>
						<Spec caption="Default">
							<FormField label={s.chip_label} hint={s.chip_help}>
								<Input inputMode="numeric" autoComplete="off" className="tabular-nums" />
							</FormField>
						</Spec>
						<Spec caption="Focus (typing)">
							<FormField label={s.chip_label} hint={s.chip_help}>
								<Input
									inputMode="numeric"
									autoComplete="off"
									defaultValue="705 1234"
									className={cn('tabular-nums', focusLine)}
								/>
							</FormField>
						</Spec>
						<Spec caption="Filled">
							<FormField label={s.chip_label} hint={s.chip_help}>
								<Input
									inputMode="numeric"
									autoComplete="off"
									defaultValue="705 1234 5678 901"
									className="tabular-nums"
								/>
							</FormField>
						</Spec>
						<Spec caption="Error">
							<FormField label={s.chip_label} hint={s.chip_help} error={s.chip_warning}>
								<Input
									inputMode="numeric"
									autoComplete="off"
									defaultValue="705 1234 567"
									className="tabular-nums"
								/>
							</FormField>
						</Spec>
						<Spec caption="Disabled, with reason">
							<FormField label={s.chip_label} hint={s.closed_reason} disabled>
								<Input inputMode="numeric" defaultValue="705 1234 5678 901" className="tabular-nums" />
							</FormField>
						</Spec>
					</div>

					<Sub title="Textarea, select and search" />
					<div className={gridSpecs}>
						<Spec caption="Textarea · default">
							<FormField label={s.circumstances_label} hint={s.circumstances_help}>
								<Textarea rows={3} placeholder={s.circumstances_placeholder} />
							</FormField>
						</Spec>
						<Spec caption="Textarea · focus, filled">
							<FormField label={s.circumstances_label} hint={s.circumstances_help}>
								<Textarea rows={3} defaultValue={s.circumstances_value} className={focusLine} />
							</FormField>
						</Spec>
						<Spec caption="Textarea · error">
							<FormField label={s.circumstances_label} error={s.circumstances_too_long}>
								<Textarea rows={3} defaultValue={s.circumstances_value} />
							</FormField>
						</Spec>
						<Spec caption="Select · default">
							<FormField label={s.region_label}>
								<Select defaultValue={s.region_all}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
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
									<SelectTrigger className={focusLine}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
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
									<SelectContent>
										<SelectItem value={s.region_value}>{s.region_value}</SelectItem>
									</SelectContent>
								</Select>
							</FormField>
						</Spec>
						<Spec caption="Search · filled, clear button">
							<SearchField s={s} />
							<p className="mt-3 text-sm text-muted-foreground">{s.search_attribution}</p>
						</Spec>
						<Spec caption="Search · loading results">
							<SearchField s={s} loading />
						</Spec>
					</div>
				</Section>

				<Section
					title="3. Choices"
					lede="Choice row, segmented control, switch, checkbox and radio. Selected is always a fill plus a check, a dot, the thumb position or the raised segment, never colour alone."
				>
					<Sub title="Choice row (390)" />
					<div className={rowSpecs}>
						<Spec caption="Unselected · selected · focus" className="w-full max-w-[390px]">
							<ReportRows s={s} focusLast />
						</Spec>
						<Spec caption="Disabled (last row)" className="w-full max-w-[390px]">
							<ReportRows s={s} disableLast />
						</Spec>
					</div>

					<Sub title="Segmented control (Tabs)" />
					<div className={rowSpecs}>
						<Spec caption="Selected · unselected" className="w-[280px]">
							<Segmented s={s} />
						</Spec>
						<Spec caption="Focus" className="w-[280px]">
							<Segmented s={s} focus />
						</Spec>
						<Spec caption="Disabled" className="w-[280px]">
							<Segmented s={s} disabled />
						</Spec>
					</div>

					<Sub title="Switch" />
					<div className={gridSpecs}>
						<Spec caption="Off">
							<label className={switchRow}>
								{s.alerts_nearby}
								<Switch />
							</label>
						</Spec>
						<Spec caption="On">
							<label className={switchRow}>
								{s.alerts_nearby}
								<Switch defaultChecked />
							</label>
						</Spec>
						<Spec caption="Focus">
							<label className={switchRow}>
								{s.alerts_nearby}
								<Switch defaultChecked className={focusRing} />
							</label>
						</Spec>
						<Spec caption="Disabled, with reason">
							<label className={switchRow}>
								{s.alerts_nearby}
								<Switch disabled aria-describedby="kit-switch-help" />
							</label>
							<p id="kit-switch-help" className="max-w-[360px] text-sm text-muted-foreground">
								{s.notifications_denied}
							</p>
						</Spec>
					</div>

					<Sub title="Checkbox and radio" />
					<div className={gridSpecs}>
						<Spec caption="Checkbox group: checked · focus · disabled with reasons">
							<fieldset className="m-0 grid border-0 p-0">
								<legend className="mb-1 text-[15px] leading-5 font-bold">{s.channels_title}</legend>
								<label className={checkRow}>
									<Checkbox defaultChecked className={focusRing} />
									<span>{s.channel_push}</span>
								</label>
								<label className={checkRow}>
									<Checkbox disabled aria-describedby="kit-cb-email-help" />
									<span>{s.channel_email}</span>
								</label>
								<p id="kit-cb-email-help" className="text-sm text-muted-foreground">
									{s.email_unverified}
								</p>
								<label className={checkRow}>
									<Checkbox defaultChecked disabled aria-describedby="kit-cb-inapp-help" />
									<span>{s.channel_inapp}</span>
								</label>
								<p id="kit-cb-inapp-help" className="text-sm text-muted-foreground">
									{s.locked_note}
								</p>
							</fieldset>
						</Spec>
						<Spec caption="Single checkbox: with help · error">
							<div className="grid gap-4">
								<div>
									<label className={checkRow}>
										<Checkbox aria-describedby="kit-cb-block-help" />
										<span>{s.block_label}</span>
									</label>
									<p id="kit-cb-block-help" className="text-sm text-muted-foreground">
										{s.block_help}
									</p>
								</div>
								<div>
									<label className={checkRow}>
										<Checkbox aria-invalid aria-describedby="kit-cb-consent-error" />
										<span>{s.consent}</span>
									</label>
									<FieldError id="kit-cb-consent-error">{s.consent_error}</FieldError>
								</div>
							</div>
						</Spec>
						<Spec caption="Radio: selected · focus">
							<fieldset className="m-0 border-0 p-0">
								<legend className="mb-1 text-[15px] leading-5 font-bold">{s.reason_label}</legend>
								<RadioGroup defaultValue={s.reasons[0]}>
									{s.reasons.map((reason, index) => (
										<label key={reason} className={checkRow}>
											<RadioGroupItem value={reason} className={cn(index === 1 && focusRing)} />
											<span>{reason}</span>
										</label>
									))}
								</RadioGroup>
							</fieldset>
						</Spec>
						<Spec caption="Radio: whole group disabled while sending">
							<fieldset className="m-0 border-0 p-0">
								<legend className="mb-1 text-[15px] leading-5 font-bold text-muted-foreground">
									{s.reason_label}
								</legend>
								<RadioGroup defaultValue={s.reasons[0]} disabled>
									{s.reasons.map((reason) => (
										<label key={reason} className={checkRow}>
											<RadioGroupItem value={reason} />
											<span>{reason}</span>
										</label>
									))}
								</RadioGroup>
							</fieldset>
						</Spec>
					</div>
				</Section>

				<Section
					title="4. Status"
					lede="Status is always an icon plus a coloured word. Tonal pills for the one main status on a detail page and the premium and verified marks."
				>
					<Sub title="StatusLabel (icon + word)" />
					<div className={gridSpecs}>
						<Spec caption="On background">
							<StatusList s={s} />
						</Spec>
						<Spec caption="On card">
							<Card className="max-w-[300px]">
								<StatusList s={s} />
							</Card>
						</Spec>
						<Spec caption="Counts: Slovenian plural forms, tabular numbers">
							<p className="text-lg tabular-nums">{s.counts}</p>
						</Spec>
					</div>

					<Sub title="Badge (tonal pill)" />
					<div className={rowSpecs}>
						<Badge variant="lost">
							<MegaphoneIcon weight="fill" aria-hidden="true" />
							{s.status_lost}
						</Badge>
						<Badge variant="found">
							<HandHeartIcon weight="fill" aria-hidden="true" />
							{s.status_found}
						</Badge>
						<Badge variant="sighted">
							<EyeIcon weight="fill" aria-hidden="true" />
							{s.status_sighted}
						</Badge>
						<Badge variant="reunited">
							<HeartIcon weight="fill" aria-hidden="true" />
							{s.status_reunited}
						</Badge>
						<Badge variant="premium">
							<RocketLaunchIcon weight="fill" aria-hidden="true" />
							{s.premium}
						</Badge>
						<Badge variant="verified">
							<SealCheckIcon weight="fill" aria-hidden="true" />
							{s.verified}
						</Badge>
					</div>
				</Section>

				<Section
					title="5. Surfaces"
					lede="Flat surfaces separated by tone and space: no borders, no shadows, never a card inside a card. Every surface has a skeleton in its final shape."
				>
					<div className={cn(gridSpecs, 'mt-10')}>
						<Spec caption="Card · default">
							<Card>
								<CardTitle>{s.alerts_nearby}</CardTitle>
								<CardContent>{s.empty_body}</CardContent>
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
							<p role="status" className="sr-only">
								{s.loading}
							</p>
						</Spec>
						<Spec caption="Note (one per view at most)">
							<div className={noteClass}>
								<ShieldCheckIcon
									weight="bold"
									aria-hidden="true"
									className="mt-px size-[22px] shrink-0"
								/>
								<p>{s.safety_note}</p>
							</div>
						</Spec>
						<Spec caption="Avatar: initials 72 · 48 · 32 · loading">
							<div className="flex items-end gap-3">
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
							</div>
						</Spec>
					</div>
				</Section>

				<Section
					title="6. Overlays"
					lede="Dialog, bottom sheet, alert dialog and toast, opened for real: popover or card surface, scrim behind modals, focus trapped and restored, Escape closes."
				>
					<div className={cn(rowSpecs, 'mt-10')}>
						<Spec caption="Dialog (content dialog, close icon)">
							<Dialog>
								<DialogTrigger asChild>
									<Button variant="secondary">{s.report_menu_title}</Button>
								</DialogTrigger>
								<DialogContent closeLabel={s.close} className="max-w-[600px] p-7">
									<DialogTitle className="pr-10 text-2xl leading-[30px] font-bold lg:text-3xl lg:leading-9">
										{s.report_menu_title}
									</DialogTitle>
									<DialogDescription className="sr-only">{s.report_menu_title}</DialogDescription>
									<div className="mt-5">
										<ReportRows s={s} />
									</div>
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
									<SheetDescription className="sr-only">{s.report_menu_title}</SheetDescription>
									<div className="mt-5">
										<ReportRows s={s} />
									</div>
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
							<Button variant="ghost" onClick={() => toast.success(s.link_copied)}>
								<LinkIcon weight="bold" aria-hidden="true" />
								{s.copy_link}
							</Button>
						</Spec>
					</div>
				</Section>

				<Section
					title="7. Feedback"
					lede="Skeleton, empty state, inline error and progress. Loading keeps the final layout; errors say what happened and offer the next step."
				>
					<div className={cn(gridSpecs, 'mt-10')}>
						<Spec caption="Skeleton: heading and text">
							<Skeleton className="h-9 w-3/4" />
							<Skeleton className="mt-5 h-4" />
							<Skeleton className="mt-2 h-4" />
							<Skeleton className="mt-2 h-4 w-2/3" />
							<p role="status" className="sr-only">
								{s.loading}
							</p>
						</Spec>
						<Spec caption="Skeleton: field and button row">
							<Skeleton className="h-4 w-40" />
							<Skeleton className="mt-12 h-[2px] rounded-none" />
							<Skeleton className="mt-3 h-4 w-56" />
							<div className="mt-8 flex gap-3">
								<Skeleton className="h-12 w-48 rounded-full" />
								<Skeleton className="size-12 rounded-full" />
							</div>
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
							<div className="grid gap-6">
								<div className={noteClass} role="alert">
									<WarningCircleIcon
										weight="fill"
										aria-hidden="true"
										className="mt-px size-[22px] shrink-0 text-destructive"
									/>
									<div>
										<p>{s.inline_error}</p>
										<Button variant="text" className="mt-1 -ml-3">
											{s.try_again}
										</Button>
									</div>
								</div>
								<div className={noteClass}>
									<WarningCircleIcon
										weight="fill"
										aria-hidden="true"
										className="mt-px size-[22px] shrink-0 text-destructive"
									/>
									<div>
										<p>{s.inline_error}</p>
										<Button variant="text" className="mt-1 -ml-3" loading>
											{s.try_again}
										</Button>
									</div>
								</div>
							</div>
						</Spec>
						<Spec caption="Progress: uploading · done · failed">
							<div className="grid gap-7">
								<div>
									<p className="text-sm font-bold tabular-nums">{s.uploading}</p>
									<Progress value={40} aria-label={s.progress_a11y} className="mt-2" />
								</div>
								<div>
									<p role="status" className="flex items-center gap-2 text-sm">
										<CheckCircleIcon
											weight="fill"
											aria-hidden="true"
											className="size-[18px] text-primary"
										/>
										{s.uploaded}
									</p>
									<Progress value={100} aria-label={s.progress_a11y} className="mt-2" />
								</div>
								<div>
									<Progress value={60} error aria-label={s.progress_a11y} />
									<FieldError className="mt-2">{s.upload_failed}</FieldError>
									<Button variant="text" className="-ml-3">
										{s.try_again}
									</Button>
								</div>
							</div>
						</Spec>
					</div>
				</Section>
			</main>
			<Toaster closeLabel={s.close} label={s.notifications_region} />
		</>
	);
}
