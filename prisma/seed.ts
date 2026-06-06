import { db } from '@/lib/db';

async function seed() {
  console.log('🌱 Seeding database with REAL Roam Electric field data...\n');

  // Clear existing data
  await db.chargingSession.deleteMany();
  await db.activityLog.deleteMany();
  await db.pipelineSite.deleteMany();
  await db.chargingStation.deleteMany();
  await db.milestone.deleteMany();

  // ─── ROAM HUBS (from Locations Database RH-KE sheet) ─────────
  const hubs = [
    // ── Operational Hubs ──
    {
      chargerId: '#RH-KE-A-01', name: 'Roam Hub - Outering', type: 'hub', status: 'operational',
      address: 'Outering, Nairobi', neighborhood: 'Outering',
      latitude: -1.26955, longitude: 36.88024,
      chargerCount: 34, totalKw: 40.068,
      partner: 'TotalEnergies', siteManager: 'Hardley Sultan', managerPhone: '+254723655007',
      services: JSON.stringify(['charging', 'rental']),
      operatingHours: '7AM - 7PM', launchDate: new Date('2025-01-16'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-01',
      notes: 'Container-based hub at TotalEnergies Outering. 34 chargers, 40kW total capacity.',
    },
    {
      chargerId: '#RH-KE-A-02', name: 'Roam Hub - Waiyaki Way', type: 'hub', status: 'operational',
      address: 'Waiyaki Way, Nairobi', neighborhood: 'Waiyaki Way',
      latitude: -1.25861, longitude: 36.781386,
      chargerCount: 36, totalKw: 36.036,
      partner: 'TotalEnergies', siteManager: 'Edwin Kimani', managerPhone: '+254727204078',
      services: JSON.stringify(['charging', 'rental']),
      operatingHours: '7AM - 7PM', launchDate: new Date('2023-01-05'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-02',
      notes: 'TotalEnergies partnership. Battery charging and rental services.',
    },
    {
      chargerId: '#RH-KE-A-03', name: 'Roam Hub - Kayole', type: 'hub', status: 'operational',
      address: 'Kayole, Nairobi', neighborhood: 'Kayole',
      latitude: -1.28173, longitude: 36.9052,
      chargerCount: 37, totalKw: 42.84,
      partner: 'Sahara Energy', siteManager: 'Anthony Mugash', managerPhone: '+254721461560',
      services: JSON.stringify(['charging', 'rental', 'after_sales']),
      operatingHours: '7AM - 7PM', launchDate: new Date('2024-01-05'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-03',
      notes: 'Sahara Energy partner. Largest hub with after-sales service.',
    },
    {
      chargerId: '#RH-KE-A-04', name: 'Roam Hub - Lusaka Road', type: 'hub', status: 'operational',
      address: 'Lusaka Road, Industrial Area, Nairobi', neighborhood: 'Industrial Area',
      latitude: -1.301257, longitude: 36.833013,
      chargerCount: 38, totalKw: 38.388,
      partner: 'TotalEnergies', siteManager: 'Moses Masibayi', managerPhone: '+254724051752',
      services: JSON.stringify(['charging', 'rental']),
      operatingHours: '7AM - 7PM', launchDate: new Date('2023-01-03'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-04',
      notes: 'Industrial Area location. High boda boda traffic.',
    },
    {
      chargerId: '#RH-KE-A-05', name: 'Roam Hub - Roysambu', type: 'hub', status: 'operational',
      address: 'Roysambu, Nairobi', neighborhood: 'Roysambu',
      latitude: -1.21521, longitude: 36.89175,
      chargerCount: 42, totalKw: 47.88,
      partner: 'Quickmart', siteManager: 'George Chege', managerPhone: '+254700838383',
      services: JSON.stringify(['charging', 'rental']),
      operatingHours: '7AM - 7PM', launchDate: new Date('2023-01-12'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-05',
      notes: 'Quickmart partnership. High charger count at 42 units.',
    },
    {
      chargerId: '#RH-KE-A-06', name: 'Roam Hub - Sabaki', type: 'hub', status: 'operational',
      address: 'Sabaki, Nairobi', neighborhood: 'Sabaki',
      latitude: -1.41952, longitude: 36.95438,
      chargerCount: 24, totalKw: 27.72,
      partner: 'TotalEnergies',
      services: JSON.stringify(['charging', 'rental']),
      launchDate: new Date('2024-10-08'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-06',
      notes: 'TotalEnergies Sabaki. Outer Nairobi location.',
    },
    {
      chargerId: '#RH-KE-A-07', name: 'Roam Hub - Forest Road', type: 'hub', status: 'operational',
      address: 'Forest Road, Nairobi', neighborhood: 'Forest Road',
      latitude: -1.26773, longitude: 36.83114,
      chargerCount: 30, totalKw: 31.668,
      partner: 'Shell', siteManager: 'Palawaan Bhadrika', managerPhone: '+254722528051',
      services: JSON.stringify(['charging', 'rental']),
      launchDate: new Date('2024-01-09'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-07',
      notes: 'Shell Forest Road partnership.',
    },
    {
      chargerId: '#RH-KE-A-08', name: 'Roam Hub - Karambee', type: 'hub', status: 'operational',
      address: 'Karambee, Nairobi', neighborhood: 'Karambee',
      latitude: -1.26673, longitude: 36.84522,
      chargerCount: 31, totalKw: 37.38,
      partner: 'TotalEnergies', managerPhone: '+254117473213',
      services: JSON.stringify(['charging', 'rental']),
      launchDate: new Date('2025-03-01'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-08',
      notes: 'TotalEnergies Karambee.',
    },
    {
      chargerId: '#RH-KE-A-10', name: 'Roam Hub - Machakos Town', type: 'hub', status: 'operational',
      address: 'Machakos Town, Machakos', neighborhood: 'Machakos',
      latitude: -1.51997, longitude: 37.26909,
      chargerCount: 16, totalKw: 21,
      partner: 'Stanchard',
      services: JSON.stringify(['charging', 'rental']),
      launchDate: new Date('2024-06-01'),
      dynamicsCode: 'FO-NBI-03#RH-KE-A-10',
      notes: 'Stanchard partner hub in Machakos Town. Area 3. 16 chargers at 21kW total.',
    },
    {
      chargerId: '#RH-KE-A-11', name: "Roam Hub - Ojijo", type: 'hub', status: 'operational',
      address: 'Ojijo, Nairobi', neighborhood: 'Ojijo',
      latitude: -1.2671, longitude: 36.81175,
      chargerCount: 30, totalKw: 31.92,
      partner: 'Rubis',
      services: JSON.stringify(['charging', 'rental']),
      launchDate: new Date('2025-11-15'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-11',
      notes: 'Rubis petrol station partnership.',
    },
    {
      chargerId: '#RH-KE-A-16', name: 'Roam Hub - Roam Park', type: 'hub', status: 'operational',
      address: 'Roam Park, National Park East Gate, Nairobi', neighborhood: 'Nairobi National Park',
      latitude: -1.33688, longitude: 36.8646,
      chargerCount: 18, totalKw: 37.8,
      partner: 'Roam',
      services: JSON.stringify(['rental']),
      launchDate: new Date('2025-02-17'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-16',
      notes: 'Roam-owned facility at Roam Park. Rental only.',
    },
    {
      chargerId: '#RH-KE-A-17', name: 'Roam Hub - Suguta', type: 'hub', status: 'operational',
      address: 'Suguta, Nairobi', neighborhood: 'Suguta',
      latitude: -1.28777, longitude: 36.77884,
      chargerCount: 60, totalKw: 53.508,
      partner: 'Roam', siteManager: 'Nasri Sahal', managerPhone: '+254724148162',
      services: JSON.stringify(['charging', 'rental']),
      operatingHours: '7AM - 7PM', launchDate: new Date('2024-11-28'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-17',
      notes: 'Largest Roam Hub with 60 chargers! Shop-based, no container.',
    },
    {
      chargerId: '#RH-KE-A-19', name: 'Roam Hub - Thika Centre', type: 'hub', status: 'planned',
      address: 'Thika Centre, Thika', neighborhood: 'Thika',
      latitude: -1.03381, longitude: 37.07543,
      chargerCount: 15, totalKw: 12.6,
      partner: 'Roam',
      services: JSON.stringify(['charging', 'rental', 'after_sales']),
      launchDate: new Date('2024-08-11'),
      dynamicsCode: 'FO-NBI-02#RH-KE-A-19',
      notes: 'First hub outside Nairobi. Thika Centre location with after-sales.',
    },
    {
      chargerId: '#RH-KE-A-20', name: 'Roam Hub - Machakos Centre', type: 'hub', status: 'planned',
      address: 'Machakos Centre, Machakos', neighborhood: 'Machakos',
      latitude: -1.52782, longitude: 37.20929,
      chargerCount: 10, totalKw: 8.4,
      partner: 'TotalEnergies', managerPhone: '+254116879836',
      services: JSON.stringify(['charging', 'rental', 'after_sales']),
      launchDate: new Date('2025-04-30'),
      dynamicsCode: 'FO-NBI-03#RH-KE-A-20',
      notes: 'TotalEnergies Machakos. First Machakos hub.',
    },
    {
      chargerId: '#RH-KE-A-21', name: 'Roam Hub - Nairobi Regional Office', type: 'hub', status: 'planned',
      address: 'Nairobi Regional Office, Industrial Area', neighborhood: 'Industrial Area',
      latitude: -1.30187, longitude: 36.8332,
      chargerCount: 61, totalKw: 51.24,
      partner: 'Roam',
      services: JSON.stringify(['charging', 'rental', 'after_sales']),
      launchDate: new Date('2025-07-15'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-21',
      notes: 'Largest hub at 61 chargers, 51kW. Regional HQ with all services.',
    },
    {
      chargerId: '#RH-KE-A-23', name: "Roam Hub - Adam's Minimall", type: 'hub', status: 'planned',
      address: "Adam's Minimall, Nairobi", neighborhood: 'Industrial Area',
      latitude: -1.30085, longitude: 36.77946,
      chargerCount: 79, totalKw: 77.7,
      partner: "Adam's Minimall",
      services: JSON.stringify(['charging', 'rental', 'after_sales']),
      launchDate: new Date('2025-11-08'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-23',
      notes: 'NEW largest hub at 79 chargers, 77.7kW! Partnership with Adams Minimall.',
    },
    {
      chargerId: '#RH-KE-A-24', name: 'Roam Hub - Langata', type: 'hub', status: 'operational',
      address: 'Langata, Nairobi', neighborhood: 'Langata',
      latitude: -1.34207, longitude: 36.7639,
      chargerCount: 30, totalKw: 25.2,
      partner: 'Roam',
      services: JSON.stringify(['charging', 'rental']),
      launchDate: new Date('2026-04-01'),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-24',
      notes: 'Newest operational hub in Langata.',
    },
    // ── Coming Soon Hubs ──
    {
      chargerId: '#RH-KE-NBI-A-10', name: 'Roam Hub - Regen (Coming Soon)', type: 'hub', status: 'planned',
      address: 'Regen, Nairobi', neighborhood: 'Regen',
      latitude: -1.2548636, longitude: 36.6631395,
      chargerCount: 0, totalKw: 0,
      partner: 'Roam',
      services: JSON.stringify(['charging', 'rental']),
      operatingHours: '24hrs',
      dynamicsCode: 'FO-NBI-01#RH-KE-NBI-A-10',
      notes: 'Coming Soon: Regen location. Planned 24hrs operation.',
    },
    {
      chargerId: '#RH-KE-NBI-A-11', name: 'Roam Hub - Eastleigh (Coming Soon)', type: 'hub', status: 'planned',
      address: 'Eastleigh, Nairobi', neighborhood: 'Eastleigh',
      latitude: -1.268001, longitude: 36.84817,
      chargerCount: 0, totalKw: 0,
      partner: 'Roam',
      services: JSON.stringify(['charging', 'rental']),
      operatingHours: '24hrs',
      dynamicsCode: 'FO-NBI-01#RH-KE-NBI-A-11',
      notes: 'Coming Soon: Eastleigh location. Planned 24hrs operation.',
    },
    {
      chargerId: '#RH-KE-NBI-A-12', name: 'Roam Hub - Adlife (Coming Soon)', type: 'hub', status: 'planned',
      address: 'Adlife, Nairobi', neighborhood: 'Adlife',
      latitude: -1.29483, longitude: 36.78731,
      chargerCount: 0, totalKw: 0,
      partner: 'Roam',
      services: JSON.stringify(['charging', 'rental']),
      operatingHours: '24hrs',
      dynamicsCode: 'FO-NBI-01#RH-KE-NBI-A-12',
      notes: 'Coming Soon: Adlife location. Planned 24hrs operation.',
    },
    // ── Under Construction Hubs ──
    {
      chargerId: '#RH-KE-A-09', name: 'Roam Hub - Oryx Ruai', type: 'hub', status: 'construction',
      address: 'Oryx Ruai, Nairobi', neighborhood: 'Ruai',
      latitude: -1.25481, longitude: 36.98606,
      chargerCount: 0, totalKw: 0,
      partner: 'Oryx',
      services: JSON.stringify(['charging', 'rental']),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-09',
      notes: 'Under construction at Oryx Ruai. Container 2 planned.',
    },
    {
      chargerId: '#RH-KE-A-25', name: 'Roam Hub - Banana', type: 'hub', status: 'construction',
      address: 'Banana, Nairobi', neighborhood: 'Banana',
      latitude: -1.16696, longitude: 36.75373,
      chargerCount: 0, totalKw: 0,
      partner: 'Trinity',
      services: JSON.stringify(['charging', 'rental']),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-25',
      notes: 'Under construction with Trinity partnership.',
    },
    // ── Closed Hub ──
    {
      chargerId: '#RH-KE-A-18', name: 'Roam Hub - GreenWheels HQ', type: 'hub', status: 'closed',
      address: 'Nairobi', neighborhood: 'Nairobi',
      chargerCount: 0, totalKw: 0,
      partner: 'GreenWheels',
      services: JSON.stringify(['charging', 'rental']),
      dynamicsCode: 'FO-NBI-01#RH-KE-A-18',
      notes: 'Former GreenWheels HQ. Now closed.',
    },
  ];

  const createdHubs = await db.chargingStation.createMany({ data: hubs });
  console.log(`✅ Created ${createdHubs.count} Roam Hubs (${hubs.filter(h => h.status === 'operational').length} operational, ${hubs.filter(h => h.status === 'construction').length} under construction, ${hubs.filter(h => h.status === 'planned').length} coming soon, ${hubs.filter(h => h.status === 'closed').length} closed)`);

  // ─── ROAM POINTS (from Locations Database RP-KE sheet - ALL 48) ─────────
  const points = [
    // ── RP-01: Pangani 1 (Blocked) ──
    {
      chargerId: '#RP-KE-A-01', name: 'Roam Point - Pangani 1', type: 'point', status: 'blocked',
      address: 'Pangani, Nairobi', neighborhood: 'Pangani',
      latitude: -1.266212, longitude: 36.835316,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Anita Karambu', siteManager: 'Anita Karambu', managerPhone: '0716899985',
      notes: 'Blocked - awaiting resolution.',
    },
    // ── RP-02: Kariobangi North 1 (Blocked) ──
    {
      chargerId: '#RP-KE-A-02', name: 'Roam Point - Kariobangi North 1', type: 'point', status: 'blocked',
      address: 'Kariobangi North, Nairobi', neighborhood: 'Kariobangi',
      latitude: -1.2564947, longitude: 36.8817722,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Edward Kinyua Kimotho', siteManager: 'Edward Kinyua Kimotho', managerPhone: '0790539015',
      notes: 'Blocked - awaiting resolution.',
    },
    // ── RP-03: Rongai 1 (Construction) ──
    {
      chargerId: '#RP-KE-A-03', name: 'Roam Point - Rongai 1', type: 'point', status: 'construction',
      address: 'Rongai, Kajiado', neighborhood: 'Rongai',
      latitude: -1.3913462, longitude: 36.7705494,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Pheliesia Kasera', siteManager: 'Pheliesia Kasera', managerPhone: '0705797584',
      notes: 'Consent letter and all documents collected. Agreement signed. Phase 1 deployment. Wall Mount. Area 6.',
    },
    // ── RP-04: Kitengela 1 (Blocked) ──
    {
      chargerId: '#RP-KE-A-04', name: 'Roam Point - Kitengela 1', type: 'point', status: 'blocked',
      address: 'Kitengela, Kajiado', neighborhood: 'Kitengela',
      latitude: -1.4862217, longitude: 36.9547761,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Joyce Pere', siteManager: 'Joyce Pere', managerPhone: '0713226840',
      notes: 'Blocked - land documentation issues at I&M Bank location. Area 5.',
    },
    // ── RP-05: Point Mall (Construction) ──
    {
      chargerId: '#RP-KE-A-05', name: 'Roam Point - Point Mall', type: 'point', status: 'construction',
      address: 'The Point Mall, Buruburu', neighborhood: 'Buruburu',
      latitude: -1.2936642, longitude: 36.871029,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Mercy Nduta', siteManager: 'Mercy Nduta', managerPhone: '0708534944',
      notes: '6kW DC Fast Charger Dual Cables - Type 6. Collaboration agreement signed with The Point Mall. Rent: KES 5,000/month + KES 1/kWh revenue share.',
    },
    // ── RP-06: Kawangware 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-06', name: 'Roam Point - Kawangware 1', type: 'point', status: 'archived',
      address: 'Kawangware, Nairobi', neighborhood: 'Kawangware',
      latitude: -1.2944176, longitude: 36.7227883,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'John Njoki', siteManager: 'John Njoki', managerPhone: '0727990176',
      notes: 'Archived - Le Pic School site at Kawangware.',
    },
    // ── RP-07: Ruaka 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-07', name: 'Roam Point - Ruaka 1', type: 'point', status: 'archived',
      address: 'Ruaka, Nairobi', neighborhood: 'Ruaka',
      latitude: -1.207359, longitude: 36.7856069,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Munene Mbuchi', siteManager: 'Munene Mbuchi', managerPhone: '0722531006',
      notes: 'Archived - colonial land title deed issue. KPLC consent letter obtained.',
    },
    // ── RP-08: Kiambu Road 1 (Blocked) ──
    {
      chargerId: '#RP-KE-A-08', name: 'Roam Point - Kiambu Road 1', type: 'point', status: 'blocked',
      address: 'Kiambu Road, Nairobi', neighborhood: 'Kiambu Road',
      latitude: -1.2184234, longitude: 36.8229217,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Peter Macharia', siteManager: 'Peter Macharia', managerPhone: '0722843770',
      notes: 'Blocked - JCL Motors agreement pulled out due to coordination issues.',
    },
    // ── RP-09: Juja 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-09', name: 'Roam Point - Juja 1', type: 'point', status: 'archived',
      address: 'Juja, Kiambu', neighborhood: 'Juja',
      latitude: -1.0932973, longitude: 37.0198771,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Ivy Cheruto', siteManager: 'Ivy Cheruto', managerPhone: '0700071760',
      notes: 'Archived. Area 2.',
    },
    // ── RP-10: Umoja 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-10', name: 'Roam Point - Umoja 1', type: 'point', status: 'archived',
      address: 'Umoja, Nairobi', neighborhood: 'Umoja',
      latitude: -1.2785188, longitude: 36.8879889,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'George Maina Njoroge', siteManager: 'George Maina Njoroge', managerPhone: '0722958498',
      notes: 'Archived.',
    },
    // ── RP-11: Marurui 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-11', name: 'Roam Point - Marurui 1', type: 'point', status: 'archived',
      address: 'Marurui, Nairobi', neighborhood: 'Marurui',
      latitude: -1.2073934, longitude: 36.8726554,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Kevin Kaburu', siteManager: 'Kevin Kaburu', managerPhone: '0799838826',
      notes: 'Archived.',
    },
    // ── RP-12: TRM Drive 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-12', name: 'Roam Point - TRM Drive 1', type: 'point', status: 'archived',
      address: 'Thika Road Mall, Nairobi', neighborhood: 'Thika Road',
      latitude: -1.2188724, longitude: 36.8848064,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Kevin Njeru', siteManager: 'Kevin Njeru', managerPhone: '0717615283',
      notes: 'Archived - behind TRM with high Roam Electric motorcycle traffic.',
    },
    // ── RP-13: Ngara 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-13', name: 'Roam Point - Ngara 1', type: 'point', status: 'archived',
      address: 'Ngara, Nairobi', neighborhood: 'Ngara',
      latitude: -1.2736004, longitude: 36.8319322,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Andrew Murimi', siteManager: 'Andrew Murimi', managerPhone: '0722341329',
      notes: 'Archived - IRAN Hospital location. Title deed issue.',
    },
    // ── RP-14: Mirema Drive 1 (Blocked) ──
    {
      chargerId: '#RP-KE-A-14', name: 'Roam Point - Mirema Drive 1', type: 'point', status: 'blocked',
      address: 'Mirema Drive, Nairobi', neighborhood: 'Mirema',
      latitude: -1.211768, longitude: 36.889741,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Stanley Mbugua', siteManager: 'Stanley Mbugua', managerPhone: '0702115108',
      notes: 'Blocked.',
    },
    // ── RP-15: Alcapone Lounge (Blocked) ──
    {
      chargerId: '#RP-KE-A-15', name: 'Roam Point - Alcapone Lounge', type: 'point', status: 'blocked',
      address: 'Mirema, Nairobi', neighborhood: 'Mirema',
      latitude: -1.231141, longitude: 36.876106,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Stanley Mbugua', siteManager: 'Stanley Mbugua', managerPhone: '0702115108',
      notes: 'Blocked.',
    },
    // ── RP-16: Astrol Garden City 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-16', name: 'Roam Point - Astrol Garden City 1', type: 'point', status: 'archived',
      address: 'Garden City, Thika Road, Nairobi', neighborhood: 'Thika Road',
      latitude: -1.229331, longitude: 36.878955,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Andrew Kamanu', siteManager: 'Andrew Kamanu', managerPhone: '0723944326',
      notes: 'Archived - Astrol Garden City location.',
    },
    // ── RP-17: Kariobangi Roundabout 1 (Blocked) ──
    {
      chargerId: '#RP-KE-A-17', name: 'Roam Point - Kariobangi Roundabout 1', type: 'point', status: 'blocked',
      address: 'Kariobangi Roundabout, Nairobi', neighborhood: 'Kariobangi',
      latitude: -1.261975, longitude: 36.877616,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Joyce Wanjiku', siteManager: 'Joyce Wanjiku', managerPhone: '0729762478',
      notes: 'Blocked.',
    },
    // ── RP-18: Kawangware 2 (Archived) ──
    {
      chargerId: '#RP-KE-A-18', name: 'Roam Point - Kawangware 2', type: 'point', status: 'archived',
      address: 'Kawangware, Nairobi', neighborhood: 'Kawangware',
      latitude: -1.2816677, longitude: 36.7414258,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Hans Haerdlte', siteManager: 'Hans Haerdlte', managerPhone: '0113166817',
      notes: 'Archived.',
    },
    // ── RP-19: Kitengela 2 (Archived) ──
    {
      chargerId: '#RP-KE-A-19', name: 'Roam Point - Kitengela 2', type: 'point', status: 'archived',
      address: 'Kitengela, Kajiado', neighborhood: 'Kitengela',
      latitude: -1.4771311, longitude: 36.949506,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Albert Chacha', siteManager: 'Albert Chacha', managerPhone: '0722759516',
      notes: 'Archived. Area 5.',
    },
    // ── RP-20: Ngara West 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-20', name: 'Roam Point - Ngara West 1', type: 'point', status: 'archived',
      address: 'Ngara West, Nairobi', neighborhood: 'Ngara',
      latitude: -1.2711089, longitude: 36.82049,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Joseph Mburu', siteManager: 'Joseph Mburu', managerPhone: '0705388019',
      notes: 'Archived.',
    },
    // ── RP-21: Ruiru Bypass 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-21', name: 'Roam Point - Ruiru Bypass 1', type: 'point', status: 'archived',
      address: 'Ruiru Bypass, Nairobi', neighborhood: 'Ruiru',
      latitude: -1.1544773, longitude: 36.9372528,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'ATLAS; Harrison Wachenje', siteManager: 'Harrison Wachenje', managerPhone: '0721715326',
      notes: 'Archived. ATLAS partner. Area 2.',
    },
    // ── RP-22: Utawala 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-22', name: 'Roam Point - Utawala 1', type: 'point', status: 'archived',
      address: 'Utawala, Nairobi', neighborhood: 'Utawala',
      latitude: -1.275188, longitude: 36.9717323,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'ATLAS; Harrison Wachenje', siteManager: 'Harrison Wachenje', managerPhone: '0721715327',
      notes: 'Archived. ATLAS partner.',
    },
    // ── RP-23: Mihango 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-23', name: 'Roam Point - Mihango 1', type: 'point', status: 'archived',
      address: 'Mihango, Nairobi', neighborhood: 'Mihango',
      latitude: -1.2775993, longitude: 36.949089,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'ATLAS; Harrison Wachenje', siteManager: 'Harrison Wachenje', managerPhone: '0721715328',
      notes: 'Archived. ATLAS partner.',
    },
    // ── RP-24: Ruiru 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-24', name: 'Roam Point - Ruiru 1', type: 'point', status: 'archived',
      address: 'Ruiru, Nairobi', neighborhood: 'Ruiru',
      latitude: -1.146381, longitude: 36.956178,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Be Energy; Grace', siteManager: 'Grace', managerPhone: '0722702811',
      notes: 'Archived. Be Energy partner. Area 2.',
    },
    // ── RP-25: Kiambu 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-25', name: 'Roam Point - Kiambu 1', type: 'point', status: 'archived',
      address: 'Kiambu, Nairobi', neighborhood: 'Kiambu',
      latitude: -1.1670501, longitude: 36.8204359,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Be Energy; Jespher', siteManager: 'Jespher', managerPhone: '0792887023',
      notes: 'Archived. Be Energy partner.',
    },
    // ── RP-26: Utawala 2 (Archived) ──
    {
      chargerId: '#RP-KE-A-26', name: 'Roam Point - Utawala 2', type: 'point', status: 'archived',
      address: 'Utawala, Nairobi', neighborhood: 'Utawala',
      latitude: -1.2750468, longitude: 36.9698007,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Be Energy; Antony', siteManager: 'Antony', managerPhone: '0714657138',
      notes: 'Archived. Be Energy partner.',
    },
    // ── RP-27: Kayole Junction 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-27', name: 'Roam Point - Kayole Junction 1', type: 'point', status: 'archived',
      address: 'Kayole Junction, Nairobi', neighborhood: 'Kayole',
      latitude: -1.257151, longitude: 36.917729,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Be Energy; Tabitha', siteManager: 'Tabitha', managerPhone: '0723332165',
      notes: 'Archived. Be Energy partner.',
    },
    // ── RP-28: Ngong Racecourse 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-28', name: 'Roam Point - Ngong Racecourse 1', type: 'point', status: 'archived',
      address: 'Ngong Racecourse, Nairobi', neighborhood: 'Ngong',
      latitude: -1.3067629, longitude: 36.7335908,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Be Energy; Philips', siteManager: 'Philips', managerPhone: '0721561395',
      notes: 'Archived. Be Energy partner. Area 4.',
    },
    // ── RP-29: Gitaru 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-29', name: 'Roam Point - Gitaru 1', type: 'point', status: 'archived',
      address: 'Gitaru, Nairobi', neighborhood: 'Gitaru',
      latitude: -1.2295536, longitude: 36.6784509,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Be Energy; Teddy', siteManager: 'Teddy', managerPhone: '0798281041',
      notes: 'Archived. Be Energy partner.',
    },
    // ── RP-30: Thome 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-30', name: 'Roam Point - Thome 1', type: 'point', status: 'archived',
      address: 'Thome, Nairobi', neighborhood: 'Thome',
      latitude: -1.2052805, longitude: 36.8601241,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Trinity Energy; Mohammedin', siteManager: 'Mohammedin', managerPhone: '0700106393',
      notes: 'Archived. Trinity Energy partner.',
    },
    // ── RP-31: Dagoretti 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-31', name: 'Roam Point - Dagoretti 1', type: 'point', status: 'archived',
      address: 'Dagoretti, Nairobi', neighborhood: 'Dagoretti',
      latitude: -1.2786853, longitude: 36.5486813,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Trinity Energy; Mohammedin', siteManager: 'Mohammedin', managerPhone: '0700106394',
      notes: 'Archived. Trinity Energy partner.',
    },
    // ── RP-32: Buruburu 1 (Archived) - No coordinates ──
    {
      chargerId: '#RP-KE-A-32', name: 'Roam Point - Buruburu 1', type: 'point', status: 'archived',
      address: 'Buruburu, Nairobi', neighborhood: 'Buruburu',
      latitude: null, longitude: null,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Kelvin Kinani', siteManager: 'Kelvin Kinani',
      notes: 'Archived. No coordinates available.',
    },
    // ── RP-33: Rimpa 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-33', name: 'Roam Point - Rimpa 1', type: 'point', status: 'archived',
      address: 'Rimpa, Kajiado', neighborhood: 'Rimpa',
      latitude: -1.4214276, longitude: 36.69642,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Trinity Energy; Mohammedin', siteManager: 'Mohammedin', managerPhone: '0700106396',
      notes: 'Archived. Trinity Energy partner. Area 5.',
    },
    // ── RP-34: Kiserian 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-34', name: 'Roam Point - Kiserian 1', type: 'point', status: 'archived',
      address: 'Kiserian, Kajiado', neighborhood: 'Kiserian',
      latitude: -1.424615, longitude: 36.6811616,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Trinity Energy; Mohammedin', siteManager: 'Mohammedin', managerPhone: '0700106397',
      notes: 'Archived. Trinity Energy partner. Area 5.',
    },
    // ── RP-35: Ruiru 2 (Archived) ──
    {
      chargerId: '#RP-KE-A-35', name: 'Roam Point - Ruiru 2', type: 'point', status: 'archived',
      address: 'Ruiru, Nairobi', neighborhood: 'Ruiru',
      latitude: -1.1497653, longitude: 36.9635278,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Stephen Muchai', siteManager: 'Stephen Muchai', managerPhone: '0791621171',
      notes: 'Archived. Area 2.',
    },
    // ── RP-36: Makadara 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-36', name: 'Roam Point - Makadara 1', type: 'point', status: 'archived',
      address: 'Makadara Railway Station, Nairobi', neighborhood: 'Makadara',
      latitude: -1.2980571, longitude: 36.8688626,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Makadara Railway Station', siteManager: 'Makadara Railway Station',
      notes: 'Archived. Makadara Railway Station location.',
    },
    // ── RP-37: Huruma 1 (Archived) - No coordinates ──
    {
      chargerId: '#RP-KE-A-37', name: 'Roam Point - Huruma 1', type: 'point', status: 'archived',
      address: 'Huruma, Nairobi', neighborhood: 'Huruma',
      latitude: null, longitude: null,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Rosemary Kamau', siteManager: 'Rosemary Kamau', managerPhone: '0722354603',
      notes: 'Archived. No coordinates available.',
    },
    // ── RP-38: Industrial Area 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-38', name: 'Roam Point - Industrial Area 1', type: 'point', status: 'archived',
      address: 'Industrial Area, Nairobi', neighborhood: 'Industrial Area',
      latitude: -1.3078582, longitude: 36.8541481,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Zacharia Ngigi', siteManager: 'Zacharia Ngigi', managerPhone: '0788100111',
      notes: 'Archived.',
    },
    // ── RP-39: Industrial Area 2 (Archived) - No coordinates ──
    {
      chargerId: '#RP-KE-A-39', name: 'Roam Point - Industrial Area 2', type: 'point', status: 'archived',
      address: 'Industrial Area, Nairobi', neighborhood: 'Industrial Area',
      latitude: null, longitude: null,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Brian Mwake', siteManager: 'Brian Mwake', managerPhone: '0729881353',
      notes: 'Archived. No coordinates available.',
    },
    // ── RP-40: Upperhill 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-40', name: 'Roam Point - Upperhill 1', type: 'point', status: 'archived',
      address: 'Upperhill, Nairobi', neighborhood: 'Upperhill',
      latitude: -1.2995369, longitude: 36.8076478,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Joseph Cheng', siteManager: 'Joseph Cheng', managerPhone: '0725266466',
      notes: 'Archived.',
    },
    // ── RP-41: Kilimani 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-41', name: 'Roam Point - Kilimani 1', type: 'point', status: 'archived',
      address: 'Kilimani, Nairobi', neighborhood: 'Kilimani',
      latitude: -1.2943264, longitude: 36.7546944,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Brenda Too', siteManager: 'Brenda Too', managerPhone: '0702919797',
      notes: 'Archived.',
    },
    // ── RP-42: Hurlingham 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-42', name: 'Roam Point - Hurlingham 1', type: 'point', status: 'archived',
      address: 'Hurlingham, Nairobi', neighborhood: 'Hurlingham',
      latitude: -1.2954724, longitude: 36.7991183,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Total Energies', siteManager: 'Total Energies',
      notes: 'Archived. Total Energies location.',
    },
    // ── RP-43: Kamulu 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-43', name: 'Roam Point - Kamulu 1', type: 'point', status: 'archived',
      address: 'Kamulu, Nairobi', neighborhood: 'Kamulu',
      latitude: -1.2805207, longitude: 37.0540711,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Sahara Energies', siteManager: 'Sahara Energies',
      notes: 'Archived. Sahara Energies location. Area 3.',
    },
    // ── RP-44: City Mortuary 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-44', name: 'Roam Point - City Mortuary 1', type: 'point', status: 'archived',
      address: 'City Mortuary area, Nairobi', neighborhood: 'City Mortuary',
      latitude: -1.2991321, longitude: 36.7985032,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Irene Wali', siteManager: 'Irene Wali', managerPhone: '0721985344',
      notes: 'Archived.',
    },
    // ── RP-45: Thogoto 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-45', name: 'Roam Point - Thogoto 1', type: 'point', status: 'archived',
      address: 'Thogoto, Nairobi', neighborhood: 'Thogoto',
      latitude: -1.2800969, longitude: 36.661813,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Thuo Richard', siteManager: 'Thuo Richard', managerPhone: '0736112563',
      notes: 'Archived.',
    },
    // ── RP-46: Parklands 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-46', name: 'Roam Point - Parklands 1', type: 'point', status: 'archived',
      address: 'Parklands, Nairobi', neighborhood: 'Parklands',
      latitude: -1.2646015, longitude: 36.812634,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Vincent Kamau', siteManager: 'Vincent Kamau', managerPhone: '0733773067',
      notes: 'Archived.',
    },
    // ── RP-47: Kasarani 1 (Archived) ──
    {
      chargerId: '#RP-KE-A-47', name: 'Roam Point - Kasarani 1', type: 'point', status: 'archived',
      address: 'Kasarani, Nairobi', neighborhood: 'Kasarani',
      latitude: -1.2178493, longitude: 36.8985575,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Moreen Mwirebua', siteManager: 'Moreen Mwirebua', managerPhone: '0790504222',
      notes: 'Archived.',
    },
    // ── RP-48: Outering Bus Stop (Archived) - No coordinates ──
    {
      chargerId: '#RP-KE-A-48', name: 'Roam Point - Outering Bus Stop', type: 'point', status: 'archived',
      address: 'Outering Bus Stop, Nairobi', neighborhood: 'Outering',
      latitude: null, longitude: null,
      chargerCount: 1, totalKw: 6, connectorType: 'Type 6',
      services: JSON.stringify(['charging']),
      partner: 'Nairobi County', siteManager: 'Nairobi County',
      notes: 'Archived. Nairobi County location. No coordinates available.',
    },
  ];

  const createdPoints = await db.chargingStation.createMany({ data: points });
  console.log(`✅ Created ${createdPoints.count} Roam Points (${points.filter(p => p.status === 'blocked').length} blocked, ${points.filter(p => p.status === 'construction').length} construction, ${points.filter(p => p.status === 'archived').length} archived)`);

  // ─── ROAM KIOSKS (RK-KE sheet) ─────────
  const kiosks = [
    { chargerId: '#RK-KE-NBI-A-01', name: 'Roam Kiosk - Shell Jogoo Road', type: 'kiosk', status: 'operational', address: 'Shell Jogoo Road, Nairobi', neighborhood: 'Jogoo Road', latitude: -1.292109, longitude: 36.843321, chargerCount: 4, totalKw: 0, partner: 'M-KOPA', services: JSON.stringify(['rental']), operatingHours: '8AM - 5PM', dynamicsCode: 'FO-NBI-01#RK-KE-NBI-A-01', notes: 'Battery rental kiosk at M-KOPA Shell Jogoo Road.' },
    { chargerId: '#RK-KE-NBI-A-02', name: 'Roam Kiosk - Shell Lavington', type: 'kiosk', status: 'operational', address: 'Shell Lavington, Nairobi', neighborhood: 'Lavington', latitude: -1.279364, longitude: 36.770414, chargerCount: 4, totalKw: 0, partner: 'M-KOPA', services: JSON.stringify(['rental']), operatingHours: '8AM - 5PM', dynamicsCode: 'FO-NBI-01#RK-KE-NBI-A-02', notes: 'Battery rental kiosk at M-KOPA Shell Lavington.' },
    { chargerId: '#RK-KE-NBI-A-03', name: 'Roam Kiosk - Shell Kawangware', type: 'kiosk', status: 'operational', address: 'Shell Kawangware, Nairobi', neighborhood: 'Kawangware', latitude: -1.287923, longitude: 36.741585, chargerCount: 4, totalKw: 0, partner: 'M-KOPA', services: JSON.stringify(['rental']), operatingHours: '8AM - 5PM', dynamicsCode: 'FO-NBI-01#RK-KE-NBI-A-03', notes: 'Battery rental kiosk at M-KOPA Shell Kawangware.' },
    { chargerId: '#RK-KE-NBI-A-04', name: 'Roam Kiosk - TotalEnergies Ruaraka', type: 'kiosk', status: 'construction', address: 'TotalEnergies Ruaraka, Nairobi', neighborhood: 'Ruaraka', latitude: -1.227694, longitude: 36.883355, chargerCount: 0, totalKw: 0, services: JSON.stringify(['rental']), partner: 'RideWell', dynamicsCode: 'FO-NBI-01#RK-KE-NBI-A-04', notes: 'Under construction at TotalEnergies Ruaraka with RideWell partnership.' },
  ];

  const createdKiosks = await db.chargingStation.createMany({ data: kiosks });
  console.log(`✅ Created ${createdKiosks.count} Roam Kiosks`);

  // ─── PIPELINE SITES (from Site Tracker) ─────────
  const pipelineData = [
    // Existing approved sites
    { siteId: 'SITE-1B13B2F9', landmark: 'The Point Mall Buruburu', neighborhood: 'Buruburu', latitude: -1.2942145, longitude: 36.8758017, estimatedPoints: 3, electricityAccess: 'Easy', landlordType: 'Mall', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 15, priorityBucket: 'P0 - Strategic', status: 'approved', agentName: 'Benard Masila', agentType: 'Agent', partnerName: 'Mercy Nduta', partnerPhone: '0708534944', partnerEmail: 'mercy.nduta@thepoint.co.ke', mountType: 'Pole Mount', deploymentPhase: 'Phase 1', deploymentCost: 386000, agentComment: 'Good site, positive because they host EVhaja.' },
    { siteId: 'SITE-7852B2D8', landmark: 'Stima Plaza', neighborhood: 'Ngara', latitude: -1.27121, longitude: 36.8206, estimatedPoints: 2, electricityAccess: 'Hard', landlordType: 'Shop', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 11, priorityBucket: 'P1 - High', status: 'approved', agentName: 'Joram Gichia', agentType: 'Agent', partnerName: 'Joseph Mburu', partnerPhone: '0705388019', deploymentCost: 120000, agentComment: 'Riders feedback from discussion. Electricity access is hard.' },
    { siteId: 'SITE-31A11BC4', landmark: 'Precious Gems School / Maasai Lodge', neighborhood: 'Ngong', latitude: -1.39130665, longitude: 36.7705306, estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'Medium', securityLevel: 'High', priorityScore: 8, priorityBucket: 'P0 - Strategic', status: 'approved', agentName: 'Myles Odek', agentType: 'Agent', partnerName: 'Pheliesia Kasera', partnerPhone: '+254705797584', partnerEmail: 'glowycaryard@gmail.com', mountType: 'Wall Mount', deploymentPhase: 'Phase 1', deploymentCost: 100700, agentComment: 'Carwash and car yard storage location. Landlord owns the carwash. KPLC consent letter obtained.' },
    { siteId: 'SITE-9CC66144', landmark: 'Le Pic School', neighborhood: 'Kawangware', latitude: -1.2950748, longitude: 36.7184185, estimatedPoints: 3, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'High', securityLevel: 'Medium', priorityScore: 8, priorityBucket: 'P0 - Strategic', status: 'approved', agentName: 'Myles Odek', agentType: 'Agent', partnerName: 'John Njoki', partnerPhone: '0727990176', agentComment: 'Space along the wall of establishment.' },
    { siteId: 'SITE-83B16429', landmark: 'Runda Mall', neighborhood: 'Runda', latitude: -1.2184343, longitude: 36.8334197, estimatedPoints: 3, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'approved', agentName: 'Roy Otieno', agentType: 'Roam employee', partnerName: 'Peter Macharia', partnerPhone: '0722843770', partnerEmail: 'petermacharia@jijengecredit.com', agentComment: 'Car yard with adequate space. Arc Ride also has a cabinet there.' },
    { siteId: 'SITE-39B202DB', landmark: 'Red Cross Kenya', neighborhood: 'Karen', latitude: -1.2787329, longitude: 36.6888096, estimatedPoints: 3, electricityAccess: 'Easy', landlordType: 'Petrol Station', bikeTraffic: 'Medium', securityLevel: 'Medium', priorityScore: 7, priorityBucket: 'P0 - Strategic', status: 'approved', agentName: 'Roy Otieno', agentType: 'Roam employee', deploymentCost: 201400, agentComment: 'Good location. Easily accessible. High EV bike fleet in area.' },
    { siteId: 'SITE-78C6F309', landmark: 'IRAN Hospital', neighborhood: 'Ngara', latitude: -1.2736919, longitude: 36.8297931, estimatedPoints: 2, electricityAccess: 'Easy', landlordType: 'Shop', bikeTraffic: 'High', securityLevel: 'Medium', priorityScore: 8, priorityBucket: 'P0 - Strategic', status: 'approved', agentName: 'Myles Odek', agentType: 'Agent', partnerName: 'Andrew Murimi', partnerPhone: '0722341329', agentComment: 'Prime location at Ngara. Waiting for Andrew to revert on title deed issue.' },
    { siteId: 'SITE-50EE152C', landmark: 'Thika Road Mall', neighborhood: 'Thika Road', latitude: -1.2184874, longitude: 36.8851146, estimatedPoints: 2, electricityAccess: 'Easy', landlordType: 'Shop', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'approved', agentName: 'Roy Otieno', agentType: 'Roam employee', partnerName: 'Kevin Njeru', partnerPhone: '0717615283', agentComment: 'Ideal location behind TRM with high traffic of Roam Electric motorcycles.' },
    { siteId: 'SITE-5931052C', landmark: 'Total Petrol Station, Hurlingham', neighborhood: 'Hurlingham', latitude: -1.2954724, longitude: 36.7991183, estimatedPoints: 3, electricityAccess: 'Easy', landlordType: 'Petrol Station', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'approved', agentName: 'Roy Otieno', agentType: 'Roam employee', deploymentCost: 100700, agentComment: 'Ideal location to install 3+ Roam Points. mary.gachoka@totalenergies.com' },
    { siteId: 'SITE-29A5CA88', landmark: 'Astrol Petrol Station, Thika Road', neighborhood: 'Thika Road', latitude: -1.2289605, longitude: 36.8763357, estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'approved', agentName: 'Joram Gichia', agentType: 'Agent', partnerName: 'Andrew Kamanu', partnerPhone: '0723944326', mountType: 'Wall Mount', deploymentPhase: 'Phase 2', deploymentCost: 100700, agentComment: 'Carwash with other businesses. Safe location.' },
    { siteId: 'SITE-EFA35FA2', landmark: 'Ruaka Banana Junction', neighborhood: 'Ruaka', latitude: -1.2072178, longitude: 36.7852121, estimatedPoints: 2, electricityAccess: 'Hard', landlordType: 'Shop', bikeTraffic: 'High', securityLevel: 'Medium', priorityScore: 6, priorityBucket: 'P1 - High', status: 'approved', agentName: 'Myles Odek', agentType: 'Agent', partnerName: 'Munene Mbuchi', partnerPhone: '0722531006', deploymentCost: 120000, agentComment: 'High Electric Motorbike presence. Colonial land - title deed documentation issue.' },
    // Additional rejected sites from Motorcycle Charging Sites sheet
    { siteId: 'SITE-64F8ECF7', landmark: 'Baraka Court Mall', neighborhood: 'Nairobi', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Mall', bikeTraffic: 'Medium', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'rejected', agentComment: 'Baraka Court Mall - rejected.' },
    { siteId: 'SITE-34AA73BA', landmark: 'Rabai Hardware', neighborhood: 'Nairobi', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Shop', bikeTraffic: 'Medium', securityLevel: 'Medium', priorityScore: 8, priorityBucket: 'P1 - High', status: 'archived', agentComment: 'Rabai Hardware - archived.' },
    { siteId: 'SITE-942035BF', landmark: 'PCEA Kariobangi North Church', neighborhood: 'Kariobangi', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'rejected', agentComment: 'PCEA Kariobangi North Church - rejected.' },
    { siteId: 'SITE-AF7DCF05', landmark: 'Western Mart Supermarket', neighborhood: 'Nairobi', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Shop', bikeTraffic: 'Medium', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'rejected', agentComment: 'Western Mart Supermarket - rejected.' },
    { siteId: 'SITE-BEC72BC8', landmark: 'Nairobi Womens Hospital', neighborhood: 'Nairobi', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'Medium', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'archived', agentComment: 'Nairobi Womens Hospital - archived.' },
    { siteId: 'SITE-A93A9ED1', landmark: 'I&M Bank', neighborhood: 'Kitengela', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'rejected', agentComment: 'I&M Bank Kitengela - rejected. Land documentation issues.' },
    { siteId: 'SITE-5F62570F', landmark: 'Tassia Complex', neighborhood: 'Nairobi', estimatedPoints: 10, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 12, priorityBucket: 'P0 - Strategic', status: 'archived', agentComment: 'Tassia Complex - archived. 10 potential points.' },
    { siteId: 'SITE-F991C19C', landmark: 'Farmers Choice Factory', neighborhood: 'Nairobi', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'rejected', agentComment: 'Farmers Choice Factory - rejected.' },
    { siteId: 'SITE-4448A8B9', landmark: 'Acacia Apartments Zimmerman', neighborhood: 'Zimmerman', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'rejected', agentComment: 'Acacia Apartments Zimmerman - rejected.' },
    { siteId: 'SITE-8BADAD0F', landmark: 'Alfajiri Meadows', neighborhood: 'Nairobi', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'Medium', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'rejected', agentComment: 'Alfajiri Meadows - rejected.' },
    { siteId: 'SITE-4C1F1793', landmark: 'Al Capone Lounge', neighborhood: 'Mirema', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'rejected', agentComment: 'Al Capone Lounge - rejected.' },
    { siteId: 'SITE-9966DBE7', landmark: 'Trinity Energy Kiserian', neighborhood: 'Kiserian', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Petrol Station', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'archived', agentComment: 'Trinity Energy Kiserian - archived.' },
    { siteId: 'SITE-8CCA8BC9', landmark: 'Trinity Energy Rimpa', neighborhood: 'Rimpa', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Petrol Station', bikeTraffic: 'Medium', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'archived', agentComment: 'Trinity Energy Rimpa - archived.' },
    { siteId: 'SITE-13926CEA', landmark: 'Kariobangi Roundabout', neighborhood: 'Kariobangi', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'High', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'rejected', agentComment: 'Kariobangi Roundabout - rejected.' },
    { siteId: 'SITE-C2967263', landmark: 'Konnekt Experience Center', neighborhood: 'Nairobi', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'Medium', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'archived', agentComment: 'Konnekt Experience Center - archived.' },
    { siteId: 'SITE-7D9130C4', landmark: 'Faith Church Marurui', neighborhood: 'Marurui', estimatedPoints: 1, electricityAccess: 'Easy', landlordType: 'Other', bikeTraffic: 'Medium', securityLevel: 'High', priorityScore: 9, priorityBucket: 'P0 - Strategic', status: 'archived', agentComment: 'Faith Church Marurui - archived.' },
  ];

  const createdPipeline = await db.pipelineSite.createMany({ data: pipelineData });
  console.log(`✅ Created ${createdPipeline.count} Pipeline Sites (${pipelineData.filter(p => p.status === 'approved').length} approved, ${pipelineData.filter(p => p.status === 'rejected').length} rejected, ${pipelineData.filter(p => p.status === 'archived').length} archived)`);

  // ─── MILESTONES ─────────
  const milestones = await db.milestone.createMany({
    data: [
      { title: 'Roam Air Electric Motorcycle Launch', description: 'Launch of the Roam Air electric motorcycle with removable battery system.', date: new Date('2022-06-01'), category: 'product', status: 'completed' },
      { title: 'Battery-as-a-Service Model', description: 'Introduction of battery rental service reducing upfront cost barriers.', date: new Date('2023-03-01'), category: 'product', status: 'completed' },
      { title: 'Roam Hub - Lusaka Road Launched', description: 'First Roam Hub operational at TotalEnergies Lusaka Road, Industrial Area.', date: new Date('2023-01-03'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Waiyaki Way Launched', description: 'Second hub at TotalEnergies Waiyaki Way with charging and rental services.', date: new Date('2023-01-05'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Roysambu Launched', description: 'Quickmart partnership hub with 42 chargers, 47.88kW.', date: new Date('2023-01-12'), category: 'hub', status: 'completed' },
      { title: 'SEforALL Partnership & Case Study', description: 'Recognized by Sustainable Energy for All for integrating renewable energy into EV charging.', date: new Date('2024-03-01'), category: 'partnership', status: 'completed' },
      { title: 'Roam Hub - Kayole Launched', description: 'Sahara Energy partnership hub with after-sales service.', date: new Date('2024-01-05'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Forest Road Launched', description: 'Shell Forest Road partnership.', date: new Date('2024-01-09'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Thika Centre Launched', description: 'First hub outside Nairobi in Thika. 15 chargers with after-sales.', date: new Date('2024-08-11'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Sabaki Launched', description: 'TotalEnergies Sabaki hub expanding coverage to outer Nairobi.', date: new Date('2024-10-08'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Machakos Town Launched', description: 'Stanchard partner hub in Machakos Town with 16 chargers, 21kW.', date: new Date('2024-06-01'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Suguta Launched', description: 'Largest Roam-owned hub at 60 chargers, 53.5kW. Shop-based model.', date: new Date('2024-11-28'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Roam Park Launched', description: 'Roam-owned facility at National Park East Gate. Rental only model.', date: new Date('2025-02-17'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Outering Launched', description: '34 chargers, 40kW at TotalEnergies Outering.', date: new Date('2025-01-16'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Karambee Launched', description: 'TotalEnergies Karambee hub operational.', date: new Date('2025-03-01'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Machakos Centre Launched', description: 'First Machakos hub at TotalEnergies with after-sales service.', date: new Date('2025-04-30'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Nairobi Regional Office', description: '61 chargers, 51.24kW. Largest hub with all services including after-sales.', date: new Date('2025-07-15'), category: 'hub', status: 'completed' },
      { title: 'Roam Point - Point Mall Construction', description: 'Collaboration agreement signed with The Point Mall. KES 5,000/month + KES 1/kWh revenue share.', date: new Date('2025-08-15'), category: 'point', status: 'completed' },
      { title: 'Roam Point - Rongai 1 Construction', description: 'All documents collected and signed for Rongai site. Phase 1 deployment.', date: new Date('2025-09-01'), category: 'point', status: 'completed' },
      { title: "Roam Hub - Adam's Minimall Launched", description: 'NEW largest hub at 79 chargers, 77.7kW at Adams Minimall.', date: new Date('2025-11-08'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Ojijo Launched', description: 'Rubis petrol station partnership.', date: new Date('2025-11-15'), category: 'hub', status: 'completed' },
      { title: 'Roam Hub - Langata Launched', description: 'Newest hub in Langata with 30 chargers.', date: new Date('2026-04-01'), category: 'hub', status: 'completed' },
      { title: 'Roam Point Pipeline Expansion', description: '10+ approved sites in pipeline across Nairobi. Phase 1: Point Mall, Rongai, Maasai Lodge. Phase 2: Astrol Thika Road.', date: new Date('2026-03-01'), category: 'point', status: 'in_progress' },
      { title: 'Roam Hub - Oryx Ruai Construction', description: 'Under construction. Container 2 model at Oryx Ruai.', date: new Date('2026-06-01'), category: 'hub', status: 'upcoming' },
      { title: 'Roam Hub - Banana Construction', description: 'Under construction with Trinity partnership.', date: new Date('2026-07-01'), category: 'hub', status: 'upcoming' },
      { title: 'Nationwide Network Expansion', description: 'Phase 2 and 3 expansion across Thika, Machakos, Ngong, Kitengela areas.', date: new Date('2026-09-01'), category: 'expansion', status: 'upcoming' },
    ],
  });
  console.log(`✅ Created ${milestones.count} milestones`);

  // ─── ACTIVITY LOG ─────────
  await db.activityLog.createMany({
    data: [
      { title: 'Point Mall Collaboration Agreement Signed', description: 'Signed collaboration agreement with The Point Mall. KES 5,000/month rent + KES 1/kWh revenue share. 6m x 2.5m per charger allocated.' },
      { title: 'KPLC Meter Consent - Ruaka', description: 'Consent letter obtained for meter separation at Ruaka for Martin Munene Mbuchi, KPLC account 28184778.' },
      { title: 'Maasai Lodge Agreement Signed', description: 'All documents collected and signed for Rongai/Maasai Lodge site. Phase 1 deployment approved.' },
      { title: 'Roam Hub - Langata Went Operational', description: 'Newest hub at Langata with 30 chargers went live.' },
      { title: "Adam's Minimall Hub Launched", description: "Largest hub at 79 chargers, 77.7kW deployed at Adam's Minimall." },
      { title: 'Site Pipeline Growing', description: '10+ approved prospect sites across Nairobi. Agents Myles, Joram, Roy actively scouting.' },
      { title: 'Roam Kiosk - Shell Kawangware Operational', description: 'Third M-KOPA Shell rental kiosk operational at Kawangware.' },
      { title: 'KPLC e-Mobility Tariff', description: 'Government of Kenya approved e-mobility tariff applied to all charging infrastructure.' },
      { title: 'Machakos Town Hub Operational', description: 'Stanchard partner hub in Machakos Town went operational with 16 chargers at 21kW.' },
      { title: 'Pipeline Sites Expanded', description: 'Added 15 additional pipeline sites including rejected and archived entries from Motorcycle Charging Sites database.' },
      { title: 'Roam Points Database Complete', description: 'All 48 Roam Points now tracked in system: 8 blocked, 2 construction, 38 archived.' },
    ],
  });
  console.log('✅ Created activity log entries');

  // ─── SESSIONS (simulated for analytics) ─────────
  const operationalStations = await db.chargingStation.findMany({ where: { status: 'operational' } });
  const sessionsData: { stationId: string; vehicleType: string; chargingMinutes: number; rangeKm: number; energyKwh: number; costKes: number; date: Date }[] = [];
  for (const station of operationalStations) {
    const isHub = station.type === 'hub';
    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const vType = isHub ? 'motorcycle' : ['motorcycle', 'tuk_tuk', 'motorcycle'][Math.floor(Math.random() * 3)];
      const minutes = isHub ? Math.floor(30 + Math.random() * 30) : Math.floor(3 + Math.random() * 7);
      const energy = parseFloat((minutes * (isHub ? 0.05 : 0.12)).toFixed(2));
      sessionsData.push({ stationId: station.id, vehicleType: vType, chargingMinutes: minutes, rangeKm: parseFloat((40 + Math.random() * 40).toFixed(1)), energyKwh: energy, costKes: Math.round(energy * 30), date: new Date(Date.now() - daysAgo * 86400000) });
    }
  }
  const batchSize = 50;
  for (let i = 0; i < sessionsData.length; i += batchSize) {
    await db.chargingSession.createMany({ data: sessionsData.slice(i, i + batchSize) });
  }
  console.log(`✅ Created ${sessionsData.length} charging sessions`);

  // ─── SUMMARY ─────────
  const totalStations = await db.chargingStation.count();
  const operational = await db.chargingStation.count({ where: { status: 'operational' } });
  const hubCount = await db.chargingStation.count({ where: { type: 'hub' } });
  const pointCount = await db.chargingStation.count({ where: { type: 'point' } });
  const kioskCount = await db.chargingStation.count({ where: { type: 'kiosk' } });
  const totalChargers = await db.chargingStation.aggregate({ _sum: { chargerCount: true } });
  const pipeline = await db.pipelineSite.count();
  const approvedPipeline = await db.pipelineSite.count({ where: { status: 'approved' } });

  console.log('\n📊 Database Summary (REAL DATA):');
  console.log(`   Total Stations:       ${totalStations}`);
  console.log(`   Operational:          ${operational}`);
  console.log(`   Roam Hubs:           ${hubCount} (${hubs.filter(h => h.status === 'operational').length} operational)`);
  console.log(`   Roam Points:         ${pointCount} (${points.filter(p => p.status === 'blocked').length} blocked, ${points.filter(p => p.status === 'construction').length} construction, ${points.filter(p => p.status === 'archived').length} archived)`);
  console.log(`   Roam Kiosks:         ${kioskCount}`);
  console.log(`   Total Chargers:       ${totalChargers._sum.chargerCount || 0}`);
  console.log(`   Pipeline Sites:      ${pipeline} (${approvedPipeline} approved)`);
  console.log(`   Charging Sessions:   ${sessionsData.length}`);
  console.log('\n🌱 Seeding complete!');
}

seed().catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
