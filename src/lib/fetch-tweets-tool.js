import {
  generateId,
  tool,
} from 'ai';
import { z } from 'zod';
import { getUserSession, updateUserSessionTokens } from '@/lib/user-sessions';
import { refreshAccessToken } from '@/lib/xoauth';

// Fetch tweets from X API
async function fetchUserTweets(accessToken, maxResults = 50, paginationToken = null) {
  // Build URL with query parameters
  const params = new URLSearchParams({
    'max_results': Math.min(maxResults, 100).toString(), // X API max is 100
    'tweet.fields': 'created_at,public_metrics,text,author_id',
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
          type: 'data-tool-output',
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
        type: 'data-tool-output',
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
            type: 'data-tool-output',
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
        let currentText = 'Connecting to X API...\n\n';
        
        // Update status
        writer.write({
          type: 'data-tool-output',
          id: generationId,
          data: {
            text: currentText,
            index,
            status: 'streaming',
            instructions: `Fetching up to ${maxResults} tweets from X...`,
          },
        });

        try {
          tweetsData = await fetchUserTweets(userSession.accessToken, maxResults);
        } catch (e) {
          // If token expired, try to refresh
          if ((e.status === 401 || e.status === 403) && userSession.refreshToken) {
            console.log('[FetchTweets Tool] Refreshing expired token...');
            currentText += 'Access token expired, refreshing...\n\n';
            
            writer.write({
              type: 'data-tool-output',
              id: generationId,
              data: {
                text: currentText,
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
            currentText += 'Token refreshed, fetching tweets...\n\n';
            
            writer.write({
              type: 'data-tool-output',
              id: generationId,
              data: {
                text: currentText,
                index,
                status: 'streaming',
                instructions: `Fetching up to ${maxResults} tweets from X...`,
              },
            });

            tweetsData = await fetchUserTweets(token.access_token, maxResults);
          } else {
            throw e;
          }
        }

        // Process and stream tweets
        const tweets = tweetsData.data || [];
        const includes = tweetsData.includes || {};
        const users = includes.users || [];
        
        console.log('[FetchTweets Tool] Fetched tweets count:', tweets.length);

        currentText += `Successfully fetched ${tweets.length} tweets:\n\n`;
        
        if (tweets.length === 0) {
          currentText += 'No tweets found in your timeline.';
        } else {
          // Extract just the text content from tweets
          const tweetTexts = tweets.map((tweet, index) => {
            // Find the author info if available
            const author = users.find(user => user.id === tweet.author_id);
            const authorInfo = author ? `@${author.username}` : 'Unknown User';
            
            // Format: Tweet number, author, and text
            return `${index + 1}. ${authorInfo}: "${tweet.text}"`;
          });

          // Stream the tweets progressively
          for (let i = 0; i < tweetTexts.length; i++) {
            currentText += tweetTexts[i];
            
            // Add spacing between tweets
            if (i < tweetTexts.length - 1) {
              currentText += '\n\n';
            }
            
            // Stream every few tweets to show progress
            if (i % 5 === 0 || i === tweetTexts.length - 1) {
              writer.write({
                type: 'data-tool-output',
                id: generationId,
                data: {
                  text: currentText,
                  index,
                  status: 'streaming',
                  instructions: `Fetching up to ${maxResults} tweets from X...`,
                },
              });
              
              // Small delay to make streaming visible
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }

        // Debug logging
        console.log('[FetchTweets Tool] Processed tweets successfully');

        // Signal completion
        writer.write({
          type: 'data-tool-output',
          id: generationId,
          data: {
            text: currentText,
            index,
            status: 'complete',
            instructions: `Successfully fetched ${tweets.length} tweets from X`,
          },
        });

        return {
          success: true,
          count: tweets.length,
          tweets: tweets.map(t => t.text), // Return just the text content
        };

      } catch (error) {
        console.error('[FetchTweets Tool] Error fetching tweets:', error);
        
        // Signal error
        const errorMessage = `Sorry, I encountered an error while fetching your tweets: ${error.message}`;
        
        writer.write({
          type: 'data-tool-output',
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