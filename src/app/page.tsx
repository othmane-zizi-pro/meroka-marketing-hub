import { redirect } from 'next/navigation';

export default function Home() {
  // For demo purposes, redirect to login
  // In production, check auth state here
  redirect('/login');
}
