#!/usr/bin/env node
/**
 * CLI entry point for breaking-change detection — the piece a CI job
 * actually invokes. Takes two OpenAPI spec files (JSON or YAML, format
 * auto-detected), parses + bundles + dereferences both, diffs them, prints
 * a Markdown report, and exits 1 if any breaking change was found (0
 * otherwise) — a normal "fail the check" exit code a GitHub Actions step
 * can gate on.
 *
 * Usage:
 *   npx tsx packages/framework/bin/diff-openapi.ts <before> <after>
 *
 * See .github/workflows/openapi-breaking-changes.yml for the reference CI
 * wiring (diffs the PR's spec against the base branch's version and posts
 * the report as a PR comment) — that workflow is documentation/a template,
 * not something this change activates on its own; a maintainer opts in by
 * merging it like any other workflow file.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { diffOpenApiDocuments, formatDiffAsMarkdown } from '../src/openapi-engine/breaking-changes';
import { parseOpenApiDocument } from '../src/openapi-engine/parse';

async function loadSpec(file: string) {
  const raw = readFileSync(file, 'utf-8');
  const format = /\.ya?ml$/i.test(file) ? 'yaml' : 'json';
  const { schema, valid, errors } = await parseOpenApiDocument(raw, { format, baseDir: path.dirname(path.resolve(file)) });
  if (!valid && Object.keys(schema).length === 0) {
    throw new Error(`Could not parse ${file}: ${errors.map((e) => e.message).join('; ')}`);
  }
  return schema;
}

async function main() {
  const [beforeFile, afterFile] = process.argv.slice(2);
  if (!beforeFile || !afterFile) {
    console.error('Usage: diff-openapi <before-spec> <after-spec>');
    process.exit(2);
  }

  const [before, after] = await Promise.all([loadSpec(beforeFile), loadSpec(afterFile)]);
  const result = diffOpenApiDocuments(before, after);

  console.log(formatDiffAsMarkdown(result));

  if (result.breaking.length > 0) {
    console.error(`\n${result.breaking.length} breaking change(s) found.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(2);
});
