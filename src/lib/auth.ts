import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const ALLOWED_DOMAIN = 'roam-electric.com';
export const ADMIN_EMAIL = 'roy.otieno@roam-electric.com';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'select_account',
          hd: ALLOWED_DOMAIN, // Hints Google to show only roam-electric.com accounts
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email ?? '';
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return false; // Block sign-in - redirects to /login?error=AccessDenied
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        session.user.isAdmin = token.email === ADMIN_EMAIL;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email ?? undefined;
        token.name = user.name ?? undefined;
        token.picture = user.image ?? undefined;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours - work day session
  },
  secret: process.env.NEXTAUTH_SECRET,
};

