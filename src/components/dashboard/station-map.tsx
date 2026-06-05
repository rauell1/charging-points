'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MapPin, BatteryCharging, Zap, Radio, Filter } from 'lucide-react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';

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

const mapStyles = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#bdbdbd' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#eeeeee' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#e5e5e5' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#dadada' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: '#e5e5e5' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#eeeeee' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9c9c9' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
];

function StationMapInner() {
  const [mapFilter, setMapFilter] = useState<MapFilter>('all');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const { data: stations, isLoading: queryLoading } = useQuery<Station[]>({
    queryKey: ['stations'],
    queryFn: () => fetch('/api/stations').then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json();
    }),
  });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
  });

  const filteredStations = useMemo(() => {
    if (!stations) return [];
    if (mapFilter === 'all') return stations;
    if (mapFilter === 'operational') return stations.filter((s) => s.status === 'operational');
    return stations.filter((s) => s.type === mapFilter);
  }, [stations, mapFilter]);

  const mapCenter = { lat: -1.286389, lng: 36.817223 }; // Nairobi

  // Marker icons matching specifications
  const getMarkerIcon = (type: string) => {
    if (!isLoaded || typeof window === 'undefined' || !window.google) return undefined;
    if (type === 'hub') {
      return {
        url: `data:image/svg+xml;utf-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <path fill="#E8621A" stroke="#FFFFFF" stroke-width="2" d="M16 2C9.4 2 4 7.4 4 14c0 7.2 11.2 16 12 16s12-8.8 12-16c0-6.6-5.4-12-12-12z"/>
            <circle cx="16" cy="14" r="5" fill="#FFFFFF"/>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 32),
      };
    } else if (type === 'point') {
      return {
        url: `data:image/svg+xml;utf-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="#0D0D0D" stroke="#FFFFFF" stroke-width="2" d="M12 2C7.6 2 4 5.6 4 10c0 5.2 8 12 8 12s8-6.8 8-12c0-4.4-3.6-8-8-8z"/>
            <circle cx="12" cy="10" r="3.5" fill="#FFFFFF"/>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(24, 24),
        anchor: new window.google.maps.Point(12, 24),
      };
    } else {
      return {
        url: `data:image/svg+xml;utf-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
            <path fill="#9A9A9A" stroke="#FFFFFF" stroke-width="1.5" d="M10 2C6.7 2 4 4.7 4 8c0 4.2 6 10 6 10s6-5.8 6-10c0-3.3-2.7-6-6-6z"/>
            <circle cx="10" cy="8" r="2.5" fill="#FFFFFF"/>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(20, 20),
        anchor: new window.google.maps.Point(10, 20),
      };
    }
  };

  if (!apiKey) {
    return (
      <Card className="border border-[--roam-orange] rounded-2xl overflow-hidden bg-white dark:bg-[#141414] shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[--roam-orange]" /> Station Map
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] md:h-[450px] flex flex-col items-center justify-center text-center p-6 gap-3">
          <MapPin className="h-10 w-10 text-[--roam-orange] animate-bounce" />
          <p className="text-sm font-medium text-[--roam-gray-dark] dark:text-zinc-300">
            Map unavailable — add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to environment variables
          </p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = queryLoading || !isLoaded;

  return (
    <Card className="border border-gray-100 dark:border-zinc-850 rounded-2xl overflow-hidden bg-white dark:bg-[#141414] shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
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
      <CardContent className="p-0 relative">
        {isLoading ? (
          <Skeleton className="h-[300px] md:h-[450px] w-full rounded-none" />
        ) : loadError ? (
          <div className="h-[300px] md:h-[450px] flex items-center justify-center p-6 text-red-500 text-sm font-medium">
            Error loading Google Maps script. Check your API key.
          </div>
        ) : (
          <div className="relative w-full h-[300px] md:h-[450px]">
            {/* Station count badge overlay */}
            <div className="absolute top-3 right-3 z-10">
              <Badge className="bg-[--roam-orange-light] text-[--roam-orange] dark:bg-[--roam-orange]/20 hover:bg-[--roam-orange-light] border-none text-xs font-semibold px-2.5 py-1">
                {filteredStations.length} stations
              </Badge>
            </div>

            <GoogleMap
              mapContainerClassName="w-full h-full"
              center={mapCenter}
              zoom={11}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                styles: mapStyles,
              }}
            >
              {filteredStations.map((station) => {
                if (station.latitude == null || station.longitude == null) return null;
                return (
                  <Marker
                    key={station.id}
                    position={{ lat: station.latitude, lng: station.longitude }}
                    icon={getMarkerIcon(station.type)}
                    onClick={() => setSelectedStation(station)}
                  />
                );
              })}

              {selectedStation && selectedStation.latitude != null && selectedStation.longitude != null && (
                <InfoWindow
                  position={{ lat: selectedStation.latitude, lng: selectedStation.longitude }}
                  onCloseClick={() => setSelectedStation(null)}
                >
                  <div className="text-zinc-900 p-1 min-w-[150px] font-sans">
                    <h4 className="font-bold text-xs mb-1 uppercase tracking-wider text-[#0D0D0D]">{selectedStation.name}</h4>
                    <p className="text-[10px] text-zinc-500 mb-1.5">{selectedStation.neighborhood || selectedStation.city}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        selectedStation.status === 'operational'
                          ? 'bg-[#FFF0E8] text-[#E8621A]'
                          : selectedStation.status === 'construction'
                            ? 'bg-amber-50 text-amber-700'
                            : selectedStation.status === 'blocked'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {selectedStation.status}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-semibold">
                        {selectedStation.chargerCount} chargers
                      </span>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
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
