import React, { useState } from 'react';
import { Observation, RoutineSessionRecord, UserProfile, PersonalLogEntry } from '../types';
import { generateClinicianPDF } from '../services/pdfService';
import { storageService } from '../services/storage';
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  X,
  Stethoscope,
  Sparkles,
  FileEdit,
  Clock,
  MapPin,
} from 'lucide-react';

interface PdfExportModalProps {
  user: UserProfile;
  cycle?: unknown;
  observations: Observation[];
  routines: RoutineSessionRecord[];
  isOpen: boolean;
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  user,
  observations,
  routines,
  isOpen,
  onClose,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const personalLogs = storageService.getPersonalLogs();

  if (!isOpen) return null;

  const handleDownload = () => {
    try {
      const doc = generateClinicianPDF({ user, observations, routines, personalLogs });
      doc.save(`Aura-Health-Clinician-Summary-${new Date().toISOString().split('T')[0]}.pdf`);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('PDF export failed', err);
    }
  };

  const handlePrint = () => {
    try {
      setIsPrinting(true);
      const doc = generateClinicianPDF({ user, observations, routines, personalLogs });
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);

      // Create an invisible iframe for direct silent print preview without pop-up blockers
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.open(url, '_blank');
          } finally {
            setIsPrinting(false);
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              URL.revokeObjectURL(url);
            }, 60000);
          }
        }, 300);
      };
    } catch (err) {
      console.error('Print preview failed', err);
      window.print();
      setIsPrinting(false);
    }
  };

  const latestDate =
    observations[0]?.date || routines[0]?.date || new Date().toISOString().split('T')[0];
  const persistingCount = observations.filter(
    (o) => o.persistenceStatus === 'Persisting Observation'
  ).length;
  const avgCoverage = routines.length
    ? Math.round(routines.reduce((a, b) => a + b.coveragePercentage, 0) / routines.length)
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl bg-white border border-rose-200 p-5 sm:p-7 shadow-2xl relative my-6 text-rose-950 max-h-[92vh] flex flex-col">
        {/* Header toolbar (no-print) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-rose-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 shadow-sm shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-rose-950">
                  Clinician Consultation Report
                </h3>
                <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  Doctor Ready (1-Page A4)
                </span>
              </div>
              <p className="text-xs text-rose-800/60 font-medium">
                Structured clinical consultation summary with anatomical quadrant schematic and CBE checklist.
              </p>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {downloadSuccess && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mr-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" /> Downloaded
              </span>
            )}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Print Clinical Summary"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>{isPrinting ? 'Preparing Print...' : 'Print Report'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-rose-400 hover:text-rose-700 p-1.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live A4 Clinical Paper Document Preview */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div
            id="printable-clinical-sheet"
            className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-300 shadow-md font-sans text-xs space-y-5 max-w-3xl mx-auto"
          >
            {/* Top Navy Header Bar */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm tracking-wide uppercase">
                    AURA HEALTH — CLINICAL BREAST AWARENESS REPORT
                  </h4>
                </div>
                <p className="text-[11px] text-slate-300 font-medium">
                  Structured Longitudinal Patient Observations for Clinical Consultation
                </p>
              </div>
              <span className="text-[10px] font-extrabold uppercase bg-teal-400 text-slate-950 px-2.5 py-1 rounded shadow-xs tracking-wider">
                Clinical Summary
              </span>
            </div>

            {/* Patient Demographics & Baseline (No menstrual cycle info) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
              <div className="space-y-1">
                <span className="font-bold block text-slate-500 uppercase text-[9px] tracking-wider">
                  Patient Baseline
                </span>
                <span className="text-slate-900 font-extrabold text-xs block">
                  {user.name || 'Sally'}
                </span>
                <span className="text-slate-600 block">
                  Age Bracket: <strong className="text-slate-800">{user.ageBracket} years</strong>
                </span>
                <span className="text-slate-500 text-[10px] block">
                  Report Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-bold block text-slate-500 uppercase text-[9px] tracking-wider">
                  Observation Metadata
                </span>
                <span className="text-slate-900 font-bold block">
                  Date: <span className="font-normal">{latestDate}</span>
                </span>
                <span className="text-slate-900 font-bold block">
                  Exam Coverage: <span className="text-teal-700 font-extrabold">{avgCoverage}%</span> of 108 Zones
                </span>
                <span className="text-slate-500 text-[10px] block">
                  {routines.length || 1} guided routine check(s) recorded
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-bold block text-slate-500 uppercase text-[9px] tracking-wider">
                  Important Clinical Flags
                </span>
                <span className="block font-bold text-slate-900">
                  {persistingCount > 0 ? (
                    <span className="text-rose-600 font-extrabold">
                      {persistingCount} Persisting Flag(s)
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">0 Persisting Findings</span>
                  )}
                </span>
                <span className="text-slate-600 block">
                  Total Logged: <strong className="text-slate-800">{observations.length} Area(s)</strong>
                </span>
                <span className="text-slate-500 text-[10px] block">
                  Focus: {observations.length > 0 ? 'Palpable Target Review' : 'Routine Baseline'}
                </span>
              </div>
            </div>

            {/* Anatomical Quadrant Schematic & Findings Map */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/80 pb-2">
                <div>
                  <h5 className="font-extrabold text-[11px] text-slate-900 tracking-wider uppercase">
                    Anatomical Quadrant Schematic &amp; Findings Map
                  </h5>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Standard Clinical Perspective: Left of diagram is Patient Right; Right of diagram is Patient Left
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1.5 font-bold text-rose-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block shadow-xs" />
                    Persisting Finding
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-teal-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block shadow-xs" />
                    Reported Area Finding
                  </span>
                </div>
              </div>

              {/* Vector Graphic: Bilateral Breasts with Quadrants & Clock Dials */}
              <div className="flex items-center justify-center py-2 bg-white rounded-lg border border-slate-200 shadow-inner">
                <svg viewBox="0 0 520 180" className="w-full max-w-xl h-auto select-none">
                  {/* Right Breast (Patient Right - Diagram Left) */}
                  <g transform="translate(140, 90)">
                    {/* Outer margin ring */}
                    <circle r="68" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
                    {/* Glandular zone */}
                    <circle r="46" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.2" />
                    {/* Areolar ring */}
                    <circle r="25" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
                    {/* Nipple center */}
                    <circle r="7" fill="#fda4af" stroke="#f43f5e" strokeWidth="1.2" />

                    {/* Crosshair quadrant lines */}
                    <line x1="-68" y1="0" x2="68" y2="0" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="0" y1="-68" x2="0" y2="68" stroke="#cbd5e1" strokeWidth="1" />

                    {/* Quadrant labels */}
                    <text x="-46" y="-34" fill="#64748b" fontSize="9" fontWeight="700" textAnchor="middle">UOQ (10:00)</text>
                    <text x="44" y="-34" fill="#64748b" fontSize="9" fontWeight="700" textAnchor="middle">UIQ (2:00)</text>
                    <text x="-46" y="44" fill="#64748b" fontSize="9" fontWeight="700" textAnchor="middle">LOQ (7:00)</text>
                    <text x="44" y="44" fill="#64748b" fontSize="9" fontWeight="700" textAnchor="middle">LIQ (4:00)</text>

                    {/* Header label */}
                    <text x="0" y="-74" fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="middle">PATIENT RIGHT BREAST</text>

                    {/* Render pins for Right Breast observations */}
                    {observations.map((obs, i) => {
                      if (obs.side !== 'right') return null;
                      const isPersist = obs.persistenceStatus === 'Persisting Observation';
                      let px = 0;
                      let py = 0;
                      if (obs.quadrant.includes('Outer') || obs.zoneId.includes('R3-10')) {
                        px = -36; py = -24;
                      } else if (obs.quadrant.includes('Inner')) {
                        px = 28; py = -18;
                      } else if (obs.quadrant.includes('Lower')) {
                        px = -24; py = 26;
                      } else {
                        px = 0; py = 0;
                      }
                      return (
                        <g key={obs.id} transform={`translate(${px}, ${py})`}>
                          <circle r="9" fill={isPersist ? '#e11d48' : '#0d9488'} stroke="#ffffff" strokeWidth="1.5" />
                          <text x="0" y="3" fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle">{i + 1}</text>
                        </g>
                      );
                    })}
                  </g>

                  {/* Sternum Midline */}
                  <line x1="260" y1="20" x2="260" y2="160" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                  <text x="260" y="172" fill="#94a3b8" fontSize="9" fontWeight="700" textAnchor="middle">Sternum</text>

                  {/* Left Breast (Patient Left - Diagram Right) */}
                  <g transform="translate(380, 90)">
                    {/* Outer margin ring */}
                    <circle r="68" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
                    {/* Glandular zone */}
                    <circle r="46" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.2" />
                    {/* Areolar ring */}
                    <circle r="25" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
                    {/* Nipple center */}
                    <circle r="7" fill="#fda4af" stroke="#f43f5e" strokeWidth="1.2" />

                    {/* Crosshair quadrant lines */}
                    <line x1="-68" y1="0" x2="68" y2="0" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="0" y1="-68" x2="0" y2="68" stroke="#cbd5e1" strokeWidth="1" />

                    {/* Quadrant labels */}
                    <text x="-44" y="-34" fill="#64748b" fontSize="9" fontWeight="700" textAnchor="middle">UIQ (10:00)</text>
                    <text x="46" y="-34" fill="#64748b" fontSize="9" fontWeight="700" textAnchor="middle">UOQ (2:00)</text>
                    <text x="-44" y="44" fill="#64748b" fontSize="9" fontWeight="700" textAnchor="middle">LIQ (8:00)</text>
                    <text x="46" y="44" fill="#64748b" fontSize="9" fontWeight="700" textAnchor="middle">LOQ (4:00)</text>

                    {/* Header label */}
                    <text x="0" y="-74" fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="middle">PATIENT LEFT BREAST</text>

                    {/* Render pins for Left Breast observations */}
                    {observations.map((obs, i) => {
                      if (obs.side !== 'left') return null;
                      const isPersist = obs.persistenceStatus === 'Persisting Observation';
                      let px = 0;
                      let py = 0;
                      if (obs.quadrant.includes('Outer') || obs.zoneId.includes('R3-10')) {
                        px = 36; py = -24;
                      } else if (obs.quadrant.includes('Inner')) {
                        px = -28; py = -18;
                      } else if (obs.quadrant.includes('Lower')) {
                        px = 24; py = 26;
                      } else {
                        px = 0; py = 0;
                      }
                      return (
                        <g key={obs.id} transform={`translate(${px}, ${py})`}>
                          <circle r="9" fill={isPersist ? '#e11d48' : '#0d9488'} stroke="#ffffff" strokeWidth="1.5" />
                          <text x="0" y="3" fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle">{i + 1}</text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
            </div>

            {/* Structured Observations Table */}
            <div className="space-y-1.5">
              <h5 className="font-extrabold text-[11px] text-slate-900 tracking-wider uppercase">
                Patient Observations &amp; Marked Areas Log
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold">
                      <th className="p-2 border border-slate-200 w-8 text-center">#</th>
                      <th className="p-2 border border-slate-200 w-24">Date</th>
                      <th className="p-2 border border-slate-200">Location &amp; Quadrant</th>
                      <th className="p-2 border border-slate-200">Finding &amp; Texture</th>
                      <th className="p-2 border border-slate-200 w-36">Clinical Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                          No focal abnormalities or marked areas recorded. Comprehensive baseline examination clear.
                        </td>
                      </tr>
                    ) : (
                      observations.slice(0, 4).map((obs, i) => {
                        const isPersisting = obs.persistenceStatus === 'Persisting Observation';
                        return (
                          <tr key={obs.id} className={i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                            <td className="p-2 border border-slate-200 font-bold text-slate-900 text-center">
                              [{i + 1}]
                            </td>
                            <td className="p-2 border border-slate-200 text-slate-700 font-medium">
                              {obs.date}
                            </td>
                            <td className="p-2 border border-slate-200 font-semibold text-slate-900">
                              <span>{obs.side.toUpperCase()}: {obs.zoneName}</span>
                              <span className="block text-[10px] text-slate-500 font-normal">{obs.quadrant}</span>
                            </td>
                            <td className="p-2 border border-slate-200">
                              <span className="font-bold text-slate-800 block">{obs.category}</span>
                              <span className="text-[10px] text-slate-600 block">{obs.feel} • {obs.size}</span>
                            </td>
                            <td className="p-2 border border-slate-200">
                              {isPersisting ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  PERSISTING (&ge;2 cycles)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                                  New Finding
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                {observations.length > 4 && (
                  <div className="mt-1.5 text-[10px] text-slate-500 italic">
                    * Showing 4 of {observations.length} total logged areas. Complete history available in digital timeline.
                  </div>
                )}
              </div>
            </div>

            {/* Patient Personal Journal & Subjective Notes */}
            <div className="border border-rose-200 rounded-xl p-4 bg-rose-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-rose-950 font-extrabold text-[11px] uppercase tracking-wider">
                  <FileEdit className="w-3.5 h-3.5 text-rose-600" />
                  <span>Patient Personal Journal &amp; Subjective Notes</span>
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full">
                  Self-Reported
                </span>
              </div>

              {personalLogs.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic py-1">
                  No subjective symptoms or personal notes recorded. Baseline self-awareness check normal.
                </p>
              ) : (
                <div className="space-y-2">
                  {personalLogs.slice(0, 3).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-white border border-rose-150 text-[11px] space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-rose-900 font-semibold text-[10px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-rose-500" />
                          {log.date} at {log.timestamp}
                        </span>
                        {log.markedZoneIds && log.markedZoneIds.length > 0 && (
                          <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.2 rounded border border-rose-200">
                            {log.markedZoneIds.length} marked sector(s)
                          </span>
                        )}
                      </div>
                      <p className="text-slate-800 italic leading-relaxed bg-rose-50/30 p-2 rounded border border-rose-100/60">
                        "{log.notes}"
                      </p>
                      {log.markedZoneNames && log.markedZoneNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {log.markedZoneNames.map((name, i) => (
                            <span
                              key={i}
                              className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-50 text-slate-700 border border-slate-200"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {personalLogs.length > 3 && (
                    <p className="text-[10px] text-slate-500 italic">
                      * Showing latest 3 of {personalLogs.length} saved personal journal entries. Complete journal history available in app.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Physician Consultation & Clinical Breast Examination (CBE) Box */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-[11px] uppercase tracking-wider">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-700" />
                  <span>Physician Consultation &amp; Clinical Breast Examination (CBE)</span>
                </div>
                <span className="text-[10px] text-slate-500 italic">For Examining Clinician Use</span>
              </div>

              {/* Checklist options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-[11px] text-slate-700">
                <label className="flex items-center gap-2 cursor-default">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-slate-800 focus:ring-0" />
                  <span>Bilateral CBE Performed</span>
                </label>
                <label className="flex items-center gap-2 cursor-default">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-slate-800 focus:ring-0" />
                  <span>No Mass or Retraction Noted</span>
                </label>
                <label className="flex items-center gap-2 cursor-default">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-slate-800 focus:ring-0" />
                  <span>Ultrasound Imaging Ordered</span>
                </label>
                <label className="flex items-center gap-2 cursor-default">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-slate-800 focus:ring-0" />
                  <span>Mammography Ordered</span>
                </label>
                <label className="flex items-center gap-2 cursor-default">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-slate-800 focus:ring-0" />
                  <span>Routine Recheck (3-6 Mo)</span>
                </label>
              </div>

              {/* Lined notes field */}
              <div className="pt-2 border-t border-slate-200/80 space-y-2 text-[11px]">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-700 shrink-0">Clinical Assessment:</span>
                  <div className="flex-1 border-b border-slate-300 h-4" />
                </div>
                <div className="w-full border-b border-slate-300 h-4" />
              </div>

              {/* Doctor Signature & Date */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px]">
                <div className="flex items-baseline gap-2 w-full sm:w-auto">
                  <span className="font-bold text-slate-700 shrink-0">Clinician Signature:</span>
                  <div className="w-48 sm:w-64 border-b border-slate-300 h-4" />
                </div>
                <div className="flex items-baseline gap-2 w-full sm:w-auto">
                  <span className="font-bold text-slate-700 shrink-0">Date:</span>
                  <div className="w-32 border-b border-slate-300 h-4" />
                </div>
              </div>
            </div>

            {/* Clinical Footer Notice */}
            <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500 leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span>
                Notice: Patient self-awareness documentation prepared for clinical consultation. Aligned with ACS &amp; ACOG breast awareness guidelines.
              </span>
              <span className="font-semibold text-slate-600 shrink-0">
                Page 1 of 1
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions Footer (no-print) */}
        <div className="no-print flex items-center justify-between pt-4 mt-3 border-t border-rose-100 shrink-0">
          <div className="flex items-center gap-2 text-xs text-rose-800/60 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>High-contrast printable vector format ready for hospital or clinical review</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'Preparing Print...' : 'Print Report'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Clinician PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfExportModal;
