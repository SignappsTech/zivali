// Public surface of the photos area; the DAO stays private to the area.
export { default as PhotosDomain, PHOTO_HOOKS, type CreatedPhoto } from './photos.domain.ts';
export { default as PhotosMapper } from './photos.mapper.ts';
