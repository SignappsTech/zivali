'use client';

import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CatIcon } from '@phosphor-icons/react/dist/ssr/Cat';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { DogIcon } from '@phosphor-icons/react/dist/ssr/Dog';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useStore } from 'react-redux';
import { toast } from 'sonner';

import { track } from '@zivali/analytics';
import {
	alertsApi,
	useDeleteAlertSubscriptionMutation,
	useGetAlertSubscriptionQuery,
	useSaveAlertSubscriptionMutation,
} from '@zivali/api/alerts';
import { useRequireAuth } from '@zivali/api/auth';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { useUpdateMeMutation } from '@zivali/api/me';
import type { ApiStore } from '@zivali/api/rtk';
import {
	type AlertSubscription,
	type AlertSubscriptionInput,
	type LatLng,
	type Me,
	SPECIES,
	type Species,
	type UpdateMeInput,
} from '@zivali/types';
import { AuthGate } from '@/components/auth/gate';
import { useErrorText } from '@/components/auth/parts';
import { LocationPicker, type LocationValue, nearest, RADII, rangeClass } from '@/components/location/location-picker';
import { InlineError, PageSkeleton, ringClass } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/sonner';
import { Switch } from '@/components/ui/switch';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const STOPS_KM = RADII.alert.stops.map((m) => m / 1000); // the picker's alert stops, 1 to 25 km

/** The PUT body from a stored subscription (only the request fields), with the changed ones. */
const alertInput = (
	{ center, radius_km, species, paused }: AlertSubscriptionInput,
	change: Partial<AlertSubscriptionInput> = {}
): AlertSubscriptionInput => ({ center, radius_km, species, paused, ...change });

/** Alerts turned on for an area: dogs and cats, not paused. */
const newAlerts = (center: LatLng, radius_km: number): AlertSubscriptionInput => ({
	center,
	radius_km,
	species: [...SPECIES],
	paused: false,
});

const samePoint = (a: LatLng | null, b: LatLng | null) => Boolean(a && b && a.lat === b.lat && a.lng === b.lng);

/** `alert_opt_in` (C12): track() drops it without analytics consent; species only when one was chosen, never the area. */
const trackOptIn = (species: Species[]) => track('alert_opt_in', species.length === 1 ? { species: species[0] } : {});

/** A switch row: the bold label names the switch, the help line under it describes it; the whole row is the target. */
function SwitchRow({
	label,
	help,
	checked,
	onCheckedChange,
}: {
	label: string;
	help: string;
	checked: boolean;
	onCheckedChange(on: boolean): void;
}) {
	const id = React.useId();
	return (
		<label className="flex min-h-14 cursor-pointer items-center justify-between gap-4">
			<span className="min-w-0 flex-1">
				<span id={`${id}-l`} className="block text-[17px] leading-6 font-bold">
					{label}
				</span>
				<span id={`${id}-h`} className="block text-sm text-muted-foreground">
					{help}
				</span>
			</span>
			<Switch
				aria-labelledby={`${id}-l`}
				aria-describedby={`${id}-h`}
				checked={checked}
				onCheckedChange={onCheckedChange}
			/>
		</label>
	);
}

/**
 * The P13 radius: the slider over the picker's stops with a number field in km beside it (P13 web). Dragging shows each
 * stop; the stop let go at (the slider's `change`, also each arrow key) or the typed number, snapped to the nearest
 * stop on Enter or leaving the field, is saved. Otherwise it shows `km`, so a refused change moves it back.
 */
