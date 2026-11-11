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

    if (!String(file.type || "").startsWith("image/")) {
      throw new Error(
        "कृपया JPG, PNG वा WebP फोटो छान्नुहोस्।"
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
     SAVE IMAGE
  ===================================================== */

  async function saveImage(file, options = {}) {
    validateFile(file);

    const blob = await createOptimizedBlob(file);
    const db = await openDatabase();

    const id = createId();

    const record = {
      id,
      blob,
      type: "image/jpeg",
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
        reject(error);
        return;
      }

      transaction.oncomplete = resolve;

      transaction.onerror = () => {
        reject(
          transaction.error ||
          new Error("फोटो सुरक्षित गर्न सकिएन।")
        );
      };

      transaction.onabort = () => {
        reject(
          transaction.error ||
          new Error(
            "फोटो सुरक्षित गर्ने प्रक्रिया रद्द भयो।"
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

    // Return an existing Object URL.
    if (urlCache.has(key)) {
      return urlCache.get(key);
    }

    // Reuse an ongoing IndexedDB request.
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

        // Do not create a URL for deleted or invalidated media.
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

    // Invalidate any pending URL request.
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
    // Invalidate both cached and pending requests.
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
        // Revoke only after IndexedDB confirms deletion.
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

  /*
   * Check all known data collections before deleting media.
   *
   * If KSKData or any required getter is missing, or a getter
   * throws, fail safely and keep the image.
   *
   * This prevents accidental deletion of media still in use.
   */

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

    // Never delete media that is still referenced.
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

  /*
   * Wait until synchronous data-change listeners finish.
   * Then inspect the latest stored data before deleting.
   */

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
     *
     * core/data.js emits:
     * previousMedia
     * nextMedia
     * changedMedia
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
