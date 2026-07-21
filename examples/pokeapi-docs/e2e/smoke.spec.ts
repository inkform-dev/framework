import { expect, test } from '@playwright/test';

/**
 * Real-browser smoke test against a real production build of pokeapi-docs.
 * Covers what Vitest's jsdom-less unit tests can't: actual navigation, real
 * client-side hydration, a real cross-origin fetch from Try-It, and a real
 * Pagefind index built from real HTML (Pagefind only runs in the browser —
 * see mcp/tools.ts's header comment — so this is the only way to verify it
 * at all). Try-It's request is the one real network call this suite makes
 * to the live PokeAPI — one call, not a loop, consistent with this
 * project's "test real APIs lightly" convention.
 */

test('native API reference page renders a real operation, tagged for search', async ({ page }) => {
  await page.goto('/api-reference/operations/get-pokemon');

  await expect(page.getByRole('heading', { name: 'Get a Pokémon' })).toBeVisible();
  // Scoped to the page header, not the sidebar — every operation's nav link
  // also renders a .fw-method-get pill, so an unscoped locator is ambiguous.
  const header = page.locator('.fw-apiref-endpoint');
  await expect(header.locator('.fw-method-get')).toBeVisible();
  await expect(header.locator('.fw-apiref-path')).toContainText('/pokemon/{name}');
  await expect(header.locator('.fw-apiref-operation-id')).toContainText('get-pokemon');

  // The Pagefind search-facet region (docs-shell.tsx's data-pagefind-filter) —
  // confirms Task 38's search-facet wiring reaches the real rendered page.
  await expect(page.locator('[data-pagefind-filter="type:API"]')).toHaveCount(1);
});

test('Try It console makes a real request and shows a real response', async ({ page }) => {
  await page.goto('/api-reference/operations/get-pokemon');

  await page.locator('.fw-apiref-tryit').click();
  await expect(page.locator('.fw-playground-overlay')).toBeVisible();

  await page
    .locator('.fw-playground-group', { hasText: 'Path Parameters' })
    .locator('.fw-playground-input')
    .fill('pikachu');

  await page.locator('.fw-playground-send').click();

  await expect(page.locator('.fw-response-status--ok')).toContainText('200', { timeout: 15_000 });
  await expect(page.locator('.fw-playground-response-body')).toContainText('"pikachu"');
});

test('search finds a real page across doc and API content', async ({ page }) => {
  await page.goto('/');

  await page.locator('.fw-search-trigger').click();
  await page.locator('.fw-search-input').fill('pikachu');

  await expect(page.locator('.fw-search-result-title').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.fw-search-results li')).not.toHaveCount(0);
});

test('ask-box renders its disabled state when NEXT_PUBLIC_DOCS_AI_ENABLED is unset', async ({ page }) => {
  await page.goto('/');

  await page.locator('.fw-askai-trigger').click();
  await expect(page.locator('.fw-askai-disabled-notice')).toBeVisible();
  await expect(page.locator('.fw-askai-disabled-notice')).toContainText('coming soon');

  const input = page.locator('.fw-askai-input');
  await expect(input).toBeDisabled();
});
