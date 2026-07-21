// ── ZIP Import / Export ──

const MAX_IMPORT_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// ── Export ──

async function exportProfiles(db, profiles, pages) {
    // Strip empty MACRO_KEY bindings
    const cleaned = {};
    for (const [key, profile] of Object.entries(profiles)) {
        const p = JSON.parse(JSON.stringify(profile));
        if (p.bindings[MACRO_KEY] === "") {
            delete p.bindings[MACRO_KEY];
        }
        cleaned[key] = p;
    }

    // Strip profiles identical to compile-time defaults
    const defaults = loadDefaultProfiles();
    for (const key of Object.keys(cleaned)) {
        if (defaults[key] && deepEqual(cleaned[key], defaults[key])) {
            delete cleaned[key];
        }
    }

    const zip = new JSZip();

    // Write manifest.json (sorted by key)
    zip.file("manifest.json", JSON.stringify(sortKeys(cleaned, true), null, 2));

    // Write pages.json
    if (pages && Object.keys(pages).length > 0) {
        zip.file("pages.json", JSON.stringify(pages, null, 2));
    }

    // Write images — collect unique IDs across all pages AND legacy profile.imageIds
    const processedIds = new Set();
    for (const pageArr of Object.values(pages || {})) {
        for (const page of pageArr) {
            for (const imgId of (page.imageIds || [])) {
                if (processedIds.has(imgId)) continue;
                processedIds.add(imgId);
                try {
                    const blob = await getImage(db, imgId);
                    if (blob) {
                        const ext = mimeToExt(blob.type);
                        const bytes = await blobToArrayBuffer(blob);
                        zip.file("images/" + imgId + ext, bytes);
                    }
                } catch (e) {
                    console.warn("Failed to read image", imgId, e);
                }
            }
        }
    }

    // Generate ZIP
    const content = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

    // Trigger download
    const filename = dateString() + ".k28profiles";
    downloadBlob(new Blob([content], { type: "application/zip" }), filename);
}

// ── Export single bindings ──

function exportBindings(profile) {
    const sorted = sortKeys(profile.bindings);
    const json = JSON.stringify(sorted, null, 2);
    const filename = profile.slotKey + "_" + profile.name.replace(/[^a-zA-Z0-9_-]/g, "_") + ".k28binding";
    downloadBlob(new Blob([json], { type: "application/json" }), filename);
}

function importBindings(data) {
    const text = new TextDecoder().decode(data);
    const bindings = JSON.parse(text);
    if (typeof bindings !== "object" || Array.isArray(bindings) || bindings === null) {
        throw new Error("Invalid bindings file: expected an object");
    }
    // Validate keys are strings
    for (const key of Object.keys(bindings)) {
        if (typeof bindings[key] !== "string") {
            throw new Error("Invalid bindings file: binding values must be strings");
        }
    }
    return bindings;
}

// ── Import ──

async function importProfiles(db, data) {
    if (data.byteLength > MAX_IMPORT_SIZE) {
        throw new Error("Import file too large (" + data.byteLength + " bytes, max " + MAX_IMPORT_SIZE + " bytes)");
    }

    const zip = await JSZip.loadAsync(data);
    let profiles = null;
    let importedPages = null;
    const images = [];

    for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;

        const content = await entry.async("uint8array");

        if (name === "manifest.json") {
            const text = new TextDecoder().decode(content);
            const parsed = JSON.parse(text);

            // Validate
            for (const [key, profile] of Object.entries(parsed)) {
                if (typeof key !== "string" || key.trim() === "") {
                    throw new Error("manifest.json contains a profile with an empty slot key");
                }
                if (typeof profile.name !== "string" || profile.name.trim() === "") {
                    throw new Error("Profile '" + key + "' has an empty name");
                }
                if (typeof profile.slotKey !== "string" || profile.slotKey.trim() === "") {
                    throw new Error("Profile '" + key + "' has an empty slot_key field");
                }
                // Strip legacy imageIds from profile
                delete profile.imageIds;
            }
            profiles = parsed;
        } else if (name === "pages.json") {
            const text = new TextDecoder().decode(content);
            importedPages = JSON.parse(text);
        } else if (name.startsWith("images/")) {
            if (content.byteLength > MAX_IMAGE_SIZE) {
                throw new Error("Image entry '" + name + "' is too large (" + content.byteLength + " bytes, max " + MAX_IMAGE_SIZE + " bytes)");
            }
            const rest = name.slice("images/".length);
            const dotIdx = rest.lastIndexOf(".");
            const uuidStr = dotIdx >= 0 ? rest.slice(0, dotIdx) : rest;
            const ext = dotIdx >= 0 ? rest.slice(dotIdx + 1) : "";
            const mime = extToMime(ext);
            images.push({ id: uuidStr, bytes: content, mime: mime });
        }
    }

    if (!profiles) {
        throw new Error("manifest.json not found in archive");
    }

    for (const img of images) {
        const blob = new Blob([img.bytes], { type: img.mime });
        await putImage(db, img.id, blob);
    }

    return { profiles, pages: importedPages || {} };
}

// ── Helpers ──

function sortKeys(obj, deep) {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(v => deep ? sortKeys(v, true) : v);
    const sorted = {};
    for (const key of Object.keys(obj).sort()) {
        const val = obj[key];
        sorted[key] = deep && typeof val === "object" && val !== null && !Array.isArray(val)
            ? sortKeys(val, true)
            : val;
    }
    return sorted;
}

function blobToArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
    });
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function dateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
