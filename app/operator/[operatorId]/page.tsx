'use client';

import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Truck, 
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

// Types
interface Pickup {
  id: string;
  collectorId: string;
  collectorName: string;
  binId: string;
  location: string;
  wasteType: 'organic' | 'plastic' | 'glass' | 'paper' | 'electronic' | 'mixed';
  weight: number;
  status: 'completed' | 'pending' | 'verified' | 'rejected';
  timestamp: string;
  violation: boolean;
  violationType?: string;
}

interface KPIData {
  todayPickups: number;
  weeklyTonnage: number;
  activeCollectors: number;
  sortingViolations: number;
  completionRate: number;
  averageWeight: number;
}

// Mock data for demonstration
const MOCK_PICKUPS: Pickup[] = [
  {
    id: '1',
    collectorId: 'col_001',
    collectorName: 'Jean Rakoto',
    binId: 'BIN-001',
    location: 'Antananarivo Centre',
    wasteType: 'organic',
    weight: 15.5,
    status: 'completed',
    timestamp: '2024-01-15T08:30:00',
    violation: false
  },
  {
    id: '2',
    collectorId: 'col_002',
    collectorName: 'Marie Raso',
    binId: 'BIN-002',
    location: 'Analakely',
    wasteType: 'plastic',
    weight: 8.2,
    status: 'verified',
    timestamp: '2024-01-15T09:15:00',
    violation: false
  },
  {
    id: '3',
    collectorId: 'col_003',
    collectorName: 'Paul Andry',
    binId: 'BIN-003',
    location: '67 Ha',
    wasteType: 'mixed',
    weight: 22.0,
    status: 'pending',
    timestamp: '2024-01-15T10:00:00',
    violation: true,
    violationType: 'Improper sorting - plastic in organic bin'
  },
  {
    id: '4',
    collectorId: 'col_001',
    collectorName: 'Jean Rakoto',
    binId: 'BIN-004',
    location: 'Antaninarenina',
    wasteType: 'glass',
    weight: 5.3,
    status: 'completed',
    timestamp: '2024-01-14T14:20:00',
    violation: false
  },
  {
    id: '5',
    collectorId: 'col_002',
    collectorName: 'Marie Raso',
    binId: 'BIN-005',
    location: 'Mahamasina',
    wasteType: 'paper',
    weight: 12.8,
    status: 'rejected',
    timestamp: '2024-01-14T11:45:00',
    violation: true,
    violationType: 'Contaminated paper with food waste'
  }
];

const MOCK_KPI: KPIData = {
  todayPickups: 145,
  weeklyTonnage: 1240,
  activeCollectors: 28,
  sortingViolations: 12,
  completionRate: 94,
  averageWeight: 12.5
};

