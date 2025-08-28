import { NextResponse } from 'next/server';
import { generateCodeVerifier, generateState, buildAuthorizeUrl } from '@/lib/xoauth';
import { createSession } from '@/lib/oauth-sessions';

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

  try {
    // Store session in database instead of cookies
    const sessionId = await createSession(state, codeVerifier, returnTo);
    console.log('[X AUTHORIZE Auth]', { state, codeVerifier, sessionId });

    // Use sessionId as the state parameter for OAuth flow
    const authorizeUrl = buildAuthorizeUrl({
      clientId,
      redirectUri,
      codeChallenge: codeVerifier,
      state: sessionId, // Use sessionId instead of actual state
    });

    return NextResponse.redirect(authorizeUrl, { status: 302 });
  } catch (error) {
    console.error('[X AUTHORIZE ERROR]', error);
    return new Response(`OAuth session creation failed: ${error.message}`, { status: 500 });
  }
}
