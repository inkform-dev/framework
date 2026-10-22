import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { cspHash } from './csp';

describe('cspHash', () => {
  it('matches the digest a browser computes for the element’s text', async () => {
    const text = '.fw-s-1{color:red !important}';
    expect(await cspHash(text)).toBe(`sha256-${createHash('sha256').update(text).digest('base64')}`);
    expect(await cspHash(text, 'SHA-384')).toBe(`sha384-${createHash('sha384').update(text).digest('base64')}`);
  });
});
