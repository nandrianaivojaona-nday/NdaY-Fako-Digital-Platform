'use client';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';

interface Collector {
  id: string;
  name: string;
  district: string;
  fokontany: string;
  fokontanyName: string;
  municipalityId: string;
  operatorId: string;
  productivity: string;
  role: 'collector' | 'operator_admin';
  status?: 'active' | 'inactive';
}

interface AddCollectorData {
  name: string;
  district: string;
  fokontany: string;
  fokontanyName: string;
  productivity: string;
  municipalityId: string;
}

export const useCollectors = () => {
  const { appUser } = useAuth();

  const addCollector = async (inputData: AddCollectorData) => {
    if (!appUser || appUser.role !== 'operator_admin') {
      throw new Error('Unauthorized');
    }

    // Generate ID: COL01-FKT01-DIS04-CUA
    const colNum = Math.floor(Math.random() * 99) + 1;
    const id = `COL${colNum.toString().padStart(2, '0')}-${inputData.fokontany}-${inputData.district}-${inputData.municipalityId}`;

    const collectorData = {
      id,
      role: 'collector' as const,
      operatorId: appUser.operatorId!,
      status: 'active' as const,
      ...inputData
    };

    const ref = await addDoc(collection(db, 'collectors'), collectorData);
    return ref.id;
  };

  const getCollectors = async () => {
    if (!appUser?.operatorId) return [];
    const q = query(collection(db, 'collectors'), where('operatorId', '==', appUser.operatorId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Collector));
  };

  const deleteCollector = async (collectorId: string) => {
    if (!appUser || appUser.role !== 'operator_admin') {
      throw new Error('Unauthorized');
    }
    await deleteDoc(doc(db, 'collectors', collectorId));
  };

  return { addCollector, getCollectors, deleteCollector };
};
export type { Collector };
