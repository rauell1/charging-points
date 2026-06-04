import type { Metadata } from 'next';
import Dashboard from '@/components/dashboard/dashboard-page';

export const metadata: Metadata = {
  title: 'Roam Electric — Charging Infrastructure Tracker',
  description:
    'Track the progress of Roam Electric charging infrastructure across Kenya. Monitor Roam Hubs, Roam Points, milestones, and real-time analytics.',
  icons: {
    icon: 'https://roam-electric.com/favicon.ico',
  },
};

export default function Page() {
  return <Dashboard />;
}
