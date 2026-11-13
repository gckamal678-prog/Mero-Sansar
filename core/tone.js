
"use strict";

/*
 * =========================================================
 * MERO SANSAR — NOTIFICATION TONE ENGINE
 *
 * File: core/tone.js
 *
 * Features:
 * - Mobile-friendly AudioContext activation
 * - Eight built-in notification tones
 * - Custom MP3 support
 * - Immediate playback after user selection
 * - Only one sound plays at a time
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
  let activeGainNodes = [];

  const BUILT_IN_TONES = [
    {
      id: "whistle",
      ne: "सिटी",
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
   *   id: "love",
   *   ne: "माया",
   *   en: "Love",
   *   type: "file",
   *   src: "./sounds/notifications/love.mp3"
   * }
   *
   * MP3 file path must match the repository path.
   * =======================================================
   */

  const CUSTOM_TONES = [
    // Add your own MP3 entries here.
  ];

  /*
   * Create AudioContext only when required.
   */
  function getAudioContext() {
    if (!AudioContextClass) return null;

    try {
      if (!audioContext) {
        audioContext = new AudioContextClass();
      }

      return audioContext;
    } catch (error) {
      console.warn(
        "Notification AudioContext unavailable:",
        error
      );

      return null;
    }
  }

  /*
   * Important mobile fix:
   *
   * Call resume() immediately when play() is triggered
   * by a user interaction, then wait until it is ready.
   */
  async function prepareAudioContext() {
    const context = getAudioContext();

    if (!context) return null;

    try {
      if (
        context.state === "suspended" ||
        context.state === "interrupted"
      ) {
        await context.resume();
      }

      if (context.state !== "running") {
        return null;
      }

      return context;
    } catch (error) {
      console.warn(
        "Could not activate notification audio:",
        error
      );

      return null;
    }
  }

  /*
   * Stop all currently playing sounds.
   */
  function stop() {
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
        activeAudio.src = "";
      } catch (_) {}

      activeAudio = null;
    }

    activeOscillators.forEach(node => {
      try {
        node.onended = null;
        node.stop();
      } catch (_) {}

      try {
        node.disconnect();
      } catch (_) {}
    });

    activeGainNodes.forEach(node => {
      try {
        node.disconnect();
      } catch (_) {}
    });

    activeOscillators = [];
    activeGainNodes = [];

    if (global.speechSynthesis) {
      try {
        global.speechSynthesis.cancel();
      } catch (_) {}
    }
  }

  /*
   * Create a controlled volume node.
   */
  function makeGain(
    context,
    start,
    duration,
    volume = 0.18
  ) {
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

  /*
   * Play a sequence of synthesized notes.
   */
  async function playNotes(
    notes,
    wave = "sine",
    volume = 0.18
  ) {
    const context = await prepareAudioContext();

    if (!context) return false;

    let time = context.currentTime + 0.04;

    notes.forEach(note => {
      const frequency = note[0];
      const duration = note[1];

      const oscillator = context.createOscillator();

      const gain = makeGain(
        context,
        time,
        duration,
        volume
      );

      oscillator.type = wave;

      oscillator.frequency.setValueAtTime(
        frequency,
        time
      );

      oscillator.connect(gain);

      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gain.disconnect();
        } catch (_) {}
      };

      oscillator.start(time);
      oscillator.stop(time + duration + 0.03);

      activeOscillators.push(oscillator);

      time += duration + 0.07;
    });

    return true;
  }

  /*
   * 1. Whistle
   */
  async function playWhistle() {
    return playNotes([
      [1250, 0.20],
      [1550, 0.24],
      [1350, 0.18],
      [1650, 0.34]
    ], "sine", 0.13);
  }

  /*
   * 2. Lu Lu Lu
   */
  async function playLuLuLu() {
    return playNotes([
      [523, 0.20],
      [659, 0.20],
      [784, 0.28],
      [659, 0.20],
      [784, 0.36]
    ], "triangle", 0.16);
  }

  /*
   * 3. Wolf Howl — synthesized effect.
   */
  async function playWolf() {
    const context = await prepareAudioContext();

    if (!context) return false;

    const start = context.currentTime + 0.04;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sawtooth";

    oscillator.frequency.setValueAtTime(
      280,
      start
    );

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

    gain.gain.linearRampToValueAtTime(
      0.12,
      start + 0.15
    );

    gain.gain.linearRampToValueAtTime(
      0.08,
      start + 1.8
    );

    gain.gain.linearRampToValueAtTime(
      0.0001,
      start + 2.5
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        gain.disconnect();
      } catch (_) {}
    };

    oscillator.start(start);
    oscillator.stop(start + 2.55);

    activeOscillators.push(oscillator);
    activeGainNodes.push(gain);

    return true;
  }

  /*
   * 4. Eagle Call — synthesized effect.
   */
  async function playEagle() {
    return playNotes([
      [950, 0.12],
      [1250, 0.16],
      [880, 0.12],
      [1150, 0.22],
      [760, 0.15],
      [1050, 0.25]
    ], "triangle", 0.13);
  }

  /*
   * 5. Siren — synthesized alert tone.
   */
  async function playPurge() {
    const context = await prepareAudioContext();

    if (!context) return false;

    const start = context.currentTime + 0.04;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sawtooth";

    oscillator.frequency.setValueAtTime(
      430,
      start
    );

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

    gain.gain.linearRampToValueAtTime(
      0.10,
      start + 0.1
    );

    gain.gain.setValueAtTime(
      0.10,
      start + 2.0
    );

    gain.gain.linearRampToValueAtTime(
      0.0001,
      start + 2.2
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.onended = () => {
      try {
        oscillator.disconnect();
        gain.disconnect();
      } catch (_) {}
    };

    oscillator.start(start);
    oscillator.stop(start + 2.25);

    activeOscillators.push(oscillator);
    activeGainNodes.push(gain);

    return true;
  }

  /*
   * 6. Birds — synthesized chirping effect.
   */
  async function playBirds() {
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

  /*
   * 7. Mechanical Click
   */
  async function playMechanicalClick() {
    return playNotes([
      [170, 0.045],
      [115, 0.055],
      [240, 0.04]
    ], "square", 0.09);
  }

  /*
   * 8. I Love You — device speech voice.
   */
  function playVoice() {
    if (
      !global.speechSynthesis ||
      !global.SpeechSynthesisUtterance
    ) {
      return playNotes([
        [660, 0.20],
        [784, 0.22],
        [988, 0.38]
      ], "triangle", 0.15);
    }

    try {
      const utterance =
        new global.SpeechSynthesisUtterance(
          "I love you"
        );

      utterance.lang = "en-US";
      utterance.rate = 0.88;
      utterance.pitch = 1.05;
      utterance.volume = 0.85;

      global.speechSynthesis.speak(utterance);

      return Promise.resolve(true);
    } catch (error) {
      console.warn(
        "Speech playback unavailable:",
        error
      );

      return playNotes([
        [660, 0.20],
        [784, 0.22],
        [988, 0.38]
      ], "triangle", 0.15);
    }
  }

  /*
   * Play a built-in tone by ID.
   */
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
        return Promise.resolve(false);
    }
  }

  /*
   * Play a custom MP3 file.
   */
  async function playFile(tone) {
    if (!tone || !tone.src) return false;

    try {
      const audio = new global.Audio(tone.src);

      audio.preload = "auto";
      audio.volume = 0.85;

      activeAudio = audio;

      audio.addEventListener("ended", () => {
        if (activeAudio === audio) {
          activeAudio = null;
        }
      }, { once: true });

      audio.addEventListener("error", () => {
        if (activeAudio === audio) {
          activeAudio = null;
        }
      }, { once: true });

      await audio.play();

      return true;

    } catch (error) {
      console.warn(
        "Notification MP3 could not play:",
        error
      );

      if (activeAudio) {
        try {
          activeAudio.pause();
        } catch (_) {}

        activeAudio = null;
      }

      return false;
    }
  }

  /*
   * Main playback function.
   *
   * Usage:
   * KSKTone.play("whistle");
   * KSKTone.play("birds");
   * KSKTone.play("love");
   */
  async function play(id) {
    const tone = getTones().find(
      item => item.id === id
    );

    if (!tone) return false;

    stop();

    try {
      if (tone.type === "file") {
        return await playFile(tone);
      }

      if (tone.type === "voice") {
        return await playVoice();
      }

      return await playBuiltin(tone.id);

    } catch (error) {
      console.warn(
        "Notification tone playback failed:",
        error
      );

      stop();

      return false;
    }
  }

  /*
   * Return all available tones.
   */
  function getTones() {
    return [
      ...BUILT_IN_TONES,
      ...CUSTOM_TONES
    ].map(tone => ({ ...tone }));
  }

  /*
   * Return one tone by ID.
   */
  function getTone(id) {
    const tone = getTones().find(
      item => item.id === id
    );

    return tone ? { ...tone } : null;
  }

  /*
   * Public API.
   */
  global.KSKTone = Object.freeze({
    getTones,
    getTone,
    play,
    stop
  });

})(window);
