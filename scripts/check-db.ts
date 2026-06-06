import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hubs = await prisma.chargingStation.findMany({
    where: { type: 'hub' },
    select: {
      chargerId: true,
      name: true,
      status: true,
      chargerCount: true,
      totalKw: true,
      address: true,
    }
  });

  console.log(`--- HUBS IN DATABASE (${hubs.length} total) ---`);
  hubs.forEach(h => {
    console.log(`[${h.status}] ${h.chargerId} - ${h.name} (${h.chargerCount} chg, ${h.totalKw} kW) - ${h.address}`);
  });

  const points = await prisma.chargingStation.findMany({
    where: { type: 'point' },
    select: {
      chargerId: true,
      name: true,
      status: true,
    }
  });
  console.log(`\n--- POINTS IN DATABASE (${points.length} total) ---`);
  points.forEach(p => {
    console.log(`[${p.status}] ${p.chargerId} - ${p.name}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
