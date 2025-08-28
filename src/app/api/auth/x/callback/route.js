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
    res.cookies.set('x_access_token', token.access_token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
      expires: accessExpires,
    });

    if (token.refresh_token) {
      res.cookies.set('x_refresh_token', token.refresh_token, {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        path: '/',
        expires: refreshExpires,
      });
    }
    // Stateless: no transient cookies to clear
    return res;
  } catch (e) {
    return new Response(`Token exchange error: ${e.message}`, { status: 500 });
  }
}
