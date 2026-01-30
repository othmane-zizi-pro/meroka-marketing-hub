'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ComposePostCardProps {
  campaignId: string;
  campaignName: string;
  onPostCreated: () => void;
}

const MAX_CHARS = 3000; // LinkedIn character limit

export function ComposePostCard({ campaignId, campaignName, onPostCreated }: ComposePostCardProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/campaign/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, content: content.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create post');
      }

      setContent('');
      onPostCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-brand-neutral-100 shadow-sm overflow-hidden mb-6">
      <div className="p-4 border-b border-brand-neutral-100">
        <h3 className="font-medium text-brand-navy-900">Compose Post</h3>
        <p className="text-sm text-brand-navy-500 mt-0.5">
          Share your thoughts for {campaignName}
        </p>
      </div>

      <div className="p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What would you like to share?"
          className="w-full min-h-[120px] p-3 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50 resize-none"
          disabled={loading}
        />

        <div className="flex items-center justify-between mt-3">
          <span className={`text-sm ${isOverLimit ? 'text-red-600' : 'text-brand-navy-400'}`}>
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Post
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}
