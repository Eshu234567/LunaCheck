import React from 'react';
import {
  AnatomicalZoneId,
  ANATOMICAL_ZONES,
  PersistenceAnalysis,
  ZoneCoverageState,
} from '../types/schema';

interface AvatarBodyMapProps {
  mode: 'coverage' | 'findings' | 'gap_review';
  coverageStates?: Record<AnatomicalZoneId, ZoneCoverageState>;
  activeStepZones?: AnatomicalZoneId[];
  selectedZoneId?: AnatomicalZoneId | null;
  findingsAnalyses?: PersistenceAnalysis[];
  fingerPadNorm?: { u: number; v: number } | null;
  onZoneSelect?: (zoneId: AnatomicalZoneId) => void;
  onSimulatedPalpationMove?: (u: number, v: number) => void;
}

// Convert normalized torso coordinates (u in [-0.65, 0.65], v in [0, 1]) to 420x360 SVG coordinates
export function normToSvg(u: number, v: number): { x: number; y: number } {
  const x = 210 + u * 310;
  const y = 30 + v * 300;
  return { x, y };
}

export function svgToNorm(x: number, y: number): { u: number; v: number } {
  const u = (x - 210) / 310;
  const v = (y - 30) / 300;
  return { u, v };
}

// Clean geometric SVG path definitions for each of the 16 anatomical zones
// Center of Right Breast mound: (132, 189), R = 56
// Center of Left Breast mound: (288, 189), R = 56
const ZONE_SVG_PATHS: Record<AnatomicalZoneId, { d: string; labelPos: { x: number; y: number } }> = {
  // RIGHT SIDE (Viewer's left, cx=132, cy=189)
  right_upper_outer: {
    d: 'M 132 189 L 76 189 A 56 56 0 0 1 132 133 Z',
    labelPos: { x: 103, y: 164 },
  },
  right_upper_inner: {
    d: 'M 132 189 L 132 133 A 56 56 0 0 1 188 189 Z',
    labelPos: { x: 159, y: 164 },
  },
  right_lower_outer: {
    d: 'M 132 189 L 132 245 A 56 56 0 0 1 76 189 Z',
    labelPos: { x: 103, y: 214 },
  },
  right_lower_inner: {
    d: 'M 132 189 L 188 189 A 56 56 0 0 1 132 245 Z',
    labelPos: { x: 159, y: 214 },
  },
  right_central_nipple: {
    d: 'M 132 169 A 20 20 0 1 0 132 209 A 20 20 0 1 0 132 169 Z',
    labelPos: { x: 132, y: 192 },
  },
  right_tail_of_spence: {
    d: 'M 66 124 Q 92 118 104 138 L 80 162 Q 62 146 66 124 Z',
    labelPos: { x: 82, y: 138 },
  },
  right_axilla: {
    d: 'M 38 92 Q 64 88 70 116 L 46 134 Q 32 115 38 92 Z',
    labelPos: { x: 52, y: 112 },
  },
  right_clavicle: {
    d: 'M 88 74 Q 132 66 174 78 L 170 98 Q 132 90 92 96 Z',
    labelPos: { x: 132, y: 86 },
  },

  // LEFT SIDE (Viewer's right, cx=288, cy=189)
  left_upper_inner: {
    d: 'M 288 189 L 232 189 A 56 56 0 0 1 288 133 Z',
    labelPos: { x: 261, y: 164 },
  },
  left_upper_outer: {
    d: 'M 288 189 L 288 133 A 56 56 0 0 1 344 189 Z',
    labelPos: { x: 317, y: 164 },
  },
  left_lower_inner: {
    d: 'M 288 189 L 288 245 A 56 56 0 0 1 232 189 Z',
    labelPos: { x: 261, y: 214 },
  },
  left_lower_outer: {
    d: 'M 288 189 L 344 189 A 56 56 0 0 1 288 245 Z',
    labelPos: { x: 317, y: 214 },
  },
  left_central_nipple: {
    d: 'M 288 169 A 20 20 0 1 0 288 209 A 20 20 0 1 0 288 169 Z',
    labelPos: { x: 288, y: 192 },
  },
  left_tail_of_spence: {
    d: 'M 354 124 Q 328 118 316 138 L 340 162 Q 358 146 354 124 Z',
    labelPos: { x: 338, y: 138 },
  },
  left_axilla: {
    d: 'M 382 92 Q 356 88 350 116 L 374 134 Q 388 115 382 92 Z',
    labelPos: { x: 368, y: 112 },
  },
  left_clavicle: {
    d: 'M 332 74 Q 288 66 246 78 L 250 98 Q 288 90 328 96 Z',
    labelPos: { x: 288, y: 86 },
  },
};

