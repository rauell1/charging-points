import { redirect } from 'next/navigation';

export default function LoginPage() {
  // The dashboard is open to everyone - no login or sign up required.
  redirect('/');
}
