import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST() {
  const jar = await cookies();
  jar.delete('x_access_token');
  jar.delete('x_refresh_token');
  jar.delete('x_oauth_state');
  jar.delete('x_code_verifier');
  return new Response(null, { status: 204 });
}

