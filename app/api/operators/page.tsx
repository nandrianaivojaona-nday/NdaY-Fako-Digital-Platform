'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Plus, Users, Building2, MapPin, CheckCircle, Clock } from 'lucide-react';

interface Operator {
  id: string;
  name: string;
  municipalityId: string;
  district: string;
  fokontanyActive: number;
  status: 'active' | 'pilot' | 'pending';
  contactEmail?: string;
  contactPhone?: string;
}

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    try {
      const snap = await getDocs(collection(db, 'operators'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operator));
      setOperators(data);
    } catch (error) {
      console.error('Failed to load operators:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      pilot: 'bg-blue-100 text-blue-800 border-blue-200',
      pending: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    const icons = {
      active: <CheckCircle className="w-3 h-3" />,
      pilot: <Clock className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {icons[status as keyof typeof icons]}
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/admin" className="text-teal-600 hover:text-teal-700 flex items-center gap-2">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-teal-600" />
              Operators
            </h1>
            <p className="text-gray-500 mt-1">Manage waste collection operators across Madagascar</p>
          </div>
          <Link 
            href="/admin/operators/create-admin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add Operator Admin
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Operators</p>
                <p className="text-3xl font-bold text-gray-900">{operators.length}</p>
              </div>
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Active Operators</p>
                <p className="text-3xl font-bold text-gray-900">
                  {operators.filter(op => op.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pilot Programs</p>
                <p className="text-3xl font-bold text-gray-900">
                  {operators.filter(op => op.status === 'pilot').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Operators Table */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">Loading operators...</p>
          </div>
        ) : operators.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No operators yet</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first operator admin</p>
            <Link 
              href="/admin/operators/create-admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              <Plus className="w-4 h-4" />
              Create Operator Admin
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator ID</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Municipality</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FKT Active</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {operators.map(op => (
                    <tr key={op.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">{op.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{op.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{op.municipalityId}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{op.district}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{op.fokontanyActive || 0}</td>
                      <td className="px-6 py-4">{getStatusBadge(op.status)}</td>
                      <td className="px-6 py-4">
                        <Link 
                          href={`/admin/operators/${op.id}`}
                          className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                        >
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}