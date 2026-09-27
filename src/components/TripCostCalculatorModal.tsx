import React, { useState } from 'react';
import {
  X,
  IndianRupee,
  Fuel,
  Check,
  Copy,
  ArrowRight,
  Car,
  Truck,
  Bike,
  Zap,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  MapPin
} from 'lucide-react';

export interface RouteLegItem {
  from: { city: string; state: string };
  to: { city: string; state: string };
  distanceKm: number;
  highway: string;
  tollINR: number;
  timeMin: number;
}

interface TripCostCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  startCityName: string;
  destCityName: string;
  totalDistanceKm: number;
  totalTimeMin: number;
  tollCostINR: number;
  routeLegs: RouteLegItem[];
  googleMapsUrl?: string;
}

interface VehiclePreset {
  id: string;
  name: string;
  subCategory: string;
  category: string;
  defaultMileage: number;
  defaultFuelPrice: number;
  fuelUnit: string;
  fuelType: string;
  isEV: boolean;
  driverAllowancePerDay: number;
  icon: 'bike' | 'ev' | 'car' | 'pickup';
}

const VEHICLE_PRESETS: VehiclePreset[] = [
  {
    id: 'two_wheeler',
    name: '2-Wheeler (Bike / Scooter)',
    subCategory: 'Hero Splendor / Activa / Pulsar',
    category: 'Personal & Courier Dispatch',
    defaultMileage: 45.0,
    defaultFuelPrice: 104.88,
    fuelUnit: 'L Petrol',
    fuelType: 'Petrol',
    isEV: false,
    driverAllowancePerDay: 150,
    icon: 'bike'
  },
  {
    id: 'two_wheeler_ev',
    name: '2-Wheeler EV (Electric)',
    subCategory: 'Ather 450, Ola S1, TVS iQube',
    category: 'Zero-Emission Green EV',
    defaultMileage: 33.0,
    defaultFuelPrice: 7.50,
    fuelUnit: 'kWh (Units)',
    fuelType: 'Electricity',
    isEV: true,
    driverAllowancePerDay: 150,
    icon: 'ev'
  },
  {
    id: 'four_wheeler_car',
    name: '4-Wheeler (Car / Taxi)',
    subCategory: 'Swift, Dzire, WagonR, Baleno',
    category: 'Passenger & Daily Commute',
    defaultMileage: 15.0,
    defaultFuelPrice: 104.88,
    fuelUnit: 'L Petrol',
    fuelType: 'Petrol',
    isEV: false,
    driverAllowancePerDay: 300,
    icon: 'car'
  },
  {
    id: 'pickup_van',
    name: '4-Wheeler (Pickup / Tata Ace)',
    subCategory: 'Tata Ace (Chhota Hathi) / Bolero',
    category: 'Local Goods & Logistics',
    defaultMileage: 12.0,
    defaultFuelPrice: 90.36,
    fuelUnit: 'L Diesel',
    fuelType: 'Diesel',
    isEV: false,
    driverAllowancePerDay: 400,
    icon: 'pickup'
  }
];

