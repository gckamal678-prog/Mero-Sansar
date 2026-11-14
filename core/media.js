"use strict";

/*
 * KSK — MEDIA STORAGE
 *
 * RESPONSIBILITY:
 * - Store images in IndexedDB.
 * - Retrieve images and Object URLs.
 * - Delete unused media safely.
 * - Clean up Post and Story media after deletion.
 * - Clean up old Profile Avatar and Cover media after updates.
 * - Prevent deletion when a media ID is still referenced.
 *
 * DEPENDENCIES:
 * - Browser IndexedDB
 * - KSKData
 */

(function (global) {
  "use strict";

  if (global.KSKMedia) {
    console.warn("KSKMedia is already initialized.");
    return;
  }

  /* =====================================================
     CONFIGURATION
  ===================================================== */

  const DB_NAME = "ksk_media_database";
  const DB_VERSION = 1;
  const STORE_NAME = "images";

  const MAX_FILE_SIZE = 12 * 1024 * 1024;
  const MAX_WIDTH = 1600;
  const MAX_HEIGHT = 1600;
  const IMAGE_QUALITY = 0.84;

  let databasePromise = null;
  let dataChangeListenerBound = false;

  const urlCache = new Map();
  const urlPending = new Map();
  const urlGeneration = new Map();

  /* =====================================================
     HELPERS
  ===================================================== */

  function createId() {
    const id = global.crypto?.randomUUID
      ? global.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return `ksk_media_${id}`;
  }

  function isValidMediaId(value) {
    return /^(?:ksk_media_|media_)[A-Za-z0-9_-]+$/.test(
      String(value || "").trim()
    );
  }

  function normalizeMediaId(value) {
    const id = String(value || "").trim();

    return isValidMediaId(id) ? id : "";
  }

  function logError(message, error) {
    console.error(`[KSKMedia] ${message}`, error || "");
  }

  /* =====================================================
     INDEXEDDB
  ===================================================== */

  function openDatabase() {
    if (databasePromise) {
      return databasePromise;
    }

    databasePromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        databasePromise = null;

        reject(
          new Error("यो ब्राउजरमा फोटो भण्डारण उपलब्ध छैन।")
        );

        return;
      }

      let request;

      try {
        request = global.indexedDB.open(
          DB_NAME,
          DB_VERSION
        );
      } catch (error) {
        databasePromise = null;
        reject(error);
        return;
      }

      request.onupgradeneeded = event => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: "id"
          });
        }
      };

      request.onsuccess = () => {
        const db = request.result;

        db.onversionchange = () => {
          db.close();
          databasePromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        databasePromise = null;

        reject(
          request.error ||
          new Error("फोटो भण्डारण खोल्न सकिएन।")
        );
      };

      request.onblocked = () => {
        databasePromise = null;

        reject(
          new Error(
            "फोटो भण्डारण अर्को ट्याबमा व्यस्त छ।"
          )
        );
      };
    });

    return databasePromise;
  }

  /* =====================================================
     FILE VALIDATION
  ===================================================== */

  function validateFile(file) {
    if (!(file instanceof Blob)) {
      throw new Error(
        "कृपया फोटो फाइल छान्नुहोस्।"
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];

    const fileType = String(
      file.type || ""
    ).toLowerCase();

    if (!allowedTypes.includes(fileType)) {
      throw new Error(
        "कृपया JPG, PNG, WebP वा GIF फोटो छान्नुहोस्।"
      );
    }

    if (file.size <= 0) {
      throw new Error(
        "छानिएको फोटो खाली छ।"
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        "फोटोको आकार १२ MB भन्दा कम हुनुपर्छ।"
      );
    }
  }

  /* =====================================================
     IMAGE OPTIMIZATION
  ===================================================== */

  async function createOptimizedBlob(file) {
    let bitmap = null;
    let temporaryURL = "";

    try {
      // GIF animation सुरक्षित राख्ने।
      if (
        String(file.type || "").toLowerCase() ===
        "image/gif"
      ) {
        return file;
      }

      let width;
      let height;
      let source;

      if (global.createImageBitmap) {
        try {
          bitmap = await global.createImageBitmap(file);
        } catch (error) {
          logError(
            "ImageBitmap decode failed; using Image fallback.",
            error
          );
        }
      }

      if (bitmap) {
        width = bitmap.width;
        height = bitmap.height;
        source = bitmap;
      } else {
        temporaryURL = global.URL.createObjectURL(file);

        const image = new global.Image();

        await new Promise((resolve, reject) => {
          image.onload = resolve;

          image.onerror = () => {
            reject(
              new Error("फोटो खोल्न सकिएन।")
            );
          };

          image.src = temporaryURL;
        });

        width = image.naturalWidth;
        height = image.naturalHeight;
        source = image;
      }

      if (!width || !height) {
        throw new Error(
          "फोटोको आकार पहिचान गर्न सकिएन।"
        );
      }

      const scale = Math.min(
        1,
        MAX_WIDTH / width,
        MAX_HEIGHT / height
      );

      const outputWidth = Math.max(
        1,
        Math.round(width * scale)
      );

      const outputHeight = Math.max(
        1,
        Math.round(height * scale)
      );

      const canvas = global.document.createElement("canvas");

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const context = canvas.getContext("2d", {
        alpha: false
      });

      if (!context) {
        throw new Error(
          "फोटो तयार गर्न सकिएन।"
        );
      }

      context.fillStyle = "#ffffff";

      context.fillRect(
        0,
        0,
        outputWidth,
        outputHeight
      );

      context.drawImage(
        source,
        0,
        0,
        outputWidth,
        outputHeight
      );

      return await new Promise((resolve, reject) => {
        canvas.toBlob(
          blob => {
            if (blob && blob.size > 0) {
              resolve(blob);
            } else {
              reject(
                new Error("फोटो कम्प्रेस गर्न सकिएन।")
              );
            }
          },
          "image/jpeg",
          IMAGE_QUALITY
        );
      });

    } finally {
      if (bitmap) {
        bitmap.close?.();
      }

      if (temporaryURL) {
        global.URL.revokeObjectURL(temporaryURL);
      }
    }
  }

  /* =====================================================
     STORAGE CAPACITY CHECK
  ===================================================== */

  async function ensureStorageCapacity(requiredBytes) {
    const storage = global.navigator?.storage;

    // Storage estimate API उपलब्ध नभए सामान्य प्रक्रिया जारी राख्ने।
    if (typeof storage?.estimate !== "function") {
      return true;
    }

    let estimate;

    try {
      estimate = await storage.estimate();
    } catch (error) {
      // Estimate असफल भए पनि IndexedDB save प्रयास गर्न दिने।
      logError(
        "Storage capacity estimate unavailable.",
        error
      );

      return true;
    }

    const usage = Number(estimate?.usage);
    const quota = Number(estimate?.quota);

    // भरपर्दो estimate नआएमा upload रोक्ने छैन।
    if (
      !Number.isFinite(usage) ||
      !Number.isFinite(quota) ||
      quota <= 0
    ) {
      return true;
    }

    const available = Math.max(
      0,
      quota - usage
    );

    // अन्य application data का लागि केही ठाउँ सुरक्षित राख्ने।
    const reserve = Math.min(
      512 * 1024,
      Math.max(64 * 1024, quota * 0.005)
    );

    if (
      available <
      requiredBytes + reserve
    ) {
      throw new Error(
        "भण्डारण ठाउँ पर्याप्त छैन। पुराना अनावश्यक फोटो वा पोस्ट हटाएर फेरि प्रयास गर्नुहोस्।"
      );
    }

    return true;
  }

  /* =====================================================
     STORAGE ERROR HANDLER
  ===================================================== */

  function normalizeStorageError(error) {
    if (
      error?.name === "QuotaExceededError"
    ) {
      return new Error(
        "भण्डारण क्षमता पूरा भयो। केही पुराना फोटो वा पोस्ट हटाएर फेरि प्रयास गर्नुहोस्।"
      );
    }

    return error || new Error(
      "फोटो सुरक्षित गर्न सकिएन।"
    );
  }

  /* =====================================================
     SAVE IMAGE
  ===================================================== */

  async function saveImage(file, options = {}) {
    validateFile(file);

    // GIF animation सुरक्षित राख्ने र अन्य फोटो optimize गर्ने।
    const blob = await createOptimizedBlob(file);

    // IndexedDB मा save गर्नुअघि उपलब्ध ठाउँ जाँच गर्ने।
    await ensureStorageCapacity(blob.size);

    const db = await openDatabase();

    const id = createId();

    const record = {
      id,
      blob,
      type: blob.type || "image/jpeg",
      name: String(
        options.name || file.name || "photo"
      ).slice(0, 150),
      size: blob.size,
      createdAt: new Date().toISOString()
    };

    await new Promise((resolve, reject) => {
      let transaction;

      try {
        transaction = db.transaction(
          STORE_NAME,
          "readwrite"
        );

        transaction.objectStore(STORE_NAME).put(record);

      } catch (error) {
        reject(
          normalizeStorageError(error)
        );

        return;
      }

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          normalizeStorageError(
            transaction.error
          )
        );
      };

      transaction.onabort = () => {
        reject(
          normalizeStorageError(
            transaction.error
          )
        );
      };
    });

    return {
      id,
      type: record.type,
      size: record.size,
      name: record.name,
      createdAt: record.createdAt
    };
  }

  /* =====================================================
     GET IMAGE
  ===================================================== */

  async function getImage(id) {
    const key = normalizeMediaId(id);

    if (!key) {
      return null;
    }

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readonly"
      );

      const request = transaction
        .objectStore(STORE_NAME)
        .get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(
          request.error ||
          new Error("फोटो प्राप्त गर्न सकिएन।")
        );
      };
    });
  }

  /* =====================================================
     GET OBJECT URL
  ===================================================== */

  async function getImageURL(id) {
    const key = normalizeMediaId(id);

    if (!key) {
      return "";
    }

    if (urlCache.has(key)) {
      return urlCache.get(key);
    }

    if (urlPending.has(key)) {
      return urlPending.get(key);
    }

    const generation = urlGeneration.get(key) || 0;

    const request = (async () => {
      try {
        const record = await getImage(key);

        if (!record?.blob) {
          return "";
        }

        if (
          (urlGeneration.get(key) || 0) !== generation
        ) {
          return "";
        }

        const url = global.URL.createObjectURL(
          record.blob
        );

        urlCache.set(key, url);

        return url;

      } catch (error) {
        logError("Image URL loading failed.", error);
        return "";

      } finally {
        urlPending.delete(key);
      }
    })();

    urlPending.set(key, request);

    return request;
  }

  /* =====================================================
     REVOKE OBJECT URL
  ===================================================== */

  function revokeImageURL(id) {
    const key = String(id || "");

    if (!key) {
      return false;
    }

    urlGeneration.set(
      key,
      (urlGeneration.get(key) || 0) + 1
    );

    const url = urlCache.get(key);

    if (!url) {
      return false;
    }

    global.URL.revokeObjectURL(url);

    urlCache.delete(key);

    return true;
  }

  function revokeAllImageURLs() {
    const keys = new Set([
      ...urlCache.keys(),
      ...urlPending.keys()
    ]);

    keys.forEach(key => {
      urlGeneration.set(
        key,
        (urlGeneration.get(key) || 0) + 1
      );
    });

    urlCache.forEach(url => {
      global.URL.revokeObjectURL(url);
    });

    urlCache.clear();

    return true;
  }

  /* =====================================================
     DELETE IMAGE
  ===================================================== */

  async function deleteImage(id) {
    const key = normalizeMediaId(id);

    if (!key) {
      return false;
    }

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      let transaction;

      try {
        transaction = db.transaction(
          STORE_NAME,
          "readwrite"
        );

        transaction.objectStore(STORE_NAME).delete(key);

      } catch (error) {
        reject(error);
        return;
      }

      transaction.oncomplete = () => {
        revokeImageURL(key);
        resolve(true);
      };

      transaction.onerror = () => {
        reject(
          transaction.error ||
          new Error("फोटो हटाउन सकिएन।")
        );
      };

      transaction.onabort = () => {
        resolve(false);
      };
    });
  }

  /* =====================================================
     MEDIA REFERENCE CHECK
  ===================================================== */

  function hasMediaReference(mediaId) {
    const key = normalizeMediaId(mediaId);

    if (!key) {
      return true;
    }

    const data = global.KSKData;

    if (!data) {
      return true;
    }

    const getters = [
      "getPosts",
      "getStories",
      "getProfile",
      "getFriends",
      "getMessages",
      "getChats",
      "getNotifications",
      "getSavedPosts"
    ];

    const collections = [];

    for (const name of getters) {
      if (typeof data[name] !== "function") {
        logError(
          `Reference check skipped: ${name}() is unavailable.`
        );

        return true;
      }

      try {
        const value = name === "getStories"
          ? data[name](true)
          : data[name]();

        if (value === undefined || value === null) {
          return true;
        }

        collections.push(value);

      } catch (error) {
        logError(
          `Reference check failed: ${name}()`,
          error
        );

        return true;
      }
    }

    const seen = new WeakSet();

    function contains(value) {
      if (value === key) {
        return true;
      }

      if (
        value === null ||
        typeof value !== "object"
      ) {
        return false;
      }

      if (seen.has(value)) {
        return false;
      }

      seen.add(value);

      if (Array.isArray(value)) {
        return value.some(contains);
      }

      return Object.keys(value).some(property => {
        return contains(value[property]);
      });
    }

    return collections.some(contains);
  }

  /* =====================================================
     CLEANUP ORPHANED IMAGE
  ===================================================== */

  async function cleanupOrphanedImage(mediaId) {
    const key = normalizeMediaId(mediaId);

    if (!key) {
      return false;
    }

    if (hasMediaReference(key)) {
      return false;
    }

    try {
      return await deleteImage(key);

    } catch (error) {
      logError(
        `Orphan cleanup failed for ${key}`,
        error
      );

      return false;
    }
  }

  /* =====================================================
     QUEUED CLEANUP
  ===================================================== */

  function queueOrphanCleanup(mediaIds) {
    const ids = [
      ...new Set(
        (Array.isArray(mediaIds) ? mediaIds : [])
          .map(normalizeMediaId)
          .filter(Boolean)
      )
    ];

    if (!ids.length) {
      return;
    }

    Promise.resolve().then(async () => {
      for (const id of ids) {
        try {
          await cleanupOrphanedImage(id);

        } catch (error) {
          logError(
            `Queued cleanup failed for ${id}`,
            error
          );
        }
      }
    });
  }

  /* =====================================================
     PROFILE MEDIA CHANGE
  ===================================================== */

  function getPreviousProfileMedia(detail) {
    const previous = detail?.item?.previousMedia || {};

    return [
      previous.avatarMediaId,
      previous.coverMediaId
    ]
      .map(normalizeMediaId)
      .filter(Boolean);
  }

  function getChangedProfileMedia(detail) {
    const item = detail?.item || {};

    const previous = item.previousMedia || {};
    const next = item.nextMedia || {};
    const changed = item.changedMedia || {};

    const candidates = [];

    const avatarChanged =
      changed.avatar === true ||
      (
        previous.avatarMediaId &&
        previous.avatarMediaId !== next.avatarMediaId
      );

    const coverChanged =
      changed.cover === true ||
      (
        previous.coverMediaId &&
        previous.coverMediaId !== next.coverMediaId
      );

    if (avatarChanged) {
      candidates.push(previous.avatarMediaId);
    }

    if (coverChanged) {
      candidates.push(previous.coverMediaId);
    }

    return candidates
      .map(normalizeMediaId)
      .filter(Boolean);
  }

  /* =====================================================
     DATA CHANGE HANDLER
  ===================================================== */

  function handleDataChange(event) {
    const detail = event?.detail || {};

    const collection = String(
      detail.collection || ""
    ).toLowerCase();

    const action = String(
      detail.action || ""
    ).toLowerCase();

    const item = detail.item || {};

    /*
     * CASE 1:
     * Post or Story deletion.
     */

    if (
      action === "delete" &&
      (
        collection.includes("posts") ||
        collection.includes("stories")
      )
    ) {
      const mediaId = normalizeMediaId(item.mediaId);

      if (mediaId) {
        queueOrphanCleanup([mediaId]);
      }

      return;
    }

    /*
     * CASE 2:
     * Profile Avatar or Cover update.
     */

    if (
      collection === "profile" &&
      action === "update"
    ) {
      const oldMediaIds = getChangedProfileMedia(detail);

      if (oldMediaIds.length) {
        queueOrphanCleanup(oldMediaIds);
      }
    }
  }

  /* =====================================================
     DATA CHANGE LISTENER
  ===================================================== */

  function bindDataChangeListener() {
    if (
      dataChangeListenerBound ||
      typeof global.addEventListener !== "function"
    ) {
      return false;
    }

    global.addEventListener(
      "ksk:data-change",
      handleDataChange
    );

    dataChangeListenerBound = true;

    return true;
  }

  /* =====================================================
     INITIALIZATION
  ===================================================== */

  async function initialize() {
    bindDataChangeListener();

    try {
      await openDatabase();
      return true;

    } catch (error) {
      logError(
        "Media initialization failed.",
        error
      );

      return false;
    }
  }

  /* =====================================================
     PUBLIC API
  ===================================================== */

  const api = Object.freeze({
    initialize,

    saveImage,
    getImage,
    getImageURL,
    deleteImage,

    cleanupOrphanedImage,
    hasMediaReference,

    revokeImageURL,
    revokeAllImageURLs
  });

  global.KSKMedia = api;

  /*
   * Bind immediately.
   * The application does not need to call initialize()
   * for data-change cleanup events to be received.
   */

  bindDataChangeListener();

})(window);

