'use client';

import { useQuery } from '@tanstack/react-query';
import { BatteryCharging, Zap, HardHat } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BreakdownCell {
  count: number;
  chargers: number;
  kw: number;
}

interface StatusBreakdown {
  operationalHubs:    BreakdownCell;
  operationalPoints:  BreakdownCell;
  operationalKiosks:  BreakdownCell;
  constructionHubs:   BreakdownCell;
  constructionPoints: BreakdownCell;
  constructionKiosks: BreakdownCell;
  plannedHubs:        BreakdownCell;
  plannedPoints:      BreakdownCell;
  plannedKiosks:      BreakdownCell;
  blockedHubs:        BreakdownCell;
  blockedPoints:      BreakdownCell;
  archivedHubs:       BreakdownCell;
  archivedPoints:     BreakdownCell;
}

interface AnalyticsResponse {
  overview: {
    totalStations: number;
    activeStations: number;
    hubCount: number;
    pointCount: number;
    totalSessions: number;
    totalChargers: number;
  };
  statusBreakdown: StatusBreakdown;
}

const EMPTY_CELL: BreakdownCell = { count: 0, chargers: 0, kw: 0 };

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8621A] opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E8621A]" />
    </span>
  );
}

export function OverviewCards() {
  const { data, isLoading } = useQuery<AnalyticsResponse>({
    queryKey: ['analytics'],
    queryFn: () =>
      fetch('/api/analytics').then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  const sb = data?.statusBreakdown;
  const overview = data?.overview;

  // ── Derived numbers ─────────────────────────────────────────────────────────
  const opHubs    = sb?.operationalHubs    ?? EMPTY_CELL;
  const opPoints  = sb?.operationalPoints  ?? EMPTY_CELL;
  const opKiosks  = sb?.operationalKiosks  ?? EMPTY_CELL;
  const conHubs   = sb?.constructionHubs   ?? EMPTY_CELL;
  const conPoints = sb?.constructionPoints ?? EMPTY_CELL;
  const conKiosks = sb?.constructionKiosks ?? EMPTY_CELL;
  const plHubs    = sb?.plannedHubs        ?? EMPTY_CELL;
  const plPoints  = sb?.plannedPoints      ?? EMPTY_CELL;
  const plKiosks  = sb?.plannedKiosks      ?? EMPTY_CELL;

  // All three types contribute to every total — matches admin panel exactly
  const totalOperational  = opHubs.count  + opPoints.count  + opKiosks.count;
  const totalConstruction = conHubs.count + conPoints.count + conKiosks.count;
  const totalPlanned      = plHubs.count  + plPoints.count  + plKiosks.count;
  const totalAll          = overview?.totalStations ?? 0;

  const operationalChargers = opHubs.chargers + opPoints.chargers + opKiosks.chargers;
  const operationalKw       = Math.round((opHubs.kw + opPoints.kw + opKiosks.kw) * 10) / 10;
  const deployedPct         = totalAll > 0 ? Math.round((totalOperational / totalAll) * 1000) / 10 : 0;

  return (
    <div className="space-y-3">

      {/* ── TIER 1: Hero operational banner ─────────────────────────────── */}
      <div className="bg-[#0D0D0D] rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1.5">
            <span className="font-black text-5xl md:text-6xl text-[#E8621A] font-display leading-none">
              {totalOperational}
            </span>
            <div className="flex flex-col">
              <span className="text-white font-bold text-xs uppercase tracking-widest leading-tight">
                Operational
              </span>
              <span className="text-white font-bold text-xs uppercase tracking-widest leading-tight">
                Charging Sites
              </span>
            </div>
          </div>
          <div className="hidden sm:block w-px h-10 bg-white/10" />
          <div className="hidden sm:flex flex-col gap-0.5">
            <span className="text-white/80 text-sm font-semibold">
              {operationalChargers} Chargers
            </span>
            <span className="text-white/50 text-xs">
              {operationalKw} kW capacity
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:flex-col sm:items-end">
          <div className="flex items-center gap-1.5">
            <PulsingDot />
            <span className="text-[#E8621A] text-xs font-semibold uppercase tracking-wider">
              Live Now
            </span>
          </div>
          <span className="text-white/40 text-xs sm:text-right">
            Across Nairobi, Kenya
          </span>
        </div>
      </div>

      {/* ── TIER 2: Three status cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-3">

        {/* Roam Hubs */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 hover:border-[#E8621A]/30 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Roam Hubs
            </p>
            <div className="rounded-xl p-2 bg-[#E8621A]/10">
              <BatteryCharging className="h-4 w-4 text-[#E8621A]" />
            </div>
          </div>
          <p className="font-black text-4xl text-[#0D0D0D] font-display leading-none mb-1">
            {opHubs.count}
          </p>
          <p className="text-xs text-zinc-400 mb-2">operational</p>
          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
            <span className="text-[#E8621A] font-semibold">{opHubs.chargers}</span>
            <span>chargers &middot;</span>
            <span className="text-[#E8621A] font-semibold">{opHubs.kw}</span>
            <span>kW</span>
          </div>
          {plHubs.count > 0 && (
            <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1">
              <span className="text-[#E8621A]">&#8599;</span>
              {plHubs.count} planned
            </p>
          )}
        </div>

        {/* Roam Points */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 hover:border-[#E8621A]/30 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Roam Points
            </p>
            <div className="rounded-xl p-2 bg-[#0D0D0D]/5">
              <Zap className="h-4 w-4 text-[#0D0D0D]" />
            </div>
          </div>
          <p className="font-black text-4xl text-[#0D0D0D] font-display leading-none mb-1">
            {opPoints.count}
          </p>
          <p className="text-xs text-zinc-400 mb-2">operational</p>
          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
            <span className="font-semibold text-[#0D0D0D]">{opPoints.chargers}</span>
            <span>chargers &middot;</span>
            <span className="font-semibold text-[#0D0D0D]">{opPoints.kw}</span>
            <span>kW</span>
          </div>
          {plPoints.count > 0 && (
            <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1">
              <span className="text-[#E8621A]">&#8599;</span>
              {plPoints.count} planned
            </p>
          )}
        </div>

        {/* In Construction */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 hover:border-amber-400/30 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              In Progress
            </p>
            <div className="rounded-xl p-2 bg-amber-50">
              <HardHat className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <p className="font-black text-4xl text-[#0D0D0D] font-display leading-none mb-1">
            {totalConstruction}
          </p>
          <p className="text-xs text-zinc-400 mb-2">under construction</p>
          <div className="text-[11px] text-zinc-400 space-y-0.5">
            {conHubs.count > 0 && (
              <p><span className="font-semibold text-amber-500">{conHubs.count}</span> hub{conHubs.count !== 1 ? 's' : ''}</p>
            )}
            {conPoints.count > 0 && (
              <p><span className="font-semibold text-amber-500">{conPoints.count}</span> point{conPoints.count !== 1 ? 's' : ''}</p>
            )}
            {conKiosks.count > 0 && (
              <p><span className="font-semibold text-amber-500">{conKiosks.count}</span> kiosk{conKiosks.count !== 1 ? 's' : ''}</p>
            )}
            {totalConstruction === 0 && <p className="text-zinc-300">None active</p>}
          </div>
        </div>
      </div>

      {/* ── TIER 3: Deployment pipeline ─────────────────────────────────── */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Deployment Pipeline
          </p>
          <p className="text-[10px] font-semibold text-zinc-400">
            {totalAll.toLocaleString()} total sites
          </p>
        </div>

        {/* Segmented progress bar */}
        <div className="w-full h-2.5 rounded-full bg-zinc-200 overflow-hidden flex mb-3">
          {totalAll > 0 && totalOperational > 0 && (
            <div
              className="h-full bg-[#E8621A] transition-all"
              style={{ width: `${(totalOperational / totalAll) * 100}%` }}
            />
          )}
          {totalAll > 0 && totalConstruction > 0 && (
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${(totalConstruction / totalAll) * 100}%` }}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E8621A]" />
            <span className="text-zinc-600 font-semibold">Operational</span>
            <span className="text-zinc-400">{totalOperational}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-zinc-600 font-semibold">Construction</span>
            <span className="text-zinc-400">{totalConstruction}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-300" />
            <span className="text-zinc-600 font-semibold">Planned</span>
            <span className="text-zinc-400">{totalPlanned.toLocaleString()}</span>
          </div>
          <div className="ml-auto text-[11px] text-zinc-400 font-semibold">
            {deployedPct}% deployed
          </div>
        </div>

        <p className="text-[10px] text-zinc-400 mt-2 border-t border-zinc-200 pt-2">
          Future pipeline: {plHubs.count.toLocaleString()} Roam Hubs + {plPoints.count.toLocaleString()} Roam Points pending deployment across Kenya
        </p>
      </div>

    </div>
  );
}
