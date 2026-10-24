import { jsPDF } from 'jspdf';
import {
  ANATOMICAL_ZONES,
  CycleHealthLog,
  ExamSessionRecord,
  FINDING_TYPE_LABELS,
  PersistenceAnalysis,
  UserProfile,
} from '../types/schema';
import { getZoneShortLabel } from './persistenceEngine';

export function generateClinicianSummaryPDF(
  profile: UserProfile,
  exams: ExamSessionRecord[],
  analyses: PersistenceAnalysis[],
  cycleLogs: CycleHealthLog[]
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  let y = 14;

  // 1. Header Banner
  doc.setFillColor(19, 78, 74); // Deep Teal
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('CLINICAL HANDOFF SUMMARY — PATIENT-RECORDED OBSERVATIONS', 12, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'DISCLAIMER: Patient-recorded breast self-awareness & menstrual cycle timing log for clinical discussion only. Not a diagnostic tool.',
    12,
    17.5
  );

  y = 31;

  // 2. Patient & Cycle Context Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, y, 186, 26, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('1. Patient Baseline & Hormonal Cycle Context', 16, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const modeText =
    profile.trackingMode === 'non_cycling_anchor'
      ? `Non-Cycling / Steady Anchor Mode (Day ${profile.monthlyAnchorDay} of month)`
      : `Cycling (${profile.typicalCycleLength}-day typical cycle, ${profile.typicalPeriodLength}-day menses; Last LMP: ${profile.lastPeriodStartISO})`;

  doc.text(`Age Range: ${profile.ageRange} yrs`, 16, y + 12);
  doc.text(`Cycle Context: ${modeText}`, 68, y + 12);
  doc.text(`Recorded Checks: ${exams.length} sessions | Total Logged Observations: ${analyses.length}`, 16, y + 17.5);

  const baselineNote = profile.personalBaselineNote
    ? `Personal Baseline Note: "${profile.personalBaselineNote.slice(0, 110)}"`
    : 'Personal Baseline Note: None recorded.';
  doc.setTextColor(71, 85, 105);
  doc.text(baselineNote, 16, y + 23);

  y += 32;

  // 3. Visual Anatomical Map + Legend (Side by Side)
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(12, y, 186, 56, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('2. Anatomical Zone Map (Clinical View: Patient Right vs. Patient Left)', 16, y + 6);

  // Draw Right Breast Diagram (Left side of box)
  const rCenterX = 52;
  const lCenterX = 112;
  const centerY = y + 33;
  const moundRadius = 15;

  // Labels
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('PATIENT RIGHT', rCenterX - 11, y + 13);
  doc.text('PATIENT LEFT', lCenterX - 10, y + 13);

  // Draw breast circles, crosshairs, clavicle & axilla boxes
  [rCenterX, lCenterX].forEach((cx, idx) => {
    const isRight = idx === 0;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    // Main breast circle
    doc.circle(cx, centerY, moundRadius, 'S');
    // Inner central areola circle
    doc.circle(cx, centerY, 4, 'S');
    // Quadrant crosshairs
    doc.line(cx - moundRadius, centerY, cx + moundRadius, centerY);
    doc.line(cx, centerY - moundRadius, cx, centerY + moundRadius);

    // Clavicle zone (above)
    doc.roundedRect(cx - 10, centerY - 21, 20, 4.5, 1, 1, 'S');
    doc.setFontSize(6);
    doc.text('Clavicle', cx - 4, centerY - 18);

    // Axilla / Tail zone (outer upper corner)
    const axX = isRight ? cx - 24 : cx + 16;
    doc.roundedRect(axX, centerY - 16, 8, 11, 1, 1, 'S');
    doc.text('Axilla', axX + 1, centerY - 10);
  });

  // Plot numbered pins for each finding
  analyses.slice(0, 8).forEach((item, index) => {
    const f = item.finding;
    const zoneMeta = ANATOMICAL_ZONES.find((z) => z.id === f.zoneId);
    const isRight = f.side === 'right';
    const baseCx = isRight ? rCenterX : lCenterX;

    let pinX = baseCx;
    let pinY = centerY;

    if (zoneMeta) {
      if (f.zoneId.endsWith('upper_outer')) {
        pinX = isRight ? baseCx - 7 : baseCx + 7;
        pinY = centerY - 7;
      } else if (f.zoneId.endsWith('upper_inner')) {
        pinX = isRight ? baseCx + 7 : baseCx - 7;
        pinY = centerY - 7;
      } else if (f.zoneId.endsWith('lower_outer')) {
        pinX = isRight ? baseCx - 7 : baseCx + 7;
        pinY = centerY + 7;
      } else if (f.zoneId.endsWith('lower_inner')) {
        pinX = isRight ? baseCx + 7 : baseCx - 7;
        pinY = centerY + 7;
      } else if (f.zoneId.endsWith('tail_of_spence') || f.zoneId.endsWith('axilla')) {
        pinX = isRight ? baseCx - 20 : baseCx + 20;
        pinY = centerY - 11;
      } else if (f.zoneId.endsWith('clavicle')) {
        pinX = baseCx;
        pinY = centerY - 19;
      }
    }

    // Offset slightly if multiple findings in same zone
    pinX += (index % 2 === 0 ? 1 : -1) * (index * 0.8);

    // Color by persistence severity
    if (item.status === 'persisting_across_cycle' || item.status === 'red_flag_clinical_priority') {
      doc.setFillColor(225, 29, 72); // Rose-600
    } else if (item.status === 'luteal_phase_observation_recheck_scheduled') {
      doc.setFillColor(217, 119, 6); // Amber-600
    } else {
      doc.setFillColor(13, 148, 136); // Teal-600
    }

    doc.circle(pinX, pinY, 2.7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(String(index + 1), pinX - 1, pinY + 1);
  });

  // Map Legend on Right Side of Box
  const legX = 142;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Pin Legend & Cycle Filter:', legX, y + 14);

  doc.setFillColor(225, 29, 72);
  doc.circle(legX + 2, y + 20, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Persisting >=2 Checks / Priority', legX + 6, y + 21);

  doc.setFillColor(217, 119, 6);
  doc.circle(legX + 2, y + 27, 2, 'F');
  doc.text('Logged in Luteal Phase (Re-check)', legX + 6, y + 28);

  doc.setFillColor(13, 148, 136);
  doc.circle(legX + 2, y + 34, 2, 'F');
  doc.text('Not Noted at Next Baseline / Single', legX + 6, y + 35);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.text(
    'Note: Baseline window is Days 7–12\npost-menses when hormonal nodularity\nis lowest.',
    legX,
    y + 43
  );

  y += 62;

  // 4. Longitudinal Findings Table
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('3. Longitudinal Patient-Recorded Observations (Newest First)', 12, y);
  y += 3;

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(12, y, 186, 7, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('#', 14, y + 4.8);
  doc.text('Date & Cycle Day', 21, y + 4.8);
  doc.text('Anatomical Zone (Clock)', 55, y + 4.8);
  doc.text('Symptom Type', 98, y + 4.8);
  doc.text('Persistence & Cycle Status', 132, y + 4.8);
  y += 7;

  if (analyses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('No specific focal findings logged across recorded sessions.', 16, y + 6);
    y += 12;
  } else {
    analyses.slice(0, 6).forEach((item, idx) => {
      const f = item.finding;
      const rowHeight = 12.5;
      doc.setDrawColor(226, 232, 240);
      doc.line(12, y + rowHeight, 198, y + rowHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(String(idx + 1), 14, y + 4.5);

      doc.setFont('helvetica', 'normal');
      const phaseShort =
        f.cyclePhase === 'follicular_baseline'
          ? 'Baseline (Post-Period)'
          : f.cyclePhase === 'luteal'
          ? 'Luteal (Pre-Period)'
          : f.cyclePhase;
      doc.text(`${f.dateISO}`, 21, y + 4.5);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(6.8);
      doc.text(`Day ${f.cycleDay ?? '-'} (${phaseShort})`, 21, y + 8.8);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(7.5);
      const clockText = f.clockHour ? ` (${f.clockHour} o'clock)` : '';
      doc.text(`${getZoneShortLabel(f.zoneId)}${clockText}`, 55, y + 4.5);
      if (f.isBilateral) {
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(6.8);
        doc.text('Bilateral symmetry noted', 55, y + 8.8);
      }

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(7.5);
      doc.text(FINDING_TYPE_LABELS[f.symptomType].label.slice(0, 22), 98, y + 4.5);

      // Persistence status
      if (item.status === 'persisting_across_cycle' || item.status === 'red_flag_clinical_priority') {
        doc.setTextColor(190, 18, 60);
        doc.setFont('helvetica', 'bold');
      } else if (item.status === 'luteal_phase_observation_recheck_scheduled') {
        doc.setTextColor(180, 83, 9);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(15, 118, 110);
        doc.setFont('helvetica', 'normal');
      }
      doc.text(item.badgeText.slice(0, 38), 132, y + 4.5);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      const noteText = f.userNote ? `Note: "${f.userNote.slice(0, 62)}"` : '';
      doc.text(noteText, 98, y + 9.2);

      y += rowHeight;
    });
  }

  y += 6;

  // 5. Coverage History & Menstrual Health Correlation Summary
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, y, 186, 36, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('4. Self-Check Coverage History & Suggested Questions for Your Clinician', 16, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  const recentExamsSummary = exams
    .slice(0, 4)
    .map((e) => `${e.dateISO} (${e.coveragePercent}% zone coverage, Day ${e.cycleDay ?? '-'})`)
    .join('  •  ');
  doc.text(`Recent Check Sessions: ${recentExamsSummary || 'None logged yet'}`, 16, y + 12);

  const periodStarts = cycleLogs
    .filter((c) => c.isPeriodStart)
    .slice(0, 4)
    .map((c) => c.dateISO)
    .join(', ');
  doc.text(`Recorded Period Start Dates (Health Log): ${periodStarts || 'N/A'}`, 16, y + 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(19, 78, 74);
  doc.text('Prompts for the Consultation:', 16, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(
    '• "I tracked this spot across my menstrual cycle, including my post-period baseline window (Days 7–12). Can we examine this quadrant?"',
    16,
    y + 29
  );
  doc.text(
    '• "Based on my age range and family/personal history, what clinical breast exam or mammography schedule do you recommend?"',
    16,
    y + 33.5
  );

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated locally on-device by Baseline Breast & Cycle Health Tracker on ${new Date().toISOString().split('T')[0]}. Zero cloud images or video stored.`,
    12,
    290
  );

  doc.save(`Baseline_Clinician_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
}
