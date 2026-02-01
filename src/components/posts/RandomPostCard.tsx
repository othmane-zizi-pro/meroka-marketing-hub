'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Check, X, ExternalLink, Send, Clock, FileEdit, Sparkles, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlatformPreview } from '@/components/posts/PlatformPreview';
import { AIGenerationModal } from '@/components/posts/AIGenerationModal';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from '@/lib/utils';
import { GenerationMetadata } from '@/types/generation';

interface EditHistoryItem {
  id: string;
  editor_email: string;
  editor_name: string;
  previous_content: string;
  new_content: string;
  edit_summary: string | null;
  created_at: string;
}

interface InspirationPost {
  id: string;
  content: string;
  external_url: string | null;
  author_name: string;
  channel: string;
}

interface RandomPost {
  id: string;
  content: string;
  channel: string;
  status: string;
  current_content: string | null;
  created_at: string;
  updated_at: string | null;
  inspiration: InspirationPost | null;
  edit_history: EditHistoryItem[];
  media_url?: string;
  media_type?: string;
  generation_metadata?: GenerationMetadata | null;
}

interface RandomPostCardProps {
  post: RandomPost;
  currentUserEmail?: string;
  onEdit: (postId: string, content: string, summary: string) => Promise<void>;
  onAction: (postId: string, action: 'proofreading' | 'publish' | 'schedule', scheduledFor?: string) => Promise<void>;
}

const ADMIN_EMAIL = 'othmane.zizi@meroka.com';

