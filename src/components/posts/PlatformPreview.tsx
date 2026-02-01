'use client';

import { cn } from '@/lib/utils';
import { XIcon } from '@/components/ui/icons';
import { ThumbsUp, MessageSquare, Repeat2, Send, Globe, Heart, Bookmark, Upload } from 'lucide-react';

interface PlatformPreviewProps {
  platform: 'linkedin' | 'x';
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  authorName?: string;
  authorHandle?: string;
  className?: string;
}

export function PlatformPreview({
  platform,
  content,
  mediaUrl,
  mediaType,
  authorName = 'Meroka',
  authorHandle = 'meroka_health',
  className,
}: PlatformPreviewProps) {
  if (platform === 'linkedin') {
    return <LinkedInPreview content={content} mediaUrl={mediaUrl} mediaType={mediaType} authorName={authorName} className={className} />;
  }
  return <XPreview content={content} mediaUrl={mediaUrl} mediaType={mediaType} authorName={authorName} authorHandle={authorHandle} className={className} />;
}

interface LinkedInPreviewProps {
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  authorName: string;
  className?: string;
}

function LinkedInPreview({ content, mediaUrl, mediaType, authorName, className }: LinkedInPreviewProps) {
  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 overflow-hidden max-w-[500px]", className)}>
      {/* Header */}
      <div className="p-3 flex items-start gap-2">
        <img
          src="/meroka-logo.png"
          alt="Meroka"
          className="h-12 w-12 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-gray-900 leading-tight">{authorName}</p>
          <p className="text-[12px] text-gray-500 leading-tight">Company · Healthcare</p>
          <p className="text-[12px] text-gray-500 leading-tight flex items-center gap-1">
            Just now · <Globe className="h-3 w-3" />
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-2">
        <p className="text-[14px] text-gray-900 whitespace-pre-wrap break-words">{content || 'Your post content will appear here...'}</p>
      </div>

      {/* Media */}
      {mediaUrl && (
        <div className="border-t border-gray-100">
          {mediaType === 'video' ? (
            <video
              src={mediaUrl}
              className="w-full max-h-[300px] object-cover"
              controls
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Post media"
              className="w-full max-h-[300px] object-cover"
            />
          )}
        </div>
      )}

      {/* Engagement counts */}
      <div className="px-3 py-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-[12px] text-gray-500">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <span className="h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px]">
                <ThumbsUp className="h-2.5 w-2.5" />
              </span>
              <span className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px]">
                <Heart className="h-2.5 w-2.5" />
              </span>
            </div>
            <span className="ml-1">0</span>
          </div>
          <span>0 comments · 0 reposts</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 py-1 border-t border-gray-100 flex justify-between">
        <button className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 text-[13px] font-medium">
          <ThumbsUp className="h-5 w-5" />
          <span>Like</span>
        </button>
        <button className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 text-[13px] font-medium">
          <MessageSquare className="h-5 w-5" />
          <span>Comment</span>
        </button>
        <button className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 text-[13px] font-medium">
          <Repeat2 className="h-5 w-5" />
          <span>Repost</span>
        </button>
        <button className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 text-[13px] font-medium">
          <Send className="h-5 w-5" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}

interface XPreviewProps {
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  authorName: string;
  authorHandle: string;
  className?: string;
}

function XPreview({ content, mediaUrl, mediaType, authorName, authorHandle, className }: XPreviewProps) {
  const charCount = content.length;
  const maxChars = 280;
  const isOverLimit = charCount > maxChars;

  return (
    <div className={cn("bg-black rounded-2xl border border-gray-800 overflow-hidden max-w-[500px]", className)}>
      {/* Header */}
      <div className="p-3 flex items-start gap-2">
        <img
          src="/meroka-logo.png"
          alt="Meroka"
          className="h-10 w-10 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-bold text-[15px] text-white">{authorName}</span>
            <span className="text-gray-500 text-[15px]">@{authorHandle}</span>
            <span className="text-gray-500 text-[15px]">·</span>
            <span className="text-gray-500 text-[15px]">1m</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-3 -mt-1 ml-12">
        <p className={cn(
          "text-[15px] whitespace-pre-wrap break-words leading-snug",
          isOverLimit ? "text-red-500" : "text-white"
        )}>
          {content || 'Your tweet will appear here...'}
        </p>
      </div>

      {/* Media */}
      {mediaUrl && (
        <div className="px-3 pb-3 ml-12">
          {mediaType === 'video' ? (
            <video
              src={mediaUrl}
              className="w-full rounded-2xl max-h-[300px] object-cover"
              controls
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Post media"
              className="w-full rounded-2xl max-h-[300px] object-cover"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-3 py-2 ml-12 flex items-center justify-between pr-16">
        <button className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors">
          <MessageSquare className="h-[18px] w-[18px]" />
        </button>
        <button className="flex items-center gap-1 text-gray-500 hover:text-green-400 transition-colors">
          <Repeat2 className="h-[18px] w-[18px]" />
        </button>
        <button className="flex items-center gap-1 text-gray-500 hover:text-pink-400 transition-colors">
          <Heart className="h-[18px] w-[18px]" />
        </button>
        <button className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors">
          <Bookmark className="h-[18px] w-[18px]" />
        </button>
        <button className="flex items-center gap-1 text-gray-500 hover:text-blue-400 transition-colors">
          <Upload className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Character count */}
      <div className="px-3 pb-3 ml-12 flex justify-end pr-4">
        <span className={cn(
          "text-[13px]",
          isOverLimit ? "text-red-500" : charCount > maxChars * 0.9 ? "text-yellow-500" : "text-gray-500"
        )}>
          {charCount}/{maxChars}
        </span>
      </div>
    </div>
  );
}