// Render order so central nipple sits on top of the 4 quadrants
const RENDER_ORDER: AnatomicalZoneId[] = [
  'right_clavicle',
  'right_axilla',
  'right_tail_of_spence',
  'right_upper_outer',
  'right_upper_inner',
  'right_lower_outer',
  'right_lower_inner',
  'right_central_nipple',
  'left_clavicle',
  'left_axilla',
  'left_tail_of_spence',
  'left_upper_outer',
  'left_upper_inner',
  'left_lower_outer',
  'left_lower_inner',
  'left_central_nipple',
];

export const AvatarBodyMap: React.FC<AvatarBodyMapProps> = ({
  mode,
  coverageStates,
  activeStepZones = [],
  selectedZoneId,
  findingsAnalyses = [],
  fingerPadNorm,
  onZoneSelect,
  onSimulatedPalpationMove,
}) => {
  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onSimulatedPalpationMove) return;
    // Allow drag/hover palpation when holding mouse button or touch
    if (e.buttons !== 1 && e.pointerType === 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 420;
    const svgY = ((e.clientY - rect.top) / rect.height) * 320;
    const { u, v } = svgToNorm(svgX, svgY);
    onSimulatedPalpationMove(u, v);
  };

  const fingerSvg = fingerPadNorm ? normToSvg(fingerPadNorm.u, fingerPadNorm.v) : null;

  return (
    <div className="relative select-none w-full max-w-[440px] mx-auto">
      <svg
        viewBox="0 0 420 310"
        className="w-full h-auto drop-shadow-sm touch-none"
        onPointerMove={handleSvgPointerMove}
      >
        <defs>
          <radialGradient id="torsoGlow" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#f0fdfa" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.3" />
          </radialGradient>
        </defs>

        {/* Background Card */}
        <rect x="4" y="4" width="412" height="302" rx="20" fill="url(#torsoGlow)" stroke="#e2e8f0" strokeWidth="1.5" />

        {/* Abstract Anatomical Torso Silhouette (Shoulders, Neck, Sternum, Ribcage) */}
        <path
          d="M 175 18 Q 210 32 245 18 L 258 46 Q 345 55 390 86 L 372 165 L 352 288 L 68 288 L 48 165 L 30 86 Q 75 55 162 46 Z"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="2"
        />

        {/* Center Sternum Reference Line */}
        <line x1="210" y1="54" x2="210" y2="275" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="4 4" />

        {/* Side Orientation Headers */}
        <g className="text-[10px] font-semibold fill-slate-500 tracking-wider">
          <text x="82" y="38">ANATOMICAL RIGHT</text>
          <text x="262" y="38">ANATOMICAL LEFT</text>
        </g>

        {/* Render 16 Interactive Anatomical Zones */}
        {RENDER_ORDER.map((zoneId) => {
          const shape = ZONE_SVG_PATHS[zoneId];
          const cov = coverageStates?.[zoneId];
          const ratio = cov?.coverageRatio ?? 0;
          const isCovered = cov?.isCovered ?? false;
          const isCurrentGuided = activeStepZones.includes(zoneId);
          const isSelected = selectedZoneId === zoneId;

          // Compute fill & stroke based on mode
          let fillColor = '#f8fafc';
          let fillOpacity = 0.85;
          let strokeColor = '#94a3b8';
          let strokeWidth = 1.4;

          if (mode === 'coverage') {
            if (isCovered) {
              fillColor = '#0d9488'; // Teal-600
              fillOpacity = 0.72;
              strokeColor = '#0f766e';
              strokeWidth = 1.8;
            } else if (ratio > 0.05) {
              fillColor = '#2dd4bf'; // Teal-400 partial progress
              fillOpacity = 0.25 + ratio * 0.45;
              strokeColor = '#0d9488';
            } else if (isCurrentGuided) {
              fillColor = '#ccfbf1'; // Teal-100 guided highlight
              fillOpacity = 0.7;
              strokeColor = '#0d9488';
              strokeWidth = 2.2;
            }
          } else if (mode === 'gap_review') {
            if (!isCovered) {
              fillColor = '#fef3c7'; // Amber-100 missed gap
              fillOpacity = 0.9;
              strokeColor = '#d97706';
              strokeWidth = 2.2;
            } else {
              fillColor = '#ccfbf1';
              fillOpacity = 0.55;
              strokeColor = '#0d9488';
            }
          } else if (mode === 'findings') {
            fillColor = isSelected ? '#ccfbf1' : '#f8fafc';
            strokeColor = isSelected ? '#0f766e' : '#cbd5e1';
            strokeWidth = isSelected ? 2.5 : 1.3;
          }

          if (isSelected) {
            strokeColor = '#0f172a';
            strokeWidth = 2.5;
          }

          return (
            <g
              key={zoneId}
              className="cursor-pointer transition-all duration-150 hover:opacity-95"
              onClick={() => onZoneSelect?.(zoneId)}
            >
              <path
                d={shape.d}
                fill={fillColor}
                fillOpacity={fillOpacity}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
              />
              {/* Show percentage or checkmark in coverage mode */}
              {mode === 'coverage' && ratio > 0 && (
                <text
                  x={shape.labelPos.x}
                  y={shape.labelPos.y}
                  textAnchor="middle"
                  className={`text-[8.5px] font-bold pointer-events-none ${
                    isCovered ? 'fill-white' : 'fill-teal-900'
                  }`}
                >
                  {isCovered ? '✓' : `${Math.round(ratio * 100)}%`}
                </text>
              )}
              {mode === 'gap_review' && !isCovered && (
                <text
                  x={shape.labelPos.x}
                  y={shape.labelPos.y}
                  textAnchor="middle"
                  className="text-[8px] font-bold fill-amber-900 pointer-events-none"
                >
                  Missed
                </text>
              )}
            </g>
          );
        })}

        {/* Plot Findings Pins when Findings are passed */}
        {findingsAnalyses.map((item, idx) => {
          const zMeta = ANATOMICAL_ZONES.find((z) => z.id === item.finding.zoneId);
          if (!zMeta) return null;
          const shape = ZONE_SVG_PATHS[item.finding.zoneId];
          // Slight offset if multiple findings share a zone
          const offsetX = (idx % 2 === 0 ? 1 : -1) * (idx * 3);
          const pinX = shape.labelPos.x + offsetX;
          const pinY = shape.labelPos.y - 2;

          const isPriority =
            item.status === 'persisting_across_cycle' || item.status === 'red_flag_clinical_priority';
          const isLuteal = item.status === 'luteal_phase_observation_recheck_scheduled';

          const pinFill = isPriority ? '#e11d48' : isLuteal ? '#d97706' : '#0d9488';

          return (
            <g
              key={item.finding.id}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onZoneSelect?.(item.finding.zoneId);
              }}
            >
              {isPriority && (
                <circle
                  cx={pinX}
                  cy={pinY}
                  r="12"
                  fill={pinFill}
                  fillOpacity="0.22"
                  className="animate-ping"
                />
              )}
              <circle cx={pinX} cy={pinY} r="8" fill={pinFill} stroke="#ffffff" strokeWidth="1.8" />
              <text
                x={pinX}
                y={pinY + 3}
                textAnchor="middle"
                className="text-[8.5px] font-bold fill-white pointer-events-none"
              >
                {idx + 1}
              </text>
            </g>
          );
        })}

        {/* Live Finger-Pad Palpation Cursor (Abstract Avatar Feedback, Never Video) */}
        {fingerSvg && (
          <g className="pointer-events-none">
            <circle
              cx={fingerSvg.x}
              cy={fingerSvg.y}
              r="18"
              fill="#14b8a6"
              fillOpacity="0.22"
              stroke="#0d9488"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
            <circle cx={fingerSvg.x} cy={fingerSvg.y} r="6" fill="#0f766e" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    </div>
  );
};
