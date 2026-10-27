import { expect, test, type Page } from '@playwright/test';

// Nothing leaves the test server: the YouTube embed, external links and the
// Try It target are blocked unless a test routes them itself.
test.beforeEach(async ({ context }) => {
  await context.route(
    (url) => url.hostname !== '127.0.0.1',
    (route) => route.abort(),
  );
});

/** Records CSP violations and uncaught errors from the moment the page starts loading. */
async function watch(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return {
    errors,
    csp: () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp),
  };
}

const PAGES = [
  ['/docs', 'Introduction'],
  ['/docs/quickstart', 'Quickstart'],
  ['/docs/guides/astro', 'Host an Astro site'],
  ['/docs/guides/csp', 'Content Security Policy'],
  ['/docs/essentials/components', 'Components'],
  ['/docs/essentials/markdown', 'Markdown Syntax'],
  ['/docs/essentials/code-blocks', 'Code Blocks'],
  ['/docs/essentials/navigation', 'Navigation'],
  ['/docs/api-reference', 'Sample Store API'],
  ['/docs/api-reference/operations/list-plants', 'List plants'],
  ['/docs/api-reference/operations/create-plant', 'Create a plant'],
  ['/docs/api-reference/operations/delete-plant', 'Delete a plant'],
  ['/docs/blog', 'Blog'],
  ['/docs/blog/hello-astro', 'Inkform on Astro'],
  ['/docs/changelog', 'Changelog'],
] as const;

test.describe('pages', () => {
  for (const [path, title] of PAGES) {
    test(`${path} renders with no CSP violations or errors`, async ({ page }) => {
      const seen = await watch(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator('main h1').first()).toHaveText(title);
      await expect(page.locator('.fw-shell-header')).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(await seen.csp()).toEqual([]);
      expect(seen.errors).toEqual([]);
    });
  }

  test('the host keeps its own home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Host site' })).toBeVisible();
    await expect(page.locator('.fw-shell')).toHaveCount(0);
  });

  test('an unknown docs URL is a 404', async ({ request }) => {
    expect((await request.get('/docs/does-not-exist')).status()).toBe(404);
  });

  test('llms.txt and llms-full.txt list the site under /docs', async ({ request }) => {
    const index = await (await request.get('/docs/llms.txt')).text();
    expect(index).toMatch(/^# Inkform on Astro/);
    expect(index).toContain('- [Quickstart](/docs/quickstart)');
    expect(index).toContain('(/docs/api-reference/operations/create-plant): POST /plants');
    expect(index).toContain('- [Inkform on Astro](/docs/blog/hello-astro)');
    const full = await (await request.get('/docs/llms-full.txt')).text();
    expect(full).toContain('# API Reference');
    expect(full).toContain('# Changelog');
  });
});

test.describe('shell', () => {
  test('sidebar, breadcrumbs, TOC and pagination come from docs.json', async ({ page }) => {
    await page.goto('/docs/guides/csp');
    const active = page.locator('.fw-shell-sidebar .fw-sidebar-item--active a');
    await expect(active).toHaveText('Content Security Policy');
    await expect(page.locator('.fw-shell-sidebar .fw-sidebar-depth-1')).toHaveCount(1);
    await expect(page.locator('.fw-breadcrumbs-list')).toContainText('Host an Astro site');
    await expect(page.locator('.fw-toc-link')).toHaveText(['No inline handlers']);
    await expect(page.locator('.fw-pagination-next')).toHaveAttribute('href', '/docs/essentials/components');
  });

  test('the TOC marks the heading in view', async ({ page }) => {
    await page.goto('/docs/essentials/components');
    // The highlight follows the topmost heading in view, as in the framework's TocList.
    await page.locator('#diagrams').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect(page.locator('.fw-toc-link[data-active="true"]')).toHaveText('Diagrams');
  });

  test('the theme toggle switches to dark and remembers it', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/docs');
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);
    const toggle = page.locator('[data-fw-theme-toggle]');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark theme');
    await toggle.click();
    await expect(html).toHaveClass(/dark/);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(html).toHaveClass(/dark/);
  });

  test('pages fit a 375px phone without scrolling sideways', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of ['/docs', '/docs/quickstart', '/docs/api-reference/operations/create-plant', '/docs/changelog']) {
      await page.goto(path);
      const widths = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        header: document.querySelector('.fw-shell-header-inner')?.scrollWidth,
      }));
      expect(widths, path).toEqual({ page: 375, header: 375 });
      await expect(page.locator('.fw-theme-toggle'), path).toBeInViewport({ ratio: 1 });
    }
  });

  test('the mobile drawer opens, closes on Escape, and holds the nav', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/docs/quickstart');
    const button = page.locator('[data-fw-drawer-toggle]');
    const drawer = page.locator('[data-fw-drawer]');
    await expect(page.locator('.fw-shell-sidebar')).toBeHidden();
    await button.click();
    await expect(drawer).toHaveClass(/fw-sidebar-drawer--open/);
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer.getByRole('link', { name: 'Components' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'API Reference' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).not.toHaveClass(/fw-sidebar-drawer--open/);
    await button.click();
    await page.locator('.fw-sidebar-backdrop').click({ position: { x: 380, y: 400 } });
    await expect(drawer).not.toHaveClass(/fw-sidebar-drawer--open/);
  });
});

