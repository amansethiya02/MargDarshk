/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { NetworkMap } from './components/NetworkMap';
import { TripCostCalculatorModal } from './components/TripCostCalculatorModal';
import { MultiStopTspModal } from './components/MultiStopTspModal';
import { INITIAL_HUBS, INITIAL_EDGES } from './data/defaultData';
import { HubNode, RouteEdge } from './types';

export default function App() {
  // Core Network Data
  const [hubs] = useState<HubNode[]>(INITIAL_HUBS);
  const [edges, setEdges] = useState<RouteEdge[]>(INITIAL_EDGES);

  // Modals state
  const [isTripModalOpen, setIsTripModalOpen] = useState<boolean>(false);
  const [isTspModalOpen, setIsTspModalOpen] = useState<boolean>(false);

  // Toggle highway blockage for dynamic rerouting demo
  const handleToggleEdgeBlock = (edgeId: string) => {
    setEdges(prev =>
      prev.map(e => {
        if (e.id === edgeId) {
          const newBlock = !e.isBlocked;
          return {
            ...e,
            isBlocked: newBlock,
            status: newBlock ? 'blocked' : 'optimal'
          };
        }
        return e;
      })
    );
  };

  // Reset all blocked highways to original optimal state
  const handleResetEdges = () => {
    setEdges(prev =>
      prev.map(e => ({
        ...e,
        isBlocked: false,
        status: 'optimal'
      }))
    );
  };

  const blockedCount = edges.filter(e => e.isBlocked).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-500/20 selection:text-blue-900">
      {/* Clean Professional Navbar with Innovation Features */}
      <Navbar
        onResetNetwork={handleResetEdges}
        blockedCount={blockedCount}
        onOpenTripCalculator={() => setIsTripModalOpen(true)}
        onOpenTspModal={() => setIsTspModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <NetworkMap
          hubs={hubs}
          edges={edges}
          onToggleEdgeBlock={handleToggleEdgeBlock}
          onResetEdges={handleResetEdges}
          isTripModalOpen={isTripModalOpen}
          onOpenTripModal={() => setIsTripModalOpen(true)}
          onCloseTripModal={() => setIsTripModalOpen(false)}
          onOpenTspModal={() => setIsTspModalOpen(true)}
        />
      </main>

      {/* Multi-Stop TSP Delivery Optimizer Modal */}
      <MultiStopTspModal
        isOpen={isTspModalOpen}
        onClose={() => setIsTspModalOpen(false)}
        allHubs={hubs}
        edges={edges}
      />

      {/* Clean Professional Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-5 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="font-bold text-slate-700">
              MargDarshak · Intelligent Graph Engine & Fleet Operations
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Jaipur Multi-Objective Shortest Path, Disruption Simulator & TSP Optimizer
            </p>
          </div>
          <div className="flex items-center gap-3 text-slate-400 font-medium">
            <span>Dijkstra $O((V+E)\log V)$</span>
            <span>·</span>
            <span>TSP Delivery Solver</span>
            <span>·</span>
            <span>What-If Roadblock Simulator</span>
            <span>·</span>
            <span>Green EV Footprint</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
