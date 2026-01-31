'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUser, useVoiceSamples } from '@/hooks/useUser';
import { Save, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser();
  const { samples, loading: samplesLoading, saving, updateSamples } = useVoiceSamples();

  const [blurb, setBlurb] = useState('');
  const [post1, setPost1] = useState('');
  const [post2, setPost2] = useState('');
  const [post3, setPost3] = useState('');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (samples) {
      setBlurb(samples.blurb || '');
      setPost1(samples.example_post_1 || '');
      setPost2(samples.example_post_2 || '');
      setPost3(samples.example_post_3 || '');
    }
  }, [samples]);

  const handleSave = async () => {
    setSaveMessage(null);
    const { error } = await updateSamples({
      blurb,
      example_post_1: post1,
      example_post_2: post2,
      example_post_3: post3,
    });

    if (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save. Please try again.' });
    } else {
      setSaveMessage({ type: 'success', text: 'Voice samples saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const loading = userLoading || samplesLoading;

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" subtitle="Manage your AI voice profile" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account information from Google</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-brand-neutral-100 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-5 w-32 bg-brand-neutral-100 rounded animate-pulse" />
                    <div className="h-4 w-48 bg-brand-neutral-100 rounded animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Avatar src={user?.avatar || undefined} alt={user?.name || 'User'} size="lg" />
                  <div>
                    <p className="text-lg font-medium text-brand-navy-900">{user?.name}</p>
                    <p className="text-sm text-brand-navy-500">{user?.email}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voice Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>Your Voice Profile</CardTitle>
              <CardDescription>
                This information helps the AI generate posts that sound like you.
                Update your blurb and provide example posts that represent your writing style.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 w-24 bg-brand-neutral-100 rounded animate-pulse" />
                      <div className="h-24 bg-brand-neutral-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Blurb */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-navy-900">
                      About You
                    </label>
                    <p className="text-xs text-brand-navy-500">
                      A short description of who you are and what you do at Meroka
                    </p>
                    <textarea
                      value={blurb}
                      onChange={(e) => setBlurb(e.target.value)}
                      placeholder="e.g., VP of Operations at Meroka. Focused on helping independent medical practices thrive..."
                      className="w-full min-h-[100px] px-3 py-2 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50 resize-none"
                    />
                  </div>

                  {/* Example Posts */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-brand-navy-900">
                        Example Posts
                      </label>
                      <p className="text-xs text-brand-navy-500">
                        Paste 3 LinkedIn posts you&apos;ve written that best represent your voice and style
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-brand-navy-600">Example Post 1</label>
                      <textarea
                        value={post1}
                        onChange={(e) => setPost1(e.target.value)}
                        placeholder="Paste your first example post here..."
                        className="w-full min-h-[120px] px-3 py-2 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50 resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-brand-navy-600">Example Post 2</label>
                      <textarea
                        value={post2}
                        onChange={(e) => setPost2(e.target.value)}
                        placeholder="Paste your second example post here..."
                        className="w-full min-h-[120px] px-3 py-2 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50 resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-brand-navy-600">Example Post 3</label>
                      <textarea
                        value={post3}
                        onChange={(e) => setPost3(e.target.value)}
                        placeholder="Paste your third example post here..."
                        className="w-full min-h-[120px] px-3 py-2 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50 resize-none"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-4 pt-4">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Voice Profile
                        </>
                      )}
                    </Button>

                    {saveMessage && (
                      <p className={`text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {saveMessage.text}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