test.describe('components', () => {
  test('every kit component is on the page', async ({ page }) => {
    await page.goto('/docs/essentials/components');
    const prose = page.locator('main .fw-prose');
    for (const selector of [
      '.fw-callout-info',
      '.fw-callout-warning',
      '.fw-callout-error',
      '.fw-callout-success',
      '.fw-cardgroup .fw-card',
      '.fw-card--horizontal',
      '.fw-columns',
      '.fw-steps .fw-step',
      '.fw-tabs',
      '.fw-accordion-group .fw-accordion',
      '.fw-codegroup',
      '.fw-mdx-param',
      '.fw-response-field',
      '.fw-expandable',
      '.fw-frame',
      '.fw-embed iframe',
      '.fw-tooltip',
      '.fw-mermaid',
      '.fw-mdx-apiref',
      '.fw-authorbio',
      '.fw-related',
      '.fw-cta .fw-subscribe',
      '.fw-playground',
      '.fw-unknown',
    ]) {
      await expect(prose.locator(selector).first(), selector).toBeAttached();
    }
  });

  test('a component from the site’s components module renders in MDX', async ({ page }) => {
    await page.goto('/docs/essentials/components');
    const shot = page.locator('main .fw-prose .fw-frame .example-shot');
    await expect(shot).toHaveAttribute('data-shot', 'settings-page.png');
    await expect(shot).toHaveText('Screenshot coming');
    await expect(page.locator('main .fw-prose .fw-frame-caption', { hasText: 'The settings page.' })).toBeVisible();
  });

  test('tabs switch on click and with the arrow keys', async ({ page }) => {
    await page.goto('/docs/essentials/components');
    const tabs = page.locator('.fw-tabs').first();
    const panels = tabs.locator(':scope > .fw-tabs-panel');
    await expect(panels.nth(0)).toBeVisible();
    await expect(panels.nth(1)).toBeHidden();
    await tabs.getByRole('tab', { name: 'Windows' }).click();
    await expect(panels.nth(1)).toBeVisible();
    await expect(panels.nth(0)).toBeHidden();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.getByRole('tab', { name: 'Linux' })).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.getByRole('tab', { name: 'Linux' })).toBeFocused();
    await expect(panels.nth(2)).toBeVisible();
  });

  test('code groups switch between snippets', async ({ page }) => {
    await page.goto('/docs/essentials/components');
    const group = page.locator('.fw-codegroup').first();
    const panels = group.locator(':scope > .fw-codegroup-panel');
    await expect(group.getByRole('tab')).toHaveText(['npm', 'pnpm', 'yarn']);
    await group.getByRole('tab', { name: 'pnpm' }).click();
    await expect(panels.nth(1)).toBeVisible();
    await expect(panels.nth(1)).toContainText('pnpm add @inkform/astro');
    await expect(panels.nth(0)).toBeHidden();
  });

  test('accordions open and close', async ({ page }) => {
    await page.goto('/docs/essentials/components');
    const accordion = page.locator('.fw-accordion-group .fw-accordion').first();
    await expect(accordion).not.toHaveAttribute('open', '');
    await accordion.locator('summary').click();
    await expect(accordion).toHaveAttribute('open', '');
    await expect(accordion.locator('.fw-accordion-body')).toBeVisible();
  });

  test('mermaid fences become diagrams', async ({ page }) => {
    await page.goto('/docs/essentials/components');
    const figure = page.locator('figure[data-fw-mermaid]').first();
    await figure.scrollIntoViewIfNeeded();
    await expect(figure.locator('.fw-mermaid-stage svg')).toBeVisible({ timeout: 15_000 });
    await figure.hover();
    await figure.getByRole('button', { name: 'Open fullscreen' }).click();
    await expect(page.locator('dialog.fw-mermaid-dialog .fw-mermaid-stage svg')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog.fw-mermaid-dialog')).toHaveCount(0);
  });

  test('site-root links in content point into /docs', async ({ page }) => {
    await page.goto('/docs');
    await expect(page.locator('a.fw-card-link').first()).toHaveAttribute('href', '/docs/quickstart');
  });
});

