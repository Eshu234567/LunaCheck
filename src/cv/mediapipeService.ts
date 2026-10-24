import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { NormalizedHandTelemetry, OnDeviceCoverageTracker } from './coverageTracker';

export class MediaPipeVisionEngine {
  private poseLandmarker: PoseLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private isRunning: boolean = false;

  public async initializeAndStartCamera(
    tracker: OnDeviceCoverageTracker,
    onTelemetry: (telemetry: NormalizedHandTelemetry) => void,
    onError: (reason: string) => void
  ): Promise<void> {
    try {
      // Request webcam stream first
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      // Create an off-screen <video> element that is NEVER inserted visibly into the DOM
      const video = document.createElement('video');
      video.srcObject = this.stream;
      video.playsInline = true;
      video.muted = true;
      await video.play();
      this.videoElement = video;

      // Load MediaPipe Vision WASM & Models
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });

      this.isRunning = true;
      let lastVideoTime = -1;

      const loop = () => {
        if (!this.isRunning || !this.videoElement) return;
        const nowMs = performance.now();

        if (this.videoElement.readyState >= 2 && this.videoElement.currentTime !== lastVideoTime) {
          lastVideoTime = this.videoElement.currentTime;
          const poseRes = this.poseLandmarker?.detectForVideo(this.videoElement, nowMs);
          const handRes = this.handLandmarker?.detectForVideo(this.videoElement, nowMs);

          const telemetry = tracker.processMediaPipeResults(
            poseRes?.landmarks?.[0],
            handRes?.landmarks,
            handRes?.handedness,
            nowMs
          );
          onTelemetry(telemetry);
        }

        this.rafId = requestAnimationFrame(loop);
      };

      this.rafId = requestAnimationFrame(loop);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Camera or MediaPipe WASM unavailable — switched to interactive avatar simulation mode.';
      onError(msg);
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }
}
