'use client';

import { Alert, ChannelRow, FunnelStage, NSMMilestones } from '@/lib/data';

interface RecommendationsPanelProps {
  alerts: Alert[];
  channelData: ChannelRow[];
  funnel: FunnelStage[];
  nsm: NSMMilestones;
}

interface Recommendation {
  priority: number;
  category: string;
  categoryColor: string;
  headline: string;      // conclusion — what's wrong or what's the opportunity
  impact: string;        // one quantified number
  action: string;        // one sentence: what to do
  effort: 'Low' | 'Medium' | 'High';
}

// Rules engine — reads from live data, outputs prioritised actions
function buildRecommendations(
  alerts: Alert[],
  channelData: ChannelRow[],
  funnel: FunnelStage[],
  nsm: NSMMilestones,
): Recommendation[] {
  const recs: Recommendation[] = [];

  // ── Rule 1: High-severity alerts first (fire) ──
  const highAlerts = alerts.filter(a => a.severity === 'High');
  for (const alert of highAlerts) {
    if (alert.id === 'alert-paid-cac') {
      recs.push({
        priority: recs.length + 1,
        category: 'CAC',
        categoryColor: '#ef4444',
        headline: 'Paid Digital is burning cash — rebalance budget now',
        impact: '₹1,120 CAC · 18% above last month · ₹370 over target',
        action: 'Cut Paid Digital budget by 20–30% this week and reallocate to Referrals (₹680 CAC, 52% paid conv).',
        effort: 'Low',
      });
    }
  }

  // ── Rule 2: Biggest funnel leak ──
  const leak = funnel.find(s => s.isBiggestLeak);
  if (leak) {
    const prev = funnel[funnel.indexOf(leak) - 1];
    recs.push({
      priority: recs.length + 1,
      category: 'Funnel',
      categoryColor: '#f97316',
      headline: `${prev?.label ?? 'Top'} → ${leak.label} is losing ${leak.dropOffRate}% of users`,
      impact: `${((leak.dropOffRate ?? 0) / 100 * (prev?.count ?? 0)).toLocaleString()} users lost at this step each month`,
      action: `Run a sign-up friction audit: reduce form fields, add social login, A/B test one-tap sign-up. Even a 5% lift here adds ~${Math.round((prev?.count ?? 0) * 0.05).toLocaleString()} paid subs/month.`,
      effort: 'Medium',
    });
  }

  // ── Rule 3: Best channel to scale (opportunity) ──
  const bestChannel = [...channelData]
    .filter(c => c.status === 'healthy')
    .sort((a, b) => b.nsm - a.nsm)[0];

  if (bestChannel) {
    recs.push({
      priority: recs.length + 1,
      category: 'Channel',
      categoryColor: '#10b981',
      headline: `Scale ${bestChannel.name} — best unit economics in the portfolio`,
      impact: `₹${bestChannel.cac} CAC · ${bestChannel.paidConv}% paid conv · ${bestChannel.nsm}% NSM rate`,
      action: `Increase ${bestChannel.name} investment by 2× this quarter. Set a target of +${Math.round(bestChannel.installs * 0.3 / 1000)}K new installs/month from this channel.`,
      effort: 'Medium',
    });
  }

  // ── Rule 4: NSM habit bottleneck ──
  const bottleneckDrop = nsm.currentWeek.bottleneckPercent;
  if (bottleneckDrop > 60) {
    recs.push({
      priority: recs.length + 1,
      category: 'NSM',
      categoryColor: '#60a5fa',
      headline: `${bottleneckDrop}% of users drop before building a 4-week habit`,
      impact: `Only ${nsm.currentWeek.milestones[nsm.currentWeek.milestones.length - 1].percent}% of new users reach NSM — primary growth lever`,
      action: 'Launch a streak notification at Day 14 (before the critical drop). Test community check-ins for the 26–35 cohort (highest engagement, 31% NSM).',
      effort: 'Medium',
    });
  }

  // ── Rule 5: Medium-watch alerts (if we still have < 3 recs) ──
  if (recs.length < 3) {
    const medAlerts = alerts.filter(a => a.severity === 'Medium');
    for (const alert of medAlerts) {
      if (recs.length >= 4) break;
      if (alert.id === 'alert-trial-conv') {
        recs.push({
          priority: recs.length + 1,
          category: 'Funnel',
          categoryColor: '#f97316',
          headline: 'Trial booking conversion dropped 5.2% this week',
          impact: '~700 fewer trial bookings vs. last week at current install rate',
          action: 'Check trainer availability calendar for capacity gaps. Review onboarding step 3 drop-off in product analytics.',
          effort: 'Low',
        });
      }
    }
  }

  // Return top 3 only
  return recs.slice(0, 3);
}

const EFFORT_COLORS = {
  Low:    'text-[#10b981] bg-[#064e3b]',
  Medium: 'text-[#f59e0b] bg-[#451a03]',
  High:   'text-[#ef4444] bg-[#450a0a]',
};

export default function RecommendationsPanel({
  alerts, channelData, funnel, nsm,
}: RecommendationsPanelProps) {
  const recs = buildRecommendations(alerts, channelData, funnel, nsm);

  return (
    <div className="space-y-4">
      {/* Header callout */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6b7280]">
          Based on current alerts, funnel gaps, and channel performance.
        </p>
        <span className="text-xs text-[#4b5563]">Updated Apr 11, 2026</span>
      </div>

      {/* Recommendation cards */}
      {recs.map(rec => (
        <article
          key={rec.priority}
          className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-xl p-5 hover:border-[#4a4a4a] transition-colors duration-150"
        >
          <div className="flex items-start gap-4">
            {/* Priority number */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#3a3a3a] flex items-center justify-center">
              <span className="text-sm font-bold text-white">{rec.priority}</span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Category + effort */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ color: rec.categoryColor, background: `${rec.categoryColor}18` }}
                >
                  {rec.category}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${EFFORT_COLORS[rec.effort]}`}>
                  {rec.effort} effort
                </span>
              </div>

              {/* Headline */}
              <h3 className="text-base font-semibold text-white leading-snug mb-2">
                {rec.headline}
              </h3>

              {/* Impact */}
              <p className="text-xs text-[#9ca3af] mb-3 leading-relaxed">
                <span className="text-[#6b7280] font-medium">Why: </span>
                {rec.impact}
              </p>

              {/* Action */}
              <div className="flex items-start gap-2 bg-[#1a1a1a] rounded-lg px-3 py-2.5">
                <span className="text-[#10b981] text-sm mt-0.5 flex-shrink-0">→</span>
                <p className="text-xs text-[#d1fae5] leading-relaxed font-medium">{rec.action}</p>
              </div>
            </div>
          </div>
        </article>
      ))}

      {recs.length === 0 && (
        <div className="bg-[#2d2d2d] border border-[#3a3a3a] rounded-xl p-8 text-center">
          <span className="text-3xl">🎉</span>
          <p className="text-sm text-[#9ca3af] mt-3">All metrics are healthy. No interventions needed today.</p>
        </div>
      )}
    </div>
  );
}
