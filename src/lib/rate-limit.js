/**
 * Rate limiting utility using localStorage
 * Limits users to 10 messages per 12-hour period
 */

const RATE_LIMIT_KEY_PREFIX = 'rate_limit_';
const MAX_MESSAGES = 100;
const TIME_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

/**
 * Get the rate limit key for a user
 * @param {string} userId - The user ID
 * @returns {string} The localStorage key
 */
function getRateLimitKey(userId) {
  return `${RATE_LIMIT_KEY_PREFIX}${userId}`;
}

/**
 * Get current usage data for a user
 * @param {string} userId - The user ID
 * @returns {Object} Usage data with timestamps and count
 */
function getUserUsage(userId) {
  if (typeof window === 'undefined') return { timestamps: [], count: 0 };
  
  const key = getRateLimitKey(userId);
  const stored = localStorage.getItem(key);
  
  if (!stored) {
    return { timestamps: [], count: 0 };
  }
  
  try {
    const data = JSON.parse(stored);
    return {
      timestamps: Array.isArray(data.timestamps) ? data.timestamps : [],
      count: data.count || 0
    };
  } catch (error) {
    console.error('Error parsing rate limit data:', error);
    return { timestamps: [], count: 0 };
  }
}

/**
 * Clean expired timestamps from usage data
 * @param {Array} timestamps - Array of timestamp numbers
 * @returns {Array} Filtered timestamps within the time window
 */
function cleanExpiredTimestamps(timestamps) {
  const now = Date.now();
  const cutoff = now - TIME_WINDOW_MS;
  return timestamps.filter(timestamp => timestamp > cutoff);
}

/**
 * Save usage data for a user
 * @param {string} userId - The user ID
 * @param {Array} timestamps - Array of message timestamps
 */
function saveUserUsage(userId, timestamps) {
  if (typeof window === 'undefined') return;
  
  const key = getRateLimitKey(userId);
  const data = {
    timestamps,
    count: timestamps.length,
    lastUpdated: Date.now()
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving rate limit data:', error);
  }
}

/**
 * Check if a user has exceeded the rate limit
 * @param {string} userId - The user ID
 * @returns {Object} Rate limit check result
 */
export function checkRateLimit(userId) {
  if (!userId) {
    return {
      allowed: false,
      error: 'User ID is required',
      remainingMessages: 0,
      resetTime: null
    };
  }
  
  const usage = getUserUsage(userId);
  const cleanTimestamps = cleanExpiredTimestamps(usage.timestamps);
  
  // Update storage with cleaned timestamps
  if (cleanTimestamps.length !== usage.timestamps.length) {
    saveUserUsage(userId, cleanTimestamps);
  }
  
  const currentCount = cleanTimestamps.length;
  const remainingMessages = Math.max(0, MAX_MESSAGES - currentCount);
  
  // Calculate reset time (when the oldest message will expire)
  let resetTime = null;
  if (cleanTimestamps.length > 0) {
    const oldestTimestamp = Math.min(...cleanTimestamps);
    resetTime = new Date(oldestTimestamp + TIME_WINDOW_MS);
  }
  
  return {
    allowed: currentCount < MAX_MESSAGES,
    remainingMessages,
    resetTime,
    currentCount,
    maxMessages: MAX_MESSAGES,
    timeWindowHours: 12
  };
}

/**
 * Record a new message for rate limiting
 * @param {string} userId - The user ID
 * @returns {Object} Updated rate limit status
 */
export function recordMessage(userId) {
  if (!userId) {
    throw new Error('User ID is required to record message');
  }
  
  const usage = getUserUsage(userId);
  const cleanTimestamps = cleanExpiredTimestamps(usage.timestamps);
  
  // Add current timestamp
  const now = Date.now();
  cleanTimestamps.push(now);
  
  // Save updated usage
  saveUserUsage(userId, cleanTimestamps);
  
  // Return updated status
  return checkRateLimit(userId);
}

/**
 * Get formatted rate limit info for UI display
 * @param {string} userId - The user ID
 * @returns {Object} Formatted rate limit information
 */
export function getRateLimitInfo(userId) {
  const status = checkRateLimit(userId);
  
  if (!status.allowed && status.resetTime) {
    const hoursUntilReset = Math.ceil((status.resetTime.getTime() - Date.now()) / (60 * 60 * 1000));
    return {
      ...status,
      message: `Rate limit exceeded. You can send ${status.remainingMessages} more messages. Limit resets in ${hoursUntilReset} hours.`,
      resetInHours: hoursUntilReset
    };
  }
  
  return {
    ...status,
    message: `You can send ${status.remainingMessages} more messages in the next 12 hours.`
  };
}

/**
 * Clear rate limit data for a user (useful for testing or admin functions)
 * @param {string} userId - The user ID
 */
export function clearRateLimit(userId) {
  if (typeof window === 'undefined') return;
  
  const key = getRateLimitKey(userId);
  localStorage.removeItem(key);
}

/**
 * Clear all rate limit data (useful for testing)
 */
export function clearAllRateLimits() {
  if (typeof window === 'undefined') return;
  
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(RATE_LIMIT_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  });
}