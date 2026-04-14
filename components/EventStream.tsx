'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlobalFilters } from '@/lib/queryHelpers';

interface ApiEvent {
  id: string;
  user_id: string;
  user_name: string;
  user_city: string;
  type: string;
  timestamp: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  device_type: string;
  os: string;
  session_number: number;
  properties: Record<string, unknown>;
}

const ANCHOR_TS = new Date('2026-04-11T14:47:00Z').getTime();

const EVENT_CFG: Record<string, { label: string; color: string }> = {
  app_open:               { label: 'App Open',      color: '#6b7280' },
  page_view:              { label: 'Page View',      color: '#818cf8' },
  workout_started:        { label: 'Workout Start',  color: '#f59e0b' },
  workout_completed:      { label: 'Workout Done',   color: '#10b981' },
  trial_booked:           { label: 'Trial Booked',   color: '#60a5fa' },
  trial_completed:        { label: 'Trial Done',     color: '#34d399' },
  subscription_purchased: { label: 'Subscribed',     color: '#4ade80' },
  subscription_cancelled: { label: 'Cancelled',      color: '#ef4444' },
  referral_sent:          { label: 'Referral',       color: '#a78bfa' },
  class_booked:           { label: 'Class Booked',   color: '#34d399' },
  meal_logged:            { label: 'Meal Logged',    color: '#fb923c' },
};

function relTime(isoTs: string): string {
  const diff = ANCHOR_TS - new Date(isoTs).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60)  return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function EventRow({ event, onUserClick }: { event: ApiEvent; onUserClick?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = EVENT_CFG[event.type] ?? { label: event.type, color: '#6b7280' };

  const details = [
    event.device_type && event.os && `${event.device_type} · ${event.os}`,
    event.utm_source && event.utm_source !== 'organic' && `${event.utm_source}${event.utm_medium ? ` / ${event.utm_medium}` : ''}`,
    event.utm_campaign && `Campaign: ${event.utm_campaign}`,
    event.user_city && `City: ${event.user_city}`,
    event.session_number > 0 && `Session #${event.session_number}`,
  ].filter(Boolean) as string[];

  const propEntries = Object.entries(event.properties).filter(([, v]) => v != null && v !== '');

  return (
    <div
      className="group border-b border-[#1a1a1a] last:border-0 hover:bg-[#1a1a1a] transition-colors duration-100 cursor-pointer"
      onClick={() => setExpanded(e => !e)}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Color dot */}
        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-px" style={{ background: cfg.color }} />

        {/* Event + user */}
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          <span className="text-[12px] text-[#4b5563] mx-1.5">·</span>
          <button
            onClick={e => { e.stopPropagation(); onUserClick?.(event.user_id); }}
            className="text-[12px] text-[#9ca3af] hover:text-white transition-colors"
          >
            {event.user_name}
          </button>
        </div>

        {/* Time */}
        <span className="text-[11px] text-[#3a3a3a] tabular-nums flex-shrink-0">{relTime(event.timestamp)}</span>

        {/* Expand chevron */}
        {(details.length > 0 || propEntries.length > 0) && (
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            className={`flex-shrink-0 text-[#3a3a3a] group-hover:text-[#6b7280] transition-all duration-150 ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-9 pb-3 space-y-2">
          {details.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {details.map(d => (
                <span key={d} className="text-[10px] text-[#6b7280] bg-[#252525] px-2 py-1 rounded font-mono">
                  {d}
                </span>
              ))}
            </div>
          )}
          {propEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {propEntries.slice(0, 8).map(([k, v]) => (
                <span key={k} className="text-[10px] bg-[#1e1e1e] border border-[#2a2a2a] px-2 py-1 rounded font-mono">
                  <span className="text-[#4b5563]">{k}:</span>
                  <span className="text-[#9ca3af] ml-1">{String(v)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const FILTER_OPTIONS = [
  { value: '', label: 'All events' },
  { value: 'workout_completed',      label: 'Workout Done' },
  { value: 'workout_started',        label: 'Workout Start' },
  { value: 'subscription_purchased', label: 'Subscribed' },
  { value: 'subscription_cancelled', label: 'Cancelled' },
  { value: 'trial_booked',           label: 'Trial Booked' },
  { value: 'trial_completed',        label: 'Trial Done' },
  { value: 'referral_sent',          label: 'Referral' },
  { value: 'meal_logged',            label: 'Meal Logged' },
  { value: 'class_booked',           label: 'Class Booked' },
  { value: 'app_open',               label: 'App Open' },
  { value: 'page_view',              label: 'Page View' },
];

interface EventStreamProps {
  filters?: GlobalFilters;
  limit?: number;
  showFilter?: boolean;
  onUserClick?: (userId: string) => void;
  compact?: boolean;
}

export default function EventStream({
  filters = {}, limit = 50, showFilter = true, onUserClick, compact = false,
}: EventStreamProps) {
  const [events, setEvents]         = useState<ApiEvent[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  const filterKey = JSON.stringify(filters);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams(filters as Record<string, string>);
    qs.set('limit', String(limit));
    if (typeFilter) qs.set('type', typeFilter);
    fetch(`/api/events?${qs}`)
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setTotal(d.total ?? 0); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, typeFilter, limit]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between flex-shrink-0 gap-3 ${compact ? 'mb-2' : 'mb-4'}`}>
        <p className="text-[11px] text-[#4b5563]">
          {loading ? 'Loading…' : `${total.toLocaleString()} events · showing ${events.length}`}
        </p>
        {showFilter && (
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-[11px] bg-[#1e1e1e] border border-[#2a2a2a] text-[#9ca3af] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3a3a3a] transition-colors"
          >
            {FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Feed */}
      <div className="overflow-y-auto flex-1 bg-[#161616] border border-[#1e1e1e] rounded-xl">
        {loading ? (
          <div className="divide-y divide-[#1a1a1a]">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#252525] flex-shrink-0" />
                <div className="flex-1 h-3 bg-[#1e1e1e] rounded animate-pulse" />
                <div className="w-10 h-3 bg-[#1a1a1a] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-[#3a3a3a] text-sm">No events match this filter</div>
        ) : (
          events.map(e => (
            <EventRow key={e.id} event={e} onUserClick={onUserClick} />
          ))
        )}
      </div>
    </div>
  );
}
