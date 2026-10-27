/**
 * `<base>/llms.txt`: the llms.txt index (https://llmstxt.org), with links
 * written like every other link on this site (see ../runtime/llms.ts).
 */
import type { APIRoute } from 'astro';
import { loadDocPage } from '@inkform/framework/content';
import { llmsIndex } from '../runtime/llms';
import { BLOG_PATH, CHANGELOG_PATH, operationPath } from '../runtime/routes';
import { loadSite } from '../runtime/site';

export const prerender = true;

const text = (value: unknown) => (typeof value === 'string' ? value : null);

export const GET: APIRoute = async () => {
  const site = await loadSite();
  const api = site.api;
  const body = llmsIndex(
    {
      name: site.config.name,
      docs: site.routes.flatMap((route) =>
        route.kind === 'doc'
          ? [{ title: route.page.title, path: route.path, description: text(loadDocPage(route.page.file)?.data.description) }]
          : [],
      ),
      operations: api
        ? api.tree.tagGroups.flatMap((group) =>
            group.operations.map((op) => ({
              title: op.summary || op.operationId,
              path: operationPath(api.slug, op.operationId),
              method: op.method,
              apiPath: op.path,
            })),
          )
        : [],
      changelog: site.changelog.length > 0 ? CHANGELOG_PATH : null,
      blog: site.blog.map((post) => ({ title: post.title, path: `${BLOG_PATH}/${post.slug}`, description: post.description })),
    },
    site.link,
  );
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
