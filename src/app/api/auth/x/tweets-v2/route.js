import { refreshAccessToken } from '@/lib/xoauth';
import { getUserSession, updateUserSessionTokens } from '@/lib/user-sessions';

export const dynamic = 'force-dynamic';

// Different tweet endpoints
const TWEET_ENDPOINTS = {
  'user_tweets': (userId) => `https://api.x.com/2/users/${userId}/tweets`,
  'user_mentions': (userId) => `https://api.x.com/2/users/${userId}/mentions`,
  'home_timeline': () => `https://api.x.com/2/users/me/timelines/reverse_chronological`,
  'liked_tweets': (userId) => `https://api.x.com/2/users/${userId}/liked_tweets`
};

async function fetchTweets(accessToken, endpoint, options = {}) {
  const {
    maxResults = 10,
    paginationToken = null,
    sinceId = null,
    untilId = null,
    startTime = null,
    endTime = null,
    excludeReplies = false,
    excludeRetweets = false
  } = options;
  
  // Build query parameters
  const params = new URLSearchParams({
    'max_results': Math.min(Math.max(maxResults, 5), 100).toString(),
    'tweet.fields': 'created_at,public_metrics,text,author_id,context_annotations,edit_history_tweet_ids,referenced_tweets,reply_settings,source,lang,possibly_sensitive',
    'user.fields': 'profile_image_url,username,name,verified,description,public_metrics',
    'expansions': 'author_id,referenced_tweets.id,referenced_tweets.id.author_id,attachments.media_keys',
    'media.fields': 'url,preview_image_url,type,width,height,duration_ms,public_metrics'
  });
  
  // Add optional parameters
  if (paginationToken) params.append('pagination_token', paginationToken);
  if (sinceId) params.append('since_id', sinceId);
  if (untilId) params.append('until_id', untilId);
  if (startTime) params.append('start_time', startTime);
  if (endTime) params.append('end_time', endTime);
  if (excludeReplies) params.append('exclude', 'replies');
  if (excludeRetweets) params.append('exclude', 'retweets');
  
  const url = `${endpoint}?${params.toString()}`;
  
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

async function getUserProfile(accessToken) {
  const res = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url,username,name,id', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`User profile fetch failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }
  
  return res.json();
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userSessionId = searchParams.get('userSessionId');
  const type = searchParams.get('type') || 'user_tweets'; // user_tweets, user_mentions, home_timeline, liked_tweets
  const maxResults = parseInt(searchParams.get('max_results') || '10', 10);
  const paginationToken = searchParams.get('pagination_token');
  const sinceId = searchParams.get('since_id');
  const untilId = searchParams.get('until_id');
  const startTime = searchParams.get('start_time');
  const endTime = searchParams.get('end_time');
  const excludeReplies = searchParams.get('exclude_replies') === 'true';
  const excludeRetweets = searchParams.get('exclude_retweets') === 'true';
  const clientId = process.env.X_CLIENT_ID;
  
  console.log('[X Tweets API v2]', { 
    userSessionId, 
    type, 
    maxResults, 
    paginationToken,
    excludeReplies,
    excludeRetweets
  });
  
  if (!userSessionId) {
    return Response.json({ 
      error: 'Missing userSessionId parameter',
      success: false 
    }, { status: 400 });
  }

  // Validate tweet type
  if (!Object.keys(TWEET_ENDPOINTS).includes(type)) {
    return Response.json({ 
      error: `Invalid type. Must be one of: ${Object.keys(TWEET_ENDPOINTS).join(', ')}`,
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
    // For endpoints that need user ID, get it first
    let endpoint;
    if (type === 'user_tweets' || type === 'user_mentions' || type === 'liked_tweets') {
      // Use the stored user ID from session, or fetch it if needed
      let userId = userSession.userId;
      if (!userId) {
        const userProfile = await getUserProfile(userSession.accessToken);
        userId = userProfile.data.id;
      }
      endpoint = TWEET_ENDPOINTS[type](userId);
    } else {
      endpoint = TWEET_ENDPOINTS[type]();
    }
    
    const options = {
      maxResults,
      paginationToken,
      sinceId,
      untilId,
      startTime,
      endTime,
      excludeReplies,
      excludeRetweets
    };
    
    const tweetsData = await fetchTweets(userSession.accessToken, endpoint, options);
    
    return Response.json({ 
      success: true,
      type,
      data: tweetsData.data || [],
      includes: tweetsData.includes || {},
      meta: tweetsData.meta || {},
      user: {
        id: userSession.userId,
        username: userSession.username,
        name: userSession.name
      }
    });
  } catch (e) {
    // If token expired, try to refresh
    if ((e.status === 401 || e.status === 403) && userSession.refreshToken && clientId) {
      try {
        console.log('[X Tweets API v2] Refreshing expired token...');
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
        let endpoint;
        if (type === 'user_tweets' || type === 'user_mentions' || type === 'liked_tweets') {
          let userId = userSession.userId;
          if (!userId) {
            const userProfile = await getUserProfile(token.access_token);
            userId = userProfile.data.id;
          }
          endpoint = TWEET_ENDPOINTS[type](userId);
        } else {
          endpoint = TWEET_ENDPOINTS[type]();
        }
        
        const options = {
          maxResults,
          paginationToken,
          sinceId,
          untilId,
          startTime,
          endTime,
          excludeReplies,
          excludeRetweets
        };
        
        const tweetsData = await fetchTweets(token.access_token, endpoint, options);
        
        return Response.json({ 
          success: true,
          type,
          data: tweetsData.data || [],
          includes: tweetsData.includes || {},
          meta: tweetsData.meta || {},
          user: {
            id: userSession.userId,
            username: userSession.username,
            name: userSession.name
          }
        });
      } catch (refreshError) {
        console.error('[X Tweets API v2] Token refresh failed:', refreshError);
        return Response.json({ 
          error: 'Authentication failed - please re-authenticate',
          success: false 
        }, { status: 401 });
      }
    }
    
    console.error('[X Tweets API v2] Error:', e);
    return Response.json({ 
      error: e.message || 'Failed to fetch tweets',
      success: false 
    }, { status: 500 });
  }
}