# LinkedIn Unicode Formatter — Refactored

## Key architecture

- `styles.json` is the source of truth for Unicode style ranges and exceptions.
- Italic `h` is explicitly mapped through `exceptions.lower.h = U+210E`.
- The decoder is generated from JSON, so toggle-off uses the same exception mapping.
- No hard-coded italic exception table remains in `script.js`.
- Circled/squared/negative-squared mappings are also data-driven.
- Toolbar buttons preserve textarea selection.
- Ctrl/Cmd formatting shortcuts are data-driven.
- Undo/redo preserves selection and scroll position.
- `index.html` uses `script.js` without manual `?v=N` cache changes.

Run with:
`Open With Live Server`

## Latest fixes

- Underline no longer adds combining underline marks to whitespace, preventing detached underscore artifacts.
- Squared and Negative Squared preserve the original formatter behavior by converting ASCII lowercase letters to the available uppercase Unicode square alphabet.
- Both behaviors are controlled by `styles.json`; no formatter-specific behavior is hard-coded in the JS.
- Other formatters, including Bold, Italic, Bold Italic, Monospace, and Strikethrough, are unchanged.
