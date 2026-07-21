// ── K28 Keyboard Layout, Slot Definitions, and Preset Profiles ──

const BASE_W = 426;
const BASE_H = 137;
const MACRO_KEY = "B44";
const MAX_PROFILE_NAME_LENGTH = 32;
const MAX_DESCRIPTION_LENGTH = 200;

// ── Keyboard key layout ──

function getLayout() {
    return [
        { id: "B41", x: 0, y: 0, w: 30, h: 30, label: "B41", kind: "Normal" },
        { id: "B42", x: 36, y: 0, w: 102, h: 30, label: null, kind: "Normal" },
        { id: "B02", x: 144, y: 0, w: 138, h: 101, label: null, kind: "CenterDisplay" },
        { id: "B43", x: 288, y: 0, w: 102, h: 30, label: null, kind: "Normal" },
        { id: "B44", x: 396, y: 0, w: 30, h: 30, label: "B44", kind: "Macro" },
        { id: "B31", x: 0, y: 36, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B32", x: 36, y: 36, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B33", x: 72, y: 36, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B34", x: 108, y: 36, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B35", x: 288, y: 36, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B36", x: 324, y: 36, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B37", x: 360, y: 36, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B38", x: 396, y: 36, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B21", x: 0, y: 71, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B22", x: 36, y: 71, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B23", x: 72, y: 71, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B24", x: 108, y: 71, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B25", x: 288, y: 71, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B26", x: 324, y: 71, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B27", x: 360, y: 71, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B28", x: 396, y: 71, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B11", x: 0, y: 107, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B12", x: 36, y: 107, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B13", x: 72, y: 107, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B14", x: 108, y: 107, w: 102, h: 30, label: null, kind: "Normal" },
        { id: "B15", x: 216, y: 107, w: 102, h: 30, label: null, kind: "Normal" },
        { id: "B16", x: 324, y: 107, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B17", x: 360, y: 107, w: 30, h: 30, label: null, kind: "Normal" },
        { id: "B18", x: 396, y: 107, w: 30, h: 30, label: null, kind: "Normal" },
    ];
}

// ── Slot definitions ──

const SLOT_DEFS = [
    { key: "B11", mode: "Windows", kind: { type: "Preset", name: "Windows OS", description: "The preset layout for Windows OS." } },
    { key: "B12", mode: "Windows", kind: { type: "Preset", name: "Windows OS", description: "The preset layout for Windows OS." } },
    { key: "B13", mode: "Steam", kind: { type: "Custom", name: "Custom Steam Layout", description: "Customizable layout for Steam." } },
    { key: "B14", mode: "Steam", kind: { type: "Custom", name: "Custom Steam Layout", description: "Customizable layout for Steam." } },
    { key: "B15", mode: "PlayStation 3", kind: { type: "Preset", name: "Project DIVA gamepad", description: "Preset layout for PS3, Project DIVA gamepad style." } },
    { key: "B16", mode: "PlayStation 3", kind: { type: "Preset", name: "Project DIVA arcade", description: "Preset layout for PS3, Project DIVA arcade style." } },
    { key: "B17", mode: "Nintendo Switch", kind: { type: "Custom", name: "Custom", description: "Customizable layout for Switch (Custom slot 17)." } },
    { key: "B18", mode: "Nintendo Switch", kind: { type: "Custom", name: "Custom", description: "Customizable layout for Switch (Custom slot 18)." } },
    { key: "B21", mode: "PlayStation 4", kind: { type: "Custom", name: "Custom", description: "Customizable layout for PS4 (Custom slot 21)." } },
    { key: "B22", mode: "PlayStation 4", kind: { type: "Custom", name: "Custom", description: "Customizable layout for PS4 (Custom slot 22)." } },
    { key: "B23", mode: "PlayStation 4", kind: { type: "Custom", name: "Custom", description: "Customizable layout for PS4 (Custom slot 23)." } },
    { key: "B24", mode: "PlayStation 4", kind: { type: "Custom", name: "Custom", description: "Customizable layout for PS4 (Custom slot 24)." } },
    { key: "B25", mode: "Nintendo Switch", kind: { type: "Preset", name: "Universal Type", description: "Universal preset layout for Switch, suitable for rhythm games, Tetris, and RPGs." } },
    { key: "B26", mode: "Nintendo Switch", kind: { type: "Custom", name: "Custom", description: "Customizable layout for Switch (Custom slot 26)." } },
    { key: "B27", mode: "Nintendo Switch", kind: { type: "Custom", name: "Custom", description: "Customizable layout for Switch (Custom slot 27)." } },
    { key: "B28", mode: "Nintendo Switch", kind: { type: "Custom", name: "Custom", description: "Customizable layout for Switch (Custom slot 28)." } },
    { key: "B31", mode: "PlayStation 4", kind: { type: "Preset", name: "Standard Rhythm Game Layout", description: "Default rhythm game key layout. Supports DJMAX RESPECT joystick functions (LS←/→RS, LS↓/↓RS)." } },
    { key: "B32", mode: "PlayStation 4", kind: { type: "Preset", name: "No-Conflict Rhythm Layout", description: "No conflict layout allowing 8 simultaneous button presses. Suitable for DJMAX 6B/8B custom settings and manual FEVER." } },
    { key: "B33", mode: "PlayStation 4", kind: { type: "Preset", name: "Project DIVA Gamepad Style", description: "Project DIVA gamepad style layout." } },
    { key: "B34", mode: "PlayStation 4", kind: { type: "Preset", name: "Project DIVA Arcade Style", description: "Project DIVA arcade style layout." } },
    { key: "B35", mode: "PlayStation 4", kind: { type: "Preset", name: "WASD Fighting Style", description: "WASD style for fighting games. SOCD: UP+DOWN=UP, LEFT+RIGHT=NEUTRAL (international tournament standard)." } },
    { key: "B36", mode: "PlayStation 4", kind: { type: "Preset", name: "Hit-box Fighting Style", description: "Hit-box fighting style layout." } },
    { key: "B37", mode: "PlayStation 4", kind: { type: "Preset", name: "Taiko no Tatsujin Layout", description: "Variety of fingering styles for Taiko no Tatsujin." } },
    { key: "B38", mode: "PlayStation 4", kind: { type: "Custom", name: "Custom", description: "Customizable layout for PS4 (Custom slot 38)." } },
];

// ── Factory-default bindings for preset profiles ──

const PRESET_BINDINGS = {
    "B11": [
        ["B41", "esc"], ["B42", "-"], ["B43", "+"],
        ["B11", "ctrl"], ["B12", "alt"], ["B13", "🔒"], ["B14", "b"],
        ["B15", "space"], ["B16", "←"], ["B17", "↓"], ["B18", "→"],
        ["B21", "shift"], ["B22", "z"], ["B23", "x"], ["B24", "c"],
        ["B25", "m"], ["B26", ","], ["B27", "↑"], ["B28", "enter"],
        ["B31", "tab"], ["B32", "s"], ["B33", "d"], ["B34", "f"],
        ["B35", "j"], ["B36", "k"], ["B37", "l"], ["B38", ";"],
        ["B41", "esc"],
    ],
    "B12": [
        ["B13", "🔒"],
        ["B31", "tab"], ["B32", "s"], ["B33", "d"], ["B34", "f"],
        ["B22", "z"], ["B23", "x"], ["B24", "c"],
        ["B14", "space"], ["B15", "space"],
        ["B21", "shift"], ["B11", "ctrl"], ["B12", "alt"],
        ["B41", "esc"], ["B42", "-"], ["B43", "="],
        ["B35", "j"], ["B36", "k"], ["B37", "l"], ["B38", ";"],
        ["B25", "m"], ["B26", ","],
        ["B18", "→"], ["B27", "↑"], ["B17", "↓"], ["B16", "←"],
        ["B28", "enter"],
    ],
    "B15": [
        ["B41", "🔒"], ["B42", "LS ←"], ["B43", "RS →"],
        ["B11", "select"], ["B14", "LS →"], ["B15", "← RS"],
        ["B17", "PS"], ["B18", "start"],
        ["B21", "□△XO"], ["B22", "←"], ["B23", "↓"], ["B24", "→"],
        ["B25", "□"], ["B26", "X"], ["B27", "O"], ["B28", "□△XO"],
        ["B31", "L3"], ["B32", "L2"], ["B33", "↑"], ["B34", "L1"],
        ["B35", "R1"], ["B36", "△"], ["B37", "R2"], ["B38", "R3"],
    ],
    "B16": [
        ["B41", "🔒"], ["B42", "LS ←"], ["B43", "RS →"],
        ["B11", "select"], ["B14", "LS →"], ["B15", "← RS"],
        ["B17", "PS"], ["B18", "start"],
        ["B21", "↓"], ["B22", "L3"], ["B23", "L2"], ["B24", "L1"],
        ["B25", "R1"], ["B26", "R2"], ["B27", "R3"], ["B28", "→"],
        ["B31", "↑"], ["B32", "□△XO"], ["B33", "△"], ["B34", "□"],
        ["B35", "X"], ["B36", "O"], ["B37", "□△XO"], ["B38", "←"],
    ],
    "B25": [
        ["B41", "🔒"], ["B42", "L"], ["B43", "R"],
        ["B11", "-"], ["B12", "capture"], ["B13", "ZL"], ["B14", "← LS"],
        ["B15", "RS →"], ["B16", "ZR"], ["B17", "home"], ["B18", "+"],
        ["B22", "←"], ["B23", "↓"], ["B24", "→"],
        ["B25", "Y"], ["B26", "B"], ["B27", "A"],
        ["B32", "←"], ["B33", "↑"], ["B34", "→"],
        ["B35", "Y"], ["B36", "X"], ["B37", "A"],
    ],
    "B31": [
        ["B41", "🔒"], ["B42", "LS ←"], ["B43", "→ RS"],
        ["B11", "share"], ["B12", "pad"], ["B13", "L2"], ["B14", "L1"],
        ["B15", "R1"], ["B16", "R2"], ["B17", "PS"], ["B18", "option"],
        ["B21", "L3"], ["B22", "←"], ["B23", "↓"], ["B24", "→"],
        ["B25", "□"], ["B26", "X"], ["B27", "O"], ["B28", "R3"],
        ["B31", "LS ↓"], ["B32", "←"], ["B33", "↑"], ["B34", "→"],
        ["B35", "□"], ["B36", "△"], ["B37", "O"], ["B38", "↓ RS"],
    ],
    "B32": [
        ["B41", "🔒"], ["B42", "LS ←"], ["B43", "→ RS"],
        ["B11", "share"], ["B12", "pad"], ["B13", "L2"], ["B14", "L1"],
        ["B15", "R1"], ["B16", "R2"], ["B17", "PS"], ["B18", "option"],
        ["B21", "L3"], ["B22", "←"], ["B23", "↓"], ["B24", "→"],
        ["B25", "□"], ["B26", "X"], ["B27", "O"], ["B28", "R3"],
        ["B31", "↓"], ["B32", "←"], ["B33", "↑"], ["B34", "X"],
        ["B35", "□"], ["B36", "△"], ["B37", "O"], ["B38", "↓"],
    ],
    "B33": [
        ["B41", "🔒"], ["B42", "LS ←"], ["B43", "RS →"],
        ["B11", "share"], ["B12", "pad"],
        ["B14", "LS →"], ["B15", "← RS"],
        ["B17", "PS"], ["B18", "option"],
        ["B21", "□△XO"], ["B22", "←"], ["B23", "↓"], ["B24", "→"],
        ["B25", "□"], ["B26", "X"], ["B27", "O"], ["B28", "□△XO"],
        ["B31", "L3"], ["B32", "L2"], ["B33", "↑"], ["B34", "L1"],
        ["B35", "R1"], ["B36", "△"], ["B37", "R2"], ["B38", "R3"],
    ],
    "B34": [
        ["B41", "🔒"], ["B42", "LS ←"], ["B43", "RS →"],
        ["B11", "share"], ["B12", "pad"],
        ["B14", "LS →"], ["B15", "← RS"],
        ["B17", "PS"], ["B18", "option"],
        ["B21", "↓"], ["B22", "L3"], ["B23", "L2"], ["B24", "L1"],
        ["B25", "R1"], ["B26", "R2"], ["B27", "R3"], ["B28", "→"],
        ["B31", "↑"], ["B32", "□△XO"], ["B33", "△"], ["B34", "□"],
        ["B35", "X"], ["B36", "O"], ["B37", "□△XO"], ["B38", "←"],
    ],
    "B35": [
        ["B41", "🔒"], ["B11", "share"], ["B12", "pad"], ["B13", "L3"],
        ["B16", "R3"], ["B17", "PS"], ["B18", "option"],
        ["B22", "←"], ["B23", "↓"], ["B24", "→"],
        ["B25", "X"], ["B26", "O"], ["B27", "R2"], ["B28", "L2"],
        ["B33", "↑"],
        ["B35", "□"], ["B36", "△"], ["B37", "R1"], ["B38", "L1"],
    ],
    "B36": [
        ["B41", "🔒"],
        ["B11", "share"], ["B12", "pad"], ["B13", "L2"],
        ["B14", "↑"], ["B15", "↑"], ["B16", "R3"],
        ["B17", "PS"], ["B18", "option"],

        ["B25", "X"], ["B26", "O"], ["B27", "R2"], ["B28", "L2"],
        ["B32", "←"], ["B33", "↓"], ["B34", "→"],
        ["B35", "□"], ["B36", "△"], ["B37", "R1"], ["B38", "L1"],
    ],
    "B37": [
        ["B41", "🔒"], ["B42", "L1"], ["B43", "R1"],
        ["B11", "share"], ["B12", "pad"], ["B13", "L2"],
        ["B14", "↑"], ["B15", "△"], ["B16", "R2"],
        ["B17", "PS"], ["B18", "option"],
        ["B22", "←"], ["B23", "↓"], ["B24", "→"],
        ["B25", "□"], ["B26", "X"], ["B27", "O"],
        ["B32", "←"], ["B33", "↑"], ["B34", "→"],
        ["B35", "□"], ["B36", "△"], ["B37", "O"],
    ],
};

// ── Utility functions ──

function slotModes() {
    const map = {};
    for (const def of SLOT_DEFS) {
        map[def.key] = def.mode;
    }
    return map;
}

function slotIsCustom(key) {
    for (const def of SLOT_DEFS) {
        if (def.key === key && def.kind.type === "Custom") return true;
    }
    return false;
}

function modeForSlot(slotKey) {
    for (const def of SLOT_DEFS) {
        if (def.key === slotKey) return def.mode;
    }
    return "";
}

function loadPresetProfiles() {
    const profiles = {};
    for (const def of SLOT_DEFS) {
        if (def.kind.type === "Preset") {
            profiles[def.key] = createProfile(def.key, def.kind.name, def.kind.description, def.mode);
        }
    }
    for (const [slotKey, bindings] of Object.entries(PRESET_BINDINGS)) {
        if (profiles[slotKey]) {
            const b = {};
            for (const [k, v] of bindings) {
                b[k] = v;
            }
            profiles[slotKey].bindings = b;
        }
    }
    return profiles;
}

function loadDefaultProfiles() {
    const profiles = {};
    for (const def of SLOT_DEFS) {
        if (def.kind.type === "Custom") {
            profiles[def.key] = createProfile(def.key, def.kind.name, def.kind.description, def.mode);
        }
    }
    return profiles;
}

function pct(value, total) {
    return ((value / total) * 100) + "%";
}
