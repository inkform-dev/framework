import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks the model call only — search/getDoc/getOperation (the actual
// retrieval/grounding logic being tested) run for real against real
// pokeapi-docs content. No API key needed, no real LLM cost.
const generateTextMock = vi.hoisted(() => vi.fn());
vi.mock('ai', () => ({ generateText: generateTextMock }));
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: () => () => 'mock-model' }));

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const POKEAPI_CONTENT_ROOT = path.join(REPO_ROOT, 'examples', 'pokeapi-docs', 'content');

describe('askDocs (real pokeapi-docs retrieval, mocked model)', () => {
  beforeEach(() => {
    process.env.DOCS_CONTENT_ROOT = POKEAPI_CONTENT_ROOT;
    generateTextMock.mockReset();
  });
  afterEach(() => {
    delete process.env.DOCS_CONTENT_ROOT;
  });

  it('grounds the system prompt in real content and returns real sources', async () => {
    generateTextMock.mockImplementation(async ({ system }: { system: string }) => {
      // Assert grounding happened BEFORE the model was ever called — the
      // system prompt must already contain real retrieved content, not a
      // placeholder the model would have to hallucinate around. Which
      // exact page ranks #1 for a natural-language phrasing legitimately
      // varies with fuzzy search (verified: get-pokemon is the reliable #1
      // for the bare keyword query "National Pokedex number" — see
      // mcp/tools.test.ts — but several pages' prose *also* mentions the
      // phrase, e.g. the Pokémon guide page describes the same field).
      // What must hold regardless of exact ranking: the phrase itself
      // reached the model.
      expect(system).toContain('National Pokédex number');
      return { text: 'The id field is the National Pokédex number.' };
    });

    const { askDocs } = await import('./ask');
    const result = await askDocs([{ role: 'user', content: 'What is the National Pokedex number?' }]);

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(result.text).toBe('The id field is the National Pokédex number.');
    expect(result.sources.length).toBeGreaterThan(0);
    // Every source came from real content, not placeholders.
    expect(result.sources.every((s) => s.id && s.title)).toBe(true);
  });

  it('builds operation source hrefs under the given apiBasePath, doc hrefs as plain slugs', async () => {
    generateTextMock.mockResolvedValue({ text: 'answer' });
    const { askDocs } = await import('./ask');

    const result = await askDocs([{ role: 'user', content: 'National Pokedex number' }], {
      apiBasePath: '/reference',
    });

    const opSource = result.sources.find((s) => s.type === 'operation');
    const docSource = result.sources.find((s) => s.type === 'doc');
    expect(opSource?.href).toBe(`/reference/operations/${opSource?.id}`);
    expect(docSource?.href).toBe(`/${docSource?.id}`);
  });

  it('does not call the model at all for an empty/whitespace-only question', async () => {
    generateTextMock.mockResolvedValue({ text: 'should not be reached' });
    const { askDocs } = await import('./ask');

    const result = await askDocs([{ role: 'user', content: '   ' }]);

    expect(generateTextMock).not.toHaveBeenCalled();
    expect(result.text).toBe('Please ask a question.');
    expect(result.sources).toEqual([]);
  });

  it('still answers (with a "not found" style prompt) when no content matches — never throws', async () => {
    generateTextMock.mockImplementation(async ({ system }: { system: string }) => {
      expect(system).toContain('No relevant content was found');
      return { text: "I don't have information about that in this documentation." };
    });
    const { askDocs } = await import('./ask');

    const result = await askDocs([{ role: 'user', content: 'zzzznonsensequerywithnomatchesxyz' }]);
    expect(result.sources).toEqual([]);
    expect(result.text).toContain("don't have information");
  });
});
