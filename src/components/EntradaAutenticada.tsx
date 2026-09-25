"use client";
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';

export default function EntradaAutenticada() {
  const { user, loading } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      router.replace(`/recuperar-senha${window.location.hash}`);
      return;
    }
    if (!loading && user && ['/', '/login', '/glasscode'].includes(pathname)) router.replace('/dashboard');
  }, [user, loading, pathname, router]);
  return null;
}
