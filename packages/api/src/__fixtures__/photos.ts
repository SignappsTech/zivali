// C5 example (POST /v1/photos 201) and the other photo responses.
import type { CreatePhotoInput, CreatePhotoResponse, PhotoView } from '@zivali/types';

export const photoInput: CreatePhotoInput = {
	sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
	width: 1600,
	height: 1200,
	bytes: 412_000,
};

export const createdPhoto: CreatePhotoResponse = {
	photo_id: '9b0e2c4a-1f3d-4b5e-8a7c-6d2e1f0a9b00',
	upload: {
		url: 'https://account.eu.r2.cloudflarestorage.com/zivali-private/uploads/u1/9b0e2c4a.jpg?X-Amz-Signature=x',
		method: 'PUT',
		headers: { 'Content-Type': 'image/jpeg' },
		expires_at: '2026-10-15T10:05:00Z',
	},
};

export const existingPhoto: CreatePhotoResponse = { photo_id: createdPhoto.photo_id, existing: true };

export const photo: PhotoView = {
	id: createdPhoto.photo_id,
	status: 'accepted',
	thumb_url:
		'https://account.eu.r2.cloudflarestorage.com/zivali-private/variants/9b0e2c4a/thumb.webp?X-Amz-Signature=y',
};
