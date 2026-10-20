'use client';

import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowUpIcon } from '@phosphor-icons/react/dist/ssr/ArrowUp';
import { CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';
import { CropIcon } from '@phosphor-icons/react/dist/ssr/Crop';
import { ImagesIcon } from '@phosphor-icons/react/dist/ssr/Images';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { type ErrorCodeParam, type Flow, type StepOf, track } from '@zivali/analytics';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/form-field';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { photoCrop } from '@/lib/photo';
import { cn } from '@/lib/utils';

import type { PhotoExif } from './prepare-photo';
import { type PhotoMessage, type PickedPhoto, type SavedPhoto, usePhotoUploads } from './use-photo-uploads';

// The crop tool and react-image-crop load only when a crop starts, so the flows' first load stays small.
const CropDialog = dynamic(() => import('./crop-dialog').then((m) => m.CropDialog), { ssr: false });

// C12b §3: the flow_error code of a refused file or a failed upload, by its message.
const PHOTO_ERROR_CODES: Record<PhotoMessage, ErrorCodeParam | undefined> = {
	'errors.UPLOAD_SIZE': 'too_large',
	'errors.UPLOAD_TYPE': 'file_type',
	'photos.heic_unsupported': 'file_type',
	'photos.too_small': 'invalid',
	'photos.failed': 'upload_failed',
	'photos.captcha_failed': 'upload_failed',
	'photos.failed_network': 'NETWORK',
	'errors.RATE_LIMITED_generic': 'RATE_LIMITED',
	// Files over the 5: never a photo of their own, so never told.
	'photos.limit': undefined,
};

// Photo source tile (P6 .ptile): card surface, radius 20, the tile is the button; hover lays foreground at 10 %.
const tile =
	'flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-row bg-card p-3 text-center text-base leading-[22px] font-bold text-foreground transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[linear-gradient(hsl(var(--foreground)/0.1),hsl(var(--foreground)/0.1))] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 [&>svg]:size-8 [&>svg]:text-primary';

type PhotoPickerProps = {
	/** Draft name; its photos survive a reload in IndexedDB (`clearPhotoDraft` when the report is sent). */
	draft: string;
	/** Photos already attached (editing a pet), listed first; read once, on mount. */
	saved?: SavedPhoto[];
	/** Every change, in order; uploaded photos carry `photoId` for the report or pet. */
	onChange?: (photos: PickedPhoto[]) => void;
	/** Place and time read from a photo, to offer with consent. Coarsen the point before it goes anywhere. */
	onExif?: (exif: PhotoExif) => void;
	/** Runs before each upload: the anonymous sign-in (C7) of a finder without an account (P7). */
	beforeUpload?: () => Promise<unknown>;
	/** true keeps new photos in this browser and uploads them once false, e.g. until a lost report has an account (C3). */
	hold?: boolean;
	/** Shown under the first photo: the AI notice about it (TASK-41.2). */
	firstNote?: React.ReactNode;
	/** A cropped copy took the place of the photo at `index` (C19 §Crop): the first one is checked again. */
	onCropped?: (index: number) => void;
	/**
	 * `replaceFirst()` opens the picker for a photo that takes the first one's place; `cropFirst(fallback)` the crop tool
	 * for the first photo ("Obreži fotografijo" in the several-animals note), `fallback` moving focus once it closes when
	 * neither the note nor the photo's row is on screen (the picker hidden on a later step).
	 */
	ref?: React.Ref<PhotoPickerHandle>;
	/** C12b §3: the flow and its photo step; one `flow_error` (field `photo`) per failed or refused photo. */
	analytics?: { [F in Flow]: { flow: F; step: StepOf<F> } }[Flow];
	className?: string;
};
export type PhotoPickerHandle = { replaceFirst: () => void; cropFirst: (fallback?: () => void) => void };
type Cropping = { key: string; opener: Element | null; fallback?: () => void };

/**
 * Photo step of P6 and P7 (FR-003): camera and gallery tiles on touch screens, a file button with a drop area on
 * desktop, then a row per photo with its preview, upload progress, retry, reorder, crop (a photo in this browser,
 * not a saved one; TASK-41.5) and remove. Up to 5 photos.
 */
export function PhotoPicker({
	draft,
	saved,
	onChange,
	onExif,
	beforeUpload,
	hold,
	firstNote,
	onCropped,
	ref,
	analytics,
	className,
}: PhotoPickerProps) {
	const t = useTranslations('photos');
	const tai = useTranslations('ai_prefill');
	const message = useTranslations();
	const { photos, preparing, notice, justUploaded, add, replace, remove, move, retry } = usePhotoUploads(
		draft,
		onExif,
		saved,
		beforeUpload,
		hold,
		(message) => {
			const code = PHOTO_ERROR_CODES[message];
			if (analytics && code) track('flow_error', { ...analytics, error_code: code, error_field: 'photo' });
		}
	);
	const root = React.useRef<HTMLDivElement>(null);
	const camera = React.useRef<HTMLInputElement>(null);
	const gallery = React.useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = React.useState(false);
	// The photo in the crop tool and the button that opened it; once closed, where focus goes back to: the opener, or
	// the crop button of the photo in that slot when the opener is gone (the note, or the original's row), else the
	// parent's fallback (both hidden on a later step).
	const [cropping, setCropping] = React.useState<Cropping>();
	const back = React.useRef<Cropping>(undefined);
	const [cropped, setCropped] = React.useState(false);
	React.useEffect(() => {
		if (!cropped) return;
		const timer = setTimeout(() => setCropped(false), 1500);
		return () => clearTimeout(timer);
	}, [cropped]);
	React.useEffect(() => {
		if (cropping || !back.current) return;
		const { key, opener, fallback } = back.current;
		back.current = undefined;
		const target =
			opener?.isConnected && opener !== document.body
				? opener
				: root.current?.querySelector(`[data-key="${key}"] [data-crop]`);
		if (target instanceof HTMLElement && !target.closest('[hidden]')) target.focus();
		else fallback?.();
	}, [cropping]);
	const closeCrop = (key: string) => {
		back.current = { key, opener: cropping?.opener ?? null, fallback: cropping?.fallback };
		setCropping(undefined);
	};

	const changed = React.useEffectEvent((next: PickedPhoto[]) => onChange?.(next));
	React.useEffect(() => changed(photos), [photos]);
	// The photo a pick replaces ("Zamenjaj fotografijo"); a tile or a drop adds instead.
	const replacing = React.useRef<string>(undefined);
	// Safari does not focus a clicked button, so a row's own button is named; the note's is the focused element.
	const crop = (key: string, opener = document.activeElement, fallback?: () => void) =>
		setCropping({ key, opener, fallback });
	React.useImperativeHandle(
		ref,
		() => ({
			replaceFirst: () => {
				replacing.current = photos[0]?.key;
				gallery.current?.click();
			},
			cropFirst: (fallback) => {
				if (photos[0]?.file) crop(photos[0].key, document.activeElement, fallback);
			},
		}),
		[photos]
	);
	const cropTarget = cropping && photos.find((photo) => photo.key === cropping.key);

	const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
		void add([...(event.target.files ?? [])], replacing.current);
		replacing.current = undefined;
		// Lets the same file be picked again after a remove.
		event.target.value = '';
	};
	const open = (input: React.RefObject<HTMLInputElement | null>) => {
		replacing.current = undefined;
		input.current?.click();
	};
	// Keyboard focus follows the photo it acted on, or returns to the visible add tile, once React has re-rendered.
	const focusAfter = (selector: string) =>
		requestAnimationFrame(() =>
			[...(root.current?.querySelectorAll<HTMLElement>(selector) ?? [])]
				.find((element) => element.offsetParent !== null)
				?.focus()
		);

	return (
		<div ref={root} className={cn('grid gap-7', className)}>
			<div className="grid gap-3">
				<div className="grid grid-cols-2 gap-3 pointer-fine:grid-cols-1">
					<button
						type="button"
						data-tile
						className={cn(tile, 'pointer-fine:hidden')}
						onClick={() => open(camera)}
					>
						<CameraIcon weight="bold" aria-hidden="true" />
						{t('take')}
					</button>
					<button
						type="button"
						data-tile
						className={cn(tile, 'pointer-fine:hidden')}
						onClick={() => open(gallery)}
					>
						<ImagesIcon weight="bold" aria-hidden="true" />
						{t('choose')}
					</button>
					<button
						type="button"
						data-tile
						className={cn(
							tile,
							'hidden pointer-fine:flex',
							dragging && 'bg-[linear-gradient(hsl(var(--foreground)/0.1),hsl(var(--foreground)/0.1))]'
						)}
						onClick={() => open(gallery)}
						onDragOver={(event) => {
							event.preventDefault();
							setDragging(true);
						}}
						onDragLeave={() => setDragging(false)}
						onDrop={(event) => {
							event.preventDefault();
							setDragging(false);
							void add([...event.dataTransfer.files]);
						}}
					>
						<ImagesIcon weight="bold" aria-hidden="true" />
						<span>
							{t('choose_web')}{' '}
							<span className="block font-normal text-muted-foreground">{t('drop_web')}</span>
						</span>
					</button>
				</div>
				<input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
				<input ref={gallery} type="file" accept="image/*" multiple hidden onChange={pick} />
				{notice && <FieldError>{message(notice)}</FieldError>}
			</div>

			{photos.length + preparing > 0 && (
				<ul className="grid gap-5">
					{photos.map((photo, index) => {
						const n = index + 1;
						const percent = Math.round(photo.progress * 100);
						// A held photo is kept in this browser; it reads as ready, its upload comes later.
						const ready = photo.status === 'uploaded' || photo.status === 'kept';
						return (
							<li
								key={photo.key}
								data-key={photo.key}
								aria-label={t('thumb_a11y', { n, total: photos.length })}
								className="grid grid-cols-[80px_minmax(0,1fr)] items-start gap-4"
							>
								{/* A local object URL, or a saved photo's short-lived presigned URL: nothing for next/image. */}
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={photo.preview}
									alt={t('thumb_alt', { n, total: photos.length })}
									width={80}
									height={80}
									className={cn('size-20 rounded-row bg-muted', photoCrop)}
								/>
								<div>
									{ready && index === 0 && <p className="text-sm font-bold">{t('cover')}</p>}
									{photo.status === 'uploading' && (
										<>
											<p className="text-sm">{t('uploading', { percent })}</p>
											<Progress
												className="mt-2"
												value={percent}
												aria-label={t('progress_a11y', { n })}
											/>
										</>
									)}
									{photo.status === 'failed' && (
										<>
											<Progress error value={percent} aria-hidden="true" />
											<FieldError className="mt-2">
												{message(photo.error ?? 'photos.failed')}
											</FieldError>
										</>
									)}
									<div className={cn('-ml-2.5 flex flex-wrap gap-1', ready ? 'mt-2' : 'mt-1')}>
										{photo.status === 'failed' ? (
											<Button type="button" variant="text" onClick={() => retry(photo.key)}>
												<ArrowClockwiseIcon weight="bold" aria-hidden="true" />
												{t('retry')}
											</Button>
										) : (
											<>
												{index > 0 && (
													<Button
														type="button"
														variant="ghost"
														size="icon"
														data-move="-1"
														aria-label={t('move_left', { n })}
														onClick={() => {
															move(index, -1);
															focusAfter(`[data-key="${photo.key}"] [data-move]`);
														}}
													>
														<ArrowUpIcon weight="bold" aria-hidden="true" />
													</Button>
												)}
												{index < photos.length - 1 && (
													<Button
														type="button"
														variant="ghost"
														size="icon"
														data-move="1"
														aria-label={t('move_right', { n })}
														onClick={() => {
															move(index, 1);
															focusAfter(`[data-key="${photo.key}"] [data-move]`);
														}}
													>
														<ArrowDownIcon weight="bold" aria-hidden="true" />
													</Button>
												)}
											</>
										)}
										{/* type="button" on every row button: the picker sits inside step forms, where an untyped
										    button would be the default one and take Enter from the form's text fields. */}
										{photo.file && (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												data-crop
												aria-label={tai('crop_photo_n', { n })}
												onClick={(event) => crop(photo.key, event.currentTarget)}
											>
												<CropIcon weight="bold" aria-hidden="true" />
											</Button>
										)}
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label={t('remove', { n })}
											onClick={() => {
												remove(photo.key);
												focusAfter('[data-tile]');
											}}
										>
											<TrashIcon weight="bold" aria-hidden="true" />
										</Button>
									</div>
								</div>
								{index === 0 && firstNote && <div className="col-span-2">{firstNote}</div>}
							</li>
						);
					})}
					{Array.from({ length: preparing }, (_, index) => (
						<li key={`preparing-${index}`} aria-hidden="true">
							<Skeleton className="size-20 rounded-row" />
						</li>
					))}
				</ul>
			)}
			<p className="sr-only" aria-live="polite">
				{cropped ? tai('crop_done') : justUploaded ? t('uploaded') : ''}
			</p>
			{cropTarget?.file && (
				<CropDialog
					photo={{ file: cropTarget.file, width: cropTarget.width!, height: cropTarget.height! }}
					alt={t('thumb_alt', { n: photos.indexOf(cropTarget) + 1, total: photos.length })}
					onCancel={() => closeCrop(cropTarget.key)}
					onApply={async (rect) => {
						const index = photos.indexOf(cropTarget);
						const copy = await replace(cropTarget.key, rect);
						if (copy) {
							onCropped?.(index);
							setCropped(true);
						}
						closeCrop(copy ?? cropTarget.key);
					}}
				/>
			)}
		</div>
	);
}