export const TripCostCalculatorModal: React.FC<TripCostCalculatorModalProps> = ({
  isOpen,
  onClose,
  startCityName,
  destCityName,
  totalDistanceKm,
  totalTimeMin,
  tollCostINR,
  routeLegs,
  googleMapsUrl
}) => {
  // Vehicle & Calculation State
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('two_wheeler');
  const [fuelPrice, setFuelPrice] = useState<number>(104.88);
  const [mileage, setMileage] = useState<number>(45.0);

  // Inclusion Toggles
  const [includeToll, setIncludeToll] = useState<boolean>(true);
  const [includeDriverAllowance, setIncludeDriverAllowance] = useState<boolean>(false);
  const [includeEmergencyBuffer, setIncludeEmergencyBuffer] = useState<boolean>(true);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  const activePreset = VEHICLE_PRESETS.find(v => v.id === selectedVehicleId) || VEHICLE_PRESETS[0];

  const handleSelectPreset = (preset: VehiclePreset) => {
    setSelectedVehicleId(preset.id);
    setMileage(preset.defaultMileage);
    setFuelPrice(preset.defaultFuelPrice);
  };

  // Precise, easy-to-understand calculations based on real data
  const safeMileage = Math.max(0.5, mileage);
  const fuelRaw = totalDistanceKm / safeMileage;
  const fuelQuantity = fuelRaw >= 1 ? fuelRaw.toFixed(1) : fuelRaw.toFixed(2);
  const fuelCost = Math.round(fuelRaw * fuelPrice);

  // Time in hours
  const tripHours = totalTimeMin / 60;
  const driverCost = includeDriverAllowance ? activePreset.driverAllowancePerDay : 0;
  const tollCost = includeToll ? tollCostINR : 0;

  // 5% emergency contingency buffer
  const emergencyBuffer = includeEmergencyBuffer ? Math.round((fuelCost + tollCost + driverCost) * 0.05) : 0;

  // Grand Total Trip Budget
  const totalCost = fuelCost + tollCost + driverCost + emergencyBuffer;
  const costPerKm = totalDistanceKm > 0 ? (totalCost / totalDistanceKm).toFixed(2) : '0';

  // Cost proportions for visual bar
  const fuelPercent = totalCost > 0 ? Math.round((fuelCost / totalCost) * 100) : 0;
  const tollPercent = totalCost > 0 ? Math.round((tollCost / totalCost) * 100) : 0;
  const driverPercent = totalCost > 0 ? Math.round((driverCost / totalCost) * 100) : 0;
  const bufferPercent = Math.max(0, 100 - fuelPercent - tollPercent - driverPercent);

  // Copy WhatsApp Summary
  const handleCopyWhatsAppSummary = () => {
    const text = `🧭 *JAIPUR TRIP FUEL & COST ESTIMATE — MARGDARSHAK*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 *Route:* ${startCityName} ➔ ${destCityName}\n` +
      `🛣️ *Total Distance:* ${totalDistanceKm} km\n` +
      `⏱️ *Estimated Drive Time:* ${Math.floor(tripHours)}h ${totalTimeMin % 60}m\n` +
      `🚗 *Vehicle Selected:* ${activePreset.name} (${activePreset.subCategory})\n` +
      `⛽ *Mileage:* ${safeMileage} ${activePreset.isEV ? 'km/kWh' : 'km/L'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 *EXPENSE BREAKDOWN:*\n` +
      `• ${activePreset.isEV ? 'Power' : 'Fuel'} Required: ${fuelQuantity} ${activePreset.fuelUnit} (@ ₹${fuelPrice}/${activePreset.isEV ? 'kWh' : 'L'})\n` +
      `• Fuel Expense: ₹${fuelCost.toLocaleString('en-IN')}\n` +
      (includeToll && tollCost > 0 ? `• Toll Charges: ₹${tollCost.toLocaleString('en-IN')}\n` : '') +
      (includeDriverAllowance ? `• Driver Allowance: ₹${driverCost.toLocaleString('en-IN')}\n` : '') +
      (includeEmergencyBuffer ? `• 5% Contingency Buffer: ₹${emergencyBuffer.toLocaleString('en-IN')}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⭐ *TOTAL ESTIMATED TRIP BUDGET:* ₹${totalCost.toLocaleString('en-IN')} (₹${costPerKm}/km)\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      (googleMapsUrl ? `🗺️ *Live Turn-by-Turn Navigation:* ${googleMapsUrl}\n` : '') +
      `\nCalibrated with real Jaipur fuel rates (Petrol ₹104.88/L · Diesel ₹90.36/L). Have a safe journey!`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-2">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-slate-900 leading-tight">
                  Trip Fuel & Cost Calculator
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Real Jaipur Data
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                <span className="text-slate-900 font-bold">{startCityName}</span>
                <ArrowRight className="w-3 h-3 text-blue-600" />
                <span className="text-slate-900 font-bold">{destCityName}</span>
                <span className="text-slate-300">|</span>
                <span className="font-mono font-bold text-blue-700">{totalDistanceKm} km</span>
                <span className="text-slate-300">|</span>
                <span>{Math.floor(tripHours)}h {totalTimeMin % 60}m</span>
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

        <div className="space-y-5">
          {/* Step 1: Select 2-Wheeler or 4-Wheeler Vehicle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Choose Vehicle (2-Wheeler & 4-Wheeler):</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Real city mileage calibrated</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {VEHICLE_PRESETS.map(preset => {
                const isSelected = preset.id === selectedVehicleId;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl text-left transition-all border flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-600 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                        {preset.icon === 'bike' ? (
                          <Bike className="w-4 h-4" />
                        ) : preset.icon === 'ev' ? (
                          <Zap className="w-4 h-4" />
                        ) : preset.icon === 'car' ? (
                          <Car className="w-4 h-4" />
                        ) : (
                          <Truck className="w-4 h-4" />
                        )}
                      </div>
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                      }`}>
                        {preset.defaultMileage} {preset.isEV ? 'km/unit' : 'km/L'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-xs block leading-tight text-slate-900">
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                        {preset.subCategory}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Interactive Controls (Fuel Rate & Mileage Adjustments) */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                <span>Adjust Fuel Rate & Mileage (Real Jaipur Benchmarks):</span>
              </span>
              <span className="text-[11px] text-slate-500">Live dynamic recalculation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fuel Rate Control */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5 text-blue-600" />
                    <span>Rate / Price:</span>
                  </label>
                  <span className="font-mono font-black text-blue-700 text-sm">
                    ₹{fuelPrice.toFixed(2)} / {activePreset.isEV ? 'kWh Unit' : 'Litre'}
                  </span>
                </div>

                <input
                  type="range"
                  min={activePreset.isEV ? '4' : '80'}
                  max={activePreset.isEV ? '15' : '115'}
                  step={activePreset.isEV ? '0.25' : '0.5'}
                  value={fuelPrice}
                  onChange={e => setFuelPrice(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                <div className="flex items-center gap-1.5 pt-1 text-[11px] flex-wrap">
                  <span className="text-slate-400 text-[10px]">Jaipur Benchmarks:</span>
                  <button
                    onClick={() => setFuelPrice(104.88)}
                    className={`px-2 py-0.5 rounded border text-[10px] font-semibold transition-colors ${
                      fuelPrice === 104.88 ? 'bg-blue-100 border-blue-300 text-blue-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    ₹104.88 (Petrol)
                  </button>
                  <button
                    onClick={() => setFuelPrice(90.36)}
                    className={`px-2 py-0.5 rounded border text-[10px] font-semibold transition-colors ${
                      fuelPrice === 90.36 ? 'bg-blue-100 border-blue-300 text-blue-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    ₹90.36 (Diesel)
                  </button>
                  <button
                    onClick={() => setFuelPrice(7.50)}
                    className={`px-2 py-0.5 rounded border text-[10px] font-semibold transition-colors ${
                      fuelPrice === 7.50 ? 'bg-blue-100 border-blue-300 text-blue-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    ₹7.50 (EV Unit)
                  </button>
                </div>
              </div>

              {/* Mileage Control */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5 text-blue-600" />
                    <span>Real City Mileage:</span>
                  </label>
                  <span className="font-mono font-black text-blue-700 text-sm">
                    {mileage.toFixed(1)} {activePreset.isEV ? 'km/unit' : 'km/L'}
                  </span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="65"
                  step="0.5"
                  value={mileage}
                  onChange={e => setMileage(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setMileage(prev => Math.max(2, Math.round((prev - 1) * 10) / 10))}
                      className="px-2 py-0.5 rounded border bg-slate-50 border-slate-200 font-bold text-slate-700 hover:bg-slate-100"
                    >
                      - 1
                    </button>
                    <button
                      onClick={() => setMileage(prev => Math.min(75, Math.round((prev + 1) * 10) / 10))}
                      className="px-2 py-0.5 rounded border bg-slate-50 border-slate-200 font-bold text-slate-700 hover:bg-slate-100"
                    >
                      + 1
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Standard: {activePreset.defaultMileage} {activePreset.isEV ? 'km/unit' : 'km/L'}
                  </span>
                </div>
              </div>
            </div>

            {/* Extra Cost Inclusions Checkboxes */}
            <div className="pt-1 border-t border-slate-200/70">
              <span className="text-[11px] font-bold text-slate-600 block mb-2">
                Trip Cost Inclusions:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer select-none hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includeToll}
                    onChange={e => setIncludeToll(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block leading-tight">Highway / Ring Road Tolls</span>
                    <span className="text-[10px] text-slate-500">₹{tollCostINR.toLocaleString('en-IN')} (City roads are toll-free)</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer select-none hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includeDriverAllowance}
                    onChange={e => setIncludeDriverAllowance(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block leading-tight">Rider / Driver Daily Batta</span>
                    <span className="text-[10px] text-slate-500">₹{activePreset.driverAllowancePerDay} (Optional courier/delivery allowance)</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer select-none hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={includeEmergencyBuffer}
                    onChange={e => setIncludeEmergencyBuffer(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block leading-tight">5% Traffic & Contingency</span>
                    <span className="text-[10px] text-slate-500">Signal stops & traffic congestion margin</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Step 3: Simple Math Formula Card (Explain how cost is calculated) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-xs space-y-2">
            <span className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>How Cost Is Calculated (Real Data Formula):</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 text-[11px] pt-1">
              <div className="p-2 rounded-lg bg-white/80 border border-blue-100 flex items-center justify-between font-mono">
                <span>1. Fuel Needed: {totalDistanceKm} km ÷ {safeMileage}</span>
                <span className="font-bold text-blue-700">= {fuelQuantity} {activePreset.fuelUnit}</span>
              </div>
              <div className="p-2 rounded-lg bg-white/80 border border-blue-100 flex items-center justify-between font-mono">
                <span>2. Fuel Expense: {fuelQuantity} × ₹{fuelPrice.toFixed(2)}</span>
                <span className="font-bold text-blue-700">= ₹{fuelCost.toLocaleString('en-IN')}</span>
              </div>
              {includeToll && (
                <div className="p-2 rounded-lg bg-white/80 border border-blue-100 flex items-center justify-between font-mono">
                  <span>3. Toll Charges (Ring Road / Expressway)</span>
                  <span className="font-bold text-emerald-700">= ₹{tollCost.toLocaleString('en-IN')}</span>
                </div>
              )}
              {includeDriverAllowance && (
                <div className="p-2 rounded-lg bg-white/80 border border-blue-100 flex items-center justify-between font-mono">
                  <span>4. Rider / Delivery Allowance</span>
                  <span className="font-bold text-amber-700">= ₹{driverCost.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Total Budget Hero Cards */}
          <div className="p-4 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 block">
                  Total Estimated Trip Budget
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black font-mono text-white tracking-tight">
                    ₹{totalCost.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-300">
                    (₹{costPerKm} per km)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyWhatsAppSummary}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSummary ? 'Copied to Clipboard!' : 'Share WhatsApp Summary'}</span>
                </button>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                  </a>
                )}
              </div>
            </div>

            {/* Visual Breakdown Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-blue-200">
                <span>Expense Distribution:</span>
                <span>Fuel: ₹{fuelCost.toLocaleString('en-IN')} ({fuelPercent}%) · Toll: ₹{tollCost} · Buffer: ₹{emergencyBuffer}</span>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div style={{ width: `${fuelPercent}%` }} className="bg-blue-500 h-full" title={`Fuel: ${fuelPercent}%`} />
                <div style={{ width: `${tollPercent}%` }} className="bg-emerald-500 h-full" title={`Toll: ${tollPercent}%`} />
                <div style={{ width: `${driverPercent}%` }} className="bg-amber-500 h-full" title={`Driver: ${driverPercent}%`} />
                {includeEmergencyBuffer && (
                  <div style={{ width: `${bufferPercent}%` }} className="bg-indigo-400 h-full" title={`Buffer: ${bufferPercent}%`} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
