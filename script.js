// LinkedIn Unicode Formatter
// Data-driven UI + robust Unicode normalization + keyboard shortcuts.

const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const toolbar = document.getElementById("toolbar");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");

const charCount = document.getElementById("charCount");
const maxChars = document.getElementById("maxChars");
const wordCount = document.getElementById("wordCount");
const progressBar = document.getElementById("progressBar");
const selectionInfo = document.getElementById("selectionInfo");
const statusMessage = document.getElementById("statusMessage");

let UI;
let SHORTCUTS;
let STYLE_CONFIG;

const MAX_CHAR_FALLBACK = 3000;

// -----------------------------------------------------------------------------
// Data loading
// -----------------------------------------------------------------------------

async function loadJSON(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

async function loadAppData() {
  try {
    [UI, SHORTCUTS, STYLE_CONFIG] = await Promise.all([
      loadJSON("./data/ui.json"),
      loadJSON("./data/shortcuts.json"),
      loadJSON("./data/styles.json")
    ]);
  } catch (error) {
    console.error(error);
    // The app intentionally stops here instead of silently using stale strings.
    document.body.innerHTML = `
      <div style="font-family:Arial;padding:30px;max-width:700px;margin:auto">
        <h2>Unable to load formatter data</h2>
        <p>Run this project through a local web server instead of opening
        <code>index.html</code> directly with <code>file://</code>.</p>
        <p>For example: <code>python -m http.server 8000</code></p>
      </div>`;
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Unicode normalization
// IMPORTANT: Do not use a hand-written decode table for mathematical alphabets.
// Code-point ranges are deterministic and avoid bugs such as the old bold
// s-z entries being mapped to a different Unicode alphabet.
// -----------------------------------------------------------------------------

const SPECIAL_LETTERS = {
  // Mathematical alphabets use a few compatibility characters.
  italicUpper: { H: "ℋ", I: "ℐ", L: "ℒ", R: "ℛ" },
  italicLower: { h: "ℎ" },
  boldItalicUpper: { C: "𝑪", H: "𝑯" },
  boldItalicLower: {},
  monoUpper: {},
  monoLower: {}
};

const CIRCLED_DECODE = {
  "ⓐ":"a","ⓑ":"b","ⓒ":"c","ⓓ":"d","ⓔ":"e","ⓕ":"f","ⓖ":"g","ⓗ":"h","ⓘ":"i","ⓙ":"j",
  "ⓚ":"k","ⓛ":"l","ⓜ":"m","ⓝ":"n","ⓞ":"o","ⓟ":"p","ⓠ":"q","ⓡ":"r","ⓢ":"s","ⓣ":"t",
  "ⓤ":"u","ⓥ":"v","ⓦ":"w","ⓧ":"x","ⓨ":"y","ⓩ":"z",
  "Ⓐ":"A","Ⓑ":"B","Ⓒ":"C","Ⓓ":"D","Ⓔ":"E","Ⓕ":"F","Ⓖ":"G","Ⓗ":"H","Ⓘ":"I","Ⓙ":"J",
  "Ⓚ":"K","Ⓛ":"L","Ⓜ":"M","Ⓝ":"N","Ⓞ":"O","Ⓟ":"P","Ⓠ":"Q","Ⓡ":"R","Ⓢ":"S","Ⓣ":"T",
  "Ⓤ":"U","Ⓥ":"V","Ⓦ":"W","Ⓧ":"X","Ⓨ":"Y","Ⓩ":"Z",
  "⓪":"0","①":"1","②":"2","③":"3","④":"4","⑤":"5","⑥":"6","⑦":"7","⑧":"8","⑨":"9"
};

const SQUARED_DECODE = {
  "🄰":"A","🄱":"B","🄲":"C","🄳":"D","🄴":"E","🄵":"F","🄶":"G","🄷":"H","🄸":"I","🄹":"J",
  "🄺":"K","🄻":"L","🄼":"M","🄽":"N","🄾":"O","🄿":"P","🅀":"Q","🅁":"R","🅂":"S","🅃":"T",
  "🅄":"U","🅅":"V","🅆":"W","🅇":"X","🅈":"Y","🅉":"Z"
};

const NEGATIVE_SQUARED_DECODE = {
  "🅰":"A","🅱":"B","🅲":"C","🅳":"D","🅴":"E","🅵":"F","🅶":"G","🅷":"H","🅸":"I","🅹":"J",
  "🅺":"K","🅻":"L","🅼":"M","🅽":"N","🅾":"O","🅿":"P","🆀":"Q","🆁":"R","🆂":"S","🆃":"T",
  "🆄":"U","🆅":"V","🆆":"W","🆇":"X","🆈":"Y","🆉":"Z"
};

function codePointRangeMap(text, upperStart, lowerStart, special = {}) {
  let output = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0);

    if (cp >= 65 && cp <= 90) {
      output += String.fromCodePoint(upperStart + cp - 65);
    } else if (cp >= 97 && cp <= 122) {
      output += String.fromCodePoint(lowerStart + cp - 97);
    } else {
      output += ch;
    }
  }
  return output;
}

function decodeMathChar(ch) {
  const cp = ch.codePointAt(0);

  // Mathematical Sans-Serif (regular)
  if (cp >= 0x1D5A0 && cp <= 0x1D5B9) return String.fromCharCode(65 + cp - 0x1D5A0);
  if (cp >= 0x1D5BA && cp <= 0x1D5D3) return String.fromCharCode(97 + cp - 0x1D5BA);

  // Mathematical Bold (serif)
  if (cp >= 0x1D400 && cp <= 0x1D419) return String.fromCharCode(65 + cp - 0x1D400);
  if (cp >= 0x1D41A && cp <= 0x1D433) return String.fromCharCode(97 + cp - 0x1D41A);

  // Mathematical Sans-Serif Bold (visually heavier)
  if (cp >= 0x1D5D4 && cp <= 0x1D5ED) return String.fromCharCode(65 + cp - 0x1D5D4);
  if (cp >= 0x1D5EE && cp <= 0x1D607) return String.fromCharCode(97 + cp - 0x1D5EE);

  // Mathematical Italic
  const italicUpperExceptions = {
    0x210E:"H", 0x2110:"I", 0x2112:"L", 0x211B:"R"
  };
  if (italicUpperExceptions[cp]) return italicUpperExceptions[cp];
  if (cp >= 0x1D434 && cp <= 0x1D44D) return String.fromCharCode(65 + cp - 0x1D434);
  if (cp >= 0x1D44E && cp <= 0x1D467) return String.fromCharCode(97 + cp - 0x1D44E);
  if (cp === 0x210E) return "h";

  // Mathematical Bold Italic
  if (cp >= 0x1D468 && cp <= 0x1D481) return String.fromCharCode(65 + cp - 0x1D468);
  if (cp >= 0x1D482 && cp <= 0x1D49B) return String.fromCharCode(97 + cp - 0x1D482);

  // Mathematical Monospace
  if (cp >= 0x1D670 && cp <= 0x1D689) return String.fromCharCode(65 + cp - 0x1D670);
  if (cp >= 0x1D68A && cp <= 0x1D6A3) return String.fromCharCode(97 + cp - 0x1D68A);

  return null;
}

function normalizeText(text) {
  // Strip combining marks used by underline/strike, then decode Unicode styles.
  let result = text.normalize("NFD").replace(/[\u0332\u0336]/g, "");

  let decoded = "";
  for (const ch of result) {
    const math = decodeMathChar(ch);
    if (math !== null) {
      decoded += math;
    } else if (CIRCLED_DECODE[ch]) {
      decoded += CIRCLED_DECODE[ch];
    } else if (SQUARED_DECODE[ch]) {
      decoded += SQUARED_DECODE[ch];
    } else if (NEGATIVE_SQUARED_DECODE[ch]) {
      decoded += NEGATIVE_SQUARED_DECODE[ch];
    } else {
      decoded += ch;
    }
  }

  // Remove accidental combining marks left by copy/paste, but preserve normal
  // Unicode characters as much as possible.
  return decoded.normalize("NFC");
}

// -----------------------------------------------------------------------------
// Formatting
// -----------------------------------------------------------------------------

function bold(text) {
  return codePointRangeMap(text, 0x1D5D4, 0x1D5EE);
}

function italic(text) {
  let output = "";
  for (const ch of text) {
    if (SPECIAL_LETTERS.italicUpper[ch]) output += SPECIAL_LETTERS.italicUpper[ch];
    else if (SPECIAL_LETTERS.italicLower[ch]) output += SPECIAL_LETTERS.italicLower[ch];
    else {
      const cp = ch.codePointAt(0);
      if (cp >= 65 && cp <= 90) output += String.fromCodePoint(0x1D434 + cp - 65);
      else if (cp >= 97 && cp <= 122) output += String.fromCodePoint(0x1D44E + cp - 97);
      else output += ch;
    }
  }
  return output;
}

function boldItalic(text) {
  return codePointRangeMap(text, 0x1D468, 0x1D482);
}

function mono(text) {
  return codePointRangeMap(text, 0x1D670, 0x1D68A);
}

function underline(text) {
  return [...text].map(ch => ch + "\u0332").join("");
}

function strike(text) {
  return [...text].map(ch => ch + "\u0336").join("");
}

const squareMap = {
  A:"🄰",B:"🄱",C:"🄲",D:"🄳",E:"🄴",F:"🄵",G:"🄶",H:"🄷",I:"🄸",J:"🄹",
  K:"🄺",L:"🄻",M:"🄼",N:"🄽",O:"🄾",P:"🄿",Q:"🅀",R:"🅁",S:"🅂",T:"🅃",
  U:"🅄",V:"🅅",W:"🅆",X:"🅇",Y:"🅈",Z:"🅉"
};

const negativeSquareMap = {
  A:"🅰",B:"🅱",C:"🅲",D:"🅳",E:"🅴",F:"🅵",G:"🅶",H:"🅷",I:"🅸",J:"🅹",
  K:"🅺",L:"🅻",M:"🅼",N:"🅽",O:"🅾",P:"🅿",Q:"🆀",R:"🆁",S:"🆂",T:"🆃",
  U:"🆄",V:"🆅",W:"🆆",X:"🆇",Y:"🆈",Z:"🆉"
};

function circled(text) {
  let output = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 65 && cp <= 90) output += String.fromCodePoint(0x24B6 + cp - 65);
    else if (cp >= 97 && cp <= 122) output += String.fromCodePoint(0x24D0 + cp - 97);
    else if (cp >= 49 && cp <= 57) output += String.fromCodePoint(0x2460 + cp - 49);
    else if (ch === "0") output += "⓪";
    else output += ch;
  }
  return output;
}

