'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
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
import { useTheme } from 'next-themes';
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
  Sun,
  Moon,
  Menu,
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
  },
});

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full hover:bg-[--roam-gray-light] dark:hover:bg-zinc-800 transition-colors"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-[--roam-orange]" />
      ) : (
        <Moon className="h-4 w-4 text-[--roam-black]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

function InfoBadges() {
  const { data } = useQuery<{ overview: { hubCount: number; pointCount: number } }>({
    queryKey: ['analytics-badges'],
    queryFn: () => fetch('/api/analytics').then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json();
    }),
  });
  const hubCount = data?.overview?.hubCount || 0;
  const pointCount = data?.overview?.pointCount || 0;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="text-[10px] gap-1 border-[--roam-orange]/20 bg-[--roam-orange-light] text-[--roam-orange] dark:bg-[--roam-orange]/10 hover:bg-[--roam-orange-light]">
        <BatteryCharging className="h-3 w-3 text-[--roam-orange]" />
        {hubCount} Roam Hubs
      </Badge>
      <Badge variant="outline" className="text-[10px] gap-1 border-stone-200 dark:border-stone-800 text-[--roam-gray-dark] dark:text-zinc-300">
        <Zap className="h-3 w-3 text-[--roam-gray-mid]" />
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
        <header className="border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#0D0D0D] sticky top-0 z-50 shadow-sm h-14 md:h-16 flex items-center">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-baseline">
                    <span className="font-black text-2xl tracking-tighter text-[--roam-black] dark:text-white">ROAM</span>
                    <span className="font-black text-2xl tracking-tighter text-[--roam-black] dark:text-white hidden sm:inline ml-1">ELECTRIC</span>
                  </div>
                  <Badge className="bg-[--roam-orange-light] text-[--roam-orange] dark:bg-[--roam-orange]/15 dark:text-[--roam-orange] text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border-none hover:bg-[--roam-orange-light] hidden xs:flex">
                    <span className="hidden md:inline">Charging Infrastructure Tracker</span>
                    <span className="md:hidden">Tracker</span>
                  </Badge>
                </div>
                <Badge variant="secondary" className="text-[10px] hidden sm:flex bg-[--roam-gray-light] dark:bg-zinc-800 text-[--roam-gray-dark] dark:text-zinc-300 border-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-[--roam-orange] mr-1.5 animate-pulse" />
                  Live Tracking
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <SyncDialog />
                <div className="hidden sm:flex items-center gap-1.5">
                  <a
                    href="https://www.roam-electric.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="border border-[--roam-black] dark:border-zinc-700 text-[--roam-black] dark:text-zinc-200 hover:bg-[--roam-black] dark:hover:bg-zinc-800 hover:text-white rounded-full px-4 py-1.5 h-8 text-xs font-semibold transition-all">
                      <ExternalLink className="h-3 w-3" />
                      Website
                    </Button>
                  </a>
                  <a href="tel:+254740666555">
                    <Button variant="outline" className="border border-[--roam-black] dark:border-zinc-700 text-[--roam-black] dark:text-zinc-200 hover:bg-[--roam-black] dark:hover:bg-zinc-800 hover:text-white rounded-full px-4 py-1.5 h-8 text-xs font-semibold transition-all">
                      <Phone className="h-3 w-3" />
                      Contact
                    </Button>
                  </a>
                </div>
                
                <ThemeToggle />

                {/* Mobile hamburger menu */}
                <Button variant="ghost" size="icon" className="sm:hidden h-9 w-9 rounded-full hover:bg-[--roam-gray-light] dark:hover:bg-zinc-850">
                  <Menu className="h-5 w-5 text-[--roam-black] dark:text-white" />
                </Button>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-gray-100 dark:border-zinc-800">
              <TabsList className="w-full sm:w-auto bg-transparent rounded-none h-auto p-0 flex gap-4 md:gap-6 justify-start overflow-x-auto border-none">
                <TabsTrigger
                  value="overview"
                  className="text-xs gap-1.5 px-0 py-2.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[--roam-orange] data-[state=active]:text-[--roam-black] dark:data-[state=active]:text-white text-[--roam-gray-mid] hover:text-[--roam-black] dark:hover:text-white font-medium data-[state=active]:font-semibold transition-all cursor-pointer"
                >
                  <LayoutDashboard className={`h-3.5 w-3.5 ${activeTab === 'overview' ? 'text-[--roam-orange]' : 'text-[--roam-gray-mid]'}`} />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger
                  value="stations"
                  className="text-xs gap-1.5 px-0 py-2.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[--roam-orange] data-[state=active]:text-[--roam-black] dark:data-[state=active]:text-white text-[--roam-gray-mid] hover:text-[--roam-black] dark:hover:text-white font-medium data-[state=active]:font-semibold transition-all cursor-pointer"
                >
                  <Map className={`h-3.5 w-3.5 ${activeTab === 'stations' ? 'text-[--roam-orange]' : 'text-[--roam-gray-mid]'}`} />
                  <span>Stations</span>
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="text-xs gap-1.5 px-0 py-2.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[--roam-orange] data-[state=active]:text-[--roam-black] dark:data-[state=active]:text-white text-[--roam-gray-mid] hover:text-[--roam-black] dark:hover:text-white font-medium data-[state=active]:font-semibold transition-all cursor-pointer"
                >
                  <BarChart3 className={`h-3.5 w-3.5 ${activeTab === 'analytics' ? 'text-[--roam-orange]' : 'text-[--roam-gray-mid]'}`} />
                  <span>Analytics</span>
                </TabsTrigger>
                <TabsTrigger
                  value="milestones"
                  className="text-xs gap-1.5 px-0 py-2.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[--roam-orange] data-[state=active]:text-[--roam-black] dark:data-[state=active]:text-white text-[--roam-gray-mid] hover:text-[--roam-black] dark:hover:text-white font-medium data-[state=active]:font-semibold transition-all cursor-pointer"
                >
                  <MilestoneIcon className={`h-3.5 w-3.5 ${activeTab === 'milestones' ? 'text-[--roam-orange]' : 'text-[--roam-gray-mid]'}`} />
                  <span>Milestones</span>
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="text-xs gap-1.5 px-0 py-2.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[--roam-orange] data-[state=active]:text-[--roam-black] dark:data-[state=active]:text-white text-[--roam-gray-mid] hover:text-[--roam-black] dark:hover:text-white font-medium data-[state=active]:font-semibold transition-all cursor-pointer"
                >
                  <Rss className={`h-3.5 w-3.5 ${activeTab === 'activity' ? 'text-[--roam-orange]' : 'text-[--roam-gray-mid]'}`} />
                  <span>Activity</span>
                </TabsTrigger>
              </TabsList>

              {/* Info Badges - Dynamic */}
              <div className="pb-2 sm:pb-0">
                <InfoBadges />
              </div>
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
        <footer className="border-t-2 border-[--roam-orange] bg-[#0D0D0D] text-white/70 mt-auto py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="flex items-baseline">
                  <span className="font-black text-xl tracking-tighter text-white">ROAM</span>
                  <span className="font-black text-xl tracking-tighter text-white ml-0.5">ELECTRIC</span>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Charging Infrastructure Tracker</p>
                  <p className="text-white/40 mt-1">Data sourced from{' '}
                    <a
                      href="https://www.roam-electric.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-white hover:text-[--roam-orange] transition-colors"
                    >
                      roam-electric.com
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <a href="mailto:info@roam-electric.com" className="flex items-center gap-1.5 text-white/80 hover:text-[--roam-orange] transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                  info@roam-electric.com
                </a>
                <a href="tel:+254740666555" className="flex items-center gap-1.5 text-white/80 hover:text-[--roam-orange] transition-colors">
                  <Phone className="h-3.5 w-3.5" />
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
