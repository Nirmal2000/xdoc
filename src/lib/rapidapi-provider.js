/**
 * RapidAPI provider for Twitter operations
 */
export class RapidAPIProvider {
    constructor() {
        this.apiKey = process.env.RAPIDAPI_KEY;
        this.headers = {
            "x-rapidapi-host": "twitter-api45.p.rapidapi.com",
            "x-rapidapi-key": this.apiKey
        };
        this.baseUrl = "https://twitter-api45.p.rapidapi.com";
    }

    async fetchTweets(handler, targetPosts = 25, startDate = null) {
        const allTweets = [];
        let cursor = null;
        const maxTweets = 100; // Hard limit

        // Clean handler - remove @ and any URL parts
        const screenname = handler.replace("@", "").split("/").pop();

        // Parse start date if provided
        let startDateObj = null;
        if (startDate) {
            startDateObj = new Date(startDate);
        }

        while (allTweets.length < Math.min(targetPosts, maxTweets)) {
            // Build URL with cursor if available
            const url = `${this.baseUrl}/timeline.php`;
            const params = new URLSearchParams({ screenname });

            if (cursor) {
                params.append("cursor", cursor);
            }

            const response = await fetch(`${url}?${params.toString()}`, {
                headers: this.headers,
                cache: 'no-store',
            });

            if (response.status !== 200) {
                throw new Error(`RapidAPI request failed: ${response.status}`);
            }

            const data = await response.json();

            // Extract timeline tweets
            const timeline = data.timeline || [];
            if (!timeline.length) {
                break;
            }

            // Add tweets until date criteria or limits are met (tweets are ordered by time)
            for (const tweet of timeline) {
                if (allTweets.length >= targetPosts || allTweets.length >= maxTweets) {
                    break;
                }

                // Check date filter if startDate is provided
                if (startDateObj && tweet.created_at) {
                    const tweetDate = new Date(tweet.created_at);
                    if (tweetDate < startDateObj) {
                        return allTweets.slice(0, Math.min(targetPosts, maxTweets));
                    }
                }

                allTweets.push(tweet);
            }

            // Check for next cursor
            const nextCursor = data.next_cursor;
            if (!nextCursor) {
                break;
            }

            cursor = nextCursor;

            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return allTweets.slice(0, Math.min(targetPosts, maxTweets));
    }

    async get_user_info(platform, handler) {
        // For backward compatibility, but we only support twitter
        return this.get_user_info_twitter(handler);
    }

    async get_user_info_twitter(handler) {
        try {
            // Clean handler - remove @ and any URL parts
            const screenname = handler.replace("@", "").split("/").pop();

            const url = `${this.baseUrl}/screenname.php`;
            const params = new URLSearchParams({ screenname });

            const response = await fetch(`${url}?${params.toString()}`, {
                headers: this.headers,
                cache: 'no-store',
            });

            if (response.status !== 200) {
                console.log(`RapidAPI user info request failed: ${response.status}`);
                return null;
            }

            const data = await response.json();

            // Extract name, avatar, and handle from response
            let name = data.name || "";
            let avatar = data.avatar || "";
            const handle = data.profile || screenname;

            // Try to get higher resolution avatar if available
            if (avatar && avatar.includes("_normal")) {
                // Try _400x400 first, fallback to _normal if not available
                const highResAvatar = avatar.replace("_normal", "_400x400");

                // Check if high-res version exists
                const checkResponse = await fetch(highResAvatar, { method: 'HEAD' });
                if (checkResponse.ok) {
                    avatar = highResAvatar;
                }
            }

            return {
                name,
                avatar,
                handle,
                username: handle // Add username field for compatibility
            };

        } catch (error) {
            console.error(`Error fetching user info for ${handler}:`, error);
            return null;
        }
    }

    normalizePostData(postData) {
        const textParts = [];

        // Extract text content
        if (postData.text) {
            textParts.push(`Tweet: ${postData.text}`);
        }

        // Add engagement metrics
        if (postData.favorites) {
            textParts.push(`Likes: ${postData.favorites}`);
        }

        if (postData.replies) {
            textParts.push(`Replies: ${postData.replies}`);
        }

        if (postData.retweets) {
            textParts.push(`Reposts: ${postData.retweets}`);
        }

        if (postData.views) {
            // Views might be string, convert to int for display
            try {
                const viewsCount = typeof postData.views === 'string' ? parseInt(postData.views) : postData.views;
                textParts.push(`Views: ${viewsCount}`);
            } catch (error) {
                textParts.push(`Views: ${postData.views}`);
            }
        }

        if (postData.bookmarks) {
            textParts.push(`Bookmarks: ${postData.bookmarks}`);
        }

        if (postData.created_at) {
            textParts.push(`Posted: ${postData.created_at}`);
        }

        return {
            text: textParts.length > 0 ? textParts.join("\n") : "",
        };
    }
}