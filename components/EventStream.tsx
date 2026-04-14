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

const EVENT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  app_open:               { label: 'App Open',     color: '#6b7280', bg: '#25252544' },
  page_view:              { label: 'Page View',    color: '#818cf8', bg: '#1a1a2e44' },
  workout_started:        { label: 'Workout Start',color: '#f59e0b', bg: '#451a0344' },
  workout_completed:      { label: 'Workout Done', color: '#10b981', bg: '#064e3b44' },
  trial_booked:           { label: 'Trial Booked', color: '#60a5fa', bg: '#1e3a5f44' },
  trial_completed:        { label: 'Trial Done',   color: '#34d399', bg: '#1e3a5f44' },
  subscription_purchased: { label: 'Subscribed',   color: '#4ade80', bg: '#14532d44' },
  subscription_cancelled: { label: 'Cancelled',    color: '#ef4444', bg: '#450a0a44' },
  referral_sent:          { label: 'Referral',     color: '#a78bfa', bg: '#2e106544' },
  class_booked:           { label: 'Class Booked', color: '#34d399', bg: '#064e3b44' },
  meal_logged:            { label: 'Meal Logged',  color: '#fb923c', bg: '#43140744' },
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

function PropChips({ props }: { props: Record<string, unknown> }) {
  const entries = Object.entries(props).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {entries.slice(0, 6).map(([k, v]) => (
        <span
          key={k}
          className="inline-flex items-center text-[9px] bg-[#252525] border border-[#2a2a2a] rounded px-1.5 py-0.5 font-mono"
        >
          <span className="text-[#4b5563]">{k}:</span>
          <span className="text-[#9ca3af] ml-0.5">{String(v)}</span>
        </span>
      ))}
      {entries.length > 6 && (
        <span className="text-[9px] text-[#3a3a3a] px-1">+{entries.length - 6} more</span>
      )}
    </div>
  );
}

function EventRow({ event, onUserClick }: { event: ApiEvent; onUserClick?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = EVENT_CFG[event.type] ?? { label: event.type, color: '#6b7280', bg: '#25252544' };
  const hasProps = Object.keys(event.properties).length > 0;

  return (
    <div
      className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors duration-100 px-3 py-2.5"
    >
      {/* Row 1: badge + user + time */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded flex-shrink-0 border"
          style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}33` }}
        >
          {cfg.label}
        </span>

        <button
          onClick={() => onUserClick?.(event.user_id)}
          className="text-xs font-semibold text-white hover:text-[#10b981] transition-colors truncate text-left"
        >
          {event.user_name}
        </button>
        <span className="text-[10px] text-[#3a3a3a] flex-shrink-0">·</span>
        <span className="text-[10px] text-[#4b5563] truncate flex-shrink-0">{event.user_city}</span>

        <div className="flex-1" />
        <span className="text-[10px] text-[#3a3a3a] tabular-nums flex-shrink-0">{relTime(event.timestamp)}</span>
        {hasProps && (
          <button onClick={() => setExpanded(e => !e)} className="text-[#3a3a3a] hover:text-[#6b7280] text-[10px] flex-shrink-0 ml-1">
            {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Row 2: property chips */}
      {!expanded && <PropChips props={event.properties} />}

      {/* Row 3: UTM + device tags */}
      <div className="flex flex-wrap gap-1 mt-1.5">
        {event.device_type && (
          <span className="text-[9px] text-[#4b5563] bg-[#1e1e1e] border border-[#252525] px-1.5 py-0.5 rounded font-mono">
            {event.device_type} · {event.os}
          </span>
        )}
        {event.utm_source && event.utm_source !== 'organic' && (
          <>
            <span className="text-[9px] text-[#4b5563] bg-[#1e1e1e] border border-[#252525] px-1.5 py-0.5 rounded font-mono">{event.utm_source}</span>
            {event.utm_medium && <span className="text-[9px] text-[#4b5563] bg-[#1e1e1e] border border-[#252525] px-1.5 py-0.5 rounded font-mono">{event.utm_medium}</span>}
            {event.utm_campaign && <span className="text-[9px] text-[#4b5563] bg-[#1e1e1e] border border-[#252525] px-1.5 py-0.5 rounded font-mono">{event.utm_campaign}</span>}
          </>
        )}
        {event.session_number > 0 && (
          <span className="text-[9px] text-[#3a3a3a] bg-[#1a1a1a] px-1.5 py-0.5 rounded font-mono">session #{event.session_number}</span>
        )}
      </div>

      {/* Expanded JSON */}
      {expanded && hasProps && (
        <div className="mt-2 bg-[#111] rounded-lg px-3 py-2 font-mono">
          <pre className="text-[10px] text-[#9ca3af] whitespace-pre-wrap overflow-auto max-h-40">
            {JSON.stringify(event.properties, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

const FILTER_OPTIONS = [
  { value: '', label: 'All Events' },
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
  compact?: boolean; // condensed mode for overview widget
}

export default function EventStream({ filters = {}, limit = 50, showFilter = true, onUserClick, compact = false }: EventStreamProps) {
  const [events, setEvents]     = useState<ApiEvent[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  const filterKey = JSON.stringify(filters);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams(filters as Record<string, string>);
    qs.set('limit', String(limit));
    if (typeFilter) qs.set('type', typeFilter);
    fetch(`/api/events?${qs}`)
      .then(r => r.json())
      .then(d => {
        setEvents(d.events ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, typeFilter, limit]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between flex-shrink-0 gap-2 ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white uppercase tracking-wider">Live Event Stream</p>
          <p className="text-[10px] text-[#4b5563] mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} total · showing ${events.length}`}
          </p>
        </div>
        {showFilter && (
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-[10px] bg-[#2a2a2a] border border-[#3a3a3a] text-[#9ca3af] rounded-lg px-2 py-1.5 focus:outline-none"
          >
            {FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Event rows */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="px-3 py-3 border-b border-[#1a1a1a]">
                <div className="h-4 bg-[#1e1e1e] rounded animate-pulse mb-2 w-3/4" />
                <div className="h-3 bg-[#1a1a1a] rounded animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-[#4b5563] text-sm">No events match this filter</div>
        ) : (
          events.map(e => (
            <EventRow key={e.id} event={e} onUserClick={onUserClick} />
          ))
        )}
      </div>
    </div>
  );
}
