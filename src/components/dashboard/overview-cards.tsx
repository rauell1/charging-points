'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Zap,
  Building,
  Radio,
  Activity,
  BatteryCharging,
  TrendingUp,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface OverviewStats {
  totalStations: number;
  activeStations: number;
  hubCount: number;
  pointCount: number;
  totalSessions: number;
  totalChargers: number;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white dark:bg-[#141414] border border-zinc-200 dark:border-zinc-800 rounded-lg transition-all border-l-2 border-l-transparent hover:border-l-[--roam-orange] hover:border-zinc-300 dark:hover:border-zinc-700">
      <div className="p-3 md:p-5 flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">
            {title}
          </p>
          <p className="text-3xl font-black text-[--roam-black] dark:text-white leading-tight truncate font-display">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[--roam-gray-mid] truncate">{subtitle}</p>
          )}
        </div>
        <div className="rounded-xl p-2.5 bg-[--roam-orange]/10 flex-shrink-0">
          <Icon className="h-5 w-5 text-[--roam-orange]" />
        </div>
      </div>
    </div>
  );
}

export function OverviewCards() {
  const { data, isLoading } = useQuery<{ overview: OverviewStats }>({
    queryKey: ['analytics'],
    queryFn: () => fetch('/api/analytics').then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json();
    }),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 md:h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const stats = data?.overview;

  return (
    <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
      <StatCard
        title="Total Stations"
        value={stats?.totalStations || 0}
        subtitle="Hubs & Points"
        icon={Building}
      />
      <StatCard
        title="Active"
        value={stats?.activeStations || 0}
        subtitle="Operational now"
        icon={Activity}
      />
      <StatCard
        title="Roam Hubs"
        value={stats?.hubCount || 0}
        subtitle="Multi-purpose"
        icon={BatteryCharging}
      />
      <StatCard
        title="Roam Points"
        value={stats?.pointCount || 0}
        subtitle="Fast charging"
        icon={Zap}
      />
      <StatCard
        title="Total Chargers"
        value={stats?.totalChargers || 0}
        subtitle="Across all stations"
        icon={Radio}
      />
      <StatCard
        title="Total Sessions"
        value={stats?.totalSessions || 0}
        subtitle="All time"
        icon={TrendingUp}
      />
    </div>
  );
}
