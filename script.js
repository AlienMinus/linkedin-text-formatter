// LinkedIn Unicode Formatter
// Refactored, data-driven Unicode formatter with reliable toggling,
// selection preservation, undo/redo, and keyboard shortcuts.
//
// Static UI text, shortcut definitions, and style definitions are loaded
// from ./data/*.json. Unicode exception mappings are read from styles.json.

"use strict";

// ============================================================================
// DOM
// ============================================================================

const DOM = {
  editor: document.getElementById("editor"),
  preview: document.getElementById("preview"),
  toolbar: document.getElementById("toolbar"),

  undoBtn: document.getElementById("undoBtn"),
  redoBtn: document.getElementById("redoBtn"),
  copyBtn: document.getElementById("copyBtn"),
  clearBtn: document.getElementById("clearBtn"),

  charCount: document.getElementById("charCount"),
  maxChars: document.getElementById("maxChars"),
  wordCount: document.getElementById("wordCount"),
  progressBar: document.getElementById("progressBar"),
  selectionInfo: document.getElementById("selectionInfo"),
  statusMessage: document.getElementById("statusMessage"),

  appTitle: document.getElementById("appTitle"),
  appSubtitle: document.getElementById("appSubtitle"),
  editorHeading: document.getElementById("editorHeading"),
  previewHeading: document.getElementById("previewHeading"),
  previewBadge: document.getElementById("previewBadge"),
  shortcutTitle: document.getElementById("shortcutTitle"),
  charsLabel: document.getElementById("charsLabel"),
  wordsLabel: document.getElementById("wordsLabel"),
  shortcutList: document.getElementById("shortcutList")
};

// ============================================================================
// APPLICATION STATE
// ============================================================================

const state = {
  ui: null,
  shortcuts: [],
  styles: {},

  history: [],
  historyIndex: -1,
  restoringHistory: false,

  maxChars: 3000,
  isMac: /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
};

// ============================================================================
// JSON DATA
// ============================================================================

async function loadJSON(path) {
  const response = await fetch(path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }

  return response.json();
}

async function loadAppData() {
  try {
    const [ui, shortcutData, styleData] = await Promise.all([
      loadJSON("./data/ui.json"),
      loadJSON("./data/shortcuts.json"),
      loadJSON("./data/styles.json")
    ]);

    state.ui = ui;
    state.shortcuts = shortcutData.shortcuts || [];
    state.styles = styleData.styles || {};
    state.maxChars = Number(ui.app?.maxChars) || 3000;
  } catch (error) {
    console.error("Formatter data loading failed:", error);

    document.body.innerHTML = `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 760px;
        margin: 60px auto;
        padding: 30px;
        color: #eee;
        background: #181818;
        border: 1px solid #9c27b0;
        border-radius: 10px;
      ">
        <h2>Unable to load formatter data</h2>
        <p>${escapeHTML(error.message)}</p>
        <p>
          Run the project through a local server, for example:
          <code>python -m http.server 8000</code>
        </p>
      </div>
    `;

    throw error;
  }
}

// ============================================================================
// SMALL UTILITIES
// ============================================================================

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function hexToCodePoint(hex) {
  return Number.parseInt(hex, 16);
}

function codePointToChar(hex) {
  return String.fromCodePoint(hexToCodePoint(hex));
}

function isUppercaseASCII(ch) {
  const cp = ch.codePointAt(0);
  return cp >= 65 && cp <= 90;
}

function isLowercaseASCII(ch) {
  const cp = ch.codePointAt(0);
  return cp >= 97 && cp <= 122;
}

function isLetterASCII(ch) {
  return isUppercaseASCII(ch) || isLowercaseASCII(ch);
}

// ============================================================================
// UNICODE STYLE ENGINE
// ============================================================================
//
// The important design change is that the encoder AND decoder are generated
// from styles.json. There is no separate hard-coded "italic h" logic.
//
// Example:
//
// italic.upper = 1D434
// italic.lower = 1D44E
// italic.exceptions.lower.h = 210E
//
// Therefore:
//
// h -> U+210E (ℎ)
// ℎ -> h
//
// This makes the toggle operation symmetrical.

