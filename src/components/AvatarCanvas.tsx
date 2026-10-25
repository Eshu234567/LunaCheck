import React, { useState } from 'react';
import { ALL_BODY_ZONES, ZONE_MAP } from '../data/bodyZones';
import { BodyZone, Observation } from '../types';
import { Layers } from 'lucide-react';

interface AvatarCanvasProps {
  coveredZoneIds?: string[];
  activeZoneId?: string | null;
  highlightZoneIds?: string[];
  observations?: Observation[];
  selectedZoneId?: string | null;
  selectedObsId?: string | null;
  onSelectZone?: (zone: BodyZone) => void;
  isInteractive?: boolean;
  mode?: 'view' | 'routine' | 'timeline';
  dwellProgress?: number;
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  coveredZoneIds = [],
  activeZoneId = null,
  highlightZoneIds = [],
  observations = [],
  selectedZoneId = null,
  selectedObsId = null,
  onSelectZone,
  isInteractive = true,
  mode = 'view',
  dwellProgress = 0,
}) => {
  const [hoveredZone, setHoveredZone] = useState<BodyZone | null>(null);
  const [showClockGuides, setShowClockGuides] = useState(true);
  const [showQuadrantOverlay, setShowQuadrantOverlay] = useState(true);

  const isCovered = (id: string) => coveredZoneIds.includes(id);

  const getZoneObservations = (zoneId: string) => {
    return observations.filter((o) => o.zoneId === zoneId);
  };

  // Determine active observation for focal callout
  const activeObs =
    observations.find(
      (o) =>
        (selectedObsId && o.id === selectedObsId) ||
        (selectedZoneId && o.zoneId === selectedZoneId)
    ) || (mode === 'timeline' && observations.length > 0 ? observations[0] : null);

  const activeObsZone = activeObs ? ZONE_MAP[activeObs.zoneId] : null;

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* View controls */}
      <div className="w-full flex items-center justify-between px-2 mb-2 text-xs text-rose-800">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-rose-500" />
            108-Zone Vector Matrix
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowClockGuides(!showClockGuides)}
            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
              showClockGuides
                ? 'bg-rose-100/80 border-rose-300 text-rose-900'
                : 'bg-white border-rose-200 text-rose-600'
            }`}
          >
            Clock
          </button>
          <button
            onClick={() => setShowQuadrantOverlay(!showQuadrantOverlay)}
            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
              showQuadrantOverlay
                ? 'bg-rose-100/80 border-rose-300 text-rose-900'
                : 'bg-white border-rose-200 text-rose-600'
            }`}
          >
            Quadrants
          </button>
        </div>
      </div>

      {/* Main SVG Torso Graphic */}
      <div className="relative w-full max-w-[540px] aspect-[640/540] bg-gradient-to-b from-[#FFFDFB] via-[#FFF8F3] to-[#FFF0E8] rounded-3xl border border-rose-200 p-2 shadow-xl shadow-rose-900/5 overflow-hidden">
        {/* Anatomical Perspective Tags */}
        <div className="absolute top-3 left-4 text-left pointer-events-none z-10">
          <span className="text-[10px] font-extrabold text-rose-800 tracking-wider uppercase bg-white/90 px-2.5 py-0.5 rounded-full border border-rose-200 shadow-sm">
            Right Breast (Patient)
          </span>
          <p className="text-[9px] text-rose-700/60 mt-0.5 font-medium">Viewer Left</p>
        </div>

        <div className="absolute top-3 right-4 text-right pointer-events-none z-10">
          <span className="text-[10px] font-extrabold text-rose-800 tracking-wider uppercase bg-white/90 px-2.5 py-0.5 rounded-full border border-rose-200 shadow-sm">
            Left Breast (Patient)
          </span>
          <p className="text-[9px] text-rose-700/60 mt-0.5 font-medium">Viewer Right</p>
        </div>

        <svg viewBox="0 0 640 540" className="w-full h-full select-none">
          <defs>
            <filter id="roseGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="amberGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <linearGradient id="torsoWarmGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FED7AA" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#FECDD3" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FFF1F2" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="sternumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* 1. Torso anatomical contour */}
          <g className="anatomical-wireframe" pointerEvents="none">
            {/* Neck contour */}
            <path
              d="M 280 40 C 285 75, 310 95, 320 95 C 330 95, 355 75, 360 40"
              fill="none"
              stroke="#FDA4AF"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />

            {/* Shoulders and chest contour */}
            <path
              d="M 90 160 C 160 120, 240 100, 320 100 C 400 100, 480 120, 550 160 C 585 190, 595 260, 575 340 C 555 430, 510 510, 485 530 L 155 530 C 130 510, 85 430, 65 340 C 45 260, 55 190, 90 160 Z"
              fill="url(#torsoWarmGrad)"
              stroke="#FCA5A5"
              strokeWidth="1.5"
            />

            {/* Collarbones */}
            <path
              d="M 115 142 Q 200 148 290 125"
              fill="none"
              stroke="#E11D48"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.4"
            />
            <path
              d="M 525 142 Q 440 148 350 125"
              fill="none"
              stroke="#E11D48"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.4"
            />

            {/* Sternum Axis (Midline) */}
            <line
              x1="320"
              y1="125"
              x2="320"
              y2="480"
              stroke="url(#sternumGrad)"
              strokeWidth="1.8"
              strokeDasharray="4 4"
            />
            <text x="320" y="500" textAnchor="middle" fill="#E11D48" fontSize="8" fontWeight="bold">
              Sternum Axis
            </text>

            {/* Breast perimeter guides */}
            <circle
              cx="195"
              cy="340"
              r="120"
              fill="none"
              stroke="#FECDD3"
              strokeWidth="0.8"
              strokeDasharray="3 4"
            />
            <circle
              cx="445"
              cy="340"
              r="120"
              fill="none"
              stroke="#FECDD3"
              strokeWidth="0.8"
              strokeDasharray="3 4"
            />

            {/* Subtle anatomical landmarks for nodal zones (No empty white bubbles!) */}
            <g className="anatomical-nodal-guides" opacity="0.3">
              <circle cx="140" cy="135" r="17" fill="none" stroke="#FDA4AF" strokeWidth="0.8" strokeDasharray="2 2" />
              <circle cx="215" cy="138" r="18" fill="none" stroke="#FDA4AF" strokeWidth="0.8" strokeDasharray="2 2" />
              <circle cx="425" cy="138" r="18" fill="none" stroke="#FDA4AF" strokeWidth="0.8" strokeDasharray="2 2" />
              <circle cx="500" cy="135" r="17" fill="none" stroke="#FDA4AF" strokeWidth="0.8" strokeDasharray="2 2" />
              <circle cx="70" cy="195" r="18" fill="none" stroke="#FDA4AF" strokeWidth="0.8" strokeDasharray="2 2" />
              <circle cx="65" cy="245" r="20" fill="none" stroke="#FDA4AF" strokeWidth="0.8" strokeDasharray="2 2" />
              <circle cx="70" cy="295" r="18" fill="none" stroke="#FDA4AF" strokeWidth="0.8" strokeDasharray="2 2" />
              <circle cx="570" cy="195" r="18" fill="none" stroke="#FDA4AF" strokeWidth="0.8" strokeDasharray="2 2" />
              <circle cx="575" cy="245" r="20" fill="none" stroke="#FDA4AF" strokeWidth="0.8" strokeDasharray="2 2" />
              <circle cx="570" cy="295" r="18" fill="none" stroke="#FDA4AF" strokeWidth="0.8" strokeDasharray="2 2" />
            </g>
          </g>

          {/* 2. Quadrants Overlay */}
          {showQuadrantOverlay && (
            <g className="quadrant-overlay" pointerEvents="none" opacity="0.65">
              {/* Right Breast Quadrants */}
              <line x1="75" y1="340" x2="315" y2="340" stroke="#F97316" strokeWidth="0.7" strokeDasharray="2 3" />
              <line x1="195" y1="220" x2="195" y2="460" stroke="#F97316" strokeWidth="0.7" strokeDasharray="2 3" />
              <text x="135" y="275" fill="#EA580C" fontSize="8" fontWeight="bold">UOQ</text>
              <text x="255" y="275" fill="#EA580C" fontSize="8" fontWeight="bold">UIQ</text>
              <text x="135" y="415" fill="#EA580C" fontSize="8" fontWeight="bold">LOQ</text>
              <text x="255" y="415" fill="#EA580C" fontSize="8" fontWeight="bold">LIQ</text>

              {/* Left Breast Quadrants */}
              <line x1="325" y1="340" x2="565" y2="340" stroke="#F97316" strokeWidth="0.7" strokeDasharray="2 3" />
              <line x1="445" y1="220" x2="445" y2="460" stroke="#F97316" strokeWidth="0.7" strokeDasharray="2 3" />
              <text x="385" y="275" fill="#EA580C" fontSize="8" fontWeight="bold">UIQ</text>
              <text x="505" y="275" fill="#EA580C" fontSize="8" fontWeight="bold">UOQ</text>
              <text x="385" y="415" fill="#EA580C" fontSize="8" fontWeight="bold">LIQ</text>
              <text x="505" y="415" fill="#EA580C" fontSize="8" fontWeight="bold">LOQ</text>
            </g>
          )}

          {/* 3. Predefined 108 Anatomical Zones */}
          <g className="body-zones">
            {ALL_BODY_ZONES.map((zone) => {
              const covered = isCovered(zone.id);
              const isActive = activeZoneId === zone.id;
              const isHighlighted = highlightZoneIds.length > 0 && highlightZoneIds.includes(zone.id);
              const isSelected =
                (selectedZoneId && selectedZoneId === zone.id) ||
                (activeObsZone && activeObsZone.id === zone.id);
              const isHovered = hoveredZone?.id === zone.id;
              const zoneObs = getZoneObservations(zone.id);
              const hasObs = zoneObs.length > 0;
              const hasPersisting = zoneObs.some((o) => o.persistenceStatus === 'Persisting Observation');
              const isNodal = zone.region === 'axilla' || zone.region === 'clavicular';

              let fill = 'rgba(255, 255, 255, 0.75)';
              let stroke = '#FED7AA';
              let strokeWidth = 0.8;
              let filter = '';

              if (isSelected) {
                // Highest priority: The focused problem zone
                fill = hasPersisting ? 'rgba(225, 29, 72, 0.55)' : 'rgba(249, 115, 22, 0.5)';
                stroke = hasPersisting ? '#BE123C' : '#EA580C';
                strokeWidth = 3;
                filter = 'url(#roseGlow)';
              } else if (hasPersisting) {
                fill = 'rgba(225, 29, 72, 0.35)';
                stroke = '#BE123C';
                strokeWidth = 2.2;
                filter = 'url(#roseGlow)';
              } else if (hasObs) {
                fill = 'rgba(249, 115, 22, 0.35)';
                stroke = '#EA580C';
                strokeWidth = 2;
              } else if (isNodal) {
                // Inactive nodal zone: transparent so no ugly empty bubbles clutter the diagram!
                fill = 'transparent';
                stroke = 'transparent';
                strokeWidth = 0;
              } else if (covered) {
                fill = 'rgba(244, 63, 94, 0.3)';
                stroke = '#E11D48';
                strokeWidth = 1.4;
                filter = 'url(#roseGlow)';
              } else if (isActive) {
                fill = `rgba(245, 158, 11, ${0.4 + dwellProgress * 0.4})`;
                stroke = '#D97706';
                strokeWidth = 2;
                filter = 'url(#amberGlow)';
              } else if (isHighlighted) {
                fill = 'rgba(254, 215, 170, 0.6)';
                stroke = '#F97316';
                strokeWidth = 1.5;
              } else if (isHovered) {
                fill = 'rgba(251, 113, 133, 0.25)';
                stroke = '#F43F5E';
                strokeWidth = 1.8;
              }

              return (
                <path
                  key={zone.id}
                  d={zone.svgPath}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  filter={filter}
                  className={`transition-all duration-200 ${
                    isInteractive ? 'cursor-pointer hover:opacity-90' : 'pointer-events-none'
                  }`}
                  onMouseEnter={() => setHoveredZone(zone)}
                  onMouseLeave={() => setHoveredZone(null)}
                  onClick={() => {
                    if (isInteractive && onSelectZone) {
                      onSelectZone(zone);
                    }
                  }}
                />
              );
            })}
          </g>

          {/* 4. Clock Hour Labels (Cleanly mapped on each breast without crossing midline) */}
          {showClockGuides && (
            <g className="clock-labels" pointerEvents="none">
              {/* Right Breast Clocks */}
              {[
                { clock: 12, x: 195, y: 206 },
                { clock: 1, x: 255, y: 224 },
                { clock: 2, x: 300, y: 275 },
                { clock: 3, x: 308, y: 343 },
                { clock: 4, x: 300, y: 410 },
                { clock: 5, x: 255, y: 458 },
                { clock: 6, x: 195, y: 474 },
                { clock: 7, x: 135, y: 458 },
                { clock: 8, x: 90, y: 410 },
                { clock: 9, x: 80, y: 343 },
                { clock: 10, x: 90, y: 275 },
                { clock: 11, x: 135, y: 224 },
              ].map(({ clock, x, y }) => (
                <text key={`r-${clock}`} x={x} y={y} textAnchor="middle" fill="#9C6B7C" fontSize="8" fontWeight="700">
                  {clock}
                </text>
              ))}

              {/* Left Breast Clocks */}
              {[
                { clock: 12, x: 445, y: 206 },
                { clock: 1, x: 505, y: 224 },
                { clock: 2, x: 550, y: 275 },
                { clock: 3, x: 560, y: 343 },
                { clock: 4, x: 550, y: 410 },
                { clock: 5, x: 505, y: 458 },
                { clock: 6, x: 445, y: 474 },
                { clock: 7, x: 385, y: 458 },
                { clock: 8, x: 340, y: 410 },
                { clock: 9, x: 332, y: 343 },
                { clock: 10, x: 340, y: 275 },
                { clock: 11, x: 385, y: 224 },
              ].map(({ clock, x, y }) => (
                <text key={`l-${clock}`} x={x} y={y} textAnchor="middle" fill="#9C6B7C" fontSize="8" fontWeight="700">
                  {clock}
                </text>
              ))}
            </g>
          )}

          {/* 5. Region Badges */}
          <g className="region-indicators" pointerEvents="none">
            <text x="180" y="118" textAnchor="middle" fill="#BE123C" fontSize="7.5" fontWeight="bold">
              R. Clavicular
            </text>
            <text x="460" y="118" textAnchor="middle" fill="#BE123C" fontSize="7.5" fontWeight="bold">
              L. Clavicular
            </text>
            <text x="70" y="165" textAnchor="middle" fill="#EA580C" fontSize="7.5" fontWeight="bold">
              R. Axilla
            </text>
            <text x="570" y="165" textAnchor="middle" fill="#EA580C" fontSize="7.5" fontWeight="bold">
              L. Axilla
            </text>
          </g>

          {/* 6. Observation Numbered Pin Markers */}
          <g className="observation-pins">
            {observations.map((obs, idx) => {
              const zone = ZONE_MAP[obs.zoneId];
              if (!zone) return null;

              const isPersisting = obs.persistenceStatus === 'Persisting Observation';
              const isSelected =
                (selectedObsId && obs.id === selectedObsId) ||
                (selectedZoneId && zone.id === selectedZoneId) ||
                (activeObs && activeObs.id === obs.id);
              const pinColor = isPersisting ? '#E11D48' : '#F97316';
              const pinRadius = isSelected ? 11 : 8;

              return (
                <g
                  key={obs.id}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectZone) onSelectZone(zone);
                  }}
                >
                  {/* Subtle pulsing beacon */}
                  <circle
                    cx={zone.cx}
                    cy={zone.cy}
                    r={isSelected ? 18 : 12}
                    fill="none"
                    stroke={pinColor}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="animate-ping opacity-60 origin-center"
                    style={{ transformOrigin: `${zone.cx}px ${zone.cy}px` }}
                  />

                  {/* Rotating focus radar when selected */}
                  {isSelected && (
                    <circle
                      cx={zone.cx}
                      cy={zone.cy}
                      r="22"
                      fill="none"
                      stroke={pinColor}
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      className="animate-spin opacity-80"
                      style={{ transformOrigin: `${zone.cx}px ${zone.cy}px` }}
                    />
                  )}

                  {/* Solid pin disk */}
                  <circle
                    cx={zone.cx}
                    cy={zone.cy}
                    r={pinRadius}
                    fill={pinColor}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter={isSelected ? 'url(#roseGlow)' : undefined}
                  />

                  {/* Pin number */}
                  <text
                    x={zone.cx}
                    y={zone.cy + (isSelected ? 3.5 : 3)}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={isSelected ? '10' : '8'}
                    fontWeight="900"
                    fontFamily="sans-serif"
                  >
                    {idx + 1}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 7. Clinical Finding Callout for Selected Observation (Explicitly depicts WHERE the problem is!) */}
          {(() => {
            if (!activeObs || !activeObsZone) return null;

            const obsIndex = observations.findIndex((o) => o.id === activeObs.id) + 1;
            const isRightBreast = activeObsZone.cx < 320;

            const boxW = 215;
            const boxH = 46;
            const boxX = isRightBreast
              ? Math.max(12, Math.min(activeObsZone.cx - 20, 200))
              : Math.max(330, Math.min(activeObsZone.cx - 195, 415));
            const boxY = Math.max(12, activeObsZone.cy - 68);

            return (
              <g className="active-callout animate-fade-in" pointerEvents="none">
                {/* Pointer guide line to exact problem point */}
                <line
                  x1={boxX + (isRightBreast ? 35 : boxW - 35)}
                  y1={boxY + boxH}
                  x2={activeObsZone.cx}
                  y2={activeObsZone.cy - 12}
                  stroke="#E11D48"
                  strokeWidth="2"
                  strokeDasharray="3 2"
                />
                <circle cx={activeObsZone.cx} cy={activeObsZone.cy - 12} r="2.5" fill="#E11D48" />

                {/* Callout box */}
                <rect
                  x={boxX}
                  y={boxY}
                  width={boxW}
                  height={boxH}
                  rx="10"
                  fill="#0f172a"
                  stroke="#fda4af"
                  strokeWidth="1.5"
                  filter="url(#roseGlow)"
                  opacity="0.95"
                />

                {/* Finding header */}
                <text x={boxX + 10} y={boxY + 16} fill="#ffffff" fontSize="9.5" fontWeight="800">
                  #{obsIndex} {activeObsZone.side.toUpperCase()}: {activeObsZone.name}
                </text>

                {/* Finding category & texture */}
                <text x={boxX + 10} y={boxY + 29} fill="#fca5a5" fontSize="8" fontWeight="600">
                  {activeObs.category}
                </text>
                <text x={boxX + 10} y={boxY + 39} fill="#cbd5e1" fontSize="7.5" fontWeight="500">
                  {activeObs.feel} • {activeObs.size} ({activeObsZone.quadrant})
                </text>
              </g>
            );
          })()}

          {/* 8. Active dwell sweep ring */}
          {activeZoneId && dwellProgress > 0 && (
            <g pointerEvents="none">
              {(() => {
                const z = ZONE_MAP[activeZoneId];
                if (!z) return null;
                return (
                  <circle
                    cx={z.cx}
                    cy={z.cy}
                    r={Math.max(14, (z.radius || 18) * (1 - dwellProgress * 0.3))}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    className="animate-spin"
                    style={{ transformOrigin: `${z.cx}px ${z.cy}px` }}
                  />
                );
              })()}
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredZone && (
          <div className="absolute bottom-3 left-4 right-4 bg-white/95 backdrop-blur-md border border-rose-200 rounded-2xl p-3 text-xs text-rose-950 shadow-xl flex items-center justify-between pointer-events-none">
            <div>
              <div className="font-extrabold text-rose-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>
                  {hoveredZone.side.toUpperCase()}: {hoveredZone.name}
                </span>
              </div>
              <p className="text-[11px] text-rose-800/70 font-medium">{hoveredZone.quadrant}</p>
            </div>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Zone ID: {hoveredZone.id}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarCanvas;
