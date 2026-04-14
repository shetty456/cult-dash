'use client';

import { useEffect, useState, useCallback } from 'react';

interface UserData {
  id: string; name: string; city: string; state: string;
  age: number; gender: string; plan: string; channel: string;
  utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string;
  device_type: string; os: string; joined_at: string; last_active: string;
  workouts_completed: number; status: string; ltv: number; nsm_reached: number;
  eventCount: number; workoutCount: number; lastEventAt: string;
}

interface EventData {
  id: string; type: string; timestamp: string;
  utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string;
  device_type: string; os: string;
  session_id: string; session_number: number;
  city: string; state: string;
  properties: Record<string, unknown>;
}

const EVENT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  app_open:                { bg: 'bg-[#252525]',   text: 'text-[#6b7280]',  label: 'App Open' },
  page_view:               { bg: 'bg-[#1a1a2e]',   text: 'text-[#818cf8]',  label: 'Page View' },
  workout_started:         { bg: 'bg-[#451a03]',   text: 'text-[#f59e0b]',  label: 'Workout Start' },
  workout_completed:       { bg: 'bg-[#064e3b]',   text: 'text-[#10b981]',  label: 'Workout Done' },
  trial_booked:            { bg: 'bg-[#1e3a5f]',   text: 'text-[#60a5fa]',  label: 'Trial Booked' },
  trial_completed:         { bg: 'bg-[#1e3a5f]',   text: 'text-[#34d399]',  label: 'Trial Done' },
  subscription_purchased:  { bg: 'bg-[#14532d]',   text: 'text-[#4ade80]',  label: 'Subscribed' },
  subscription_cancelled:  { bg: 'bg-[#450a0a]',   text: 'text-[#ef4444]',  label: 'Cancelled' },
  referral_sent:           { bg: 'bg-[#2e1065]',   text: 'text-[#a78bfa]',  label: 'Referral' },
  class_booked:            { bg: 'bg-[#064e3b]',   text: 'text-[#34d399]',  label: 'Class Booked' },
  meal_logged:             { bg: 'bg-[#431407]',   text: 'text-[#fb923c]',  label: 'Meal Logged' },
};

const STATUS_STYLE: Record<string, string> = {
  active:   'text-[#10b981] bg-[#064e3b] border-[#10b981]/30',
  'at-risk': 'text-[#f59e0b] bg-[#451a03] border-[#f59e0b]/30',
  churned:  'text-[#ef4444] bg-[#450a0a] border-[#ef4444]/30',
};

const PLAN_STYLE: Record<string, string> = {
  free: 'text-[#6b7280] bg-[#252525]',
  monthly: 'text-[#60a5fa] bg-[#1e3a5f]',
  quarterly: 'text-[#10b981] bg-[#064e3b]',
  annual: 'text-[#f59e0b] bg-[#451a03]',
};

