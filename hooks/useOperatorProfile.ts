'use client';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';

interface ProfileUpdate {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  officeAddress?: string;
}

export const updateOperatorProfile = async (operatorId: string, inputData: ProfileUpdate) => {
  const { appUser } = useAuth();
  
  if (!appUser || appUser.role !== 'operator_admin' || appUser.operatorId !== operatorId) {
    throw new Error('Unauthorized');
  }

  const operatorRef = doc(db, 'operators', operatorId);
  await updateDoc(operatorRef, {
    ...inputData,
    updatedAt: serverTimestamp(),
    status: 'PENDING_SETUP'
  });
};
