export interface HubNode {
  id: string;
  name: string;
  code: string;
  pinCode: string;
  city: string;
  state: string;
  type: 'central_hub' | 'sea_port' | 'airport_cargo' | 'freight_depot' | 'urban_dispatch';
  x: number;
  y: number;
  lat: number;
  lng: number;
  capacityMT: number; // Metric Tonnes
  currentLoadMT: number;
  activeBays: number;
  connectedHighways: string[];
}

export interface RouteEdge {
  id: string;
  from: string;
  to: string;
  distanceKm: number;
  baseTimeMin: number;
  trafficMultiplier: number;
  tollCostINR: number;
  tollPlazasCount: number;
  highwayName: string;
  isBlocked: boolean;
  status: 'optimal' | 'congested' | 'blocked';
  fuelLitersEst: number;
}

export interface AlgorithmStep {
  currentHubId: string;
  visited: string[];
  distances: Record<string, number>;
  heuristics?: Record<string, number>;
  fScores?: Record<string, number>;
  parent: Record<string, string | null>;
  queueState: { id: string; priority: number }[];
  description: string;
  updatedEdges: string[];
}

export type RoutingGoal = 'fastest' | 'shortest' | 'economic' | 'eco_green';

export interface ShortestPathResult {
  path: string[];
  totalDistanceKm: number;
  totalTimeMin: number;
  totalToll: number;
  totalFuelLiters: number;
  exploredCount: number;
  steps: AlgorithmStep[];
  executionTimeUs: number;
  routingGoal?: RoutingGoal;
}

export interface DeliveryOrder {
  id: string;
  ewayBillNo: string;
  sourceHubId: string;
  destinationHubId: string;
  commodity: string;
  packageWeightKg: number;
  declaredValueINR: number;
  urgency: 'critical' | 'express' | 'standard';
  slaDeadlineMinutes: number; // minutes remaining
  priorityScore: number; // Min-Heap score: smaller = dispatch first
  status: 'queued' | 'in_transit' | 'delivered';
  assignedVehicle?: string;
  driverName?: string;
  timestamp: string;
}

export interface LRUCacheEntry {
  key: string;
  path: string[];
  distance: number;
  timeMin: number;
  hits: number;
  lastAccessed: number;
}

export interface LRUNodeState {
  key: string;
  val: string;
  prev: string | null;
  next: string | null;
}

export interface DockInterval {
  id: string;
  truckId: string;
  driverName: string;
  dockNumber: number;
  startTime: string; // e.g. "08:30"
  endTime: string;   // e.g. "10:00"
  startMinutes: number;
  endMinutes: number;
  trailerType: string;
  cargoType: string;
}
