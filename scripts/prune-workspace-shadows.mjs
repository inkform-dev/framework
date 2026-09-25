#!/usr/bin/env node
/**
 * Safety net against a `@inkform/*` internal package being materialized as a
 * real, physical copy inside a consuming workspace's own node_modules (e.g.
 * `examples/pokeapi-docs/node_modules/@inkform/framework`) instead of
 * resolving through the root-level symlink to `packages/framework`. When that
 * happens, Node's module resolution finds the nested copy FIRST — an
 * arbitrarily stale snapshot, missing exports and fields added since —
 * silently shadowing the live workspace source and breaking typecheck/build
 * in confusing ways.
 *
 * This is NOT an npm quirk, which is what this comment used to claim. The
 * cause was a version range: every template and example declared
 * `"@inkform/framework": "^0.3.0"` while `packages/framework` had moved to
 * 0.4.0. For a 0.x package `^0.3.0` means `>=0.3.0 <0.4.0`, so the local
 * workspace no longer satisfied it and npm correctly went to the registry
 * for a real 0.3.0 — in all six workspaces, recorded in the lockfile. Those
 * ranges now track the current major, so nothing should be pruned. Kept
 * because the failure is silent and confusing when it does happen; if this
 * script starts reporting again, suspect a range that has drifted out of
 * step with `packages/framework`'s version rather than npm.
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