const unicodeEngine = {
  decoders: [],
  combiningMarks: new Set(["0332", "0336"]),

  rebuild() {
    this.decoders = [];

    for (const [styleName, config] of Object.entries(state.styles)) {
      if (config.type !== "math") continue;

      const decoder = {
        styleName,
        ranges: [],
        reverseExceptions: new Map()
      };

      if (config.upper && config.lower) {
        decoder.ranges.push({
          sourceStart: 65,
          sourceEnd: 90,
          targetStart: hexToCodePoint(config.upper)
        });

        decoder.ranges.push({
          sourceStart: 97,
          sourceEnd: 122,
          targetStart: hexToCodePoint(config.lower)
        });
      }

      this.addExceptions(decoder, config.exceptions);
      this.decoders.push(decoder);
    }
  },

  addExceptions(decoder, exceptions = {}) {
    for (const [ascii, hex] of Object.entries(exceptions.upper || {})) {
      decoder.reverseExceptions.set(codePointToChar(hex), ascii);
    }

    for (const [ascii, hex] of Object.entries(exceptions.lower || {})) {
      decoder.reverseExceptions.set(codePointToChar(hex), ascii);
    }
  },

  encodeMath(text, config) {
    const upperStart = hexToCodePoint(config.upper);
    const lowerStart = hexToCodePoint(config.lower);

    const upperExceptions = config.exceptions?.upper || {};
    const lowerExceptions = config.exceptions?.lower || {};

    let output = "";

    for (const ch of text) {
      // JSON-defined exceptions ALWAYS win over the normal range.
      if (upperExceptions[ch]) {
        output += codePointToChar(upperExceptions[ch]);
        continue;
      }

      if (lowerExceptions[ch]) {
        output += codePointToChar(lowerExceptions[ch]);
        continue;
      }

      if (isUppercaseASCII(ch)) {
        output += String.fromCodePoint(
          upperStart + ch.codePointAt(0) - 65
        );
        continue;
      }

      if (isLowercaseASCII(ch)) {
        output += String.fromCodePoint(
          lowerStart + ch.codePointAt(0) - 97
        );
        continue;
      }

      output += ch;
    }

    return output;
  },

  encodeCombining(text, config) {
    const mark = codePointToChar(config.mark);
    return [...text].map(ch => ch + mark).join("");
  },

  encodeCircled(text) {
    let output = "";

    for (const ch of text) {
      const cp = ch.codePointAt(0);

      if (cp >= 65 && cp <= 90) {
        output += String.fromCodePoint(0x24B6 + cp - 65);
      } else if (cp >= 97 && cp <= 122) {
        output += String.fromCodePoint(0x24D0 + cp - 97);
      } else if (cp >= 49 && cp <= 57) {
        output += String.fromCodePoint(0x2460 + cp - 49);
      } else if (ch === "0") {
        output += "⓪";
      } else {
        output += ch;
      }
    }

    return output;
  },

  encodeMap(text, config) {
    const map = config.map || {};

    return [...text]
      .map(ch => map[ch] || ch)
      .join("");
  },

  encode(text, styleName) {
    const config = state.styles[styleName];

    if (!config) return text;

    switch (config.type) {
      case "math":
        return this.encodeMath(text, config);

      case "combining":
        return this.encodeCombining(text, config);

      case "circled":
        return this.encodeCircled(text);

      case "squared":
      case "negativeSquared":
        return this.encodeMap(text, config);

      default:
        return text;
    }
  },

  decodeMathChar(ch) {
    for (const decoder of this.decoders) {
      // 1. Check JSON-defined exceptions first.
      if (decoder.reverseExceptions.has(ch)) {
        return decoder.reverseExceptions.get(ch);
      }

      // 2. Check normal mathematical ranges.
      const cp = ch.codePointAt(0);

      for (const range of decoder.ranges) {
        const length = range.sourceEnd - range.sourceStart;

        if (cp >= range.targetStart && cp <= range.targetStart + length) {
          return String.fromCharCode(
            range.sourceStart + cp - range.targetStart
          );
        }
      }
    }

    return null;
  },

  decodeMapChar(ch, config) {
    const map = config.map || {};

    for (const [plain, styled] of Object.entries(map)) {
      if (styled === ch) return plain;
    }

    return null;
  },

  normalize(text) {
    // NFD is useful for removing combining underline/strike marks.
    // Do NOT remove every combining mark: only our formatter marks.
    let input = text.normalize("NFD");

    for (const markHex of this.combiningMarks) {
      input = input.replaceAll(codePointToChar(markHex), "");
    }

    let output = "";

    for (const ch of input) {
      // Mathematical alphabets
      const mathDecoded = this.decodeMathChar(ch);

      if (mathDecoded !== null) {
        output += mathDecoded;
        continue;
      }

      // Circled characters
      const circledDecoded = decodeCircledChar(ch);

      if (circledDecoded !== null) {
        output += circledDecoded;
        continue;
      }

      // Squared / negative squared characters
      let mapped = false;

      for (const styleName of ["squared", "negativeSquared"]) {
        const config = state.styles[styleName];

        if (!config) continue;

        const decoded = this.decodeMapChar(ch, config);

        if (decoded !== null) {
          output += decoded;
          mapped = true;
          break;
        }
      }

      if (mapped) continue;

      output += ch;
    }

    return output.normalize("NFC");
  }
};

