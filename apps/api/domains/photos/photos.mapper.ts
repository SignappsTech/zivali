// Photo results → C5 DTOs, parsed with the shared schemas.
import type { z } from 'zod';

import { CreatePhotoResponse, PhotoView } from '@zivali/validation';

import type { CreatedPhoto } from './photos.domain.ts';
import type { PhotoRow } from './photos.dao.ts';

export function toCreateDto(result: CreatedPhoto): z.infer<typeof CreatePhotoResponse> {
	if (!('upload' in result)) return CreatePhotoResponse.parse(result);
	const { url, method, headers, expiresAt } = result.upload;
	return CreatePhotoResponse.parse({
		photo_id: result.photo_id,
		upload: { url, method, headers, expires_at: expiresAt.toISOString() },
	});
}

export function toPhotoView({ photo, thumb_url }: { photo: PhotoRow; thumb_url: string }): z.infer<typeof PhotoView> {
	return PhotoView.parse({
		id: photo.id,
		status: photo.status,
		reject_reason: photo.reject_reason ?? undefined,
		thumb_url,
	});
}

export default { toCreateDto, toPhotoView };
