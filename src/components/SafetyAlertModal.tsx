import React from 'react';
import { AlertTriangle, Stethoscope, CheckCircle2, X } from 'lucide-react';

interface SafetyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  symptomName: string;
}

export const SafetyAlertModal: React.FC<SafetyAlertModalProps> = ({ isOpen, onClose, symptomName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-rose-200 p-6 sm:p-8 shadow-2xl relative overflow-hidden text-rose-950">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-rose-400 hover:text-rose-700 p-1 rounded-xl hover:bg-rose-50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600 shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-rose-950 flex items-center gap-2">
              Clinical Advisory & Discussion Prompt
            </h3>
            <p className="text-xs text-rose-700 font-bold mt-0.5">
              Regarding logged observation: <span className="underline">{symptomName}</span>
            </p>
          </div>
        </div>

        {/* Core Message */}
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 mb-4 text-xs text-rose-900 leading-relaxed font-medium">
          <p className="font-extrabold text-rose-950 text-sm mb-1.5">
            "This type of observation is worth discussing with a healthcare professional."
          </p>
          <p>
            Certain changes — particularly skin dimpling or puckering, nipple changes/discharge, or persistent localized firmness — should always be formally evaluated by a doctor or clinician.
          </p>
        </div>

        {/* Calming Context */}
        <div className="space-y-2.5 mb-6 text-xs text-rose-900/80 font-medium">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-rose-950">Most breast changes are non-cancerous:</strong> Benign conditions such as simple cysts, hormonal glandular density, and fibroadenomas account for over 80% of breast lumps.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-rose-950">Clinical exam provides clarity:</strong> A clinician can perform a thorough manual examination and determine whether an ultrasound or diagnostic mammogram is indicated.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Stethoscope className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-rose-950">Use your 1-Page Summary:</strong> You can export this observation in your clinician summary PDF, which provides exact quadrant and cycle correlation.
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-rose-100">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 hover:from-rose-600 hover:to-orange-500 text-white font-extrabold text-xs shadow-md shadow-rose-500/20 transition-all"
          >
            I Understand — Save to Observation Log
          </button>
        </div>
      </div>
    </div>
  );
};
