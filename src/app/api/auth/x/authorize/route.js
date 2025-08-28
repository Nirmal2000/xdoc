import { NextResponse } from 'next/server';
import { generateCodeVerifier, generateState, buildAuthorizeUrl } from '@/lib/xoauth';
import { createSession } from '@/lib/oauth-sessions';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get('return_to');
  const clientSessionId = url.searchParams.get('sessionId'); // Client-provided sessionId
  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response('Missing X OAuth env: X_CLIENT_ID or X_REDIRECT_URI', { status: 500 });
  }

  if (!clientSessionId) {
    return new Response('Missing sessionId parameter', { status: 400 });
  }

  const codeVerifier = generateCodeVerifier();
  const state = generateState();

  try {
    // Store session in database using client-provided sessionId
    const sessionId = await createSession(state, codeVerifier, returnTo, clientSessionId);
    console.log('[X AUTHORIZE Auth]', { state, codeVerifier, sessionId, clientSessionId });

    // Use sessionId as the state parameter for OAuth flow
    const authorizeUrl = buildAuthorizeUrl({
      clientId,
      redirectUri,
      codeChallenge: codeVerifier,
      state: sessionId, // Use client sessionId as state
    });

    return NextResponse.redirect(authorizeUrl, { status: 302 });
  } catch (error) {
    console.error('[X AUTHORIZE ERROR]', error);
    return new Response(`OAuth session creation failed: ${error.message}`, { status: 500 });
  }
}
