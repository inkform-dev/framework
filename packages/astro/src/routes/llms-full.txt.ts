/** `<base>/llms-full.txt`: every doc page, the API spec as Markdown, changelog and blog, in one file. */
import type { APIRoute } from 'astro';
import { buildLlmsFullTxt } from '@inkform/framework/llms-txt';
import { loadSite } from '../runtime/site';

export const prerender = true;

export const GET: APIRoute = async () => {
  // Loading the site points the framework's loaders at this site's content.
  await loadSite();
  return new Response(await buildLlmsFullTxt(), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
