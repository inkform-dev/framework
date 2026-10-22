/**
 * API operation pages, without React: the code sample language picker and
 * copy button, the response sample tabs, and the Try It console. The markup
 * comes from the framework's OperationPage (rendered at build time) and
 * TryIt.astro; requests go through the framework's own request executor.
 */

import type { ApiOperation } from '@inkform/framework/openapi';
import { buildTryItRequest, executeTryItRequest, type TryItResult } from '@inkform/framework/openapi-render/try-it';
import { childrenWithClass, wireTabs } from './tabs';

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** The request sample card: a <select> of languages over pre-rendered samples, and Copy. */
function initSampleBlocks(): void {
  for (const block of document.querySelectorAll<HTMLElement>('.fw-apiref-sample-block')) {
    const samples = childrenWithClass(block, 'fw-apiref-sample-code');
    const select = block.querySelector<HTMLSelectElement>('.fw-apiref-sample-select');
    if (select) {
      select.addEventListener('change', () => {
        const index = Number(select.value);
        samples.forEach((s, i) => (s.hidden = i !== index));
      });
    }
    const copyButton = block.querySelector<HTMLButtonElement>('.fw-apiref-sample-copy');
    copyButton?.addEventListener('click', async () => {
      const visible = samples.find((s) => !s.hidden);
      if (!visible || !(await copy(visible.querySelector('code')?.textContent ?? visible.textContent ?? ''))) return;
      copyButton.textContent = 'Copied';
      setTimeout(() => (copyButton.textContent = 'Copy'), 1500);
    });

    const tabBar = [...block.children].find((c) => c.classList.contains('fw-apiref-response-tabs'));
    if (tabBar) {
      wireTabs({
        tabs: childrenWithClass(tabBar, 'fw-apiref-response-tab'),
        panels: samples,
        activeClass: 'fw-apiref-response-tab--active',
      });
    }
  }
}

function prettyPrint(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The framework ResponseViewer's markup, built with textContent only. */
function responseView(result: TryItResult, streaming: boolean): HTMLElement {
  const ok = result.ok && result.status >= 200 && result.status < 300;
  const root = el('div', `fw-playground-response fw-playground-response--${result.error ? 'error' : 'done'}`);
  const meta = el('div', 'fw-playground-response-meta');
  meta.append(
    result.error
      ? el('span', 'fw-response-status fw-response-status--err', 'Error')
      : el('span', `fw-response-status fw-response-status--${ok ? 'ok' : 'err'}`, `${result.status} ${result.statusText}`),
    el('span', 'fw-playground-timing', `${streaming ? 'streaming… ' : ''}${Math.round(result.durationMs)}ms`),
  );
  root.append(meta);

  const bodyBlock = (text: string) => {
    const pre = el('pre', 'fw-playground-response-body');
    pre.append(el('code', undefined, text));
    return pre;
  };
  if (result.error) {
    root.append(bodyBlock(result.error));
    return root;
  }
  if (result.headers.length > 0) {
    const details = el('details', 'fw-playground-curl-details');
    details.append(el('summary', 'fw-playground-curl-summary', `Headers (${result.headers.length})`));
    const pre = el('pre', 'fw-playground-curl');
    pre.append(el('code', undefined, result.headers.map(([k, v]) => `${k}: ${v}`).join('\n')));
    details.append(pre);
    root.append(details);
  }
  root.append(bodyBlock(prettyPrint(result.bodyText)));
  return root;
}

function values(dialog: HTMLElement, selector: string, key: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const input of dialog.querySelectorAll<HTMLInputElement>(selector)) {
    const name = input.getAttribute(key);
    if (name) out[name] = input.value;
  }
  return out;
}

function initTryIt(): void {
  const dialog = document.querySelector<HTMLElement>('[data-fw-tryit]');
  const trigger = document.querySelector<HTMLButtonElement>('.fw-apiref-tryit');
  if (!dialog || !trigger) return;
  const operation = JSON.parse(dialog.dataset.operation ?? 'null') as ApiOperation | null;
  if (!operation) return;

  const result = dialog.querySelector<HTMLElement>('[data-fw-tryit-result]');
  const send = dialog.querySelector<HTMLButtonElement>('[data-fw-tryit-send]');

  const close = () => {
    dialog.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  };
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', () => {
    dialog.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    dialog.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea, [data-fw-tryit-send]')?.focus();
  });
  for (const c of dialog.querySelectorAll('[data-fw-tryit-close]')) c.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dialog.hidden) close();
  });

  send?.addEventListener('click', async () => {
    if (!result) return;
    const isMultipart = operation.requestBody?.contentType === 'multipart/form-data';
    let bodyFormData: FormData | undefined;
    if (isMultipart) {
      bodyFormData = new FormData();
      for (const [name, value] of Object.entries(values(dialog, '[data-fw-tryit-field]', 'data-fw-tryit-field'))) {
        if (value !== '') bodyFormData.append(name, value);
      }
      for (const input of dialog.querySelectorAll<HTMLInputElement>('[data-fw-tryit-file]')) {
        const file = input.files?.[0];
        const name = input.getAttribute('data-fw-tryit-file');
        if (file && name) bodyFormData.append(name, file);
      }
    }
    const bodyText = dialog.querySelector<HTMLTextAreaElement>('[data-fw-tryit-body]')?.value;
    const auth = values(dialog, '[data-fw-tryit-auth]', 'data-fw-tryit-auth');
    const params = (kind: string) => {
      const out: Record<string, string> = {};
      for (const input of dialog.querySelectorAll<HTMLInputElement>(`[data-fw-tryit-param="${kind}"]`)) {
        if (input.dataset.name) out[input.dataset.name] = input.value;
      }
      return out;
    };

    let request: Request;
    try {
      request = buildTryItRequest({
        operation,
        serverUrl: dialog.querySelector<HTMLInputElement | HTMLSelectElement>('[data-fw-tryit-server]')?.value ?? '/',
        pathValues: params('path'),
        queryValues: params('query'),
        headerValues: params('header'),
        auth: operation.security.map((scheme) => ({ scheme, value: auth[scheme.key] ?? '' })),
        bodyContentType: operation.requestBody?.contentType,
        bodyText: isMultipart ? undefined : bodyText || undefined,
        bodyFormData,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request';
      result.replaceChildren(responseView({ ok: false, status: 0, statusText: '', headers: [], bodyText: '', durationMs: 0, error: message }, false));
      return;
    }

    send.disabled = true;
    send.textContent = 'Sending…';
    const final = await executeTryItRequest(request, (accumulated) => {
      send.textContent = 'Receiving…';
      result.replaceChildren(responseView({ ok: true, status: 0, statusText: '', headers: [], bodyText: accumulated, durationMs: 0 }, true));
    });
    result.replaceChildren(responseView(final, false));
    send.disabled = false;
    send.textContent = 'Send Request';
  });
}

let started = false;

export function initApi(): void {
  if (started) return;
  started = true;
  initSampleBlocks();
  initTryIt();
}
