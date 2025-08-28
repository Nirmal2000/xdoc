import { deleteUserSession } from '@/lib/user-sessions';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { userSessionId } = await req.json();
    
    if (userSessionId) {
      // Delete user session from database
      await deleteUserSession(userSessionId);
    }
    
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[X LOGOUT ERROR]', error);
    return new Response(null, { status: 204 }); // Always succeed for logout
  }
}

