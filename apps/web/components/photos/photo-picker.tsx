'use client';

import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowUpIcon } from '@phosphor-icons/react/dist/ssr/ArrowUp';
import { CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';
import { ImagesIcon } from '@phosphor-icons/react/dist/ssr/Images';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/form-field';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import type { PhotoExif } from './prepare-photo';
import { type PickedPhoto, type SavedPhoto, usePhotoUploads } from './use-photo-uploads';

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
	className?: string;
};

/**
 * Photo step of P6 and P7 (FR-003): camera and gallery tiles on touch screens, a file button with a drop area on
 * desktop, then a row per photo with its preview, upload progress, retry, reorder and remove. Up to 5 photos.
 */
export function PhotoPicker({ draft, saved, onChange, onExif, className }: PhotoPickerProps) {
	const t = useTranslations('photos');
	const message = useTranslations();
	const { photos, preparing, notice, justUploaded, add, remove, move, retry } = usePhotoUploads(draft, onExif, saved);
	const root = React.useRef<HTMLDivElement>(null);
	const camera = React.useRef<HTMLInputElement>(null);
	const gallery = React.useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = React.useState(false);

	const changed = React.useEffectEvent((next: PickedPhoto[]) => onChange?.(next));
	React.useEffect(() => changed(photos), [photos]);

	const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
		void add([...(event.target.files ?? [])]);
		// Lets the same file be picked again after a remove.
		event.target.value = '';
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
						onClick={() => camera.current?.click()}
					>
						<CameraIcon weight="bold" aria-hidden="true" />
						{t('take')}
					</button>
					<button
						type="button"
						data-tile
						className={cn(tile, 'pointer-fine:hidden')}
						onClick={() => gallery.current?.click()}
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
						onClick={() => gallery.current?.click()}
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
									className="size-20 rounded-row bg-muted object-cover"
								/>
								<div>
									{photo.status === 'uploaded' && index === 0 && (
										<p className="text-sm font-bold">{t('cover')}</p>
									)}
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
									<div
										className={cn(
											'-ml-2.5 flex flex-wrap gap-1',
											photo.status === 'uploaded' ? 'mt-2' : 'mt-1'
										)}
									>
										{photo.status === 'failed' ? (
											<Button variant="text" onClick={() => retry(photo.key)}>
												<ArrowClockwiseIcon weight="bold" aria-hidden="true" />
												{t('retry')}
											</Button>
										) : (
											<>
												{index > 0 && (
													<Button
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
										<Button
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
				{justUploaded ? t('uploaded') : ''}
			</p>
		</div>
	);
}
