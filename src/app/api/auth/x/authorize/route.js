import { NextResponse } from 'next/server';
import { generateCodeVerifier, buildAuthorizeUrl, createSignedState } from '@/lib/xoauth';

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
  // For plain method, code_challenge === code_verifier
  const state = createSignedState({ codeVerifier, returnTo, ttlSeconds: 600 });
  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge: codeVerifier,
    state,
  });
  // Stateless: no cookies needed here; redirect immediately with signed state
  return NextResponse.redirect(authorizeUrl, { status: 302 });
}
