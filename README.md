# Baseline — Cycle-Synced Breast Self-Awareness & Health Tracker

**One-Line Pitch:**  
A privacy-first breast self-awareness and hormone-health tracker that schedules self-checks during the optimal post-period baseline window, guides complete zone coverage on-device using an abstract avatar, separates cyclical luteal hormone shifts from persistent changes, and exports a one-page clinician summary PDF—with zero cloud storage and zero fertility framing.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Build for production
npm run build
```

---

## Team Module Ownership (Aligned with `workflow.pdf` & `rechersion.pdf`)

| Teammate | Focus Area | Key Files |
| :--- | :--- | :--- |
| **Person 1** | Computer Vision & Coverage Math | [`src/cv/mediapipeService.ts`](./src/cv/mediapipeService.ts), [`src/cv/coverageTracker.ts`](./src/cv/coverageTracker.ts) |
| **Person 2** | Frontend, SVG Avatar, Voice Guide & Cycle UI | [`src/components/AvatarBodyMap.tsx`](./src/components/AvatarBodyMap.tsx), [`src/components/GuidedCheckView.tsx`](./src/components/GuidedCheckView.tsx), [`src/components/Dashboard.tsx`](./src/components/Dashboard.tsx), [`src/components/CycleHealthCheckin.tsx`](./src/components/CycleHealthCheckin.tsx) |
| **Person 3** | Local IndexedDB, Cycle & Persistence Engine, Clinician PDF | [`src/services/db.ts`](./src/services/db.ts), [`src/services/cycleEngine.ts`](./src/services/cycleEngine.ts), [`src/services/persistenceEngine.ts`](./src/services/persistenceEngine.ts), [`src/services/pdfGenerator.ts`](./src/services/pdfGenerator.ts) |
| **Shared** | TypeScript Data Contract | [`src/types/schema.ts`](./src/types/schema.ts) |

---

## 3-Minute Hackathon Demo Script

1. **The Problem & Why We Combined Cycle + Breast Awareness (30s):**
   - Open the **Overview** tab. Point out the **Follicular Baseline Window (Day 8)** banner.
   - Explain the 3 gaps: skipped outer/underarm/collarbone zones, no month-to-month memory (confusing pre-period luteal hormone lumpiness with true persistence), and weak clinical handoffs.
2. **Guided Check & Gap Prompt Demo (60s):**
   - Click **Start Guided Self-Awareness Check** (or the **Guided Check** tab).
   - Show that the screen displays an **abstract SVG avatar**—never the raw webcam feed.
   - Click **Start Webcam Tracking** (for live clothed volunteer) OR **Simulate Clothed Demo** (or drag in small circles on the avatar).
   - Watch the zones fill in and trigger the **Gap Prompt** (*"You haven't covered the Left Underarm (Axilla) area. Want to go back?"*).
3. **Log a Finding & Inspect 4-Month Pre-Seeded History (45s):**
   - Click **+ Log Observation in Current Zone** to show clock-position (`1–12 o'clock`), symptom types, automatic Cycle Day tagging, and red-flag clinical nudges.
   - Switch to the **Timeline & Map** tab (pre-seeded with 4 months of history via **Reset 4-Mo Demo Data**):
     - Point out the **July Luteal Phase** tenderness entry marked *"Not Noted at Subsequent Baseline"* (filtered out hormonal noise!).
     - Point out the **August & September Left Upper Outer (2 o'clock)** lump flagged in rose as **Persisting (2 Consecutive Checks) — Worth Discussing with a Clinician**.
4. **Health-First Cycle Rhythm & One-Page Clinician PDF (45s):**
   - Briefly show the **Cycle Rhythm** tab (28-day physiological strip with zero fertility/ovulation clutter).
   - Click **Export 1-Page Clinician PDF** in the top bar and open the downloaded PDF showing the anatomical pin map, cycle timing context, and longitudinal table.
   - Press `Esc` to demonstrate the instant **Quick Privacy Lock**.
