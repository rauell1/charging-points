'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Zap,
  MapPin,
  BatteryCharging,
  Clock,
  TrendingUp,
  Building,
  Radio,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-lg p-2.5 ${accent || 'bg-primary/10'}`}>
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewCards() {
  const { data, isLoading } = useQuery<{ overview: OverviewStats }>({
    queryKey: ['analytics'],
    queryFn: () => fetch('/api/analytics').then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 md:h-28" />
        ))}
      </div>
    );
  }

  const stats = data?.overview;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
      <StatCard
        title="Total Stations"
        value={stats?.totalStations || 0}
        subtitle="Hubs & Points"
        icon={Building}
        accent="bg-emerald-500/10"
      />
      <StatCard
        title="Active"
        value={stats?.activeStations || 0}
        subtitle="Operational now"
        icon={Activity}
        accent="bg-green-500/10"
      />
      <StatCard
        title="Roam Hubs"
        value={stats?.hubCount || 0}
        subtitle="Multi-purpose"
        icon={BatteryCharging}
        accent="bg-amber-500/10"
      />
      <StatCard
        title="Roam Points"
        value={stats?.pointCount || 0}
        subtitle="Fast charging"
        icon={Zap}
        accent="bg-orange-500/10"
      />
      <StatCard
        title="Total Chargers"
        value={stats?.totalChargers || 0}
        subtitle="Across all stations"
        icon={Radio}
        accent="bg-cyan-500/10"
      />
      <StatCard
        title="Total Sessions"
        value={stats?.totalSessions || 0}
        subtitle="All time"
        icon={TrendingUp}
        accent="bg-rose-500/10"
      />
    </div>
  );
}
