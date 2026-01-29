'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

interface VoiceSamples {
  id: string;
  email: string;
  example_post_1: string;
  example_post_2: string;
  example_post_3: string;
  blurb: string;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          avatar: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export function useVoiceSamples() {
  const { user } = useUser();
  const [samples, setSamples] = useState<VoiceSamples | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    async function fetchSamples() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('employee_voice_samples')
        .select('*')
        .eq('email', user!.email)
        .single();

      if (data && !error) {
        setSamples(data);
      }
      setLoading(false);
    }

    fetchSamples();
  }, [user?.email]);

  const updateSamples = async (updates: Partial<VoiceSamples>) => {
    if (!user?.email) return { error: 'Not authenticated' };

    setSaving(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('employee_voice_samples')
      .upsert({
        email: user.email,
        ...samples,
        ...updates,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' })
      .select()
      .single();

    if (data && !error) {
      setSamples(data);
    }
    setSaving(false);

    return { data, error };
  };

  return { samples, loading, saving, updateSamples };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = '/login';
}
