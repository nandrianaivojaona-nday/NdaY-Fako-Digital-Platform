export interface Pickup {
    operator_id: string
    collector_id: string
    vehicle_id: string
    bin_id: string
    waste_type: string
    weight_kg: number
    timestamp: number
    lat: number
    lng: number
  }
  
  export interface Bin {
    id: string
    waste_type: string
    owner_id: string
    location: string
  }