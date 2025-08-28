import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { exchangeCodeForToken, verifySignedState } from '@/lib/xoauth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return new Response(`Authorization failed: ${error}`, { status: 400 });
  }
  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 });
  }

  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response('Missing X OAuth env: X_CLIENT_ID or X_REDIRECT_URI', { status: 500 });
  }

  const jar = await cookies();
  // Stateless state verification
  let codeVerifier;
  let returnTo;
  try {
    const payload = verifySignedState(state);
    codeVerifier = payload.cv;
    returnTo = payload.rt || undefined;
  } catch (e) {
    return new Response('Invalid or expired OAuth state', { status: 400 });
  }

  try {
    const token = await exchangeCodeForToken({
      code,
      clientId,
      redirectUri,
      codeVerifier,
    });

    // token contains: access_token, refresh_token (if offline.access), expires_in, token_type, scope
    const now = Date.now();
    const accessExpires = new Date(now + (token.expires_in ?? 7200) * 1000);
    const refreshExpires = new Date(now + 30 * 24 * 60 * 60 * 1000); // 30 days

    const dest = returnTo || process.env.NEXT_PUBLIC_POST_LOGIN_REDIRECT || '/';
    const res = NextResponse.redirect(dest, { status: 302 });
    // Set CHIPS-partitioned cookies for third-party iframe support
    const accessCookie = [
      `x_access_token=${encodeURIComponent(token.access_token)}`,
      'Path=/',
      `Expires=${accessExpires.toUTCString()}`,
      'HttpOnly',
      'Secure',
      'SameSite=None',
      'Partitioned',
    ].join('; ');
    res.headers.append('Set-Cookie', accessCookie);

    if (token.refresh_token) {
      const refreshCookie = [
        `x_refresh_token=${encodeURIComponent(token.refresh_token)}`,
        'Path=/',
        `Expires=${refreshExpires.toUTCString()}`,
        'HttpOnly',
        'Secure',
        'SameSite=None',
        'Partitioned',
      ].join('; ');
      res.headers.append('Set-Cookie', refreshCookie);
    }
    // Stateless: no transient cookies to clear
    return res;
  } catch (e) {
    return new Response(`Token exchange error: ${e.message}`, { status: 500 });
  }
}
