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
  '#E8621A', // roam-orange
  '#0D0D0D', // roam-black
  '#9A9A9A', // roam-gray-mid
  '#FFF0E8', // roam-orange-light
  '#3A3A3A', // roam-gray-dark
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
  motorcycle: '#E8621A', // Roam orange accent
  tuk_tuk: '#0D0D0D',    // Roam black
  light_car: '#9A9A9A',  // Roam gray
};

function EmptyChartState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[260px] w-full text-muted-foreground gap-2">
      <BarChart3 className="h-8 w-8 text-[--roam-orange] opacity-50" />
      <span className="text-xs font-semibold text-[--roam-gray-mid] uppercase tracking-widest">{label}</span>
    </div>
  );
}

export function AnalyticsDashboard() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: () => fetch('/api/analytics').then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json();
    }),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[320px] rounded-2xl" />
        ))}
      </div>
    );
  }

  const overview = data?.overview;

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

  const statusBreakdown = [
    { name: 'Operational', value: overview?.activeStations || 0, color: '#E8621A' },
    { name: 'Construction', value: constructionCount, color: '#f59e0b' },
    { name: 'Blocked', value: blockedCount, color: '#ef4444' },
    { name: 'Archived', value: archivedCount, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const typeBreakdown = [
    { name: 'Roam Hubs', value: overview?.hubCount || 0, color: '#E8621A', icon: BatteryCharging },
    { name: 'Roam Points', value: overview?.pointCount || 0, color: '#0D0D0D', icon: Zap },
    { name: 'Roam Kiosks', value: kioskCount, color: '#9A9A9A', icon: Radio },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-gray-100 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-xl p-2 bg-[--roam-orange]/10 flex-shrink-0">
                <BatteryCharging className="h-4 w-4 text-[--roam-orange]" />
              </div>
              <div>
                <p className="text-lg font-black text-[--roam-black] dark:text-white leading-tight">{overview?.hubCount || 0}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid] mt-0.5">Roam Hubs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-xl p-2 bg-[--roam-black]/10 dark:bg-white/10 flex-shrink-0">
                <Zap className="h-4 w-4 text-[--roam-black] dark:text-white" />
              </div>
              <div>
                <p className="text-lg font-black text-[--roam-black] dark:text-white leading-tight">{overview?.pointCount || 0}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid] mt-0.5">Roam Points</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-xl p-2 bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                <Radio className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-lg font-black text-[--roam-black] dark:text-white leading-tight">{kioskCount}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid] mt-0.5">Roam Kiosks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-100 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="rounded-xl p-2 bg-[--roam-orange]/10 flex-shrink-0">
                <MapPin className="h-4 w-4 text-[--roam-orange]" />
              </div>
              <div>
                <p className="text-lg font-black text-[--roam-black] dark:text-white leading-tight">{overview?.activeStations || 0}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid] mt-0.5">Operational</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Sessions Trend */}
        <Card className="border border-gray-100 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[--roam-orange]" /> Daily Charging Sessions (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {dailyData.length === 0 ? (
              <EmptyChartState label="No session data yet" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E8621A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E8621A" stopOpacity={0} />
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
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      fontSize: '12px',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#E8621A"
                    fill="url(#colorSessions)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Station Type Breakdown */}
        <Card className="border border-gray-100 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[--roam-orange]" /> Station Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center pt-4">
            <ResponsiveContainer width="100%" height={200} className="sm:w-1/2">
              <PieChart>
                <Pie
                  data={typeBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {typeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    fontSize: '12px',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 w-full space-y-3 mt-4 sm:mt-0">
              {typeBreakdown.map((entry) => (
                <div key={entry.name} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: entry.color === '#0D0D0D' ? 'rgba(13,13,13,0.1)' : entry.color + '15' }}
                  >
                    <entry.icon className="h-4 w-4" style={{ color: entry.color === '#0D0D0D' ? undefined : entry.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[--roam-black] dark:text-white leading-tight">{entry.name}</p>
                    <p className="text-[10px] text-[--roam-gray-mid] leading-none mt-0.5">{entry.value} stations</p>
                  </div>
                  <p className="text-base font-black text-[--roam-black] dark:text-white">{entry.value}</p>
                </div>
              ))}
              <div className="border-t pt-3 mt-2 text-xs">
                <div className="flex items-center justify-between text-[--roam-gray-dark] dark:text-zinc-300">
                  <span className="text-[10px] uppercase font-semibold text-[--roam-gray-mid]">Total Stations</span>
                  <span className="font-bold">{overview?.totalStations || 0}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[--roam-gray-dark] dark:text-zinc-300">
                  <span className="text-[10px] uppercase font-semibold text-[--roam-gray-mid]">Total Chargers</span>
                  <span className="font-bold">{overview?.totalChargers || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions by Station - Top 12 */}
        <Card className="border border-gray-100 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[--roam-orange]" /> Top Stations by Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {stationSessionData.length === 0 ? (
              <EmptyChartState label="No session data yet" />
            ) : (
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
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      fontSize: '12px',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="sessions" fill="#E8621A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Type Distribution */}
        <Card className="border border-gray-100 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[--roam-orange]" /> Vehicle Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center pt-4">
            {vehicleData.length === 0 ? (
              <EmptyChartState label="No session data yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200} className="sm:w-1/2">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
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
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        fontSize: '12px',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 w-full space-y-3 mt-4 sm:mt-0">
                  {pieData.map((entry, index) => (
                    <div key={entry.name}>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: VEHICLE_COLORS[entry.name.replace(' ', '_')] || COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="text-xs font-bold capitalize text-[--roam-black] dark:text-white leading-tight">{entry.name}</span>
                      </div>
                      <p className="text-[10px] text-[--roam-gray-mid] leading-tight ml-4.5">{entry.value} sessions</p>
                      {vehicleData[index] && (
                        <p className="text-[10px] text-[--roam-gray-mid] leading-tight ml-4.5 mt-0.5">
                          {vehicleData[index].energy} kWh &middot; KES {vehicleData[index].revenue.toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-2 text-xs">
                    <div className="flex items-center justify-between text-[--roam-gray-dark] dark:text-zinc-300">
                      <span className="text-[10px] uppercase font-semibold text-[--roam-gray-mid]">Total Sessions</span>
                      <span className="font-bold">{overview?.totalSessions || 0}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
