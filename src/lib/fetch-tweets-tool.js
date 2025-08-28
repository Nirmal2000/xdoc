import {
  generateId,
  tool,
} from 'ai';
import { z } from 'zod';
import { getUserSession, updateUserSessionTokens } from '@/lib/user-sessions';
import { refreshAccessToken } from '@/lib/xoauth';

// Fetch tweets from X API
async function fetchUserTweets(accessToken, userId, maxResults = 50, paginationToken = null) {
  // Build URL with query parameters
  const params = new URLSearchParams({
    'max_results': Math.min(maxResults, 5).toString(), // X API max is 100
    'tweet.fields': 'created_at,public_metrics,text,author_id',
    'user.fields': 'profile_image_url,username,name,verified',
    'expansions': 'author_id'
  });
  
  if (paginationToken) {
    params.append('pagination_token', paginationToken);
  }
  
  // Use the user ID in the URL path instead of 'me'
  const url = `https://api.x.com/2/users/${userId}/tweets?${params.toString()}`;
  
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

// Create the fetch tweets tool that handles streaming content delivery
export function createFetchTweetsTool({ writer, ctx }) {
  return tool({
    description: 'Fetch user tweets from X/Twitter. Use this tool when users want to see their recent tweets or need to analyze their tweet content.',
    inputSchema: z.object({
      maxResults: z.number().min(5).max(50).default(50).describe('Maximum number of tweets to fetch (5-50)'),
    }),
    execute: async ({ maxResults = 50 }) => {
      const generationId = generateId();
      const index = 0; // For now, using single index

      // Get userSessionId from context (passed from client)
      const userSessionId = ctx?.userSessionId;

      // Debug logging
      console.log('[FetchTweets Tool] Starting execution with params:', { maxResults, userSessionId });
      
      // If userSessionId is not provided in context, user needs to authenticate
      if (!userSessionId) {
        console.log('[FetchTweets Tool] No userSessionId in context, user needs to authenticate with X first');
        const errorMessage = 'Please authenticate with X first to fetch your tweets. Click the "Login with X" button in the top right.';
        
        writer.write({
          type: 'fetch-tweet-tool',
          id: generationId,
          data: {
            text: errorMessage,
            index,
            status: 'error',
            instructions: 'Authentication required',
          },
        });
        
        return {
          success: false,
          error: 'Authentication required - no userSessionId in context',
        };
      }

      console.log('[FetchTweets Tool] Using maxResults:', maxResults);
      console.log('[FetchTweets Tool] Using userSessionId:', userSessionId);

      // Signal that we're starting to process
      writer.write({
        type: 'fetch-tweet-tool',
        id: generationId,
        data: {
          text: '',
          index,
          status: 'processing',
          instructions: `Fetching up to ${maxResults} tweets from X...`,
        },
      });

      try {
        // Get user session from database
        const userSession = await getUserSession(userSessionId);
        
        if (!userSession) {
          console.error('[FetchTweets Tool] Invalid or expired session');
          const errorMessage = 'Invalid or expired session. Please re-authenticate with X.';
          
          writer.write({
            type: 'fetch-tweet-tool',
            id: generationId,
            data: {
              text: errorMessage,
              index,
              status: 'error',
              instructions: 'Re-authentication required',
            },
          });
          
          return {
            success: false,
            error: 'Invalid or expired session',
          };
        }

        let tweetsData;
        
        // Update status
        writer.write({
          type: 'fetch-tweet-tool',
          id: generationId,
          data: {
            text: 'Connecting to X API...',
            index,
            status: 'streaming',
            instructions: `Fetching up to ${maxResults} tweets from X...`,
          },
        });

        try {
          // Use the stored user ID from session
          const userId = userSession.userId;
          if (!userId) {
            throw new Error('User ID not found in session');
          }
          
          tweetsData = await fetchUserTweets(userSession.accessToken, userId, maxResults);
        } catch (e) {
          // If token expired, try to refresh
          if ((e.status === 401 || e.status === 403) && userSession.refreshToken) {
            console.log('[FetchTweets Tool] Refreshing expired token...');
            
            writer.write({
              type: 'fetch-tweet-tool',
              id: generationId,
              data: {
                text: 'Access token expired, refreshing...',
                index,
                status: 'streaming',
                instructions: `Fetching up to ${maxResults} tweets from X...`,
              },
            });

            const clientId = process.env.X_CLIENT_ID;
            if (!clientId) {
              throw new Error('X_CLIENT_ID not configured');
            }

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
            writer.write({
              type: 'fetch-tweet-tool',
              id: generationId,
              data: {
                text: 'Token refreshed, fetching tweets...',
                index,
                status: 'streaming',
                instructions: `Fetching up to ${maxResults} tweets from X...`,
              },
            });

            const userId = userSession.userId;
            if (!userId) {
              throw new Error('User ID not found in session');
            }

            tweetsData = await fetchUserTweets(token.access_token, userId, maxResults);
          } else {
            throw e;
          }
        }

        // Process and stream tweets
        const tweets = tweetsData.data || [];
        const includes = tweetsData.includes || {};
        const users = includes.users || [];
        
        console.log('[FetchTweets Tool] Fetched tweets count:', tweets.length);
        
        if (tweets.length === 0) {
          writer.write({
            type: 'fetch-tweet-tool',
            id: generationId,
            data: {
              text: 'No tweets found in your timeline.',
              index,
              status: 'complete',
              instructions: `Successfully fetched ${tweets.length} tweets from X`,
            },
          });
        } else {
          // Extract tweets with individual keys
          const tweetTexts = tweets.map((tweet, index) => {
            // Find the author info if available
            const author = users.find(user => user.id === tweet.author_id);
            const authorInfo = author ? `@${author.username}` : 'Unknown User';
            
            return {
              key: index,
              text: tweet.text,
              author: authorInfo,
              created_at: tweet.created_at,
              public_metrics: tweet.public_metrics
            };
          });

          // Stream each tweet individually
          for (let i = 0; i < tweetTexts.length; i++) {
            const tweet = tweetTexts[i];
            
            writer.write({
              type: 'fetch-tweet-tool',
              id: generationId,
              data: {
                tweet: tweet,
                key: tweet.key,
                status: i === tweetTexts.length - 1 ? 'complete' : 'streaming',
                instructions: `Fetching up to ${maxResults} tweets from X...`,
              },
            });
            
            // Small delay to make streaming visible
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        // Debug logging
        console.log('[FetchTweets Tool] Processed tweets successfully');

        return {
          success: true,
          count: tweets.length,
          tweets: tweets.map(t => t.text), // Return list of tweet texts
        };

      } catch (error) {
        console.error('[FetchTweets Tool] Error fetching tweets:', error);
        
        // Signal error
        const errorMessage = `Sorry, I encountered an error while fetching your tweets: ${error.message}`;
        
        writer.write({
          type: 'fetch-tweet-tool',
          id: generationId,
          data: {
            text: errorMessage,
            index,
            status: 'error',
            instructions: 'Error occurred while fetching tweets',
          },
        });

        return {
          success: false,
          error: error.message,
        };
      }
    },
  });
}