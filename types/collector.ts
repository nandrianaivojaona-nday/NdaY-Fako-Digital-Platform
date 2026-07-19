// /types/collector.ts
export interface Collector {
    id: string;
    role: string;
    operatorId: string;
    status: 'active' | 'inactive';
    
  
    // 🔥 Required by UI
    fokontanyName?: string;
    productivity?: number;
  
    // Optional extras
    name?: string;
    phone?: string;
  }