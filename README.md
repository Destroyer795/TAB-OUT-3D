# TAB-OUT 3D ⚡

### Character and animation refinement

Characters have revised shoulders and hips, connected elbows and knees, sculpted faces, visible eyes, smooth hairlines, and quieter fabric shading. Seated reactions preserve chair height. Typing hands target the actual keyboard, meeting gestures follow the active speaker, and workers stand, turn, walk, align with their chair, and sit before resuming work. Boss patrols follow curves at walking speed.

Run `npm run dev`, then open `http://localhost:8080`. No build or install is required. `npm run check` checks JavaScript syntax and `npm test` runs the system regression suite. With the server running, `npm run test:browser` and `npm run test:characters` run headless Chrome checks (set `CHROME_PATH` if Chrome is installed elsewhere). Visit `http://localhost:8080/tests/characters.html` for the interactive Character Lab, including walking, typing, meeting, reaction, and face-detail views.

TAB-OUT 3D is a stealth arcade experience set in a simulated 3D corporate office environment. Players control a fast-paced cyberpunk lane runner on their virtual workstation monitor while dodging the eagle eye of the roaming corporate boss.

---

## 🎮 What Makes It 1000x Better?

### 🛡️ Cyber Runner 2.0 (Arcade Overhaul)
* **Power-Ups System**:
  * 🛡️ **Holographic Shield**: Absorbs a collision crash with an energy shatter effect.
  * ⚡ **Overclock (Nitro Boost)**: 3x score multiplier, invulnerability, trail distortion, demolishes obstacles in your path!
  * 🧲 **Data Magnet**: Attracts nearby floating data chips across lanes.
  * 💣 **EMP Glitch Bomb**: Clears all barriers on the monitor in a digital shockwave.
  * ☕ **Espresso Drop**: Restores employee productivity on the fly!
* **Ship Aerodynamic Banking**: Ship smoothly banks and tilts dynamically into turns.
* **Diverse Hazards**: Shifting glitch barriers, hazard-striped laser gates, and speed-ramping difficulty.
* **CRT Phosphor Glow**: Realistic scanlines, curved monitor vignette, and floating combo multipliers.

### 👁️ Dynamic Suspicion & Stealth Tension
* **Boss Suspicion Meter**: Instead of unfair instant-kills, looking at your monitor charges a heart-pounding Suspicion Eye meter.
* **Heartbeat Audio**: Sub-bass tension heartbeats quicken as the boss draws near.
* **Close Call Rewards**: Tabbing out just in the nick of time (>55% suspicion) triggers a **"CLOSE CALL! +250 PTS"** bonus with a sigh of relief!
* **Surveillance Webcam**: Physical webcam on your monitor with a live LED indicator that pulses red during boss patrols.
* **Boss Inspection Pauses**: Boss occasionally pauses right outside your cubicle and turns his head to inspect your desk.

### ⌨️ Interactive "Number Crunching" Spreadsheet Mode
* Hiding is no longer passive waiting! Typing any keys while hiding in Spreadsheet Mode crunches financial formulas (`=SYNERGY()`, `=EBITDA()`).
* Mechanical keyboard click-clack sounds on every keystroke.
* Live reactive financial bar charts and floating profit popups (`+$24,500 EBITDA!`).
* **Active Productivity Recovery**: Crunching numbers actively replenishes your productivity bar!

### ☕ Desk Coffee Mug Interaction
* Steaming 3D coffee mug sits on your desk.
* Press **C** or click the HUD button to drink coffee!
* Restores +35% productivity and gives an instant energy boost with gulp SFX.

### 🎵 Procedural Synthwave Audio & Spatial Audio
* **Procedural 80s Cyberpunk Soundtrack**: Real-time arpeggiated basslines, chord pads, and retro beats generated via Web Audio API.
* **Headphone Muffle Filter**: Switching to the spreadsheet triggers a 400Hz lowpass filter, realistically muffling your arcade music like leaked sound from headphones!
* **3D Spatial Footsteps**: Boss footsteps dynamically pan across stereo channels based on his exact corridor coordinates.

### 👔 Corporate Career Ladder & Achievements
* Climb the ranks from **Unpaid Intern** (0 pts) to **Chief Executive Gamer (CEO)** (20,000 pts) with celebratory promotion toasts!
* Real-time achievement unlocks: *Nerve of Steel*, *Caffeine Overdrive*, *Wall Street Wizard*, and *Flow State*.

### ⚡ Instant Guest Play
* Jump straight into the game with 1 click using **Quick Play as Guest**, or log in to sync high scores globally.

---

## 🕹️ Controls

| Key | Action |
| --- | --- |
| **← →** or **A / D** | Steer Cyber Ship between lanes |
| **HOLD SPACE** | Tab out to Spreadsheet & Crunch numbers |
| **Any Typing Keys** | Crunch numbers & boost productivity (while hiding) |
| **C** or Click Mug | Drink coffee (+35% Productivity) |
| **P** or **ESC** | Pause shift & Audio options |

---

## 🚀 How to Run Locally

Since the game is built using native browser ES modules, it must be run from a local web server:

1. Open your terminal in the project directory.
2. Start a local server:
   ```bash
   python -m http.server 8080
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8080
   ```