export function RandomPostCard({ post, currentUserEmail, onEdit, onAction }: RandomPostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.current_content || post.content);
  const [editSummary, setEditSummary] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showAIDetailsModal, setShowAIDetailsModal] = useState(false);

  const currentContent = post.current_content || post.content;
  const hasEdits = post.edit_history && post.edit_history.length > 0;

  const handleSaveEdit = async () => {
    if (editLoading || !editContent.trim()) return;
    setEditLoading(true);

    try {
      await onEdit(post.id, editContent.trim(), editSummary.trim());
      setIsEditing(false);
      setEditSummary('');
    } catch (error) {
      console.error('Error saving edit:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(currentContent);
    setEditSummary('');
    setIsEditing(false);
  };

  const handleAction = async (action: 'proofreading' | 'publish' | 'schedule') => {
    if (action === 'schedule') {
      setShowScheduleModal(true);
      return;
    }

    setActionLoading(action);
    try {
      await onAction(post.id, action);
    } catch (error) {
      console.error('Error performing action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleScheduleConfirm = async () => {
    if (!scheduledDate || !scheduledTime) return;

    setActionLoading('schedule');
    try {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      await onAction(post.id, 'schedule', scheduledFor);
      setShowScheduleModal(false);
      setScheduledDate('');
      setScheduledTime('');
    } catch (error) {
      console.error('Error scheduling:', error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-brand-neutral-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-brand-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              <Sparkles className="h-3 w-3" />
              AI Generated
            </span>
            <span className="text-xs text-brand-navy-400">
              {formatDistanceToNow(new Date(post.created_at))}
            </span>
            {hasEdits && (
              <span className="text-xs text-brand-navy-400">
                · {post.edit_history.length} edit{post.edit_history.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {!isEditing && (
            <div className="flex items-center gap-1">
              {/* AI Details Button - only visible to admin when metadata exists */}
              {currentUserEmail === ADMIN_EMAIL && post.generation_metadata && (
                <button
                  onClick={() => setShowAIDetailsModal(true)}
                  className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500 hover:text-purple-700 transition-colors"
                  title="View AI generation details"
                >
                  <Cpu className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg hover:bg-brand-neutral-50 text-brand-navy-400 hover:text-brand-navy-600 transition-colors"
                title="Edit post"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[150px] p-3 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50 resize-none"
              placeholder="Edit the post content..."
            />
            <input
              type="text"
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              placeholder="What did you change? (optional)"
              className="w-full px-3 py-2 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={editLoading}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={editLoading || !editContent.trim()}
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-brand-navy-800 whitespace-pre-wrap">{currentContent}</p>
        )}
      </div>

      {/* Inspiration Source */}
      {post.inspiration && (
        <div className="px-4 pb-3">
          <div className="p-3 bg-brand-neutral-50 rounded-lg">
            <p className="text-xs text-brand-navy-500 mb-1">Inspired by:</p>
            <p className="text-sm text-brand-navy-700 line-clamp-2">
              &ldquo;{post.inspiration.content?.substring(0, 150)}{post.inspiration.content && post.inspiration.content.length > 150 ? '...' : ''}&rdquo;
            </p>
            {post.inspiration.external_url && (
              <a
                href={post.inspiration.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-brand-brown hover:underline"
              >
                View original <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Preview Toggle */}
      <div className="px-4 pb-3">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
            showPreview
              ? "bg-brand-brown text-white"
              : "bg-brand-neutral-100 text-brand-navy-600 hover:bg-brand-neutral-200"
          )}
        >
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>

        {showPreview && (
          <div className="mt-3">
            <PlatformPreview
              platform={post.channel as 'linkedin' | 'x'}
              content={currentContent}
              mediaUrl={post.media_url}
              mediaType={post.media_type as 'image' | 'video' | undefined}
            />
          </div>
        )}
      </div>

      {/* Edit History */}
      {hasEdits && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-brand-navy-500 hover:text-brand-navy-700"
          >
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Edit History ({post.edit_history.length} version{post.edit_history.length !== 1 ? 's' : ''})
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {post.edit_history.map((edit, index) => (
                <div
                  key={edit.id}
                  className="p-3 bg-brand-neutral-50 rounded-lg border-l-2 border-brand-brown"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-brand-navy-800">
                      v{post.edit_history.length - index}
                    </span>
                    <span className="text-xs text-brand-navy-400">
                      {formatDistanceToNow(new Date(edit.created_at))}
                    </span>
                  </div>
                  <p className="text-xs text-brand-navy-600 mb-1">
                    by {edit.editor_name}
                  </p>
                  {edit.edit_summary && (
                    <p className="text-sm text-brand-navy-700 italic">
                      &ldquo;{edit.edit_summary}&rdquo;
                    </p>
                  )}
                </div>
              ))}
              <div className="p-3 bg-purple-50 rounded-lg border-l-2 border-purple-400">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-brand-navy-800">Original</span>
                  <span className="text-xs text-brand-navy-400">
                    {formatDistanceToNow(new Date(post.created_at))}
                  </span>
                </div>
                <p className="text-xs text-purple-600">AI Generated</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-brand-neutral-100 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('proofreading')}
          disabled={actionLoading !== null}
          className="flex-1"
        >
          <FileEdit className="h-4 w-4 mr-1" />
          Proofreading
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAction('schedule')}
          disabled={actionLoading !== null}
          className="flex-1"
        >
          <Clock className="h-4 w-4 mr-1" />
          Schedule
        </Button>
        <Button
          size="sm"
          onClick={() => handleAction('publish')}
          disabled={actionLoading !== null}
          className="flex-1"
        >
          {actionLoading === 'publish' ? (
            'Publishing...'
          ) : (
            <>
              <Send className="h-4 w-4 mr-1" />
              Send Now
            </>
          )}
        </Button>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-brand-navy-900 mb-4">Schedule Post</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-navy-700 mb-1">Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-navy-700 mb-1">Time</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50"
                />
              </div>
              <p className="text-xs text-brand-navy-400">Time is in your local timezone</p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleScheduleConfirm}
                disabled={!scheduledDate || !scheduledTime || actionLoading === 'schedule'}
              >
                {actionLoading === 'schedule' ? 'Scheduling...' : 'Schedule'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation Details Modal */}
      {showAIDetailsModal && post.generation_metadata && (
        <AIGenerationModal
          metadata={post.generation_metadata}
          onClose={() => setShowAIDetailsModal(false)}
        />
      )}
    </div>
  );
}
