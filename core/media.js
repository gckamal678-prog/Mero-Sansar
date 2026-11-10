"use strict";

/*
 * KSK — MEDIA STORAGE
 * Images are stored in IndexedDB, not localStorage.
 * Designed for Stories, Posts, Profile Avatar and Cover.
 */

(function (global) {
  const DB_NAME = "ksk_media_database";
  const DB_VERSION = 1;
  const STORE_NAME = "images";

  const MAX_FILE_SIZE = 12 * 1024 * 1024;
  const MAX_WIDTH = 1600;
  const MAX_HEIGHT = 1600;
  const IMAGE_QUALITY = 0.84;

  let databasePromise = null;

  const urlCache = new Map();

  function createId() {
    const id = global.crypto?.randomUUID
      ? global.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return `ksk_media_${id}`;
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        reject(new Error("यो ब्राउजरमा फोटो भण्डारण उपलब्ध छैन।"));
        return;
      }

      const request = global.indexedDB.open(
        DB_NAME,
        DB_VERSION
      );

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
          new Error("फोटो भण्डारण अर्को ट्याबमा व्यस्त छ।")
        );
      };
    });

    return databasePromise;
  }

  function validateFile(file) {
    if (!(file instanceof Blob)) {
      throw new Error("कृपया फोटो फाइल छान्नुहोस्।");
    }

    if (!String(file.type || "").startsWith("image/")) {
      throw new Error("कृपया JPG, PNG वा WebP फोटो छान्नुहोस्।");
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("फोटोको आकार १२ MB भन्दा कम हुनुपर्छ।");
    }
  }

  async function createOptimizedBlob(file) {
    let bitmap = null;

    try {
      if (global.createImageBitmap) {
        bitmap = await global.createImageBitmap(file);
      }

      let width;
      let height;
      let source;

      if (bitmap) {
        width = bitmap.width;
        height = bitmap.height;
        source = bitmap;
      } else {
        const imageURL = URL.createObjectURL(file);

        try {
          const image = new Image();

          await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(
              new Error("फोटो खोल्न सकिएन।")
            );
            image.src = imageURL;
          });

          width = image.naturalWidth;
          height = image.naturalHeight;
          source = image;
        } finally {
          URL.revokeObjectURL(imageURL);
        }
      }

      if (!width || !height) {
        throw new Error("फोटोको आकार पहिचान गर्न सकिएन।");
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

      const canvas = document.createElement("canvas");

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const context = canvas.getContext("2d", {
        alpha: false
      });

      if (!context) {
        throw new Error("फोटो तयार गर्न सकिएन।");
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

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          result => {
            if (result) {
              resolve(result);
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

      return blob;
    } finally {
      if (bitmap) {
        bitmap.close?.();
      }
    }
  }

  async function saveImage(file, options = {}) {
    validateFile(file);

    const blob = await createOptimizedBlob(file);
    const db = await openDatabase();

    const id = createId();

    const record = {
      id,
      blob,
      type: "image/jpeg",
      name: String(options.name || file.name || "photo")
        .slice(0, 150),
      size: blob.size,
      createdAt: new Date().toISOString()
    };

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readwrite"
      );

      transaction.objectStore(STORE_NAME).put(record);

      transaction.oncomplete = resolve;

      transaction.onerror = () => reject(
        transaction.error ||
        new Error("फोटो सुरक्षित गर्न सकिएन।")
      );

      transaction.onabort = () => reject(
        transaction.error ||
        new Error("फोटो सुरक्षित गर्ने प्रक्रिया रद्द भयो।")
      );
    });

    return {
      id,
      type: record.type,
      size: record.size,
      name: record.name,
      createdAt: record.createdAt
    };
  }

  async function getImage(id) {
    if (!id) return null;

    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readonly"
      );

      const request = transaction
        .objectStore(STORE_NAME)
        .get(String(id));

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => reject(
        request.error ||
        new Error("फोटो प्राप्त गर्न सकिएन।")
      );
    });
  }

  async function getImageURL(id) {
    if (!id) return "";

    const key = String(id);

    if (urlCache.has(key)) {
      return urlCache.get(key);
    }

    const record = await getImage(key);

    if (!record?.blob) return "";

    const url = URL.createObjectURL(record.blob);

    urlCache.set(key, url);

    return url;
  }

  async function deleteImage(id) {
    if (!id) return false;

    const key = String(id);
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readwrite"
      );

      transaction.objectStore(STORE_NAME).delete(key);

      transaction.oncomplete = () => {
        const oldURL = urlCache.get(key);

        if (oldURL) {
          URL.revokeObjectURL(oldURL);
          urlCache.delete(key);
        }

        resolve(true);
      };

      transaction.onerror = () => reject(
        transaction.error ||
        new Error("फोटो हटाउन सकिएन।")
      );

      transaction.onabort = () => resolve(false);
    });
  }

  function revokeImageURL(id) {
    const key = String(id || "");
    const url = urlCache.get(key);

    if (!url) return false;

    URL.revokeObjectURL(url);
    urlCache.delete(key);

    return true;
  }

  function revokeAllImageURLs() {
    urlCache.forEach(url => {
      URL.revokeObjectURL(url);
    });

    urlCache.clear();
  }

  /*
   * Check whether an image is still referenced anywhere.
   * If data APIs are missing or fail, keep the image.
   */

  function hasMediaReference(mediaId) {
    const data = global.KSKData;

    if (!data) return true;

    const getters = [
      "getPosts",
      "getStories",
      "getProfile",
      "getFriends",
      "getMessages",
      "getChats",
      "getNotifications"
    ];

    const collections = [];

    for (const name of getters) {
      if (typeof data[name] !== "function") {
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
        console.warn(
          "KSK media reference check failed:",
          name,
          error
        );

        return true;
      }
    }

    const seen = new Set();

    function contains(value) {
      if (value === mediaId) return true;

      if (!value || typeof value !== "object") {
        return false;
      }

      if (seen.has(value)) return false;

      seen.add(value);

      if (Array.isArray(value)) {
        return value.some(contains);
      }

      return Object.keys(value).some(
        key => contains(value[key])
      );
    }

    return collections.some(contains);
  }

  /*
   * Delete only orphaned KSK media.
   */

  async function cleanupOrphanedImage(mediaId) {
    const key = String(mediaId || "").trim();

    if (
      !/^(?:ksk_media_|media_)[A-Za-z0-9_-]+$/.test(key)
    ) {
      return false;
    }

    if (hasMediaReference(key)) {
      return false;
    }

    try {
      return await deleteImage(key);

    } catch (error) {
      console.warn(
        "KSK orphan media cleanup failed:",
        error
      );

      return false;
    }
  }

  /*
   * Listen for Post, Story and Profile changes.
   */

  function handleDataChange(event) {
    const detail = event?.detail || {};

    const collection = String(
      detail.collection || ""
    ).toLowerCase();

    const action = String(
      detail.action || ""
    ).toLowerCase();

    const item = detail.item || {};

    const mediaIds = [];

    // Deleted Post or Story
    if (
      action === "delete" &&
      (
        collection.includes("posts") ||
        collection.includes("stories")
      )
    ) {
      mediaIds.push(item.mediaId);
    }

    // Replaced Profile Avatar or Cover
    if (
      collection === "profile" &&
      action === "update"
    ) {
      mediaIds.push(
        item.previousMedia?.avatarMediaId,
        item.previousMedia?.coverMediaId
      );
    }

    const uniqueIds = [...new Set(
      mediaIds
        .map(value => String(value || "").trim())
        .filter(Boolean)
    )];

    if (!uniqueIds.length) return;

    Promise.resolve().then(() => {
      uniqueIds.forEach(mediaId => {
        cleanupOrphanedImage(mediaId);
      });
    });
  }

  let dataChangeListenerBound = false;

  function bindDataChangeListener() {
    if (
      global.addEventListener &&
      !dataChangeListenerBound
    ) {
      global.addEventListener(
        "ksk:data-change",
        handleDataChange
      );

      dataChangeListenerBound = true;
    }
  }

  function initialize() {
    bindDataChangeListener();

    return openDatabase()
      .then(() => true)
      .catch(error => {
        console.error(
          "KSK Media initialization failed:",
          error
        );

        return false;
      });
  }

  const api = Object.freeze({
    initialize,
    saveImage,
    getImage,
    getImageURL,
    deleteImage,
    cleanupOrphanedImage,
    revokeImageURL,
    revokeAllImageURLs
  });

  global.KSKMedia = api;

  bindDataChangeListener();

})(window);
