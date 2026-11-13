# High-Performance Web-SCADA (Angular + RxJS + Signals)

A prototype of an architectural core for web dispatching (Web-SCADA / IIoT). It demonstrates processing a high-frequency data stream (100 packets/sec) and rendering the UI without blocking the browser's main thread.

## ✨ Key Features

- **WebSocket outside Angular Zone:** Using `NgZone.runOutsideAngular()` prevents global Change Detection from triggering on every incoming message.
- **Granular Signals:** Instead of one huge state, a `Map<string, WritableSignal>` is used. Updating the `TR_01_AMP` tag recalculates only the components that depend on it.
- **Data Batching:** The high-frequency stream is buffered and flushed to the UI strictly every 100 ms (10 frames/sec).
- **Alarm Management:**
  - **Hysteresis:** Separate conditions for triggering and resetting (prevents "flickering").
  - **Acknowledgment:** The operator must acknowledge the alarm. An alarm that has passed but was not acknowledged remains on the screen.
- **SVG Mimic Diagram:** An interactive substation diagram reflecting the state of breakers and lines in real time.
- **ISA-101 Principles:** Color coding (green — normal, yellow — warning, red — critical alarm).

## 🛠 Stack

- **Frontend:** Angular 19+ (Standalone Components, Signals, `input()`, `output()`, Routing).
- **Reactive:** RxJS 7+ (`scan`, `merge`).
- **Backend (Mock):** Node.js, `ws` (telemetry gateway emulator).

## 🏃‍♂️ Quick Start

1. Install all dependencies (including `ws` for the server) in the project root:

    npm install

2. Run the frontend and mock server with a single command:

    npm start

3. Open `http://localhost:4200` (you will be redirected to `/engineer-console`).

## 📂 Structure

- `tools/mock-server` — Node.js server emulating tags and faults.
- `src/app/services/scada-data.service.ts` — core logic (WebSocket, batching, signals, alarms).
- `src/app/models/` — data models and alarm rule configuration (Data-Driven).
- `src/app/components/` — UI (Console, Alarm Panel, Cards, SVG Diagram).

## 📈 Roadmap

- [x] Core on Signals + RxJS (batching, hysteresis, acknowledgment).
- [x] UI: instrument cards, alarm panel, SVG mimic diagram.
- [ ] Integration of historical trend charts (Apache ECharts).
- [ ] Adding authorization (opening/closing WebSocket per session).
