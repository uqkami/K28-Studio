// ── K28 Studio — Main Application Logic ──

// ============================================================================
// State
// ============================================================================

const state = {
    db: null,
    loaded: false,
    userProfiles: {},        // KeyId → Profile
    activeProfileKey: null,  // KeyId or null
    editMode: false,
    editingKey: null,        // KeyId or null
    hoveredKey: null,        // KeyId or null
    hoverTimerId: null,
    menu: null,              // { x, y, keyId } or null
    addModal: null,          // { slotKey, name, description } or null
    renameModal: null,       // { slotKey, value, mode } or null
    confirmModal: null,      // { message, action } or null
    viewingPage: null,        // { page, slotKey, editing } or null
    showSettings: false,
    showProfileSettings: false,
    expandedImage: null,     // URL string or null
    toast: null,             // { message, success } or null
    processing: false,
    imageUrls: {},           // UUID → object URL
    copyMode: null,          // null = off, 'select' = selecting source, string = source key
    toastTimer: null,
    allPages: {},             // slotKey → Page[] — replaces allImageRefs
};

// Compile-time data
const presetProfiles = loadPresetProfiles();
const defaultsSnapshot = loadDefaultProfiles();

// ============================================================================
// Derived state helpers
// ============================================================================

function profileForKey(key) {
    return state.userProfiles[key] || presetProfiles[key] || null;
}

function assignedSlots() {
    const set = new Set(Object.keys(state.userProfiles));
    for (const key of Object.keys(presetProfiles)) {
        set.add(key);
    }
    return set;
}

function activeProfile() {
    if (!state.activeProfileKey) return null;
    return profileForKey(state.activeProfileKey);
}

function isActivePreset() {
    if (!state.activeProfileKey) return false;
    return !state.userProfiles[state.activeProfileKey] && !!presetProfiles[state.activeProfileKey];
}

function isUserSlot(key) {
    return key in state.userProfiles;
}

// ── Hardware lock helpers (single source of truth for the lock key rule) ──

function isLockKey(keyId, slotKey) {
    return keyId === HARDWARE_LOCK_KEY && modeForSlot(slotKey) !== "Windows";
}

function ensureLockBinding(profile) {
    if (modeForSlot(profile.slotKey) !== "Windows") {
        profile.bindings[HARDWARE_LOCK_KEY] = HARDWARE_LOCK_VALUE;
    }
}

// ============================================================================
// DOM cache / refs (populated on init)
// ============================================================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
let els = {};

// ============================================================================
// Rendering — Keyboard
// ============================================================================

function renderKeyboard() {
    const container = document.getElementById("keyboard-content");
    if (!container) return;
    container.innerHTML = "";

    const keys = getLayout();
    const slots = assignedSlots();

    for (const key of keys) {
        const keyId = key.id;
        const profileExists = slots.has(keyId);
        const isBig = key.w >= 100 || key.h >= 90;
        const isCenter = key.kind === "CenterDisplay";
        const isMacro = key.kind === "Macro";

        const style = `left:${pct(key.x, BASE_W)};top:${pct(key.y, BASE_H)};width:${pct(key.w, BASE_W)};height:${pct(key.h, BASE_H)};`;

        // Visual classes
        const isEdge = key.x === 0 || (key.x + key.w) >= BASE_W;
        const isWideTop = key.y < 50 && key.w > 60;
        const isSpacebar = key.w >= 100 && key.y >= 100;
        const isLight = (key.y < 50 && !isEdge && !isWideTop) || isSpacebar;
        const isCorner = isEdge && (key.y === 0 || key.y + key.h >= BASE_H);

        if (isCenter) {
            const el = document.createElement("div");
            el.id = keyId;
            el.className = "center-panel" + (activeProfile() && state.editMode && !isActivePreset() ? " interactive" : "");
            el.style.cssText = style;
            el.appendChild(buildCenterContent());
            container.appendChild(el);
            continue;
        }

        const isPresetActive = isActivePreset();
        const canEdit = state.editMode && !isPresetActive;
        const isLockedKey = activeProfile() && isLockKey(keyId, activeProfile().slotKey);
        const isEditableKey = canEdit && !isMacro && !isLockedKey;

        if (isEditableKey) {
            // Inline edit overlay
            const wrap = document.createElement("div");
            wrap.className = "key-edit-wrap";
            wrap.style.cssText = style;
            wrap.dataset.keyId = keyId;

            const input = document.createElement("input");
            input.className = "inline-edit";
            input.value = activeProfile().bindings[keyId] || "";
            input.addEventListener("input", (e) => {
                const val = e.target.value;
                const ak = state.activeProfileKey;
                if (ak && state.userProfiles[ak]) {
                    state.userProfiles[ak].bindings[keyId] = val;
                    scheduleAutosave();
                }
            });
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                    e.target.blur();
                }
            });
            wrap.addEventListener("mouseenter", () => setHoveredKey(keyId));
            wrap.addEventListener("mouseleave", () => clearHoveredKey());
            wrap.addEventListener("click", (e) => e.stopPropagation());
            wrap.appendChild(input);
            container.appendChild(wrap);
        } else {
            const btn = document.createElement("button");
            let classStr = "key " +
                (isLight ? "light " : "") +
                (isCorner ? "corner " : "") +
                (profileExists ? "assigned " : "") +
                (isBig ? "big " : "") +
                (isPresetActive && isMacro ? "disabled " : "") +
                (isLockedKey ? "disabled " : "");

            // Copy mode classes
            if (!activeProfile()) {
                const cm = state.copyMode;
                if (cm === "select") {
                    if (profileExists) classStr += "copy-selectable ";
                } else if (typeof cm === "string") {
                    if (keyId === cm) classStr += "copy-source ";
                    else if (slotIsCustom(keyId)) classStr += "copy-target ";
                } else if (cm === null) {
                    // Normal
                }
                // MACRO key shows "copy-active" when copy mode is active
                if (isMacro && cm !== null) classStr += "copy-active ";
            }

            btn.className = classStr.trim();
            btn.id = keyId;
            btn.style.cssText = style;
            btn.setAttribute("aria-label", keyId);

            btn.addEventListener("mouseenter", () => setHoveredKey(keyId));
            btn.addEventListener("mouseleave", () => clearHoveredKey());
            btn.addEventListener("focus", (e) => e.target.blur());

            btn.addEventListener("click", (e) => handleKeyClick(keyId, profileExists, e));
            btn.addEventListener("contextmenu", (e) => openMenu(e, keyId));

            // Label / content
            const copyState = state.copyMode;
            let slotName, detailLabel;

            if (copyState !== null && !activeProfile()) {
                // In copy mode
                if (isMacro) {
                    slotName = keyId;
                    detailLabel = "CANCEL";
                } else if (copyState === "select") {
                    slotName = keyId;
                    detailLabel = profileExists ? "COPY" : "";
                } else if (typeof copyState === "string") {
                    if (keyId === copyState) {
                        slotName = keyId;
                        detailLabel = "COPY";
                    } else if (slotIsCustom(keyId)) {
                        slotName = keyId;
                        detailLabel = "PASTE";
                    } else {
                        slotName = keyId;
                        detailLabel = "";
                    }
                } else {
                    slotName = keyId;
                    detailLabel = "";
                }
            } else if (isMacro) {
                    slotName = keyId;
                    detailLabel = "COPY";
                } else {
                    slotName = keyId;
                    detailLabel = modeForSlot(keyId);
                }

            if (!activeProfile()) {
                const sn = document.createElement("div");
                sn.className = "slot-name";
                sn.textContent = slotName;
                btn.appendChild(sn);

                const dl = document.createElement("div");
                dl.className = "detail-label";
                dl.textContent = detailLabel;
                btn.appendChild(dl);
            } else {
                const act = activeProfile();
                if (act) {
                    const bind = act.bindings[keyId];
                    const dl = document.createElement("div");
                    dl.className = "detail-label";
                    if (bind && bind !== "") {
                        dl.textContent = bind;
                    } else if (isMacro) {
                        dl.textContent = state.editMode ? "DONE" : "EDIT";
                    } else {
                        dl.textContent = state.editMode ? "+" : "";
                    }
                    btn.appendChild(dl);
                }
            }

            container.appendChild(btn);
        }
    }
}

