import {
  AnatomicalZoneId,
  ANATOMICAL_ZONES,
  ExamSessionRecord,
  FindingRecord,
  FINDING_TYPE_LABELS,
  PersistenceAnalysis,
} from '../types/schema';

// Adjacency map so a finding logged in the same or immediately adjacent zone on the same side counts as correlated
const ADJACENT_ZONES: Record<AnatomicalZoneId, AnatomicalZoneId[]> = {
  right_upper_outer: ['right_upper_outer', 'right_central_nipple', 'right_tail_of_spence', 'right_lower_outer', 'right_upper_inner'],
  right_upper_inner: ['right_upper_inner', 'right_central_nipple', 'right_upper_outer', 'right_lower_inner', 'right_clavicle'],
  right_lower_outer: ['right_lower_outer', 'right_central_nipple', 'right_upper_outer', 'right_lower_inner'],
  right_lower_inner: ['right_lower_inner', 'right_central_nipple', 'right_upper_inner', 'right_lower_outer'],
  right_central_nipple: ['right_central_nipple', 'right_upper_outer', 'right_upper_inner', 'right_lower_outer', 'right_lower_inner'],
  right_tail_of_spence: ['right_tail_of_spence', 'right_upper_outer', 'right_axilla'],
  right_axilla: ['right_axilla', 'right_tail_of_spence'],
  right_clavicle: ['right_clavicle', 'right_upper_inner', 'right_upper_outer'],

  left_upper_outer: ['left_upper_outer', 'left_central_nipple', 'left_tail_of_spence', 'left_lower_outer', 'left_upper_inner'],
  left_upper_inner: ['left_upper_inner', 'left_central_nipple', 'left_upper_outer', 'left_lower_inner', 'left_clavicle'],
  left_lower_outer: ['left_lower_outer', 'left_central_nipple', 'left_upper_outer', 'left_lower_inner'],
  left_lower_inner: ['left_lower_inner', 'left_central_nipple', 'left_upper_inner', 'left_lower_outer'],
  left_central_nipple: ['left_central_nipple', 'left_upper_outer', 'left_upper_inner', 'left_lower_outer', 'left_lower_inner'],
  left_tail_of_spence: ['left_tail_of_spence', 'left_upper_outer', 'left_axilla'],
  left_axilla: ['left_axilla', 'left_tail_of_spence'],
  left_clavicle: ['left_clavicle', 'left_upper_inner', 'left_upper_outer'],
};

export function areZonesCorrelated(z1: AnatomicalZoneId, z2: AnatomicalZoneId): boolean {
  return ADJACENT_ZONES[z1]?.includes(z2) ?? z1 === z2;
}

export function getZoneLabel(zoneId: AnatomicalZoneId): string {
  return ANATOMICAL_ZONES.find((z) => z.id === zoneId)?.label ?? zoneId;
}

export function getZoneShortLabel(zoneId: AnatomicalZoneId): string {
  return ANATOMICAL_ZONES.find((z) => z.id === zoneId)?.shortLabel ?? zoneId;
}

