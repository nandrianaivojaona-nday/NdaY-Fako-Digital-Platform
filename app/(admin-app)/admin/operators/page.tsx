// ### 1. `app/admin/operators/page.tsx`


'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import Link from 'next/link';



interface Operator {
  id: string;
  name: string;
  municipalityId: string;
  district: string;
  fokontanyActive: number;
  status: 'active' | 'pilot' | 'pending';
}

export default function OperatorsPage() {
  const [db, setDb] = useState<any>(null);

  useEffect(() => {
    const firestore = getDb();
    setDb(firestore);
  }, []);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    const snap = await getDocs(collection(db, 'operators'));
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operator));
    setOperators(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow mb-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/admin" className="text-teal-600 hover:text-teal-700">â† Back to Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Operators</h1>
          <Link
            href="/admin/operators/new"
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            + Add Operator
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading operators...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operator ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Municipality</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">District</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">FKT Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {operators.map(op => (
                  <tr key={op.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{op.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{op.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{op.municipalityId}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{op.district}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{op.fokontanyActive || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${op.status === 'active' ? 'bg-green-100 text-green-800' :
                          op.status === 'pilot' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {op.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}