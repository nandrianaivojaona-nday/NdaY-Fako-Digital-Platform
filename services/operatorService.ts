// services/operatorService.ts
import { Operator, Collector, Bin, Pickup, OperatorKPI } from '@/types/operator';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export const operatorService = {
  // Get operator profile
  async getOperator(operatorId: string): Promise<Operator> {
    const response = await fetch(`${API_BASE}/operators/${operatorId}`);
    if (!response.ok) throw new Error('Failed to fetch operator');
    return response.json();
  },

  // Get KPI data
  async getOperatorKPI(operatorId: string, dateRange?: { start: string; end: string }): Promise<OperatorKPI> {
    const params = new URLSearchParams();
    if (dateRange?.start) params.append('startDate', dateRange.start);
    if (dateRange?.end) params.append('endDate', dateRange.end);
    
    const response = await fetch(`${API_BASE}/operators/${operatorId}/kpi?${params}`);
    if (!response.ok) throw new Error('Failed to fetch KPI data');
    return response.json();
  },

  // Get pickups with filters
  async getPickups(
    operatorId: string,
    filters?: {
      collectorId?: string;
      binId?: string;
      wasteType?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ pickups: Pickup[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.collectorId) params.append('collectorId', filters.collectorId);
    if (filters?.binId) params.append('binId', filters.binId);
    if (filters?.wasteType) params.append('wasteType', filters.wasteType);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await fetch(`${API_BASE}/operators/${operatorId}/pickups?${params}`);
    if (!response.ok) throw new Error('Failed to fetch pickups');
    return response.json();
  },

  // Get collectors
  async getCollectors(operatorId: string): Promise<Collector[]> {
    const response = await fetch(`${API_BASE}/operators/${operatorId}/collectors`);
    if (!response.ok) throw new Error('Failed to fetch collectors');
    return response.json();
  },

  // Get bins
  async getBins(operatorId: string): Promise<Bin[]> {
    const response = await fetch(`${API_BASE}/operators/${operatorId}/bins`);
    if (!response.ok) throw new Error('Failed to fetch bins');
    return response.json();
  },

  // Update pickup status
  async updatePickupStatus(pickupId: string, status: string, notes?: string): Promise<Pickup> {
    const response = await fetch(`${API_BASE}/pickups/${pickupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    if (!response.ok) throw new Error('Failed to update pickup');
    return response.json();
  },

  // Report violation
  async reportViolation(pickupId: string, violationType: string, notes: string): Promise<Pickup> {
    const response = await fetch(`${API_BASE}/pickups/${pickupId}/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ violationType, notes })
    });
    if (!response.ok) throw new Error('Failed to report violation');
    return response.json();
  },

  // Export data
  async exportPickups(operatorId: string, filters?: any): Promise<Blob> {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE}/operators/${operatorId}/pickups/export?${params}`);
    if (!response.ok) throw new Error('Failed to export data');
    return response.blob();
  }
};