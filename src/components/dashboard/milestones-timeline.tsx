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

const categoryConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  hub: { icon: BatteryCharging, color: 'text-amber-600 bg-amber-50', label: 'Roam Hub' },
  point: { icon: Zap, color: 'text-orange-600 bg-orange-50', label: 'Roam Point' },
  expansion: { icon: Globe, color: 'text-cyan-600 bg-cyan-50', label: 'Expansion' },
  partnership: { icon: Handshake, color: 'text-violet-600 bg-violet-50', label: 'Partnership' },
  funding: { icon: Banknote, color: 'text-emerald-600 bg-emerald-50', label: 'Funding' },
  product: { icon: Package, color: 'text-rose-600 bg-rose-50', label: 'Product' },
};

export function MilestonesTimeline() {
  const { data: milestones, isLoading } = useQuery<Milestone[]>({
    queryKey: ['milestones'],
    queryFn: () => fetch('/api/milestones').then((r) => { if (!r.ok) throw new Error('Failed to fetch milestones'); return r.json(); }),
  });

  const grouped = useMemo(() => {
    if (!milestones || !Array.isArray(milestones)) return { completed: [], in_progress: [], upcoming: [] };
    return {
      completed: milestones.filter((m) => m.status === 'completed'),
      in_progress: milestones.filter((m) => m.status === 'in_progress'),
      upcoming: milestones.filter((m) => m.status === 'upcoming'),
    };
  }, [milestones]);

  const progress = useMemo(() => {
    if (!milestones || !Array.isArray(milestones) || milestones.length === 0) return 0;
    const completed = milestones.filter((m) => m.status === 'completed').length;
    return Math.round((completed / milestones.length) * 100);
  }, [milestones]);

  const allMilestones = useMemo(() => {
    if (!milestones || !Array.isArray(milestones)) return [];
    return [...milestones].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [milestones]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MilestoneIcon className="h-4 w-4" /> Infrastructure Milestones
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{progress}% complete</span>
            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[500px] overflow-y-auto space-y-0">
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
                      ? 'border-emerald-500 bg-emerald-50'
                      : isInProgress
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-300 bg-slate-50'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isInProgress ? (
                      <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  {index < allMilestones.length - 1 && (
                    <div className={`w-0.5 flex-1 min-h-[16px] ${isCompleted ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                  )}
                </div>

                {/* Content */}
                <div className="pb-4 -mt-0.5 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!isCompleted && !isInProgress ? 'text-muted-foreground' : ''}`}>
                      {milestone.title}
                    </p>
                    <Badge
                      variant={isCompleted ? 'default' : isInProgress ? 'secondary' : 'outline'}
                      className={`text-[10px] flex-shrink-0 ${config.color} border-0`}
                    >
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {milestone.description}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
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
