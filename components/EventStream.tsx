'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlobalFilters } from '@/lib/queryHelpers';

// ── Types ────────────────────────────────────────────────────────────────────

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
  utm_content: string;
  device_type: string;
  os: string;
  session_id: string;
  session_number: number;
  city: string;
  properties: Record<string, unknown>;
}

// ── Event config ─────────────────────────────────────────────────────────────

const EVENT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  app_open:               { label: 'App Open',       color: '#9ca3af', bg: '#1f2937' },
  page_view:              { label: 'Page View',      color: '#818cf8', bg: '#1e1b4b' },
  workout_started:        { label: 'Workout Start',  color: '#f59e0b', bg: '#292524' },
  workout_completed:      { label: 'Workout Done',   color: '#10b981', bg: '#0d2318' },
  trial_booked:           { label: 'Trial Booked',   color: '#60a5fa', bg: '#0f172a' },
  trial_completed:        { label: 'Trial Done',     color: '#34d399', bg: '#0a1e17' },
  subscription_purchased: { label: 'Subscribed',     color: '#4ade80', bg: '#0a1a0a' },
  subscription_cancelled: { label: 'Cancelled',      color: '#f87171', bg: '#1c0a0a' },
  referral_sent:          { label: 'Referral Sent',  color: '#a78bfa', bg: '#1a1030' },
  class_booked:           { label: 'Class Booked',   color: '#38bdf8', bg: '#0c1a2e' },
  meal_logged:            { label: 'Meal Logged',    color: '#fb923c', bg: '#1c1008' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(isoTs: string): string {
  const diff = Date.now() - new Date(isoTs).getTime();
  const secs = Math.max(0, Math.floor(diff / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

function fmtTs(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// ── EventAvatar ───────────────────────────────────────────────────────────────

function EventAvatar({ type }: { type: string }) {
  const cfg = EVENT_CFG[type] ?? { label: type, color: '#6b7280', bg: '#1f2937' };
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 select-none"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}22` }}
    >
      {cfg.label.charAt(0).toUpperCase()}
    </span>
  );
}

// ── EventRow ──────────────────────────────────────────────────────────────────

function EventRow({ event, onUserClick }: { event: ApiEvent; onUserClick?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = EVENT_CFG[event.type] ?? { label: event.type, color: '#6b7280', bg: '#1f2937' };
  const propEntries = Object.entries(event.properties).filter(([, v]) => v != null && v !== '');

  return (
    <>
      <tr
        className={`border-b border-[#161616] transition-colors cursor-pointer group ${
          expanded ? 'bg-[#101010]' : 'hover:bg-[#0f0f0f]'
        }`}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Expand chevron */}
        <td className="pl-4 pr-1 py-2.5 w-8">
          <svg
            width="11" height="11" viewBox="0 0 11 11" fill="none"
            className={`text-[#2a2a2a] group-hover:text-[#4b5563] transition-all duration-150 ${expanded ? 'rotate-90' : ''}`}
          >
            <path d="M3.5 2l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </td>

        {/* Event Name */}
        <td className="px-3 py-2.5 min-w-[160px]">
          <div className="flex items-center gap-2">
            <EventAvatar type={event.type} />
            <span className="text-[12px] font-medium" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
        </td>

        {/* Time */}
        <td className="px-3 py-2.5 min-w-[130px]">
          <span className="text-[12px] text-[#6b7280] whitespace-nowrap">{relTime(event.timestamp)}</span>
        </td>

        {/* Distinct ID — user name as link */}
        <td className="px-3 py-2.5 min-w-[140px]">
          <button
            onClick={e => { e.stopPropagation(); onUserClick?.(event.user_id); }}
            className="text-[12px] text-[#60a5fa] hover:text-[#93c5fd] transition-colors truncate max-w-[140px] block text-left"
            title={`${event.user_name} · ${event.user_id}`}
          >
            {event.user_name}
          </button>
        </td>

        {/* City */}
        <td className="px-3 py-2.5 min-w-[100px]">
          <span className="text-[12px] text-[#9ca3af]">{event.user_city || event.city || '—'}</span>
        </td>

        {/* Country */}
        <td className="px-3 py-2.5 min-w-[80px]">
          <span className="text-[12px] text-[#9ca3af]">India</span>
        </td>

        {/* Operating System */}
        <td className="px-3 py-2.5 min-w-[100px]">
          <span className="text-[12px] text-[#9ca3af]">{event.os || '—'}</span>
        </td>

        {/* 3-dot menu placeholder */}
        <td className="pr-4 pl-2 py-2.5 text-right" onClick={e => e.stopPropagation()}>
          <button className="text-[#1e1e1e] group-hover:text-[#3a3a3a] hover:text-[#6b7280] transition-colors text-base leading-none px-1">
            ···
          </button>
        </td>
      </tr>

      {/* Expanded properties */}
      {expanded && (
        <tr className="bg-[#090909] border-b border-[#161616]">
          <td />
          <td colSpan={7} className="px-4 py-3">
            <div className="space-y-2">
              {/* Context chips */}
              <div className="flex flex-wrap gap-1.5">
                {event.utm_source && event.utm_source !== 'organic' && (
                  <span className="text-[10px] text-[#6b7280] bg-[#161616] border border-[#1e1e1e] px-2 py-0.5 rounded font-mono">
                    source: {event.utm_source}{event.utm_medium ? ` / ${event.utm_medium}` : ''}
                  </span>
                )}
                {event.utm_campaign && event.utm_campaign !== '(none)' && (
                  <span className="text-[10px] text-[#6b7280] bg-[#161616] border border-[#1e1e1e] px-2 py-0.5 rounded font-mono">
                    campaign: {event.utm_campaign}
                  </span>
                )}
                {event.device_type && (
                  <span className="text-[10px] text-[#6b7280] bg-[#161616] border border-[#1e1e1e] px-2 py-0.5 rounded font-mono">
                    {event.device_type} · {event.os}
                  </span>
                )}
                {event.session_number > 0 && (
                  <span className="text-[10px] text-[#6b7280] bg-[#161616] border border-[#1e1e1e] px-2 py-0.5 rounded font-mono">
                    session #{event.session_number}
                  </span>
                )}
              </div>

              {/* Event properties */}
              {propEntries.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {propEntries.slice(0, 12).map(([k, v]) => (
                    <span key={k} className="text-[10px] bg-[#111] border border-[#1e1e1e] px-2 py-0.5 rounded font-mono">
                      <span className="text-[#4b5563]">{k}:</span>
                      <span className="text-[#9ca3af] ml-1">{String(v)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[100, 80, 120, 90, 110, 75, 95, 85].map((w, i) => (
        <tr key={i} className="border-b border-[#161616]" style={{ opacity: 1 - i * 0.09 }}>
          <td className="pl-4 pr-1 py-2.5 w-8">
            <div className="w-3 h-3 bg-[#1a1a1a] rounded-full animate-pulse" />
          </td>
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#1e1e1e] rounded-full animate-pulse" />
              <div className="h-3 bg-[#1e1e1e] rounded animate-pulse" style={{ width: w }} />
            </div>
          </td>
          {[72, 56, 64, 48, 40].map((cw, j) => (
            <td key={j} className="px-3 py-2.5">
              <div className="h-3 bg-[#1a1a1a] rounded animate-pulse" style={{ width: cw }} />
            </td>
          ))}
          <td className="pr-4 pl-2 py-2.5" />
        </tr>
      ))}
    </>
  );
}

// ── EventStream ───────────────────────────────────────────────────────────────

export interface EventStreamProps {
  filters?: GlobalFilters;
  eventType?: string;
  search?: string;
  refreshKey?: number;
  onTotalChange?: (total: number) => void;
  onUserClick?: (userId: string) => void;
  onDataLoaded?: () => void;
  /** legacy compat */
  showFilter?: boolean;
  compact?: boolean;
  limit?: number;
  onUserClick_legacy?: (id: string) => void;
}

export default function EventStream({
  filters = {},
  eventType = '',
  search = '',
  refreshKey = 0,
  onTotalChange,
  onUserClick,
  onDataLoaded,
}: EventStreamProps) {
  const [events, setEvents]         = useState<ApiEvent[]>([]);
  const [total, setTotal]           = useState(0);
  const [offset, setOffset]         = useState(0);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastTs, setLastTs]         = useState<string | null>(null);

  const filterKey = JSON.stringify({ filters, eventType, search, refreshKey });

  const fetchPage = useCallback((off: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);

    const qs = new URLSearchParams(filters as Record<string, string>);
    qs.set('limit', '100');
    qs.set('offset', String(off));
    if (eventType) qs.set('type', eventType);
    if (search)    qs.set('q', search);

    fetch(`/api/events?${qs}`)
      .then(r => r.json())
      .then(d => {
        const evts: ApiEvent[] = d.events ?? [];
        setEvents(prev => append ? [...prev, ...evts] : evts);
        setTotal(d.total ?? 0);
        setOffset(off + evts.length);
        if (evts.length > 0) setLastTs(evts[evts.length - 1].timestamp);
        onTotalChange?.(d.total ?? 0);
        onDataLoaded?.();
        if (append) setLoadingMore(false); else setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    setOffset(0);
    fetchPage(0, false);
  }, [fetchPage]);

  const canLoadMore = offset < total && !loadingMore;

  return (
    <div className="bg-[#0b0b0b] border border-[#1a1a1a] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">

          {/* Table header */}
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              <th className="pl-4 pr-1 py-2.5 w-8" />
              {[
                'Event Name',
                'Time',
                'Distinct ID',
                'City',
                'Country',
                'Operating System',
                '',
              ].map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#3a3a3a] uppercase tracking-widest whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table body */}
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-[13px] text-[#2a2a2a]">
                  No events match this filter
                </td>
              </tr>
            ) : (
              events.map(e => (
                <EventRow key={e.id} event={e} onUserClick={onUserClick} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {!loading && events.length > 0 && (
        <div className="border-t border-[#1a1a1a] px-5 py-3 flex items-center justify-between gap-4">
          <span className="text-[11px] text-[#2a2a2a]">
            Showing {events.length.toLocaleString()} results
            {lastTs ? ` through ${fmtTs(lastTs)}` : ''}
          </span>
          {canLoadMore ? (
            <button
              onClick={() => fetchPage(offset, true)}
              className="text-[11px] font-semibold text-[#10b981] hover:text-[#34d399] transition-colors"
            >
              Load {Math.min(100, total - offset).toLocaleString()} more
            </button>
          ) : loadingMore ? (
            <span className="text-[11px] text-[#3a3a3a]">Loading…</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
