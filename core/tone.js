
"use strict";

/*
 * =========================================================
 * MERO SANSAR — NOTIFICATION TONE ENGINE
 *
 * File: core/tone.js
 *
 * Features:
 * - Built-in notification sound effects
 * - Play immediately when selected (connected by notifications.js)
 * - Custom MP3 support
 * - One sound at a time
 * - No external library required
 *
 * FUTURE MP3 LOCATION:
 * ./sounds/notifications/
 * =========================================================
 */

(function (global) {
  if (global.KSKTone) return;

  const AudioContextClass =
    global.AudioContext ||
    global.webkitAudioContext;

  let audioContext = null;
  let activeAudio = null;
  let activeOscillators = [];
  let activeSources = [];
  let activeGainNodes = [];

  const BUILT_IN_TONES = [
    {
      id: "whistle",
      ne: "सिठी",
      en: "Whistle",
      type: "builtin"
    },
    {
      id: "i_love_you",
      ne: "आइ लभ यू",
      en: "I Love You",
      type: "voice"
    },
    {
      id: "lu_lu_lu",
      ne: "लु लु लु",
      en: "Lu Lu Lu",
      type: "builtin"
    },
    {
      id: "wolf",
      ne: "ब्वाँसोको आवाज",
      en: "Wolf Howl",
      type: "builtin"
    },
    {
      id: "eagle",
      ne: "चीलको आवाज",
      en: "Eagle Call",
      type: "builtin"
    },
    {
      id: "purge",
      ne: "साइरन",
      en: "The Purge Siren",
      type: "builtin"
    },
    {
      id: "birds",
      ne: "चराचुरुङ्गी",
      en: "Birds",
      type: "builtin"
    },
    {
      id: "mechanical_click",
      ne: "मेकानिकल क्लिक",
      en: "Mechanical Click",
      type: "builtin"
    }
  ];

  /*
   * =======================================================
   * CUSTOM MP3 SOUND LIST
   *
   * भविष्यमा Repository मा MP3 राखेपछि यहाँ थप्नुहोस्।
   *
   * Example:
   *
   * {
   *   id: "my_sound",
   *   ne: "मेरो ध्वनि",
   *   en: "My Sound",
   *   type: "file",
   *   src: "./sounds/notifications/my-sound.mp3"
   * }
   *
   * MP3 file path must match the repository path.
   * =======================================================
   */

  const CUSTOM_TONES = [
    // Add your own MP3 entries here.
  ];

  function getAudioContext() {
    if (!AudioContextClass) return null;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    return audioContext;
  }

  function stop() {
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch (_) {}

      activeAudio = null;
    }

    activeOscillators.forEach(node => {
      try {
        node.stop();
      } catch (_) {}
    });

    activeSources.forEach(node => {
      try {
        node.stop();
      } catch (_) {}
    });

    activeGainNodes.forEach(node => {
      try {
        node.disconnect();
      } catch (_) {}
    });

    activeOscillators = [];
    activeSources = [];
    activeGainNodes = [];

    if (global.speechSynthesis) {
      try {
        global.speechSynthesis.cancel();
      } catch (_) {}
    }
  }

  function makeGain(context, start, end, duration, volume = 0.18) {
    const gain = context.createGain();

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      volume,
      start + 0.025
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      start + duration
    );

    gain.connect(context.destination);
    activeGainNodes.push(gain);

    return gain;
  }

  function playNotes(notes, wave = "sine", volume = 0.18) {
    const context = getAudioContext();

    if (!context) return false;

    if (context.state === "suspended") {
      context.resume();
    }

    if (context.state !== "running") return false;

    let time = context.currentTime + 0.04;

    notes.forEach(note => {
      const frequency = note[0];
      const duration = note[1];
      const oscillator = context.createOscillator();
      const gain = makeGain(
        context,
        time,
        time + duration,
        duration,
        volume
      );

      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(
        frequency,
        time
      );

      oscillator.connect(gain);
      oscillator.start(time);
      oscillator.stop(time + duration + 0.03);

      activeOscillators.push(oscillator);

      time += duration + 0.07;
    });

    return true;
  }

  function playWhistle() {
    return playNotes([
      [1250, 0.20],
      [1550, 0.24],
      [1350, 0.18],
      [1650, 0.34]
    ], "sine", 0.13);
  }

  function playLuLuLu() {
    return playNotes([
      [523, 0.20],
      [659, 0.20],
      [784, 0.28],
      [659, 0.20],
      [784, 0.36]
    ], "triangle", 0.16);
  }

  function playWolf() {
    const context = getAudioContext();

    if (!context) return false;

    if (context.state === "suspended") {
      context.resume();
    }

    if (context.state !== "running") return false;

    const start = context.currentTime + 0.04;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sawtooth";

    oscillator.frequency.setValueAtTime(280, start);
    oscillator.frequency.linearRampToValueAtTime(
      520,
      start + 0.9
    );
    oscillator.frequency.linearRampToValueAtTime(
      350,
      start + 1.8
    );
    oscillator.frequency.linearRampToValueAtTime(
      240,
      start + 2.4
    );

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.15);
    gain.gain.linearRampToValueAtTime(0.08, start + 1.8);
    gain.gain.linearRampToValueAtTime(0.0001, start + 2.5);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(start);
    oscillator.stop(start + 2.55);

    activeOscillators.push(oscillator);
    activeGainNodes.push(gain);

    return true;
  }

  function playEagle() {
    return playNotes([
      [950, 0.12],
      [1250, 0.16],
      [880, 0.12],
      [1150, 0.22],
      [760, 0.15],
      [1050, 0.25]
    ], "triangle", 0.13);
  }

  function playPurge() {
    const context = getAudioContext();

    if (!context) return false;

    if (context.state === "suspended") {
      context.resume();
    }

    if (context.state !== "running") return false;

    const start = context.currentTime + 0.04;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(430, start);
    oscillator.frequency.linearRampToValueAtTime(
      850,
      start + 0.7
    );
    oscillator.frequency.linearRampToValueAtTime(
      430,
      start + 1.4
    );
    oscillator.frequency.linearRampToValueAtTime(
      850,
      start + 2.1
    );

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.10, start + 0.1);
    gain.gain.setValueAtTime(0.10, start + 2.0);
    gain.gain.linearRampToValueAtTime(0.0001, start + 2.2);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(start);
    oscillator.stop(start + 2.25);

    activeOscillators.push(oscillator);
    activeGainNodes.push(gain);

    return true;
  }

  function playBirds() {
    return playNotes([
      [1800, 0.09],
      [2300, 0.10],
      [1950, 0.08],
      [2500, 0.13],
      [1700, 0.08],
      [2200, 0.12],
      [2600, 0.10],
      [2000, 0.16]
    ], "sine", 0.12);
  }

  function playMechanicalClick() {
    return playNotes([
      [170, 0.045],
      [115, 0.055],
      [240, 0.04]
    ], "square", 0.09);
  }

  function playVoice() {
    if (!global.speechSynthesis || !global.SpeechSynthesisUtterance) {
      return playNotes([
        [660, 0.20],
        [784, 0.22],
        [988, 0.38]
      ], "triangle", 0.15);
    }

    try {
      const utterance = new SpeechSynthesisUtterance(
        "I love you"
      );

      utterance.lang = "en-US";
      utterance.rate = 0.88;
      utterance.pitch = 1.05;
      utterance.volume = 0.85;

      global.speechSynthesis.speak(utterance);

      return true;
    } catch (_) {
      return playNotes([
        [660, 0.20],
        [784, 0.22],
        [988, 0.38]
      ], "triangle", 0.15);
    }
  }

  function playBuiltin(id) {
    switch (id) {
      case "whistle":
        return playWhistle();

      case "i_love_you":
        return playVoice();

      case "lu_lu_lu":
        return playLuLuLu();

      case "wolf":
        return playWolf();

      case "eagle":
        return playEagle();

      case "purge":
        return playPurge();

      case "birds":
        return playBirds();

      case "mechanical_click":
        return playMechanicalClick();

      default:
        return false;
    }
  }

  async function playFile(tone) {
    if (!tone || !tone.src) return false;

    try {
      const audio = new Audio(tone.src);

      audio.preload = "auto";
      audio.volume = 0.85;

      activeAudio = audio;

      await audio.play();

      audio.addEventListener("ended", () => {
        if (activeAudio === audio) {
          activeAudio = null;
        }
      }, { once: true });

      return true;

    } catch (error) {
      console.warn("Notification MP3 could not play:", error);
      return false;
    }
  }

  async function play(id) {
    const tone = getTones().find(item => item.id === id);

    if (!tone) return false;

    stop();

    if (tone.type === "file") {
      return playFile(tone);
    }

    if (tone.type === "voice") {
      return playVoice();
    }

    return playBuiltin(tone.id);
  }

  function getTones() {
    return [
      ...BUILT_IN_TONES,
      ...CUSTOM_TONES
    ].map(tone => ({ ...tone }));
  }

  function getTone(id) {
    const tone = getTones().find(item => item.id === id);
    return tone ? { ...tone } : null;
  }

  global.KSKTone = Object.freeze({
    getTones,
    getTone,
    play,
    stop
  });

})(window);
