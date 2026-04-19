import { Prisma } from '@prisma/client';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  factor?: number;
  jitter?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  isTransient?: (err: unknown) => boolean;
}

// Transient = worth retrying: Prisma connectivity codes (P1001 can't reach DB,
// P1002 timeout, P1008 operations timed out, P1017 server closed connection) and
// Node network errors (ECONNRESET, ETIMEDOUT, ECONNREFUSED, EAI_AGAIN). Everything
// else (unique violations, not-found, validation, 4xx-equivalent) passes through.
const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
const TRANSIENT_NET_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EAI_AGAIN',
]);

export function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientRustPanicError) return false;
  const code = (err as { code?: string }).code;
  if (code && TRANSIENT_PRISMA_CODES.has(code)) return true;
  if (code && TRANSIENT_NET_CODES.has(code)) return true;
  return false;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new Error('aborted'));
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(signal?.reason ?? new Error('aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

// NOTE: withRetry is intentionally used only at the edges (Prisma $connect on
// startup, health-check queries). Service-layer calls rely on Prisma's own
// connection pool and the global exception filter — do NOT blanket-wrap them.
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const baseDelay = opts.baseDelayMs ?? 100;
  const factor = opts.factor ?? 2;
  const jitter = opts.jitter ?? true;
  const isTransient = opts.isTransient ?? isTransientError;
  const deadline = opts.timeoutMs ? Date.now() + opts.timeoutMs : undefined;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (opts.signal?.aborted) throw opts.signal.reason ?? new Error('aborted');
    if (deadline && Date.now() >= deadline) throw lastErr ?? new Error('retry timeout');
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === maxAttempts) throw err;
      const backoff = baseDelay * Math.pow(factor, attempt - 1);
      const delay = jitter ? backoff * (0.5 + Math.random() * 0.5) : backoff;
      const remaining = deadline ? deadline - Date.now() : Infinity;
      if (remaining <= 0) throw err;
      await sleep(Math.min(delay, remaining), opts.signal);
    }
  }
  throw lastErr;
}
