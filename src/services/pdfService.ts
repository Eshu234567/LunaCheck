import jsPDF from 'jspdf';
import { CycleProfile, Observation, RoutineSessionRecord, UserProfile, PersonalLogEntry } from '../types';
import { storageService } from './storage';

interface PDFExportOptions {
  user: UserProfile;
  cycle?: CycleProfile;
  observations: Observation[];
  routines: RoutineSessionRecord[];
  personalLogs?: PersonalLogEntry[];
}

export function generateClinicianPDF({ user, observations, routines, personalLogs }: PDFExportOptions): jsPDF {
  const patientLogs: PersonalLogEntry[] = personalLogs || storageService.getPersonalLogs();
  // Create standard portrait document (A4: 210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // --- 1. HEADER SECTION ---
  doc.setFillColor(15, 23, 42); // Navy background for top header bar
  doc.rect(margin, margin, contentWidth, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SALLY — CLINICAL BREAST AWARENESS REPORT', margin + 6, margin + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Structured Longitudinal Patient Observations for Clinical Consultation', margin + 6, margin + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('CLINICAL SUMMARY', pageWidth - margin - 36, margin + 11);

  // --- 2. PATIENT BASELINE & IMPORTANT INFO (NO MENSTRUAL CYCLE) ---
  let y = margin + 22;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 18, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);

  // Column 1: Patient details
  doc.text('Patient Name:', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(user.name || 'Self-Awareness Patient', margin + 28, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Age Bracket:', margin + 4, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${user.ageBracket} years`, margin + 28, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Report Date:', margin + 4, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), margin + 28, y + 15);

  // Column 2: Date of Observation & Routine Coverage
  const col2X = margin + 68;
  const latestObsDate = observations[0]?.date || routines[0]?.date || new Date().toISOString().split('T')[0];
  const avgCov = routines.length
    ? Math.round(routines.reduce((a, b) => a + b.coveragePercentage, 0) / routines.length)
    : 100;

  doc.setFont('helvetica', 'bold');
  doc.text('Date of Observation:', col2X, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(latestObsDate, col2X + 32, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Exam Coverage:', col2X, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${avgCov}% of 108 Zones`, col2X + 32, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Sessions:', col2X, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(`${routines.length || 1} guided check(s)`, col2X + 32, y + 15);

  // Column 3: Important Clinical Info & Findings
  const col3X = margin + 132;
  const persistingCount = observations.filter((o) => o.persistenceStatus === 'Persisting Observation').length;
  doc.setFont('helvetica', 'bold');
  doc.text('Clinical Flags:', col3X, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(persistingCount > 0 ? `${persistingCount} Persisting Flag(s)` : '0 Persisting Findings', col3X + 26, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Marked Areas:', col3X, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${observations.length} Area(s) Reported`, col3X + 26, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Consultation Focus:', col3X, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(observations.length > 0 ? 'Palpable Target Review' : 'Routine Baseline', col3X + 26, y + 15);

  // --- 3. ANATOMICAL QUADRANT SCHEMATIC & FINDINGS MAP ---
  y += 22;
  const diagramHeight = 50;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, diagramHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ANATOMICAL QUADRANT SCHEMATIC & FINDINGS MAP', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Standard Clinical Perspective: Left of diagram is Patient Right; Right of diagram is Patient Left', margin + 4, y + 10);

  const rBreastX = margin + 55;
  const lBreastX = margin + 127;
  const breastY = y + 30;
  const breastRadius = 17;

  // Draw Right Breast
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.circle(rBreastX, breastY, breastRadius, 'S');
  doc.circle(rBreastX, breastY, breastRadius * 0.65, 'S');
  doc.circle(rBreastX, breastY, 3, 'S');

  doc.setDrawColor(203, 213, 225);
  doc.line(rBreastX - breastRadius, breastY, rBreastX + breastRadius, breastY);
  doc.line(rBreastX, breastY - breastRadius, rBreastX, breastY + breastRadius);

  // Draw Left Breast
  doc.setDrawColor(148, 163, 184);
  doc.circle(lBreastX, breastY, breastRadius, 'S');
  doc.circle(lBreastX, breastY, breastRadius * 0.65, 'S');
  doc.circle(lBreastX, breastY, 3, 'S');

  doc.setDrawColor(203, 213, 225);
  doc.line(lBreastX - breastRadius, breastY, lBreastX + breastRadius, breastY);
  doc.line(lBreastX, breastY - breastRadius, lBreastX, breastY + breastRadius);

  // Labels
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('RIGHT BREAST', rBreastX - 12, y + 15);
  doc.text('LEFT BREAST', lBreastX - 10, y + 15);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin + 91, y + 13, margin + 91, y + 47);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Sternum', margin + 86, y + 48);

  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('UOQ (10:00)', rBreastX - breastRadius - 8, breastY - 9);
  doc.text('UIQ (2:00)', rBreastX + breastRadius - 10, breastY - 9);
  doc.text('LOQ (7:00)', rBreastX - breastRadius - 8, breastY + 11);
  doc.text('LIQ (4:00)', rBreastX + breastRadius - 10, breastY + 11);

  doc.text('UIQ (10:00)', lBreastX - breastRadius + 1, breastY - 9);
  doc.text('UOQ (2:00)', lBreastX + breastRadius - 2, breastY - 9);
  doc.text('LIQ (8:00)', lBreastX - breastRadius + 1, breastY + 11);
  doc.text('LOQ (4:00)', lBreastX + breastRadius - 2, breastY + 11);

  // Plot numbered pins
  observations.forEach((obs, index) => {
    const pinNum = index + 1;
    let pinX = obs.side === 'right' ? rBreastX : lBreastX;
    let pinY = breastY;

    if (obs.zoneId.includes('R-B-R3-10') || obs.quadrant.includes('Outer')) {
      pinX = obs.side === 'right' ? rBreastX - 9 : lBreastX + 9;
      pinY = breastY - 6;
    } else if (obs.quadrant.includes('Inner')) {
      pinX = obs.side === 'right' ? rBreastX + 7 : lBreastX - 7;
      pinY = breastY - 5;
    } else if (obs.quadrant.includes('Lower')) {
      pinX = obs.side === 'right' ? rBreastX - 6 : lBreastX + 6;
      pinY = breastY + 6;
    }

    const isPersistent = obs.persistenceStatus === 'Persisting Observation';
    doc.setFillColor(isPersistent ? 225 : 13, isPersistent ? 29 : 148, isPersistent ? 72 : 136);
    doc.circle(pinX, pinY, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text(String(pinNum), pinX - 1, pinY + 1.8);
  });

  // Legend
  const legendX = margin + 155;
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Findings Legend:', legendX, y + 18);

  doc.setFillColor(225, 29, 72);
  doc.circle(legendX + 2, y + 24, 2, 'F');
  doc.text('Persisting finding', legendX + 7, y + 25);

  doc.setFillColor(13, 148, 136);
  doc.circle(legendX + 2, y + 31, 2, 'F');
  doc.text('Reported area finding', legendX + 7, y + 32);

  // --- 4. STRUCTURED FINDINGS TABLE ---
  y += diagramHeight + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('PATIENT OBSERVATIONS & MARKED AREAS LOG', margin, y + 4);

  y += 6;
  const headers = [
    { label: '#', width: 8 },
    { label: 'Date', width: 22 },
    { label: 'Anatomical Location & Quadrant', width: 56 },
    { label: 'Observed Feature & Texture', width: 56 },
    { label: 'Clinical Persistence', width: 40 },
  ];

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 6, 'FD');

  let curX = margin + 2;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  headers.forEach((h) => {
    doc.text(h.label, curX, y + 4.2);
    curX += h.width;
  });

  y += 6;

  // Render Rows (up to 4 rows to keep 1-page layout clean)
  const displayObs = observations.slice(0, 4);
  if (displayObs.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 8, margin + contentWidth, y + 8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No focal abnormalities or marked areas recorded. Comprehensive baseline check normal.', margin + 4, y + 5.5);
    y += 8;
  } else {
    displayObs.forEach((obs, index) => {
      const rowHeight = 10;
      const isAlt = index % 2 === 1;
      if (isAlt) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

      let colX = margin + 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      // 1. #
      doc.text(`[${index + 1}]`, colX, y + 4.5);
      colX += 8;

      // 2. Date
      doc.setFont('helvetica', 'normal');
      doc.text(obs.date, colX, y + 4.5);
      colX += 22;

      // 3. Location & Quadrant
      doc.setFont('helvetica', 'bold');
      doc.text(`${obs.side.toUpperCase()}: ${obs.zoneName}`, colX, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(obs.quadrant, colX, y + 8);
      colX += 56;

      // 4. Feature & Texture
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(obs.category, colX, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`${obs.feel} • ${obs.size}`, colX, y + 8);
      colX += 56;

      // 5. Persistence status
      doc.setFontSize(7);
      const isPersisting = obs.persistenceStatus === 'Persisting Observation';
      if (isPersisting) {
        doc.setTextColor(225, 29, 72);
        doc.setFont('helvetica', 'bold');
        doc.text('PERSISTING (>=2 cycles)', colX, y + 4.5);
      } else {
        doc.setTextColor(13, 148, 136);
        doc.setFont('helvetica', 'normal');
        doc.text('New Finding', colX, y + 4.5);
      }

      y += rowHeight;
    });

    if (observations.length > 4) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `* Note: Showing 4 of ${observations.length} total logged areas. Complete history available in digital timeline.`,
        margin + 2,
        y + 3.5
      );
      y += 5;
    }
  }

  // --- 5. PATIENT PERSONAL JOURNAL & SUBJECTIVE NOTES ---
  y += 4;
  const journalHeight = patientLogs.length > 0 ? 25 : 12;
  doc.setFillColor(255, 248, 250);
  doc.setDrawColor(244, 114, 182);
  doc.rect(margin, y, contentWidth, journalHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(159, 18, 57);
  doc.text('PATIENT PERSONAL JOURNAL & SUBJECTIVE NOTES', margin + 4, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(190, 24, 93);
  doc.text('Self-Recorded Patient Observations', pageWidth - margin - 46, y + 4.5);

  if (patientLogs.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(136, 19, 55);
    doc.text('No subjective symptoms or personal notes recorded. Baseline self-awareness check normal.', margin + 4, y + 9);
    y += journalHeight;
  } else {
    const latestLog = patientLogs[0];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(`Latest Entry (${latestLog.date} at ${latestLog.timestamp}):`, margin + 4, y + 9);

    if (latestLog.markedZoneNames && latestLog.markedZoneNames.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(159, 18, 57);
      const zonesSummary = `Associated Sectors: ${latestLog.markedZoneNames.slice(0, 3).join(', ')}${latestLog.markedZoneNames.length > 3 ? ` (+${latestLog.markedZoneNames.length - 3} more)` : ''}`;
      doc.text(zonesSummary, margin + 55, y + 9);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(`"${latestLog.notes}"`, contentWidth - 8);
    doc.text(noteLines.slice(0, 2), margin + 4, y + 14);

    if (patientLogs.length > 1) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor(156, 163, 175);
      doc.text(`* Showing latest of ${patientLogs.length} saved journal entries. Complete journal history available in app.`, margin + 4, y + 22.5);
    }

    y += journalHeight;
  }

  // --- 6. PHYSICIAN CONSULTATION & CLINICAL EXAMINATION (CBE) BOX ---
  y += 4;
  const cbeHeight = 44;
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, cbeHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('PHYSICIAN CONSULTATION & CLINICAL BREAST EXAMINATION (CBE)', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);

  // Checkboxes
  doc.rect(margin + 4, y + 9, 3, 3);
  doc.text('Bilateral Clinical Breast Examination (CBE) Performed', margin + 10, y + 11.5);

  doc.rect(margin + 90, y + 9, 3, 3);
  doc.text('No Palpable Mass or Skin Retraction Identified', margin + 96, y + 11.5);

  doc.rect(margin + 4, y + 15, 3, 3);
  doc.text('Diagnostic Ultrasound Ordered', margin + 10, y + 17.5);

  doc.rect(margin + 52, y + 15, 3, 3);
  doc.text('Diagnostic Mammography Ordered', margin + 58, y + 17.5);

  doc.rect(margin + 112, y + 15, 3, 3);
  doc.text('Routine Recheck (3-6 Months)', margin + 118, y + 17.5);

  // Clinician notes line
  doc.text('Clinical Assessment / Notes: __________________________________________________________________________________', margin + 4, y + 24);
  doc.text('_____________________________________________________________________________________________________________', margin + 4, y + 29);

  // Signature line
  doc.text('Examining Clinician Signature: __________________________________', margin + 4, y + 38);
  doc.text('Date: ____________________', margin + 125, y + 38);

  // --- 6. FOOTER NOTICE ---
  const footerY = 280;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, footerY, margin + contentWidth, footerY);

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Notice: Patient self-awareness documentation prepared for clinical consultation. Aligned with American Cancer Society (ACS) & ACOG breast health guidelines. Does not substitute for clinical imaging.',
    margin,
    footerY + 4,
    { maxWidth: contentWidth }
  );

  return doc;
}
