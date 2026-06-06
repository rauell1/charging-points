import { getServerSession } from 'next-auth';
import { authOptions, ADMIN_EMAIL } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  // Triple-lock: middleware handles cookie check, here we verify exact email
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    redirect('/login?error=AccessDenied');
  }

  return <>{children}</>;
}
