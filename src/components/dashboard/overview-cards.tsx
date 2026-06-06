'use client';

import { useQuery } from '@tanstack/react-query';
import { Zap, BatteryCharging, HardHat, Radio } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Station {
  id: string;
  chargerId: string;
  name: string;
  type: string;
  status: string;
  chargerCount: number;
  totalKw: number;
}

interface AnalyticsData {
  overview: {
    totalStations: number;
    activeStations: number;
    constructionStations: number;
    hubCount: number;
    pointCount: number;
    operationalKiosks: number;
    constructionHubs: number;
    constructionPoints: number;
    constructionKiosks: number;
    totalSessions: number;
    totalChargers: number;
  };
  stationStats: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    sessionCount: number;
    totalEnergy: number;
    totalRevenue: number;
  }>;
}

export function OverviewCards() {
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: () =>
      fetch('/api/analytics').then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      }),
  });

  const { data: stations, isLoading: isStationsLoading } = useQuery<Station[]>({
    queryKey: ['stations'],
    queryFn: () =>
      fetch('/api/stations').then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      }),
  });

  const isLoading = isAnalyticsLoading || isStationsLoading || !analyticsData || !stations;

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl animate-pulse bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-2xl animate-pulse bg-zinc-200 dark:bg-zinc-800" />
          <Skeleton className="h-32 rounded-2xl animate-pulse bg-zinc-200 dark:bg-zinc-800" />
          <Skeleton className="h-32 rounded-2xl animate-pulse bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <Skeleton className="h-20 w-full rounded-2xl animate-pulse bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  const overview = analyticsData.overview;
  const stationStats = Array.isArray(analyticsData?.stationStats) ? analyticsData.stationStats : [];
  const stationsList = Array.isArray(stations) ? stations : [];

  // Active counts from API
  const activeStations = overview.activeStations || 0;
  const constructionStations = overview.constructionStations || 0;
  
  const operationalHubs = overview.hubCount || 0;
  const operationalPoints = overview.pointCount || 0;
  const operationalKiosks = overview.operationalKiosks || 0;

  const constructionHubs = overview.constructionHubs || 0;
  const constructionPoints = overview.constructionPoints || 0;
  const constructionKiosks = overview.constructionKiosks || 0;

  const constructionPointsChargers = stationsList
    .filter((s) => s.type === 'point' && s.status === 'construction')
    .reduce((sum, s) => sum + (s.chargerCount || 0), 0);

  // Planned counts derived from stats
  const plannedHubs = stationStats.filter((s) => s.type === 'hub' && s.status === 'planned').length;
  const plannedPoints = stationStats.filter((s) => s.type === 'point' && s.status === 'planned').length;
  const plannedKiosks = stationStats.filter((s) => s.type === 'kiosk' && s.status === 'planned').length;
  const totalPlanned = plannedHubs + plannedPoints + plannedKiosks;

  // Total tracked active + planned
  const totalTracked = activeStations + constructionStations + totalPlanned;

  // Live capacity calculations from operational stations
  const operationalStations = stationsList.filter((s) => s.status === 'operational');
  const liveChargers = operationalStations.reduce((sum, s) => sum + (s.chargerCount || 0), 0);
  const liveKw = operationalStations.reduce((sum, s) => sum + (s.totalKw || 0), 0);
  const formattedKw = liveKw.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  // Percentages for progress bar
  const opPct = totalTracked > 0 ? (activeStations / totalTracked) * 100 : 0;
  const constPct = totalTracked > 0 ? (constructionStations / totalTracked) * 100 : 0;
  const planPct = totalTracked > 0 ? (totalPlanned / totalTracked) * 100 : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* TIER 1 — Hero Split Stat Bar (full width, dark background #0D0D0D) */}
      <div className="bg-[#0D0D0D] border border-zinc-900 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        {/* Subtle orange ambient glow on the right */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8621A] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center divide-y md:divide-y-0 md:divide-x divide-zinc-800 gap-6 w-full z-10">
          {/* Left section: Deployed operational stations */}
          <div className="flex items-center gap-4 flex-1 min-w-0 pb-4 md:pb-0">
            <div className="bg-[#E8621A]/10 rounded-2xl p-3 flex items-center justify-center border border-[#E8621A]/20">
              <Zap className="h-7 w-7 text-[#E8621A] animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="font-black text-4xl md:text-5xl text-[#E8621A] tracking-tighter leading-none font-display">
                  {activeStations}
                </span>
                <span className="block font-bold text-xs tracking-widest text-white uppercase">
                  OPERATIONAL SITES (DEPLOYED)
                </span>
              </div>
              <span className="block text-xs md:text-sm text-white/60 font-semibold mt-1">
                {liveChargers} Chargers <span className="text-white/30 mx-1.5">•</span> {formattedKw} kW Capacity
              </span>
            </div>
          </div>

          {/* Right section: Deploying under construction */}
          <div className="flex items-center gap-4 flex-1 min-w-0 pt-4 md:pt-0 md:pl-6">
            <div className="bg-amber-500/10 rounded-2xl p-3 flex items-center justify-center border border-amber-500/20">
              <HardHat className="h-7 w-7 text-amber-500" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="font-black text-4xl md:text-5xl text-amber-500 tracking-tighter leading-none font-display">
                  {constructionStations}
                </span>
                <span className="block font-bold text-xs tracking-widest text-white/95 uppercase">
                  IN PROGRESS (DEPLOYING)
                </span>
              </div>
              <span className="block text-xs md:text-sm text-white/60 font-semibold mt-1">
                {constructionHubs} Hubs + {constructionPointsChargers} Point Chargers ({constructionPoints} sites) + {constructionKiosks} Kiosk
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/85 rounded-full px-3 py-1.5 self-start md:self-center z-10 shadow-sm flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8621A] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E8621A]"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
            Live Now
          </span>
        </div>
      </div>

      {/* TIER 2 — Three infrastructure status cards (strictly Deployed vs Deploying) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Card 1: ROAM HUBS */}
        <div className="bg-white dark:bg-[#141414] border border-zinc-150 dark:border-zinc-850 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A9A]">
              ROAM HUBS
            </span>
            <p className="text-4xl font-black text-[#0D0D0D] dark:text-white leading-tight font-display">
              {operationalHubs}{' '}
              <span className="text-sm font-bold text-[#9A9A9A] normal-case tracking-normal">
                deployed
              </span>
            </p>
            <p className="text-xs text-[#9A9A9A] font-semibold flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>{constructionHubs} deploying (in progress)</span>
            </p>
          </div>
          <div className="rounded-xl p-3 bg-[#E8621A]/10 border border-[#E8621A]/10 flex-shrink-0">
            <BatteryCharging className="h-6 w-6 text-[#E8621A]" />
          </div>
        </div>

        {/* Card 2: ROAM POINTS */}
        <div className="bg-white dark:bg-[#141414] border border-zinc-150 dark:border-zinc-850 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A9A]">
              ROAM POINTS
            </span>
            <p className="text-4xl font-black text-[#0D0D0D] dark:text-white leading-tight font-display">
              {operationalPoints}{' '}
              <span className="text-sm font-bold text-[#9A9A9A] normal-case tracking-normal">
                deployed
              </span>
            </p>
            <p className="text-xs text-[#9A9A9A] font-semibold flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>{constructionPointsChargers} chargers deploying ({constructionPoints} sites)</span>
            </p>
          </div>
          <div className="rounded-xl p-3 bg-[#0D0D0D]/10 dark:bg-white/10 flex-shrink-0">
            <Zap className="h-6 w-6 text-[#0D0D0D] dark:text-white" />
          </div>
        </div>

        {/* Card 3: ROAM KIOSKS */}
        <div className="bg-white dark:bg-[#141414] border border-zinc-150 dark:border-zinc-850 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A9A]">
              ROAM KIOSKS
            </span>
            <p className="text-4xl font-black text-[#0D0D0D] dark:text-white leading-tight font-display">
              {operationalKiosks}{' '}
              <span className="text-sm font-bold text-[#9A9A9A] normal-case tracking-normal">
                deployed
              </span>
            </p>
            <p className="text-xs text-[#9A9A9A] font-semibold flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>{constructionKiosks} deploying (in progress)</span>
            </p>
          </div>
          <div className="rounded-xl p-3 bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
            <Radio className="h-6 w-6 text-zinc-650 dark:text-zinc-300" />
          </div>
        </div>
      </div>

      {/* TIER 3 — Projections & Full Pipeline (full width progress bar) */}
      <div className="bg-[#F5F5F5] dark:bg-[#121212]/40 border border-zinc-150 dark:border-zinc-900 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A9A]">
            DEPLOYMENT PIPELINE
          </span>
          <span className="text-xs font-bold text-[#0D0D0D] dark:text-white/80">
            {totalTracked} total tracked sites
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Segmented Progress Bar */}
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              style={{ width: `${opPct}%` }}
              className="bg-[#E8621A] h-full transition-all duration-500"
              title={`Deployed (Operational): ${opPct.toFixed(1)}%`}
            />
            <div
              style={{ width: `${constPct}%` }}
              className="bg-amber-500 h-full transition-all duration-500"
              title={`Deploying (Construction): ${constPct.toFixed(1)}%`}
            />
            <div
              style={{ width: `${planPct}%` }}
              className="bg-zinc-300 dark:bg-zinc-700 h-full transition-all duration-500"
              title={`Planned Projections: ${planPct.toFixed(1)}%`}
            />
          </div>
          <span className="text-sm font-black text-[#E8621A] whitespace-nowrap font-display">
            {opPct.toFixed(1)}% deployed
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
          <div className="inline-flex items-center gap-1.5 bg-white dark:bg-[#181818] border border-zinc-200/50 dark:border-zinc-800/80 px-3 py-1 rounded-full shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#E8621A]" />
            <span>Deployed {activeStations}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-white dark:bg-[#181818] border border-zinc-200/50 dark:border-zinc-800/80 px-3 py-1 rounded-full shadow-sm">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Deploying {constructionStations}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-white dark:bg-[#181818] border border-zinc-200/50 dark:border-zinc-800/80 px-3 py-1 rounded-full shadow-sm">
            <span className="h-2 w-2 rounded-full bg-zinc-350 dark:bg-zinc-600" />
            <span>Planned Milestones {totalPlanned}</span>
          </div>
        </div>

        <p className="text-[11px] text-[#9A9A9A] font-semibold border-t border-zinc-250/20 dark:border-zinc-800/40 pt-3">
          Full Pipeline: {plannedHubs} Roam Hubs + {plannedPoints} Roam Points + {plannedKiosks} Roam Kiosks pending deployment across Kenya
        </p>
      </div>
    </div>
  );
}
