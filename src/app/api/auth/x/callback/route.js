import { NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/xoauth';
import { getSession, deleteSession } from '@/lib/oauth-sessions';
import { createUserSession } from '@/lib/user-sessions';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const sessionId = searchParams.get('state'); // X returns sessionId as state
  const error = searchParams.get('error');

  if (error) {
    return new Response(`Authorization failed: ${error}`, { status: 400 });
  }
  if (!code || !sessionId) {
    return new Response('Missing code or session ID', { status: 400 });
  }

  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response('Missing X OAuth env: X_CLIENT_ID or X_REDIRECT_URI', { status: 500 });
  }

  // Retrieve session from database instead of cookies
  const session = await getSession(sessionId);
  
  if (!session) {
    return new Response('OAuth session expired. Please try again.', { status: 400 });
  }

  console.log('[X CALLBACK Auth]', { sessionId, session });

  try {
    const token = await exchangeCodeForToken({
      code,
      clientId,
      redirectUri,
      codeVerifier: session.codeVerifier, // Use from database session
    });

    // Fetch user info from X API
    const userInfoResponse = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url,username,name', {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: 'no-store',
    });

    if (!userInfoResponse.ok) {
      throw new Error(`Failed to fetch user info: ${userInfoResponse.status}`);
    }

    const userInfo = await userInfoResponse.json();
    const userData = userInfo.data;

    // Create user session in database using same sessionId (replaces cookies completely)
    const userSessionId = await createUserSession({
      userId: userData.id,
      username: userData.username,
      name: userData.name,
      profileImageUrl: userData.profile_image_url,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      tokenExpiresIn: token.expires_in ?? 7200,
      userSessionId: sessionId // Use the same sessionId from OAuth
    });

    // Cleanup OAuth session from database
    await deleteSession(sessionId);

    // Redirect to returnTo URL without hash - client already knows sessionId
    const dest = session.returnTo || process.env.NEXT_PUBLIC_POST_LOGIN_REDIRECT || '/';
    
    console.log('[X CALLBACK Auth]', { userSessionId, sessionId, dest });
    return NextResponse.redirect(dest, { status: 302 });
  } catch (e) {
    // Cleanup session on error too
    await deleteSession(sessionId);
    return new Response(`Token exchange error: ${e.message}`, { status: 500 });
  }
}
