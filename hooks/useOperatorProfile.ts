'use client';

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase/firebaseApp';
import { useAuth } from './useAuth';

type OperatorProfileUpdate = {
  name?: string;
  contactEmail?: string;
  phone?: string;
  location?: string;
};

export const useOperatorProfile = () => {
  const { user, can } = useAuth();
  const db = getDb();

  const updateProfile = async (
    operatorId: string,
    inputData: OperatorProfileUpdate
  ) => {
    if (
      !user ||
      !can('canAccessOperator') ||
      user.operatorId !== operatorId
    ) {
      throw new Error('Unauthorized');
    }

    const operatorRef = doc(db, 'operators', operatorId);

    try {
      await updateDoc(operatorRef, {
        ...inputData,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Operator update failed:', err);
      throw new Error('Failed to update profile');
    }
  };

  return { updateProfile };
};