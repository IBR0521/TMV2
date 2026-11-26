import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isOfficePath } from '@/nav';

/**
 * Next.js 16 calls this a proxy; it is the old middleware.
 *
 * It keeps the Supabase session fresh on every request and keeps signed-out
 * visitors out of the office app. The session cookie is the only thing it
 * touches; every authorisation decision is still made by RLS and by the action
 * wrapper's role check.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isOfficePath(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(login);
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const today = request.nextUrl.clone();
    today.pathname = '/today';
    today.search = '';
    return NextResponse.redirect(today);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icon.svg|manifest.webmanifest|favicon.ico).*)'],
};
