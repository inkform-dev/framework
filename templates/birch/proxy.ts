import { NextResponse, type NextRequest } from 'next/server';
import { resolveSlugRedirect } from '@inkform/framework';
import slugHistory from './content/docs/slug-history.json';

/** Docs are served at the root, so slug-history redirects use the '/' base. */
export function proxy(req: NextRequest) {
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