function buildCenterContent() {
    const frag = document.createDocumentFragment();

    if (activeProfile()) {
        const act = activeProfile();
        if (state.editMode && !isActivePreset()) {
            // Editable mode
            const editable = document.createElement("div");
            editable.className = "editable";
            editable.addEventListener("click", (e) => e.stopPropagation());

            const modeLabel = document.createElement("div");
            modeLabel.className = "editable-mode";
            modeLabel.textContent = "Mode: " + modeForSlot(act.slotKey);
            editable.appendChild(modeLabel);

            const nameInput = document.createElement("input");
            nameInput.value = act.name;
            nameInput.maxLength = MAX_PROFILE_NAME_LENGTH;
            nameInput.setAttribute("aria-label", "Profile name");
            nameInput.addEventListener("input", (e) => {
                const ak = state.activeProfileKey;
                if (ak && state.userProfiles[ak]) {
                    state.userProfiles[ak].name = e.target.value;
                    scheduleAutosave();
                }
            });
            editable.appendChild(nameInput);

            const descInput = document.createElement("textarea");
            descInput.value = act.description;
            descInput.maxLength = MAX_DESCRIPTION_LENGTH;
            descInput.setAttribute("aria-label", "Profile description");
            descInput.addEventListener("input", (e) => {
                const ak = state.activeProfileKey;
                if (ak && state.userProfiles[ak]) {
                    state.userProfiles[ak].description = e.target.value;
                    scheduleAutosave();
                }
            });
            editable.appendChild(descInput);

            const slot = document.createElement("div");
            slot.className = "slot";
            slot.textContent = "Slot: " + act.slotKey;
            editable.appendChild(slot);

            frag.appendChild(editable);
        } else {
            // Display mode
            const hoverOpt = state.hoveredKey;
            if (hoverOpt) {
                const hk = hoverOpt;
                const valStr = hk === MACRO_KEY ? "MACRO" : (act.bindings[hk] || "None");
                const display = document.createElement("div");
                display.className = "display";
                display.style.cssText = "display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; width: 100%;";
                const h2 = document.createElement("h2");
                h2.style.cssText = "font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.1em;";
                h2.textContent = "Key " + hk;
                display.appendChild(h2);
                const val = document.createElement("div");
                val.style.cssText = "font-size: 28px; font-weight: 800; color: #22d3ee; word-break: break-all; padding: 0 8px;";
                val.textContent = valStr;
                display.appendChild(val);
                frag.appendChild(display);
            } else {
                const display = document.createElement("div");
                display.className = "display";
                const h2 = document.createElement("h2");
                h2.textContent = modeForSlot(act.slotKey);
                display.appendChild(h2);
                const nameDiv = document.createElement("div");
                nameDiv.className = "profile-name";
                nameDiv.textContent = act.name;
                display.appendChild(nameDiv);
                const descDiv = document.createElement("div");
                descDiv.className = "profile-desc";
                descDiv.textContent = act.description;
                display.appendChild(descDiv);
                if (isActivePreset()) {
                    const badge = document.createElement("div");
                    badge.className = "preset-badge";
                    badge.textContent = "Preset profile";
                    display.appendChild(badge);
                }
                const slotDiv = document.createElement("div");
                slotDiv.className = "slot";
                slotDiv.textContent = "Slot: " + act.slotKey;
                display.appendChild(slotDiv);
                frag.appendChild(display);
            }
        }
    } else {
        // No active profile - show hover or empty
        const hk = state.hoveredKey;
        if (hk) {
            const p = profileForKey(hk);
            if (p) {
                const display = document.createElement("div");
                display.className = "display";
                const h2 = document.createElement("h2");
                h2.textContent = modeForSlot(p.slotKey);
                display.appendChild(h2);
                const nameDiv = document.createElement("div");
                nameDiv.className = "profile-name";
                nameDiv.textContent = p.name;
                display.appendChild(nameDiv);
                const descDiv = document.createElement("div");
                descDiv.className = "profile-desc";
                descDiv.textContent = p.description;
                display.appendChild(descDiv);
                const slotDiv = document.createElement("div");
                slotDiv.className = "slot";
                slotDiv.textContent = "Slot: " + p.slotKey;
                display.appendChild(slotDiv);
                frag.appendChild(display);
            } else {
                frag.appendChild(buildEmptyPanel());
            }
        } else {
            frag.appendChild(buildEmptyPanel());
        }
    }

    return frag;
}

// Update just the center panel content without rebuilding the entire keyboard.
function updateCenterPanel() {
    const centerEl = document.getElementById("B02");
    if (!centerEl) return;
    centerEl.innerHTML = "";
    const isInteractive = activeProfile() && state.editMode && !isActivePreset();
    centerEl.className = "center-panel" + (isInteractive ? " interactive" : "");
    centerEl.appendChild(buildCenterContent());
}

function buildEmptyPanel() {
    const empty = document.createElement("div");
    empty.className = "empty";
    const title = document.createElement("div");
    title.style.cssText = "font-size: 13px; font-weight: 700; margin-bottom: 6px;";
    title.textContent = "Profile panel";
    empty.appendChild(title);
    const hint = document.createElement("div");
    hint.textContent = "Right click a highlighted key to add, rename, or delete a profile.";
    empty.appendChild(hint);
    return empty;
}

// ============================================================================
// Toolbar
// ============================================================================

