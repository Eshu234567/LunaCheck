import React, { useState } from 'react';
import { BodyZone, Observation, PersonalLogEntry } from '../types';
import { ALL_BODY_ZONES, ZONE_MAP } from '../data/bodyZones';
import { storageService } from '../services/storage';
import { AvatarCanvas } from './AvatarCanvas';
import {
  FileEdit,
  Save,
  CheckCircle2,
  MapPin,
  Sparkles,
  X,
  Trash2,
  Calendar,
  Eye,
  Clock,
} from 'lucide-react';

interface BodyMapViewProps {
  observations: Observation[];
  onOpenFindingModal: (zone: BodyZone) => void;
}

export const BodyMapView: React.FC<BodyMapViewProps> = ({ observations, onOpenFindingModal }) => {
  // Personal Notes state that persists in localStorage
  const [personalNotes, setPersonalNotes] = useState<string>(() => {
    return localStorage.getItem('aura_personal_log_notes') || '';
  });
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Saved to Personal Log');

  // Saved log entries history
  const [savedLogs, setSavedLogs] = useState<PersonalLogEntry[]>(() =>
    storageService.getPersonalLogs()
  );

  // Marked zones on 108 sector diagram
  const [markedZoneIds, setMarkedZoneIds] = useState<string[]>([]);

  // Active sub-tab: 'log' | 'guide'
  const [activeTab, setActiveTab] = useState<'log' | 'guide'>('log');

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPersonalNotes(val);
    localStorage.setItem('aura_personal_log_notes', val);
  };

  // Toggle marking of a zone on the 108 diagram
  const handleToggleZone = (zone: BodyZone) => {
    setMarkedZoneIds((prev) => {
      if (prev.includes(zone.id)) {
        return prev.filter((id) => id !== zone.id);
      } else {
        return [...prev, zone.id];
      }
    });
  };

  const handleRemoveZone = (zoneId: string) => {
    setMarkedZoneIds((prev) => prev.filter((id) => id !== zoneId));
  };

  const handleClearAllMarked = () => {
    setMarkedZoneIds([]);
  };

  const handleInspectLog = (entry: PersonalLogEntry) => {
    setMarkedZoneIds(entry.markedZoneIds || []);
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm('Delete this saved personal log entry?')) {
      storageService.deletePersonalLog(id);
      setSavedLogs((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const handleSaveEntry = () => {
    if (!personalNotes.trim() && markedZoneIds.length === 0) {
      setSaveMessage('Please write a note or mark sectors before saving.');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    // 1. Create and persist new PersonalLogEntry
    const newEntry: PersonalLogEntry = {
      id: `log-${Date.now()}`,
      date: todayStr,
      timestamp: timeStr,
      notes: personalNotes.trim() || 'Sector observation noted.',
      markedZoneIds: [...markedZoneIds],
      markedZoneNames: markedZoneIds.map((id) => {
        const z = ZONE_MAP[id];
        return z ? `${z.side.toUpperCase()}: ${z.name}` : id;
      }),
    };

    const updatedLogs = [newEntry, ...savedLogs];
    setSavedLogs(updatedLogs);
    storageService.savePersonalLogs(updatedLogs);

    // 2. Also record marked areas in observation history
    if (markedZoneIds.length > 0) {
      const existingObs = storageService.getObservations();

      const newObsList: Observation[] = markedZoneIds.map((id, index) => {
        const zone = ZONE_MAP[id] || ALL_BODY_ZONES[0];
        return {
          id: `obs-personal-${Date.now()}-${index}`,
          date: todayStr,
          zoneId: zone.id,
          zoneName: zone.name,
          side: zone.side,
          quadrant: zone.quadrant,
          category: 'Area of Firmness or Thickening',
          feel: 'Firm & Rubbery',
          size: 'Diffuse area (>30 mm)',
          isRedFlag: false,
          persistenceStatus: 'New Observation',
          consecutiveCyclesCount: 1,
          cycleDay: 1,
          notes: personalNotes || 'Marked on 108 sector diagram in Personal Log',
        };
      });

      storageService.saveObservations([...newObsList, ...existingObs]);
    }

    localStorage.removeItem('aura_personal_log_notes');
    setPersonalNotes('');
    setSaveMessage('Saved entry to your Personal Journal & Timeline!');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5 select-none">
      {/* 1. Header Bar */}
      <div className="glass-panel rounded-3xl p-5 border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 shadow-sm">
            <FileEdit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-rose-950">Personal Log</h2>
              <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Self Notes & 108 Map
              </span>
            </div>
            <p className="text-xs text-rose-800/60 font-medium">
              Write personal notes, mark any number of areas on the clean 108 sector diagram, and save them.
            </p>
          </div>
        </div>

        {/* View Switcher: Log vs Pictorial Guide */}
        <div className="flex items-center gap-1 bg-rose-50/70 p-1 rounded-2xl border border-rose-200/60 text-xs">
          <button
            onClick={() => setActiveTab('log')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'log'
                ? 'bg-white text-rose-950 shadow-sm border border-rose-200'
                : 'text-rose-800 hover:text-rose-950'
            }`}
          >
            Personal Notes & 108 Map
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-white text-rose-950 shadow-sm border border-rose-200'
                : 'text-rose-800 hover:text-rose-950'
            }`}
          >
            Pictorial Examination Guide
          </button>
        </div>
      </div>

      {activeTab === 'log' ? (
        /* MAIN VIEW: Personal Note + Clean 108 Sector Diagram Marking (Multi-area) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Personal Note Editor & Marked Areas List */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-rose-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-rose-500" />
                  <h3 className="font-bold text-sm text-rose-950">Personal Note</h3>
                </div>
                {isSaved && (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {saveMessage}
                  </span>
                )}
              </div>

              <textarea
                value={personalNotes}
                onChange={handleNotesChange}
                placeholder="Type your personal note here... (e.g., sensations noted during exam, changes noticed, or questions to ask your doctor)"
                rows={7}
                className="w-full p-4 rounded-2xl bg-white/95 border border-rose-200 text-xs text-rose-950 placeholder-rose-900/40 focus:outline-none focus:ring-2 focus:ring-rose-400 leading-relaxed resize-none shadow-inner"
              />

              {/* Marked Areas List (Starts clean with 0 marked, allows multiple areas) */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-rose-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Marked Areas ({markedZoneIds.length}):
                  </span>
                  {markedZoneIds.length > 0 && (
                    <button
                      onClick={handleClearAllMarked}
                      className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear all
                    </button>
                  )}
                </div>

                {markedZoneIds.length === 0 ? (
                  <p className="text-[11px] text-stone-500 italic py-1">
                    Diagram is clear. Tap any sector(s) on the 108 map to mark one or multiple areas.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-0.5">
                    {markedZoneIds.map((id) => {
                      const zone = ZONE_MAP[id];
                      if (!zone) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-rose-300 text-[10px] font-bold text-rose-800 shadow-xs"
                        >
                          <span>
                            {zone.side.toUpperCase()}: {zone.name}
                          </span>
                          <button
                            onClick={() => handleRemoveZone(id)}
                            className="hover:text-rose-950 cursor-pointer ml-0.5 text-rose-400 hover:text-rose-600"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveEntry}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-extrabold text-xs shadow-md shadow-rose-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {markedZoneIds.length > 0
                    ? `Save Note & ${markedZoneIds.length} Marked Area${markedZoneIds.length > 1 ? 's' : ''}`
                    : 'Save Note'}
                </span>
              </button>
            </div>

            {/* Saved Personal Journal Entries History */}
            <div className="glass-panel rounded-3xl p-5 border border-rose-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-rose-500" />
                  <h3 className="font-bold text-sm text-rose-950">
                    Saved Journal History ({savedLogs.length})
                  </h3>
                </div>
                {savedLogs.length > 0 && (
                  <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    Permanent Records
                  </span>
                )}
              </div>

              {savedLogs.length === 0 ? (
                <div className="p-4 rounded-2xl bg-rose-50/50 border border-dashed border-rose-200 text-center space-y-1">
                  <Clock className="w-5 h-5 text-rose-400 mx-auto" />
                  <p className="text-xs font-semibold text-rose-900">No Journal Entries Saved Yet</p>
                  <p className="text-[11px] text-rose-800/60">
                    Type a personal note above and optionally tap sectors on the 108 diagram to save your entry.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {savedLogs.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="p-3.5 rounded-2xl bg-white/90 border border-rose-150 hover:border-rose-300 shadow-2xs space-y-2 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold flex items-center justify-center">
                            #{savedLogs.length - idx}
                          </span>
                          <span className="text-xs font-bold text-rose-950">
                            {entry.date}
                          </span>
                          <span className="text-[10px] text-rose-800/60 font-medium">
                            {entry.timestamp}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteLog(entry.id)}
                          className="text-stone-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-rose-950/90 whitespace-pre-wrap leading-relaxed bg-rose-50/40 p-2.5 rounded-xl border border-rose-100/60">
                        {entry.notes}
                      </p>

                      {entry.markedZoneIds && entry.markedZoneIds.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[10px] font-bold text-rose-900/80 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-500" />
                            Marked Sectors ({entry.markedZoneIds.length}):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {entry.markedZoneNames && entry.markedZoneNames.length > 0 ? (
                              entry.markedZoneNames.map((name, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200"
                                >
                                  {name}
                                </span>
                              ))
                            ) : (
                              entry.markedZoneIds.map((zid) => (
                                <span
                                  key={zid}
                                  className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200"
                                >
                                  {zid}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-end">
                        <button
                          onClick={() => handleInspectLog(entry)}
                          className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View on 108 Diagram</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: 108 Sector Diagram for Area Marking */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-5 border border-rose-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                108 Detailed Sector Diagram (Tap sectors to mark multiple areas)
              </span>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                {markedZoneIds.length} selected
              </span>
            </div>

            {/* 108 Sector Vector Canvas (No prior marks passed; user marks freely) */}
            <AvatarCanvas
              coveredZoneIds={markedZoneIds}
              highlightZoneIds={markedZoneIds}
              selectedZoneId={markedZoneIds[markedZoneIds.length - 1] || null}
              observations={[]}
              onSelectZone={handleToggleZone}
              isInteractive={true}
              mode="view"
            />
          </div>
        </div>
      ) : (
        /* PICTORIAL TECHNIQUE GUIDE: Using the 4 clinical images from images folder */
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Step 1: Hands on Hips (1.png) */}
            <div className="glass-panel rounded-3xl p-5 border border-rose-200 flex flex-col items-center text-center space-y-3">
              <div className="w-full aspect-[4/3] max-w-[260px] rounded-2xl overflow-hidden bg-white border border-rose-200 flex items-center justify-center p-2 shadow-sm">
                <img
                  src="/images/1.png"
                  alt="Mirror check with hands on hips"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-rose-950">1. Mirror Check: Hands on Hips</h4>
                <p className="text-xs text-rose-900/70 leading-relaxed font-medium">
                  Stand facing your mirror with shoulders back and hands pressed firmly on hips. Look for contour changes, dimpling, puckering, or nipple retraction.
                </p>
              </div>
            </div>

            {/* Step 2: Arms Raised High (2.png) */}
            <div className="glass-panel rounded-3xl p-5 border border-rose-200 flex flex-col items-center text-center space-y-3">
              <div className="w-full aspect-[4/3] max-w-[260px] rounded-2xl overflow-hidden bg-white border border-rose-200 flex items-center justify-center p-2 shadow-sm">
                <img
                  src="/images/2.png"
                  alt="Mirror check with arms raised high"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-rose-950">2. Mirror Check: Arms Raised High</h4>
                <p className="text-xs text-rose-900/70 leading-relaxed font-medium">
                  Raise both arms overhead. This movement lifts breast tissue and reveals subtle skin pulling, contour flattening, or lower crease dimples.
                </p>
              </div>
            </div>

            {/* Step 3: Standing Palpation & Axilla (3.png) */}
            <div className="glass-panel rounded-3xl p-5 border border-rose-200 flex flex-col items-center text-center space-y-3">
              <div className="w-full aspect-[4/3] max-w-[260px] rounded-2xl overflow-hidden bg-white border border-rose-200 flex items-center justify-center p-2 shadow-sm">
                <img
                  src="/images/3.png"
                  alt="Upright standing palpation and axillary hollow check"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-rose-950">3. Upright Palpation & Axillary Hollow</h4>
                <p className="text-xs text-rose-900/70 leading-relaxed font-medium">
                  Feel each breast while standing or in the shower using soapy water. Use the flat pads of your middle 3 fingers to check all quadrants and the underarm hollow.
                </p>
              </div>
            </div>

            {/* Step 4: Lying Down Palpation (4.png) */}
            <div className="glass-panel rounded-3xl p-5 border border-rose-200 flex flex-col items-center text-center space-y-3">
              <div className="w-full aspect-[4/3] max-w-[260px] rounded-2xl overflow-hidden bg-white border border-rose-200 flex items-center justify-center p-2 shadow-sm">
                <img
                  src="/images/4.png"
                  alt="Lying down palpation with raised arm"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-rose-950">4. Lying Down with Raised Arm</h4>
                <p className="text-xs text-rose-900/70 leading-relaxed font-medium">
                  Lie on your back with a small pillow under your shoulder. Tissue spreads evenly across the ribcage, making deeper glandular assessment easier.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BodyMapView;
