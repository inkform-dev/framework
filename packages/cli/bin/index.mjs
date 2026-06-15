#!/usr/bin/env node
import { run } from '../src/scaffold.mjs';

run(process.argv.slice(2)).catch((err) => {
  console.error('\n' + (err?.stack || err?.message || String(err)));
  process.exit(1);
});
