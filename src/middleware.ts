import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessTokens } from './freeagent';

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  const accessToken = request.cookies.get('access_token')?.value;

  if (!accessToken) {
    const refreshToken = request.cookies.get('refresh_token');
    if (refreshToken) {
      try {
        const tokens = await refreshAccessTokens(refreshToken.value);

        if (tokens) {
          requestHeaders.set('x-access-token', tokens.access_token);
          const response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });

          response.cookies.set('access_token', tokens.access_token, {
            expires: new Date(Date.now() + tokens.expires_in * 1000),
            httpOnly: true,
            sameSite: 'lax',
          });
          response.cookies.set('refresh_token', tokens.refresh_token, {
            expires: new Date(
              Date.now() + tokens.refresh_token_expires_in * 1000
            ),
            httpOnly: true,
            sameSite: 'lax',
          });
          return response;
        }
      } catch (e) {
        console.error('Token refresh failed:', e);
      }
    }

    if (request.nextUrl.pathname.startsWith('/app')) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      return response;
    }
  } else {
    requestHeaders.set('x-access-token', accessToken);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
