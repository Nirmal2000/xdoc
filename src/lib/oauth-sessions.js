import { supabase } from './supabase';
import crypto from 'crypto';

export async function createSession(state, codeVerifier, returnTo = null, clientSessionId = null) {
  const sessionId = clientSessionId || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  const { error } = await supabase
    .from('oauth_sessions')
    .insert({
      session_id: sessionId,
      state,
      code_verifier: codeVerifier,
      return_to: returnTo,
      expires_at: expiresAt.toISOString()
    });

  if (error) {
    throw new Error(`Failed to create OAuth session: ${error.message}`);
  }

  return sessionId;
}

export async function getSession(sessionId) {
  if (!sessionId) {
    return null;
  }

  const { data: session, error } = await supabase
    .from('oauth_sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error || !session) {
    return null;
  }

  // Check if session has expired
  const now = new Date();
  const expiresAt = new Date(session.expires_at);
  
  if (now > expiresAt) {
    // Session expired, clean it up
    await deleteSession(sessionId);
    return null;
  }

  return {
    sessionId: session.session_id,
    state: session.state,
    codeVerifier: session.code_verifier,
    returnTo: session.return_to,
    expiresAt: session.expires_at
  };
}

export async function deleteSession(sessionId) {
  if (!sessionId) {
    return;
  }

  const { error } = await supabase
    .from('oauth_sessions')
    .delete()
    .eq('session_id', sessionId);

  if (error) {
    console.warn(`Failed to delete OAuth session ${sessionId}:`, error.message);
  }
}

export async function cleanupExpiredSessions() {
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('oauth_sessions')
    .delete()
    .lt('expires_at', now);

  if (error) {
    console.warn('Failed to cleanup expired OAuth sessions:', error.message);
  } else {
    console.log('Cleanup completed for expired OAuth sessions');
  }
}