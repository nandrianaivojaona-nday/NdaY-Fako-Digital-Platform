'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { AppUser, Role } from '@/types/user';
import { ROLES } from '@/lib/roles';

type AuthStatus = 'loading' | 'signed-out' | 'authenticated' | 'profile-missing' | 'profile-error';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isActive) return;

      setLoading(true);
      setError(null);
      setUser(firebaseUser);

      if (!firebaseUser) {
        setAppUser(null);
        setStatus('signed-out');
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (!isActive) return;

        if (!snap.exists()) {
          console.warn('Missing /users doc for', firebaseUser.uid);
          setAppUser(null);
          setStatus('profile-missing');
          setLoading(false);
          return;
        }

        const data = snap.data();

        const role: Role = data?.role ?? ROLES.CITIZEN;

        const profile: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          role,
          operatorId: data?.operatorId ?? null,
          municipalityId: data?.municipalityId ?? null,
          collectorId: data?.collectorId ?? null,
        };

        setAppUser(profile);
        setStatus('authenticated');
      } catch (err: any) {
        if (!isActive) return;

        const code = typeof err?.code === 'string' ? err.code : '';
        const message = typeof err?.message === 'string' ? err.message : '';

        console.error('useAuth load error', err);

        setAppUser(null);

        if (code === 'permission-denied' || message.toLowerCase().includes('permission-denied')) {
          setStatus('profile-error');
          setError('Permission denied while loading user profile.');
        } else {
          setStatus('profile-error');
          setError('Failed to load user profile.');
        }

        setLoading(false);
        return;
      }

      if (!isActive) return;
      setLoading(false);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return {
    user,
    appUser,
    loading,
    status,
    error,
    isAuthenticated: status === 'authenticated',
    isSignedOut: status === 'signed-out',
  };
}
