import { withRetry, isTransientError } from './retry';

describe('isTransientError', () => {
  it('flags Prisma connectivity codes as transient', () => {
    for (const code of ['P1001', 'P1002', 'P1008', 'P1017']) {
      expect(isTransientError({ code })).toBe(true);
    }
  });

  it('flags Node net codes as transient', () => {
    for (const code of ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN']) {
      expect(isTransientError({ code })).toBe(true);
    }
  });

  it('does NOT flag non-transient errors', () => {
    expect(isTransientError({ code: 'P2002' })).toBe(false); // unique violation
    expect(isTransientError({ code: 'P2025' })).toBe(false); // not found
    expect(isTransientError(new Error('boom'))).toBe(false);
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper: drive fake timers until the pending promise settles.
  async function run<T>(p: Promise<T>): Promise<T> {
    let done = false;
    const wrapped = p.finally(() => {
      done = true;
    });
    while (!done) {
      // flush microtasks between timer advances
      await Promise.resolve();
      await Promise.resolve();
      if (done) break;
      jest.advanceTimersByTime(50);
    }
    return wrapped;
  }

  it('retries a transient error and eventually succeeds', async () => {
    let calls = 0;
    const fn = jest.fn(async () => {
      calls++;
      if (calls < 3) {
        const e: any = new Error('transient');
        e.code = 'ECONNRESET';
        throw e;
      }
      return 'ok';
    });

    const result = await run(withRetry(fn, { jitter: false }));
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('gives up after maxAttempts and throws the last error', async () => {
    const err: any = new Error('down');
    err.code = 'P1001';
    const fn = jest.fn(async () => {
      throw err;
    });

    await expect(
      run(withRetry(fn, { maxAttempts: 3, jitter: false })),
    ).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-transient errors', async () => {
    const err: any = new Error('dup');
    err.code = 'P2002';
    const fn = jest.fn(async () => {
      throw err;
    });

    await expect(run(withRetry(fn))).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respects an AbortSignal during backoff', async () => {
    const err: any = new Error('nope');
    err.code = 'ETIMEDOUT';
    const fn = jest.fn(async () => {
      throw err;
    });
    const ctrl = new AbortController();

    const p = withRetry(fn, {
      maxAttempts: 5,
      jitter: false,
      signal: ctrl.signal,
    });
    // Reject handler must be attached before abort fires.
    const assertion = expect(run(p)).rejects.toBeDefined();
    ctrl.abort(new Error('cancelled'));
    await assertion;
    expect(fn.mock.calls.length).toBeLessThan(5);
  });

  it('respects timeoutMs and aborts once the deadline passes', async () => {
    const err: any = new Error('slow');
    err.code = 'P1002';
    const fn = jest.fn(async () => {
      throw err;
    });

    // Deadline shorter than the first backoff window should bail quickly.
    await expect(
      run(
        withRetry(fn, {
          maxAttempts: 10,
          baseDelayMs: 1000,
          jitter: false,
          timeoutMs: 50,
        }),
      ),
    ).rejects.toBeDefined();
    expect(fn.mock.calls.length).toBeLessThan(10);
  });

  it('uses exponential backoff (delays roughly double)', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    const spy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((cb: any, ms?: number, ...args: any[]) => {
        if (typeof ms === 'number') delays.push(ms);
        return originalSetTimeout(cb, ms as number, ...args);
      });

    const err: any = new Error('flap');
    err.code = 'ECONNRESET';
    const fn = jest.fn(async () => {
      throw err;
    });

    await expect(
      run(
        withRetry(fn, {
          maxAttempts: 4,
          baseDelayMs: 100,
          factor: 2,
          jitter: false,
        }),
      ),
    ).rejects.toBe(err);

    // Expect 3 backoff sleeps (between 4 attempts) of 100, 200, 400.
    expect(delays).toEqual(expect.arrayContaining([100, 200, 400]));
    const idx100 = delays.indexOf(100);
    const idx200 = delays.indexOf(200);
    const idx400 = delays.indexOf(400);
    expect(idx100).toBeLessThan(idx200);
    expect(idx200).toBeLessThan(idx400);

    spy.mockRestore();
  });
});
