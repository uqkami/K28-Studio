// ── IndexedDB Persistence Layer ──
// Single source of truth for all data access (individual mode only).

const DB_NAME = "k28";
const DB_VERSION = 3;
const PROFILE_STORE = "profiles";
const IMAGE_STORE = "images";
const IMAGE_REFS_STORE = "imageRefs";
const PAGE_STORE = "pages";

// ── Open / Initialize ──

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(PROFILE_STORE)) {
                    db.createObjectStore(PROFILE_STORE);
                }
                if (!db.objectStoreNames.contains(IMAGE_STORE)) {
                    db.createObjectStore(IMAGE_STORE);
                }
                if (!db.objectStoreNames.contains(IMAGE_REFS_STORE)) {
                    db.createObjectStore(IMAGE_REFS_STORE);
                }
                if (!db.objectStoreNames.contains(PAGE_STORE)) {
                    db.createObjectStore(PAGE_STORE);
                }
                // Migrate from v2 (imageRefs) → v3 (pages)
                const oldVersion = req.oldVersion;
                if (oldVersion < 3 && db.objectStoreNames.contains(IMAGE_REFS_STORE)) {
                    const tx = req.transaction;
                    const oldStore = tx.objectStore(IMAGE_REFS_STORE);
                    const pageStore = tx.objectStore(PAGE_STORE);
                    const reqGetAll = oldStore.getAll();
                    reqGetAll.onsuccess = () => {
                        const items = reqGetAll.result || [];
                        for (const item of items) {
                            const parsed = JSON.parse(item);
                            if (parsed.imageIds && parsed.imageIds.length > 0) {
                                // Create a single page with the legacy images
                                const page = {
                                    id: 'legacy',
                                    title: '',
                                    content: '',
                                    imageIds: parsed.imageIds
                                };
                                pageStore.put(JSON.stringify([page]), parsed.slotKey);
                            }
                        }
                    };
                }
            };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// ── Profiles ──

async function loadProfiles(db) {
    const tx = db.transaction(PROFILE_STORE, "readonly");
    const store = tx.objectStore(PROFILE_STORE);
    const promises = new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    const items = await promises;

    // Build profile map, also check localStorage for migration
    const profiles = {};

    if (!items || items.length === 0) {
        // Check localStorage for old data
        const old = localStorage.getItem("k28_profiles");
        if (old) {
            try {
                const parsed = JSON.parse(old);
                for (const key of Object.keys(parsed)) {
                    if (key !== MACRO_KEY) {
                        profiles[key] = parsed[key];
                    }
                }
                // Migrate to IndexedDB
                if (Object.keys(profiles).length > 0) {
                    await saveProfiles(db, profiles);
                }
                localStorage.removeItem("k28_profiles");
                return profiles;
            } catch (e) {
                console.warn("localStorage migration failed:", e);
            }
        }
        return profiles;
    }

    for (const item of items) {
        const p = JSON.parse(item);
        if (p.slotKey !== MACRO_KEY) {
            profiles[p.slotKey] = p;
        }
    }
    return profiles;
}

async function saveProfiles(db, profiles) {
    const tx = db.transaction(PROFILE_STORE, "readwrite");
    const store = tx.objectStore(PROFILE_STORE);
    for (const [key, profile] of Object.entries(profiles)) {
        const p = { ...profile };
        // Strip empty macro key bindings
        if (p.bindings[MACRO_KEY] === "") {
            delete p.bindings[MACRO_KEY];
        }
        store.put(JSON.stringify(p), key);
    }
    await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function clearProfiles(db) {
    const tx = db.transaction(PROFILE_STORE, "readwrite");
    const store = tx.objectStore(PROFILE_STORE);
    store.clear();
    await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ── Images ──

async function putImage(db, id, blob) {
    const tx = db.transaction(IMAGE_STORE, "readwrite");
    const store = tx.objectStore(IMAGE_STORE);
    store.put(blob, id);
    await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getImage(db, id) {
    const tx = db.transaction(IMAGE_STORE, "readonly");
    const store = tx.objectStore(IMAGE_STORE);
    return new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

async function deleteImage(db, id) {
    const tx = db.transaction(IMAGE_STORE, "readwrite");
    const store = tx.objectStore(IMAGE_STORE);
    store.delete(id);
    await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getAllImageKeys(db) {
    const tx = db.transaction(IMAGE_STORE, "readonly");
    const store = tx.objectStore(IMAGE_STORE);
    return new Promise((resolve, reject) => {
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// ── Image URL helpers ──

function imageUrlFromBlob(blob) {
    return URL.createObjectURL(blob);
}

function revokeImageUrl(url) {
    URL.revokeObjectURL(url);
}

async function resolveImageUrl(db, id) {
    const blob = await getImage(db, id);
    if (!blob) throw new Error("Image " + id + " not found");
    return URL.createObjectURL(blob);
}

// ── Image Refs (slotKey → imageIds[] for ALL profiles, including presets) ──

async function loadImageRefs(db) {
    const tx = db.transaction(IMAGE_REFS_STORE, "readonly");
    const store = tx.objectStore(IMAGE_REFS_STORE);
    return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
            const items = req.result || [];
            const refs = {};
            for (const item of items) {
                const parsed = JSON.parse(item);
                refs[parsed.slotKey] = parsed.imageIds || [];
            }
            resolve(refs);
        };
        req.onerror = () => reject(req.error);
    });
}

async function saveImageRefs(db, refs) {
    const tx = db.transaction(IMAGE_REFS_STORE, "readwrite");
    const store = tx.objectStore(IMAGE_REFS_STORE);
    store.clear();
    for (const [slotKey, imageIds] of Object.entries(refs)) {
        if (imageIds.length > 0) {
            store.put(JSON.stringify({ slotKey, imageIds }), slotKey);
        }
    }
    await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ── MIME / extension mapping ──

function mimeToExt(mime) {
    const map = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "image/svg+xml": ".svg",
        "image/bmp": ".bmp",
    };
    return map[mime] || ".bin";
}

function extToMime(ext) {
    const map = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "gif": "image/gif",
        "svg": "image/svg+xml",
        "bmp": "image/bmp",
    };
    return map[ext.toLowerCase()] || "application/octet-stream";
}

// ── Pages (replaces imageRefs) ──

async function loadPages(db) {
    const tx = db.transaction(PAGE_STORE, "readonly");
    const store = tx.objectStore(PAGE_STORE);
    return new Promise((resolve, reject) => {
        const req = store.openCursor();
        const pages = {};
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                try {
                    const parsed = JSON.parse(cursor.value);
                    if (Array.isArray(parsed)) {
                        pages[cursor.key] = parsed;
                    }
                } catch (e) {
                    console.warn("Failed to parse pages for", cursor.key, e);
                }
                cursor.continue();
            } else {
                resolve(pages);
            }
        };
        req.onerror = () => reject(req.error);
    });
}

async function savePages(db, pages) {
    const tx = db.transaction(PAGE_STORE, "readwrite");
    const store = tx.objectStore(PAGE_STORE);
    store.clear();
    for (const [slotKey, pageArr] of Object.entries(pages)) {
        if (pageArr.length > 0) {
            store.put(JSON.stringify(pageArr), slotKey);
        }
    }
    await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function clearPages(db) {
    const tx = db.transaction(PAGE_STORE, "readwrite");
    const store = tx.objectStore(PAGE_STORE);
    store.clear();
    await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
