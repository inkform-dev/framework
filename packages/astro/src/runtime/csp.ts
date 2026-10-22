/**
 * Hashes for the two inline elements a docs page prints: the no-flash theme
 * script and the stylesheet of moved inline styles. Astro hashes the scripts
 * and styles it bundles itself; these two are added per page through
 * `Astro.csp`, so the policy allows exactly them and nothing more.
 */

import type { CspAlgorithm } from '../options';

const DIGEST: Record<CspAlgorithm, string> = { 'SHA-256': 'sha256', 'SHA-384': 'sha384', 'SHA-512': 'sha512' };

/** `'sha256-…'` style source for `text`, as a CSP hash expects it (without the quotes). */
export async function cspHash(text: string, algorithm: CspAlgorithm = 'SHA-256'): Promise<`${'sha256' | 'sha384' | 'sha512'}-${string}`> {
  const digest = new Uint8Array(await crypto.subtle.digest(algorithm, new TextEncoder().encode(text)));
  let binary = '';
  for (const byte of digest) binary += String.fromCharCode(byte);
  return `${DIGEST[algorithm] as 'sha256' | 'sha384' | 'sha512'}-${btoa(binary)}`;
}
