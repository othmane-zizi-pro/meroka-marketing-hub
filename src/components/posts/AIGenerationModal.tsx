'use client';

import { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, Trophy, Cpu, Sparkles, Scale, FileEdit, Clock, Send, Loader2 } from 'lucide-react';
import { GenerationMetadata } from '@/types/generation';
import { cn } from '@/lib/utils';

interface AIGenerationModalProps {
  metadata: GenerationMetadata;
  originalPostId?: string;
  channel?: string;
  onClose: () => void;
  onCandidateAction?: (
    candidateContent: string,
    candidateSource: string,
    action: 'proofreading' | 'schedule' | 'publish',
    scheduledFor?: string
  ) => Promise<void>;
}

export function AIGenerationModal({ metadata, originalPostId, channel, onClose, onCandidateAction }: AIGenerationModalProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['diagram', 'candidates']));
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [scheduleCandidate, setScheduleCandidate] = useState<{ content: string; source: string } | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const getModelIcon = (source: string) => {
    if (source.includes('OpenAI') || source.includes('GPT')) return '🤖';
    if (source.includes('Gemini') || source.includes('Google')) return '💎';
    if (source.includes('Grok') || source.includes('xAI')) return '🚀';
    return '🧠';
  };

  const getModelColor = (source: string) => {
    if (source.includes('OpenAI') || source.includes('GPT')) return 'bg-green-100 border-green-300 text-green-800';
    if (source.includes('Gemini') || source.includes('Google')) return 'bg-blue-100 border-blue-300 text-blue-800';
    if (source.includes('Grok') || source.includes('xAI')) return 'bg-purple-100 border-purple-300 text-purple-800';
    return 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const handleCandidateAction = async (
    content: string,
    source: string,
    action: 'proofreading' | 'schedule' | 'publish'
  ) => {
    if (!onCandidateAction) return;

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
      await onCandidateAction(content, source, action);
      onClose();
    } catch (error) {
      console.error('Error performing candidate action:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleScheduleConfirm = async () => {
    if (!onCandidateAction || !scheduleCandidate || !scheduledDate || !scheduledTime) return;

    setActionLoading(`${scheduleCandidate.source}-schedule`);
    try {
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      await onCandidateAction(scheduleCandidate.content, scheduleCandidate.source, 'schedule', scheduledFor);
      setScheduleCandidate(null);
      setScheduledDate('');
      setScheduledTime('');
      onClose();
    } catch (error) {
      console.error('Error scheduling candidate:', error);
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-neutral-100 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-brand-navy-900">AI Generation Details</p>
              <p className="text-xs text-brand-navy-500">
                LLM Council Orchestration for {metadata.platform}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X className="h-5 w-5 text-brand-navy-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Orchestration Diagram */}
          <div className="p-6 border-b border-brand-neutral-100">
            <button
              onClick={() => toggleSection('diagram')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <span className="font-semibold text-brand-navy-900">Orchestration Flow</span>
              </div>
              {expandedSections.has('diagram') ? (
                <ChevronUp className="h-5 w-5 text-brand-navy-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-brand-navy-400" />
              )}
            </button>

            {expandedSections.has('diagram') && (
              <div className="mt-4">
                {/* SVG Diagram */}
                <div className="bg-gradient-to-b from-brand-neutral-50 to-white rounded-xl p-6 border border-brand-neutral-200">
                  <svg viewBox="0 0 400 320" className="w-full max-w-md mx-auto">
                    {/* Model boxes - dynamic from metadata */}
                    <g transform="translate(10, 20)">
                      <rect x="0" y="0" width="100" height="50" rx="8" className="fill-green-100 stroke-green-300" strokeWidth="2"/>
                      <text x="50" y="22" textAnchor="middle" className="fill-green-800 text-[9px] font-semibold">{metadata.models_used?.[0] || 'gpt-5.2'}</text>
                      <text x="50" y="38" textAnchor="middle" className="fill-green-600 text-[9px]">(temp: 0.8)</text>
                    </g>
                    <g transform="translate(140, 20)">
                      <rect x="0" y="0" width="120" height="50" rx="8" className="fill-blue-100 stroke-blue-300" strokeWidth="2"/>
                      <text x="60" y="22" textAnchor="middle" className="fill-blue-800 text-[8px] font-semibold">{metadata.models_used?.[1] || 'gemini-3-pro-preview'}</text>
                      <text x="60" y="38" textAnchor="middle" className="fill-blue-600 text-[9px]">(temp: 0.8)</text>
                    </g>
                    <g transform="translate(280, 20)">
                      <rect x="0" y="0" width="110" height="50" rx="8" className="fill-purple-100 stroke-purple-300" strokeWidth="2"/>
                      <text x="55" y="22" textAnchor="middle" className="fill-purple-800 text-[7px] font-semibold">{metadata.models_used?.[2] || 'grok-4-1-fast-reasoning'}</text>
                      <text x="55" y="38" textAnchor="middle" className="fill-purple-600 text-[9px]">(temp: 0.8)</text>
                    </g>

                    {/* Connecting lines down */}
                    <line x1="70" y1="70" x2="70" y2="100" className="stroke-brand-neutral-300" strokeWidth="2"/>
                    <line x1="200" y1="70" x2="200" y2="100" className="stroke-brand-neutral-300" strokeWidth="2"/>
                    <line x1="330" y1="70" x2="330" y2="100" className="stroke-brand-neutral-300" strokeWidth="2"/>

                    {/* Horizontal connecting line */}
                    <line x1="70" y1="100" x2="330" y2="100" className="stroke-brand-neutral-300" strokeWidth="2"/>

                    {/* Down to parallel gen */}
                    <line x1="200" y1="100" x2="200" y2="120" className="stroke-brand-neutral-300" strokeWidth="2"/>
                    <polygon points="200,130 195,120 205,120" className="fill-brand-neutral-300"/>

                    {/* Parallel Generation box */}
                    <g transform="translate(120, 130)">
                      <rect x="0" y="0" width="160" height="40" rx="8" className="fill-amber-100 stroke-amber-300" strokeWidth="2"/>
                      <text x="80" y="25" textAnchor="middle" className="fill-amber-800 text-xs font-semibold">Parallel Generation</text>
                    </g>

                    {/* Down to judge */}
                    <line x1="200" y1="170" x2="200" y2="190" className="stroke-brand-neutral-300" strokeWidth="2"/>
                    <polygon points="200,200 195,190 205,190" className="fill-brand-neutral-300"/>

                    {/* Judge box - Gemini */}
                    <g transform="translate(100, 200)">
                      <rect x="0" y="0" width="200" height="50" rx="8" className="fill-blue-100 stroke-blue-400" strokeWidth="2"/>
                      <text x="100" y="22" textAnchor="middle" className="fill-blue-800 text-[8px] font-semibold">{metadata.judge?.model || 'gemini-3-pro-preview'} Judge</text>
                      <text x="100" y="38" textAnchor="middle" className="fill-blue-600 text-[9px]">(temp: 0.3)</text>
                    </g>

                    {/* Down to winner */}
                    <line x1="200" y1="250" x2="200" y2="270" className="stroke-brand-neutral-300" strokeWidth="2"/>
                    <polygon points="200,280 195,270 205,270" className="fill-brand-neutral-300"/>

                    {/* Winner indicator */}
                    <g transform="translate(140, 285)">
                      <rect x="0" y="0" width="120" height="30" rx="15" className="fill-yellow-100 stroke-yellow-400" strokeWidth="2"/>
                      <text x="20" y="20" className="text-sm">⭐</text>
                      <text x="65" y="20" textAnchor="middle" className="fill-yellow-800 text-xs font-bold">
                        {metadata.winner.source.split(' ').slice(-1)[0]}
                      </text>
                    </g>
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Generation Prompt */}
          <div className="p-6 border-b border-brand-neutral-100">
            <button
              onClick={() => toggleSection('prompt')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <span className="font-semibold text-brand-navy-900">Generation Prompt</span>
              </div>
              {expandedSections.has('prompt') ? (
                <ChevronUp className="h-5 w-5 text-brand-navy-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-brand-navy-400" />
              )}
            </button>

            {expandedSections.has('prompt') && (
              <div className="mt-4">
                <pre className="bg-brand-neutral-50 rounded-lg p-4 text-sm text-brand-navy-700 whitespace-pre-wrap overflow-x-auto border border-brand-neutral-200 font-mono">
                  {metadata.prompt}
                </pre>
              </div>
            )}
          </div>

          {/* Candidates */}
          <div className="p-6 border-b border-brand-neutral-100">
            <button
              onClick={() => toggleSection('candidates')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <span className="font-semibold text-brand-navy-900">
                  All Candidates ({metadata.candidates.length})
                </span>
              </div>
              {expandedSections.has('candidates') ? (
                <ChevronUp className="h-5 w-5 text-brand-navy-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-brand-navy-400" />
              )}
            </button>

            {expandedSections.has('candidates') && (
              <div className="mt-4 space-y-4">
                {metadata.candidates.map((candidate, index) => {
                  const isWinner = candidate.source === metadata.winner.source;
                  const isLoading = actionLoading?.startsWith(candidate.source);
                  return (
                    <div
                      key={index}
                      className={cn(
                        "rounded-lg border-2 p-4 relative",
                        isWinner
                          ? "border-yellow-400 bg-yellow-50"
                          : "border-brand-neutral-200 bg-white"
                      )}
                    >
                      {isWinner && (
                        <div className="absolute -top-3 -right-2 flex items-center gap-1 px-2 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                          <Trophy className="h-3 w-3" />
                          Winner
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{getModelIcon(candidate.source)}</span>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium border",
                          getModelColor(candidate.source)
                        )}>
                          {candidate.source}
                        </span>
                      </div>
                      <p className="text-sm text-brand-navy-700 whitespace-pre-wrap">
                        {candidate.content}
                      </p>

                      {/* Action buttons for non-winner candidates */}
                      {onCandidateAction && !isWinner && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-neutral-100">
                          <button
                            onClick={() => handleCandidateAction(candidate.content, candidate.source, 'proofreading')}
                            disabled={isLoading}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-navy-600 bg-brand-neutral-100 rounded-lg hover:bg-brand-neutral-200 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `${candidate.source}-proofreading` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FileEdit className="h-3 w-3" />
                            )}
                            To Proofreading
                          </button>
                          <button
                            onClick={() => handleCandidateAction(candidate.content, candidate.source, 'schedule')}
                            disabled={isLoading}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-navy-600 bg-brand-neutral-100 rounded-lg hover:bg-brand-neutral-200 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `${candidate.source}-schedule` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            Schedule
                          </button>
                          <button
                            onClick={() => handleCandidateAction(candidate.content, candidate.source, 'publish')}
                            disabled={isLoading}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-brand-brown rounded-lg hover:bg-brand-brown/90 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === `${candidate.source}-publish` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            Send Now
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Winner Selection */}
          <div className="p-6 border-b border-brand-neutral-100">
            <button
              onClick={() => toggleSection('winner')}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold text-brand-navy-900">Winner Selection</span>
              </div>
              {expandedSections.has('winner') ? (
                <ChevronUp className="h-5 w-5 text-brand-navy-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-brand-navy-400" />
              )}
            </button>

            {expandedSections.has('winner') && (
              <div className="mt-4">
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{getModelIcon(metadata.winner.source)}</span>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-semibold border",
                      getModelColor(metadata.winner.source)
                    )}>
                      {metadata.winner.source}
                    </span>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs text-brand-navy-500 mb-1 font-medium">Judge&apos;s Reasoning:</p>
                    <p className="text-sm text-brand-navy-800 italic bg-white/50 rounded-lg p-3">
                      &ldquo;{metadata.winner.reason}&rdquo;
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-navy-500 mb-1 font-medium">Winning Content:</p>
                    <p className="text-sm text-brand-navy-700 bg-white/50 rounded-lg p-3 whitespace-pre-wrap">
                      {metadata.winner.content}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Judge Prompt */}
          {metadata.judge.prompt && (
            <div className="p-6">
              <button
                onClick={() => toggleSection('judge')}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-brand-navy-500" />
                  <span className="font-semibold text-brand-navy-900">Judge Prompt</span>
                  <span className="text-xs text-brand-navy-400">({metadata.judge.model})</span>
                </div>
                {expandedSections.has('judge') ? (
                  <ChevronUp className="h-5 w-5 text-brand-navy-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-brand-navy-400" />
                )}
              </button>

              {expandedSections.has('judge') && (
                <div className="mt-4">
                  <pre className="bg-brand-neutral-50 rounded-lg p-4 text-sm text-brand-navy-700 whitespace-pre-wrap overflow-x-auto border border-brand-neutral-200 font-mono">
                    {metadata.judge.prompt}
                  </pre>
                </div>
              )}
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
              Schedule the {scheduleCandidate.source} version for publishing.
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
