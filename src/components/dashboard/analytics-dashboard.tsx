'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, Zap, BatteryCharging, Radio, MapPin } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface AnalyticsData {
  overview: {
    totalStations: number;
    activeStations: number;
    hubCount: number;
    pointCount: number;
    totalSessions: number;
    totalChargers: number;
  };
  sessionsByVehicle: { vehicleType: string; _count: { id: number }; _sum: { chargingMinutes: number; energyKwh: number; costKes: number } }[];
  dailySessions: { date: string; count: number; energy: number; revenue: number }[];
  stationStats: { id: string; name: string; type: string; status: string; sessionCount: number; totalEnergy: number; totalRevenue: number }[];
}

const VEHICLE_COLORS: Record<string, string> = {
  motorcycle: '#f59e0b',
  tuk_tuk: '#10b981',
  light_car: '#6366f1',
};

export function AnalyticsDashboard() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: () => fetch('/api/analytics').then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[320px]" />
        ))}
      </div>
    );
  }

  const overview = data?.overview;

  // Station type breakdown
  const kioskCount = (overview?.totalStations || 0) - (overview?.hubCount || 0) - (overview?.pointCount || 0);
  const constructionCount = data?.stationStats?.filter(s => s.status === 'construction').length || 0;
  const blockedCount = data?.stationStats?.filter(s => s.status === 'blocked').length || 0;
  const archivedCount = data?.stationStats?.filter(s => s.status === 'archived').length || 0;

  const vehicleData = (data?.sessionsByVehicle || []).map((v) => ({
    name: v.vehicleType.replace(/_/g, ' '),
    sessions: v._count.id,
    energy: Math.round((v._sum.energyKwh || 0) * 10) / 10,
    revenue: v._sum.costKes || 0,
  }));

  // Top 10 stations by sessions
  const stationSessionData = (data?.stationStats || [])
    .filter((s) => s.sessionCount > 0)
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, 12)
    .map((s) => ({
      name: s.name.replace('Roam Hub - ', '').replace('Roam Point - ', '').replace('Roam Kiosk - ', ''),
      sessions: s.sessionCount,
      energy: s.totalEnergy,
      type: s.type,
    }));

  const pieData = (data?.sessionsByVehicle || []).map((v) => ({
    name: v.vehicleType.replace(/_/g, ' '),
    value: v._count.id,
  }));

  const dailyData = (data?.dailySessions || []).map((d) => ({
    ...d,
    date: d.date.substring(5),
  }));

  // Station status breakdown for donut chart
  const statusBreakdown = [
    { name: 'Operational', value: overview?.activeStations || 0, color: '#10b981' },
    { name: 'Construction', value: constructionCount, color: '#f59e0b' },
    { name: 'Blocked', value: blockedCount, color: '#ef4444' },
    { name: 'Archived', value: archivedCount, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  // Type breakdown
  const typeBreakdown = [
    { name: 'Roam Hubs', value: overview?.hubCount || 0, color: '#f59e0b', icon: BatteryCharging },
    { name: 'Roam Points', value: overview?.pointCount || 0, color: '#f97316', icon: Zap },
    { name: 'Roam Kiosks', value: kioskCount, color: '#06b6d4', icon: Radio },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-emerald-500/10">
                <BatteryCharging className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{overview?.hubCount || 0}</p>
                <p className="text-xs text-muted-foreground">Roam Hubs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-orange-500/10">
                <Zap className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{overview?.pointCount || 0}</p>
                <p className="text-xs text-muted-foreground">Roam Points</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-cyan-500/10">
                <Radio className="h-4 w-4 text-cyan-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{kioskCount}</p>
                <p className="text-xs text-muted-foreground">Roam Kiosks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-2 bg-green-500/10">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{overview?.activeStations || 0}</p>
                <p className="text-xs text-muted-foreground">Operational</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Sessions Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Daily Charging Sessions (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  fill="url(#colorSessions)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Station Type Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Station Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center">
            <ResponsiveContainer width="50%" height={260}>
              <PieChart>
                <Pie
                  data={typeBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {typeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-4">
              {typeBreakdown.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: entry.color + '15' }}
                  >
                    <entry.icon className="h-4 w-4" style={{ color: entry.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.value} stations</p>
                  </div>
                  <p className="text-lg font-bold">{entry.value}</p>
                </div>
              ))}
              <div className="border-t pt-3 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Stations</span>
                  <span className="text-sm font-bold">{overview?.totalStations || 0}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Total Chargers</span>
                  <span className="text-sm font-bold">{overview?.totalChargers || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions by Station - Top 12 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Top Stations by Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stationSessionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vehicle Type Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" /> Vehicle Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center">
            <ResponsiveContainer width="50%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={VEHICLE_COLORS[entry.name.replace(' ', '_')] || COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-4">
              {pieData.map((entry, index) => (
                <div key={entry.name}>
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: VEHICLE_COLORS[entry.name.replace(' ', '_')] || COLORS[index % COLORS.length],
                      }}
                    />
                    <span className="text-sm font-medium capitalize">{entry.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.value} sessions</p>
                  {vehicleData[index] && (
                    <p className="text-xs text-muted-foreground">
                      {vehicleData[index].energy} kWh &middot; KES {vehicleData[index].revenue.toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
              <div className="border-t pt-3 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Sessions</span>
                  <span className="text-sm font-bold">{overview?.totalSessions || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
