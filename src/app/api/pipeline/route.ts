import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const pipelineSites = await db.pipelineSite.findMany({
      orderBy: { priorityScore: 'desc' }
    });

    const activeStations = await db.chargingStation.findMany({
      where: {
        status: { in: ['operational', 'construction', 'blocked'] }
      }
    });

    // Match each pipeline site to an active field station
    const results = pipelineSites.map(site => {
      // Parse checklist
      let checklist = {
        agreement: 'Pending',
        consent: 'Pending',
        titleDeed: 'Pending',
        rentAgreed: 'Pending'
      };
      let comment = '';

      if (site.agentComment) {
        try {
          const parsed = JSON.parse(site.agentComment);
          if (parsed && typeof parsed === 'object') {
            checklist = parsed.checklist || checklist;
            comment = parsed.comment || '';
          } else {
            comment = site.agentComment;
          }
        } catch {
          comment = site.agentComment;
        }
      }

      // Try to find matching active station
      const match = findActiveStationMatch(site, activeStations);

      return {
        id: site.id,
        siteId: site.siteId,
        landmark: site.landmark,
        neighborhood: site.neighborhood,
        city: site.city,
        latitude: site.latitude,
        longitude: site.longitude,
        estimatedPoints: site.estimatedPoints,
        electricityAccess: site.electricityAccess,
        landlordType: site.landlordType,
        bikeTraffic: site.bikeTraffic,
        securityLevel: site.securityLevel,
        priorityScore: site.priorityScore,
        priorityBucket: site.priorityBucket,
        status: site.status,
        agentName: site.agentName,
        agentType: site.agentType,
        partnerName: site.partnerName,
        partnerPhone: site.partnerPhone,
        partnerEmail: site.partnerEmail,
        mountType: site.mountType,
        deploymentPhase: site.deploymentPhase,
        deploymentCost: site.deploymentCost,
        monthlyRent: site.monthlyRent,
        comment: comment || site.landmark,
        checklist,
        matchedStation: match ? {
          id: match.id,
          chargerId: match.chargerId,
          name: match.name,
          status: match.status,
          type: match.type
        } : null
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Pipeline API error:', error);
    return NextResponse.json({ error: 'Failed to fetch pipeline', details: String(error) }, { status: 500 });
  }
}

function findActiveStationMatch(site: any, stations: any[]) {
  const normalizePhone = (p: string | null | undefined): string | null => {
    if (!p) return null;
    const digits = p.replace(/\D/g, '');
    return digits.length >= 9 ? digits.slice(-9) : digits;
  };

  const sitePhoneNorm = normalizePhone(site.partnerPhone);

  return stations.find(s => {
    // 1. Phone match
    if (sitePhoneNorm && s.managerPhone) {
      const stationPhoneNorm = normalizePhone(s.managerPhone);
      if (stationPhoneNorm === sitePhoneNorm) return true;
    }

    // 2. Dynamics code / ID match
    if (s.dynamicsCode && s.dynamicsCode.includes(site.siteId)) return true;
    if (s.chargerId && s.chargerId.includes(site.siteId)) return true;

    // 3. Proximity match (within 250m)
    if (site.latitude && site.longitude && s.latitude && s.longitude) {
      const latDiff = Math.abs(site.latitude - s.latitude);
      const lngDiff = Math.abs(site.longitude - s.longitude);
      if (latDiff < 0.002 && lngDiff < 0.002) return true;
    }

    // 4. Name match
    if (s.name && site.landmark && (
      s.name.toLowerCase().includes(site.landmark.toLowerCase()) ||
      site.landmark.toLowerCase().includes(s.name.toLowerCase())
    )) {
      return true;
    }

    return false;
  });
}
