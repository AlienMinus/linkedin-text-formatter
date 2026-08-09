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
3. The previous bold s-z decoding issue is eliminated.
4. Formatting can toggle: formatting already-styled selected text restores plain text.
5. Keyboard shortcuts are data-driven.
6. Undo/redo preserves both text and selection.
7. Static UI labels/tooltips/shortcut definitions live in JSON.
