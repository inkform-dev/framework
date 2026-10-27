/**
 * The llms.txt index (https://llmstxt.org): the site's name, then grouped
 * Markdown links to its docs pages, API operations, changelog and blog posts,
 * in the format of the framework's `buildLlmsTxt()`.
 *
 * It's built here, from the route table, rather than by the framework,
 * so every link is written by the same linker as the pages themselves: under
 * `publicBase`, ending in a slash when Astro's `trailingSlash` is `'always'`,
 * and pointing at the operation URLs this site serves (a spec without
 * operationIds names them differently in the framework's own index). Pure,
 * so the output is unit-tested.
 */

import type { Linker } from './routes';

export interface LlmsLink {
  title: string;
  /** Base-relative path, as in the route table (`''` is the docs home). */
  path: string;
  description?: string | null;
}

export interface LlmsOperation {
  title: string;
  path: string;
  /** HTTP method, any case. */
  method: string;
  /** The operation's path in the spec, e.g. `/plants/{id}`. */
  apiPath: string;
}

export interface LlmsIndexInput {
  name: string;
  docs: LlmsLink[];
  operations: LlmsOperation[];
  /** The changelog page's path, or null when the site has no changelog. */
  changelog: string | null;
  blog: LlmsLink[];
}

function section(title: string, lines: string[]): string {
  return lines.length > 0 ? `## ${title}\n\n${lines.join('\n')}` : '';
}

function item(text: string, href: string, note?: string | null): string {
  return `- [${text}](${href})${note ? `: ${note}` : ''}`;
}

export function llmsIndex(input: LlmsIndexInput, link: Linker): string {
  const parts = [
    `# ${input.name}`,
    `> Documentation for ${input.name}.`,
    section('Docs', input.docs.map((d) => item(d.title, link(d.path), d.description))),
    section(
      'API Reference',
      input.operations.map((op) => item(op.title, link(op.path), `${op.method.toUpperCase()} ${op.apiPath}`)),
    ),
    section('Changelog', input.changelog === null ? [] : [item('Changelog', link(input.changelog))]),
    section('Blog', input.blog.map((p) => item(p.title, link(p.path), p.description))),
  ];
  return parts.filter(Boolean).join('\n\n').trimEnd() + '\n';
}
