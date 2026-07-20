# K28 Studio — Keyboard Controller Profile Manager

A web-based profile manager for the **Gamo2 K28** keyboard controller. Build, edit, and organize key binding profiles entirely in your browser. No build step, no toolchain — just HTML, CSS, and vanilla JavaScript with IndexedDB for local storage.

---

## Architecture

```
┌───────────────────────────────────────────┐
│              Browser                      │
│  ┌────────────────────────────────────┐   │
│  │      K28 Frontend (HTML + JS)      │   │
│  │                                    │   │
│  │  ┌──────────┐  ┌───────────────┐   │   │
│  │  │ Selector │  │  Profile      │   │   │
│  │  │   View   │◄─►│  Editor      │   │   │
│  │  └────┬─────┘  └──────┬────────┘   │   │
│  │       │               │            │   │
│  │       ▼               ▼            │   │
│  │  ┌──────────────────────────────┐  │   │
│  │  │     IndexedDB (local)        │  │   │
│  │  │  profiles  │  images         │  │   │
│  │  └──────────────────────────────┘  │   │
│  └────────────────────────────────────┘   │
└───────────────────────────────────────────┘
```

The entire app runs client-side. All profiles and images are stored in the browser's IndexedDB — no server required.

---

## Features

- **Visual keyboard layout** — Data-driven rendering of the full K28 layout with HTML/CSS (no images)
- **Profile Selector** — View all profiles at a glance with key indicators and uploaded images
- **Profile Editor** — Remap keys, set names/descriptions, upload images
- **Edit Mode** — Quick remap by clicking keys directly on the keyboard
- **Binding picker** — Assign key bindings from a dialog
- **Context menus** — Right-click profiles and keys for management actions
- **Import/Export** — Download/upload profiles as ZIP archives
- **Image management** — Upload and display profile key images (PNG, JPEG, WebP, GIF, SVG, BMP)
- **Copy/Paste bindings** — Copy key bindings between profiles from the selector view
- **Preset profiles** — 9 factory presets included (Windows, PS4, Switch, etc.)

---

## Quick Start

No dependencies required. Serve the directory with any static file server:

```bash
cd k28
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

That's it. No build step, no npm install, no Rust toolchain. Edit a file and refresh the browser.

---

## Project Structure

```
k28/
├── index.html          ← Entry point
├── css/main.css        ← All styles
├── js/
│   ├── types.js        ← Data model
│   ├── data.js         ← Keyboard layout, slot defs, preset profiles
│   ├── storage.js      ← IndexedDB persistence
│   ├── export.js       ← ZIP import/export
│   └── app.js          ← Main application logic
└── README.md
```

---

## License

MIT
