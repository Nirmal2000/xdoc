import { generateId, tool } from 'ai';
import { z } from 'zod';
import { RapidAPIProvider } from './rapidapi-provider.js';

// Create the fetch tweets tool that handles streaming content delivery using RapidAPI
export function createFetchTweetsTool({ writer, ctx }) {
  const scraper = new RapidAPIProvider();

  return tool({
    description: 'Fetch tweets from a Twitter handle using RapidAPI. Use this tool when users want to analyze or view tweets from any public Twitter account. Requires either number of tweets or a start date.',
    inputSchema: z.object({
      handler: z.string().describe('The Twitter handle (with or without @) to fetch tweets from'),
      number: z.number().min(1).max(100).optional().describe('Number of tweets to fetch (1-100)'),
      start_date: z.string().optional().describe('Start date for tweets in YYYY-MM-DD format'),
    }).refine((data) => data.number || data.start_date, {
      message: "Either 'number' or 'start_date' must be provided"
    }),
    execute: async ({ handler, number, start_date }) => {
      const generationId = generateId();

      // Validate parameters - one of number or start_date must be present
      if (!number && !start_date) {
        const errorMessage = 'Error: Either number of tweets or start_date must be provided.';

        writer.write({
          type: 'data-fetch-tweets-tool',
          id: generationId,
          data: {
            text: errorMessage,
            index: 0,
            status: 'error',
            instructions: 'Missing required parameters',
          },
        });

        return {
          success: false,
          error: 'Missing required parameters: number or start_date',
        };
      }

      // Debug logging
      console.log('[FetchTweets Tool] Starting execution with params:', { handler, number, start_date });

      // Validate RapidAPI key
      if (!scraper.apiKey) {
        const errorMessage = 'RapidAPI key not configured. Please add RAPIDAPI_KEY to your environment variables.';

        writer.write({
          type: 'data-fetch-tweets-tool',
          id: generationId,
          data: {
            text: errorMessage,
            index: 0,
            status: 'error',
            instructions: 'API key missing',
          },
        });

        return {
          success: false,
          error: 'RapidAPI key not configured',
        };
      }

      // Clean handler
      const cleanHandler = handler || '';

      if (!cleanHandler.trim()) {
        const errorMessage = 'Error: Twitter handle is required.';

        writer.write({
          type: 'data-fetch-tweets-tool',
          id: generationId,
          data: {
            text: errorMessage,
            index: 0,
            status: 'error',
            instructions: 'Missing handler',
          },
        });

        return {
          success: false,
          error: 'Twitter handle is required',
        };
      }

      // Determine target number of posts
      let targetPosts;
      if (number) {
        // If number is provided, use it (but cap at 100)
        targetPosts = Math.min(number, 100);
      } else {
        // If only start_date is provided, fetch up to 100 (hard limit)
        targetPosts = 100;
      }

      console.log('[FetchTweets Tool] Using handler:', cleanHandler);
      console.log('[FetchTweets Tool] Target posts:', targetPosts);

      // Signal that we're starting to process
      writer.write({
        type: 'data-fetch-tweets-tool',
        id: generationId,
        data: {
          text: '',
          index: 0,
          status: 'processing',
          instructions: `Fetching up to ${targetPosts} tweets from @${cleanHandler} using RapidAPI...`,
        },
      });

      try {
        // Update status
        writer.write({
          type: 'data-fetch-tweets-tool',
          id: generationId,
          data: {
            text: 'Connecting to RapidAPI Twitter service...',
            index: 0,
            status: 'streaming',
            instructions: `Fetching up to ${targetPosts} tweets from @${cleanHandler} using RapidAPI...`,
          },
        });

        const userInfo = await scraper.get_user_info_twitter(cleanHandler);
        const avatar = userInfo?.avatar || null;

        // Fetch tweets using RapidAPI
        const rawTweets = await scraper.fetchTweets(cleanHandler, targetPosts, start_date);

        console.log('[FetchTweets Tool] Fetched tweets count:', rawTweets.length);

        if (rawTweets.length === 0) {
          const noTweetsMessage = `No tweets found for @${cleanHandler}. The account may be private or have no public tweets.`;

          writer.write({
            type: 'data-fetch-tweets-tool',
            id: generationId,
            data: {
              text: noTweetsMessage,
              tweets: [],
              status: 'complete',
              instructions: 'No tweets found',
            },
          });

          return {
            success: true,
            count: 0,
            tweets: [],
          };
        }

        // Normalize and prepare tweets for word-by-word streaming
        const normalizedTweets = [];
        const tweetTexts = [];

        for (let i = 0; i < rawTweets.length; i++) {
          const rawTweet = rawTweets[i];
          const normalizedTweet = scraper.normalizePostData(rawTweet);
          normalizedTweets.push({
            text: normalizedTweet.text,
            author: `@${cleanHandler}`,
            avatar: avatar
          });
          tweetTexts.push(normalizedTweet.text);
        }

        console.log('[FetchTweets Tool] Normalized tweets count:', normalizedTweets.length);

        // Stream all tweets in parallel, batched by words to reduce event count
        const WORDS_PER_CHUNK = 10;
        const tweetWordArrays = normalizedTweets.map(tweet => tweet.text.split(/\s+/).filter(Boolean));
        const tweetProgressArrays = normalizedTweets.map(() => ({ streamedText: '', lastEmittedChunk: 0, completed: false }));
        
        console.log(`[FetchTweets Tool] Starting parallel streaming for ${normalizedTweets.length} tweets (chunks of ${WORDS_PER_CHUNK} words)`);
        
        // Create promises for each tweet's streaming process
        const streamingPromises = normalizedTweets.map(async (tweet, tweetIndex) => {
          const words = tweetWordArrays[tweetIndex];
          const totalChunks = Math.ceil(words.length / WORDS_PER_CHUNK);
          
          console.log(`[FetchTweets Tool] Parallel stream for tweet ${tweetIndex + 1}: ${words.length} words, ${totalChunks} chunks`);
          
          for (let start = 0, chunkIndex = 0; start < words.length; start += WORDS_PER_CHUNK, chunkIndex++) {
            const chunkWords = words.slice(start, start + WORDS_PER_CHUNK);
            const chunkText = chunkWords.join(' ');
            tweetProgressArrays[tweetIndex].streamedText += (start === 0 ? '' : ' ') + chunkText;
            tweetProgressArrays[tweetIndex].lastEmittedChunk = chunkIndex;
            
            // Mark completion on final chunk
            if (start + WORDS_PER_CHUNK >= words.length) {
              tweetProgressArrays[tweetIndex].completed = true;
            }
            
            // Create current state of all tweets for streaming
            const tweetsForStream = normalizedTweets.map((t, idx) => ({
              text: tweetProgressArrays[idx].streamedText,
              author: t.author,
              avatar: t.avatar
            }));
            
            // Check if all tweets are completed
            const allCompleted = tweetProgressArrays.every(progress => progress.completed);
            
            writer.write({
              type: 'data-fetch-tweets-tool',
              id: generationId,
              data: {
                text: `Processing ${normalizedTweets.length} tweets in parallel...`,
                tweets: tweetsForStream,
                status: allCompleted ? 'complete' : 'streaming',
                instructions: `Fetching up to ${targetPosts} tweets from @${cleanHandler} using RapidAPI...`,
              },
            });
            
            // Slight delay between chunks for streaming effect
            if (!allCompleted) {
              await new Promise(resolve => setTimeout(resolve, 120 + Math.random() * 60));
            }
          }
        });
        
        // Wait for all tweets to finish streaming
        await Promise.all(streamingPromises);

        // Debug logging
        console.log('[FetchTweets Tool] Parallel word-by-word streaming completed successfully');

        // Return formatted output as requested: '\n\n'.join(tweet_texts)
        const joinedOutput = tweetTexts.join('\n\n');

        return {
          success: true,
          count: rawTweets.length,          
          content: joinedOutput, // The formatted string output
          tweets: normalizedTweets, // Array of normalized tweets
          handler: cleanHandler,
        };

      } catch (error) {
        console.error('[FetchTweets Tool] Error fetching tweets:', error);

        // Signal error
        const errorMessage = `Sorry, I encountered an error while fetching tweets for @${cleanHandler}: ${error.message}`;

        writer.write({
          type: 'data-fetch-tweets-tool',
          id: generationId,
          data: {
            text: errorMessage,
            tweets: [],
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
