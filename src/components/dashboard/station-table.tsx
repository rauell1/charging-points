'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BatteryCharging,
  Zap,
  MapPin,
  Sun,
  Clock,
  CreditCard,
  Wrench,
  TrendingUp,
  Radio,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface Station {
  id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  neighborhood: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  chargerCount: number;
  totalKw: number;
  connectorType: string | null;
  powerOutputKw: number | null;
  solarPowered: boolean;
  services: string;
  operatingHours: string | null;
  paymentMethods: string | null;
  launchDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    sessions: number;
    activities: number;
  };
}

interface StationDetail extends Station {
  activities: { id: string; stationId: string | null; title: string; description: string; createdAt: string }[];
  sessions: { id: string; vehicleType: string; chargingMinutes: number; rangeKm: number; energyKwh: number | null; costKes: number | null; date: string; createdAt: string }[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  operational: { label: 'Operational', className: 'bg-[--roam-orange]/10 text-[--roam-orange] border-none hover:bg-[--roam-orange]/15' },
  construction: { label: 'Under Construction', className: 'bg-amber-50 text-amber-700 border-none hover:bg-amber-100/30' },
  planned: { label: 'Planned', className: 'bg-gray-100 text-gray-600 border-none hover:bg-gray-200/50' },
  blocked: { label: 'Blocked', className: 'bg-red-50 text-red-600 border-none hover:bg-red-100/30' },
  archived: { label: 'Archived', className: 'bg-gray-50 text-gray-400 border-none hover:bg-gray-100/20' },
  closed: { label: 'Closed', className: 'bg-gray-50 text-gray-400 border-none hover:bg-gray-100/20' },
};

const typeConfig: Record<string, { label: string; className: string; icon: React.ElementType; color: string }> = {
  hub: { label: 'Roam Hub', className: 'bg-[--roam-orange]/10 text-[--roam-orange] border-none hover:bg-[--roam-orange]/15', icon: BatteryCharging, color: 'bg-[--roam-orange]/10' },
  point: { label: 'Roam Point', className: 'bg-[--roam-black]/10 text-[--roam-black] border-none', icon: Zap, color: 'bg-[--roam-black]/10' },
  kiosk: { label: 'Roam Kiosk', className: 'bg-zinc-100 text-zinc-600 border-none', icon: Radio, color: 'bg-zinc-100' },
};

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const cfg = typeConfig[type] || typeConfig.hub;
  const Icon = cfg.icon;
  return <Icon className={className} />;
}

