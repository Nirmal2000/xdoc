import { refreshAccessToken } from '@/lib/xoauth';
import { getUserSession, updateUserSessionTokens } from '@/lib/user-sessions';

export const dynamic = 'force-dynamic';

async function fetchUserTweets(accessToken, maxResults = 10, paginationToken = null) {
  // Build URL with query parameters
  const params = new URLSearchParams({
    'max_results': maxResults.toString(),
    'tweet.fields': 'created_at,public_metrics,text,author_id,context_annotations,edit_history_tweet_ids',
    'user.fields': 'profile_image_url,username,name,verified',
    'expansions': 'author_id'
  });
  
  if (paginationToken) {
    params.append('pagination_token', paginationToken);
  }
  
  const url = `https://api.x.com/2/users/me/tweets?${params.toString()}`;
  
  const res = await fetch(url, {
    headers: { 
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store',
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Tweets fetch failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }
  
  return res.json();
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userSessionId = searchParams.get('userSessionId');
  const maxResults = parseInt(searchParams.get('max_results') || '10', 10);
  const paginationToken = searchParams.get('pagination_token');
  const clientId = process.env.X_CLIENT_ID;
  
  console.log('[X Tweets API]', { userSessionId, maxResults, paginationToken });
  
  if (!userSessionId) {
    return Response.json({ 
      error: 'Missing userSessionId parameter',
      success: false 
    }, { status: 400 });
  }

  // Validate max_results (X API allows 5-100)
  if (maxResults < 5 || maxResults > 100) {
    return Response.json({ 
      error: 'max_results must be between 5 and 100',
      success: false 
    }, { status: 400 });
  }

  // Get user session from database
  const userSession = await getUserSession(userSessionId);
  
  if (!userSession) {
    return Response.json({ 
      error: 'Invalid or expired session',
      success: false 
    }, { status: 401 });
  }

  try {
    const tweetsData = await fetchUserTweets(userSession.accessToken, maxResults, paginationToken);
    
    return Response.json({ 
      success: true, 
      data: tweetsData.data || [],
      includes: tweetsData.includes || {},
      meta: tweetsData.meta || {}
    });
  } catch (e) {
    // If token expired, try to refresh
    if ((e.status === 401 || e.status === 403) && userSession.refreshToken && clientId) {
      try {
        console.log('[X Tweets API] Refreshing expired token...');
        const token = await refreshAccessToken({ 
          refreshToken: userSession.refreshToken, 
          clientId 
        });

        // Update tokens in database
        await updateUserSessionTokens(userSessionId, {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          tokenExpiresIn: token.expires_in ?? 7200
        });

        // Retry the request with new token
        const tweetsData = await fetchUserTweets(token.access_token, maxResults, paginationToken);
        
        return Response.json({ 
          success: true, 
          data: tweetsData.data || [],
          includes: tweetsData.includes || {},
          meta: tweetsData.meta || {}
        });
      } catch (refreshError) {
        console.error('[X Tweets API] Token refresh failed:', refreshError);
        return Response.json({ 
          error: 'Authentication failed - please re-authenticate',
          success: false 
        }, { status: 401 });
      }
    }
    
    console.error('[X Tweets API] Error:', e);
    return Response.json({ 
      error: e.message || 'Failed to fetch tweets',
      success: false 
    }, { status: 500 });
  }
}