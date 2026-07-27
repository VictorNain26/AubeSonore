import { describe, it, expect } from 'bun:test';
import { createSingleFlight } from './singleFlight';

async function rejectionMessage(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'promise resolved instead of rejecting';
  } catch (err) {
    return (err as Error).message;
  }
}

describe('createSingleFlight', () => {
  it('runs the worker once for concurrent calls sharing a key', async () => {
    const flight = createSingleFlight<string>();
    let calls = 0;
    const work = async (): Promise<string> => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return 'value';
    };

    const results = await Promise.all([flight('k', work), flight('k', work), flight('k', work)]);

    expect(results).toEqual(['value', 'value', 'value']);
    expect(calls).toBe(1);
  });

  it('runs the worker again once the first call settled', async () => {
    const flight = createSingleFlight<number>();
    let calls = 0;
    const work = (): Promise<number> => Promise.resolve(++calls);

    await flight('k', work);
    await flight('k', work);

    expect(calls).toBe(2);
  });

  it('keeps distinct keys independent', async () => {
    const flight = createSingleFlight<string>();

    const results = await Promise.all([
      flight('a', () => Promise.resolve('a')),
      flight('b', () => Promise.resolve('b')),
    ]);

    expect(results).toEqual(['a', 'b']);
  });

  it('propagates rejection to every caller and clears the slot', async () => {
    const flight = createSingleFlight<string>();
    let calls = 0;
    const boom = (): Promise<string> => {
      calls++;
      return Promise.reject(new Error('upstream down'));
    };

    const first = flight('k', boom);
    const second = flight('k', boom);

    expect(await rejectionMessage(first)).toBe('upstream down');
    expect(await rejectionMessage(second)).toBe('upstream down');
    expect(calls).toBe(1);

    expect(await rejectionMessage(flight('k', boom))).toBe('upstream down');
    expect(calls).toBe(2);
  });

  it('does not leak the slot after a synchronous throw', () => {
    const flight = createSingleFlight<string>();
    let calls = 0;
    const throws = (): Promise<string> => {
      calls++;
      throw new Error('sync boom');
    };

    expect(() => flight('k', throws)).toThrow('sync boom');
    expect(() => flight('k', throws)).toThrow('sync boom');
    expect(calls).toBe(2);
  });
});
