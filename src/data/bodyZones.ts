import { BodyZone, BreastSide, Quadrant } from '../types';

// Helper to determine clinical quadrant from clock position and side
export function getQuadrant(side: BreastSide, clock: number): Quadrant {
  if (side === 'right') {
    // Patient right: Lateral is 8:00 - 11:00 (toward right shoulder/armpit)
    // Medial (toward sternum) is 1:00 - 4:00
    if (clock === 9 || clock === 10 || clock === 11) return 'Upper Outer Quadrant (UOQ)';
    if (clock === 12 || clock === 1 || clock === 2) return 'Upper Inner Quadrant (UIQ)';
    if (clock === 3 || clock === 4 || clock === 5) return 'Lower Inner Quadrant (LIQ)';
    return 'Lower Outer Quadrant (LOQ)'; // 6, 7, 8
  } else {
    // Patient left: Lateral is 1:00 - 4:00 (toward left shoulder/armpit)
    // Medial (toward sternum) is 8:00 - 11:00
    if (clock === 1 || clock === 2 || clock === 3) return 'Upper Outer Quadrant (UOQ)';
    if (clock === 10 || clock === 11 || clock === 12) return 'Upper Inner Quadrant (UIQ)';
    if (clock === 7 || clock === 8 || clock === 9) return 'Lower Inner Quadrant (LIQ)';
    return 'Lower Outer Quadrant (LOQ)'; // 4, 5, 6
  }
}

// Convert clock (1-12) to polar angle in radians
// 12 o'clock is -PI/2 (top), 3 o'clock is 0 (right), 6 o'clock is PI/2 (bottom), 9 o'clock is PI (left)
export function clockToAngle(clock: number): number {
  return ((clock - 3) * 30 * Math.PI) / 180;
}

