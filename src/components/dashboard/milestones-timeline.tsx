'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BatteryCharging,
  Zap,
  Globe,
  TrendingUp,
  Handshake,
  Banknote,
  Package,
  Milestone as MilestoneIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Milestone {
  id: string;
  title: string;
  description: string;
  date: string;
  category: string;
  status: string;
}

const categoryConfig: Record<string, { icon: React.ElementType; colorClass: string; label: string }> = {
  hub: { icon: BatteryCharging, colorClass: 'text-[--roam-orange] bg-[--roam-orange-light] dark:bg-[--roam-orange]/10', label: 'Roam Hub' },
  point: { icon: Zap, colorClass: 'text-[--roam-orange] bg-[--roam-orange-light] dark:bg-[--roam-orange]/10', label: 'Roam Point' },
  expansion: { icon: Globe, colorClass: 'text-[--roam-black] dark:text-zinc-200 bg-[--roam-gray-light] dark:bg-zinc-800', label: 'Expansion' },
  partnership: { icon: Handshake, colorClass: 'text-[--roam-orange] bg-[--roam-orange-light] dark:bg-[--roam-orange]/10', label: 'Partnership' },
  funding: { icon: Banknote, colorClass: 'text-[--roam-orange] bg-[--roam-orange-light] dark:bg-[--roam-orange]/10', label: 'Funding' },
  product: { icon: Package, colorClass: 'text-[--roam-black] dark:text-zinc-200 bg-[--roam-gray-light] dark:bg-zinc-800', label: 'Product' },
};

export function MilestonesTimeline() {
  const { data: milestones, isLoading } = useQuery<Milestone[]>({
    queryKey: ['milestones'],
    queryFn: () => fetch('/api/milestones').then((r) => {
      if (!r.ok) throw new Error(`API error ${r.status}`);
      return r.json();
    }),
  });

  const progress = useMemo(() => {
    if (!milestones || !Array.isArray(milestones) || milestones.length === 0) return 0;
    const completed = milestones.filter((m) => m.status === 'completed').length;
    return Math.round((completed / milestones.length) * 100);
  }, [milestones]);

  const allMilestones = useMemo(() => {
    if (!milestones) return [];
    return [...milestones].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [milestones]);

  if (isLoading) {
    return (
      <Card className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-[#141414] shadow-none">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-[#141414] shadow-none">
      <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-[--roam-gray-dark] dark:text-zinc-200 flex items-center gap-2 font-display">
            <MilestoneIcon className="h-4 w-4 text-[--roam-orange]" /> Infrastructure Milestones
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[--roam-gray-mid] uppercase tracking-wider">{progress}% complete</span>
            <div className="w-24 h-2 rounded-full bg-muted dark:bg-zinc-800 overflow-hidden">
              <motion.div
                className="h-full bg-[--roam-orange] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="max-h-[500px] overflow-y-auto space-y-0 pr-1">
          {allMilestones.map((milestone, index) => {
            const config = categoryConfig[milestone.category] || categoryConfig.expansion;
            const Icon = config.icon;
            const isCompleted = milestone.status === 'completed';
            const isInProgress = milestone.status === 'in_progress';

            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="flex gap-3"
              >
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                    isCompleted
                      ? 'border-[--roam-orange] bg-[--roam-orange-light] dark:bg-[--roam-orange]/10'
                      : isInProgress
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                        : 'border-zinc-300 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-3.5 h-3.5 text-[--roam-orange]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isInProgress ? (
                      <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                    ) : (
                      <Icon className="w-3.5 h-3.5 text-zinc-450 dark:text-zinc-500" />
                    )}
                  </div>
                  {index < allMilestones.length - 1 && (
                    <div className={`w-0.5 flex-1 min-h-[16px] ${isCompleted ? 'bg-[--roam-orange]/40' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                  )}
                </div>

                {/* Content */}
                <div className="pb-4 -mt-0.5 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold text-[--roam-gray-dark] dark:text-zinc-200 ${!isCompleted && !isInProgress ? 'opacity-70' : ''}`}>
                      {milestone.title}
                    </p>
                    <Badge
                      className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full border-none flex-shrink-0 ${config.colorClass}`}
                    >
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-[--roam-gray-mid] mt-0.5 line-clamp-2">
                    {milestone.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(milestone.date).toLocaleDateString('en-KE', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
