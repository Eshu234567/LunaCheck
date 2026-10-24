import { CyclePhase, UserProfile } from '../types/schema';

export interface CycleWindowInfo {
  currentCycleDay?: number;
  phase: CyclePhase;
  phaseTitle: string;
  hormonalSummary: string;
  breastTissueState: string;
  isOptimalCheckWindow: boolean;
  optimalWindowStartISO: string;
  optimalWindowEndISO: string;
  daysUntilOptimalWindow: number;
  recommendationBanner: string;
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function diffDays(fromISO: string, toISO: string): number {
  const d1 = new Date(fromISO + 'T00:00:00').getTime();
  const d2 = new Date(toISO + 'T00:00:00').getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function evaluateCycleAtDate(profile: UserProfile, targetDateISO: string): CycleWindowInfo {
  if (profile.trackingMode === 'non_cycling_anchor') {
    const targetDate = new Date(targetDateISO + 'T00:00:00');
    const dayOfMonth = targetDate.getDate();
    const anchor = profile.monthlyAnchorDay || 1;
    const isOptimal = Math.abs(dayOfMonth - anchor) <= 2;

    const currentMonthAnchor = new Date(targetDate.getFullYear(), targetDate.getMonth(), anchor);
    let nextAnchor = currentMonthAnchor;
    if (dayOfMonth > anchor + 2) {
      nextAnchor = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, anchor);
    }
    const anchorISO = nextAnchor.toISOString().split('T')[0];
    const daysUntil = Math.max(0, diffDays(targetDateISO, anchorISO));

    return {
      phase: 'non_cycling',
      phaseTitle: 'Steady Monthly Anchor Mode',
      hormonalSummary: 'Non-cycling / steady baseline mode (ideal for menopause, hormonal IUD, or irregular cycles).',
      breastTissueState: 'Consistent monthly anchor date ensures reliable month-to-month comparisons.',
      isOptimalCheckWindow: isOptimal,
      optimalWindowStartISO: anchorISO,
      optimalWindowEndISO: addDays(anchorISO, 3),
      daysUntilOptimalWindow: isOptimal ? 0 : daysUntil,
      recommendationBanner: isOptimal
        ? `Today is within your monthly anchor window (Day ${anchor} of the month)—ideal for your routine self-awareness check.`
        : `Your consistent monthly check anchor is around Day ${anchor} (${daysUntil} days away).`,
    };
  }

  const cycleLen = profile.typicalCycleLength || 28;
  const periodLen = profile.typicalPeriodLength || 5;
  const rawDiff = diffDays(profile.lastPeriodStartISO, targetDateISO);

  // Modulo arithmetic so even past or future dates map cleanly to a cycle day (1-based)
  const modDiff = ((rawDiff % cycleLen) + cycleLen) % cycleLen;
  const cycleDay = modDiff + 1;

  // Optimal post-period baseline window: Day (periodLen + 2) to Day (periodLen + 7), typically Days 7 to 12
  const optStartDay = periodLen + 2;
  const optEndDay = Math.min(periodLen + 7, 13);

  // Determine current cycle start for targetDateISO
  const currentCycleStartISO = addDays(targetDateISO, -(cycleDay - 1));
  let optStartISO = addDays(currentCycleStartISO, optStartDay - 1);
  let optEndISO = addDays(currentCycleStartISO, optEndDay - 1);

  let daysUntilOptimal = 0;
  if (cycleDay < optStartDay) {
    daysUntilOptimal = optStartDay - cycleDay;
  } else if (cycleDay > optEndDay) {
    daysUntilOptimal = cycleLen - cycleDay + optStartDay;
    optStartISO = addDays(currentCycleStartISO, cycleLen + optStartDay - 1);
    optEndISO = addDays(currentCycleStartISO, cycleLen + optEndDay - 1);
  }

  if (cycleDay <= periodLen) {
    return {
      currentCycleDay: cycleDay,
      phase: 'menstrual',
      phaseTitle: `Menstrual Phase (Day ${cycleDay})`,
      hormonalSummary: 'Estrogen and progesterone drop sharply at the start of menstruation.',
      breastTissueState: 'Pre-period swelling and tenderness are beginning to subside, though some residual sensitivity may linger.',
      isOptimalCheckWindow: false,
      optimalWindowStartISO: optStartISO,
      optimalWindowEndISO: optEndISO,
      daysUntilOptimalWindow: daysUntilOptimal,
      recommendationBanner: `Day ${cycleDay} of cycle: Hormones are resetting. Your optimal post-period baseline window opens in ${daysUntilOptimal} day${daysUntilOptimal === 1 ? '' : 's'} (Days ${optStartDay}–${optEndDay}).`,
    };
  }

  if (cycleDay >= optStartDay && cycleDay <= optEndDay) {
    return {
      currentCycleDay: cycleDay,
      phase: 'follicular_baseline',
      phaseTitle: `Follicular Baseline Window (Day ${cycleDay})`,
      hormonalSummary: 'Estrogen and progesterone are at their quietest post-period baseline.',
      breastTissueState: 'Breast tissue is least swollen, least tender, and least nodular—providing your clearest personal baseline.',
      isOptimalCheckWindow: true,
      optimalWindowStartISO: optStartISO,
      optimalWindowEndISO: optEndISO,
      daysUntilOptimalWindow: 0,
      recommendationBanner: `Optimal Baseline Window (Day ${cycleDay}): Hormone-driven fullness is at its lowest right now. Ideal day for your monthly self-awareness check.`,
    };
  }

  if (cycleDay <= 16) {
    return {
      currentCycleDay: cycleDay,
      phase: 'mid_cycle',
      phaseTitle: `Mid-Cycle Hormone Transition (Day ${cycleDay})`,
      hormonalSummary: 'Estrogen peaks mid-cycle before progesterone begins its rise.',
      breastTissueState: 'Tissue remains relatively calm, though mild glandular sensitivity can begin as hormones shift.',
      isOptimalCheckWindow: false,
      optimalWindowStartISO: optStartISO,
      optimalWindowEndISO: optEndISO,
      daysUntilOptimalWindow: daysUntilOptimal,
      recommendationBanner: `Day ${cycleDay} (Mid-Cycle): You can perform a check anytime, though your quietest post-period baseline window is Days ${optStartDay}–${optEndDay}.`,
    };
  }

  // Luteal phase (Days 17+)
  return {
    currentCycleDay: cycleDay,
    phase: 'luteal',
    phaseTitle: `Luteal Phase (Day ${cycleDay})`,
    hormonalSummary: 'Progesterone dominates during the 1–2 weeks before menstruation, stimulating milk ducts and fluid retention.',
    breastTissueState: 'Temporary hormonal fullness, cobble-stone nodularity, and bilateral tenderness (cyclical mastalgia) are very common now.',
    isOptimalCheckWindow: false,
    optimalWindowStartISO: optStartISO,
    optimalWindowEndISO: optEndISO,
    daysUntilOptimalWindow: daysUntilOptimal,
    recommendationBanner: `Day ${cycleDay} (Luteal Phase): Progesterone often causes temporary breast lumpiness or tenderness right now. Anything you log today will be scheduled for a baseline re-check ${daysUntilOptimal} days from now (Days ${optStartDay}–${optEndDay}).`,
  };
}

export function getPhaseBadgeStyle(phase: CyclePhase): { bg: string; text: string; border: string; label: string } {
  switch (phase) {
    case 'follicular_baseline':
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-800',
        border: 'border-teal-200',
        label: 'Follicular Baseline Window',
      };
    case 'menstrual':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-200',
        label: 'Menstrual Phase',
      };
    case 'mid_cycle':
      return {
        bg: 'bg-sky-50',
        text: 'text-sky-800',
        border: 'border-sky-200',
        label: 'Mid-Cycle Transition',
      };
    case 'luteal':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-900',
        border: 'border-amber-200',
        label: 'Luteal Phase (High Progesterone)',
      };
    case 'non_cycling':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-800',
        border: 'border-slate-300',
        label: 'Monthly Anchor Mode',
      };
  }
}
