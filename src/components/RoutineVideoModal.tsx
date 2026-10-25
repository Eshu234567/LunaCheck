import React, { useRef, useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';

interface RoutineVideoModalProps {
  isOpen: boolean;
  onProceed: () => void;
  onClose: () => void;
}

export const RoutineVideoModal: React.FC<RoutineVideoModalProps> = ({
  isOpen,
  onProceed,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      return;
    }

    const vid = videoRef.current;
    if (!vid) return;

    vid.currentTime = 0;

    const tryPlay = async () => {
      try {
        await vid.play();
      } catch {
        vid.muted = true;
        try {
          await vid.play();
        } catch {
          // Allow controls
        }
      }
    };

    tryPlay();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSkipOrProceed = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onProceed();
  };

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-0 select-none">
      {/* Minimal Action Bar on top */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <button
          onClick={handleSkipOrProceed}
          className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer backdrop-blur-md"
        >
          <span>Skip to Routine</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleClose}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer backdrop-blur-md"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Pure Video Element with No Text Boxes Around It */}
      <div className="w-full h-full flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src="/video.mp4"
          controls
          autoPlay
          playsInline
          onEnded={handleSkipOrProceed}
          className="w-full h-full max-h-screen object-contain bg-black"
        />
      </div>
    </div>
  );
};

export default RoutineVideoModal;
