import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const oathId = process.env.OAUTH_ID;
const oauthSecret = process.env.OAUTH_SECRET;
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'localhost:3000';
const callbackUrl = vercelUrl?.includes('localhost')
  ? `http://${vercelUrl}/api/callback`
  : `https://${vercelUrl}/api/callback`;

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

interface Tokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
}

export async function GET(req: NextRequest) {
  console.log('req:', req.url);
  // throw new Error('stop');
  // Handle the OAuth2 callback logic here

  // Extract the authorization code from the request query parameters
  const url: URL = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    // Redirect the user to an error page or display an error message
    return new Response('Missing authorization code', { status: 400 });
  }

  if (Array.isArray(code)) {
    return new Response('Multiple authorization codes', { status: 400 });
  }

  // Make a request to the OAuth2 provider's token endpoint to exchange the authorization code for an access token
  const r = await fetch('https://api.freeagent.com/v2/token_endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' + Buffer.from(`${oathId}:${oauthSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: callbackUrl,
    }).toString(),
  });

  if (!r.ok) {
    // Redirect the user to an error page or display an error message
    return new Response(
      'Failed to exchange authorization code for access token',
      { status: 500 }
    );
  }

  // Handle the response from the token endpoint
  const tokens: Tokens = await r.json();

  const accessTokenExpires = new Date(Date.now() + tokens.expires_in * 1000);
  const refreshTokenExpires = new Date(
    Date.now() + tokens.refresh_token_expires_in * 1000
  );

  const cookieStore = await cookies();
  cookieStore.set('access_token', tokens.access_token, {
    expires: accessTokenExpires,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  cookieStore.set('refresh_token', tokens.refresh_token, {
    expires: refreshTokenExpires,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return NextResponse.redirect(new URL('/app/month', req.url));
}