function Radius({ km, onSave }: { km: number; onSave(km: number): void }) {
	const t = useTranslations('alerts');
	const id = React.useId();
	const slider = React.useRef<HTMLInputElement>(null);
	const [drag, setDrag] = React.useState<number>(); // the stop under the thumb while it moves
	const [text, setText] = React.useState<string>(); // the number field's text while it is edited
	const index = drag ?? nearest(STOPS_KM, km);
	const value = STOPS_KM[index]!;
	const commit = (stop: number) => {
		setDrag(undefined);
		setText(undefined);
		if (stop !== km) onSave(stop);
	};

	// React's onChange follows every step; the native change event fires once, where the pointer lets go. Bound once;
	// the ref keeps it on the latest `commit` (and so the current `km`).
	const latest = React.useRef(commit);
	React.useEffect(() => {
		latest.current = commit;
	});
	React.useEffect(() => {
		const input = slider.current!;
		const onRelease = () => latest.current(STOPS_KM[Number(input.value)]!);
		input.addEventListener('change', onRelease);
		return () => input.removeEventListener('change', onRelease);
	}, []);

	const commitText = () => {
		if (text === undefined) return;
		const typed = Number(text);
		commit(text.trim() && Number.isFinite(typed) ? STOPS_KM[nearest(STOPS_KM, typed)]! : km);
	};

	return (
		<div>
			<div className="flex items-center justify-between gap-3">
				<label htmlFor={`${id}-r`} className="text-control font-bold">
					{t('radius_label')}
				</label>
				<span className="flex items-center gap-2">
					<Input
						type="number"
						inputMode="numeric"
						min={STOPS_KM[0]}
						max={STOPS_KM.at(-1)}
						aria-label={t('radius_number_label')}
						value={text ?? value}
						onChange={(event) => setText(event.target.value)}
						onBlur={commitText}
						onKeyDown={(event) => event.key === 'Enter' && commitText()}
						className="min-h-11 w-14 pt-1 pb-1 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					/>
					<span aria-hidden="true" className="font-bold">
						km
					</span>
				</span>
			</div>
			<input
				ref={slider}
				id={`${id}-r`}
				type="range"
				min={0}
				max={STOPS_KM.length - 1}
				step={1}
				value={index}
				aria-valuetext={t('radius_value', { km: value })}
				onChange={(event) => {
					setDrag(Number(event.target.value));
					setText(undefined);
				}}
				className={cn(rangeClass, 'mt-1')}
				style={{ '--f': index / (STOPS_KM.length - 1) } as React.CSSProperties}
			/>
		</div>
	);
}

/** Toggle pill (system §10.4): `secondary`, selected `primary` with a check. */
function SpeciesPill({
	species,
	pressed,
	disabled,
	onPress,
}: {
	species: Species;
	pressed: boolean;
	disabled: boolean;
	onPress(): void;
}) {
	const t = useTranslations('alerts');
	const SpeciesIcon = species === 'dog' ? DogIcon : CatIcon;
	return (
		<Button
			size="sm"
			variant={pressed ? 'default' : 'secondary'}
			aria-pressed={pressed}
			disabled={disabled}
			className="rounded-chip text-control"
			onClick={onPress}
		>
			{pressed && <CheckIcon weight="bold" aria-hidden="true" className="size-4.5" />}
			<SpeciesIcon weight="fill" aria-hidden="true" />
			{t(species === 'dog' ? 'species_dogs' : 'species_cats')}
		</Button>
	);
}

