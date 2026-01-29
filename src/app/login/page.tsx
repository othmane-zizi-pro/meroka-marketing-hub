'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: 'meroka.com',
        },
      },
    });

    if (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'unauthorized_domain':
        return 'Access restricted to @meroka.com email addresses only.';
      case 'auth_callback_error':
        return 'Authentication failed. Please try again.';
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage(error);

  return (
    <Card className="w-full max-w-md border-brand-neutral-100 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-brown text-white text-2xl font-bold shadow-md">
          M
        </div>
        <CardTitle className="text-2xl text-brand-navy-900">Meroka Marketing Hub</CardTitle>
        <CardDescription className="text-brand-navy-600">
          AI-powered social media content for Meroka employees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
            {errorMessage}
          </div>
        )}

        <Button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full gap-3 h-12 bg-brand-navy-800 text-white hover:bg-brand-navy-900 border-none disabled:opacity-50"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </Button>

        <p className="text-center text-xs text-brand-navy-400 mt-4">
          Only @meroka.com email addresses are allowed
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-neutral-50 via-brand-neutral-100 to-brand-ice p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md border-brand-neutral-100 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-brown text-white text-2xl font-bold shadow-md">
              M
            </div>
            <CardTitle className="text-2xl text-brand-navy-900">Meroka Marketing Hub</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-navy-200 border-t-brand-navy-800" />
          </CardContent>
        </Card>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