test.describe('API reference', () => {
  test('the sample picker and response tabs switch', async ({ page }) => {
    await page.goto('/docs/api-reference/operations/create-plant');
    const samples = page.locator('.fw-apiref-sample-block').first().locator(':scope > .fw-apiref-sample-code');
    await expect(samples.nth(0)).toBeVisible();
    await page.locator('.fw-apiref-sample-select').selectOption({ label: 'Python' });
    await expect(samples.nth(2)).toBeVisible();
    await expect(samples.nth(2)).toContainText('requests');
    await expect(samples.nth(0)).toBeHidden();

    const responses = page.locator('.fw-apiref-sample-block').nth(1);
    await responses.getByRole('tab', { name: '400' }).click();
    await expect(responses.locator(':scope > .fw-apiref-sample-code').nth(1)).toBeVisible();
  });

  test('Try It sends the request and shows the response', async ({ page }) => {
    await page.route('https://api.example.com/v1/plants', (route) =>
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 7, name: 'Fern' }) }),
    );
    await page.goto('/docs/api-reference/operations/create-plant');
    await page.getByRole('button', { name: 'Try it' }).click();
    const dialog = page.locator('[data-fw-tryit]');
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-fw-tryit-auth="bearerAuth"]').fill('secret');
    await expect(dialog.locator('[data-fw-tryit-body]')).toHaveValue(/"name"/);
    await dialog.getByRole('button', { name: 'Send Request' }).click();
    await expect(dialog.locator('.fw-playground-response')).toContainText('201');
    await expect(dialog.locator('.fw-playground-response-body')).toContainText('"Fern"');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

test.describe('search', () => {
  test('finds a page and opens it with the words highlighted', async ({ page }) => {
    const seen = await watch(page);
    await page.goto('/docs');
    await page.keyboard.press('ControlOrMeta+k');
    const input = page.locator('[data-fw-search-input]');
    await expect(input).toBeFocused();
    await input.fill('middleware');
    const results = page.locator('[data-fw-search-results] a');
    await expect(results.first()).toBeVisible({ timeout: 10_000 });
    await expect(results.first()).toHaveAttribute('href', '/docs/guides/astro?highlight=middleware');
    await expect(results.first().locator('.fw-search-result-title')).toHaveText('Host an Astro site');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/docs\/guides\/astro\?highlight=middleware$/);
    await expect(page.locator('mark.fw-search-highlight').first()).toBeVisible();
    expect(await seen.csp()).toEqual([]);
  });

  test('finds API operations with their method', async ({ page }) => {
    await page.goto('/docs');
    await page.locator('[data-fw-search-open]').click();
    await page.locator('[data-fw-search-input]').fill('create plant');
    await expect(page.locator('[data-fw-search-results] .fw-method-pill').first()).toHaveText('POST', { timeout: 10_000 });
  });

  test('a ?q= link opens the dialog with the search', async ({ page }) => {
    await page.goto('/docs?q=diagrams');
    await expect(page.locator('[data-fw-search]')).toBeVisible();
    await expect(page.locator('[data-fw-search-input]')).toHaveValue('diagrams');
  });
});

test.describe('client bundle', () => {
  test('docs pages load no React; the host page does', async ({ page }) => {
    const scripts: string[] = [];
    page.on('response', async (r) => {
      if (r.request().resourceType() === 'script') scripts.push(await r.text());
    });
    const isReact = (code: string) => /react-dom|__SECRET_INTERNALS|react\.(production|development)|ReactDOM/.test(code);

    for (const path of ['/docs/essentials/components', '/docs/api-reference/operations/create-plant', '/docs/blog/hello-astro']) {
      scripts.length = 0;
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const inline = await page.locator('script:not([src])').allTextContents();
      expect([...scripts, ...inline].some(isReact), path).toBe(false);
    }

    scripts.length = 0;
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(scripts.some(isReact)).toBe(true);
  });
});
