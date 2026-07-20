// ── Data model types ──
// KeyDef: { id: string, x: number, y: number, w: number, h: number, label: string|null, kind: string }
// Profile: { slotKey: string, name: string, description: string, imageIds: string[], bindings: {[keyId]: string} }
// SlotDef: { key: string, mode: string, kind: { type: 'preset'|'custom', name: string, description: string } }

const HARDWARE_LOCK_KEY = "B41";
const HARDWARE_LOCK_VALUE = "🔒";

function createProfile(slotKey, name, description, mode) {
    const bindings = {};
    // HARDWARE_LOCK_KEY is always HARDWARE_LOCK_VALUE on non-Windows modes
    if (mode !== "Windows") {
        bindings[HARDWARE_LOCK_KEY] = HARDWARE_LOCK_VALUE;
    }
    return { slotKey, name, description, imageIds: [], bindings };
}
