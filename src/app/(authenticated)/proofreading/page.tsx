'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, History, Linkedin, ChevronDown, ChevronUp, ExternalLink, Clock, Send } from 'lucide-react';
import { XIcon } from '@/components/ui/icons';
import { PlatformPreview } from '@/components/posts/PlatformPreview';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '@/hooks/useUser';

interface EditHistoryItem {
  id: string;
  editor_name: string;
  editor_email: string;
  previous_content: string;
  new_content: string;
  edit_summary: string | null;
  created_at: string;
}

interface PostDraft {
  id: string;
  content: string;
  current_content: string | null;
  channel: string;
  media_url: string | null;
  author_name: string;
  author_email: string;
  status: string;
  last_edited_by: string | null;
  last_edited_at: string | null;
  created_at: string;
}

export default function ProofreadingPage() {
  const { user } = useUser();
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [editHistory, setEditHistory] = useState<Record<string, EditHistoryItem[]>>({});
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/drafts?route=proofreading&status=pending_review');
      const data = await response.json();
      if (response.ok) {
        setDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEditHistory = async (draftId: string) => {
    try {
      const response = await fetch(`/api/drafts/${draftId}`);
      const data = await response.json();
      if (response.ok && data.editHistory) {
        setEditHistory(prev => ({ ...prev, [draftId]: data.editHistory }));
      }
    } catch (error) {
      console.error('Error fetching edit history:', error);
    }
  };

  const toggleExpand = (draftId: string) => {
    if (expandedDraft === draftId) {
      setExpandedDraft(null);
    } else {
      setExpandedDraft(draftId);
      if (!editHistory[draftId]) {
        fetchEditHistory(draftId);
      }
    }
  };

  const startEdit = (draft: PostDraft) => {
    setEditingDraft(draft.id);
    setEditContent(draft.current_content || draft.content);
    setEditSummary('');
  };

  const cancelEdit = () => {
    setEditingDraft(null);
    setEditContent('');
    setEditSummary('');
  };

  const saveEdit = async (draftId: string) => {
    if (!editContent.trim()) return;

    setActionLoading(draftId);
    try {
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent.trim(),
          editSummary: editSummary.trim() || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDrafts(prev => prev.map(d => d.id === draftId ? data.draft : d));
        // Refresh edit history
        fetchEditHistory(draftId);
        cancelEdit();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Failed to save changes');
    } finally {
      setActionLoading(null);
    }
  };

  const approveDraft = async (draftId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to publish this post now?\n\nPlease review the preview above before confirming.'
    );
    if (!confirmed) return;

    setActionLoading(draftId);
    try {
      const response = await fetch(`/api/drafts/${draftId}/approve`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        // Remove from list since it's now published
        setDrafts(prev => prev.filter(d => d.id !== draftId));

        // Show success with link to post
        if (data.externalUrl) {
          const viewPost = confirm('Post published successfully! Click OK to view it.');
          if (viewPost) {
            window.open(data.externalUrl, '_blank');
          }
        } else {
          alert('Post published successfully!');
        }
      } else {
        alert(data.error || 'Failed to approve and publish');
      }
    } catch (error) {
      console.error('Error approving draft:', error);
      alert('Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectDraft = async (draftId: string) => {
    const reason = prompt('Reason for rejection (optional):');

    setActionLoading(draftId);
    try {
      const response = await fetch(`/api/drafts/${draftId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        setDrafts(prev => prev.filter(d => d.id !== draftId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject');
      }
    } catch (error) {
      console.error('Error rejecting draft:', error);
      alert('Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleScheduleConfirm = async () => {
    if (!scheduleDraft || !scheduledDate || !scheduledTime) return;

    setActionLoading(scheduleDraft);
    try {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      const response = await fetch(`/api/drafts/${scheduleDraft}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor }),
      });

      if (response.ok) {
        setDrafts(prev => prev.filter(d => d.id !== scheduleDraft));
        setScheduleDraft(null);
        setScheduledDate('');
        setScheduledTime('');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to schedule');
      }
    } catch (error) {
      console.error('Error scheduling draft:', error);
      alert('Failed to schedule');
    } finally {
      setActionLoading(null);
    }
  };

  const isAuthor = (draft: PostDraft) =>
    user?.email?.toLowerCase() === draft.author_email.toLowerCase();

  const getChannelIcon = (channel: string) => {
    if (channel === 'linkedin') return <Linkedin className="h-4 w-4" />;
    if (channel === 'x') return <XIcon className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Proofreading Room"
        subtitle="Review and edit posts before publishing"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-brown" />
            </div>
          ) : drafts.length === 0 ? (
            <Card className="border-brand-neutral-100">
              <CardContent className="py-12 text-center">
                <p className="text-brand-navy-500">No posts pending review</p>
                <p className="text-sm text-brand-navy-400 mt-1">
                  Posts sent for proofreading will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {drafts.map(draft => (
                <Card key={draft.id} className="border-brand-neutral-100 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Header - compact */}
                    <div className="px-4 py-2 border-b border-brand-neutral-100 bg-brand-neutral-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-brand-navy-600">
                          <div className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-white",
                            draft.channel === 'linkedin' ? 'bg-blue-600' : 'bg-black'
                          )}>
                            {getChannelIcon(draft.channel)}
                          </div>
                          <span>
                            Sent by <span className="font-medium">{draft.author_name}</span>
                            {isAuthor(draft) && (
                              <span className="ml-1 text-xs text-brand-brown">(you)</span>
                            )}
                          </span>
                          <span className="text-brand-navy-400">·</span>
                          <span className="text-brand-navy-400">
                            {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })}
                          </span>
                          {draft.last_edited_at && (
                            <span className="text-brand-navy-400">
                              · Edited {formatDistanceToNow(new Date(draft.last_edited_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleExpand(draft.id)}
                          className="p-1 rounded-lg hover:bg-brand-neutral-100 text-brand-navy-400"
                        >
                          {expandedDraft === draft.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      {editingDraft === draft.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full min-h-[150px] p-3 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50 resize-none"
                          />
                          <input
                            type="text"
                            value={editSummary}
                            onChange={(e) => setEditSummary(e.target.value)}
                            placeholder="Brief summary of changes (optional)"
                            className="w-full px-3 py-2 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50"
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={cancelEdit}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveEdit(draft.id)}
                              disabled={actionLoading === draft.id}
                            >
                              {actionLoading === draft.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Save Changes'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {draft.current_content && draft.current_content !== draft.content && (
                            <p className="text-xs text-amber-600 mb-3">
                              Content has been edited from original
                            </p>
                          )}
                          {/* Platform Preview */}
                          <PlatformPreview
                            platform={draft.channel as 'linkedin' | 'x'}
                            content={draft.current_content || draft.content}
                            mediaUrl={draft.media_url || undefined}
                          />
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {editingDraft !== draft.id && (
                      <div className="px-4 pb-4 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(draft)}
                          disabled={actionLoading === draft.id}
                        >
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setScheduleDraft(draft.id)}
                          disabled={actionLoading === draft.id}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => approveDraft(draft.id)}
                          disabled={actionLoading === draft.id}
                          className="bg-brand-brown hover:bg-brand-brown/90"
                        >
                          {actionLoading === draft.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1" />
                              Send Now
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rejectDraft(draft.id)}
                          disabled={actionLoading === draft.id}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}

                    {/* Edit History */}
                    {expandedDraft === draft.id && (
                      <div className="border-t border-brand-neutral-100 p-4 bg-brand-neutral-50">
                        <h4 className="text-sm font-medium text-brand-navy-700 flex items-center gap-2 mb-3">
                          <History className="h-4 w-4" />
                          Edit History
                        </h4>
                        {editHistory[draft.id]?.length > 0 ? (
                          <div className="space-y-3">
                            {editHistory[draft.id].map(edit => (
                              <div key={edit.id} className="text-sm border-l-2 border-brand-brown/30 pl-3">
                                <p className="text-brand-navy-600">
                                  <span className="font-medium">{edit.editor_name}</span>
                                  {' '}edited {formatDistanceToNow(new Date(edit.created_at), { addSuffix: true })}
                                </p>
                                {edit.edit_summary && (
                                  <p className="text-brand-navy-500 italic mt-1">&ldquo;{edit.edit_summary}&rdquo;</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-brand-navy-400">No edits yet</p>
                        )}

                        {/* Original content */}
                        {draft.current_content && draft.current_content !== draft.content && (
                          <div className="mt-4 pt-4 border-t border-brand-neutral-200">
                            <p className="text-xs font-medium text-brand-navy-500 mb-2">Original content:</p>
                            <p className="text-sm text-brand-navy-600 bg-white p-3 rounded border border-brand-neutral-200">
                              {draft.content}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {scheduleDraft && (
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
                onClick={() => {
                  setScheduleDraft(null);
                  setScheduledDate('');
                  setScheduledTime('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleScheduleConfirm}
                disabled={!scheduledDate || !scheduledTime || actionLoading !== null}
              >
                {actionLoading ? 'Scheduling...' : 'Schedule'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
