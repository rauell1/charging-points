import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // The admin panel is open to everyone - no login or sign up required.
  return <>{children}</>;
}
