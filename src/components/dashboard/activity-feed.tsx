'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BatteryCharging, Zap, Newspaper } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  stationId: string | null;
  title: string;
  description: string;
  createdAt: string;
  station: { name: string; type: string } | null;
}

export function ActivityFeed() {
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ['activities'],
    queryFn: () => fetch('/api/activities').then((r) => { if (!r.ok) throw new Error('Failed to fetch activities'); return r.json(); }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Newspaper className="h-4 w-4" /> Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="px-4 py-2 space-y-1">
            {activities?.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-3 py-3 border-b last:border-0 border-border/50"
              >
                <div className="flex flex-col items-center mt-0.5">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {activity.station?.type === 'hub' ? (
                      <BatteryCharging className="h-3 w-3 text-amber-600" />
                    ) : activity.station ? (
                      <Zap className="h-3 w-3 text-orange-600" />
                    ) : (
                      <Newspaper className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {activity.description}
                  </p>
                  {activity.station && (
                    <div className="mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {activity.station.name}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
