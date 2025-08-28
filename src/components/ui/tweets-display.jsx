import React, { useEffect, useState } from 'react';
import { useXTweets } from '@/hooks/useXTweets';
import { useXAuth } from '@/hooks/useXAuth';
import { Button } from '@/components/ui/button';

export function TweetsDisplay() {
  const { user, checked } = useXAuth();
  const {
    loading,
    error,
    tweets,
    meta,
    includes,
    fetchMyTweets,
    fetchMyMentions,
    fetchHomeTimeline,
    fetchLikedTweets,
    loadMore,
    hasMore,
    clear
  } = useXTweets();

  const [activeTab, setActiveTab] = useState('my_tweets');

  // Load initial tweets when component mounts and user is authenticated
  useEffect(() => {
    if (checked && user) {
      handleTabChange('my_tweets');
    }
  }, [checked, user]);

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    clear(); // Clear previous tweets
    
    const options = { maxResults: 20, excludeReplies: false, excludeRetweets: false };
    
    switch (tab) {
      case 'my_tweets':
        await fetchMyTweets(options);
        break;
      case 'mentions':
        await fetchMyMentions(options);
        break;
      case 'timeline':
        await fetchHomeTimeline(options);
        break;
      case 'liked':
        await fetchLikedTweets(options);
        break;
      default:
        break;
    }
  };

  const handleLoadMore = () => {
    loadMore(activeTab === 'my_tweets' ? 'user_tweets' : 
              activeTab === 'mentions' ? 'user_mentions' : 
              activeTab === 'timeline' ? 'home_timeline' : 'liked_tweets');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserFromIncludes = (authorId) => {
    return includes.users?.find(user => user.id === authorId);
  };

  if (!checked) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Loading authentication...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <div className="max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-foreground mb-4">
            Connect Your X Account
          </h3>
          <p className="text-muted-foreground mb-6">
            Please authenticate with X to view your tweets, mentions, timeline, and liked posts.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/auth/x/authorize'}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Connect X Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Your X Content</h2>
          {user && (
            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
              <img
                src={user.profile_image_url}
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
              <span>@{user.username}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-card border rounded-lg p-1">
        {[
          { id: 'my_tweets', label: 'My Tweets' },
          { id: 'mentions', label: 'Mentions' },
          { id: 'timeline', label: 'Timeline' },
          { id: 'liked', label: 'Liked' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-background text-primary shadow-sm border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading tweets...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-destructive">Error: {error}</p>
        </div>
      )}

      {/* Tweets List */}
      {!loading && tweets.length > 0 && (
        <div className="space-y-4">
          {tweets.map(tweet => {
            const author = getUserFromIncludes(tweet.author_id) || {};
            
            return (
              <div key={tweet.id} className="bg-card border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                {/* Author Info */}
                <div className="flex items-center mb-3">
                  {author.profile_image_url && (
                    <img
                      src={author.profile_image_url}
                      alt={`${author.username}'s profile`}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-foreground">
                        {author.name || 'Unknown User'}
                      </span>
                      {author.verified && (
                        <span className="text-blue-500">✓</span>
                      )}
                    </div>
                    <span className="text-muted-foreground text-sm">
                      @{author.username || 'unknown'} · {formatDate(tweet.created_at)}
                    </span>
                  </div>
                </div>
                
                {/* Tweet Content */}
                <div className="mb-3">
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{tweet.text}</p>
                </div>
                
                {/* Tweet Metrics */}
                {tweet.public_metrics && (
                  <div className="flex space-x-6 text-sm text-muted-foreground pt-3 border-t border-border">
                    <span className="flex items-center space-x-1">
                      <span>💬</span>
                      <span>{tweet.public_metrics.reply_count.toLocaleString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>🔁</span>
                      <span>{tweet.public_metrics.retweet_count.toLocaleString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>❤️</span>
                      <span>{tweet.public_metrics.like_count.toLocaleString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>👁️</span>
                      <span>{tweet.public_metrics.impression_count.toLocaleString()}</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Load More Button */}
          {hasMore && (
            <div className="text-center py-6">
              <Button
                onClick={handleLoadMore}
                disabled={loading}
                variant="outline"
                className="px-8 py-2"
              >
                {loading ? 'Loading...' : 'Load More Tweets'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && tweets.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No tweets found
            </h3>
            <p className="text-muted-foreground">
              {activeTab === 'my_tweets' && 'You haven\'t posted any tweets yet.'}
              {activeTab === 'mentions' && 'No one has mentioned you recently.'}
              {activeTab === 'timeline' && 'Your timeline is empty.'}
              {activeTab === 'liked' && 'You haven\'t liked any tweets yet.'}
            </p>
          </div>
        </div>
      )}

      {/* Meta Information - Only show in development */}
      {process.env.NODE_ENV === 'development' && meta && Object.keys(meta).length > 0 && (
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2 text-foreground">API Response Info:</h3>
          <pre className="text-sm text-muted-foreground overflow-x-auto">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}