// ============================================================================
// CIRCLED DECODER
// ============================================================================

function decodeCircledChar(ch) {
  const cp = ch.codePointAt(0);

  if (cp >= 0x24B6 && cp <= 0x24CF) {
    return String.fromCharCode(65 + cp - 0x24B6);
  }

  if (cp >= 0x24D0 && cp <= 0x24E9) {
    return String.fromCharCode(97 + cp - 0x24D0);
  }

  if (cp >= 0x2460 && cp <= 0x2468) {
    return String.fromCharCode(49 + cp - 0x2460);
  }

  if (ch === "⓪") return "0";

  return null;
}

// ============================================================================
// FORMATTER API
// ============================================================================

function formatText(text, styleName) {
  return unicodeEngine.encode(text, styleName);
}

function normalizeText(text) {
  return unicodeEngine.normalize(text);
}

function isAlreadyFormatted(text, styleName) {
  if (!text || !state.styles[styleName]) return false;

  const plain = normalizeText(text);

  if (plain === text) {
    // This also prevents pressing Bold/Italic on plain text from being
    // incorrectly treated as a toggle-off operation.
    return false;
  }

  return formatText(plain, styleName) === text;
}

// ============================================================================
// SELECTION
// ============================================================================

function getSelection() {
  return {
    start: DOM.editor.selectionStart ?? 0,
    end: DOM.editor.selectionEnd ?? 0
  };
}

function getSelectedText() {
  const { start, end } = getSelection();
  return DOM.editor.value.slice(start, end);
}

function setSelection(start, end = start) {
  DOM.editor.focus();
  DOM.editor.setSelectionRange(start, end);
}

function replaceSelection(newText) {
  const { start, end } = getSelection();
  const scrollTop = DOM.editor.scrollTop;

  DOM.editor.value =
    DOM.editor.value.slice(0, start) +
    newText +
    DOM.editor.value.slice(end);

  setSelection(start, start + newText.length);
  DOM.editor.scrollTop = scrollTop;

  render();
  saveHistory();
}

// ============================================================================
// FORMATTING / TOGGLE
// ============================================================================

function applyStyle(styleName) {
  const selected = getSelectedText();

  if (!selected) {
    setStatus(state.ui.app.statusNoSelection);
    DOM.editor.focus();
    return;
  }

  const plain = normalizeText(selected);

  // If the complete selection is already in the requested style,
  // clicking the same button toggles it back to plain text.
  const toggledOff = isAlreadyFormatted(selected, styleName);

  const result = toggledOff
    ? plain
    : formatText(plain, styleName);

  replaceSelection(result);

  const styleNameForUI =
    state.styles[styleName]?.name || styleName;

  setStatus(
    state.ui.app.statusFormatted.replace(
      "{style}",
      styleNameForUI
    )
  );
}

// ============================================================================
// HISTORY
// ============================================================================

function createSnapshot() {
  return {
    value: DOM.editor.value,
    start: DOM.editor.selectionStart ?? 0,
    end: DOM.editor.selectionEnd ?? 0,
    scrollTop: DOM.editor.scrollTop
  };
}