function renderToolbar() {
    const toolbar = document.getElementById("toolbar");
    if (!toolbar) return;
    toolbar.innerHTML = "";

    if (activeProfile()) {
        const act = activeProfile();
        // Left side
        const left = document.createElement("div");
        left.className = "topbar-left";

        const title = document.createElement("div");
        title.className = "title";
        const h1 = document.createElement("h1");
        h1.textContent = "K28 controller";
        title.appendChild(h1);
        const p = document.createElement("p");
        p.textContent = act.slotKey + " - " + modeForSlot(act.slotKey);
        title.appendChild(p);
        left.appendChild(title);

        // Settings gear
        const settingsBtn = makeSettingsSvg(() => {
            state.showProfileSettings = true;
            renderModals();
        });
        settingsBtn.className = "settings-btn";
        left.appendChild(settingsBtn);

        toolbar.appendChild(left);

        // Back button
        const backBtn = document.createElement("button");
        backBtn.className = "back-btn";
        backBtn.textContent = "Back";
        backBtn.addEventListener("click", () => {
            state.activeProfileKey = null;
            state.editMode = false;
            state.editingKey = null;
            state.menu = null;
            state.viewingPage = null;
            fullRender();
        });
        toolbar.appendChild(backBtn);
    } else {
        const left = document.createElement("div");
        left.className = "topbar-left";

        const title = document.createElement("div");
        title.className = "title";
        const h1 = document.createElement("h1");
        h1.textContent = "K28 controller";
        title.appendChild(h1);
        const p = document.createElement("p");
        p.textContent = "Profile selector";
        title.appendChild(p);
        left.appendChild(title);

        const settingsBtn = makeSettingsSvg(() => {
            state.showSettings = true;
            state.menu = null;
            renderModals();
        });
        settingsBtn.className = "settings-btn";
        left.appendChild(settingsBtn);

        toolbar.appendChild(left);
    }
}

function makeSettingsSvg(onclick) {
    const btn = document.createElement("button");
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
    btn.addEventListener("click", onclick);
    return btn;
}

// ============================================================================
// Context Menu
// ============================================================================

function renderMenu() {
    const container = document.getElementById("menu-container");
    if (!container) return;
    container.innerHTML = "";

    if (!state.menu) return;

    const menu = document.createElement("div");
    menu.className = "menu";
    menu.style.cssText = `left: ${state.menu.x}px; top: ${state.menu.y}px;`;
    menu.addEventListener("click", (e) => e.stopPropagation());
    menu.addEventListener("contextmenu", (e) => e.preventDefault());

    const keyId = state.menu.keyId;

    if (activeProfile()) {
        // In profile editor
        if (keyId !== MACRO_KEY && !isActivePreset()) {
            const isLockedKey = isLockKey(keyId, activeProfile().slotKey);
            if (!isLockedKey) {
                addMenuItem(menu, "Replace / remap", () => {
                    state.editingKey = keyId;
                    state.menu = null;
                    renderMenu();
                });
            }
            if (!isLockedKey) {
                addMenuItem(menu, "Remove value", () => {
                const ak = state.activeProfileKey;
                if (ak && state.userProfiles[ak]) {
                    delete state.userProfiles[ak].bindings[keyId];
                    scheduleAutosave();
                }
                state.menu = null;
                renderMenu();
                renderKeyboard();
            });
            }
        } else {
            addMenuItem(menu, "No actions", null, false);
        }
    } else {
        // Profile selector
        if (keyId === MACRO_KEY) {
            addMenuItem(menu, "No actions", null, false);
        } else if (isUserSlot(keyId)) {
            addMenuItem(menu, "Open", () => {
                state.activeProfileKey = keyId;
                state.menu = null;
                fullRender();
            });
            addMenuItem(menu, "Rename", () => {
                state.renameModal = { slotKey: keyId, value: state.userProfiles[keyId].name, mode: "Name" };
                state.menu = null;
                renderMenu();
                renderModals();
            });
            addMenuItem(menu, "Edit description", () => {
                state.renameModal = { slotKey: keyId, value: state.userProfiles[keyId].description, mode: "Description" };
                state.menu = null;
                renderMenu();
                renderModals();
            });
            addMenuItem(menu, "Export Bindings", () => {
                const p = profileForKey(keyId);
                if (p) exportBindings(p);
                state.menu = null;
                renderMenu();
            });
            addMenuItem(menu, "Delete", () => {
                state.confirmModal = {
                    message: "Delete profile on " + keyId + "?",
                    action: { type: "DeleteProfile", slotKey: keyId }
                };
                state.menu = null;
                renderMenu();
                renderModals();
            }, true);
        } else if (presetProfiles[keyId]) {
            addMenuItem(menu, "Open", () => {
                state.activeProfileKey = keyId;
                state.editMode = false;
                state.menu = null;
                fullRender();
            });
            const info = document.createElement("div");
            info.className = "menu-item";
            info.style.cssText = "opacity: 0.5; cursor: default; font-size: 11px;";
            info.textContent = "Preset profile — read-only";
            menu.appendChild(info);
            addMenuItem(menu, "Export Bindings", () => {
                const p = profileForKey(keyId);
                if (p) exportBindings(p);
                state.menu = null;
                renderMenu();
            });
        } else if (slotModes()[keyId]) {
            addMenuItem(menu, "New profile", () => {
                state.addModal = { slotKey: keyId, name: "", description: "" };
                state.menu = null;
                renderMenu();
                renderModals();
            });
        } else {
            addMenuItem(menu, "No actions", null, false);
        }
    }

    container.appendChild(menu);
}

function addMenuItem(parent, text, onclick, danger) {
    const btn = document.createElement("button");
    btn.className = "menu-item" + (danger ? " danger" : "");
    btn.textContent = text;
    if (onclick) {
        btn.addEventListener("click", onclick);
    } else {
        btn.style.cssText = "opacity: 0.7; cursor: default;";
    }
    parent.appendChild(btn);
}

// ============================================================================
// Modals
// ============================================================================

