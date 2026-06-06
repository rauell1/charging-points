'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <div className="w-6 h-6 border-2 border-[#E8621A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-4">
      {/* Background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a0a00_0%,_#0D0D0D_70%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex flex-col items-center mb-6">
            <img src="/roam-logo-vertical-orange.png" alt="Roam Logo" className="h-20 w-auto object-contain" />
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight">
            Charging Infrastructure
          </h1>
          <p className="text-white/50 text-sm mt-1">Internal operations dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          {error === 'AccessDenied' && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
              <p className="text-red-400 text-sm font-medium">Access restricted</p>
              <p className="text-red-400/70 text-xs mt-0.5">Only @roam-electric.com accounts are allowed</p>
            </div>
          )}

          {error && error !== 'AccessDenied' && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
              <p className="text-red-400 text-sm font-medium">Sign in failed. Please try again.</p>
            </div>
          )}

          <p className="text-white/70 text-sm text-center mb-6 leading-relaxed">
            Sign in with your <span className="text-[#E8621A] font-semibold">@roam-electric.com</span> Google account to access the dashboard.
          </p>

          <Button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full bg-[#E8621A] hover:bg-[#d4571a] text-white font-semibold rounded-xl h-11 text-sm gap-3 transition-all duration-200 hover:shadow-lg hover:shadow-[#E8621A]/25"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" opacity=".9"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".9"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity=".9"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".9"/>
            </svg>
            Continue with Google
          </Button>

          <p className="text-white/30 text-xs text-center mt-4">
            Restricted to @roam-electric.com accounts only
          </p>
        </div>

        <p className="text-white/20 text-xs text-center mt-8">
          © {new Date().getFullYear()} Roam Electric Limited
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D]">
        <div className="w-6 h-6 border-2 border-[#E8621A] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
