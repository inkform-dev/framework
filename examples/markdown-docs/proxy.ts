import { NextResponse, type NextRequest } from 'next/server';
import { resolveSlugRedirect } from '@inkform/framework';
import slugHistory from './content/docs/slug-history.json';

/** Docs are served at the root, so slug-history redirects use the '/' base. */
export function proxy(req: NextRequest) {
  // Any page is also reachable as Markdown by appending `.md` to its own URL
  // (e.g. /quickstart.md). Route those to the internal markdown handler; the
  // `NextResponse.rewrite` keeps the `.md` URL in the address bar while the
  // response comes from app/markdown/[[...slug]]/route.ts.
  const { pathname } = req.nextUrl;
  if (pathname.endsWith('.md') && pathname !== '/markdown' && !pathname.startsWith('/markdown/')) {
    const slug = pathname.slice(1, -3);
    return NextResponse.rewrite(new URL(`/markdown/${slug}`, req.url));
  }

  const target = resolveSlugRedirect(
    req.nextUrl.pathname,
    slugHistory as Record<string, string>,
    '/',
  );
  if (target) {
    return NextResponse.redirect(new URL(target, req.url), 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
