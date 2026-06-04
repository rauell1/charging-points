'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MapPin, BatteryCharging, Zap, Radio, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

interface Station {
  id: string;
  name: string;
  type: string;
  status: string;
  address: string;
  neighborhood: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  chargerCount: number;
  _count: {
    sessions: number;
    activities: number;
  };
}

const statusColors: Record<string, string> = {
  operational: 'bg-emerald-400',
  construction: 'bg-amber-400',
  planned: 'bg-slate-400',
  blocked: 'bg-red-400',
  archived: 'bg-slate-300',
  closed: 'bg-gray-500',
};

const statusLabels: Record<string, string> = {
  operational: 'Operational',
  construction: 'Under Construction',
  planned: 'Planned',
  blocked: 'Blocked',
  archived: 'Archived',
  closed: 'Closed',
};

type MapFilter = 'all' | 'operational' | 'hub' | 'point' | 'kiosk';

const filterButtons: { value: MapFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: Filter },
  { value: 'operational', label: 'Active', icon: BatteryCharging },
  { value: 'hub', label: 'Hubs', icon: BatteryCharging },
  { value: 'point', label: 'Points', icon: Zap },
  { value: 'kiosk', label: 'Kiosks', icon: Radio },
];

export function StationMap() {
  const [mapFilter, setMapFilter] = useState<MapFilter>('all');

  const { data: stations, isLoading } = useQuery<Station[]>({
    queryKey: ['stations'],
    queryFn: () => fetch('/api/stations').then((r) => r.json()),
  });

  const filteredStations = useMemo(() => {
    if (!stations) return [];
    if (mapFilter === 'all') return stations;
    if (mapFilter === 'operational') return stations.filter((s) => s.status === 'operational');
    return stations.filter((s) => s.type === mapFilter);
  }, [stations, mapFilter]);

  const mapBounds = useMemo(() => {
    if (!filteredStations || filteredStations.length === 0) return null;
    const lats = filteredStations.filter((s) => s.latitude != null).map((s) => s.latitude!);
    const lngs = filteredStations.filter((s) => s.longitude != null).map((s) => s.longitude!);
    if (lats.length === 0) return null;
    return {
      minLat: Math.min(...lats) - 0.02,
      maxLat: Math.max(...lats) + 0.02,
      minLng: Math.min(...lngs) - 0.03,
      maxLng: Math.max(...lngs) + 0.03,
    };
  }, [filteredStations]);

  const toPixel = (lat: number, lng: number) => {
    if (!mapBounds) return { x: 50, y: 50 };
    const x = ((lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
    const y = ((mapBounds.maxLat - lat) / (mapBounds.maxLat - mapBounds.minLat)) * 100;
    return { x, y };
  };

  const statusCounts = useMemo(() => {
    if (!stations) return {};
    return stations.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});
  }, [stations]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Station Map
          </CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {filterButtons.map((btn) => (
              <Button
                key={btn.value}
                variant={mapFilter === btn.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setMapFilter(btn.value)}
              >
                <btn.icon className="h-3 w-3 mr-1" />
                {btn.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <>
            <div className="relative w-full h-[400px] rounded-xl overflow-hidden bg-gradient-to-br from-emerald-50 to-cyan-50 border">
              {/* Map background with grid */}
              <div className="absolute inset-0 opacity-20">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute w-full border-t border-dashed border-slate-300"
                    style={{ top: `${(i + 1) * 12.5}%` }}
                  />
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={`v-${i}`}
                    className="absolute h-full border-l border-dashed border-slate-300"
                    style={{ left: `${(i + 1) * 10}%` }}
                  />
                ))}
              </div>

              {/* Nairobi label */}
              <div className="absolute top-3 left-3 text-xs font-semibold text-slate-400 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Greater Nairobi Region
              </div>

              {/* Station count badge */}
              <div className="absolute top-3 right-3">
                <Badge variant="secondary" className="text-xs">
                  {filteredStations.length} stations
                </Badge>
              </div>

              {/* Station markers */}
              {filteredStations.map((station) => {
                if (station.latitude == null || station.longitude == null) return null;
                const pos = toPixel(station.latitude, station.longitude);
                const isHub = station.type === 'hub';
                const isKiosk = station.type === 'kiosk';
                const markerSize = isHub ? 'w-5 h-5' : isKiosk ? 'w-3 h-3' : 'w-3.5 h-3.5';
                const isActive = station.status === 'operational';

                return (
                  <motion.div
                    key={station.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.02, duration: 0.3, type: 'spring', stiffness: 260 }}
                    className="absolute"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    {/* Pulse ring for active stations */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{
                          left: '-6px',
                          top: '-6px',
                          right: '-6px',
                          bottom: '-6px',
                        }}
                        animate={{
                          scale: [1, 1.6, 1],
                          opacity: [0.3, 0, 0.3],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      >
                        <div
                          className={`w-6 h-6 rounded-full ${statusColors[station.status] || 'bg-slate-400'}`}
                          style={{ opacity: 0.25 }}
                        />
                      </motion.div>
                    )}

                    {/* Main marker */}
                    <div className="flex flex-col items-center group cursor-pointer">
                      <div
                        className={`${markerSize} rounded-full shadow-lg border-2 border-white ${statusColors[station.status] || 'bg-slate-400'} ${isHub ? 'ring-2 ring-amber-300/40' : ''}`}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-white rounded-lg shadow-lg border p-2 min-w-[160px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5 mb-1">
                            {isHub ? (
                              <BatteryCharging className="h-3 w-3 text-amber-600" />
                            ) : isKiosk ? (
                              <Radio className="h-3 w-3 text-cyan-600" />
                            ) : (
                              <Zap className="h-3 w-3 text-orange-600" />
                            )}
                            <span className="text-xs font-medium">{station.name}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{station.neighborhood}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {statusLabels[station.status] || station.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {station.chargerCount > 0 ? `${station.chargerCount} chargers` : '-'}
                            </span>
                          </div>
                        </div>
                        <div className="w-2 h-2 bg-white border-b border-r border-slate-200 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Compact Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-muted-foreground">
              {/* Status summary */}
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">Status:</span>
                {Object.entries(statusCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => (
                    <span key={status} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                      {statusLabels[status] || status} ({count})
                    </span>
                  ))}
              </div>
              <div className="hidden sm:block w-px h-4 bg-border" />
              {/* Type markers */}
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">Type:</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-slate-400 border-2 border-white shadow ring-1 ring-amber-300/40" />
                  Hub
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white shadow" />
                  Point
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 border-2 border-white shadow" />
                  Kiosk
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
