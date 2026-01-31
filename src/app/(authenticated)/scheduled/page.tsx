'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, Send, Trash2, Linkedin, Calendar, Globe, RefreshCw, X, CheckCircle2, ExternalLink } from 'lucide-react';
import { XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { useUser } from '@/hooks/useUser';

interface PostDraft {
  id: string;
  content: string;
  current_content: string | null;
  channel: string;
  media_url: string | null;
  author_name: string;
  author_email: string;
  status: string;
  scheduled_for: string;
  scheduled_timezone: string;
  created_at: string;
  rejection_reason?: string;
  published_at?: string;
  external_url?: string;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)', short: 'ET' },
  { value: 'America/Chicago', label: 'Central (CT)', short: 'CT' },
  { value: 'America/Denver', label: 'Mountain (MT)', short: 'MT' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)', short: 'PT' },
  { value: 'Europe/London', label: 'London (GMT/BST)', short: 'London' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', short: 'Paris' },
  { value: 'UTC', label: 'UTC', short: 'UTC' },
];

export default function ScheduledPage() {
  const { user } = useUser();
  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [publishedDrafts, setPublishedDrafts] = useState<PostDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTimezone, setUserTimezone] = useState('America/New_York');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newScheduleDate, setNewScheduleDate] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');

  useEffect(() => {
    // Try to get user's timezone from browser
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const matchedTz = TIMEZONES.find(tz => tz.value === browserTz);
    if (matchedTz) {
      setUserTimezone(browserTz);
    }
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      // Fetch scheduled, failed, and recently published posts
      const [scheduledRes, failedRes, publishedRes] = await Promise.all([
        fetch('/api/drafts?route=scheduled&status=scheduled'),
        fetch('/api/drafts?route=scheduled&status=failed'),
        fetch('/api/drafts?route=scheduled&status=published'),
      ]);

      const scheduledData = await scheduledRes.json();
      const failedData = await failedRes.json();
      const publishedData = await publishedRes.json();

      const allDrafts = [
        ...(scheduledData.drafts || []),
        ...(failedData.drafts || []),
      ];

      // Sort by scheduled_for ascending (soonest first)
      const sorted = allDrafts.sort((a: PostDraft, b: PostDraft) =>
        new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
      );
      setDrafts(sorted);

      // Sort published by published_at descending (most recent first), limit to 25
      const publishedSorted = (publishedData.drafts || [])
        .sort((a: PostDraft, b: PostDraft) =>
          new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
        )
        .slice(0, 25);
      setPublishedDrafts(publishedSorted);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const publishNow = async (draftId: string) => {
    if (!confirm('Publish this post now?')) return;

    setActionLoading(draftId);
    try {
      const response = await fetch(`/api/drafts/${draftId}/publish`, {
        method: 'POST',
      });

      if (response.ok) {
        setDrafts(prev => prev.filter(d => d.id !== draftId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to publish');
      }
    } catch (error) {
      console.error('Error publishing:', error);
      alert('Failed to publish');
    } finally {
      setActionLoading(null);
    }
  };

  const retryDraft = async (draftId: string) => {
    setActionLoading(draftId);
    try {
      // Reset status to scheduled
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledFor: new Date(Date.now() + 60000).toISOString(), // Retry in 1 minute
        }),
      });

      if (response.ok) {
        // Also need to reset status - update the draft in state
        const data = await response.json();
        setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, status: 'scheduled', rejection_reason: undefined } : d));
        alert('Post will retry in 1 minute');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to retry');
      }
    } catch (error) {
      console.error('Error retrying:', error);
      alert('Failed to retry');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteDraft = async (draftId: string) => {
    if (!confirm('Delete this scheduled post?')) return;

    setActionLoading(draftId);
    try {
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDrafts(prev => prev.filter(d => d.id !== draftId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    } finally {
      setActionLoading(null);
    }
  };

  const startReschedule = (draft: PostDraft) => {
    setRescheduleId(draft.id);
    const zonedDate = toZonedTime(new Date(draft.scheduled_for), userTimezone);
    setNewScheduleDate(format(zonedDate, 'yyyy-MM-dd'));
    setNewScheduleTime(format(zonedDate, 'HH:mm'));
  };

  const cancelReschedule = () => {
    setRescheduleId(null);
    setNewScheduleDate('');
    setNewScheduleTime('');
  };

  const saveReschedule = async (draftId: string) => {
    if (!newScheduleDate || !newScheduleTime) return;

    setActionLoading(draftId);
    try {
      // Create date in user's timezone and convert to ISO
      const localDateTime = `${newScheduleDate}T${newScheduleTime}:00`;
      const scheduledFor = new Date(localDateTime).toISOString();

      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledFor,
          scheduledTimezone: userTimezone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDrafts(prev => prev.map(d => d.id === draftId ? data.draft : d)
          .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()));
        cancelReschedule();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reschedule');
      }
    } catch (error) {
      console.error('Error rescheduling:', error);
      alert('Failed to reschedule');
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

  const formatScheduledTime = (isoDate: string) => {
    try {
      return formatInTimeZone(new Date(isoDate), userTimezone, 'MMM d, yyyy \'at\' h:mm a');
    } catch {
      return format(new Date(isoDate), 'MMM d, yyyy \'at\' h:mm a');
    }
  };

  const getTimeUntil = (isoDate: string) => {
    const now = new Date();
    const scheduled = new Date(isoDate);
    if (scheduled <= now) return 'Due now';
    return formatDistanceToNow(scheduled, { addSuffix: true });
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Scheduled Posts"
        subtitle="Posts queued for future publishing"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Timezone selector */}
          <div className="mb-6 flex items-center gap-3 text-sm">
            <Globe className="h-4 w-4 text-brand-navy-500" />
            <span className="text-brand-navy-600">Showing times in:</span>
            <select
              value={userTimezone}
              onChange={(e) => setUserTimezone(e.target.value)}
              className="px-3 py-1.5 border border-brand-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-brown/50"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-brown" />
            </div>
          ) : drafts.length === 0 ? (
            <Card className="border-brand-neutral-100">
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-brand-navy-300 mx-auto mb-4" />
                <p className="text-brand-navy-500">No scheduled posts</p>
                <p className="text-sm text-brand-navy-400 mt-1">
                  Schedule posts from the Posting page to see them here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {drafts.map(draft => (
                <Card key={draft.id} className={cn(
                  "overflow-hidden",
                  draft.status === 'failed' ? "border-red-200" : "border-brand-neutral-100"
                )}>
                  <CardContent className="p-0">
                    {/* Header with schedule info */}
                    <div className={cn(
                      "p-4 border-b",
                      draft.status === 'failed'
                        ? "bg-red-50 border-red-100"
                        : "bg-brand-neutral-50 border-brand-neutral-100"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full text-white",
                            draft.channel === 'linkedin' ? 'bg-blue-600' : 'bg-black'
                          )}>
                            {getChannelIcon(draft.channel)}
                          </div>
                          <div>
                            <p className={cn(
                              "font-medium flex items-center gap-2",
                              draft.status === 'failed' ? "text-red-700" : "text-brand-navy-900"
                            )}>
                              {draft.status === 'failed' ? (
                                <>
                                  <X className="h-4 w-4 text-red-500" />
                                  Failed to publish
                                </>
                              ) : (
                                <>
                                  <Calendar className="h-4 w-4 text-brand-brown" />
                                  {formatScheduledTime(draft.scheduled_for)}
                                </>
                              )}
                            </p>
                            <p className="text-xs text-brand-navy-500">
                              {draft.status === 'failed'
                                ? `Scheduled for ${formatScheduledTime(draft.scheduled_for)} · by ${draft.author_name}`
                                : `${getTimeUntil(draft.scheduled_for)} · by ${draft.author_name}`
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {draft.status === 'failed' && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              Failed
                            </span>
                          )}
                          {isAuthor(draft) && (
                            <span className="text-xs bg-brand-brown/10 text-brand-brown px-2 py-0.5 rounded-full">
                              Your post
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Error message for failed posts */}
                    {draft.status === 'failed' && draft.rejection_reason && (
                      <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                        <p className="text-sm text-red-600">
                          <strong>Error:</strong> {draft.rejection_reason}
                        </p>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-4">
                      <p className="text-brand-navy-800 whitespace-pre-wrap">
                        {draft.current_content || draft.content}
                      </p>
                    </div>

                    {/* Reschedule form */}
                    {rescheduleId === draft.id && (
                      <div className="px-4 pb-4 pt-2 border-t border-brand-neutral-100">
                        <p className="text-sm font-medium text-brand-navy-700 mb-2">Reschedule post</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={newScheduleDate}
                            onChange={(e) => setNewScheduleDate(e.target.value)}
                            className="px-3 py-2 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50"
                          />
                          <input
                            type="time"
                            value={newScheduleTime}
                            onChange={(e) => setNewScheduleTime(e.target.value)}
                            className="px-3 py-2 text-sm border border-brand-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-brown/50"
                          />
                          <Button
                            size="sm"
                            onClick={() => saveReschedule(draft.id)}
                            disabled={actionLoading === draft.id}
                          >
                            {actionLoading === draft.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </Button>
                          <Button variant="outline" size="sm" onClick={cancelReschedule}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {rescheduleId !== draft.id && (
                      <div className="px-4 pb-4 flex items-center gap-2">
                        {draft.status === 'failed' ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => retryDraft(draft.id)}
                              disabled={actionLoading === draft.id}
                            >
                              {actionLoading === draft.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Retry
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => publishNow(draft.id)}
                              disabled={actionLoading === draft.id}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Post Now
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startReschedule(draft)}
                              disabled={actionLoading === draft.id}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Reschedule
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => publishNow(draft.id)}
                              disabled={actionLoading === draft.id}
                            >
                              {actionLoading === draft.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-1" />
                                  Post Now
                                </>
                              )}
                            </Button>
                          </>
                        )}
                        {isAuthor(draft) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDraft(draft.id)}
                            disabled={actionLoading === draft.id}
                            className="text-red-600 border-red-200 hover:bg-red-50 ml-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recently Published Section */}
          {publishedDrafts.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-brand-navy-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Recently Published
              </h2>
              <div className="space-y-3">
                {publishedDrafts.map(draft => (
                  <Card key={draft.id} className="border-green-200 bg-green-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-white flex-shrink-0",
                            draft.channel === 'linkedin' ? 'bg-blue-600' : 'bg-black'
                          )}>
                            {getChannelIcon(draft.channel)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-brand-navy-800 line-clamp-2">
                              {draft.current_content || draft.content}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-brand-navy-500">
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                              <span>Published {draft.published_at ? formatDistanceToNow(new Date(draft.published_at), { addSuffix: true }) : ''}</span>
                              <span>·</span>
                              <span>by {draft.author_name}</span>
                            </div>
                          </div>
                        </div>
                        {draft.external_url && (
                          <a
                            href={draft.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 flex-shrink-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
