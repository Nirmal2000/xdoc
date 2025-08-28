import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { exchangeCodeForToken, verifySignedState } from '@/lib/xoauth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return new Response(`Authorization failed: ${error}`, { status: 400 });
  }
  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 });
  }

  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response('Missing X OAuth env: X_CLIENT_ID or X_REDIRECT_URI', { status: 500 });
  }

  const jar = await cookies();
  // Stateless state verification
  let codeVerifier;
  let returnTo;
  let popupMode = false;
  try {
    const payload = verifySignedState(state);
    codeVerifier = payload.cv;
    returnTo = payload.rt || undefined;
    popupMode = !!payload.pm;
  } catch (e) {
    return new Response('Invalid or expired OAuth state', { status: 400 });
  }

  try {
    const token = await exchangeCodeForToken({
      code,
      clientId,
      redirectUri,
      codeVerifier,
    });

    // token contains: access_token, refresh_token (if offline.access), expires_in, token_type, scope
    const now = Date.now();
    const accessExpires = new Date(now + (token.expires_in ?? 7200) * 1000);
    const refreshExpires = new Date(now + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Build Set-Cookie headers (CHIPS/partitioned)
    const accessCookie = [
      `x_access_token=${encodeURIComponent(token.access_token)}`,
      'Path=/',
      `Expires=${accessExpires.toUTCString()}`,
      'HttpOnly',
      'Secure',
      'SameSite=None',
      'Partitioned',
    ].join('; ');
    const cookieHeaders = [accessCookie];
    if (token.refresh_token) {
      const refreshCookie = [
        `x_refresh_token=${encodeURIComponent(token.refresh_token)}`,
        'Path=/',
        `Expires=${refreshExpires.toUTCString()}`,
        'HttpOnly',
        'Secure',
        'SameSite=None',
        'Partitioned',
      ].join('; ');
      cookieHeaders.push(refreshCookie);
    }

    if (popupMode) {
      // Render a tiny handoff page that notifies the opener (the iframe window) and closes
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Login Complete</title></head><body>
<script>
(function(){
  try {
    var msg = { type: 'x-auth', status: 'ok' };
    var targetOrigin = window.location.origin;
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(msg, targetOrigin);
    }
  } catch (e) {}
  try { window.close(); } catch(e) {}
  // Fallback redirect if popup couldn't close
  try { window.location.replace(${JSON.stringify(returnTo || '/')}); } catch(e) {}
})();
</script>
</body></html>`;
      const res = new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
      cookieHeaders.forEach((c) => res.headers.append('Set-Cookie', c));
      return res;
    } else {
      const dest = returnTo || process.env.NEXT_PUBLIC_POST_LOGIN_REDIRECT || '/';
      const absoluteDest = new URL(dest, req.url).toString();
      const res = NextResponse.redirect(absoluteDest, { status: 302 });
      cookieHeaders.forEach((c) => res.headers.append('Set-Cookie', c));
      return res;
    }
  } catch (e) {
    return new Response(`Token exchange error: ${e.message}`, { status: 500 });
  }
}
