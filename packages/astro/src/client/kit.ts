/**
 * Behaviour for the MDX kit's interactive components, over the HTML the
 * framework's React components rendered at build time:
 *
 * - `<Tabs>` / `<Tab>` and `<CodeGroup>`: switch panels.
 * - `<Accordion>` and `<Expandable>`: native <details>, nothing to do.
 * - `<NewsletterCTA>`: submits the email to its endpoint as JSON.
 */

import { childrenWithClass, wireTabs } from './tabs';

function initTabSets(root: ParentNode, container: string, trigger: string, panel: string): void {
  for (const el of root.querySelectorAll<HTMLElement>(`.${container}`)) {
    if (el.dataset.fwReady) continue;
    el.dataset.fwReady = '';
    const bar = [...el.children].find((c) => c.getAttribute('role') === 'tablist');
    if (!bar) continue;
    wireTabs({ tabs: childrenWithClass(bar, trigger), panels: childrenWithClass(el, panel), activeClass: `${trigger}--active` });
  }
}

function initSubscribeForms(root: ParentNode): void {
  for (const form of root.querySelectorAll<HTMLFormElement>('form[data-fw-subscribe]')) {
    if (form.dataset.fwReady) continue;
    form.dataset.fwReady = '';
    const input = form.querySelector<HTMLInputElement>('input[type="email"]');
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!input || !button) continue;

    const sync = () => {
      button.disabled = !input.value.trim();
    };
    input.addEventListener('input', sync);
    sync();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!email) return;
      form.querySelector('.fw-subscribe-error')?.remove();
      input.disabled = true;
      button.disabled = true;
      button.textContent = '…';
      try {
        const res = await fetch(form.dataset.endpoint ?? '/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ projectId: form.dataset.projectId, email, source: 'site' }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? 'Subscription failed');
        const done = document.createElement('p');
        done.className = 'fw-subscribe-done';
        done.textContent = 'Thanks — you’re subscribed.';
        form.replaceWith(done);
      } catch (err) {
        const error = document.createElement('p');
        error.className = 'fw-subscribe-error';
        error.textContent = err instanceof Error ? err.message : 'Subscription failed';
        form.append(error);
        input.disabled = false;
        button.textContent = 'Subscribe';
        sync();
      }
    });
  }
}

export function initKit(root: ParentNode = document): void {
  initTabSets(root, 'fw-tabs', 'fw-tabs-trigger', 'fw-tabs-panel');
  initTabSets(root, 'fw-codegroup', 'fw-codegroup-trigger', 'fw-codegroup-panel');
  initSubscribeForms(root);
}
