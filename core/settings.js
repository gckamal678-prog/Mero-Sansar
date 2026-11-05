/* Hamro Sansar — Shared Settings */

const SETTINGS_KEY = "hs_app_settings";

const DEFAULT_SETTINGS = {
  theme: "light",
  language: "ne",
  notifications: true,
  compactMode: false
};

function readSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(saved);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.error("Settings load failed:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

let settings = readSettings();
const listeners = new Set();

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Settings save failed:", error);
  }
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener({ ...settings });
    } catch (error) {
      console.error("Settings listener failed:", error);
    }
  });
}

export function getSettings() {
  return { ...settings };
}

export function getSetting(key) {
  return settings[key];
}

export function updateSetting(key, value) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
    console.warn(`Unknown setting: ${key}`);
    return settings;
  }

  settings = {
    ...settings,
    [key]: value
  };

  saveSettings();
  notifyListeners();

  return { ...settings };
}

export function updateSettings(values = {}) {
  const validValues = {};

  Object.keys(values).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key)) {
      validValues[key] = values[key];
    }
  });

  settings = {
    ...settings,
    ...validValues
  };

  saveSettings();
  notifyListeners();

  return { ...settings };
}

export function resetSettings() {
  settings = { ...DEFAULT_SETTINGS };
  saveSettings();
  notifyListeners();

  return { ...settings };
}

export function subscribeSettings(listener) {
  if (typeof listener !== "function") {
    throw new TypeError("Settings listener must be a function");
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
