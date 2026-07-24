// Shared runtime dependencies for extension settings pages.
//
// These modules expose their APIs on globalThis for legacy callers. Keep this list intentionally
// small: importing all_content_scripts here would initialize normal mode, the HUD, and iframe UI
// components on chrome-extension:// settings pages.
import "../lib/utils.js";
import "../lib/settings.js";
import "../lib/keyboard_utils.js";
import "../lib/dom_utils.js";
