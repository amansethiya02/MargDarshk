import React from 'react';
import { RefreshCw, Compass, Calculator, Package } from 'lucide-react';

interface NavbarProps {
  onResetNetwork?: () => void;
  blockedCount: number;
  onOpenTripCalculator?: () => void;
  onOpenTspModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onResetNetwork,
  blockedCount,
  onOpenTripCalculator,
  onOpenTspModal
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo & Project Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-slate-900 block leading-tight">
                MargDarshak
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Graph Intelligence Engine
              </span>
            </div>
            <span className="text-xs font-medium text-slate-500 block leading-none mt-0.5">
              Jaipur Smart Route & Multi-Objective Optimization Platform
            </span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 text-xs">
          {blockedCount > 0 && onResetNetwork && (
            <button
              onClick={onResetNetwork}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-bold hover:bg-rose-100 transition-colors animate-pulse"
              title="Reset all blocked roads"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{blockedCount} Road Closed (Clear)</span>
            </button>
          )}

          {/* Multi-Stop TSP Delivery Optimizer */}
          {onOpenTspModal && (
            <button
              onClick={onOpenTspModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold transition-all border border-emerald-300 shadow-2xs"
              title="Solve Multi-Stop Traveling Salesperson Delivery Tour"
            >
              <Package className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Multi-Stop TSP</span>
              <span className="sm:hidden">TSP</span>
            </button>
          )}

          {/* Trip Cost & Fuel Calculator */}
          {onOpenTripCalculator && (
            <button
              onClick={onOpenTripCalculator}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold transition-all border border-blue-200 shadow-2xs"
              title="Calculate Fuel, Toll & Trip Budget"
            >
              <Calculator className="w-4 h-4 text-blue-600" />
              <span className="hidden lg:inline">Fuel & Cost</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