// Generate an SVG path for an annular sector between rInner and rOuter from clockStart to clockEnd
export function createAnnularSectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  clockStart: number,
  clockEnd: number
): string {
  const aStart = clockToAngle(clockStart);
  const aEnd = clockToAngle(clockEnd);

  // Slight padding between sectors for beautiful medical grid aesthetics
  const pad = 0.02; // in radians
  const startAng = aStart + pad;
  const endAng = aEnd - pad;

  const x1 = cx + rOuter * Math.cos(startAng);
  const y1 = cy + rOuter * Math.sin(startAng);
  const x2 = cx + rOuter * Math.cos(endAng);
  const y2 = cy + rOuter * Math.sin(endAng);

  const x3 = cx + rInner * Math.cos(endAng);
  const y3 = cy + rInner * Math.sin(endAng);
  const x4 = cx + rInner * Math.cos(startAng);
  const y4 = cy + rInner * Math.sin(startAng);

  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 0 ${x4} ${y4} Z`;
}

// Build 108 predefined anatomical zones
function buildZones(): BodyZone[] {
  const zones: BodyZone[] = [];

  const breastCenters = {
    right: { cx: 195, cy: 340 },
    left: { cx: 445, cy: 340 },
  };

  const ringRadii = [
    { ring: 1, name: 'Periareolar', rInner: 20, rOuter: 44 },
    { ring: 2, name: 'Inner-Mid', rInner: 46, rOuter: 70 },
    { ring: 3, name: 'Outer-Mid', rInner: 72, rOuter: 96 },
    { ring: 4, name: 'Peripheral', rInner: 98, rOuter: 120 },
  ];

  const sides: BreastSide[] = ['right', 'left'];

  // 1. Areola / Nipple complex (Center zones)
  sides.forEach((side) => {
    const center = breastCenters[side];
    const sidePrefix = side === 'right' ? 'R' : 'L';
    const sideLabel = side === 'right' ? 'Right' : 'Left';

    zones.push({
      id: `${sidePrefix}-AREOLA`,
      side,
      region: 'areola',
      name: `${sideLabel} Nipple / Areola Complex`,
      quadrant: 'Areola / Nipple Complex',
      cx: center.cx,
      cy: center.cy,
      radius: 18,
      svgPath: `M ${center.cx - 18} ${center.cy} A 18 18 0 1 0 ${center.cx + 18} ${center.cy} A 18 18 0 1 0 ${center.cx - 18} ${center.cy}`,
    });
  });

  // 2. Concentric clock zones (48 per breast = 96 zones)
  sides.forEach((side) => {
    const center = breastCenters[side];
    const sidePrefix = side === 'right' ? 'R' : 'L';
    const sideLabel = side === 'right' ? 'Right' : 'Left';

    ringRadii.forEach(({ ring, name: ringName, rInner, rOuter }) => {
      for (let clock = 1; clock <= 12; clock++) {
        const quadrant = getQuadrant(side, clock);
        const clockStart = clock - 0.5;
        const clockEnd = clock + 0.5;

        // Midpoint coordinates for pointer hit-testing and label anchoring
        const midAngle = clockToAngle(clock);
        const midR = (rInner + rOuter) / 2;
        const zoneCx = center.cx + midR * Math.cos(midAngle);
        const zoneCy = center.cy + midR * Math.sin(midAngle);

        const svgPath = createAnnularSectorPath(center.cx, center.cy, rInner, rOuter, clockStart, clockEnd);

        zones.push({
          id: `${sidePrefix}-B-R${ring}-${clock}`,
          side,
          region: 'breast',
          clockPosition: clock,
          ring,
          name: `${sideLabel} Breast ${clock}:00 (${ringName})`,
          quadrant,
          svgPath,
          cx: Math.round(zoneCx),
          cy: Math.round(zoneCy),
          radius: (rOuter - rInner) / 2,
        });
      }
    });
  });

  // 3. Axilla & Axillary Tail of Spence (3 per side = 6 zones)
  const axillaZones = [
    { id: 'R-AX-UPPER', side: 'right' as BreastSide, name: 'Right Axilla (High Underarm)', cx: 70, cy: 195, r: 18 },
    { id: 'R-AX-MID', side: 'right' as BreastSide, name: 'Right Axillary Tail of Spence', cx: 65, cy: 245, r: 20 },
    { id: 'R-AX-LOWER', side: 'right' as BreastSide, name: 'Right Low Axilla / Lateral Wall', cx: 70, cy: 295, r: 18 },
    { id: 'L-AX-UPPER', side: 'left' as BreastSide, name: 'Left Axilla (High Underarm)', cx: 570, cy: 195, r: 18 },
    { id: 'L-AX-MID', side: 'left' as BreastSide, name: 'Left Axillary Tail of Spence', cx: 575, cy: 245, r: 20 },
    { id: 'L-AX-LOWER', side: 'left' as BreastSide, name: 'Left Low Axilla / Lateral Wall', cx: 570, cy: 295, r: 18 },
  ];

  axillaZones.forEach((az) => {
    zones.push({
      id: az.id,
      side: az.side,
      region: 'axilla',
      name: az.name,
      quadrant: 'Axillary Tail of Spence',
      cx: az.cx,
      cy: az.cy,
      radius: az.r,
      svgPath: `M ${az.cx - az.r} ${az.cy} A ${az.r} ${az.r} 0 1 0 ${az.cx + az.r} ${az.cy} A ${az.r} ${az.r} 0 1 0 ${az.cx - az.r} ${az.cy}`,
    });
  });

  // 4. Clavicular / Supraclavicular (2 per side = 4 zones)
  const clavicularZones = [
    { id: 'R-CLAV-LATERAL', side: 'right' as BreastSide, name: 'Right Lateral Supraclavicular', cx: 140, cy: 135, r: 17 },
    { id: 'R-CLAV-MEDIAL', side: 'right' as BreastSide, name: 'Right Medial Infraclavicular', cx: 215, cy: 138, r: 18 },
    { id: 'L-CLAV-MEDIAL', side: 'left' as BreastSide, name: 'Left Medial Infraclavicular', cx: 425, cy: 138, r: 18 },
    { id: 'L-CLAV-LATERAL', side: 'left' as BreastSide, name: 'Left Lateral Supraclavicular', cx: 500, cy: 135, r: 17 },
  ];

  clavicularZones.forEach((cz) => {
    zones.push({
      id: cz.id,
      side: cz.side,
      region: 'clavicular',
      name: cz.name,
      quadrant: 'Supraclavicular / Collarbone',
      cx: cz.cx,
      cy: cz.cy,
      radius: cz.r,
      svgPath: `M ${cz.cx - cz.r} ${cz.cy} A ${cz.r} ${cz.r} 0 1 0 ${cz.cx + cz.r} ${cz.cy} A ${cz.r} ${cz.r} 0 1 0 ${cz.cx - cz.r} ${cz.cy}`,
    });
  });

  return zones;
}

export const ALL_BODY_ZONES: BodyZone[] = buildZones();

// Fast lookup by ID
export const ZONE_MAP: Record<string, BodyZone> = ALL_BODY_ZONES.reduce((acc, zone) => {
  acc[zone.id] = zone;
  return acc;
}, {} as Record<string, BodyZone>);

// Helper to determine routine order steps
export interface RoutineStep {
  stepIndex: number;
  title: string;
  region: string;
  zoneIds: string[];
  instruction: string;
  guidanceTip: string;
  audioPrompt: string;
}

export const GUIDED_ROUTINE_STEPS: RoutineStep[] = [
  {
    stepIndex: 1,
    title: 'Clavicular & Supraclavicular Nodes',
    region: 'Collarbone region',
    zoneIds: ['R-CLAV-LATERAL', 'R-CLAV-MEDIAL', 'L-CLAV-MEDIAL', 'L-CLAV-LATERAL'],
    instruction: 'Gently feel along and above both collarbones using the soft pads of your fingertips.',
    guidanceTip: 'Check for firm, enlarged or persistent lymph nodules along the collarbone ridge.',
    audioPrompt: 'Step 1: Collarbone region. Use the pads of your three middle fingers to gently check above and below both collarbones.',
  },
  {
    stepIndex: 2,
    title: 'Right Axilla & Tail of Spence',
    region: 'Right underarm',
    zoneIds: ['R-AX-UPPER', 'R-AX-MID', 'R-AX-LOWER'],
    instruction: 'Raise your right arm slightly and explore deep into the right armpit and down toward the lateral breast border.',
    guidanceTip: 'Over 50% of glandular breast tissue extends into the axillary tail (armpit).',
    audioPrompt: 'Step 2: Right underarm. Reach up into the hollow of your right armpit and move downward along the outer chest wall.',
  },
  {
    stepIndex: 3,
    title: 'Right Breast — Outer Quadrants',
    region: 'Right outer breast',
    zoneIds: ALL_BODY_ZONES.filter((z) => z.side === 'right' && (z.ring === 4 || z.ring === 3) && (z.clockPosition ? [8, 9, 10, 11, 12].includes(z.clockPosition) : false)).map((z) => z.id),
    instruction: 'Use dime-sized circular motions with light, medium, and firm pressure on the right outer perimeter.',
    guidanceTip: 'Work slowly in small circles. Light pressure checks superficial tissue; firm pressure reaches the ribcage.',
    audioPrompt: 'Step 3: Right outer quadrants. Apply gentle dime-sized circular sweeps around the outer rim of your right breast.',
  },
  {
    stepIndex: 4,
    title: 'Right Breast — Inner Quadrants & Areola',
    region: 'Right inner breast',
    zoneIds: ALL_BODY_ZONES.filter((z) => z.side === 'right' && (!z.ring || z.ring <= 2 || (z.clockPosition ? [1, 2, 3, 4, 5, 6, 7].includes(z.clockPosition) : false))).map((z) => z.id),
    instruction: 'Continue toward the breastbone (sternum) and smoothly check the periareolar region and nipple.',
    guidanceTip: 'Notice firmness, tenderness, or texture changes compared to your baseline.',
    audioPrompt: 'Step 4: Right inner breast and areola. Move steadily toward your breastbone and around the nipple.',
  },
  {
    stepIndex: 5,
    title: 'Left Axilla & Tail of Spence',
    region: 'Left underarm',
    zoneIds: ['L-AX-UPPER', 'L-AX-MID', 'L-AX-LOWER'],
    instruction: 'Raise your left arm and check the hollow of the armpit and the axillary tail down to the chest wall.',
    guidanceTip: 'Use your right hand fingers flat against the left underarm tissue.',
    audioPrompt: 'Step 5: Left underarm. Explore deep into the left armpit and down the outer border.',
  },
  {
    stepIndex: 6,
    title: 'Left Breast — Outer Quadrants',
    region: 'Left outer breast',
    zoneIds: ALL_BODY_ZONES.filter((z) => z.side === 'left' && (z.ring === 4 || z.ring === 3) && (z.clockPosition ? [12, 1, 2, 3, 4].includes(z.clockPosition) : false)).map((z) => z.id),
    instruction: 'Cover the outer perimeter and upper outer quadrant of your left breast with steady circular pads.',
    guidanceTip: 'Take your time. There is no rush; the goal is familiarizing yourself with your normal baseline.',
    audioPrompt: 'Step 6: Left outer quadrants. Sweep smoothly through the upper and lower outer regions.',
  },
  {
    stepIndex: 7,
    title: 'Left Breast — Inner Quadrants & Areola',
    region: 'Left inner breast',
    zoneIds: ALL_BODY_ZONES.filter((z) => z.side === 'left' && (!z.ring || z.ring <= 2 || (z.clockPosition ? [5, 6, 7, 8, 9, 10, 11].includes(z.clockPosition) : false))).map((z) => z.id),
    instruction: 'Complete the routine by checking the inner quadrants toward the sternum and the areola complex.',
    guidanceTip: 'Check also for any visual skin changes, such as dimpling, puckering, or nipple inversion.',
    audioPrompt: 'Step 7: Left inner quadrants and areola. Finish the routine by checking inward toward the sternum.',
  },
];