/* =====================================================
   PROFILE EDITOR FUNCTION (`openEditor`)
===================================================== */

async function openEditor() {

  if (busy) return;

  busy = true;

  let user;

  try {
    const api = global.KSKSupabaseProfile;

    if (!api) {
      throw new Error("Supabase Profile सेवा उपलब्ध छैन।");
    }

    user = await api.getMyProfile();

    if (!user) {
      throw new Error("प्रोफाइल विवरण भेटिएन।");
    }

  } catch (error) {

    console.error("KSK Profile Load Failed:", error);

    toast(
      error.message || t(
        "प्रोफाइल विवरण लोड भएन।",
        "Could not load profile."
      ),
      "error"
    );

    return;

  } finally {
    busy = false;
  }

  const modal = openModal({

    title: t("प्रोफाइल सम्पादन", "Edit Profile"),

    content: `

      <form id="kskProfileMediaForm" class="ksk-profile-editor">

        <div class="form-group">
          <label class="form-label" for="kskPMName">
            ${t("नाम", "Name")}
          </label>

          <input
            id="kskPMName"
            class="form-input"
            maxlength="60"
            value="${escapeHTML(user.name || "")}">
        </div>

        <div class="form-group">
          <label class="form-label" for="kskPMBio">
            ${t("मेरो परिचय", "About me")}
          </label>

          <textarea
            id="kskPMBio"
            class="form-textarea"
            maxlength="240"
            rows="3">${escapeHTML(user.bio || "")}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="kskPMLocation">
            ${t("ठेगाना", "Location")}
          </label>

          <input
            id="kskPMLocation"
            class="form-input"
            maxlength="100"
            value="${escapeHTML(user.location || "")}">
        </div>

        <p class="ksk-crop-note">
          ${t(
            "Avatar वा Cover परिवर्तन गर्न प्रोफाइल पेजमा फोटोमा सिधै ट्याप गर्नुहोस्।",
            "Tap your Avatar or Cover Photo directly on your profile page to change it."
          )}
        </p>

      </form>

    `,

    footer: `

      <button
        class="btn btn-secondary"
        type="button"
        data-modal-close>
        ${t("रद्द", "Cancel")}
      </button>

      <button
        class="btn btn-primary"
        type="submit"
        form="kskProfileMediaForm"
        id="kskPMSave">
        ${t("सुरक्षित गर्नुहोस्", "Save Profile")}
      </button>

    `
  });

  if (!modal) return;

  const form = $("#kskProfileMediaForm", modal.element);

  form?.addEventListener("submit", async event => {

    event.preventDefault();

    if (busy) return;

    busy = true;

    const saveButton = $("#kskPMSave", modal.element);

    if (saveButton) saveButton.disabled = true;

    try {

      const payload = {
        name: $("#kskPMName", modal.element)?.value.trim() || "",
        bio: $("#kskPMBio", modal.element)?.value.trim() || "",
        location: $("#kskPMLocation", modal.element)?.value.trim() || ""
      };

      const updated = await global.KSKSupabaseProfile.updateMyProfile(
        payload
      );

      if (!updated) {
        throw new Error("Profile save failed.");
      }

      // Keep the existing UI cache synchronized.
      global.KSKData?.saveProfile?.({
        name: updated.name,
        bio: updated.bio,
        location: updated.location
      });

      closeModal();

      toast(
        t(
          "प्रोफाइल सफलतापूर्वक अपडेट भयो।",
          "Profile updated successfully."
        ),
        "success"
      );

    } catch (error) {

      console.error("KSK Profile Save Failed:", error);

      toast(
        error.message || t(
          "प्रोफाइल सुरक्षित भएन। फेरि प्रयास गर्नुहोस्।",
          "Profile could not be saved. Please try again."
        ),
        "error"
      );

      if (saveButton) saveButton.disabled = false;

    } finally {
      busy = false;
    }
  });
}