function squared(text) {
  return [...text.toUpperCase()].map(ch => squareMap[ch] || ch).join("");
}

function negativeSquared(text) {
  return [...text.toUpperCase()].map(ch => negativeSquareMap[ch] || ch).join("");
}

const FORMATTERS = {
  bold,
  italic,
  boldItalic,
  mono,
  underline,
  strike,
  circled,
  squared,
  negativeSquared
};

function convertText(text, style) {
  return FORMATTERS[style] ? FORMATTERS[style](text) : text;
}

// -----------------------------------------------------------------------------
// Selection / history
// -----------------------------------------------------------------------------

let history = [];
let historyIndex = -1;
let isRestoringHistory = false;

function snapshot() {
  return {
    value: editor.value,
    start: editor.selectionStart,
    end: editor.selectionEnd
  };
}

function saveHistory(force = false) {
  const value = editor.value;

  if (!force && historyIndex >= 0 && history[historyIndex].value === value) return;

  history = history.slice(0, historyIndex + 1);
  history.push(snapshot());
  historyIndex++;
}

function restoreHistory(item) {
  isRestoringHistory = true;
  editor.value = item.value;
  editor.focus();

  const start = Math.min(item.start, editor.value.length);
  const end = Math.min(item.end, editor.value.length);
  editor.setSelectionRange(start, end);

  isRestoringHistory = false;
  render();
}