export default function OperatorDashboard({ params }: { params: { operatorId: string } }) {
  const { appUser } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pickups, setPickups] = useState<Pickup[]>(MOCK_PICKUPS);
  const [kpiData, setKpiData] = useState<KPIData>(MOCK_KPI);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollector, setSelectedCollector] = useState<string>('');
  const [selectedBin, setSelectedBin] = useState<string>('');
  const [selectedWasteType, setSelectedWasteType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchDashboardData();
  }, [params.operatorId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // const kpi = await getOperatorKPI(params.operatorId);
      // const pickupsData = await getOperatorPickups(params.operatorId);
      // setKpiData(kpi);
      // setPickups(pickupsData);
      
      // Using mock data for now
      setTimeout(() => {
        setKpiData(MOCK_KPI);
        setPickups(MOCK_PICKUPS);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const exportToCSV = () => {
    const filtered = getFilteredPickups();
    const csv = [
      ['ID', 'Collector', 'Bin', 'Location', 'Waste Type', 'Weight (kg)', 'Status', 'Timestamp', 'Violation'],
      ...filtered.map(p => [
        p.id, p.collectorName, p.binId, p.location, p.wasteType, p.weight, p.status, p.timestamp, p.violation ? 'Yes' : 'No'
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pickups_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getFilteredPickups = () => {
    return pickups.filter(pickup => {
      const matchesSearch = searchTerm === '' || 
        pickup.collectorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pickup.binId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pickup.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCollector = selectedCollector === '' || pickup.collectorId === selectedCollector;
      const matchesBin = selectedBin === '' || pickup.binId === selectedBin;
      const matchesWasteType = selectedWasteType === '' || pickup.wasteType === selectedWasteType;
      const matchesStatus = selectedStatus === '' || pickup.status === selectedStatus;
      
      const matchesDate = (!dateRange.start || pickup.timestamp >= dateRange.start) &&
                         (!dateRange.end || pickup.timestamp <= dateRange.end);
      
      return matchesSearch && matchesCollector && matchesBin && matchesWasteType && matchesStatus && matchesDate;
    });
  };

  const getFilteredPickupsPaginated = () => {
    const filtered = getFilteredPickups();
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filtered.slice(start, end);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 inline mr-1" /> Completed</span>;
      case 'verified':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 inline mr-1" /> Verified</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 inline mr-1" /> Pending</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800"><XCircle className="w-3 h-3 inline mr-1" /> Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getWasteTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      organic: '🌱',
      plastic: '🥤',
      glass: '🍾',
      paper: '📄',
      electronic: '💻',
      mixed: '🗑️'
    };
    return icons[type] || '🗑️';
  };

  const uniqueCollectors = [...new Map(pickups.map(p => [p.collectorId, { id: p.collectorId, name: p.collectorName }])).values()];
  const uniqueBins = [...new Set(pickups.map(p => p.binId))];
  const wasteTypes = ['organic', 'plastic', 'glass', 'paper', 'electronic', 'mixed'];
  const statuses = ['completed', 'verified', 'pending', 'rejected'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Operator Dashboard</h1>
              <span className="ml-3 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                {params.operatorId}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <span className="text-sm text-gray-600">
                {appUser?.email?.split('@')[0] || 'Operator'}
              </span>
              <button 
                onClick={handleLogout} 
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                {isLoggingOut ? 'Logging out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Pickups</p>
                <p className="text-2xl font-bold text-gray-900">{kpiData.todayPickups}</p>
                <p className="text-xs text-green-600 mt-1">↑ 12% vs yesterday</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">7-Day Tonnage (kg)</p>
                <p className="text-2xl font-bold text-gray-900">{kpiData.weeklyTonnage.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">↑ 8% vs last week</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Collectors</p>
                <p className="text-2xl font-bold text-gray-900">{kpiData.activeCollectors}</p>
                <p className="text-xs text-gray-600 mt-1">Today's shift</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sorting Violations</p>
                <p className="text-2xl font-bold text-red-600">{kpiData.sortingViolations}</p>
                <p className="text-xs text-red-600 mt-1">↑ 5% vs yesterday</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Collection Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{kpiData.completionRate}%</p>
              </div>
              <div className="w-16 h-16">
                <svg className="transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-gray-200" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-green-600" strokeWidth="3" 
                    strokeDasharray={`${kpiData.completionRate}, 100`} />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div>
              <p className="text-sm text-gray-600">Average Pickup Weight</p>
              <p className="text-2xl font-bold text-gray-900">{kpiData.averageWeight} kg</p>
              <div className="mt-2 h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-600 rounded-full" style={{ width: '65%' }}></div>
              </div>
              <p className="text-xs text-gray-600 mt-1">Target: 18 kg per pickup</p>
            </div>
          </div>
        </div>

        {/* Pickups Table Section */}
        <div className="bg-white rounded-lg shadow">
          {/* Table Header with Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Pickups</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <Filter className="w-4 h-4 inline mr-2" />
                  Filters
                </button>
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Export
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by collector, bin, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                <select
                  value={selectedCollector}
                  onChange={(e) => setSelectedCollector(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Collectors</option>
                  {uniqueCollectors.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={selectedBin}
                  onChange={(e) => setSelectedBin(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Bins</option>
                  {uniqueBins.map(bin => (
                    <option key={bin} value={bin}>{bin}</option>
                  ))}
                </select>

                <select
                  value={selectedWasteType}
                  onChange={(e) => setSelectedWasteType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Waste Types</option>
                  {wasteTypes.map(type => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Statuses</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                  ))}
                </select>

                <div className="flex space-x-2">
                  <input
                    type="date"
                    placeholder="Start Date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="date"
                    placeholder="End Date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pickups Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collector</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bin ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waste Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Violation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredPickupsPaginated().map((pickup) => (
                  <tr key={pickup.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pickup.collectorName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{pickup.binId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{pickup.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getWasteTypeIcon(pickup.wasteType)} {pickup.wasteType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{pickup.weight} kg</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(pickup.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {pickup.violation ? (
                        <span className="text-red-600 text-sm" title={pickup.violationType}>
                          ⚠️ Yes
                        </span>
                      ) : (
                        <span className="text-green-600 text-sm">✓ No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(pickup.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-green-600 hover:text-green-800">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getFilteredPickups().length)} of {getFilteredPickups().length} results
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage * itemsPerPage >= getFilteredPickups().length}
                className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}