/**
 * `<base>/llms.txt`: the llms.txt index (https://llmstxt.org) from the
 * framework's builder, with links under this site's docs base.
 */
import type { APIRoute } from 'astro';
import config from 'virtual:@inkform/astro/config';
import { buildLlmsTxt } from '@inkform/framework/llms-txt';
import { joinHref } from '@inkform/framework/routes';
import { loadSite } from '../runtime/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  const site = await loadSite();
  const body = await buildLlmsTxt({
    basePath: config.publicBase,
    apiBasePath: site.api ? joinHref(config.publicBase, site.api.slug) : undefined,
  });
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
