import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check domain restriction
      if (!data.user.email?.endsWith('@meroka.com')) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=unauthorized_domain`)
      }

      // Create user in users table if not exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', data.user.email)
        .single()

      if (!existingUser) {
        // Get name from Google OAuth metadata
        const name = data.user.user_metadata?.full_name
          || data.user.user_metadata?.name
          || data.user.email?.split('@')[0]
          || 'User'

        const avatarUrl = data.user.user_metadata?.avatar_url
          || data.user.user_metadata?.picture
          || null

        // Insert new user with Meroka account
        await supabase.from('users').insert({
          auth_id: data.user.id,
          account_id: 'a0000000-0000-0000-0000-000000000001', // Meroka account
          email: data.user.email,
          name: name,
          avatar_url: avatarUrl,
          role: 'contributor',
        })
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return to login with error if something went wrong
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
