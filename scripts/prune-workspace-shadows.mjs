#!/usr/bin/env node
/**
 * npm workspaces occasionally materializes a real, physical copy of a
 * `@inkform/*` internal package inside a consuming workspace's own
 * node_modules (e.g. `examples/pokeapi-docs/node_modules/@inkform/framework`)
 * instead of relying on the root-level symlink to `packages/framework`. When
 * that happens, Node's module resolution finds the nested copy FIRST — which
 * can be an arbitrarily stale snapshot (observed: frozen at an old version,
 * missing exports and fields added since) — silently shadowing the real,
 * live workspace source and breaking typecheck/build in confusing ways.
 *
 * Every internal `@inkform/*` package is workspace-local; there is never a
 * reason to keep a nested copy. Runs automatically via `postinstall` so
 * `npm install` always ends in a correctly-linked state, not just whenever
 * someone happens to notice and clean it up by hand.
 */
import { readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const workspaceDirs = ['examples', 'templates'];

let pruned = 0;
for (const dir of workspaceDirs) {
  const base = path.join(root, dir);
  let entries;
  try {
    entries = readdirSync(base);
  } catch {
    continue;
  }
  for (const entry of entries) {
    const shadow = path.join(base, entry, 'node_modules', '@inkform');
    try {
      if (statSync(shadow).isDirectory()) {
        rmSync(shadow, { recursive: true, force: true });
        pruned++;
      }
    } catch {
      // doesn't exist — nothing to prune
    }
  }
}

if (pruned > 0) {
  console.log(`[prune-workspace-shadows] removed ${pruned} stale nested @inkform/* node_modules shadow(s)`);
}
