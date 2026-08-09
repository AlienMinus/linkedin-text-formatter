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
`python -m http.server 8000`

Then open:
`http://localhost:8000/`