function undo() {
  if (historyIndex <= 0) {
    setStatus(UI.app.statusNothingToUndo);
    return;
  }
  historyIndex--;
  restoreHistory(history[historyIndex]);
}

function redo() {
  if (historyIndex >= history.length - 1) {
    setStatus(UI.app.statusNothingToRedo);
    return;
  }
  historyIndex++;
  restoreHistory(history[historyIndex]);
}

function getSelection() {
  return {
    start: editor.selectionStart ?? 0,
    end: editor.selectionEnd ?? 0
  };
}

function selectedText() {
  const { start, end } = getSelection();
  return editor.value.slice(start, end);
}

function replaceSelection(newText) {
  const { start, end } = getSelection();
  const scrollTop = editor.scrollTop;

  editor.value = editor.value.slice(0, start) + newText + editor.value.slice(end);
  editor.focus();
  editor.setSelectionRange(start, start + newText.length);
  editor.scrollTop = scrollTop;

  render();
  saveHistory();
}

// -----------------------------------------------------------------------------
// Toggle behavior
// -----------------------------------------------------------------------------

function selectionIsExactlyStyle(text, style) {
  const base = normalizeText(text);
  if (!base || !FORMATTERS[style]) return false;
  return convertText(base, style) === text;
}

function applyStyle(style) {
  const text = selectedText();

  if (!text) {
    setStatus(UI.app.statusNoSelection);
    editor.focus();
    return;
  }

  const base = normalizeText(text);
  const output = selectionIsExactlyStyle(text, style)
    ? base
    : convertText(base, style);

  replaceSelection(output);

  const styleName = STYLE_CONFIG.styles[style]?.name || style;
  setStatus(UI.app.statusFormatted.replace("{style}", styleName));
}

