'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { StationTable } from '@/components/dashboard/station-table';
import { StationMap } from '@/components/dashboard/station-map';
import { MilestonesTimeline } from '@/components/dashboard/milestones-timeline';
import { AnalyticsDashboard } from '@/components/dashboard/analytics-dashboard';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SyncDialog } from '@/components/dashboard/sync-dialog';
import {
  BatteryCharging,
  Zap,
  LayoutDashboard,
  Map,
  BarChart3,
  Milestone as MilestoneIcon,
  Rss,
  ExternalLink,
  Phone,
  Mail,
  Radio,
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
  },
});

function InfoBadges() {
  const { data } = useQuery<{ overview: { hubCount: number; pointCount: number } }>({
    queryKey: ['analytics-badges'],
    queryFn: () => fetch('/api/analytics').then((r) => r.json()),
  });
  const hubCount = data?.overview?.hubCount || 0;
  const pointCount = data?.overview?.pointCount || 0;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="text-[10px] gap-1">
        <BatteryCharging className="h-3 w-3 text-amber-600" />
        {hubCount} Roam Hubs
      </Badge>
      <Badge variant="outline" className="text-[10px] gap-1">
        <Zap className="h-3 w-3 text-orange-600" />
        {pointCount} Roam Points
      </Badge>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 md:h-16">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-sm md:text-base font-bold tracking-tight leading-none">
                      Roam Electric
                    </h1>
                    <p className="text-[10px] md:text-xs text-muted-foreground leading-none mt-0.5">
                      Charging Infrastructure Tracker
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] hidden sm:flex">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                  Live Tracking
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <SyncDialog />
                <a
                  href="https://www.roam-electric.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                    <ExternalLink className="h-3 w-3" />
                    <span className="hidden sm:inline">Website</span>
                  </Button>
                </a>
                <a href="tel:+254740666555">
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                    <Phone className="h-3 w-3" />
                    <span className="hidden sm:inline">Contact</span>
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          {/* Overview KPIs */}
          <div className="mb-4 md:mb-6">
            <OverviewCards />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="overview" className="text-xs gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="stations" className="text-xs gap-1.5">
                  <Map className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Stations</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="milestones" className="text-xs gap-1.5">
                  <MilestoneIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Milestones</span>
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs gap-1.5">
                  <Rss className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Activity</span>
                </TabsTrigger>
              </TabsList>

              {/* Info Badges - Dynamic */}
              <InfoBadges />
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
                {/* Map - takes 3 columns */}
                <div className="lg:col-span-3">
                  <StationMap />
                </div>

                {/* Activity Feed - takes 2 columns */}
                <div className="lg:col-span-2">
                  <ActivityFeed />
                </div>
              </div>

              <Separator className="hidden" />

              {/* Station Table */}
              <StationTable />
            </TabsContent>

            {/* Stations Tab */}
            <TabsContent value="stations" className="space-y-4 md:space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
                <div className="lg:col-span-3">
                  <StationMap />
                </div>
                <div className="lg:col-span-2">
                  <StationTable />
                </div>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="mt-0">
              <AnalyticsDashboard />
            </TabsContent>

            {/* Milestones Tab */}
            <TabsContent value="milestones" className="mt-0">
              <MilestonesTimeline />
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-0">
              <ActivityFeed />
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="border-t bg-card/30 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
                  <Zap className="h-2.5 w-2.5 text-white" />
                </div>
                <span>
                  Roam Electric Charging Infrastructure Tracker &middot; Data sourced from{' '}
                  <a
                    href="https://www.roam-electric.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground transition-colors"
                  >
                    roam-electric.com
                  </a>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <a href="mailto:info@roam-electric.com" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Mail className="h-3 w-3" />
                  info@roam-electric.com
                </a>
                <span>&middot;</span>
                <a href="tel:+254740666555" className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Phone className="h-3 w-3" />
                  +254 740 666 555
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}
