'use client';

import { useState, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Linkedin, Instagram, Send, Check, AlertCircle, Loader2, Image, X, Film } from 'lucide-react';
import { XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

type Channel = 'x' | 'linkedin' | 'instagram';

interface ChannelConfig {
  id: Channel;
  name: string;
  icon: React.ElementType;
  maxLength: number;
  available: boolean;
  color: string;
}

const channels: ChannelConfig[] = [
  { id: 'x', name: 'X', icon: XIcon, maxLength: 280, available: true, color: 'bg-black' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, maxLength: 3000, available: false, color: 'bg-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, maxLength: 2200, available: false, color: 'bg-gradient-to-br from-purple-600 to-pink-500' },
];

export default function PostingPage() {
  const [selectedChannel, setSelectedChannel] = useState<Channel>('x');
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; tweetId?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentChannel = channels.find(c => c.id === selectedChannel)!;
  const characterCount = content.length;
  const isOverLimit = characterCount > currentChannel.maxLength;
  const canPost = content.trim().length > 0 && !isOverLimit && currentChannel.available;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
    if (!validTypes.includes(file.type)) {
      setResult({
        success: false,
        message: 'Invalid file type. Use JPG, PNG, GIF, WebP, or MP4.',
      });
      return;
    }

    // Validate file size
    const maxSize = file.type.startsWith('video/') ? 512 * 1024 * 1024
      : file.type.includes('gif') ? 15 * 1024 * 1024
      : 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setResult({
        success: false,
        message: `File too large. Max size: ${maxSize / 1024 / 1024}MB`,
      });
      return;
    }

    setMediaFile(file);
    setResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePost = async () => {
    if (!canPost || isPosting) return;

    setIsPosting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      if (mediaFile) {
        formData.append('media', mediaFile);
      }

      const response = await fetch('/api/post/x', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: 'Posted successfully!',
          tweetId: data.tweet?.id,
        });
        setContent('');
        removeMedia();
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to post',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error. Please try again.',
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Posting"
        subtitle="Publish content to social media channels"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Channel Selection */}
          <Card className="border-brand-neutral-100">
            <CardHeader>
              <CardTitle className="text-brand-navy-900">Select Channel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {channels.map((channel) => {
                  const Icon = channel.icon;
                  const isSelected = selectedChannel === channel.id;

                  return (
                    <button
                      key={channel.id}
                      onClick={() => channel.available && setSelectedChannel(channel.id)}
                      disabled={!channel.available}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        isSelected
                          ? "border-brand-brown bg-brand-brown/5"
                          : "border-brand-neutral-200 hover:border-brand-neutral-300",
                        !channel.available && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full text-white",
                        channel.color
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className={cn(
                        "font-medium",
                        isSelected ? "text-brand-brown" : "text-brand-navy-700"
                      )}>
                        {channel.name}
                      </span>
                      {!channel.available && (
                        <span className="text-xs text-brand-navy-400">Coming soon</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Compose */}
          <Card className="border-brand-neutral-100">
            <CardHeader>
              <CardTitle className="text-brand-navy-900">Compose</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`What's happening?`}
                  className={cn(
                    "w-full min-h-[150px] p-4 text-base border rounded-xl resize-none focus:outline-none focus:ring-2",
                    isOverLimit
                      ? "border-red-300 focus:ring-red-500/50"
                      : "border-brand-neutral-200 focus:ring-brand-brown/50"
                  )}
                />
                <div className={cn(
                  "absolute bottom-3 right-3 text-sm font-medium",
                  isOverLimit ? "text-red-500" : "text-brand-navy-400"
                )}>
                  {characterCount}/{currentChannel.maxLength}
                </div>
              </div>

              {/* Media Preview */}
              {mediaPreview && (
                <div className="relative inline-block">
                  {mediaFile?.type.startsWith('video/') ? (
                    <video
                      src={mediaPreview}
                      className="max-h-64 rounded-lg border border-brand-neutral-200"
                      controls
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="max-h-64 rounded-lg border border-brand-neutral-200"
                    />
                  )}
                  <button
                    onClick={removeMedia}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Media Upload Button */}
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-navy-600 bg-brand-neutral-100 rounded-lg hover:bg-brand-neutral-200 transition-colors"
                >
                  <Image className="h-4 w-4" />
                  Add Image
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-navy-600 bg-brand-neutral-100 rounded-lg hover:bg-brand-neutral-200 transition-colors"
                >
                  <Film className="h-4 w-4" />
                  Add Video
                </button>
                <span className="text-xs text-brand-navy-400">
                  Images: 5MB max | GIFs: 15MB | Videos: 512MB
                </span>
              </div>

              {/* Result message */}
              {result && (
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg",
                  result.success
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                )}>
                  {result.success ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <span>{result.message}</span>
                  {result.tweetId && (
                    <a
                      href={`https://x.com/i/status/${result.tweetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-sm underline"
                    >
                      View post
                    </a>
                  )}
                </div>
              )}

              {/* Post button */}
              <div className="flex justify-end">
                <Button
                  onClick={handlePost}
                  disabled={!canPost || isPosting}
                  className="gap-2 px-6"
                >
                  {isPosting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Post to {currentChannel.name}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Posts (placeholder) */}
          <Card className="border-brand-neutral-100">
            <CardHeader>
              <CardTitle className="text-brand-navy-900">Recent Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-brand-navy-500 text-center py-8">
                Your recent posts will appear here
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
