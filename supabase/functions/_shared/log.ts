/** JSON-lines logger: { level, msg, fn, request_id, job_type?, duration_ms?, ...fields }. Never log PII or secrets. */
export interface LogContext {
  fn: string;
  request_id?: string;
  job_type?: string;
}

/** Primitive values only, so whole payloads (and the PII in them) cannot be logged by accident. */
export type LogFields = Record<string, string | number | boolean | null | undefined>;

export interface Logger {
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
}

export function createLogger(context: LogContext): Logger {
  const write = (level: 'info' | 'warn' | 'error') => (msg: string, fields?: LogFields) =>
    console[level](JSON.stringify({ level, msg, ...context, ...fields }));
  return { info: write('info'), warn: write('warn'), error: write('error') };
}
