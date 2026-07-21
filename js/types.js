// ── Data model types ──
// KeyDef: { id: string, x: number, y: number, w: number, h: number, label: string|null, kind: string }
// Profile: { slotKey: string, name: string, description: string, imageIds: string[], bindings: {[keyId]: string} }
// SlotDef: { key: string, mode: string, kind: { type: 'preset'|'custom', name: string, description: string } }

const HARDWARE_LOCK_KEY = "B41";
const WINDOWS_LOCK_KEY = "B13";
const HARDWARE_LOCK_VALUE = "🔒";
const PRESETS_EDITABLE = false;

/** Single source of truth: which key is the hardware lock for a given mode. */
function lockKeyForMode(mode) {
    return mode === "Windows" ? WINDOWS_LOCK_KEY : HARDWARE_LOCK_KEY;
}

function createProfile(slotKey, name, description, mode) {
    const bindings = {};
    bindings[lockKeyForMode(mode)] = HARDWARE_LOCK_VALUE;
    return { slotKey, name, description, bindings };
}

// Page: { id, title, content (markdown), imageIds }
function createPage(id, title, content) {
    return { id, title, content, imageIds: [] };
}
