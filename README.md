# K28 Studio — Keyboard Controller Profile Manager

A web-based profile manager for the **Gamo2 K28** keyboard controller. Build, edit, and organize key binding profiles entirely in your browser. No build step, no toolchain — just HTML, CSS, and vanilla JavaScript with IndexedDB for local storage.
just HTML, CSS, and vanilla JavaScript with IndexedDB for local storage.

![K28 Studio web interface](images/interface.png)

---

## Architecture

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

No dependencies required. Open `index.html` in your browser.

> Make sure the entire `k28/` directory is preserved — `index.html` loads CSS, JS, and images from sibling folders. It won't work if you move just the HTML file somewhere else.

That's it!

---

## License

MIT
