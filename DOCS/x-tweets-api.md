# X Tweets API Documentation

This document describes the X Tweets API endpoints that allow you to fetch tweets from authenticated X users.

## Prerequisites

1. User must be authenticated with X OAuth (using the existing `useXAuth` hook)
2. User session must be active and stored in the database
3. Required X OAuth scopes: `tweet.read`, `users.read`, `offline.access`

## API Endpoints

### 1. Simple User Tweets API

**Endpoint**: `/api/auth/x/tweets`

**Method**: `GET`

**Description**: Fetches the authenticated user's own tweets (simplified API)

**Query Parameters**:
- `userSessionId` (required): The user session ID from localStorage
- `max_results` (optional): Number of tweets to fetch (5-100, default: 10)
- `pagination_token` (optional): Token for pagination

**Example Request**:
```javascript
const response = await fetch(`/api/auth/x/tweets?userSessionId=${sessionId}&max_results=20`);
const result = await response.json();
```

**Response Format**:
```json
{
  "success": true,
  "data": [...], // Array of tweets
  "includes": {...}, // User and media data
  "meta": {...} // Pagination and count info
}
```

### 2. Advanced Tweets API

**Endpoint**: `/api/auth/x/tweets-v2`

**Method**: `GET`

**Description**: Comprehensive tweets API supporting different tweet types and filtering options

**Query Parameters**:
- `userSessionId` (required): The user session ID from localStorage
- `type` (optional): Type of tweets to fetch. Options:
  - `user_tweets` (default): User's own tweets
  - `user_mentions`: Tweets mentioning the user
  - `home_timeline`: User's home timeline
  - `liked_tweets`: Tweets liked by the user
- `max_results` (optional): Number of tweets (5-100, default: 10)
- `pagination_token` (optional): For pagination
- `since_id` (optional): Fetch tweets posted after this tweet ID
- `until_id` (optional): Fetch tweets posted before this tweet ID
- `start_time` (optional): Fetch tweets created after this time (ISO 8601)
- `end_time` (optional): Fetch tweets created before this time (ISO 8601)
- `exclude_replies` (optional): Set to `true` to exclude replies
- `exclude_retweets` (optional): Set to `true` to exclude retweets

**Example Request**:
```javascript
const response = await fetch(`/api/auth/x/tweets-v2?userSessionId=${sessionId}&type=user_mentions&max_results=50&exclude_replies=true`);
const result = await response.json();
```

**Response Format**:
```json
{
  "success": true,
  "type": "user_mentions",
  "data": [...], // Array of tweets
  "includes": {
    "users": [...], // User objects
    "media": [...] // Media objects
  },
  "meta": {
    "result_count": 10,
    "next_token": "...", // For pagination
    "newest_id": "...",
    "oldest_id": "..."
  },
  "user": {
    "id": "...",
    "username": "...",
    "name": "..."
  }
}
```

## React Hook Usage

### useXTweets Hook

The `useXTweets` hook provides a convenient way to interact with the tweets API:

```javascript
import { useXTweets } from '@/hooks/useXTweets';

function MyComponent() {
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

  // Fetch user's tweets
  const handleFetchTweets = async () => {
    await fetchMyTweets({
      maxResults: 20,
      excludeReplies: true,
      excludeRetweets: false
    });
  };

  // Load more tweets (pagination)
  const handleLoadMore = async () => {
    await loadMore('user_tweets');
  };

  return (
    <div>
      <button onClick={handleFetchTweets}>Load My Tweets</button>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {tweets.map(tweet => (
        <div key={tweet.id}>{tweet.text}</div>
      ))}
      {hasMore && (
        <button onClick={handleLoadMore}>Load More</button>
      )}
    </div>
  );
}
```

### Available Hook Methods

- `fetchMyTweets(options)`: Fetch user's own tweets
- `fetchMyMentions(options)`: Fetch tweets mentioning the user
- `fetchHomeTimeline(options)`: Fetch user's home timeline
- `fetchLikedTweets(options)`: Fetch tweets liked by the user
- `loadMore(type)`: Load more tweets with pagination
- `clear()`: Clear current tweets and reset state

### Options Object

```javascript
const options = {
  maxResults: 20,        // Number of tweets (5-100)
  paginationToken: '',   // For pagination
  sinceId: '',          // Fetch tweets after this ID
  untilId: '',          // Fetch tweets before this ID
  startTime: '',        // ISO 8601 timestamp
  endTime: '',          // ISO 8601 timestamp
  excludeReplies: true, // Exclude reply tweets
  excludeRetweets: true // Exclude retweets
};
```

## Tweet Data Structure

Each tweet object contains:

```javascript
{
  "id": "1234567890",
  "text": "This is a tweet...",
  "created_at": "2024-01-15T10:30:00.000Z",
  "author_id": "987654321",
  "public_metrics": {
    "reply_count": 5,
    "retweet_count": 12,
    "like_count": 45,
    "impression_count": 1000
  },
  "context_annotations": [...], // Topic/entity annotations
  "referenced_tweets": [...],   // Replies, retweets, quotes
  "reply_settings": "everyone", // Who can reply
  "source": "Twitter Web App",  // How tweet was posted
  "lang": "en",                // Language
  "possibly_sensitive": false  // Content warning flag
}
```

## User Data Structure (in includes)

```javascript
{
  "id": "987654321",
  "username": "example_user",
  "name": "Example User",
  "profile_image_url": "https://...",
  "verified": true,
  "description": "User bio...",
  "public_metrics": {
    "followers_count": 1000,
    "following_count": 500,
    "tweet_count": 2500,
    "listed_count": 25
  }
}
```

## Error Handling

Both APIs include comprehensive error handling:

- **400**: Invalid parameters (missing userSessionId, invalid max_results, etc.)
- **401**: Authentication failed or session expired
- **500**: Server error or X API error

The APIs automatically handle token refresh when tokens expire (401/403 errors).

## Rate Limiting

Follow X API rate limits:
- User tweets: 300 requests per 15-minute window
- User mentions: 75 requests per 15-minute window
- Home timeline: 300 requests per 15-minute window
- Liked tweets: 75 requests per 15-minute window

## Example Component

See `src/components/ui/tweets-display.jsx` for a complete example component that demonstrates:
- Tab-based navigation between different tweet types
- Loading states and error handling
- Pagination with "Load More" functionality
- Proper tweet rendering with user information and metrics

## Security Notes

1. The `userSessionId` is stored in localStorage and used to authenticate API requests
2. Access tokens are automatically refreshed when expired
3. All API calls are server-side to protect access tokens
4. User sessions are stored securely in the database with expiration

## Migration from Cookie-based Auth

This implementation uses database-based session storage instead of cookies, making it compatible with iframe environments and third-party cookie restrictions.