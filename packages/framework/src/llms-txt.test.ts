import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildLlmsFullTxt, buildLlmsTxt } from './llms-txt';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const POKEAPI_CONTENT_ROOT = path.join(REPO_ROOT, 'examples', 'pokeapi-docs', 'content');

describe('llms.txt / llms-full.txt (real pokeapi-docs content, via DOCS_CONTENT_ROOT)', () => {
  beforeEach(() => {
    process.env.DOCS_CONTENT_ROOT = POKEAPI_CONTENT_ROOT;
  });
  afterEach(() => {
    delete process.env.DOCS_CONTENT_ROOT;
  });

  describe('buildLlmsTxt', () => {
    it('starts with an H1 title and a blockquote summary', async () => {
      const txt = await buildLlmsTxt();
      const lines = txt.split('\n');
      expect(lines[0]).toBe('# PokéAPI Docs');
      expect(lines[2]).toMatch(/^> /);
    });

    it('lists doc pages with real frontmatter descriptions', async () => {
      const txt = await buildLlmsTxt();
      expect(txt).toContain('## Docs');
      expect(txt).toMatch(/- \[Quickstart\]\(\/quickstart\): .+/);
    });

    it('lists API operations under the given apiBasePath with method + path', async () => {
      const txt = await buildLlmsTxt({ apiBasePath: '/api-reference' });
      expect(txt).toContain('## API Reference');
      expect(txt).toContain('(/api-reference/operations/get-pokemon): GET /pokemon/{name}');
    });

    it('defaults apiBasePath to /api-reference when not given', async () => {
      const txt = await buildLlmsTxt();
      expect(txt).toContain('/api-reference/operations/get-pokemon');
    });

    it('links to /changelog once when changelog entries exist, and lists real blog posts', async () => {
      const txt = await buildLlmsTxt();
      expect(txt).toContain('## Changelog');
      expect(txt).toContain('- [Changelog](/changelog)');
      expect(txt).toContain('## Blog');
      expect(txt).toMatch(/- \[.+\]\(\/blog\/building-a-pokedex-with-nextjs\)/);
    });

    it('returns an empty string when no docs.json is configured', async () => {
      process.env.DOCS_CONTENT_ROOT = path.join(REPO_ROOT, 'this-directory-does-not-exist');
      expect(await buildLlmsTxt()).toBe('');
    });
  });

  describe('buildLlmsFullTxt', () => {
    it('concatenates real doc page content under H1 titles', async () => {
      const txt = await buildLlmsFullTxt();
      expect(txt).toContain('# Quickstart');
      expect(txt).toContain('PokéAPI requires zero configuration.');
    });

    it('includes the full OpenAPI spec as markdown, matching the MCP renderer output', async () => {
      const txt = await buildLlmsFullTxt();
      expect(txt).toContain('# API Reference');
      expect(txt).toContain('GET /pokemon/{name}');
    });

    it('includes full changelog and blog content, not just excerpts', async () => {
      const txt = await buildLlmsFullTxt();
      expect(txt).toContain('# Changelog');
      expect(txt).toContain('# Blog');
      expect(txt.length).toBeGreaterThan(2000);
    });

    it('returns an empty string when no docs.json is configured', async () => {
      process.env.DOCS_CONTENT_ROOT = path.join(REPO_ROOT, 'this-directory-does-not-exist');
      expect(await buildLlmsFullTxt()).toBe('');
    });
  });
});
