// Public surface of the directory area (C18); the DAO stays private.
export { default as DirectoryDomain, type ResponsibleResult } from './directory.domain.ts';
export { default as DirectoryAdminDomain } from './directory-admin.domain.ts';
export { default as DirectoryMapper } from './directory.mapper.ts';
// The ops email channel: admins with a confirmed address (directory reminder, fiscal alerts).
export { listAdminEmails } from './directory.dao.ts';