function relTime(iso: string): string {
  const anchor = new Date('2026-04-11T14:47:00Z').getTime();
  const diff = anchor - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return '1d ago';
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function propDisplay(props: Record<string, unknown>): string {
  return Object.entries(props)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
}

function EventRow({ event }: { event: EventData }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = EVENT_COLORS[event.type] ?? { bg: 'bg-[#252525]', text: 'text-[#6b7280]', label: event.type };
  const hasProps = Object.keys(event.properties).length > 0;

  return (
    <div
      className={`px-4 py-3 border-b border-[#1e1e1e] hover:bg-[#1a1a1a] transition-colors ${hasProps ? 'cursor-pointer' : ''}`}
      onClick={() => hasProps && setExpanded(e => !e)}
    >
      <div className="flex items-start gap-3">
        {/* Timeline dot */}
        <div className="flex flex-col items-center flex-shrink-0 mt-1">
          <div className={`w-2 h-2 rounded-full ${cfg.text.replace('text-', 'bg-')}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
            <span className="text-[10px] text-[#4b5563] tabular-nums">{relTime(event.timestamp)}</span>
            <span className="text-[10px] text-[#3a3a3a]">{event.device_type} · {event.os}</span>
          </div>

          {/* UTM row */}
          {event.utm_source && event.utm_source !== 'organic' && (
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              {[event.utm_source, event.utm_medium, event.utm_campaign].filter(Boolean).map((u, i) => (
                <span key={i} className="text-[9px] text-[#6b7280] bg-[#1a1a1a] border border-[#2a2a2a] px-1.5 py-0.5 rounded font-mono">
                  {u}
                </span>
              ))}
            </div>
          )}

          {/* Props summary */}
          {!expanded && hasProps && (
            <p className="text-[10px] text-[#6b7280] truncate">{propDisplay(event.properties)}</p>
          )}

          {/* Expanded props */}
          {expanded && (
            <div className="mt-2 bg-[#111] rounded-lg px-3 py-2 font-mono">
              <pre className="text-[10px] text-[#9ca3af] whitespace-pre-wrap">
                {JSON.stringify(event.properties, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {hasProps && (
          <span className="text-[#3a3a3a] text-xs flex-shrink-0 mt-0.5">{expanded ? '▲' : '▼'}</span>
        )}
      </div>
    </div>
  );
}

interface UserProfileProps {
  userId: string | null;
  onClose: () => void;
}

export default function UserProfile({ userId, onClose }: UserProfileProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [eventType, setEventType] = useState('');

  const load = useCallback(async (id: string) => {
    setLoading(true);
    const [uRes, eRes] = await Promise.all([
      fetch(`/api/users/${id}`),
      fetch(`/api/users/${id}/events?limit=50${eventType ? `&type=${eventType}` : ''}`),
    ]);
    const [uData, eData] = await Promise.all([uRes.json(), eRes.json()]);
    setUser(uData);
    setEvents(eData.events ?? []);
    setTotalEvents(eData.total ?? 0);
    setLoading(false);
  }, [eventType]);

  useEffect(() => {
    if (userId) load(userId);
    else { setUser(null); setEvents([]); }
  }, [userId, load]);

  const isOpen = !!userId;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Slide-over panel */}
      <aside className={`fixed right-0 top-0 h-screen w-full sm:w-[480px] bg-[#111] border-l border-[#222] z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {!user || loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="space-y-3 w-full px-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-8 bg-[#1e1e1e] rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-[#1e1e1e] flex-shrink-0">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-[#0f2d1f] border border-[#10b981]/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-[#10b981]">
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-white">{user.name}</h2>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_STYLE[user.status]}`}>
                    {user.status}
                  </span>
                </div>
                <p className="text-[11px] text-[#6b7280] mt-0.5">{user.id} · {user.city}, {user.state}</p>
              </div>

              <button onClick={onClose} className="text-[#4b5563] hover:text-white text-lg px-1 flex-shrink-0">×</button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">

              {/* Properties grid */}
              <div className="px-5 py-4 border-b border-[#1e1e1e]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#3a3a3a] mb-3">User Properties</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Plan', value: <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${PLAN_STYLE[user.plan]}`}>{user.plan}</span> },
                    { label: 'LTV', value: user.ltv > 0 ? `₹${user.ltv.toLocaleString()}` : '—' },
                    { label: 'Age', value: `${user.age} · ${user.gender === 'M' ? 'Male' : 'Female'}` },
                    { label: 'Device', value: `${user.device_type} · ${user.os}` },
                    { label: 'Workouts', value: user.workouts_completed },
                    { label: 'NSM', value: user.nsm_reached ? '✓ Achieved' : '✗ Not yet' },
                    { label: 'Joined', value: relTime(user.joined_at) },
                    { label: 'Last Active', value: relTime(user.last_active) },
                    { label: 'Total Events', value: user.eventCount.toLocaleString() },
                    { label: 'Channel', value: user.channel },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[#1a1a1a] rounded-lg px-3 py-2">
                      <p className="text-[9px] text-[#4b5563] uppercase tracking-wider mb-0.5">{label}</p>
                      <p className="text-xs text-white font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* UTM Attribution */}
              <div className="px-5 py-4 border-b border-[#1e1e1e]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#3a3a3a] mb-3">First-Touch Attribution</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'source',   value: user.utm_source },
                    { label: 'medium',   value: user.utm_medium },
                    { label: 'campaign', value: user.utm_campaign },
                    { label: 'content',  value: user.utm_content },
                  ].filter(a => a.value && a.value !== '(none)').map(a => (
                    <div key={a.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5">
                      <p className="text-[9px] text-[#4b5563] uppercase tracking-wider">{a.label}</p>
                      <p className="text-xs font-mono text-[#10b981]">{a.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event Timeline */}
              <div>
                <div className="px-5 py-3 border-b border-[#1e1e1e] flex items-center justify-between flex-shrink-0">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#3a3a3a]">Event Timeline</p>
                    <p className="text-[10px] text-[#4b5563] mt-0.5">{totalEvents} total events · showing latest 50</p>
                  </div>
                  <select
                    value={eventType}
                    onChange={e => setEventType(e.target.value)}
                    className="text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-[#6b7280] rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="">All types</option>
                    {Object.entries(EVENT_COLORS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                {events.length === 0 ? (
                  <div className="py-12 text-center text-[#3a3a3a] text-xs">No events match this filter</div>
                ) : (
                  events.map(e => <EventRow key={e.id} event={e} />)
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
