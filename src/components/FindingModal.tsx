import React, { useState } from 'react';
import { BodyZone, Observation, SizeReference, SymptomCategory, TextureFeel } from '../types';
import { X, AlertCircle, Save } from 'lucide-react';
import { SafetyAlertModal } from './SafetyAlertModal';

interface FindingModalProps {
  zone: BodyZone | null;
  currentCycleDay: number;
  isOpen: boolean;
  onClose: () => void;
  onSaveObservation: (obs: Omit<Observation, 'id' | 'persistenceStatus' | 'consecutiveCyclesCount'>) => void;
}

export const FindingModal: React.FC<FindingModalProps> = ({
  zone,
  currentCycleDay,
  isOpen,
  onClose,
  onSaveObservation,
}) => {
  if (!isOpen || !zone) return null;

  const [category, setCategory] = useState<SymptomCategory>('Lump / Distinct Nodularity');
  const [feel, setFeel] = useState<TextureFeel>('Firm & Rubbery');
  const [size, setSize] = useState<SizeReference>('Marble (~12 mm)');
  const [cycleDay, setCycleDay] = useState<number>(currentCycleDay);
  const [notes, setNotes] = useState('');
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<Omit<Observation, 'id' | 'persistenceStatus' | 'consecutiveCyclesCount'> | null>(null);

  const isRedFlag =
    category === 'Skin Changes (dimpling, puckering, redness)' ||
    category === 'Nipple Changes (inversion, discharge, scaling)' ||
    feel === 'Hard & Immobile';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: Omit<Observation, 'id' | 'persistenceStatus' | 'consecutiveCyclesCount'> = {
      date: new Date().toISOString().split('T')[0],
      zoneId: zone.id,
      side: zone.side,
      zoneName: zone.name,
      quadrant: zone.quadrant,
      category,
      feel,
      size,
      cycleDay: Number(cycleDay),
      isRedFlag,
      notes: notes.trim() || undefined,
    };

    if (isRedFlag) {
      setPendingSaveData(data);
      setShowSafetyModal(true);
    } else {
      onSaveObservation(data);
      onClose();
    }
  };

  const handleSafetyModalAcknowledge = () => {
    setShowSafetyModal(false);
    if (pendingSaveData) {
      onSaveObservation(pendingSaveData);
      setPendingSaveData(null);
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="w-full max-w-lg rounded-3xl bg-white border border-rose-200 p-6 sm:p-7 shadow-2xl relative my-6 text-rose-950">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-rose-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h3 className="text-base font-extrabold text-rose-950">Record Observation</h3>
                <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  {zone.side.toUpperCase()} BREAST
                </span>
              </div>
              <p className="text-xs text-rose-600 font-bold mt-0.5">{zone.name}</p>
              <p className="text-[11px] text-rose-800/60 font-medium">{zone.quadrant}</p>
            </div>
            <button
              onClick={onClose}
              className="text-rose-400 hover:text-rose-700 p-1 rounded-xl hover:bg-rose-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Category */}
            <div>
              <label className="block text-xs font-bold text-rose-900 mb-1.5">
                Type of Observation / Change
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SymptomCategory)}
                className="w-full bg-rose-50/40 border border-rose-200 rounded-2xl px-3.5 py-2.5 text-xs text-rose-950 font-semibold focus:outline-none focus:border-rose-400"
              >
                <option value="Lump / Distinct Nodularity">Lump / Distinct Nodularity</option>
                <option value="Area of Firmness or Thickening">Area of Firmness or Thickening</option>
                <option value="Localized Tenderness / Discomfort">Localized Tenderness / Discomfort</option>
                <option value="Skin Changes (dimpling, puckering, redness)">
                  Skin Changes (dimpling, puckering, redness)
                </option>
                <option value="Nipple Changes (inversion, discharge, scaling)">
                  Nipple Changes (inversion, discharge, scaling)
                </option>
              </select>
            </div>

            {/* 2. Characteristics & Feel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-rose-900 mb-1.5">
                  Texture / Mobility
                </label>
                <select
                  value={feel}
                  onChange={(e) => setFeel(e.target.value as TextureFeel)}
                  className="w-full bg-rose-50/40 border border-rose-200 rounded-2xl px-3.5 py-2.5 text-xs text-rose-950 font-semibold focus:outline-none focus:border-rose-400"
                >
                  <option value="Soft & Mobile">Soft & Mobile</option>
                  <option value="Firm & Rubbery">Firm & Rubbery</option>
                  <option value="Hard & Immobile">Hard & Immobile</option>
                  <option value="Diffuse / Grainy (Fibrocystic texture)">
                    Diffuse / Grainy (Fibrocystic texture)
                  </option>
                  <option value="Superficial / Skin level">Superficial / Skin level</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-900 mb-1.5">
                  Estimated Size Reference
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as SizeReference)}
                  className="w-full bg-rose-50/40 border border-rose-200 rounded-2xl px-3.5 py-2.5 text-xs text-rose-950 font-semibold focus:outline-none focus:border-rose-400"
                >
                  <option value="Small Pea (~5 mm)">Small Pea (~5 mm)</option>
                  <option value="Marble (~12 mm)">Marble (~12 mm)</option>
                  <option value="Walnut (~25 mm)">Walnut (~25 mm)</option>
                  <option value="Diffuse area (>30 mm)">Diffuse area (&gt;30 mm)</option>
                  <option value="Not palpable / visual only">Not palpable / visual only</option>
                </select>
              </div>
            </div>

            {/* 3. Cycle Day */}
            <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-200 flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-rose-950">
                  Cycle Day at Observation
                </label>
                <p className="text-[11px] text-rose-800/70 font-medium">
                  {cycleDay >= 3 && cycleDay <= 10
                    ? 'Within optimal hormonal baseline window (Days 3–10).'
                    : 'Contextualizes hormonal pre-menstrual tenderness.'}
                </p>
              </div>
              <input
                type="number"
                min="1"
                max="45"
                value={cycleDay}
                onChange={(e) => setCycleDay(Number(e.target.value))}
                className="w-20 bg-white border border-rose-200 rounded-xl px-2.5 py-1.5 text-xs text-center text-rose-950 focus:outline-none focus:border-rose-400 font-extrabold shadow-sm"
              />
            </div>

            {/* 4. Notes */}
            <div>
              <label className="block text-xs font-bold text-rose-900 mb-1.5">
                Private Descriptive Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Only felt when pressing against ribcage, or noticeably sensitive..."
                className="w-full bg-rose-50/40 border border-rose-200 rounded-2xl px-3.5 py-2.5 text-xs text-rose-950 placeholder-rose-300 focus:outline-none focus:border-rose-400 font-medium"
              />
            </div>

            {isRedFlag && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  Observation flagged for clinical review. Saving will prepare this for your doctor summary.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-rose-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-800 hover:text-rose-950 hover:bg-rose-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-600 hover:to-orange-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/20 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Observation</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <SafetyAlertModal
        isOpen={showSafetyModal}
        onClose={handleSafetyModalAcknowledge}
        symptomName={category}
      />
    </>
  );
};