export function analyzeFindingsPersistence(
  findings: FindingRecord[],
  exams: ExamSessionRecord[]
): PersistenceAnalysis[] {
  // Sort exams chronologically ascending
  const sortedExams = [...exams].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const examIndexMap = new Map<string, number>();
  sortedExams.forEach((e, idx) => examIndexMap.set(e.id, idx));

  const latestExamIdx = sortedExams.length - 1;

  // Sort findings newest first for display
  const sortedFindings = [...findings].sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  return sortedFindings.map((finding) => {
    const typeMeta = FINDING_TYPE_LABELS[finding.symptomType];
    const currentExamIdx = examIndexMap.get(finding.examId) ?? -1;

    // Find all historical findings in the same or adjacent zone on the same side
    const matchingChain = findings.filter(
      (other) =>
        other.side === finding.side &&
        areZonesCorrelated(finding.zoneId, other.zoneId) &&
        other.dateISO <= finding.dateISO
    );

    // Count distinct exams up to this finding's date
    const distinctExamIds = Array.from(new Set(matchingChain.map((f) => f.examId)));
    const consecutiveMonths = distinctExamIds.length;

    // Check if there is a newer exam after this finding where this zone WAS covered, and no correlated finding was logged
    const newerExams = sortedExams.filter((e) => e.dateISO > finding.dateISO);
    const hasSubsequentFinding = findings.some(
      (other) =>
        other.dateISO > finding.dateISO &&
        other.side === finding.side &&
        areZonesCorrelated(finding.zoneId, other.zoneId)
    );

    // Rule 1: Immediate clinical priority nudges (skin dimpling/redness or nipple inversion/discharge)
    if (typeMeta.isImmediateFlag) {
      return {
        finding,
        status: 'red_flag_clinical_priority',
        badgeText: 'Priority Clinical Discussion',
        clinicalRationale:
          'Skin changes (dimpling, redness) or nipple changes (inversion, discharge) warrant prompt discussion with a clinician regardless of cycle day.',
        severityLevel: 'priority_consult',
        consecutiveMonths,
      };
    }

    // Rule 2: Finding was logged in an earlier month, and in a subsequent exam it was NOT noted
    if (newerExams.length > 0 && !hasSubsequentFinding && currentExamIdx < latestExamIdx) {
      const wasLuteal = finding.cyclePhase === 'luteal';
      return {
        finding,
        status: 'not_noted_subsequent_month',
        badgeText: wasLuteal ? 'Not Noted at Subsequent Baseline' : 'Not Noted in Subsequent Check',
        clinicalRationale: wasLuteal
          ? 'Originally logged during the luteal phase (when progesterone elevates tissue fullness) and was not noted during the subsequent post-period baseline check.'
          : 'Observed in an earlier check and was not noted in the following check.',
        severityLevel: 'neutral_log',
        consecutiveMonths: 1,
      };
    }

    // Rule 3: Persisting across 2 or more exams (especially across a full menstrual cycle)
    if (consecutiveMonths >= 2) {
      const spansBaseline = matchingChain.some((f) => f.cyclePhase === 'follicular_baseline');
      return {
        finding,
        status: 'persisting_across_cycle',
        badgeText: `Persisting (${consecutiveMonths} Consecutive Checks)`,
        clinicalRationale: spansBaseline
          ? `Observed in the same or adjacent zone across ${consecutiveMonths} checks, including during the post-period follicular baseline window. Persistent findings across a full cycle are worth discussing with a healthcare professional.`
          : `Observed in ${consecutiveMonths} consecutive checks in the ${getZoneShortLabel(finding.zoneId)} region. Worth sharing with a clinician.`,
        severityLevel: 'discuss_at_visit',
        consecutiveMonths,
      };
    }

    // Rule 4: Single observation logged during the Luteal Phase -> schedule a post-period baseline re-check
    if (finding.cyclePhase === 'luteal' && (finding.symptomType === 'tenderness' || finding.symptomType === 'thickening' || finding.symptomType === 'lump')) {
      return {
        finding,
        status: 'luteal_phase_observation_recheck_scheduled',
        badgeText: 'Logged in Luteal Phase — Baseline Re-Check Scheduled',
        clinicalRationale:
          'Logged during the luteal phase when progesterone frequently causes temporary breast fullness or tenderness. Scheduled for a targeted re-check during your next post-period baseline window (Days 7–12).',
        severityLevel: 'scheduled_recheck',
        consecutiveMonths: 1,
      };
    }

    // Rule 5: First-time observation during baseline or mid-cycle
    return {
      finding,
      status: 'single_observation',
      badgeText: 'First Observation — Track Next Cycle',
      clinicalRationale:
        'Recorded at baseline. If this spot persists into your next monthly check or changes noticeably, schedule a clinical discussion.',
      severityLevel: finding.symptomType === 'lump' ? 'discuss_at_visit' : 'scheduled_recheck',
      consecutiveMonths: 1,
    };
  });
}
