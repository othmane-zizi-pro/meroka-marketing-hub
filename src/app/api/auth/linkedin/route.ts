import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// LinkedIn OAuth 2.0 authorization URL
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'LinkedIn client ID not configured' },
        { status: 500 }
      );
    }

    // Build the authorization URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://meroka-marketing-hub.vercel.app'}/api/auth/linkedin/callback`;
    const scope = 'w_member_social';
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      returnUrl: request.nextUrl.searchParams.get('returnUrl') || '/posting'
    })).toString('base64');

    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate LinkedIn authorization' },
      { status: 500 }
    );
  }
}
