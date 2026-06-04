'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import {
  BatteryCharging,
  Zap,
  MapPin,
  Sun,
  Clock,
  CreditCard,
  Wrench,
  Activity,
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

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  operational: { label: 'Operational', variant: 'default' },
  construction: { label: 'Under Construction', variant: 'secondary' },
  planned: { label: 'Planned', variant: 'outline' },
  blocked: { label: 'Blocked', variant: 'destructive' },
  archived: { label: 'Archived', variant: 'outline' },
  closed: { label: 'Closed', variant: 'destructive' },
};

const typeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: React.ElementType; color: string }> = {
  hub: { label: 'Roam Hub', variant: 'default', icon: BatteryCharging, color: 'bg-amber-500/10' },
  point: { label: 'Roam Point', variant: 'secondary', icon: Zap, color: 'bg-orange-500/10' },
  kiosk: { label: 'Roam Kiosk', variant: 'outline', icon: Radio, color: 'bg-cyan-500/10' },
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

  const { data: stations, isLoading } = useQuery<Station[]>({
    queryKey: ['stations'],
    queryFn: () => fetch('/api/stations').then((r) => { if (!r.ok) throw new Error('Failed to fetch stations'); return r.json(); }),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery<StationDetail>({
    queryKey: ['station-detail', selectedStation?.id],
    queryFn: () => fetch(`/api/stations/${selectedStation!.id}`).then((r) => { if (!r.ok) throw new Error('Failed to fetch station detail'); return r.json(); }),
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
    setSelectedStation(station);
  };

  const currentDetail = detailData || selectedStation;

  const sessions = currentDetail?.sessions || [];

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

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Charging Stations</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]">
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
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
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
                            <div className={`rounded-lg p-1.5 ${tc.color}`}>
                              <TypeIcon type={station.type} className={`h-3.5 w-3.5 ${station.type === 'hub' ? 'text-amber-600' : station.type === 'point' ? 'text-orange-600' : 'text-cyan-600'}`} />
                            </div>
                            <div>
                              <p className="font-medium text-sm leading-tight">{station.name}</p>
                              <p className="text-xs text-muted-foreground hidden lg:block">
                                {station.connectorType || (station.totalKw ? `${station.totalKw} kW` : station.partner || '-')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={tc.variant} className="text-xs">
                            {tc.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sc.variant} className="text-xs">
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {station.neighborhood}
                        </TableCell>
                        <TableCell className="text-right font-medium">{station.chargerCount}</TableCell>
                        <TableCell className="hidden sm:table-cell text-right text-muted-foreground">
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

      {/* Station Detail Dialog */}
      <Dialog
        open={!!selectedStation}
        onOpenChange={(open) => !open && setSelectedStation(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {currentDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${(typeConfig[currentDetail.type] || typeConfig.hub).color}`}>
                    <TypeIcon type={currentDetail.type} className={`h-5 w-5 ${currentDetail.type === 'hub' ? 'text-amber-600' : currentDetail.type === 'point' ? 'text-orange-600' : 'text-cyan-600'}`} />
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{currentDetail.name}</DialogTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {currentDetail.address}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="sessions">Sessions</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[60vh] mt-4">
                  <TabsContent value="overview" className="space-y-4 pr-4">
                    {/* Status and Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge variant={statusConfig[currentDetail.status]?.variant || 'outline'} className="mt-1">
                          {statusConfig[currentDetail.status]?.label || currentDetail.status}
                        </Badge>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">Chargers</p>
                        <p className="text-lg font-bold">{currentDetail.chargerCount}</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">Power Output</p>
                        <p className="text-lg font-bold">{currentDetail.powerOutputKw || currentDetail.totalKw || 0} kW</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">Sessions</p>
                        <p className="text-lg font-bold">{currentDetail._count?.sessions || currentDetail.sessions?.length || 0}</p>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Station Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5 text-sm">
                          {currentDetail.connectorType && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Connector Type</span>
                                <span className="font-medium">{currentDetail.connectorType}</span>
                              </div>
                              <Separator />
                            </>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Sun className="h-3.5 w-3.5" /> Solar Powered
                            </span>
                            <span className="font-medium">{currentDetail.solarPowered ? 'Yes' : 'No'}</span>
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> Operating Hours
                            </span>
                            <span className="font-medium">{currentDetail.operatingHours || 'Not set'}</span>
                          </div>
                          <Separator />
                          {paymentMethods.length > 0 && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <CreditCard className="h-3.5 w-3.5" /> Payment Methods
                                </span>
                                <div className="flex gap-1 flex-wrap justify-end">
                                  {paymentMethods.map((m: string) => (
                                    <Badge key={m} variant="outline" className="text-xs">{m.replace(/_/g, ' ')}</Badge>
                                  ))}
                                </div>
                              </div>
                              <Separator />
                            </>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Wrench className="h-3.5 w-3.5" /> Services
                            </span>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {services.map((s: string) => (
                                <Badge key={s} variant="secondary" className="text-xs">{s.replace(/_/g, ' ')}</Badge>
                              ))}
                            </div>
                          </div>
                          {currentDetail.launchDate && (
                            <>
                              <Separator />
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Launched</span>
                                <span className="font-medium">
                                  {new Date(currentDetail.launchDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Quick Analytics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {vehicleTypeData.length > 0 && (
                            <>
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Vehicle Types</p>
                              <div className="space-y-2">
                                {vehicleTypeData.map((d) => (
                                  <div key={d.type} className="flex items-center justify-between text-sm">
                                    <span>{d.type}</span>
                                    <span className="font-medium">{d.count} sessions</span>
                                  </div>
                                ))}
                              </div>
                              <Separator />
                            </>
                          )}
                          {currentDetail.notes && (
                            <>
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Notes</p>
                              <p className="text-sm leading-relaxed">{currentDetail.notes}</p>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="sessions" className="space-y-4 pr-4">
                    {sessionChartData.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Daily Sessions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={sessionChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                              />
                              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {vehicleTypeData.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Sessions by Vehicle Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={vehicleTypeData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="type" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                              />
                              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recent Sessions */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Recent Sessions</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="max-h-[250px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead className="text-right">Duration</TableHead>
                                <TableHead className="text-right">Range</TableHead>
                                <TableHead className="text-right hidden sm:table-cell">Cost</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentDetail.sessions.slice(0, 20).map((s) => (
                                <TableRow key={s.id}>
                                  <TableCell className="text-xs">
                                    {new Date(s.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {s.vehicleType.replace(/_/g, ' ')}
                                  </TableCell>
                                  <TableCell className="text-right text-xs">{s.chargingMinutes} min</TableCell>
                                  <TableCell className="text-right text-xs">{s.rangeKm} km</TableCell>
                                  <TableCell className="text-right text-xs hidden sm:table-cell">
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

                  <TabsContent value="activity" className="space-y-4 pr-4">
                    {detailLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-16" />
                        ))}
                      </div>
                    ) : detailData?.activities && detailData.activities.length > 0 ? (
                      <div className="space-y-3">
                        {detailData.activities.map((act, idx) => (
                          <div key={act.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" />
                              {idx < detailData.activities.length - 1 && (
                                <div className="w-px flex-1 bg-border mt-1" />
                              )}
                            </div>
                            <div className="pb-4">
                              <p className="font-medium text-sm">{act.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{act.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
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
                      <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet.</p>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
