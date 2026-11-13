
"use strict";

/*
 * MERO SANSAR — NOTIFICATION TONE ENGINE
 *
 * Uses only the five MP3 files in /sounds/
 * No synthesized tones.
 * No speech synthesis.
 */

(function (global) {
  "use strict";

  if (global.KSKTone) return;

  let activeAudio = null;
  let activeToneId = "";

  const TONES = Object.freeze([
    {
      id: "eagle",
      ne: "चील",
      en: "Eagle",
      src: "./sounds/Eagle.mp3"
    },
    {
      id: "oh_no",
      ne: "ओह नो",
      en: "Oh No",
      src: "./sounds/Oh%20No.mp3"
    },
    {
      id: "water_drop",
      ne: "पानीको थोपा",
      en: "Water Drop",
      src: "./sounds/Water%20Drop.mp3"
    },
    {
      id: "whistle",
      ne: "सिटी",
      en: "Whistle",
      src: "./sounds/Whistle.mp3"
    },
    {
      id: "anthem",
      ne: "एन्थम",
      en: "Anthem",
      src: "./sounds/anthem.mp3"
    }
  ]);

  function getTones() {
    return TONES.map(function (tone) {
      return {
        id: tone.id,
        ne: tone.ne,
        en: tone.en,
        type: "file",
        src: tone.src
      };
    });
  }

  function getTone(id) {
    const key = String(id || "");

    const tone = TONES.find(function (item) {
      return item.id === key;
    });

    if (!tone) return null;

    return {
      id: tone.id,
      ne: tone.ne,
      en: tone.en,
      type: "file",
      src: tone.src
    };
  }

  function stop() {
    if (!activeAudio) {
      activeToneId = "";
      return true;
    }

    const audio = activeAudio;

    activeAudio = null;
    activeToneId = "";

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    } catch (error) {
      console.warn(
        "Could not stop notification sound:",
        error
      );
    }

    return true;
  }

  function play(id) {
    const tone = getTone(id);

    if (!tone) {
      console.warn(
        "Unknown notification tone:",
        id
      );

      return Promise.resolve(false);
    }

    stop();

    return new Promise(function (resolve) {
      const audio = new Audio();

      activeAudio = audio;
      activeToneId = tone.id;

      audio.preload = "auto";
      audio.src = tone.src;
      audio.volume = 0.8;

      let finished = false;

      function cleanup() {
        if (finished) return;
        finished = true;

        audio.removeEventListener(
          "ended",
          onEnded
        );

        audio.removeEventListener(
          "error",
          onError
        );

        if (activeAudio === audio) {
          activeAudio = null;
          activeToneId = "";
        }
      }

      function onEnded() {
        cleanup();
        resolve(true);
      }

      function onError() {
        cleanup();

        console.error(
          "Notification MP3 could not be loaded:",
          tone.src
        );

        resolve(false);
      }

      audio.addEventListener(
        "ended",
        onEnded,
        { once: true }
      );

      audio.addEventListener(
        "error",
        onError,
        { once: true }
      );

      let playResult;

      try {
        playResult = audio.play();
      } catch (error) {
        onError();
        return;
      }

      if (
        playResult &&
        typeof playResult.then === "function"
      ) {
        playResult.then(function () {
          if (activeAudio !== audio) {
            cleanup();
            resolve(false);
          }
        }).catch(function (error) {
          cleanup();

          console.warn(
            "Notification sound playback was blocked:",
            error
          );

          resolve(false);
        });
      }
    });
  }

  global.KSKTone = Object.freeze({
    getTones,
    getTone,
    play,
    stop,

    getCurrentTone() {
      return activeToneId;
    }
  });

})(window);
