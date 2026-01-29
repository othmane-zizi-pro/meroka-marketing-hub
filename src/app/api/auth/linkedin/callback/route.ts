import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('LinkedIn OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/posting?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/posting?error=Missing authorization code', request.url)
      );
    }

    // Decode state
    let stateData: { userId: string; returnUrl: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/posting?error=Invalid state parameter', request.url)
      );
    }

    // Exchange code for access token
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://meroka-marketing-hub.vercel.app'}/api/auth/linkedin/callback`;

    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId!,
        client_secret: clientSecret!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL('/posting?error=Failed to get access token', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in; // seconds

    // Get LinkedIn user profile using the /me endpoint
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    let linkedinUserId = null;
    let linkedinName = null;

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      linkedinUserId = profileData.id;
      linkedinName = `${profileData.localizedFirstName || ''} ${profileData.localizedLastName || ''}`.trim() || null;
    }

    // Fetch organizations the user can post as (requires Advertising API)
    let organizationId = null;
    let organizationName = null;

    try {
      // Try multiple approaches to find organizations

      // Approach 1: organizationAcls endpoint
      let orgsResponse = await fetch(
        'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202401',
          },
        }
      );

      if (orgsResponse.ok) {
        const orgsData = await orgsResponse.json();
        console.log('organizationAcls response:', JSON.stringify(orgsData));
        if (orgsData.elements && orgsData.elements.length > 0) {
          const firstOrg = orgsData.elements[0];
          const orgUrn = firstOrg.organization || firstOrg.organizationalTarget;
          organizationId = orgUrn?.split(':').pop() || null;

          // Fetch organization details
          if (organizationId) {
            const orgDetailsResponse = await fetch(
              `https://api.linkedin.com/v2/organizations/${organizationId}`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'X-Restli-Protocol-Version': '2.0.0',
                },
              }
            );
            if (orgDetailsResponse.ok) {
              const orgDetails = await orgDetailsResponse.json();
              organizationName = orgDetails.localizedName || null;
            }
          }
        }
      } else {
        console.log('organizationAcls failed:', orgsResponse.status, await orgsResponse.text());
      }

      // Approach 2: If still no org, try organizationalEntityAcls
      if (!organizationId) {
        orgsResponse = await fetch(
          'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(localizedName)))',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'X-Restli-Protocol-Version': '2.0.0',
            },
          }
        );

        if (orgsResponse.ok) {
          const orgsData = await orgsResponse.json();
          console.log('organizationalEntityAcls response:', JSON.stringify(orgsData));
          if (orgsData.elements && orgsData.elements.length > 0) {
            const firstOrg = orgsData.elements[0];
            const orgUrn = firstOrg.organizationalTarget;
            organizationId = orgUrn?.split(':').pop() || null;
            organizationName = firstOrg['organizationalTarget~']?.localizedName || null;
          }
        } else {
          console.log('organizationalEntityAcls failed:', orgsResponse.status, await orgsResponse.text());
        }
      }
    } catch (orgError) {
      console.error('Error fetching organizations:', orgError);
    }

    console.log('Final organization data:', { organizationId, organizationName });

    // Store the token in Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Store as shared admin connection (used by all users to post as company)
    // We use 'shared_admin' as a special identifier so any team member can use it
    const { error: upsertError } = await supabase
      .from('linkedin_connections')
      .upsert({
        user_id: user.id,
        user_email: 'shared_admin',  // Shared connection identifier
        access_token: accessToken,
        expires_at: expiresAt,
        linkedin_user_id: linkedinUserId,
        linkedin_name: linkedinName,
        organization_id: organizationId,
        organization_name: organizationName,
        connected_by: user.email,  // Track who connected it
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_email'
      });

    if (upsertError) {
      console.error('Error storing LinkedIn token:', upsertError);
      return NextResponse.redirect(
        new URL('/posting?error=Failed to store LinkedIn connection', request.url)
      );
    }

    // Redirect back with success
    return NextResponse.redirect(
      new URL(`${stateData.returnUrl}?linkedin=connected`, request.url)
    );
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    return NextResponse.redirect(
      new URL('/posting?error=LinkedIn connection failed', request.url)
    );
  }
}