function saveHistory(force = false) {
  const current = createSnapshot();
  const previous = state.history[state.historyIndex];

  if (
    !force &&
    previous &&
    previous.value === current.value
  ) {
    // Text has not changed, so don't create duplicate history entries.
    return;
  }

  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(current);
  state.historyIndex++;
}

function restoreSnapshot(snapshot) {
  state.restoringHistory = true;

  DOM.editor.value = snapshot.value;

  const start = Math.min(
    snapshot.start,
    DOM.editor.value.length
  );

  const end = Math.min(
    snapshot.end,
    DOM.editor.value.length
  );

  DOM.editor.focus();
  DOM.editor.setSelectionRange(start, end);
  DOM.editor.scrollTop = snapshot.scrollTop || 0;

  state.restoringHistory = false;

  render();
}

function undo() {
  if (state.historyIndex <= 0) {
    setStatus(state.ui.app.statusNothingToUndo);
    return;
  }

  state.historyIndex--;
  restoreSnapshot(state.history[state.historyIndex]);
}

function redo() {
  if (state.historyIndex >= state.history.length - 1) {
    setStatus(state.ui.app.statusNothingToRedo);
    return;
  }

  state.historyIndex++;
  restoreSnapshot(state.history[state.historyIndex]);
}

// ============================================================================
// RENDER / STATS
// ============================================================================

function updatePreview() {
  DOM.preview.textContent = DOM.editor.value;
}

function updateStats() {
  const text = DOM.editor.value;

  DOM.charCount.textContent = text.length;
  DOM.maxChars.textContent = state.maxChars;

  const trimmed = text.trim();

  DOM.wordCount.textContent = trimmed
    ? trimmed.split(/\s+/).length
    : 0;

  const percentage = Math.min(
    (text.length / state.maxChars) * 100,
    100
  );

  DOM.progressBar.style.width = `${percentage}%`;
  DOM.progressBar.classList.toggle(
    "over-limit",
    text.length > state.maxChars
  );
}

function updateSelectionInfo() {
  const count = getSelectedText().length;

  DOM.selectionInfo.textContent = count
    ? state.ui.app.selectedTemplate.replace("{count}", count)
    : state.ui.app.selectionPrompt;
}

function render() {
  updatePreview();
  updateStats();
  updateSelectionInfo();
}

function setStatus(message) {
  DOM.statusMessage.textContent = message;
}

// ============================================================================
// UI GENERATION
// ============================================================================

function buildStaticUI() {
  const app = state.ui.app;

  document.title = app.title;

  DOM.appTitle.textContent = app.title;
  DOM.appSubtitle.textContent = app.subtitle;
  DOM.editorHeading.textContent = app.editorHeading;
  DOM.previewHeading.textContent = app.previewHeading;
  DOM.previewBadge.textContent = app.previewBadge;
  DOM.shortcutTitle.textContent = app.shortcutTitle;
  DOM.charsLabel.textContent = app.charsLabel;
  DOM.wordsLabel.textContent = app.wordsLabel;

  DOM.undoBtn.textContent = app.undo;
  DOM.redoBtn.textContent = app.redo;
  DOM.copyBtn.textContent = app.copy;
  DOM.clearBtn.textContent = app.clear;
}

function buildToolbar() {
  DOM.toolbar.replaceChildren();

  for (const item of state.ui.toolbar || []) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "tool";
    button.dataset.style = item.style;

    button.title = `${item.title} — ${item.shortcut}`;
    button.setAttribute("aria-label", item.title);

    const glyph = document.createElement("span");
    glyph.className = "tool-glyph";
    glyph.textContent = item.label;

    const name = document.createElement("span");
    name.className = "tool-name";
    name.textContent = item.title;

    const shortcut = document.createElement("kbd");
    shortcut.textContent = item.shortcut;

    button.append(glyph, name, shortcut);

    // Critical for textarea formatting:
    // mousedown normally moves focus to the button and clears the
    // textarea's selection. Preventing the default keeps selection intact.
    button.addEventListener("mousedown", event => {
      event.preventDefault();
    });

    button.addEventListener("click", () => {
      applyStyle(item.style);
    });

    DOM.toolbar.appendChild(button);
  }
}

