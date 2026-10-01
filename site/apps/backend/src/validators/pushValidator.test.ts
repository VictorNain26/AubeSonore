import { describe, it, expect } from 'bun:test';
import { safeParse } from 'valibot';
import { unsubscribeSchema } from './pushValidator';

describe('unsubscribeSchema', () => {
  it('accepts valid https endpoint', () => {
    const result = safeParse(unsubscribeSchema, { endpoint: 'https://fcm.googleapis.com/abc' });
    expect(result.success).toBe(true);
  });

  it('rejects http endpoint', () => {
    const result = safeParse(unsubscribeSchema, { endpoint: 'http://fcm.googleapis.com/abc' });
    expect(result.success).toBe(false);
  });

  it('rejects missing endpoint', () => {
    const result = safeParse(unsubscribeSchema, {});
    expect(result.success).toBe(false);
  });
});
