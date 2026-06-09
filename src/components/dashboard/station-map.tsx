'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MapPin, BatteryCharging, Zap, Radio, Filter } from 'lucide-react';
import { useTheme } from 'next-themes';
import 'leaflet/dist/leaflet.css';

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

type MapFilter = 'all' | 'operational' | 'hub' | 'point' | 'kiosk';

const filterButtons: { value: MapFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: Filter },
  { value: 'operational', label: 'Active', icon: BatteryCharging },
  { value: 'hub', label: 'Hubs', icon: BatteryCharging },
  { value: 'point', label: 'Points', icon: Zap },
  { value: 'kiosk', label: 'Kiosks', icon: Radio },
];

function StationMapInner() {
  const [mapFilter, setMapFilter] = useState<MapFilter>('all');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const { resolvedTheme } = useTheme();

  const [L, setL] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  // Load Leaflet module dynamically on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((module) => {
        setL(module.default);
      });
    }
  }, []);

  const { data: stations, isLoading: queryLoading } = useQuery<Station[]>({
    queryKey: ['stations'],
    queryFn: () => fetch('/api/stations').then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json();
    }),
  });

  const filteredStations = useMemo(() => {
    if (!stations) return [];
    // Only include operational, construction, and blocked status for the map to keep it clear and active.
    // This filters out the hundreds of planned pipeline leads and archived sites, showing the ~40 actively built/tracked locations.
    const activeSites = stations.filter(
      (s) => s.status === 'operational' || s.status === 'construction' || s.status === 'blocked'
    );

    if (mapFilter === 'all') return activeSites;
    if (mapFilter === 'operational') return activeSites.filter((s) => s.status === 'operational');
    return activeSites.filter((s) => s.type === mapFilter);
  }, [stations, mapFilter]);

  // Initialize Map
  useEffect(() => {
    if (!L || !mapRef.current || leafletMapRef.current) return;

    // Initialize Leaflet map
    const map = L.map(mapRef.current, {
      center: [-1.286389, 36.817223], // Nairobi
      zoom: 11,
      zoomControl: true,
      attributionControl: false,
    });

    leafletMapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Initial tile layer setup
    const isDark = resolvedTheme === 'dark';
    const tileUrl = isDark 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution,
    }).addTo(map);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        tileLayerRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, [L, queryLoading]);

  // Handle dark/light theme tile swapping
  useEffect(() => {
    if (!L || !leafletMapRef.current) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const isDark = resolvedTheme === 'dark';
    const tileUrl = isDark 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution,
    }).addTo(leafletMapRef.current);
  }, [L, resolvedTheme]);

  // Update Markers
  useEffect(() => {
    if (!L || !leafletMapRef.current || !markersLayerRef.current) return;

    // Clear existing layers
    markersLayerRef.current.clearLayers();

    // Helper to generate marker icons
    const getLeafletIcon = (type: string, status: string) => {
      let html = '';
      let size: [number, number] = [20, 20];
      let anchor: [number, number] = [10, 20];
      
      if (type === 'hub') {
        let pinColor = '#22C55E'; // Default operational green
        if (status === 'construction') pinColor = '#F59E0B'; // Amber
        else if (status === 'blocked') pinColor = '#EF4444'; // Red
        else if (status === 'planned') pinColor = '#3B82F6'; // Blue
        else if (status === 'closed' || status === 'archived') pinColor = '#71717A'; // Muted gray

        size = [32, 32];
        anchor = [16, 32];
        html = `
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" class="drop-shadow-md">
            <path fill="${pinColor}" stroke="#FFFFFF" stroke-width="2" d="M16 2C9.4 2 4 7.4 4 14c0 7.2 11.2 16 12 16s12-8.8 12-16c0-6.6-5.4-12-12-12z"/>
            <circle cx="16" cy="14" r="5" fill="#FFFFFF"/>
          </svg>
        `;
      } else if (type === 'point') {
        let pinColor = '#15803D'; // Default operational dark green
        if (status === 'construction') pinColor = '#F59E0B'; // Amber
        else if (status === 'blocked') pinColor = '#EF4444'; // Red
        else if (status === 'planned') pinColor = '#3B82F6'; // Blue
        else if (status === 'closed' || status === 'archived') pinColor = '#71717A'; // Muted gray

        size = [24, 24];
        anchor = [12, 24];
        html = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="drop-shadow-md">
            <path fill="${pinColor}" stroke="#FFFFFF" stroke-width="2" d="M12 2C7.6 2 4 5.6 4 10c0 5.2 8 12 8 12s8-6.8 8-12c0-4.4-3.6-8-8-8z"/>
            <circle cx="12" cy="10" r="3.5" fill="#FFFFFF"/>
          </svg>
        `;
      } else {
        let pinColor = '#9A9A9A'; // Default Kiosk gray
        if (status === 'operational') pinColor = '#8B5CF6'; // Purple for active kiosk
        else if (status === 'construction') pinColor = '#F59E0B'; // Amber

        size = [20, 20];
        anchor = [10, 20];
        html = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" class="drop-shadow-md">
            <path fill="${pinColor}" stroke="#FFFFFF" stroke-width="1.5" d="M10 2C6.7 2 4 4.7 4 8c0 4.2 6 10 6 10s6-5.8 6-10c0-3.3-2.7-6-6-6z"/>
            <circle cx="10" cy="8" r="2.5" fill="#FFFFFF"/>
          </svg>
        `;
      }

      return L.divIcon({
        html,
        className: 'custom-map-marker',
        iconSize: size,
        iconAnchor: anchor,
        popupAnchor: [0, -size[1]],
      });
    };

    const createPopupHtml = (station: Station) => {
      const statusColorClass =
        station.status === 'operational'
          ? 'bg-green-50 text-green-700'
          : station.status === 'construction'
            ? 'bg-amber-50 text-amber-700'
            : station.status === 'blocked'
              ? 'bg-red-50 text-red-600'
              : 'bg-zinc-100 text-zinc-600';

      return `
        <div class="p-1 min-w-[160px] font-sans">
          <h4 class="font-bold text-xs uppercase tracking-wider text-stone-900 mb-0.5">${station.name}</h4>
          <p class="text-[10px] text-stone-500 mb-1.5">${station.neighborhood || station.city}</p>
          <div class="flex items-center gap-1.5 mt-1">
            <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColorClass}">
              ${station.status}
            </span>
            <span class="text-[10px] text-stone-600 font-semibold">
              ${station.chargerCount} chargers
            </span>
          </div>
        </div>
      `;
    };

    // Add markers to the group layer
    filteredStations.forEach((station) => {
      if (station.latitude == null || station.longitude == null) return;

      const marker = L.marker([station.latitude, station.longitude], {
        icon: getLeafletIcon(station.type, station.status),
      });

      marker.bindPopup(createPopupHtml(station), {
        closeButton: false,
        className: 'custom-leaflet-popup',
      });

      marker.addTo(markersLayerRef.current);
    });

    // Handle map centering and bounds zoom-capped fitting
    const validStations = filteredStations.filter(
      (s) => s.latitude != null && s.longitude != null
    );

    if (validStations.length > 0) {
      const bounds = L.latLngBounds(
        validStations.map((s) => [s.latitude!, s.longitude!])
      );
      leafletMapRef.current.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 14,
      });
    } else {
      leafletMapRef.current.setView([-1.286389, 36.817223], 11);
    }
  }, [L, filteredStations]);

  const isLoading = queryLoading || !L;

  return (
    <Card className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-none">
      <CardHeader className="pb-3 border-b border-zinc-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] flex items-center gap-2 font-display">
            <MapPin className="h-4 w-4 text-[--roam-orange]" /> Station Map
          </CardTitle>
          <div className="flex items-center w-full overflow-x-auto scrollbar-none flex-nowrap gap-1.5 pb-2 sm:pb-0 sm:w-auto">
            {filterButtons.map((btn) => (
              <Button
                key={btn.value}
                variant={mapFilter === btn.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-full flex-shrink-0 cursor-pointer"
                onClick={() => {
                  setMapFilter(btn.value);
                  setSelectedStation(null);
                }}
              >
                <btn.icon className={`h-3.5 w-3.5 mr-1 ${mapFilter === btn.value ? 'text-white' : 'text-[--roam-orange]'}`} />
                {btn.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative bg-zinc-50">
        {isLoading ? (
          <Skeleton className="h-[300px] md:h-[450px] w-full rounded-none" />
        ) : (
          <div 
            ref={mapRef} 
            className="w-full h-[300px] md:h-[450px] z-0" 
          />
        )}

        {/* Station count badge overlay */}
        {!isLoading && (
          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            <Badge className="bg-[--roam-orange-light] text-[--roam-orange] hover:bg-[--roam-orange-light] border-none text-xs font-semibold px-2.5 py-1">
              {filteredStations.length} stations
            </Badge>
          </div>
        )}

        {/* Map Legend Overlay */}
        {!isLoading && (
          <div className="absolute bottom-3 left-3 z-10 bg-white/95 border border-zinc-200 rounded-xl p-2.5 shadow-md text-[10px] pointer-events-auto backdrop-blur-xs max-w-[220px] space-y-2.5">
            {/* Status colours (shared across all types) */}
            <div>
              <p className="font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Status</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-semibold text-zinc-700">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#22C55E] flex-shrink-0" />
                  <span>Operational</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span>Construction</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span>Planned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span>Blocked</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="h-2 w-2 rounded-full bg-zinc-400 flex-shrink-0" />
                  <span>Archived / Closed</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-zinc-100" />

            {/* Station type markers */}
            <div>
              <p className="font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Type</p>
              <div className="space-y-1.5 font-semibold text-zinc-700">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 32 32">
                    <path fill="#22C55E" stroke="#fff" strokeWidth="2" d="M16 2C9.4 2 4 7.4 4 14c0 7.2 11.2 16 12 16s12-8.8 12-16c0-6.6-5.4-12-12-12z"/>
                    <circle cx="16" cy="14" r="5" fill="#fff"/>
                  </svg>
                  <span>Roam Hub (large pin)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="11" height="11" viewBox="0 0 24 24">
                    <path fill="#15803D" stroke="#fff" strokeWidth="2" d="M12 2C7.6 2 4 5.6 4 10c0 5.2 8 12 8 12s8-6.8 8-12c0-4.4-3.6-8-8-8z"/>
                    <circle cx="12" cy="10" r="3.5" fill="#fff"/>
                  </svg>
                  <span>Roam Point (medium)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="9" height="9" viewBox="0 0 20 20">
                    <path fill="#8B5CF6" stroke="#fff" strokeWidth="1.5" d="M10 2C6.7 2 4 4.7 4 8c0 4.2 6 10 6 10s6-5.8 6-10c0-3.3-2.7-6-6-6z"/>
                    <circle cx="10" cy="8" r="2.5" fill="#fff"/>
                  </svg>
                  <span>Roam Kiosk (small, purple)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const StationMap = dynamic(() => Promise.resolve(StationMapInner), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] md:h-[450px] w-full rounded-2xl" />,
});