// -----------------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------------

function updatePreview() {
  preview.textContent = editor.value;
}

function updateStats() {
  const text = editor.value;
  const max = Number(UI.app.maxChars) || MAX_CHAR_FALLBACK;

  charCount.textContent = text.length;
  maxChars.textContent = max;

  const trimmed = text.trim();
  wordCount.textContent = trimmed ? trimmed.split(/\s+/).length : 0;

  const percent = Math.min((text.length / max) * 100, 100);
  progressBar.style.width = `${percent}%`;
  progressBar.classList.toggle("over-limit", text.length > max);
}

function updateSelectionInfo() {
  const count = selectedText().length;
  selectionInfo.textContent = count
    ? UI.app.selectedTemplate.replace("{count}", count)
    : UI.app.selectionPrompt;
}

function render() {
  updatePreview();
  updateStats();
  updateSelectionInfo();
}

function setStatus(message) {
  statusMessage.textContent = message;
}

// -----------------------------------------------------------------------------
// UI from JSON
// -----------------------------------------------------------------------------

function buildUI() {
  document.title = UI.app.title;

  document.getElementById("appTitle").textContent = UI.app.title;
  document.getElementById("appSubtitle").textContent = UI.app.subtitle;
  document.getElementById("editorHeading").textContent = UI.app.editorHeading;
  document.getElementById("previewHeading").textContent = UI.app.previewHeading;
  document.getElementById("previewBadge").textContent = UI.app.previewBadge;
  document.getElementById("shortcutTitle").textContent = UI.app.shortcutTitle;
  document.getElementById("charsLabel").textContent = UI.app.charsLabel;
  document.getElementById("wordsLabel").textContent = UI.app.wordsLabel;

  undoBtn.textContent = UI.app.undo;
  redoBtn.textContent = UI.app.redo;
  copyBtn.textContent = UI.app.copy;
  clearBtn.textContent = UI.app.clear;

  toolbar.innerHTML = "";
  UI.toolbar.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tool";
    button.dataset.style = item.style;
    button.title = `${item.title} — ${item.shortcut}`;
    button.setAttribute("aria-label", item.title);
    button.innerHTML = `<span class="tool-glyph">${item.label}</span><span class="tool-name">${item.title}</span><kbd>${item.shortcut}</kbd>`;

    // Critical: prevent the button click from destroying textarea selection.
    button.addEventListener("mousedown", event => event.preventDefault());
    button.addEventListener("click", () => applyStyle(item.style));

    toolbar.appendChild(button);
  });

  const shortcutList = document.getElementById("shortcutList");
  shortcutList.innerHTML = "";
  SHORTCUTS.shortcuts.forEach(item => {
    const chip = document.createElement("span");
    chip.className = "shortcut-chip";
    chip.innerHTML = `<kbd>${formatKeys(item.keys)}</kbd><span>${item.label}</span>`;
    shortcutList.appendChild(chip);
  });
}

