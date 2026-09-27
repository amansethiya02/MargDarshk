import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ExternalLink, Maximize2, RotateCcw, MapPin } from 'lucide-react';
import { HubNode, RouteEdge } from '../types';

interface RealLeafletMapProps {
  hubs: HubNode[];
  edges: RouteEdge[];
  pathHubIds: string[];
  startHubId: string;
  destHubId: string;
  totalDistanceKm?: number;
  totalTimeMin?: number;
  googleMapsUrl?: string;
  onSelectCity?: (hubId: string, type: 'start' | 'dest') => void;
}

export const RealLeafletMap: React.FC<RealLeafletMapProps> = ({
  hubs,
  edges,
  pathHubIds,
  startHubId,
  destHubId,
  totalDistanceKm,
  totalTimeMin,
  googleMapsUrl,
  onSelectCity
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapStyle, setMapStyle] = useState<'streets' | 'voyager'>('voyager');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const hubMap = new Map(hubs.map(h => [h.id, h]));

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center on Jaipur City
      const map = L.map(mapContainerRef.current, {
        center: [26.885, 75.800],
        zoom: 12,
        zoomControl: false, // Custom position
        scrollWheelZoom: true
      });

      // Add zoom control at bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Clean tile layer
      const tileUrl =
        mapStyle === 'streets'
          ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      const tileLayer = L.tileLayer(tileUrl, {
        attribution: '&copy; OpenStreetMap contributors, CartoDB',
        maxZoom: 18
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);

      // Ensure proper rendering after DOM layout
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update tile style when switched
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const tileUrl =
      mapStyle === 'streets'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    tileLayerRef.current.setUrl(tileUrl);
  }, [mapStyle]);

  // Handle layer plotting (edges, path, markers)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Draw all connecting highway network edges (secondary lines)
    edges.forEach(edge => {
      const u = hubMap.get(edge.from);
      const v = hubMap.get(edge.to);
      if (!u || !v) return;

      const isPathEdge =
        pathHubIds.includes(edge.from) &&
        pathHubIds.includes(edge.to) &&
        Math.abs(pathHubIds.indexOf(edge.from) - pathHubIds.indexOf(edge.to)) === 1;

      // Draw non-selected highways subtly
      if (!isPathEdge) {
        const poly = L.polyline(
          [[u.lat, u.lng], [v.lat, v.lng]],
          {
            color: edge.isBlocked ? '#f43f5e' : '#cbd5e1',
            weight: edge.isBlocked ? 2.5 : 2,
            dashArray: edge.isBlocked ? '6, 6' : '3, 4',
            opacity: edge.isBlocked ? 0.8 : 0.6
          }
        );
        poly.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px;">
            <strong style="color:#1e293b;">${edge.highwayName}</strong><br/>
            <span>${u.city} ↔ ${v.city}</span><br/>
            <span style="color:#0284c7; font-weight:600;">Real Distance: ${edge.distanceKm} km</span>
            ${edge.isBlocked ? '<br/><span style="color:#e11d48; font-weight:bold;">⚠ ROAD CLOSED</span>' : ''}
          </div>
        `);
        layerGroup.addLayer(poly);
      }
    });

    // 2. Draw calculated shortest path (bold highlighted polyline)
    if (pathHubIds.length >= 2) {
      const pathCoords: [number, number][] = [];
      pathHubIds.forEach(id => {
        const h = hubMap.get(id);
        if (h) pathCoords.push([h.lat, h.lng]);
      });

      if (pathCoords.length >= 2) {
        // Outer soft glow for high contrast on real map
        const glowLine = L.polyline(pathCoords, {
          color: '#60a5fa',
          weight: 10,
          opacity: 0.45,
          lineCap: 'round',
          lineJoin: 'round'
        });
        layerGroup.addLayer(glowLine);

        // Core sharp path line
        const mainPathLine = L.polyline(pathCoords, {
          color: '#1d4ed8', // Dark Royal Blue
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        });

        const citiesList = pathHubIds.map(id => hubMap.get(id)?.city).join(' ➔ ');
        mainPathLine.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; line-height:1.4;">
            <strong style="color:#1e293b; font-size:13px;">Optimal Shortest Highway Path</strong><br/>
            <span style="color:#2563eb; font-weight:600;">Route: ${citiesList}</span><br/>
            ${totalDistanceKm ? `<span>Total Distance: <strong>${totalDistanceKm} km</strong></span><br/>` : ''}
            ${totalTimeMin ? `<span>Driving Time: <strong>${Math.floor(totalTimeMin / 60)}h ${totalTimeMin % 60}m</strong></span>` : ''}
          </div>
        `);
        layerGroup.addLayer(mainPathLine);

        // Auto zoom and pan to fit the computed route bounds with clean margin
        map.fitBounds(mainPathLine.getBounds(), {
          padding: [50, 50],
          maxZoom: 15,
          animate: true
        });
      }
    }

    // 3. Add City Markers with custom readable badges
    hubs.forEach(hub => {
      const isStart = hub.id === startHubId;
      const isDest = hub.id === destHubId;
      const pathIndex = pathHubIds.indexOf(hub.id);
      const isInPath = pathIndex !== -1;

      let bgColor = '#475569';
      let labelPrefix = '';

      if (isStart) {
        bgColor = '#16a34a'; // Emerald Green
        labelPrefix = '🟢 Start: ';
      } else if (isDest) {
        bgColor = '#dc2626'; // Red
        labelPrefix = '🏁 Destination: ';
      } else if (isInPath) {
        bgColor = '#2563eb'; // Blue
        labelPrefix = `Stop ${pathIndex}: `;
      }

      const icon = L.divIcon({
        className: 'custom-city-pin',
        html: `
          <div style="
            display: inline-flex;
            align-items: center;
            background: ${bgColor};
            color: #ffffff;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 6px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            white-space: nowrap;
            transform: translate(-50%, -100%);
            cursor: pointer;
          ">
            <span>${labelPrefix}${hub.city}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([hub.lat, hub.lng], { icon });

      marker.bindPopup(`
        <div style="font-family:sans-serif; font-size:12px; line-height:1.45; min-width:160px;">
          <strong style="font-size:13px; color:#0f172a;">${hub.city}</strong><br/>
          <span style="color:#64748b; font-size:11px;">${hub.name}</span><br/>
          <span style="color:#64748b; font-size:11px;">PIN: ${hub.pinCode} · ${hub.state}</span>
          <div style="margin-top:6px; padding-top:6px; border-top:1px solid #e2e8f0; display:flex; gap:6px;">
            <button
              id="btn-set-start-${hub.id}"
              style="background:#16a34a; color:white; border:none; padding:3px 7px; border-radius:4px; font-size:10px; font-weight:600; cursor:pointer;"
            >
              Set as Start
            </button>
            <button
              id="btn-set-dest-${hub.id}"
              style="background:#dc2626; color:white; border:none; padding:3px 7px; border-radius:4px; font-size:10px; font-weight:600; cursor:pointer;"
            >
              Set as Destination
            </button>
          </div>
        </div>
      `);

      marker.on('popupopen', () => {
        const btnStart = document.getElementById(`btn-set-start-${hub.id}`);
        const btnDest = document.getElementById(`btn-set-dest-${hub.id}`);
        if (btnStart && onSelectCity) {
          btnStart.onclick = () => {
            onSelectCity(hub.id, 'start');
            marker.closePopup();
          };
        }
        if (btnDest && onSelectCity) {
          btnDest.onclick = () => {
            onSelectCity(hub.id, 'dest');
            marker.closePopup();
          };
        }
      });

      layerGroup.addLayer(marker);
    });

    // Invalidate size to guarantee smooth render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

  }, [hubs, edges, pathHubIds, startHubId, destHubId, totalDistanceKm, totalTimeMin, onSelectCity]);

  const handleResetView = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([26.885, 75.800], 12, { animate: true });
  };

  const handleFitRoute = () => {
    if (!mapInstanceRef.current || pathHubIds.length < 2) return;
    const pathCoords: [number, number][] = [];
    pathHubIds.forEach(id => {
      const h = hubMap.get(id);
      if (h) pathCoords.push([h.lat, h.lng]);
    });
    if (pathCoords.length >= 2) {
      const bounds = L.latLngBounds(pathCoords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  };

  return (
    <div className="relative w-full h-[460px] sm:h-[520px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      {/* Real Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Action Bar over Real Map */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Real Map Status Badge */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real Road Map</span>
          <span className="text-slate-400">|</span>
          <span className="text-blue-600 font-bold">{pathHubIds.length} Connected Stops</span>
        </div>

        {/* Quick Map Controls & Open in Google Maps */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all hover:scale-105"
              title="Open turn-by-turn driving directions in Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in Google Maps</span>
              <span className="sm:hidden">Google Maps</span>
            </a>
          )}

          <button
            onClick={handleFitRoute}
            className="p-1.5 bg-white/95 backdrop-blur-xs hover:bg-slate-100 text-slate-700 rounded-lg shadow-sm border border-slate-200 text-xs font-semibold transition-colors"
            title="Fit Route in View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetView}
            className="p-1.5 bg-white/95 backdrop-blur-xs hover:bg-slate-100 text-slate-700 rounded-lg shadow-sm border border-slate-200 text-xs font-semibold transition-colors"
            title="Reset Jaipur View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Map style toggle */}
          <button
            onClick={() => setMapStyle(prev => (prev === 'voyager' ? 'streets' : 'voyager'))}
            className="px-2.5 py-1.5 bg-white/95 backdrop-blur-xs hover:bg-slate-100 text-slate-700 rounded-lg shadow-sm border border-slate-200 text-xs font-medium transition-colors"
            title="Switch map cartography"
          >
            {mapStyle === 'voyager' ? 'Clean View' : 'Streets View'}
          </button>
        </div>
      </div>

      {/* Bottom Floating Legend */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-auto bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-3 text-[11px] font-medium text-slate-700">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
          <span>Origin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
          <span>Destination</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 bg-blue-600 rounded" />
          <span>Shortest Route</span>
        </div>
      </div>
    </div>
  );
};
