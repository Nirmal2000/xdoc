// Utility helpers for X OAuth 2.0 (PKCE - plain)
// Public client: uses code_challenge_method=plain

import crypto from 'crypto';

const X_SCOPES = ['tweet.read', 'users.read', 'offline.access'];

export function generateCodeVerifier() {
  // RFC 7636: 43-128 characters, use URL-safe characters
  return crypto.randomBytes(48).toString('base64url');
}

export function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

export function buildAuthorizeUrl({ clientId, redirectUri, codeChallenge, state }) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: X_SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'plain',
  });
  return `https://x.com/i/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken({ code, clientId, redirectUri, codeVerifier }) {
  const clientSecret = process.env.X_CLIENT_SECRET;
  const baseBody = {
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  };

  // Public client: include client_id in body, no Authorization header
  // Confidential client (if X_CLIENT_SECRET present): use Basic auth, omit client_id from body
  const body = new URLSearchParams(
    clientSecret ? baseBody : { ...baseBody, client_id: clientId }
  );

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${basic}`;
  }

  const res = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function refreshAccessToken({ refreshToken, clientId }) {
  const clientSecret = process.env.X_CLIENT_SECRET;

  const body = new URLSearchParams(
    clientSecret
      ? { refresh_token: refreshToken, grant_type: 'refresh_token' }
      : { refresh_token: refreshToken, grant_type: 'refresh_token', client_id: clientId }
  );

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${basic}`;
  }

  const res = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers,
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Refresh failed: ${res.status} ${text}`);
  }
  return res.json();
}
