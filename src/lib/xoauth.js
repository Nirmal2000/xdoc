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

// Stateless signed state helpers
function getStateSecret() {
  const secret = process.env.X_STATE_SECRET || process.env.X_CLIENT_SECRET;
  if (!secret) {
    throw new Error('Missing X_STATE_SECRET (or X_CLIENT_SECRET) for state signing');
  }
  return secret;
}

export function createSignedState({ codeVerifier, returnTo, ttlSeconds = 600 }) {
  const payload = {
    cv: codeVerifier,
    rt: returnTo || null,
    ts: Math.floor(Date.now() / 1000),
    n: crypto.randomBytes(8).toString('hex'),
    t: ttlSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getStateSecret())
    .update(payloadB64)
    .digest('base64url');
  return `v1.${payloadB64}.${sig}`;
}

export function verifySignedState(stateToken) {
  if (!stateToken || typeof stateToken !== 'string') throw new Error('Missing state');
  const parts = stateToken.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') throw new Error('Invalid state format');
  const [_, payloadB64, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getStateSecret())
    .update(payloadB64)
    .digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    throw new Error('State signature mismatch');
  }
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (payload.ts + (payload.t || 600) < now) {
    throw new Error('State expired');
  }
  return payload; // { cv, rt, ts, n, t }
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