function buildShortcutList() {
  DOM.shortcutList.replaceChildren();

  for (const item of state.shortcuts) {
    const chip = document.createElement("span");
    chip.className = "shortcut-chip";

    const keys = document.createElement("kbd");
    keys.textContent = formatShortcutKeys(item.keys);

    const label = document.createElement("span");
    label.textContent = item.label;

    chip.append(keys, label);
    DOM.shortcutList.appendChild(chip);
  }
}

function formatShortcutKeys(keys) {
  return keys
    .map(key => {
      if (key === "CTRL") return state.isMac ? "⌘" : "Ctrl";
      if (key === "SHIFT") return "⇧";
      if (key === "ALT") return state.isMac ? "⌥" : "Alt";
      return key;
    })
    .join("+");
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

function shortcutMatches(event, keys) {
  const wantsCtrl = keys.includes("CTRL");
  const wantsShift = keys.includes("SHIFT");
  const wantsAlt = keys.includes("ALT");

  const ctrlPressed = state.isMac
    ? event.metaKey
    : event.ctrlKey;

  const key = event.key.toUpperCase();

  return (
    ctrlPressed === wantsCtrl &&
    event.shiftKey === wantsShift &&
    event.altKey === wantsAlt &&
    keys.includes(key)
  );
}

function handleKeyboardShortcuts(event) {
  const modifier = state.isMac
    ? event.metaKey
    : event.ctrlKey;

  // Undo
  if (
    modifier &&
    event.key.toLowerCase() === "z" &&
    !event.altKey
  ) {
    event.preventDefault();

    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }

    return;
  }

  // Redo
  if (
    modifier &&
    event.key.toLowerCase() === "y" &&
    !event.altKey &&
    !event.shiftKey
  ) {
    event.preventDefault();
    redo();
    return;
  }

  const shortcut = state.shortcuts.find(item =>
    shortcutMatches(event, item.keys)
  );

  if (!shortcut) return;

  event.preventDefault();
  applyStyle(shortcut.style);
}

// ============================================================================
// EDITOR EVENTS
// ============================================================================

function handleEditorInput() {
  if (!state.restoringHistory) {
    saveHistory();
  }

  render();
}

function updateSelectionInfoOnly() {
  updateSelectionInfo();
}

// ============================================================================
// BUTTON ACTIONS
// ============================================================================

async function copyOutput() {
  try {
    await navigator.clipboard.writeText(DOM.editor.value);

    DOM.copyBtn.textContent = state.ui.app.copied;
    setStatus(state.ui.app.copied);

    window.setTimeout(() => {
      DOM.copyBtn.textContent = state.ui.app.copy;
    }, 1200);
  } catch (error) {
    console.error("Copy failed:", error);
    setStatus(state.ui.app.statusCopyFailed);
  }
}

function clearEditor() {
  if (!DOM.editor.value) return;

  DOM.editor.value = "";
  setSelection(0);
  saveHistory();
  render();
  setStatus(state.ui.app.statusCleared);
}

// ============================================================================
// EVENT BINDINGS
// ============================================================================

function bindEvents() {
  DOM.editor.addEventListener("input", handleEditorInput);

  for (const eventName of [
    "select",
    "keyup",
    "click",
    "focus",
    "mouseup"
  ]) {
    DOM.editor.addEventListener(
      eventName,
      updateSelectionInfoOnly
    );
  }

  document.addEventListener(
    "keydown",
    handleKeyboardShortcuts
  );

  DOM.undoBtn.addEventListener("click", undo);
  DOM.redoBtn.addEventListener("click", redo);
  DOM.copyBtn.addEventListener("click", copyOutput);
  DOM.clearBtn.addEventListener("click", clearEditor);

  // selectionchange is useful when selection changes through keyboard/mouse
  // without an editor-specific event.
  document.addEventListener(
    "selectionchange",
    updateSelectionInfoOnly
  );
}

// ============================================================================
// STARTUP
// ============================================================================

async function init() {
  await loadAppData();

  // Build all Unicode decoder tables AFTER styles.json is available.
  unicodeEngine.rebuild();

  buildStaticUI();
  buildToolbar();
  buildShortcutList();
  bindEvents();

  DOM.editor.value = "";
  saveHistory(true);

  render();
  setStatus(state.ui.app.statusReady);
}

init().catch(error => {
  console.error("Formatter initialization failed:", error);
});
