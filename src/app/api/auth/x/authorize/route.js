import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateCodeVerifier, generateState, buildAuthorizeUrl } from '@/lib/xoauth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get('return_to');
  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response('Missing X OAuth env: X_CLIENT_ID or X_REDIRECT_URI', { status: 500 });
  }

  const codeVerifier = generateCodeVerifier();
  const state = generateState();

  // For plain method, code_challenge === code_verifier
  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge: codeVerifier,
    state,
  });
  
  const jar = await cookies();
  // Persist state + verifier briefly for callback validation
  const ttlSeconds = 10 * 60; // 10 minutes
  const expires = new Date(Date.now() + ttlSeconds * 1000);
  console.log('[X AUTHORIZE Auth]', { state, codeVerifier, expires });

  // Use NextResponse to ensure cookies are attached to the redirect response
  const res = NextResponse.redirect(authorizeUrl, { status: 302 });
  res.cookies.set('x_oauth_state', state, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    path: '/',
    expires,
  });
  res.cookies.set('x_code_verifier', codeVerifier, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    path: '/',
    expires,
  });
  if (returnTo) {
    res.cookies.set('x_return_to', returnTo, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
      expires,
    });
  }
  return res;
}
