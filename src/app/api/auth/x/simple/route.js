import { RapidAPIProvider } from '@/lib/rapidapi-provider.js';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        const { handle } = await req.json();

        if (!handle || typeof handle !== 'string' || !handle.trim()) {
            return Response.json({ error: 'Invalid handle provided' }, { status: 400 });
        }

        const provider = new RapidAPIProvider();

        // Get user info from RapidAPI
        const userInfo = await provider.get_user_info_twitter(handle.trim());

        if (!userInfo) {
            return Response.json({
                error: 'Could not fetch user information. Please check the handle and try again.'
            }, { status: 400 });
        }

        // Return user data in format compatible with existing UI
        return Response.json({
            loggedIn: true,
            user: {
                id: userInfo.username, // Use username as ID for simple auth
                username: userInfo.handle,
                name: userInfo.name,
                profile_image_url: userInfo.avatar
            }
        });

    } catch (error) {
        console.error('[Simple Auth] Error:', error);
        return Response.json({
            error: 'Authentication failed. Please try again.'
        }, { status: 500 });
    }
}

export async function DELETE() {
    // This endpoint could be used for logout validation on server side
    return Response.json({ success: true });
}