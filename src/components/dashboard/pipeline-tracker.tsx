'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  FileCheck,
  Building,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PipelineSite {
  id: string;
  siteId: string;
  landmark: string;
  neighborhood: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  estimatedPoints: number;
  electricityAccess: string;
  landlordType: string;
  bikeTraffic: string;
  securityLevel: string;
  priorityScore: number;
  priorityBucket: string;
  status: string;
  partnerName: string | null;
  partnerPhone: string | null;
  partnerEmail: string | null;
  mountType: string | null;
  deploymentPhase: string | null;
  deploymentCost: number | null;
  monthlyRent: number | null;
  comment: string;
  checklist: {
    agreement: string;
    consent: string;
    titleDeed: string;
    rentAgreed: string;
  };
  matchedStation: {
    id: string;
    chargerId: string;
    name: string;
    status: string;
    type: string;
  } | null;
}

export function PipelineTracker() {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [checklistFilter, setChecklistFilter] = useState('all');

  const { data: pipeline, isLoading } = useQuery<PipelineSite[]>({
    queryKey: ['pipeline-tracker'],
    queryFn: () =>
      fetch('/api/pipeline').then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-zinc-200" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg bg-zinc-200" />
        <Skeleton className="h-[400px] w-full rounded-2xl bg-zinc-200" />
      </div>
    );
  }

  const list = pipeline || [];

  // Filter list
  const filteredList = list.filter((site) => {
    const matchesSearch =
      site.landmark.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (site.partnerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.siteId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority =
      priorityFilter === 'all' ||
      site.priorityBucket.toLowerCase().includes(priorityFilter.toLowerCase());

    const matchesChecklist =
      checklistFilter === 'all' ||
      (checklistFilter === 'agreement' && site.checklist.agreement === 'Signed') ||
      (checklistFilter === 'consent' && site.checklist.consent === 'Signed') ||
      (checklistFilter === 'rent' && site.checklist.rentAgreed === 'Signed') ||
      (checklistFilter === 'complete' &&
        site.checklist.agreement === 'Signed' &&
        site.checklist.consent === 'Signed' &&
        site.checklist.titleDeed === 'Signed' &&
        site.checklist.rentAgreed === 'Signed');

    return matchesSearch && matchesPriority && matchesChecklist;
  });

  // KPI Calculations
  const totalLeads = list.length;
  const approvedLeads = list.filter(s => s.status.toLowerCase() === 'approved').length;
  const agreementsSigned = list.filter(s => s.checklist.agreement === 'Signed').length;
  const deployedInField = list.filter(s => s.matchedStation).length;

  const getPriorityBadgeColor = (bucket: string) => {
    const b = bucket.toLowerCase();
    if (b.includes('strategic') || b.includes('p0')) return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    if (b.includes('high') || b.includes('p1')) return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    return 'bg-zinc-500/10 text-zinc-650 border-zinc-500/20';
  };

  const renderChecklistCell = (status: string) => {
    if (status === 'Signed' || status === 'Yes') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
          <Check className="h-4.5 w-4.5 stroke-[3]" />
          <span>Signed</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-450">
        <Clock className="h-4 w-4" />
        <span>Pending</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-zinc-100 text-zinc-500">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xl font-black font-display text-zinc-900 leading-tight">
              {totalLeads}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5">
              Acquisition Leads
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-[--roam-orange]/10 text-[--roam-orange] border border-[--roam-orange]/10">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xl font-black font-display text-zinc-900 leading-tight">
              {approvedLeads}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5">
              Approved Sites
            </p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/10">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xl font-black font-display text-zinc-900 leading-tight">
              {agreementsSigned}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5">
              Agreements Signed
            </p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-zinc-150 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/10">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xl font-black font-display text-zinc-900 leading-tight">
              {deployedInField}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5">
              Active in Field
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white border border-zinc-150 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search landmark, neighborhood, site ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 border-zinc-200 rounded-xl"
          />
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <SlidersHorizontal className="h-4 w-4 text-zinc-400 hidden md:block" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 text-xs px-3 border border-zinc-200 rounded-xl bg-white text-zinc-800 font-bold uppercase tracking-wider w-full md:w-auto cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="strategic">Strategic (P0)</option>
            <option value="high">High (P1)</option>
            <option value="medium">Medium (P2)</option>
          </select>
        </div>

        {/* Checklist Filter */}
        <div className="w-full md:w-auto">
          <select
            value={checklistFilter}
            onChange={(e) => setChecklistFilter(e.target.value)}
            className="h-10 text-xs px-3 border border-zinc-200 rounded-xl bg-white text-zinc-800 font-bold uppercase tracking-wider w-full md:w-auto cursor-pointer"
          >
            <option value="all">All Checklists</option>
            <option value="agreement">Agreement Signed</option>
            <option value="consent">Consent Signed</option>
            <option value="rent">Rent Agreed</option>
            <option value="complete">Checklist Complete</option>
          </select>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="bg-white border border-zinc-150 rounded-2xl overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-150 bg-zinc-50/50 text-[10px] font-black uppercase tracking-wider text-zinc-450">
                <th className="py-4 px-5">Site Details</th>
                <th className="py-4 px-5">Priority</th>
                <th className="py-4 px-5 text-center">Agreement</th>
                <th className="py-4 px-5 text-center">Consent</th>
                <th className="py-4 px-5 text-center">Title Deed</th>
                <th className="py-4 px-5 text-center">Rent Agreed</th>
                <th className="py-4 px-5 text-center">Live Deployment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 text-sm">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-semibold">
                    No pipeline sites found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredList.map((site) => (
                  <tr
                    key={site.id}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    {/* Site Details */}
                    <td className="py-4.5 px-5 max-w-[280px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[--roam-black] leading-tight">
                            {site.landmark}
                          </span>
                          {site.status.toLowerCase() === 'approved' && (
                            <Badge className="bg-[--roam-orange] text-white hover:bg-[--roam-orange] text-[8px] font-extrabold scale-90 rounded-full py-0 px-1.5 border-none h-4 uppercase">
                              Approved
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-450 font-medium">
                          <span>{site.siteId}</span>
                          <span>&middot;</span>
                          <span>{site.neighborhood}, {site.city}</span>
                        </div>
                        {site.partnerName && (
                          <div className="text-[11px] text-zinc-400 mt-1 font-semibold flex flex-wrap gap-x-2">
                            <span>Host: {site.partnerName}</span>
                            {site.partnerPhone && <span>({site.partnerPhone})</span>}
                          </div>
                        )}
                        {site.comment && site.comment !== site.landmark && (
                          <p className="text-[11px] text-zinc-450 italic mt-1.5 leading-relaxed truncate max-w-[260px]" title={site.comment}>
                            "{site.comment}"
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-4.5 px-5">
                      <div className="space-y-1">
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-extrabold uppercase py-0.5 px-2 rounded-full border ${getPriorityBadgeColor(
                            site.priorityBucket
                          )}`}
                        >
                          {site.priorityBucket.replace(' - ', ' ')}
                        </Badge>
                        <span className="block text-[10px] text-zinc-400 font-bold ml-1">
                          Score: {site.priorityScore}
                        </span>
                      </div>
                    </td>

                    {/* Agreement */}
                    <td className="py-4.5 px-5 text-center">
                      {renderChecklistCell(site.checklist.agreement)}
                    </td>

                    {/* Consent */}
                    <td className="py-4.5 px-5 text-center">
                      {renderChecklistCell(site.checklist.consent)}
                    </td>

                    {/* Title Deed */}
                    <td className="py-4.5 px-5 text-center">
                      {renderChecklistCell(site.checklist.titleDeed)}
                    </td>

                    {/* Rent Agreed */}
                    <td className="py-4.5 px-5 text-center">
                      {renderChecklistCell(site.checklist.rentAgreed)}
                    </td>

                    {/* Live Deployment */}
                    <td className="py-4.5 px-5 text-center">
                      {site.matchedStation ? (
                        <div className="inline-flex flex-col items-center gap-1.5">
                          <div className="flex items-center gap-1 bg-zinc-100 border border-zinc-200 rounded-lg px-2 py-0.5">
                            <span className="text-[10px] font-extrabold text-zinc-700">
                              {site.matchedStation.chargerId}
                            </span>
                          </div>
                          <Badge
                            className={`text-[9px] font-black uppercase rounded-full border px-1.5 py-0 border-none leading-none ${
                              site.matchedStation.status === 'operational'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : site.matchedStation.status === 'construction'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-rose-500/10 text-rose-600'
                            }`}
                          >
                            {site.matchedStation.status}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 font-bold">Planned</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
