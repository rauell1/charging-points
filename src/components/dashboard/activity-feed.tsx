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
    queryFn: () => fetch('/api/activities').then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json();
    }),
  });

  if (isLoading) {
    return (
      <Card className="border border-gray-100 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-100 dark:border-zinc-850 rounded-2xl bg-white dark:bg-[#141414] shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-50 dark:border-zinc-800">
        <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-[--roam-orange]" /> Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="px-4 py-2 space-y-1">
            {activities?.map((activity) => {
              const timeAgo = (() => {
                try {
                  const date = new Date(activity.createdAt);
                  if (isNaN(date.getTime())) throw new Error('Invalid Date');
                  return formatDistanceToNow(date, { addSuffix: true });
                } catch {
                  return 'recently';
                }
              })();

              const isHub = activity.station?.type === 'hub';

              return (
                <div
                  key={activity.id}
                  className="flex gap-3 py-3 border-b last:border-0 border-gray-100 dark:border-zinc-850"
                >
                  <div className="flex flex-col items-center mt-0.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isHub
                        ? 'bg-[--roam-orange]/10 text-[--roam-orange]'
                        : activity.station
                          ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {isHub ? (
                        <BatteryCharging className="h-4 w-4" />
                      ) : activity.station ? (
                        <Zap className="h-4 w-4" />
                      ) : (
                        <Newspaper className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-[--roam-black] dark:text-white leading-tight">{activity.title}</p>
                      <span className="text-[10px] text-[--roam-gray-mid] whitespace-nowrap flex-shrink-0">
                        {timeAgo}
                      </span>
                    </div>
                    <p className="text-xs text-[--roam-gray-dark] dark:text-zinc-350 mt-1 leading-relaxed">
                      {activity.description}
                    </p>
                    {activity.station && (
                      <div className="mt-1.5">
                        <Badge className="text-[9px] font-semibold bg-[--roam-gray-light] dark:bg-zinc-800 text-[--roam-gray-dark] dark:text-zinc-300 border-none px-1.5 py-0.5 rounded-full hover:bg-[--roam-gray-light]">
                          {activity.station.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
