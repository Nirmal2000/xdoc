import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/xoauth';

export const dynamic = 'force-dynamic';

async function fetchMe(accessToken) {
  const url = 'https://api.x.com/2/users/me?user.fields=profile_image_url,username,name';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`me fetch failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function GET() {
  const jar = await cookies();
  let accessToken = jar.get('x_access_token')?.value;
  const refreshToken = jar.get('x_refresh_token')?.value;
  const clientId = process.env.X_CLIENT_ID;
  console.log('[X Auth]', { accessToken, refreshToken, clientId })
  if (!accessToken && !refreshToken) {
    return Response.json({ loggedIn: false });
  }

  try {
    const me = await fetchMe(accessToken);
    return Response.json({ loggedIn: true, user: me?.data || null });
  } catch (e) {
    if ((e.status === 401 || e.status === 403) && refreshToken && clientId) {
      try {
        const token = await refreshAccessToken({ refreshToken, clientId });
        const now = Date.now();
        const accessExpires = new Date(now + (token.expires_in ?? 7200) * 1000);
        const refreshExpires = new Date(now + 30 * 24 * 60 * 60 * 1000);

        // Return JSON response and set CHIPS-partitioned cookies
        const me = await fetchMe(token.access_token);
        const res = NextResponse.json({ loggedIn: true, user: me?.data || null });
        const accessCookie = [
          `x_access_token=${encodeURIComponent(token.access_token)}`,
          'Path=/',
          `Expires=${accessExpires.toUTCString()}`,
          'HttpOnly',
          'Secure',
          'SameSite=None',
          'Partitioned',
        ].join('; ');
        res.headers.append('Set-Cookie', accessCookie);
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
          res.headers.append('Set-Cookie', refreshCookie);
        }
        return res;
      } catch (err) {
        // fallthrough to loggedOut
      }
    }
    return Response.json({ loggedIn: false });
  }
}
