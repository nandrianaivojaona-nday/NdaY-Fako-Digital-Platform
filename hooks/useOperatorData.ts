// hooks/useOperatorData.ts
import { useState, useEffect, useCallback } from 'react';
import { operatorService } from '@/services/operatorService';
import { Pickup, OperatorKPI, Collector, Bin } from '@/types/operator';

export function useOperatorData(operatorId: string) {
  const [kpi, setKpi] = useState<OperatorKPI | null>(null);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiData, pickupsData, collectorsData, binsData] = await Promise.all([
        operatorService.getOperatorKPI(operatorId),
        operatorService.getPickups(operatorId),
        operatorService.getCollectors(operatorId),
        operatorService.getBins(operatorId)
      ]);
      
      setKpi(kpiData);
      setPickups(pickupsData.pickups);
      setCollectors(collectorsData);
      setBins(binsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshPickups = useCallback(async (filters?: any) => {
    const data = await operatorService.getPickups(operatorId, filters);
    setPickups(data.pickups);
  }, [operatorId]);

  const updatePickupStatus = useCallback(async (pickupId: string, status: string) => {
    await operatorService.updatePickupStatus(pickupId, status);
    await refreshPickups();
  }, [refreshPickups]);

  return {
    kpi,
    pickups,
    collectors,
    bins,
    loading,
    error,
    refreshPickups,
    updatePickupStatus
  };
}