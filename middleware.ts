import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const email = token?.email as string | undefined;

    // Double-check domain even if token exists (defence in depth)
    if (token && email && !email.endsWith('@roam-electric.com')) {
      return NextResponse.redirect(new URL('/login?error=AccessDenied', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    /*
     * Protect ONLY page routes.
     * Exclude:
     *   /login               — sign-in page
     *   /api/*               — all API routes have their own auth (NextAuth, API keys)
     *   /_next/*             — Next.js internals
     *   /favicon*, /robots*  — static files
     */
    '/((?!login|api|_next/static|_next/image|favicon|robots).*)',
  ],
};
