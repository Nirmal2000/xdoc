import { supabase } from './supabase';
import crypto from 'crypto';

export async function createUserSession({
  userId,
  username,
  name,
  profileImageUrl,
  accessToken,
  refreshToken,
  tokenExpiresIn = 7200, // Default 2 hours
  userSessionId = null // Allow predefined sessionId
}) {
  const sessionId = userSessionId || crypto.randomUUID();
  const tokenExpiresAt = new Date(Date.now() + tokenExpiresIn * 1000);

  const { error } = await supabase
    .from('user_sessions')
    .insert({
      user_session_id: sessionId,
      user_id: userId,
      username,
      name,
      profile_image_url: profileImageUrl,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt.toISOString()
    });

  if (error) {
    throw new Error(`Failed to create user session: ${error.message}`);
  }

  return sessionId;
}

export async function getUserSession(userSessionId) {
  if (!userSessionId) {
    return null;
  }

  const { data: session, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_session_id', userSessionId)
    .single();

  if (error || !session) {
    return null;
  }

  // Update last_used_at
  await supabase
    .from('user_sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('user_session_id', userSessionId);

  return {
    userSessionId: session.user_session_id,
    userId: session.user_id,
    username: session.username,
    name: session.name,
    profileImageUrl: session.profile_image_url,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    tokenExpiresAt: session.token_expires_at,
    lastUsedAt: session.last_used_at
  };
}

export async function updateUserSessionTokens(userSessionId, {
  accessToken,
  refreshToken,
  tokenExpiresIn = 7200
}) {
  const tokenExpiresAt = new Date(Date.now() + tokenExpiresIn * 1000);

  const { error } = await supabase
    .from('user_sessions')
    .update({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt.toISOString(),
      last_used_at: new Date().toISOString()
    })
    .eq('user_session_id', userSessionId);

  if (error) {
    throw new Error(`Failed to update user session tokens: ${error.message}`);
  }
}

export async function deleteUserSession(userSessionId) {
  if (!userSessionId) {
    return;
  }

  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('user_session_id', userSessionId);

  if (error) {
    console.warn(`Failed to delete user session ${userSessionId}:`, error.message);
  }
}

export async function cleanupExpiredUserSessions() {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .lt('token_expires_at', now);

  if (error) {
    console.warn('Failed to cleanup expired user sessions:', error.message);
  } else {
    console.log('Cleanup completed for expired user sessions');
  }
}