function tryParseJson<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export function StationTable() {
  const [filter, setFilter] = useState<string>('all');
  const [selectedStation, setSelectedStation] = useState<StationDetail | null>(null);
  const isMobile = useIsMobile();

  const { data: stations, isLoading } = useQuery<Station[]>({
    queryKey: ['stations'],
    queryFn: () => fetch('/api/stations').then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json();
    }),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery<StationDetail>({
    queryKey: ['station-detail', selectedStation?.id],
    queryFn: () => fetch(`/api/stations/${selectedStation!.id}`).then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json();
    }),
    enabled: !!selectedStation?.id,
  });

  const filteredStations = useMemo(() => {
    if (!stations || !Array.isArray(stations)) return [];
    if (filter === 'all') return stations;
    if (filter === 'hub') return stations.filter((s) => s.type === 'hub');
    if (filter === 'point') return stations.filter((s) => s.type === 'point');
    if (filter === 'kiosk') return stations.filter((s) => s.type === 'kiosk');
    return stations.filter((s) => s.status === filter);
  }, [stations, filter]);

  const handleStationClick = (station: Station) => {
    setSelectedStation(station as StationDetail);
  };

  const currentDetail = detailData || selectedStation;
  const sessions = currentDetail?.sessions || [];
  const activities = currentDetail?.activities || [];

  const sessionChartData = useMemo(() => {
    if (!sessions.length) return [];
    const byDate = sessions.reduce<Record<string, { count: number; energy: number }>>((acc, s) => {
      const date = s.date.split('T')[0];
      if (!acc[date]) acc[date] = { count: 0, energy: 0 };
      acc[date].count += 1;
      acc[date].energy += s.energyKwh || 0;
      return acc;
    }, {});
    return Object.entries(byDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [sessions]);

  const vehicleTypeData = useMemo(() => {
    if (!sessions.length) return [];
    const byType = sessions.reduce<Record<string, number>>((acc, s) => {
      acc[s.vehicleType] = (acc[s.vehicleType] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(byType).map(([type, count]) => ({
      type: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      count,
    }));
  }, [sessions]);

  const paymentMethods = tryParseJson<string[]>(currentDetail?.paymentMethods, []);
  const services = tryParseJson<string[]>(currentDetail?.services, []);

  const dialogContent = currentDetail && (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className={`rounded-xl p-2.5 ${(typeConfig[currentDetail.type] || typeConfig.hub).color}`}>
          <TypeIcon
            type={currentDetail.type}
            className={`h-5 w-5 ${
              currentDetail.type === 'hub'
                ? 'text-[--roam-orange]'
                : currentDetail.type === 'point'
                  ? 'text-[--roam-black]'
                  : 'text-[--roam-gray-mid]'
            }`}
          />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[--roam-black] leading-tight">{currentDetail.name}</h3>
          <p className="text-xs text-[--roam-gray-mid] flex items-center gap-1 mt-0.5">
            <MapPin className="h-3.5 w-3.5 text-[--roam-orange]" />
            {currentDetail.address}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-2">
        <TabsList className="w-full bg-transparent border-b rounded-none h-auto p-0 flex gap-4">
          <TabsTrigger
            value="overview"
            className="rounded-none px-0 py-2 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[--roam-orange] data-[state=active]:text-[--roam-orange] text-[--roam-gray-mid] font-medium cursor-pointer"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="rounded-none px-0 py-2 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[--roam-orange] data-[state=active]:text-[--roam-orange] text-[--roam-gray-mid] font-medium cursor-pointer"
          >
            Sessions
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="rounded-none px-0 py-2 bg-transparent shadow-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[--roam-orange] data-[state=active]:text-[--roam-orange] text-[--roam-gray-mid] font-medium cursor-pointer"
          >
            Activity
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[60vh] mt-4 pr-1">
          <TabsContent value="overview" className="space-y-4 pr-2 mt-0">
            {/* Status and Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Status</p>
                <Badge className={`mt-1.5 ${(statusConfig[currentDetail.status] || statusConfig.planned).className}`}>
                  {(statusConfig[currentDetail.status] || statusConfig.planned).label}
                </Badge>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Chargers</p>
                <p className="text-lg font-black text-[--roam-black] mt-1">{currentDetail.chargerCount}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Power Output</p>
                <p className="text-lg font-black text-[--roam-black] mt-1">{currentDetail.powerOutputKw || currentDetail.totalKw || 0} kW</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Sessions</p>
                <p className="text-lg font-black text-[--roam-black] mt-1">
                  {currentDetail._count?.sessions ?? sessions.length ?? 0}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border border-zinc-200 rounded-lg bg-white shadow-none">
                <CardHeader className="pb-2 border-b border-zinc-100">
                  <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Station Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs pt-3">
                  {currentDetail.connectorType && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-[--roam-gray-mid]">Connector Type</span>
                        <span className="font-semibold text-[--roam-gray-dark]">{currentDetail.connectorType}</span>
                      </div>
                      <Separator />
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[--roam-gray-mid] flex items-center gap-1">
                      <Sun className="h-3.5 w-3.5 text-[--roam-orange]" /> Solar Powered
                    </span>
                    <span className="font-semibold text-[--roam-gray-dark]">{currentDetail.solarPowered ? 'Yes' : 'No'}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-[--roam-gray-mid] flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[--roam-orange]" /> Operating Hours
                    </span>
                    <span className="font-semibold text-[--roam-gray-dark]">{currentDetail.operatingHours || 'Not set'}</span>
                  </div>
                  <Separator />
                  {paymentMethods.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[--roam-gray-mid] flex items-center gap-1">
                          <CreditCard className="h-3.5 w-3.5 text-[--roam-orange]" /> Payment Methods
                        </span>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {paymentMethods.map((m: string) => (
                            <Badge key={m} className="text-[9px] bg-[--roam-gray-light] text-[--roam-gray-dark] border-none px-1.5 py-0.5">{m.replace(/_/g, ' ')}</Badge>
                          ))}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[--roam-gray-mid] flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5 text-[--roam-orange]" /> Services
                    </span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {services.map((s: string) => (
                        <Badge key={s} className="text-[9px] bg-[--roam-orange-light] text-[--roam-orange] border-none px-1.5 py-0.5">{s.replace(/_/g, ' ')}</Badge>
                      ))}
                    </div>
                  </div>
                  {currentDetail.launchDate && (
                    <>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-[--roam-gray-mid]">Launched</span>
                        <span className="font-semibold text-[--roam-gray-dark]">
                          {new Date(currentDetail.launchDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-zinc-200 rounded-lg bg-white shadow-none">
                <CardHeader className="pb-2 border-b border-zinc-100">
                  <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Quick Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-3">
                  {vehicleTypeData.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Vehicle Types</p>
                      <div className="space-y-2">
                        {vehicleTypeData.map((d) => (
                          <div key={d.type} className="flex items-center justify-between text-xs text-[--roam-gray-dark]">
                            <span>{d.type}</span>
                            <span className="font-semibold">{d.count} sessions</span>
                          </div>
                        ))}
                      </div>
                      <Separator />
                    </>
                  )}
                  {currentDetail.notes && (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Notes</p>
                      <p className="text-xs leading-relaxed text-[--roam-gray-dark]">{currentDetail.notes}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4 pr-2 mt-0">
            {sessionChartData.length > 0 && (
              <Card className="border border-zinc-200 rounded-lg bg-white shadow-none">
                <CardHeader className="pb-2 border-b border-zinc-100">
                  <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[--roam-orange]" /> Daily Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={sessionChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)',
                          fontSize: '11px',
                          borderRadius: '8px',
                        }}
                      />
                      <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2.5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {vehicleTypeData.length > 0 && (
              <Card className="border border-zinc-200 rounded-lg bg-white shadow-none">
                <CardHeader className="pb-2 border-b border-zinc-100">
                  <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Sessions by Vehicle Type</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={vehicleTypeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="type" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)',
                          fontSize: '11px',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Recent Sessions */}
            <Card className="border border-zinc-200 rounded-lg bg-white shadow-none">
              <CardHeader className="pb-2 border-b border-zinc-100">
                <CardTitle className="text-[10px] font-semibold uppercase tracking-widest text-[--roam-gray-mid]">Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[220px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Vehicle</TableHead>
                        <TableHead className="text-right text-xs">Duration</TableHead>
                        <TableHead className="text-right text-xs">Range</TableHead>
                        <TableHead className="text-right text-xs hidden sm:table-cell">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.slice(0, 20).map((s) => (
                        <TableRow key={s.id} className="hover:bg-muted/30">
                          <TableCell className="text-[11px] py-2">
                            {new Date(s.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-[11px] py-2 capitalize">
                            {s.vehicleType.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-right text-[11px] py-2">{s.chargingMinutes} min</TableCell>
                          <TableCell className="text-right text-[11px] py-2">{s.rangeKm} km</TableCell>
                          <TableCell className="text-right text-[11px] py-2 hidden sm:table-cell">
                            KES {s.costKes || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 pr-2 mt-0">
            {detailLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-3">
                {activities.map((act, idx) => (
                  <div key={act.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[--roam-orange] mt-1.5" />
                      {idx < activities.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-semibold text-xs text-[--roam-gray-dark]">{act.title}</p>
                      <p className="text-[11px] text-[--roam-gray-mid] mt-0.5 leading-relaxed">{act.description}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(act.createdAt).toLocaleDateString('en-KE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[--roam-gray-mid] text-center py-8">No activity recorded yet.</p>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );

  return (
    <>
      <Card className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-none">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-[--roam-gray-dark] font-display">Charging Stations</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs rounded-full cursor-pointer">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stations</SelectItem>
                <SelectItem value="hub">Roam Hubs</SelectItem>
                <SelectItem value="point">Roam Points</SelectItem>
                <SelectItem value="kiosk">Roam Kiosks</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="construction">Under Construction</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Station</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead className="text-right">Chargers</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStations.map((station) => {
                    const sc = statusConfig[station.status] || statusConfig.planned;
                    const tc = typeConfig[station.type] || typeConfig.hub;
                    return (
                      <TableRow
                        key={station.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleStationClick(station)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`rounded-xl p-1.5 ${tc.color} flex-shrink-0`}>
                              <TypeIcon
                                type={station.type}
                                className={`h-3.5 w-3.5 ${
                                  station.type === 'hub'
                                    ? 'text-[--roam-orange]'
                                    : station.type === 'point'
                                      ? 'text-[--roam-black]'
                                      : 'text-[--roam-gray-mid]'
                                }`}
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-xs leading-none text-[--roam-black] mb-1">{station.name}</p>
                              <p className="text-[10px] text-[--roam-gray-mid] leading-none">
                                {station.neighborhood}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[9px] px-1.5 py-0.5 rounded-full ${tc.className}`}>
                            {tc.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[9px] px-1.5 py-0.5 rounded-full ${sc.className}`}>
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-[--roam-gray-dark]">
                          {station.city}, {station.country}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-[--roam-black]">{station.chargerCount}</TableCell>
                        <TableCell className="hidden sm:table-cell text-right text-xs text-[--roam-gray-mid]">
                          {station._count.sessions}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conditionally render Sheet for Mobile, Dialog for Desktop */}
      {isMobile ? (
        <Sheet open={!!selectedStation} onOpenChange={(open) => !open && setSelectedStation(null)}>
          <SheetContent side="bottom" className="h-[95vh] w-full p-4 overflow-y-auto pt-8 border-t-[3px] border-t-[--roam-orange] rounded-t-2xl bg-white">
            <SheetHeader className="sr-only">
              <SheetTitle>Station Details</SheetTitle>
            </SheetHeader>
            {dialogContent}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!selectedStation} onOpenChange={(open) => !open && setSelectedStation(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-white border border-gray-100 rounded-2xl">
            {dialogContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
