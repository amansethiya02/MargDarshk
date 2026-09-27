import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  Package,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Zap,
  RotateCcw,
  IndianRupee,
  Fuel,
  MapPin,
  Clock
} from 'lucide-react';
import { HubNode, RouteEdge } from '../types';
import { solveDeliveryTsp, TspResult } from '../services/tsp';

interface MultiStopTspModalProps {
  isOpen: boolean;
  onClose: () => void;
  allHubs: HubNode[];
  edges: RouteEdge[];
}

export const MultiStopTspModal: React.FC<MultiStopTspModalProps> = ({
  isOpen,
  onClose,
  allHubs,
  edges
}) => {
  const [startHubId, setStartHubId] = useState<string>('JAI-SIT');
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([
    'JAI-DUR',
    'JAI-MAN',
    'JAI-VAI',
    'JAI-MAL'
  ]);
  const [returnToStart, setReturnToStart] = useState<boolean>(true);

  const hubMap = useMemo(() => new Map(allHubs.map(h => [h.id, h])), [allHubs]);
  const startHub = hubMap.get(startHubId) || allHubs[0];

  const deliveryStops = useMemo(() => {
    return selectedStopIds
      .map(id => hubMap.get(id))
      .filter(Boolean) as HubNode[];
  }, [selectedStopIds, hubMap]);

  // Run TSP optimization
  const tspResult: TspResult = useMemo(() => {
    if (!startHub || deliveryStops.length === 0) {
      return {
        orderedHubs: [],
        fullPathIds: [],
        totalDistanceKm: 0,
        totalTimeMin: 0,
        naiveDistanceKm: 0,
        distanceSavedKm: 0,
        percentSaved: 0,
        legs: []
      };
    }
    return solveDeliveryTsp(startHub, deliveryStops, allHubs, edges, returnToStart);
  }, [startHub, deliveryStops, allHubs, edges, returnToStart]);

  const toggleStop = (hubId: string) => {
    if (hubId === startHubId) return;
    if (selectedStopIds.includes(hubId)) {
      if (selectedStopIds.length > 2) {
        setSelectedStopIds(prev => prev.filter(id => id !== hubId));
      }
    } else {
      if (selectedStopIds.length < 6) {
        setSelectedStopIds(prev => [...prev, hubId]);
      }
    }
  };

  // Google Maps Multi-Stop directions link
  const googleMapsMultiStopUrl = useMemo(() => {
    if (tspResult.orderedHubs.length < 2) return '';
    const origin = encodeURIComponent(`${tspResult.orderedHubs[0].city}, Jaipur, Rajasthan, India`);
    const destination = encodeURIComponent(
      `${tspResult.orderedHubs[tspResult.orderedHubs.length - 1].city}, Jaipur, Rajasthan, India`
    );
    const waypoints = tspResult.orderedHubs
      .slice(1, -1)
      .map(h => encodeURIComponent(`${h.city}, Jaipur, Rajasthan, India`))
      .join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }
    return url;
  }, [tspResult.orderedHubs]);

  // Fuel & Cost savings calculation for 2-Wheeler (@45 km/L, Petrol ₹104.88)
  const fuelSavedLiters = Math.round((tspResult.distanceSavedKm / 45.0) * 10) / 10;
  const moneySavedINR = Math.round(fuelSavedLiters * 104.88);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-slate-900 leading-tight">
                  Multi-Stop TSP Delivery Optimizer
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  NP-Hard TSP Solver
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Solves Traveling Salesperson Problem to eliminate backtracking in Jaipur delivery loops
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Explanation: Why Google Maps doesn't do this */}
        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Why This Beats Standard Google Maps:</strong>
            <p className="text-amber-800 text-[11px] mt-0.5">
              In Google Maps, if a delivery rider enters 5 customer locations, Google Maps visits them in whatever order they were typed. <strong>MargDarshak evaluates all permutations ($O(K!)$) via Dijkstra distance matrix</strong> to find the mathematically optimal shortest delivery loop, saving up to 40% fuel.
            </p>
          </div>
        </div>

        {/* Step 1: Select Starting Depot & Stops */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                1. Starting Depot / Warehouse:
              </label>
              <select
                value={startHubId}
                onChange={e => {
                  const newId = e.target.value;
                  setStartHubId(newId);
                  setSelectedStopIds(prev => prev.filter(id => id !== newId));
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 cursor-pointer focus:ring-2 focus:ring-blue-500"
              >
                {allHubs.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.city} ({h.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  2. Select Delivery Stops ({selectedStopIds.length}/6):
                </label>
                <span className="text-[10px] text-slate-400">Click to add/remove</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {allHubs
                  .filter(h => h.id !== startHubId)
                  .map(h => {
                    const isChecked = selectedStopIds.includes(h.id);
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => toggleStop(h.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                          isChecked
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                        }`}
                      >
                        <span>{h.city}</span>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
              </div>
            </div>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={returnToStart}
                onChange={e => setReturnToStart(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 accent-blue-600"
              />
              <span>Return to Depot at end (Round Loop)</span>
            </label>
          </div>

          {/* Right: Optimization Results */}
          <div className="sm:col-span-8 space-y-4">
            {/* Savings Scorecard */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Naive Route</span>
                <span className="text-base font-black font-mono text-slate-600">
                  {tspResult.naiveDistanceKm} km
                </span>
                <span className="text-[10px] text-slate-400 block">unoptimized</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] text-emerald-700 font-bold block uppercase">TSP Optimized</span>
                <span className="text-base font-black font-mono text-emerald-800">
                  {tspResult.totalDistanceKm} km
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block">
                  ~{tspResult.totalTimeMin} mins
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-center shadow-xs">
                <span className="text-[10px] text-blue-200 font-bold block uppercase">Saved By TSP</span>
                <span className="text-base font-black font-mono text-white">
                  -{tspResult.distanceSavedKm} km
                </span>
                <span className="text-[10px] text-emerald-300 font-bold block">
                  {tspResult.percentSaved}% reduction
                </span>
              </div>
            </div>

            {/* Benefit Bar */}
            {tspResult.distanceSavedKm > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>Real Jaipur Savings: -{fuelSavedLiters} L Petrol saved per delivery run (~₹{moneySavedINR})!</span>
                </span>
              </div>
            )}

            {/* Optimized Delivery Sequence Tour */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                Mathematically Optimized Stop Order:
              </span>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-52 overflow-y-auto bg-slate-50">
                {tspResult.legs.map((leg, idx) => (
                  <div key={idx} className="p-2.5 bg-white flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{leg.from.city}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-slate-900">{leg.to.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600">
                      <span>{leg.distanceKm} km</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-blue-700 font-semibold">{leg.timeMin}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Open Multi-Stop in Google Maps Button */}
            {googleMapsMultiStopUrl && (
              <a
                href={googleMapsMultiStopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Optimized Multi-Stop Tour in Google Maps Driving App</span>
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>MargDarshak Intelligent Fleet Routing Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
