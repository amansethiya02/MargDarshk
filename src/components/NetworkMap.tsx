import React, { useState, useMemo } from 'react';
import {
  Route,
  ArrowRight,
  Gauge,
  IndianRupee,
  Fuel,
  Clock,
  AlertTriangle,
  ExternalLink,
  MapPin,
  Compass,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldCheck,
  Share2,
  Calculator,
  Truck,
  Bike,
  Car,
  Zap,
  Package,
  Layers,
  Leaf,
  Cpu,
  Sparkles,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  TrendingDown
} from 'lucide-react';
import { HubNode, RouteEdge, ShortestPathResult, RoutingGoal } from '../types';
import { runDijkstraSimulation } from '../services/dijkstra';
import { RealLeafletMap } from './RealLeafletMap';

interface NetworkMapProps {
  hubs: HubNode[];
  edges: RouteEdge[];
  onToggleEdgeBlock: (edgeId: string) => void;
  onResetEdges?: () => void;
  isTripModalOpen?: boolean;
  onOpenTripModal?: () => void;
  onCloseTripModal?: () => void;
  onOpenTspModal?: () => void;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  hubs,
  edges,
  onToggleEdgeBlock,
  onResetEdges,
  onOpenTripModal,
  onOpenTspModal
}) => {
  const [startCity, setStartCity] = useState<string>('JAI-SIT');
  const [destCity, setDestCity] = useState<string>('JAI-MAN');
  const [mapViewMode, setMapViewMode] = useState<'real' | 'schematic'>('real');
  const [routingGoal, setRoutingGoal] = useState<RoutingGoal>('fastest');
  const [quickVehicle, setQuickVehicle] = useState<'two_wheeler' | 'four_wheeler_car' | 'four_wheeler_comm' | 'two_wheeler_ev'>('two_wheeler');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [inspectorStep, setInspectorStep] = useState<number>(0);

  // Run Dijkstra Multi-Objective Path calculation
  const routeResult: ShortestPathResult = useMemo(() => {
    return runDijkstraSimulation(hubs, edges, startCity, destCity, 'dijkstra', routingGoal);
  }, [hubs, edges, startCity, destCity, routingGoal]);

  // Compute baseline without blocks for Detour Delta calculation
  const baselineResult = useMemo(() => {
    const unblockedEdges = edges.map(e => ({ ...e, isBlocked: false }));
    return runDijkstraSimulation(hubs, unblockedEdges, startCity, destCity, 'dijkstra', routingGoal);
  }, [hubs, edges, startCity, destCity, routingGoal]);

  const blockedCount = edges.filter(e => e.isBlocked).length;
  const isDetourActive = blockedCount > 0 && routeResult.totalDistanceKm > baselineResult.totalDistanceKm;
  const detourDeltaKm = Math.round((routeResult.totalDistanceKm - baselineResult.totalDistanceKm) * 10) / 10;
  const detourDeltaMin = Math.round(routeResult.totalTimeMin - baselineResult.totalTimeMin);

  // Real-world Jaipur vehicle specifications
  const quickVehicleConfig = useMemo(() => {
    switch (quickVehicle) {
      case 'two_wheeler':
        return {
          name: '2-Wheeler (Bike / Scooter)',
          shortName: '2-Wheeler',
          mileage: 45.0,
          fuelPrice: 104.88,
          fuelUnit: 'L Petrol',
          co2GramsPerKm: 55,
          isEV: false
        };
      case 'four_wheeler_car':
        return {
          name: '4-Wheeler (Car / Taxi)',
          shortName: '4-Wheeler Car',
          mileage: 15.0,
          fuelPrice: 104.88,
          fuelUnit: 'L Petrol',
          co2GramsPerKm: 140,
          isEV: false
        };
      case 'four_wheeler_comm':
        return {
          name: '4-Wheeler (Pickup / Tata Ace)',
          shortName: '4-Wheeler LCV',
          mileage: 12.0,
          fuelPrice: 90.36,
          fuelUnit: 'L Diesel',
          co2GramsPerKm: 190,
          isEV: false
        };
      case 'two_wheeler_ev':
        return {
          name: '2-Wheeler EV (Electric)',
          shortName: '2-Wheeler EV',
          mileage: 33.0,
          fuelPrice: 7.50,
          fuelUnit: 'kWh',
          co2GramsPerKm: 0,
          isEV: true
        };
    }
  }, [quickVehicle]);

  const rawFuel = routeResult.totalDistanceKm / quickVehicleConfig.mileage;
  const quickFuelUnits = rawFuel >= 1 ? rawFuel.toFixed(1) : rawFuel.toFixed(2);
  const quickFuelCost = Math.round(rawFuel * quickVehicleConfig.fuelPrice);
  const quickTotalCost = quickFuelCost + routeResult.totalToll;

  // Real Environmental Carbon Footprint
  const tripCO2Kg = quickVehicleConfig.isEV
    ? 0
    : Math.round(((routeResult.totalDistanceKm * quickVehicleConfig.co2GramsPerKm) / 1000) * 100) / 100;

  const co2SavedByEVKg = Math.round(((routeResult.totalDistanceKm * 55) / 1000) * 100) / 100;

  const hubMap = useMemo(() => new Map(hubs.map(h => [h.id, h])), [hubs]);
  const startHub = hubMap.get(startCity);
  const destHub = hubMap.get(destCity);

  // Generate Google Maps Directions URL
  const googleMapsDirectionsUrl = useMemo(() => {
    if (!startHub || !destHub || routeResult.path.length < 2) return '';
    const origin = encodeURIComponent(`${startHub.city}, Jaipur, Rajasthan, India`);
    const destination = encodeURIComponent(`${destHub.city}, Jaipur, Rajasthan, India`);
    const intermediateCities = routeResult.path
      .slice(1, -1)
      .map(id => hubMap.get(id)?.city)
      .filter(Boolean) as string[];

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (intermediateCities.length > 0) {
      const waypointsStr = intermediateCities
        .map(c => encodeURIComponent(`${c}, Jaipur, Rajasthan, India`))
        .join('|');
      url += `&waypoints=${waypointsStr}`;
    }
    return url;
  }, [startHub, destHub, routeResult.path, hubMap]);

  // Edges on computed path
  const pathEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!routeResult.path || routeResult.path.length < 2) return ids;

    for (let i = 0; i < routeResult.path.length - 1; i++) {
      const u = routeResult.path[i];
      const v = routeResult.path[i + 1];
      const match = edges.find(e => (e.from === u && e.to === v) || (e.from === v && e.to === u));
      if (match) ids.add(match.id);
    }
    return ids;
  }, [routeResult.path, edges]);

  // Detailed leg breakdown
  const routeLegs = useMemo(() => {
    const legs: {
      from: { city: string; state: string };
      to: { city: string; state: string };
      distanceKm: number;
      highway: string;
      tollINR: number;
      timeMin: number;
    }[] = [];
    if (!routeResult.path || routeResult.path.length < 2) return legs;

    for (let i = 0; i < routeResult.path.length - 1; i++) {
      const uId = routeResult.path[i];
      const vId = routeResult.path[i + 1];
      const uHub = hubMap.get(uId);
      const vHub = hubMap.get(vId);
      const match = edges.find(e => (e.from === uId && e.to === vId) || (e.from === vId && e.to === uId));

      if (uHub && vHub && match) {
        legs.push({
          from: { city: uHub.city, state: uHub.state },
          to: { city: vHub.city, state: vHub.state },
          distanceKm: match.distanceKm,
          highway: match.highwayName,
          tollINR: match.tollCostINR,
          timeMin: Math.round(match.baseTimeMin * match.trafficMultiplier)
        });
      }
    }
    return legs;
  }, [routeResult.path, hubMap, edges]);

  const handleSwapCities = () => {
    const temp = startCity;
    setStartCity(destCity);
    setDestCity(temp);
  };

  const handleSelectCityFromMap = (hubId: string, type: 'start' | 'dest') => {
    if (type === 'start') {
      if (hubId === destCity) setDestCity(startCity);
      setStartCity(hubId);
    } else {
      if (hubId === startCity) setStartCity(destCity);
      setDestCity(hubId);
    }
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?from=${startCity}&to=${destCity}&goal=${routingGoal}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Disruption Simulation Trigger Helpers
  const triggerSimulationScenario = (scenario: 'tonk_flood' | 'jln_vip' | 'sanganer_metro') => {
    if (scenario === 'tonk_flood') {
      // Toggle Tonk Road (e23: Sitapura to Durgapura, e1: Sitapura to Pratap Nagar)
      onToggleEdgeBlock('e23');
    } else if (scenario === 'jln_vip') {
      // Toggle JLN Marg (e12: Malviya Nagar to C-Scheme)
      onToggleEdgeBlock('e12');
    } else if (scenario === 'sanganer_metro') {
      // Toggle New Sanganer Road link (e3: Pratap Nagar to Mansarovar)
      onToggleEdgeBlock('e3');
    }
  };

  return (
    <div className="space-y-5">
      {/* INNOVATION ACTION BAR (Algorithmic & Fleet Features) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 shadow-sm border border-blue-800/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white uppercase tracking-wide">
              Graph Engine
            </span>
            <span className="text-xs text-blue-200 font-semibold hidden sm:inline">
              Industrial Fleet Logistics
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Jaipur Intelligent Route & Fleet Dispatch Engine
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {onOpenTspModal && (
            <button
              onClick={onOpenTspModal}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer hover:scale-102"
            >
              <Package className="w-4 h-4" />
              <span>Multi-Stop TSP Optimizer</span>
            </button>
          )}

          <button
            onClick={() => setIsInspectorOpen(prev => !prev)}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Cpu className="w-4 h-4 text-blue-300" />
            <span>{isInspectorOpen ? 'Hide DSA Trace' : 'Inspect Dijkstra DSA'}</span>
          </button>
        </div>
      </div>

      {/* DISRUPTION & ROADBLOCK SIMULATION BAR */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-bold text-slate-800">
            What-If Disruption Simulator:
          </span>
          <span className="text-slate-500 hidden sm:inline">
            (Google Maps cannot simulate road blocks for planning)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => triggerSimulationScenario('tonk_flood')}
            className="px-2.5 py-1 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold rounded-lg border border-slate-200 transition-colors shadow-2xs"
            title="Toggle simulated waterlogging on Tonk Road"
          >
            🚧 Waterlog Tonk Road
          </button>
          <button
            onClick={() => triggerSimulationScenario('jln_vip')}
            className="px-2.5 py-1 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold rounded-lg border border-slate-200 transition-colors shadow-2xs"
            title="Toggle simulated VIP movement on JLN Marg"
          >
            🚧 VIP Rally JLN Marg
          </button>
          <button
            onClick={() => triggerSimulationScenario('sanganer_metro')}
            className="px-2.5 py-1 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold rounded-lg border border-slate-200 transition-colors shadow-2xs"
            title="Toggle simulated metro track work on New Sanganer Road"
          >
            🚧 Metro Work Sanganer
          </button>
          {blockedCount > 0 && onResetEdges && (
            <button
              onClick={onResetEdges}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors shadow-2xs"
            >
              ↺ Clear All ({blockedCount})
            </button>
          )}
        </div>
      </div>

      {/* ACTIVE DETOUR NOTIFICATION BANNER */}
      {isDetourActive && (
        <div className="p-3 bg-amber-500/10 border border-amber-400 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <strong className="font-bold">Dynamic Reroute Active:</strong>
            <span>Road disruption detected! Dijkstra dynamically rerouted via alternative corridor.</span>
          </div>
          <div className="flex items-center gap-2 font-mono font-bold text-amber-800 text-[11px] shrink-0">
            <span>+{detourDeltaKm} km detour</span>
            <span>·</span>
            <span>+{detourDeltaMin}m delay</span>
          </div>
        </div>
      )}

      {/* ROUTE SELECTOR & CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Header & Quick Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Jaipur Shortest Path & Route Engine
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              14 prominent Jaipur hubs · 44 road corridors · In-memory Dijkstra graph traversal
            </p>
          </div>

          {/* Quick Route Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Quick Routes:</span>
            <button
              onClick={() => { setStartCity('JAI-SIT'); setDestCity('JAI-MAN'); }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-md font-medium transition-colors"
            >
              Sitapura → Mansarovar
            </button>
            <button
              onClick={() => { setStartCity('JAI-SIT'); setDestCity('JAI-DUR'); }}
              className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold transition-colors"
            >
              Sitapura → Durgapura
            </button>
            <button
              onClick={() => { setStartCity('JAI-DUR'); setDestCity('JAI-MAN'); }}
              className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold transition-colors"
            >
              Durgapura → Mansarovar
            </button>
            <button
              onClick={() => { setStartCity('JAI-DUR'); setDestCity('JAI-CSC'); }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-md font-medium transition-colors"
            >
              Durgapura → C-Scheme
            </button>
            <button
              onClick={() => { setStartCity('JAI-MAN'); setDestCity('JAI-VAI'); }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-md font-medium transition-colors"
            >
              Mansarovar → Vaishali
            </button>
          </div>
        </div>

        {/* Input Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5 space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Starting Point (Origin in Jaipur)</span>
            </label>
            <select
              value={startCity}
              onChange={e => setStartCity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {hubs.map(h => (
                <option key={h.id} value={h.id}>
                  {h.city} ({h.pinCode}) - {h.code}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 flex justify-center pt-2 sm:pt-4">
            <button
              onClick={handleSwapCities}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
              title="Swap Origin and Destination"
            >
              <span>⇄ Swap</span>
            </button>
          </div>

          <div className="sm:col-span-5 space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Destination (Ending in Jaipur)</span>
            </label>
            <select
              value={destCity}
              onChange={e => setDestCity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {hubs.map(h => (
                <option key={h.id} value={h.id} disabled={h.id === startCity}>
                  {h.city} ({h.pinCode}) - {h.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MULTI-OBJECTIVE ROUTING GOAL SELECTOR */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Multi-Objective Optimization Weight:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setRoutingGoal('fastest')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                routingGoal === 'fastest'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ⚡ Fastest Corridor
            </button>
            <button
              onClick={() => setRoutingGoal('shortest')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                routingGoal === 'shortest'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🛣️ Shortest Distance
            </button>
            <button
              onClick={() => setRoutingGoal('economic')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                routingGoal === 'economic'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              💰 Zero Tolls / Low Cost
            </button>
            <button
              onClick={() => setRoutingGoal('eco_green')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                routingGoal === 'eco_green'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🌿 Eco-Green (Least Congestion)
            </button>
          </div>
        </div>
      </div>

      {/* DSA ALGORITHM STEP INSPECTOR DRAWER */}
      {isInspectorOpen && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Dijkstra DSA Execution Inspector & Memory Trace
                </h3>
                <p className="text-[11px] text-slate-400">
                  Data Structure: Min-Priority Queue (Binary Heap) · Graph: Adjacency List
                </p>
              </div>
            </div>
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-blue-900/60 text-blue-300 font-bold border border-blue-700">
              O((V + E) log V)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-sans">Vertices (V)</span>
              <span className="font-bold text-white text-sm">{hubs.length} Hubs</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-sans">Edges (E)</span>
              <span className="font-bold text-white text-sm">{edges.length} Corridors</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-sans">Nodes Explored</span>
              <span className="font-bold text-emerald-400 text-sm">{routeResult.exploredCount} Nodes</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-sans">Runtime Execution</span>
              <span className="font-bold text-amber-400 text-sm">{routeResult.executionTimeUs} µs</span>
            </div>
          </div>

          {/* Stepper details */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">
                Step-by-Step Priority Queue Relaxation Log ({routeResult.steps.length} steps):
              </span>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <button
                  onClick={() => setInspectorStep(prev => Math.max(0, prev - 1))}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  ◀ Prev
                </button>
                <span className="px-2 text-slate-400">
                  {inspectorStep + 1} / {routeResult.steps.length}
                </span>
                <button
                  onClick={() => setInspectorStep(prev => Math.min(routeResult.steps.length - 1, prev + 1))}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  Next ▶
                </button>
              </div>
            </div>

            {routeResult.steps[inspectorStep] && (
              <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-mono space-y-1">
                <div className="text-emerald-400 font-bold">
                  {routeResult.steps[inspectorStep].description}
                </div>
                <div className="text-[11px] text-slate-400">
                  Current Hub: <strong className="text-white">{routeResult.steps[inspectorStep].currentHubId}</strong> · Visited Count: {routeResult.steps[inspectorStep].visited.length}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAP & ROUTE RESULTS SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Map Container (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-700">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-900">
                {mapViewMode === 'real' ? 'Real OpenStreetMap Live Route' : 'Schematic Corridor Topology'}
              </span>
            </div>

            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={() => setMapViewMode('real')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  mapViewMode === 'real'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Real Map
              </button>
              <button
                onClick={() => setMapViewMode('schematic')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  mapViewMode === 'schematic'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Schematic
              </button>
            </div>
          </div>

          {/* Real Leaflet Map or Schematic SVG */}
          {mapViewMode === 'real' ? (
            <div className="p-2 sm:p-3 bg-slate-50">
              <RealLeafletMap
                hubs={hubs}
                edges={edges}
                pathHubIds={routeResult.path}
                startHubId={startCity}
                destHubId={destCity}
                totalDistanceKm={routeResult.totalDistanceKm}
                totalTimeMin={routeResult.totalTimeMin}
                googleMapsUrl={googleMapsDirectionsUrl}
                onSelectCity={handleSelectCityFromMap}
              />
            </div>
          ) : (
            <div className="relative w-full aspect-[4/3] bg-slate-50 p-3 select-none overflow-hidden">
              <svg viewBox="160 50 500 550" className="w-full h-full">
                {edges.map(edge => {
                  const u = hubMap.get(edge.from);
                  const v = hubMap.get(edge.to);
                  if (!u || !v) return null;

                  const isPath = pathEdgeIds.has(edge.id);
                  const isBlocked = edge.isBlocked;

                  let strokeColor = '#cbd5e1';
                  let strokeWidth = 2.5;

                  if (isBlocked) {
                    strokeColor = '#f43f5e';
                    strokeWidth = 3;
                  } else if (isPath) {
                    strokeColor = '#2563eb';
                    strokeWidth = 5;
                  }

                  return (
                    <g key={edge.id}>
                      <line
                        x1={u.x}
                        y1={u.y}
                        x2={v.x}
                        y2={v.y}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={isBlocked ? '6 4' : 'none'}
                        strokeLinecap="round"
                      />
                      <g transform={`translate(${(u.x + v.x) / 2}, ${(u.y + v.y) / 2})`}>
                        <rect
                          x="-22"
                          y="-9"
                          width="44"
                          height="18"
                          rx="4"
                          fill="#ffffff"
                          stroke={isBlocked ? '#f43f5e' : isPath ? '#2563eb' : '#e2e8f0'}
                          strokeWidth="1"
                        />
                        <text
                          textAnchor="middle"
                          y="4"
                          fontSize="9"
                          fontFamily="JetBrains Mono"
                          fontWeight="700"
                          fill={isBlocked ? '#e11d48' : isPath ? '#1d4ed8' : '#64748b'}
                        >
                          {isBlocked ? 'CLOSED' : `${edge.distanceKm} km`}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {hubs.map(hub => {
                  const isStart = hub.id === startCity;
                  const isDest = hub.id === destCity;
                  const isInPath = routeResult.path.includes(hub.id);

                  let fill = '#ffffff';
                  let stroke = '#64748b';
                  let radius = 13;

                  if (isStart) {
                    fill = '#16a34a';
                    stroke = '#15803d';
                    radius = 16;
                  } else if (isDest) {
                    fill = '#dc2626';
                    stroke = '#b91c1c';
                    radius = 16;
                  } else if (isInPath) {
                    fill = '#2563eb';
                    stroke = '#1d4ed8';
                    radius = 14;
                  }

                  return (
                    <g
                      key={hub.id}
                      transform={`translate(${hub.x}, ${hub.y})`}
                      className="cursor-pointer"
                      onClick={() => {
                        if (hub.id !== startCity) setDestCity(hub.id);
                      }}
                    >
                      <circle
                        r={radius}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isStart || isDest ? '3' : '2'}
                      />
                      <text
                        textAnchor="middle"
                        y="4"
                        fontSize="9"
                        fontWeight="bold"
                        fill={isStart || isDest || isInPath ? '#ffffff' : '#334155'}
                        fontFamily="JetBrains Mono"
                      >
                        {hub.code.split('-')[0]}
                      </text>
                      <text
                        textAnchor="middle"
                        y={radius + 15}
                        fontSize="11"
                        fontWeight="700"
                        fill={isStart ? '#15803d' : isDest ? '#b91c1c' : '#0f172a'}
                      >
                        {hub.city}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <span>Click any marker on the map to set destination or inspect</span>
            <span className="font-mono text-slate-500">Dijkstra runtime: {routeResult.executionTimeUs} µs</span>
          </div>
        </div>

        {/* Right: Shortest Route Summary & Innovation Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Main Shortest Route Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                  Shortest Route Result
                </span>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  {startHub?.city} ➔ {destHub?.city}
                </h2>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {routingGoal === 'fastest' ? 'Fastest Corridor' : routingGoal === 'shortest' ? 'Min Distance' : routingGoal === 'economic' ? 'Zero Toll' : 'Eco-Green'}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Distance</span>
                <span className="font-mono font-black text-slate-900 text-base">
                  {routeResult.totalDistanceKm} km
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Drive Time</span>
                <span className="font-mono font-black text-slate-900 text-base">
                  {routeResult.totalTimeMin} min
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Tolls</span>
                <span className="font-mono font-black text-slate-900 text-base">
                  ₹{routeResult.totalToll}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] text-blue-700 font-bold block uppercase">Stops</span>
                <span className="font-mono font-black text-blue-800 text-base">
                  {routeResult.path.length} Hubs
                </span>
              </div>
            </div>

            {/* Leg-by-leg pathway */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Corridor Navigation Leg:
              </span>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto bg-slate-50">
                {routeLegs.map((leg, index) => (
                  <div key={index} className="p-2.5 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">
                        {leg.from.city} ➔ {leg.to.city}
                      </div>
                      <div className="text-[10px] text-slate-500">{leg.highway}</div>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      <div className="font-bold text-blue-700">{leg.distanceKm} km</div>
                      <div className="text-slate-400">{leg.timeMin}m</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* REAL VEHICLE FUEL & BUDGET ESTIMATOR */}
          <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                  <Fuel className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Real Jaipur Fuel & Cost Estimator
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {quickVehicleConfig.name}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                {quickVehicleConfig.mileage} {quickVehicleConfig.isEV ? 'km/unit' : 'km/L'}
              </span>
            </div>

            {/* Vehicle Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-white/90 border border-slate-200 rounded-xl text-center">
              <button
                onClick={() => setQuickVehicle('two_wheeler')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all ${
                  quickVehicle === 'two_wheeler'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span>2-Wheeler</span>
              </button>
              <button
                onClick={() => setQuickVehicle('four_wheeler_car')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all ${
                  quickVehicle === 'four_wheeler_car'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>4-Wheeler Car</span>
              </button>
              <button
                onClick={() => setQuickVehicle('four_wheeler_comm')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all ${
                  quickVehicle === 'four_wheeler_comm'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>4-Wheeler LCV</span>
              </button>
              <button
                onClick={() => setQuickVehicle('two_wheeler_ev')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all ${
                  quickVehicle === 'two_wheeler_ev'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>2-Wheeler EV</span>
              </button>
            </div>

            {/* Numbers */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-medium">Fuel Req.</span>
                <span className="font-mono font-bold text-blue-800 text-xs">
                  {quickFuelUnits} {quickVehicleConfig.fuelUnit}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-medium">
                  {quickVehicleConfig.isEV ? 'Power Cost' : 'Fuel Cost'}
                </span>
                <span className="font-mono font-bold text-slate-900 text-xs">
                  ₹{quickFuelCost.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block font-medium">Total Trip</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">
                  ₹{quickTotalCost.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* GREEN CARBON & TREE OFFSET AUDIT */}
            <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1 text-emerald-800">
                  <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Carbon Footprint:</span>
                </span>
                <span className="font-mono">
                  {quickVehicleConfig.isEV ? '0 g CO₂ (Zero Tailpipe)' : `${tripCO2Kg} kg CO₂`}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-emerald-700">
                <span>Switching to EV saves:</span>
                <span className="font-bold text-emerald-800 font-mono">
                  {co2SavedByEVKg} kg CO₂ per trip
                </span>
              </div>
            </div>

            {onOpenTripModal && (
              <button
                onClick={onOpenTripModal}
                className="w-full py-2.5 px-3 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 flex items-center justify-center gap-1.5 transition-colors shadow-2xs text-xs cursor-pointer"
              >
                <IndianRupee className="w-3.5 h-3.5" />
                <span>Open Full Fuel & Trip Cost Calculator</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
