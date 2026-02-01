'use client';

import { useEffect, useState } from 'react';
import { X, FileEdit, Clock, Send, Loader2, Layers } from 'lucide-react';
import { GenerationCandidate } from '@/types/generation';
import { PlatformPreview } from '@/components/posts/PlatformPreview';
import { cn } from '@/lib/utils';

interface AlternateVersionsModalProps {
  candidates: GenerationCandidate[];
  winnerSource: string;
  originalPostId: string;
  channel: string;
  onClose: () => void;
  onSelectVersion: (
    content: string,
    source: string,
    action: 'proofreading' | 'schedule' | 'publish',
    scheduledFor?: string
  ) => Promise<void>;
}

export function AlternateVersionsModal({
  candidates,
  winnerSource,
  originalPostId,
  channel,
  onClose,
  onSelectVersion,
}: AlternateVersionsModalProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [scheduleCandidate, setScheduleCandidate] = useState<{ content: string; source: string } | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Filter out the winner to show only alternates
  const alternates = candidates.filter(c => c.source !== winnerSource);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scheduleCandidate) {
          setScheduleCandidate(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, scheduleCandidate]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleAction = async (
    content: string,
    source: string,
    action: 'proofreading' | 'schedule' | 'publish'
  ) => {
    if (action === 'schedule') {
      setScheduleCandidate({ content, source });
      return;
    }

    if (action === 'publish') {
      const confirmed = window.confirm(
        'Are you sure you want to publish this version now?\n\nPlease review the content above before confirming.'
      );
      if (!confirmed) return;
    }

    setActionLoading(`${source}-${action}`);
    try {
      await onSelectVersion(content, source, action);
      onClose();
    } catch (error) {
      console.error('Error performing action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleScheduleConfirm = async () => {
    if (!scheduleCandidate || !scheduledDate || !scheduledTime) return;

    setActionLoading(`${scheduleCandidate.source}-schedule`);
    try {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      await onSelectVersion(scheduleCandidate.content, scheduleCandidate.source, 'schedule', scheduledFor);
      setScheduleCandidate(null);
      setScheduledDate('');
      setScheduledTime('');
      onClose();
    } catch (error) {
      console.error('Error scheduling:', error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-neutral-100 bg-gradient-to-r from-brand-neutral-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-brown/10 text-brand-brown">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-brand-navy-900">Alternate Versions</p>
              <p className="text-sm text-brand-navy-500">
                AI generated {candidates.length} versions of this post
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-brand-neutral-100 transition-colors"
          >
            <X className="h-5 w-5 text-brand-navy-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-5">
          {alternates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-brand-navy-500">No alternate versions available</p>
              <p className="text-sm text-brand-navy-400 mt-1">
                The selected post was the only viable option
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-brand-navy-600 mb-4">
                Here are the alternative versions. Select one to use instead:
              </p>

              {alternates.map((candidate, index) => {
                const isLoading = actionLoading?.startsWith(candidate.source);
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-brand-neutral-200 bg-white p-4 hover:border-brand-brown/30 transition-colors"
                  >
                    {/* Version label */}
                    <p className="text-xs font-medium text-brand-navy-400 mb-3">
                      Version {index + 1}
                    </p>

                    {/* Platform Preview */}
                    <div className="mb-4">
                      <PlatformPreview
                        platform={channel as 'linkedin' | 'x'}
                        content={candidate.content}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-3 border-t border-brand-neutral-100">
                      <button
                        onClick={() => handleAction(candidate.content, candidate.source, 'proofreading')}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-navy-600 bg-brand-neutral-100 rounded-lg hover:bg-brand-neutral-200 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `${candidate.source}-proofreading` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileEdit className="h-4 w-4" />
                        )}
                        Send to Proofreading
                      </button>
                      <button
                        onClick={() => handleAction(candidate.content, candidate.source, 'schedule')}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-navy-600 bg-brand-neutral-100 rounded-lg hover:bg-brand-neutral-200 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `${candidate.source}-schedule` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                        Schedule
                      </button>
                      <button
                        onClick={() => handleAction(candidate.content, candidate.source, 'publish')}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-brown rounded-lg hover:bg-brand-brown/90 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `${candidate.source}-publish` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {scheduleCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-brand-navy-900 mb-4">Schedule Post</h3>
            <p className="text-sm text-brand-navy-600 mb-4">
              Schedule this version for publishing.
            </p>
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
              <button
                onClick={() => {
                  setScheduleCandidate(null);
                  setScheduledDate('');
                  setScheduledTime('');
                }}
                className="px-4 py-2 text-sm font-medium text-brand-navy-600 bg-brand-neutral-100 rounded-lg hover:bg-brand-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleConfirm}
                disabled={!scheduledDate || !scheduledTime || actionLoading !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-brown rounded-lg hover:bg-brand-brown/90 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
