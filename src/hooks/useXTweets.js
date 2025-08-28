import { useState, useCallback } from 'react';
import { useXAuth } from './useXAuth';

export function useXTweets() {
  const { userSessionId } = useXAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tweets, setTweets] = useState([]);
  const [meta, setMeta] = useState({});
  const [includes, setIncludes] = useState({});

  // Fetch user's own tweets
  const fetchUserTweets = useCallback(async (options = {}) => {
    if (!userSessionId) {
      setError('Not authenticated');
      return null;
    }

    const {
      maxResults = 10,
      paginationToken,
      excludeReplies = false,
      excludeRetweets = false
    } = options;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userSessionId,
        max_results: maxResults.toString()
      });
      
      if (paginationToken) params.append('pagination_token', paginationToken);
      if (excludeReplies) params.append('exclude_replies', 'true');
      if (excludeRetweets) params.append('exclude_retweets', 'true');

      const response = await fetch(`/api/auth/x/tweets?${params.toString()}`, {
        cache: 'no-store'
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tweets');
      }

      setTweets(result.data);
      setMeta(result.meta);
      setIncludes(result.includes);
      
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userSessionId]);

  // Fetch different types of tweets using v2 API
  const fetchTweets = useCallback(async (type = 'user_tweets', options = {}) => {
    if (!userSessionId) {
      setError('Not authenticated');
      return null;
    }

    const {
      maxResults = 10,
      paginationToken,
      sinceId,
      untilId,
      startTime,
      endTime,
      excludeReplies = false,
      excludeRetweets = false
    } = options;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        userSessionId,
        type,
        max_results: maxResults.toString()
      });
      
      if (paginationToken) params.append('pagination_token', paginationToken);
      if (sinceId) params.append('since_id', sinceId);
      if (untilId) params.append('until_id', untilId);
      if (startTime) params.append('start_time', startTime);
      if (endTime) params.append('end_time', endTime);
      if (excludeReplies) params.append('exclude_replies', 'true');
      if (excludeRetweets) params.append('exclude_retweets', 'true');

      const response = await fetch(`/api/auth/x/tweets-v2?${params.toString()}`, {
        cache: 'no-store'
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch tweets');
      }

      setTweets(result.data);
      setMeta(result.meta);
      setIncludes(result.includes);
      
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userSessionId]);

  // Helper functions for specific tweet types
  const fetchMyTweets = useCallback((options) => 
    fetchTweets('user_tweets', options), [fetchTweets]);
  
  const fetchMyMentions = useCallback((options) => 
    fetchTweets('user_mentions', options), [fetchTweets]);
  
  const fetchHomeTimeline = useCallback((options) => 
    fetchTweets('home_timeline', options), [fetchTweets]);
  
  const fetchLikedTweets = useCallback((options) => 
    fetchTweets('liked_tweets', options), [fetchTweets]);

  // Pagination helper
  const loadMore = useCallback(async (currentType = 'user_tweets') => {
    if (!meta.next_token) return null;
    
    return fetchTweets(currentType, { 
      paginationToken: meta.next_token 
    });
  }, [meta.next_token, fetchTweets]);

  return {
    // State
    loading,
    error,
    tweets,
    meta,
    includes,
    
    // Generic functions
    fetchTweets,
    fetchUserTweets, // Simple version for backward compatibility
    
    // Specific tweet type functions
    fetchMyTweets,
    fetchMyMentions,
    fetchHomeTimeline,
    fetchLikedTweets,
    
    // Pagination
    loadMore,
    hasMore: !!meta.next_token,
    
    // Utilities
    clear: () => {
      setTweets([]);
      setMeta({});
      setIncludes({});
      setError(null);
    }
  };
}