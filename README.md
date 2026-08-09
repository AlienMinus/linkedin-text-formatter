# LinkedIn Unicode Formatter — Fixed

Files:
- index.html
- script.js
- style.css
- data/ui.json
- data/styles.json
- data/shortcuts.json

Run with a local server because the app loads JSON using fetch():

    python -m http.server 8000

Then open:
    http://localhost:8000/

Key fixes:
1. Toolbar buttons preserve textarea selection with mousedown.preventDefault().
2. Unicode normalization is code-point based instead of relying on a fragile hand-written map.
4. Bold uses Mathematical Bold (U+1D400/U+1D41A), matching the Mathematical Bold Italic family (U+1D468/U+1D482).
4. The previous bold s-z decoding issue is eliminated.
5. Formatting can toggle: formatting already-styled selected text restores plain text.
6. Keyboard shortcuts are data-driven.
7. Undo/redo preserves both text and selection.
8. Static UI labels/tooltips/shortcut definitions live in JSON.
