"use strict";

/*
 * MERO SANSAR — CHAT COMPOSER COMPATIBILITY
 *
 * Composer को मुख्य UI pages/messages-ui.js ले सम्हाल्छ।
 * यो फाइल जानाजानी निष्क्रिय राखिएको छ ताकि दुईवटा
 * UI enhancer ले एउटै Composer मा हस्तक्षेप नगरून्।
 */

(function (global) {
  if (global.__MS_COMPOSER_FIX_V2__) return;

  global.__MS_COMPOSER_FIX_V2__ = true;
  global.__MS_COMPOSER_FIX_DISABLED__ = true;

})(window);
