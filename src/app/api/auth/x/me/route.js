import { refreshAccessToken } from '@/lib/xoauth';
import { getUserSession, updateUserSessionTokens } from '@/lib/user-sessions';

export const dynamic = 'force-dynamic';

async function fetchMe(accessToken) {
  const url = 'https://api.x.com/2/users/me?user.fields=profile_image_url,username,name';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`me fetch failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userSessionId = searchParams.get('userSessionId');
  const clientId = process.env.X_CLIENT_ID;
  
  console.log('[X Auth]', { userSessionId, clientId });
  
  if (!userSessionId) {
    return Response.json({ loggedIn: false });
  }

  // Get user session from database instead of cookies
  const userSession = await getUserSession(userSessionId);
  
  if (!userSession) {
    return Response.json({ loggedIn: false });
  }

  try {
    const me = await fetchMe(userSession.accessToken);
    
    // Return user data from database (more reliable than API response)
    return Response.json({ 
      loggedIn: true, 
      user: {
        id: userSession.userId,
        username: userSession.username,
        name: userSession.name,
        profile_image_url: userSession.profileImageUrl
      }
    });
  } catch (e) {
    if ((e.status === 401 || e.status === 403) && userSession.refreshToken && clientId) {
      try {
        const token = await refreshAccessToken({ 
          refreshToken: userSession.refreshToken, 
          clientId 
        });

        // Update tokens in database instead of cookies
        await updateUserSessionTokens(userSessionId, {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          tokenExpiresIn: token.expires_in ?? 7200
        });

        const me = await fetchMe(token.access_token);
        return Response.json({ 
          loggedIn: true, 
          user: {
            id: userSession.userId,
            username: userSession.username,
            name: userSession.name,
            profile_image_url: userSession.profileImageUrl
          }
        });
      } catch (err) {
        // fallthrough to loggedOut
      }
    }
    return Response.json({ loggedIn: false });
  }
}