function formatKeys(keys) {
  const isMac = navigator.platform.toLowerCase().includes("mac");
  return keys.map(key => {
    if (key === "CTRL") return isMac ? "⌘" : "Ctrl";
    if (key === "SHIFT") return "⇧";
    if (key === "ALT") return isMac ? "⌥" : "Alt";
    return key;
  }).join("+");
}

// -----------------------------------------------------------------------------
// Keyboard shortcuts
// -----------------------------------------------------------------------------

function shortcutMatches(event, keys) {
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const wantsCtrl = keys.includes("CTRL");
  const wantsShift = keys.includes("SHIFT");
  const wantsAlt = keys.includes("ALT");

  const ctrlPressed = isMac ? event.metaKey : event.ctrlKey;

  return (
    ctrlPressed === wantsCtrl &&
    event.shiftKey === wantsShift &&
    event.altKey === wantsAlt &&
    keys.includes(event.key.toUpperCase())
  );
}

document.addEventListener("keydown", event => {
  // Undo / redo are handled separately.
  if (!event.altKey && !event.shiftKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
    return;
  }

  if (!event.altKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redo();
    return;
  }

  const shortcut = SHORTCUTS.shortcuts.find(item => shortcutMatches(event, item.keys));
  if (!shortcut) return;

  event.preventDefault();
  applyStyle(shortcut.style);
});

// -----------------------------------------------------------------------------
// Editor events
// -----------------------------------------------------------------------------

editor.addEventListener("input", () => {
  if (!isRestoringHistory) saveHistory();
  render();
});

["select", "keyup", "click", "focus"].forEach(eventName => {
  editor.addEventListener(eventName, updateSelectionInfo);
});

// Save selection before the mouse can move focus to a toolbar control.
document.addEventListener("selectionchange", updateSelectionInfo);

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

clearBtn.addEventListener("click", () => {
  if (!editor.value) return;
  editor.value = "";
  editor.focus();
  editor.setSelectionRange(0, 0);
  saveHistory();
  render();
  setStatus(UI.app.statusCleared);
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(editor.value);
    copyBtn.textContent = UI.app.copied;
    setStatus(UI.app.copied);
    setTimeout(() => {
      copyBtn.textContent = UI.app.copy;
    }, 1200);
  } catch (error) {
    console.error(error);
    setStatus(UI.app.statusCopyFailed);
  }
});

// -----------------------------------------------------------------------------
// Startup
// -----------------------------------------------------------------------------

(async function init() {
  await loadAppData();
  buildUI();

  editor.value = "";
  saveHistory(true);
  render();
  setStatus(UI.app.statusReady);
})();
