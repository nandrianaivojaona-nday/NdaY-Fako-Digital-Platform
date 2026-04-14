'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Public routes that don't require authentication
    const publicRoutes = ['/', '/login', '/training'];
    
    if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
      return;
    }

    // Check authentication for protected routes
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    }
  }, [pathname, router]);

  return <>{children}</>;
}