function renderModals() {
    const container = document.getElementById("modal-container");
    if (!container) return;
    container.innerHTML = "";

    // Lightbox
    if (state.expandedImage) {
        const backdrop = document.createElement("div");
        backdrop.className = "lightbox";
        backdrop.addEventListener("click", () => { state.expandedImage = null; renderModals(); });
        const content = document.createElement("div");
        content.className = "lightbox-content";
        content.addEventListener("click", (e) => e.stopPropagation());
        const img = document.createElement("img");
        img.src = state.expandedImage;
        content.appendChild(img);
        const close = document.createElement("button");
        close.className = "lightbox-close";
        close.textContent = "✕";
        close.addEventListener("click", () => { state.expandedImage = null; renderModals(); });
        content.appendChild(close);
        backdrop.appendChild(content);
        container.appendChild(backdrop);
    }

    // Add profile modal
    if (state.addModal) {
        const modal = state.addModal;
        container.appendChild(buildModal(
            "New profile",
            buildModalFields([
                { tag: "input", value: modal.name, placeholder: "Profile name", maxLength: MAX_PROFILE_NAME_LENGTH,
                  oninput: (v) => { state.addModal.name = v; } },
                { tag: "textarea", value: modal.description, placeholder: "Description", maxLength: MAX_DESCRIPTION_LENGTH,
                  oninput: (v) => { state.addModal.description = v; } },
                { tag: "div", className: "modal-mode-display", text: "Mode: " + modeForSlot(modal.slotKey) },
            ]),
            () => { state.addModal = null; renderModals(); },
            () => submitAddProfile()
        ));
    }

    // Rename / Edit description modal
    if (state.renameModal) {
        const modal = state.renameModal;
        const isName = modal.mode === "Name";
        const fields = isName
            ? [{ tag: "input", value: modal.value, placeholder: "Profile name", maxLength: MAX_PROFILE_NAME_LENGTH,
                 oninput: (v) => { state.renameModal.value = v; } }]
            : [{ tag: "textarea", value: modal.value, placeholder: "Description", maxLength: MAX_DESCRIPTION_LENGTH,
                 oninput: (v) => { state.renameModal.value = v; } }];
        container.appendChild(buildModal(
            isName ? "Rename profile" : "Edit description",
            buildModalFields(fields),
            () => { state.renameModal = null; renderModals(); },
            () => submitRename()
        ));
    }

    // Confirm dialog
    if (state.confirmModal) {
        const p = document.createElement("p");
        p.style.cssText = "color: rgba(255,255,255,0.72); line-height: 1.5;";
        p.textContent = state.confirmModal.message;
        container.appendChild(buildModal(
            "Confirm",
            p,
            () => { state.confirmModal = null; renderModals(); },
            () => {
                const action = state.confirmModal.action;
                confirmAction(action);
            },
            true
        ));
    }

    // Settings modal
    if (state.showSettings) {
        const settingsContent = document.createElement("div");
        settingsContent.appendChild(buildSettingsBtn("Export Profiles", () => handleExport()));
        settingsContent.appendChild(buildSettingsBtn("Import Profiles", () => {
            document.getElementById("import-zip-input").click();
        }));
        settingsContent.appendChild(buildSettingsBtn("Reset All", () => handleReset(), true));

        container.appendChild(buildModal("Settings", settingsContent, () => {
            state.showSettings = false;
            renderModals();
        }));
    }

    // Profile Settings modal
    if (state.showProfileSettings) {
        const psContent = document.createElement("div");
        psContent.appendChild(buildSettingsBtn("Export Bindings", () => {
            const ak = state.activeProfileKey;
            if (ak) {
                const p = profileForKey(ak);
                if (p) exportBindings(p);
            }
            state.showProfileSettings = false;
            renderModals();
        }));
        psContent.appendChild(buildSettingsBtn("Import Bindings", () => {
            document.getElementById("import-bindings-input").click();
            state.showProfileSettings = false;
            renderModals();
        }));
        psContent.appendChild(buildSettingsBtn("Clear Bindings", () => {
            const ak = state.activeProfileKey;
            if (ak) {
                state.confirmModal = {
                    message: "Clear all bindings on " + ak + "? The profile itself will be kept.",
                    action: { type: "ClearBindings", slotKey: ak }
                };
                state.showProfileSettings = false;
                renderModals();
            }
        }, true));

        container.appendChild(buildModal("Profile Settings", psContent, () => {
            state.showProfileSettings = false;
            renderModals();
        }));
    }
}

function buildModal(title, body, onCancel, onConfirm, danger) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.addEventListener("click", onCancel);

    const modal = document.createElement("div");
    modal.className = "modal settings-modal";
    modal.addEventListener("click", (e) => e.stopPropagation());

    const h3 = document.createElement("h3");
    h3.textContent = title;
    modal.appendChild(h3);

    if (body) {
        if (body instanceof HTMLElement) {
            modal.appendChild(body);
        } else {
            modal.appendChild(body);
        }
    }

    if (onConfirm || onCancel) {
        const actions = document.createElement("div");
        actions.className = "modal-actions";

        if (onCancel) {
            const cancelBtn = document.createElement("button");
            cancelBtn.className = "modal-btn";
            cancelBtn.textContent = "Cancel";
            cancelBtn.addEventListener("click", onCancel);
            actions.appendChild(cancelBtn);
        }

        if (onConfirm) {
            const okBtn = document.createElement("button");
            okBtn.className = "modal-btn";
            if (danger) okBtn.style.cssText = "color: #fca5a5;";
            okBtn.textContent = "OK";
            okBtn.addEventListener("click", onConfirm);
            actions.appendChild(okBtn);
        }

        modal.appendChild(actions);
    }

    backdrop.appendChild(modal);
    return backdrop;
}

function buildModalFields(fields) {
    const grid = document.createElement("div");
    grid.className = "modal-grid";
    for (const f of fields) {
        if (f.tag === "div") {
            const div = document.createElement("div");
            div.className = f.className || "";
            div.textContent = f.text || "";
            grid.appendChild(div);
        } else if (f.tag === "input") {
            const input = document.createElement("input");
            input.value = f.value || "";
            input.placeholder = f.placeholder || "";
            if (f.maxLength) input.maxLength = f.maxLength;
            if (f.oninput) {
                input.addEventListener("input", (e) => f.oninput(e.target.value));
            }
            grid.appendChild(input);
        } else if (f.tag === "textarea") {
            const ta = document.createElement("textarea");
            ta.value = f.value || "";
            ta.placeholder = f.placeholder || "";
            if (f.maxLength) ta.maxLength = f.maxLength;
            if (f.oninput) {
                ta.addEventListener("input", (e) => f.oninput(e.target.value));
            }
            grid.appendChild(ta);
        }
    }
    return grid;
}

function buildSettingsBtn(text, onclick, danger) {
    const div = document.createElement("div");
    div.className = "settings-section";
    const btn = document.createElement("button");
    btn.className = "modal-btn settings-action" + (danger ? " danger" : "");
    btn.textContent = text;
    btn.addEventListener("click", onclick);
    div.appendChild(btn);
    return div;
}

// ============================================================================
// Pages (Collage)
// ============================================================================

