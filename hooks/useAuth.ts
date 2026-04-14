'use client';

import { useEffect, useState } from 'react';

import { onAuthStateChanged, User } from 'firebase/auth';

import { auth, db } from '@/lib/firebase';

import { doc, getDoc } from 'firebase/firestore';

import { AppUser } from "@/types/user";
import { Role } from "@/types/user";
import {  ROLES } from '@/lib/roles';



// ==============================
// Hook
// ==============================

export function useAuth() {

  const [user, setUser] = useState<User | null>(null);

  const [appUser, setAppUser] = useState<AppUser | null>(null);

  const [loading, setLoading] = useState(true);



  useEffect(() => {

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {

        setUser(firebaseUser);


        if (!firebaseUser) {
          setAppUser(null);
          setLoading(false);
          return;
        }


        try {

          const userRef = doc(
            db,
            'users',
            firebaseUser.uid
          );

          const snap = await getDoc(userRef);


          if (!snap.exists()) {

            console.error(
              'Missing /users doc for',
              firebaseUser.uid
            );

            setAppUser(null);
            setLoading(false);
            return;
          }


          const data = snap.data();


          const role: Role =
            data.role || ROLES.CITIZEN;


          const profile: AppUser = {

            uid: firebaseUser.uid,

            email: firebaseUser.email ?? '',

            role,

            operatorId: data.operatorId,

            municipalityId: data.municipalityId,

            collectorId: data.collectorId,

          };


          setAppUser(profile);


        } catch (err) {

          console.error(
            'useAuth load error',
            err
          );

          setAppUser(null);

        }


        setLoading(false);

      }
    );


    return unsubscribe;

  }, []);



  return {
    user,
    appUser,
    loading,
  };

}