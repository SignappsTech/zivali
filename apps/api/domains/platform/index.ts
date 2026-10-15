// Platform tables (C1). AuditDao is public on purpose: every staff service writes the audit trail through it.
export { default as AuditDao, type AuditEntry } from './audit.dao.ts';
export { default as PlatformDao } from './platform.dao.ts';
export { consumeRateLimit } from './rate-limit.domain.ts';