function AlertsForm({ me, sub }: { me: Me; sub: AlertSubscription | null }) {
	const t = useTranslations();
	const errorText = useErrorText();
	const store = useStore() as ApiStore;
	const [save, saving] = useSaveAlertSubscriptionMutation();
	const [remove, removing] = useDeleteAlertSubscriptionMutation();
	const [updateMe] = useUpdateMeMutation();
	const [verify, setVerify] = React.useState(false);
	const [picking, setPicking] = React.useState(false);
	// A change on its way shows at once; its reply then replaces the cached subscription, so nothing flashes back, and
	// a refused one falls back to the cached subscription.
	const current: AlertSubscriptionInput | null = removing.isLoading
		? null
		: saving.isLoading && saving.originalArgs
			? saving.originalArgs
			: sub;
	const reverse = useReversePlaceQuery(current?.center ?? { lat: 0, lng: 0 }, { skip: !current });

	/** Saves (or with null deletes) the subscription, then the profile's side of the one home area. */
	// Writes run one after another, so an older reply can never overwrite a newer one.
	const queue = React.useRef<Promise<unknown>>(Promise.resolve());
	const write = (next: AlertSubscriptionInput | null, profile?: UpdateMeInput) => {
		const run = queue.current.then(() => doWrite(next, profile));
		queue.current = run;
		return run;
	};
	const doWrite = async (next: AlertSubscriptionInput | null, profile?: UpdateMeInput) => {
		const optIn = next !== null && current === null;
		try {
			const saved = next ? await save(next).unwrap() : null;
			if (!next) await remove().unwrap();
			store.dispatch(alertsApi.util.upsertQueryData('getAlertSubscription', undefined, saved));
			if (next && optIn) trackOptIn(next.species);
			if (profile) await updateMe(profile).unwrap();
			toast.success(t('profile.saved'));
			return true;
		} catch (failure) {
			toast.error(errorText(failure));
			return false;
		}
	};
	// Runs once the account is confirmed (the P16 gate); without a home area the picker comes first and turns them on.
	const turnOn = () => (me.home ? void write(newAlerts(me.home, me.home_radius_km)) : setPicking(true));

	// The picker hands back the stored point unchanged when it was not moved, else a new one coarsened once (C6); the
	// profile is only sent a point it does not hold already.
	const confirmArea = async ({ point, radiusM = RADII.alert.initial }: LocationValue) => {
		const radius_km = radiusM / 1000;
		const next = current ? alertInput(current, { center: point, radius_km }) : newAlerts(point, radius_km);
		const profile = { home_radius_km: radius_km, ...(!samePoint(point, me.home) && { home: point }) };
		if (await write(next, profile)) setPicking(false);
	};
	const stored = current
		? { point: current.center, radiusM: current.radius_km * 1000 }
		: me.home
			? { point: me.home, radiusM: me.home_radius_km * 1000 }
			: undefined;

	return (
		<>
			<section aria-label={t('alerts.title')} className="grid gap-5">
				<SwitchRow
					label={t('alerts.master_label')}
					help={t('alerts.master_help')}
					checked={current !== null}
					onCheckedChange={(on) => (on ? setVerify(true) : void write(null))}
				/>
				{current && (
					<>
						<div className="flex items-center gap-3">
							<div className="min-w-0 flex-1">
								<p id="alerts-area" className="text-control font-bold">
									{t('alerts.area_label')}
								</p>
								<p id="alerts-area-value" className="text-[17px] leading-6 tabular-nums">
									{t('alerts.area_value', {
										place: reverse.currentData?.label ?? t('location.address_unknown'),
										radius: current.radius_km,
									})}
								</p>
							</div>
							<Button
								variant="text"
								className="-mr-3"
								aria-describedby="alerts-area alerts-area-value"
								onClick={() => setPicking(true)}
							>
								{t('alerts.area_change')}
								<CaretRightIcon weight="bold" aria-hidden="true" />
							</Button>
						</div>
						<Radius
							km={current.radius_km}
							onSave={(radius_km) =>
								void write(alertInput(current, { radius_km }), { home_radius_km: radius_km })
							}
						/>
						<div role="group" aria-labelledby="alerts-species">
							<p id="alerts-species" className="mb-2 text-control font-bold">
								{t('alerts.species_label')}
							</p>
							<div className="flex flex-wrap gap-2">
								{SPECIES.map((species) => {
									const on = current.species.includes(species);
									return (
										<SpeciesPill
											key={species}
											species={species}
											pressed={on}
											// At least one: the only chosen animal stays chosen.
											disabled={on && current.species.length === 1}
											onPress={() =>
												void write(
													alertInput(current, {
														species: SPECIES.filter((s) =>
															s === species ? !on : current.species.includes(s)
														),
													})
												)
											}
										/>
									);
								})}
							</div>
						</div>
						<SwitchRow
							label={t('alerts.pause_label')}
							help={t('alerts.pause_help')}
							checked={current.paused}
							onCheckedChange={(paused) => void write(alertInput(current, { paused }))}
						/>
					</>
				)}
			</section>
			{/* Channels and quiet hours live on the notification settings page (TASK-22.4). */}
			<Link
				href="/account/notifications"
				className={cn(
					'mt-10 flex min-h-14 items-center justify-between gap-4 rounded-row text-[17px] leading-6 font-bold',
					ringClass
				)}
			>
				{t('alerts.channels_title')}
				<CaretRightIcon weight="bold" aria-hidden="true" className="size-5 shrink-0" />
			</Link>
			{/* Unconfirmed email: "Potrdite svoj e-naslov" first (the API takes verified accounts only). */}
			<AuthGate reason="alerts" open={verify} onOpenChange={setVerify} onReady={turnOn} />
			<Dialog open={picking} onOpenChange={setPicking}>
				<DialogContent
					closeLabel={t('common.close')}
					aria-describedby={undefined}
					className="max-w-[600px] p-7"
				>
					<LocationPicker
						mode="alert"
						variant="dialog"
						value={stored}
						onChange={(value) => void confirmArea(value)}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}

/**
 * P13 "Opozorila v bližini" on web (FR-010): the master switch; when on, the home area (the P5 picker in alert mode, in
 * a dialog), the radius, the animals and pause. Every change saves at once with the "Shranjeno." toast. The area is the
 * profile's home area too: a save writes both, so they never disagree. Channels and quiet hours are linked, not repeated.
 */
export function AlertSettings() {
	const t = useTranslations('common');
	const { me, gate } = useRequireAuth();
	const query = useGetAlertSubscriptionQuery();

	let content: React.ReactNode = <PageSkeleton />;
	if (me && query.data !== undefined) content = <AlertsForm me={me} sub={query.data} />;
	else if (query.isError || gate === 'error')
		content = <InlineError onRetry={() => void query.refetch()} retrying={query.isFetching} />;

	return (
		<>
			<div className="mt-8 max-w-[640px]">{content}</div>
			<Toaster closeLabel={t('close')} label={t('toasts_label')} />
		</>
	);
}
