import React, { useState } from 'react';
import { Observation, RoutineSessionRecord, BodyZone, PersonalLogEntry } from '../types';
import { ZONE_MAP } from '../data/bodyZones';
import { storageService } from '../services/storage';
import { AvatarCanvas } from './AvatarCanvas';
import {
  TrendingUp,
  Calendar,
  FileText,
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
  Eye,
  CheckCircle2,
  FileEdit,
  MapPin,
  Clock,
} from 'lucide-react';

interface TimelineViewProps {
  observations: Observation[];
  routines: RoutineSessionRecord[];
  onExportPDF: () => void;
  onSelectZoneToLog?: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  observations,
  routines,
  onExportPDF,
}) => {
  // Load personal logs from storage
  const personalLogs = storageService.getPersonalLogs();

  // Group observations by date
  const observationsByDate: Record<string, Observation[]> = {};
  observations.forEach((obs) => {
    if (!observationsByDate[obs.date]) {
      observationsByDate[obs.date] = [];
    }
    observationsByDate[obs.date].push(obs);
  });

  // Group personal logs by date
  const personalLogsByDate: Record<string, PersonalLogEntry[]> = {};
  personalLogs.forEach((log) => {
    if (!personalLogsByDate[log.date]) {
      personalLogsByDate[log.date] = [];
    }
    personalLogsByDate[log.date].push(log);
    if (!observationsByDate[log.date]) {
      observationsByDate[log.date] = [];
    }
  });

  // Also include dates from completed routines that may have 0 findings
  routines.forEach((r) => {
    if (!observationsByDate[r.date]) {
      observationsByDate[r.date] = [];
    }
  });

  const sortedDates = Object.keys(observationsByDate).sort((a, b) => b.localeCompare(a));

  // Chosen date session (null by default so main page doesn't show breast mapping upfront)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedObsId, setSelectedObsId] = useState<string | null>(null);

  const dayObs = selectedDate ? observationsByDate[selectedDate] || [] : [];
  const dayLogs = selectedDate ? personalLogsByDate[selectedDate] || [] : [];
  const dayLogZoneIds = dayLogs.flatMap((l) => l.markedZoneIds || []);
  const allDayZoneIds = Array.from(new Set([...dayObs.map((o) => o.zoneId), ...dayLogZoneIds]));

  const activeObs: Observation | undefined =
    dayObs.find((o) => o.id === selectedObsId) || (dayObs.length > 0 ? dayObs[0] : undefined);
  const activeZone: BodyZone | undefined = activeObs ? ZONE_MAP[activeObs.zoneId] : undefined;

  const formatDate = (isoDate: string) => {
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return isoDate;
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* 1. Header: Clean, Simple "Timeline" */}
      <div className="glass-panel rounded-3xl p-5 border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-rose-950">Timeline</h2>
              <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Session History
              </span>
            </div>
            <p className="text-xs text-rose-800/60 font-medium">
              Select an examination date below to view its findings mapped onto the 108 sector diagram.
            </p>
          </div>
        </div>

        <button
          onClick={onExportPDF}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Export Clinician PDF</span>
        </button>
      </div>

      {/* 2. Main Body: Main List of Dates OR Detailed 108 Sector View when Date is Chosen */}
      {sortedDates.length === 0 ? (
        <div className="glass-panel rounded-3xl p-10 border border-rose-200 text-center max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-400">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-rose-950">No Sessions Recorded Yet</h3>
          <p className="text-xs text-rose-800/60 leading-relaxed font-medium">
            Complete a Guided Routine or log an entry in Personal Log to populate your timeline.
          </p>
        </div>
      ) : !selectedDate ? (
        /* MAIN PAGE (Clean session list, NO breast mapping shown upfront) */
        <div className="space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-wider text-rose-900/60 px-1">
            Recorded Examination Dates ({sortedDates.length})
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedDates.map((dateStr) => {
              const obsList = observationsByDate[dateStr] || [];
              const dateRoutine = routines.find((r) => r.date === dateStr);
              const dateLogs = personalLogsByDate[dateStr] || [];

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    if (obsList.length > 0) {
                      setSelectedObsId(obsList[0].id);
                    }
                  }}
                  className="glass-panel rounded-3xl p-5 border border-rose-200/80 hover:border-rose-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-rose-950 group-hover:text-rose-600 transition-colors">
                        {formatDate(dateStr)}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-medium text-rose-800/70">
                          {obsList.length === 0 && dateLogs.length === 0
                            ? '0 findings (Normal)'
                            : obsList.length > 0
                            ? `${obsList.length} finding${obsList.length > 1 ? 's' : ''}`
                            : 'Personal note entry'}
                        </span>
                        {dateLogs.length > 0 && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                            <FileEdit className="w-2.5 h-2.5 text-rose-500" />
                            {dateLogs.length} Journal Note{dateLogs.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {dateRoutine && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Guided Routine
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-rose-600">
                    <span className="hidden sm:inline text-[11px]">Inspect 108 Map</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* CHOSEN DATE VIEW: Shows the 108 Detailed Sector Diagram & Session Findings */
        <div className="space-y-4 animate-fade-in">
          {/* Back button and Date Banner */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedDate(null);
                setSelectedObsId(null);
              }}
              className="px-4 py-2 rounded-full bg-white border border-rose-200 text-rose-800 text-xs font-bold hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dates List</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-950">{formatDate(selectedDate)}</span>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                {allDayZoneIds.length} Marked Sector{allDayZoneIds.length !== 1 ? 's' : ''}
                {dayLogs.length > 0 ? ` • ${dayLogs.length} Journal Note${dayLogs.length > 1 ? 's' : ''}` : ''}
              </span>
            </div>
          </div>

          {/* Active Finding Locator Banner (Clearly informs WHERE the problem is!) */}
          {activeObs && activeZone && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 via-white to-pink-50 border border-rose-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-fade-in shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center text-[11px] shadow-sm shrink-0">
                  {dayObs.findIndex((o) => o.id === activeObs.id) + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-rose-950 text-xs">
                      {activeObs.side.toUpperCase()}: {activeObs.zoneName}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-rose-600 bg-white px-2 py-0.5 rounded-full border border-rose-200 shadow-2xs">
                      {activeObs.quadrant}
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800/80 font-medium">
                    {activeObs.category} • {activeObs.feel} • {activeObs.size}
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-rose-700 bg-white/90 px-2.5 py-1 rounded-full border border-rose-200 shrink-0 shadow-2xs">
                Highlighted on 108 Diagram
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: 108 Detailed Sector Image / AvatarCanvas */}
            <div className="lg:col-span-7 glass-panel rounded-3xl p-4 sm:p-5 border border-rose-200 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-rose-500" />
                  108 Detailed Sector Map for {formatDate(selectedDate)}
                </span>
                <span className="text-[10px] text-rose-700/70 font-semibold">
                  Tap any finding or pin to focus
                </span>
              </div>

              {/* Vector 108-Zone Diagram Component */}
              <AvatarCanvas
                coveredZoneIds={allDayZoneIds}
                highlightZoneIds={allDayZoneIds}
                observations={dayObs}
                selectedZoneId={activeZone?.id || null}
                selectedObsId={activeObs?.id || null}
                onSelectZone={(zone) => {
                  const match = dayObs.find((o) => o.zoneId === zone.id);
                  if (match) setSelectedObsId(match.id);
                }}
                isInteractive={true}
                mode="timeline"
              />
            </div>

            {/* Right Column: Findings List & Personal Logs for Selected Date */}
            <div className="lg:col-span-5 space-y-4">
              {/* Clinical Observations */}
              <div className="glass-panel rounded-3xl p-5 border border-rose-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-rose-950">
                    Observations on this Date ({dayObs.length})
                  </h3>
                  <span className="text-[10px] text-rose-800/60 font-medium">
                    Click card to focus location
                  </span>
                </div>

                {dayObs.length === 0 ? (
                  <p className="text-xs text-rose-800/60 py-3">
                    No focal abnormalities reported during this session. Normal routine examination.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {dayObs.map((obs, idx) => {
                      const isSelected = activeObs?.id === obs.id;
                      const isPersisting = obs.persistenceStatus === 'Persisting Observation';

                      return (
                        <div
                          key={obs.id}
                          onClick={() => setSelectedObsId(obs.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                            isSelected
                              ? 'bg-rose-50/95 border-rose-500 ring-2 ring-rose-300 shadow-md scale-[1.01]'
                              : 'bg-white/80 border-rose-150 hover:border-rose-300 hover:bg-rose-50/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                              <span
                                className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center text-white ${
                                  isSelected ? 'bg-rose-600' : 'bg-rose-400'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <span>
                                {obs.side.toUpperCase()}: {obs.zoneName}
                              </span>
                            </span>
                            {isPersisting ? (
                              <span className="text-[9px] font-bold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                                Persisting
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                                Reported
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-stone-600 leading-snug">
                            {obs.category} • {obs.feel} • {obs.size}
                          </div>

                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[10px] text-rose-800/60 font-medium">
                              Quadrant: {obs.quadrant}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] font-bold uppercase text-rose-600 flex items-center gap-0.5">
                                Focused on Map
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Personal Journal & Subjective Notes for Selected Date */}
              {dayLogs.length > 0 && (
                <div className="glass-panel rounded-3xl p-5 border border-rose-200/90 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileEdit className="w-4 h-4 text-rose-500" />
                      <h3 className="font-bold text-sm text-rose-950">
                        Personal Journal Notes ({dayLogs.length})
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                      Subjective Notes
                    </span>
                  </div>

                  <div className="space-y-3">
                    {dayLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-2xl bg-white/95 border border-rose-150 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-rose-950 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-rose-500" />
                            {log.timestamp}
                          </span>
                          {log.markedZoneIds && log.markedZoneIds.length > 0 && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              {log.markedZoneIds.length} marked sector{log.markedZoneIds.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-rose-950/90 leading-relaxed bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 whitespace-pre-wrap">
                          {log.notes}
                        </p>

                        {log.markedZoneNames && log.markedZoneNames.length > 0 && (
                          <div className="space-y-1 pt-0.5">
                            <span className="text-[10px] font-bold text-rose-900/70 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-500" />
                              Associated Sectors:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {log.markedZoneNames.map((name, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-white border border-rose-200 text-rose-800"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineView;