function renderCollage() {
    const container = document.getElementById("collage-container");
    if (!container) return;

    // If viewing/editing a page, defer to renderPageViewer instead
    if (state.viewingPage) {
        renderPageViewer();
        return;
    }

    container.innerHTML = "";

    const act = activeProfile();
    if (!act) return;

    const pages = state.allPages[act.slotKey] || [];
    const pagesLen = pages.length;

    const collage = document.createElement("div");
    collage.className = "collage";

    const header = document.createElement("div");
    header.className = "collage-header";
    const span = document.createElement("span");
    span.textContent = "Pages (" + pagesLen + ")";
    header.appendChild(span);

    const addBtn = document.createElement("button");
    addBtn.className = "collage-add-btn";
    addBtn.textContent = "+ Add page";
    addBtn.addEventListener("click", () => {
        const page = createPage(generateId(), "", "");
        state.viewingPage = { page, slotKey: act.slotKey, editing: true, isNew: true };
        renderPageViewer();
    });
    header.appendChild(addBtn);

    collage.appendChild(header);

    if (pages.length === 0) {
        const empty = document.createElement("div");
        empty.className = "collage-empty";
        empty.textContent = "No pages yet. Add a note with images to reference your controller mappings.";
        collage.appendChild(empty);
    } else {
        const grid = document.createElement("div");
        grid.className = "collage-grid";
        for (const page of pages) {
            const item = document.createElement("div");
            item.className = "collage-item page-card";
            item.addEventListener("click", () => {
                state.viewingPage = { page, slotKey: act.slotKey, editing: false };
                renderPageViewer();
            });

            const preview = document.createElement("div");
            preview.className = "page-card-preview";

            const titleEl = document.createElement("div");
            titleEl.className = "page-card-title";
            titleEl.textContent = page.title || "Untitled";
            preview.appendChild(titleEl);

            // Show first ~100 chars of content as preview
            const contentPreview = document.createElement("div");
            contentPreview.className = "page-card-content";
            const plainText = (page.content || "")
                .replace(/^#{1,6}\s+/gm, "")
                .replace(/[*_~`>|\-\[\]()!]/g, "")
                .replace(/\n+/g, " ")
                .trim();
            contentPreview.textContent = plainText.slice(0, 120) + (plainText.length > 120 ? "…" : "");
            if (!plainText) {
                contentPreview.textContent = "(empty note)";
                contentPreview.style.opacity = "0.4";
            }
            preview.appendChild(contentPreview);

            item.appendChild(preview);

            // Image indicators
            const imgIds = page.imageIds || [];
            if (imgIds.length > 0) {
                const imgStrip = document.createElement("div");
                imgStrip.className = "page-card-images";
                const maxShow = Math.min(imgIds.length, 4);
                for (let i = 0; i < maxShow; i++) {
                    const url = state.imageUrls[imgIds[i]];
                    if (!url) continue;
                    const thumb = document.createElement("div");
                    thumb.className = "page-card-thumb";
                    thumb.style.backgroundImage = "url(" + url + ")";
                    imgStrip.appendChild(thumb);
                }
                if (imgIds.length > 4) {
                    const more = document.createElement("div");
                    more.className = "page-card-thumb page-card-thumb-more";
                    more.textContent = "+" + (imgIds.length - 4);
                    imgStrip.appendChild(more);
                }
                item.appendChild(imgStrip);
            }

            grid.appendChild(item);
        }
        collage.appendChild(grid);
    }

    container.appendChild(collage);
}

// ── Page Viewer / Editor ──

function renderPageViewer() {
    const container = document.getElementById("collage-container");
    if (!container) return;

    const vp = state.viewingPage;
    if (!vp) {
        // When viewingPage is cleared, render the normal collage list
        const savedVp = state.viewingPage;
        state.viewingPage = null;
        renderCollage();
        state.viewingPage = savedVp;
        return;
    }

    container.innerHTML = "";

    const viewer = document.createElement("div");
    viewer.className = "page-viewer";

    // Top bar
    const topBar = document.createElement("div");
    topBar.className = "page-viewer-topbar";

    const backBtn = document.createElement("button");
    backBtn.className = "collage-add-btn";
    backBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="m15 18-6-6 6-6"/></svg>';
    backBtn.addEventListener("click", () => {
        // If editing and dirty, discard
        state.viewingPage = null;
        renderPageViewer();
    });
    topBar.appendChild(backBtn);


    if (!vp.editing) {
        const editBtn = document.createElement("button");
        editBtn.className = "collage-add-btn";
                editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg> Edit';
        editBtn.addEventListener("click", () => {
            state.viewingPage.editing = true;
            renderPageViewer();
        });
        topBar.appendChild(editBtn);

        const delBtn = document.createElement("button");
        delBtn.className = "collage-add-btn";
        delBtn.style.cssText = "color: #fca5a5; border-color: rgba(252,165,165,0.25);";
        delBtn.textContent = "✕ Delete";
        delBtn.addEventListener("click", () => {
            const slotKey = vp.slotKey;
            const pages = state.allPages[slotKey] || [];
            state.allPages[slotKey] = pages.filter(p => p.id !== vp.page.id);
            // Clean up image URLs
            for (const imgId of (vp.page.imageIds || [])) {
                if (state.imageUrls[imgId]) {
                    URL.revokeObjectURL(state.imageUrls[imgId]);
                }
                delete state.imageUrls[imgId];
            }
            scheduleAutosave();
            state.viewingPage = null;
            renderPageViewer();
        });
        topBar.appendChild(delBtn);
    }

    viewer.appendChild(topBar);

    if (vp.editing) {
        // Editor mode — split layout on wide screens
        viewer.appendChild(buildPageEditor(vp));
    } else {
        // Viewer mode — render markdown content and images
        viewer.appendChild(buildPageDisplay(vp));
    }

    container.appendChild(viewer);
}

function buildPageDisplay(vp) {
    const wrap = document.createElement("div");
    wrap.className = "page-display-wrap";

    const contentArea = document.createElement("div");
    contentArea.className = "page-content";

    const bodyEl = document.createElement("div");
    bodyEl.className = "page-content-body markdown-body";

    const title = vp.page.title || "Untitled";
    const fullMd = "# " + title + "\n\n" + (vp.page.content || "");
    if (fullMd.trim()) {
        try {
            bodyEl.innerHTML = marked.parse(fullMd);
        } catch (e) {
            bodyEl.textContent = fullMd;
        }
    } else {
        const empty = document.createElement("p");
        empty.style.cssText = "color: rgba(255,255,255,0.4); font-style: italic;";
        empty.textContent = "(empty note)";
        bodyEl.appendChild(empty);
    }
    contentArea.appendChild(bodyEl);

    wrap.appendChild(contentArea);

    // Image gallery at the bottom — reuse collage styling
    const imgIds = vp.page.imageIds || [];
    if (imgIds.length > 0) {
        const imgSection = document.createElement("div");
        imgSection.className = "page-images";

        const imgHeader = document.createElement("div");
        imgHeader.className = "collage-header";
        const imgSpan = document.createElement("span");
        imgSpan.textContent = "Images (" + imgIds.length + ")";
        imgHeader.appendChild(imgSpan);
        imgSection.appendChild(imgHeader);

        const imgGrid = document.createElement("div");
        imgGrid.className = "collage-grid";
        for (const imgId of imgIds) {
            const url = state.imageUrls[imgId];
            if (!url) continue;
            const item = document.createElement("div");
            item.className = "collage-item";
            item.addEventListener("click", () => {
                state.expandedImage = url;
                renderModals();
            });
            const img = document.createElement("div");
            img.className = "collage-img";
            img.style.backgroundImage = "url(" + url + ")";
            item.appendChild(img);
            imgGrid.appendChild(item);
        }
        imgSection.appendChild(imgGrid);
        wrap.appendChild(imgSection);
    }

    return wrap;
}

function buildPageEditor(vp) {
    const wrap = document.createElement("div");
    wrap.className = (window.innerWidth >= 900) ? "page-editor-wrap split" : "page-editor-wrap";

    const editorPane = document.createElement("div");
    editorPane.className = "page-editor-pane";

    const titleInput = document.createElement("input");
    titleInput.className = "page-editor-title";
    titleInput.value = vp.page.title || "";
    titleInput.placeholder = "Page title…";
    titleInput.addEventListener("input", () => {
        vp.page.title = titleInput.value;
        // Update live preview if split
        const previewBody = wrap.querySelector(".page-preview-body");
        const previewTitle = wrap.querySelector(".page-preview-pane-title");
        if (previewBody && textarea.value) {
            try {
                previewBody.innerHTML = marked.parse(textarea.value);
            } catch (e) {
                previewBody.textContent = textarea.value;
            }
        } else if (previewBody) {
            previewBody.innerHTML = "";
        }
        if (previewTitle) {
            previewTitle.textContent = titleInput.value || "Untitled";
        }
        // Update top bar title
        const tt = wrap.closest(".page-viewer")?.querySelector(".page-viewer-title");
        if (tt) tt.textContent = titleInput.value || "New Page";
    });
    editorPane.appendChild(titleInput);

    const textarea = document.createElement("textarea");
    textarea.className = "page-editor-textarea";
    textarea.value = vp.page.content || "";
    textarea.placeholder = "Write your note in markdown…";
    textarea.addEventListener("input", () => {
        vp.page.content = textarea.value;
        // Update live preview if split
        const previewBody = wrap.querySelector(".page-preview-body");
        if (previewBody) {
            if (textarea.value) {
                try {
                    previewBody.innerHTML = marked.parse(textarea.value);
                } catch (e) {
                    previewBody.textContent = textarea.value;
                }
            } else {
                previewBody.innerHTML = "";
            }
        }
    });
    editorPane.appendChild(textarea);

    // Image attachment area — reuse collage styling
    const imgSection = document.createElement("div");
    imgSection.className = "page-editor-images";

    const imgHeader = document.createElement("div");
    imgHeader.className = "collage-header";
    const imgSpan = document.createElement("span");
    const imgIds = vp.page.imageIds || [];
    imgSpan.textContent = "Attached images (" + imgIds.length + ")";
    imgHeader.appendChild(imgSpan);

    const addImgLabel = document.createElement("label");
    addImgLabel.className = "collage-add-btn";
    addImgLabel.textContent = "+ Add images";
    addImgLabel.setAttribute("for", "page-img-input-" + vp.page.id);
    imgHeader.appendChild(addImgLabel);

    const imgFileInput = document.createElement("input");
    imgFileInput.id = "page-img-input-" + vp.page.id;
    imgFileInput.type = "file";
    imgFileInput.accept = "image/*";
    imgFileInput.multiple = true;
    imgFileInput.style.display = "none";
    imgFileInput.addEventListener("change", async (e) => {
        await handlePageImageUpload(e, vp);
        renderPageViewer();
    });
    imgHeader.appendChild(imgFileInput);

    imgSection.appendChild(imgHeader);

    if (imgIds.length > 0) {
        const imgGrid = document.createElement("div");
        imgGrid.className = "collage-grid";
        for (const imgId of imgIds) {
            const url = state.imageUrls[imgId];
            if (!url) continue;
            const item = document.createElement("div");
            item.className = "collage-item";
            const img = document.createElement("div");
            img.className = "collage-img";
            img.style.backgroundImage = "url(" + url + ")";
            item.appendChild(img);

            const delBtn = document.createElement("button");
            delBtn.className = "collage-del-btn";
            delBtn.textContent = "✕";
            delBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                // Remove image from page
                vp.page.imageIds = (vp.page.imageIds || []).filter(id => id !== imgId);
                if (state.imageUrls[imgId]) {
                    URL.revokeObjectURL(state.imageUrls[imgId]);
                }
                delete state.imageUrls[imgId];
                // Also delete from DB
                if (state.db) {
                    deleteImage(state.db, imgId).catch(console.warn);
                }
                scheduleAutosave();
                renderPageViewer();
            });
            item.appendChild(delBtn);
            imgGrid.appendChild(item);
        }
        imgSection.appendChild(imgGrid);
    } else {
        const empty = document.createElement("div");
        empty.className = "collage-empty";
        empty.textContent = "No images attached.";
        imgSection.appendChild(empty);
    }
    editorPane.appendChild(imgSection);

    // Save / Cancel buttons
    const actionRow = document.createElement("div");
    actionRow.className = "page-editor-actions";

    const saveBtn = document.createElement("button");
    saveBtn.className = "collage-add-btn";
    saveBtn.style.cssText = "background: rgba(16,185,129,0.2); border-color: rgba(16,185,129,0.3); color: #6ee7b7;";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => {
        saveCurrentPage(vp);
    });
    actionRow.appendChild(saveBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "collage-add-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
        // If it was a new page, discard
        if (vp.isNew) {
            state.viewingPage = null;
            renderPageViewer();
        } else {
            // Reload the page from stored data to discard edits
            state.viewingPage.editing = false;
            // Reload page data from state
            const pages = state.allPages[vp.slotKey] || [];
            const reloaded = pages.find(p => p.id === vp.page.id);
            if (reloaded) {
                state.viewingPage.page = reloaded;
            }
            renderPageViewer();
        }
    });
    actionRow.appendChild(cancelBtn);

    editorPane.appendChild(actionRow);

    wrap.appendChild(editorPane);

    // Preview pane for split layout
    if (window.innerWidth >= 900) {
        const previewPane = document.createElement("div");
        previewPane.className = "page-preview-pane";

        const previewTitle = document.createElement("h2");
        previewTitle.className = "page-preview-pane-title";
        previewTitle.textContent = vp.page.title || "Untitled";
        previewPane.appendChild(previewTitle);

        const previewBody = document.createElement("div");
        previewBody.className = "page-preview-body markdown-body";
        if (vp.page.content) {
            try {
                previewBody.innerHTML = marked.parse(vp.page.content);
            } catch (e) {
                previewBody.textContent = vp.page.content;
            }
        }
        previewPane.appendChild(previewBody);

        wrap.appendChild(previewPane);
    }

    return wrap;
}

function saveCurrentPage(vp) {
    const slotKey = vp.slotKey;
    if (!state.allPages[slotKey]) {
        state.allPages[slotKey] = [];
    }
    const pages = state.allPages[slotKey];
    const idx = pages.findIndex(p => p.id === vp.page.id);
    if (idx >= 0) {
        pages[idx] = vp.page;
    } else {
        pages.push(vp.page);
    }
    scheduleAutosave();
    state.viewingPage = { page: vp.page, slotKey, editing: false };
    renderPageViewer();
}

async function handlePageImageUpload(e, vp) {
    const files = e.target.files;
    if (!files || !files.length) return;

    const db = state.db;
    if (!db) return;

    let count = 0;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const imgId = generateId();
            await putImage(db, imgId, file);
            const url = URL.createObjectURL(file);
            state.imageUrls[imgId] = url;
            if (!vp.page.imageIds) {
                vp.page.imageIds = [];
            }
            vp.page.imageIds.push(imgId);
            count++;
        } catch (err) {
            console.warn("Failed to store image:", err);
            showToast("Failed to store image: " + err.message, false);
        }
    }
    if (count > 0) {
        scheduleAutosave();
        showToast("Added " + count + " image" + (count > 1 ? "s" : "") + ".", true);
    }
    e.target.value = "";
}

// ============================================================================
// Toast & Processing
// ============================================================================

function renderToast() {
    const container = document.getElementById("toast-container");
    if (!container) return;
    container.innerHTML = "";
    if (state.toast) {
        const div = document.createElement("div");
        div.className = "toast " + (state.toast.success ? "toast-success" : "toast-error");
        div.textContent = state.toast.message;
        container.appendChild(div);
    }
}

function renderProcessing() {
    const container = document.getElementById("processing-container");
    if (!container) return;
    container.innerHTML = "";
    if (state.processing) {
        const overlay = document.createElement("div");
        overlay.className = "processing-overlay";
        const spinner = document.createElement("div");
        spinner.className = "spinner";
        overlay.appendChild(spinner);
        const p = document.createElement("p");
        p.textContent = "Processing…";
        overlay.appendChild(p);
        container.appendChild(overlay);
    }
}

function showToast(message, success) {
    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toast = { message, success };
    renderToast();
    state.toastTimer = setTimeout(() => {
        state.toast = null;
        renderToast();
    }, 3000);
}

// ============================================================================
// Event Handlers
// ============================================================================

function openMenu(e, keyId) {
    e.preventDefault();
    e.stopPropagation();

    // In profile editor, macro key has no context menu
    if (activeProfile() && keyId === MACRO_KEY) return;

    const x = Math.max(8, e.clientX);
    const y = Math.max(8, e.clientY);
    state.menu = { x, y, keyId };
    renderMenu();
}

function handleKeyClick(keyId, profileExists, e) {
    e.stopPropagation();
    if (activeProfile()) {
        // In editor — only toggle edit mode for user profiles
        if (keyId === MACRO_KEY && !isActivePreset()) {
            state.editMode = !state.editMode;
            if (!state.editMode) state.editingKey = null;
            fullRender();
            return;
        }
        // Locked key (B41 🔒) — ignore clicks in edit mode
        if (isLockKey(keyId, activeProfile().slotKey)) return;
        if (!state.editMode) return;
        state.editingKey = keyId;
        return;
    }

    // Profile selector — copy mode logic
    const cm = state.copyMode;
    if (keyId === MACRO_KEY) {
        // Toggle copy mode
        if (cm !== null) {
            state.copyMode = null;
        } else {
            state.copyMode = "select";
            state.menu = null;
            renderMenu();
        }
        renderKeyboard();
        return;
    }

    if (cm === "select") {
        // Selecting source
        if (profileExists) {
            state.copyMode = keyId;
        }
        renderKeyboard();
        return;
    } else if (typeof cm === "string") {
        // Source selected, selecting target
        if (keyId === cm) {
            state.copyMode = "select";
        } else if (slotIsCustom(keyId)) {
            // Paste
            const source = profileForKey(cm);
            if (source && state.userProfiles[keyId]) {
                state.userProfiles[keyId].bindings = JSON.parse(JSON.stringify(source.bindings));
                // Enforce hardware lock on the target profile
                    ensureLockBinding(state.userProfiles[keyId]);
                scheduleAutosave();
                showToast("Pasted bindings from " + cm + " onto " + keyId + ".", true);
            }
            state.copyMode = null;
        }
        renderKeyboard();
        return;
    }

    // Normal: open profile
    if (profileExists) {
        state.activeProfileKey = keyId;
        state.editMode = false;
        state.menu = null;
        fullRender();
    }
}

function setHoveredKey(keyId) {
    if (state.hoverTimerId !== null) {
        clearTimeout(state.hoverTimerId);
        state.hoverTimerId = null;
    }
    state.hoveredKey = keyId;
    // Only update the center panel, not the entire keyboard.
    // This preserves inline edit input focus when in edit mode.
    if (!state.editMode) {
        updateCenterPanel();
    }
}

function clearHoveredKey() {
    if (state.hoverTimerId !== null) {
        clearTimeout(state.hoverTimerId);
    }
    state.hoverTimerId = setTimeout(() => {
        state.hoveredKey = null;
        state.hoverTimerId = null;
        if (!state.editMode) {
            updateCenterPanel();
        }
    }, 500);
}

function submitAddProfile() {
    const modal = state.addModal;
    if (!modal || modal.slotKey === MACRO_KEY) return;
    const name = modal.name.trim();
    if (!name || name.length > MAX_PROFILE_NAME_LENGTH) return;
    let desc = modal.description.trim();
    if (!desc) desc = "Custom profile.";
    if (desc.length > MAX_DESCRIPTION_LENGTH) return;

    state.userProfiles[modal.slotKey] = createProfile(modal.slotKey, name, desc, modeForSlot(modal.slotKey));
    state.addModal = null;
    scheduleAutosave();
    fullRender();
}

function submitRename() {
    const modal = state.renameModal;
    if (!modal) return;
    const value = modal.value.trim();
    if (!value) return;
    const p = state.userProfiles[modal.slotKey];
    if (p) {
        if (modal.mode === "Name") {
            p.name = value;
        } else {
            p.description = value;
        }
    }
    state.renameModal = null;
    scheduleAutosave();
    fullRender();
}

function confirmAction(action) {
    if (action.type === "DeleteProfile") {
        delete state.userProfiles[action.slotKey];
        // Clean up pages for the deleted profile
        const oldPages = state.allPages[action.slotKey] || [];
        for (const page of oldPages) {
            for (const imgId of (page.imageIds || [])) {
                if (state.imageUrls[imgId]) {
                    URL.revokeObjectURL(state.imageUrls[imgId]);
                }
                delete state.imageUrls[imgId];
            }
        }
        delete state.allPages[action.slotKey];
        if (state.activeProfileKey === action.slotKey) {
            state.activeProfileKey = null;
            state.editMode = false;
            state.editingKey = null;
            state.menu = null;
        }
        scheduleAutosave();
    } else if (action.type === "ClearBindings") {
        if (state.userProfiles[action.slotKey]) {
            const slotKey = action.slotKey;
            state.userProfiles[slotKey].bindings = {};
            // Always preserve the hardware lock on clear
            ensureLockBinding(state.userProfiles[slotKey]);
        }
        scheduleAutosave();
    } else if (action.type === "ResetAll") {
        state.userProfiles = {};
        // Revoke all image URLs
        for (const url of Object.values(state.imageUrls)) {
            URL.revokeObjectURL(url);
        }
        state.imageUrls = {};
        state.allPages = {};
        state.activeProfileKey = null;
        state.editMode = false;
        state.editingKey = null;
        state.menu = null;
        state.showSettings = false;
        state.viewingPage = null;
        if (state.db) {
            clearProfiles(state.db).catch(console.warn);
            clearPages(state.db).catch(console.warn);
        }
    }
    state.confirmModal = null;
    fullRender();
}

// ── Image handling ──

function generateId() {
    try {
        return crypto.randomUUID();
    } catch (_) {
        // Fallback for environments where crypto.randomUUID() isn't available
        return "img_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    }
}

// ── Import / Export ──

async function handleExport() {
    const db = state.db;
    if (!db) return;
    state.processing = true;
    renderProcessing();
    try {
        await exportProfiles(db, state.userProfiles, state.allPages);
        state.showSettings = false;
        showToast("Profiles exported.", true);
    } catch (e) {
        showToast("Export failed: " + e.message, false);
    }
    state.processing = false;
    renderProcessing();
    renderModals();
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const db = state.db;
    if (!db) return;

    state.processing = true;
    renderProcessing();

    try {
        const buf = await file.arrayBuffer();
        const data = new Uint8Array(buf);
        const result = await importProfiles(db, data);
        const loaded = result.profiles;
        const importedPages = result.pages || {};

        // Revoke all existing image URLs
        for (const url of Object.values(state.imageUrls)) {
            URL.revokeObjectURL(url);
        }
        state.imageUrls = {};

        // Remove MACRO key from loaded profiles and enforce hardware lock
        delete loaded[MACRO_KEY];
        for (const p of Object.values(loaded)) {
            p.bindings[MACRO_KEY] = "";
            ensureLockBinding(p);
            // Strip legacy imageIds if any
            delete p.imageIds;
        }

        // Load pages
        state.allPages = importedPages;

        // Load fresh URLs for images referenced in pages
        const allSeen = new Set();
        for (const pageArr of Object.values(state.allPages)) {
            for (const page of pageArr) {
                for (const imgId of (page.imageIds || [])) {
                    allSeen.add(imgId);
                }
            }
        }
        for (const imgId of allSeen) {
            if (state.imageUrls[imgId]) continue;
            try {
                const blob = await getImage(db, imgId);
                if (blob) {
                    state.imageUrls[imgId] = URL.createObjectURL(blob);
                }
            } catch (err) {
                console.warn("Failed to load image", imgId, err);
            }
        }

        state.userProfiles = loaded;
        scheduleAutosave();
        showToast("Imported " + Object.keys(loaded).length + " profiles.", true);
        fullRender();
    } catch (err) {
        showToast("Import failed: " + err.message, false);
    }
    state.processing = false;
    renderProcessing();
    e.target.value = "";
}

async function handleImportBindings(e) {
    const file = e.target.files[0];
    if (!file) return;
    const ak = state.activeProfileKey;
    if (!ak) return;

    state.processing = true;
    renderProcessing();

    try {
        const buf = await file.arrayBuffer();
        const data = new Uint8Array(buf);
        const bindings = importBindings(data);
        let count = 0;
        if (state.userProfiles[ak]) {
            for (const [k, v] of Object.entries(bindings)) {
                if (v !== "") {
                    state.userProfiles[ak].bindings[k] = v;
                    count++;
                }
            }
            // Enforce hardware lock on the imported profile
            ensureLockBinding(state.userProfiles[ak]);
        }
        scheduleAutosave();
        showToast("Imported " + count + " bindings.", true);
        fullRender();
    } catch (err) {
        showToast("Import failed: " + err.message, false);
    }
    state.processing = false;
    renderProcessing();
    e.target.value = "";
}

function handleReset() {
    state.showSettings = false;
    state.confirmModal = {
        message: "Reset all user profiles? This will delete your profiles and images. Preset profiles will remain. This cannot be undone.",
        action: { type: "ResetAll" }
    };
    renderModals();
}

// ============================================================================
// Autosave
// ============================================================================

let autosaveTimer = null;

function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(doAutosave, 100);
}

async function doAutosave() {
    autosaveTimer = null;
    if (!state.db || !state.loaded) return;

    try {
        // Save pages
        await savePages(state.db, state.allPages);
        // Only save profiles if they differ from compile-time defaults
        if (!deepEqual(state.userProfiles, defaultsSnapshot)) {
            await saveProfiles(state.db, state.userProfiles);
        }
    } catch (e) {
        console.warn("Autosave failed:", e);
    }
}

// ============================================================================
// Full Re-render
// ============================================================================

function fullRender() {
    renderToolbar();
    renderKeyboard();
    renderCollage();
    renderMenu();
    renderModals();
    renderToast();
    renderProcessing();
}

// ============================================================================
// Initialization
// ============================================================================

async function init() {
    // Open IndexedDB
    const db = await openDB();
    state.db = db;

    // Load profiles
    const profiles = await loadProfiles(db);
    const defaults = loadDefaultProfiles();
    if (Object.keys(profiles).length === 0 || deepEqual(profiles, defaults)) {
        if (Object.keys(profiles).length > 0) {
            await clearProfiles(db);
        }
        state.userProfiles = defaults;
    } else {
        state.userProfiles = profiles;
    }

    // Load pages
    const pages = await loadPages(db);
    state.allPages = pages;

    // Load image URLs — gather all referenced image IDs from pages
    const allReferencedIds = new Set();
    for (const pageArr of Object.values(pages)) {
        for (const page of pageArr) {
            for (const imgId of (page.imageIds || [])) {
                allReferencedIds.add(imgId);
            }
        }
    }
    for (const imgId of allReferencedIds) {
        if (state.imageUrls[imgId]) continue;
        try {
            const blob = await getImage(db, imgId);
            if (blob) {
                state.imageUrls[imgId] = URL.createObjectURL(blob);
            }
        } catch (e) {
            console.warn("Failed to load image URL", imgId, e);
        }
    }

    state.loaded = true;

    // Bind global click-to-close-menu
    document.addEventListener("click", () => {
        if (state.menu) {
            state.menu = null;
            renderMenu();
        }
    });
    // Bind global right-click to close menu
    document.addEventListener("contextmenu", () => {
        if (state.menu) {
            state.menu = null;
            renderMenu();
        }
    });

    // Wire file inputs
    document.getElementById("import-zip-input").addEventListener("change", handleImport);
    document.getElementById("import-bindings-input").addEventListener("change", handleImportBindings);

    // Initial render
    fullRender();

    // Pre-save defaults if they don't match (will be caught by autosave)
    scheduleAutosave();
}

// ── Boot ──
document.addEventListener("DOMContentLoaded", init);
