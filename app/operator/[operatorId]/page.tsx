'use client';

import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function OperatorDashboard({ params }: { params: { operatorId: string } }) {
  const { appUser } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Operator Dashboard - {params.operatorId}</h1>
          <button onClick={handleLogout} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-2">Welcome, {appUser?.uid}</h2>
          <p className="text-gray-600">Operator: {params.operatorId}</p>
        </div>

        <p className="text-gray-600">Story 2.3 - Operator dashboard coming next...</p>
      </main>
    </div>
  );
}